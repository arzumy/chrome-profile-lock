// Content script - shows lock overlay on all pages

let lockOverlay = null;
let isLocked = true;
let blurStyle = null;
let guardInterval = null;
let devToolsInterval = null;
let resizeHandler = null;
let keydownHandler = null;
let visibilityHandler = null;
let messageHandler = null;

// Check lock state immediately
checkLockState();

// Listen for lock state changes from background
messageHandler = (message) => {
  if (message.action === 'lockStateChanged') {
    checkLockState();
  }
};
chrome.runtime.onMessage.addListener(messageHandler);

function checkLockState() {
  chrome.runtime.sendMessage({ action: 'getLockState' }, (response) => {
    if (chrome.runtime.lastError) {
      setTimeout(checkLockState, 1000);
      return;
    }
    
    if (response) {
      isLocked = response.isLocked && response.hasPassword;
      if (isLocked) {
        showLockOverlay();
        applyBlur();
        startGuard();
        startDevToolsDetection();
      } else {
        hideLockOverlay();
        removeBlur();
        stopGuard();
        stopDevToolsDetection();
        removeEventListeners();
      }
    }
  });
}

// === MITIGATION #4: Blur page content ===
function applyBlur() {
  if (blurStyle) return;
  
  blurStyle = document.createElement('style');
  blurStyle.id = 'profile-lock-blur';
  blurStyle.textContent = `
    body > *:not(#profile-lock-overlay) {
      filter: blur(25px) !important;
      pointer-events: none !important;
      user-select: none !important;
    }
    html {
      overflow: hidden !important;
    }
  `;
  document.documentElement.appendChild(blurStyle);
}

function removeBlur() {
  if (blurStyle) {
    blurStyle.remove();
    blurStyle = null;
  }
  // Also remove any injected blur styles
  document.getElementById('profile-lock-blur')?.remove();
}

// === MITIGATION #2: Continuously re-inject overlay ===
function startGuard() {
  if (guardInterval) return;
  
  // Reduced frequency from 50ms to 300ms for better performance
  // Still responsive but much less CPU intensive (3.3 checks/sec vs 20 checks/sec)
  guardInterval = setInterval(() => {
    if (!isLocked) {
      stopGuard();
      return;
    }
    
    // Re-inject overlay if removed
    if (!document.getElementById('profile-lock-overlay')) {
      lockOverlay = null;
      showLockOverlay();
    }
    
    // Re-inject blur if removed
    if (!document.getElementById('profile-lock-blur')) {
      blurStyle = null;
      applyBlur();
    }
    
    // Ensure overlay is still on top (only check if body exists)
    if (document.body) {
      const overlay = document.getElementById('profile-lock-overlay');
      if (overlay && overlay.parentNode !== document.body && document.body.firstChild) {
        document.body.insertBefore(overlay, document.body.firstChild);
      }
    }
  }, 300); // Check every 300ms (optimized from 50ms)
}

function stopGuard() {
  if (guardInterval) {
    clearInterval(guardInterval);
    guardInterval = null;
  }
}

function stopDevToolsDetection() {
  if (devToolsInterval) {
    clearInterval(devToolsInterval);
    devToolsInterval = null;
  }
  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler);
    resizeHandler = null;
  }
}

// === MITIGATION #1: Detect DevTools ===
function startDevToolsDetection() {
  if (devToolsInterval || resizeHandler) return; // Already started
  
  // Method 1: Detect window size changes (docked DevTools)
  resizeHandler = () => {
    if (!isLocked) {
      stopDevToolsDetection();
      return;
    }
    
    const widthDiff = Math.abs(window.outerWidth - window.innerWidth);
    const heightDiff = Math.abs(window.outerHeight - window.innerHeight);
    
    // Significant difference suggests DevTools is open
    if (widthDiff > 200 || heightDiff > 200) {
      onDevToolsDetected();
    }
  };
  
  // Method 2: Detect console.log interception (removed console.log to avoid output)
  // Using a no-op console method to avoid console output
  const detectConsole = () => {
    if (!isLocked) return;
    
    try {
      const element = new Image();
      let detected = false;
      Object.defineProperty(element, 'id', {
        get: function() {
          if (!detected) {
            detected = true;
            onDevToolsDetected();
          }
          return 'devtools-trap';
        }
      });
      // Use console.debug instead of console.log to reduce noise
      // This still triggers the getter if DevTools is open
      if (console.debug) {
        console.debug('%c', element);
      }
    } catch (e) {
      // Silently fail if console is not available
    }
  };
  
  // Run detection periodically (reduced frequency)
  devToolsInterval = setInterval(() => {
    if (!isLocked) {
      stopDevToolsDetection();
      return;
    }
    detectConsole();
  }, 2000); // Reduced from 1000ms to 2000ms for better performance
  
  window.addEventListener('resize', resizeHandler);
}

function onDevToolsDetected() {
  if (!isLocked) return;
  
  // Force re-apply all protections
  lockOverlay?.remove();
  lockOverlay = null;
  showLockOverlay();
  
  blurStyle?.remove();
  blurStyle = null;
  applyBlur();
  
  // Show warning
  const warning = document.getElementById('devtools-warning');
  if (!warning && lockOverlay) {
    const warningDiv = document.createElement('div');
    warningDiv.id = 'devtools-warning';
    warningDiv.style.cssText = `
      color: #ff6b6b;
      font-size: 12px;
      margin-top: 15px;
      padding: 10px;
      background: rgba(255,107,107,0.1);
      border-radius: 8px;
    `;
    warningDiv.textContent = '⚠️ DevTools detected. Nice try!';
    lockOverlay.querySelector('.lock-container')?.appendChild(warningDiv);
  }
}

function showLockOverlay() {
  if (lockOverlay) return;
  
  // Use createElement instead of innerHTML for better security and performance
  lockOverlay = document.createElement('div');
  lockOverlay.id = 'profile-lock-overlay';
  
  const container = document.createElement('div');
  container.className = 'lock-container';
  
  const icon = document.createElement('div');
  icon.className = 'lock-icon';
  icon.textContent = '🔒';
  
  const h1 = document.createElement('h1');
  h1.textContent = 'Profile Locked';
  
  const p = document.createElement('p');
  p.textContent = 'Enter your password to unlock this profile';
  
  const form = document.createElement('form');
  form.id = 'unlock-form';
  
  const passwordInput = document.createElement('input');
  passwordInput.type = 'password';
  passwordInput.id = 'unlock-password';
  passwordInput.placeholder = 'Password';
  passwordInput.autocomplete = 'off';
  
  const button = document.createElement('button');
  button.type = 'submit';
  button.textContent = 'Unlock';
  
  const errorDiv = document.createElement('div');
  errorDiv.id = 'unlock-error';
  errorDiv.className = 'error-message';
  
  form.appendChild(passwordInput);
  form.appendChild(button);
  
  container.appendChild(icon);
  container.appendChild(h1);
  container.appendChild(p);
  container.appendChild(form);
  container.appendChild(errorDiv);
  lockOverlay.appendChild(container);
  
  if (document.body) {
    document.body.insertBefore(lockOverlay, document.body.firstChild);
  } else {
    document.documentElement.appendChild(lockOverlay);
  }
  
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const password = passwordInput.value;
    
    if (!password) {
      errorDiv.textContent = 'Please enter your password';
      return;
    }
    
    chrome.runtime.sendMessage({ action: 'unlock', password }, (response) => {
      if (response?.success) {
        hideLockOverlay();
        removeBlur();
        stopGuard();
        stopDevToolsDetection();
        removeEventListeners();
      } else {
        errorDiv.textContent = response?.error || 'Incorrect password';
        passwordInput.value = '';
        passwordInput.focus();
      }
    });
  });
  
  setTimeout(() => passwordInput.focus(), 100);
  
  // Block all interaction
  lockOverlay.addEventListener('click', (e) => e.stopPropagation());
  lockOverlay.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') e.preventDefault();
  });
  
  // Block right-click context menu on overlay
  lockOverlay.addEventListener('contextmenu', (e) => e.preventDefault());
  
  // Attach keyboard blocking when locked
  attachEventListeners();
}

function hideLockOverlay() {
  if (lockOverlay) {
    lockOverlay.remove();
    lockOverlay = null;
  }
}

// Attach event listeners only when locked
function attachEventListeners() {
  if (keydownHandler || visibilityHandler) return; // Already attached
  
  // Re-check on visibility change
  visibilityHandler = () => {
    if (document.visibilityState === 'visible') {
      checkLockState();
    }
  };
  document.addEventListener('visibilitychange', visibilityHandler);
  
  // Block keyboard shortcuts that might open DevTools
  keydownHandler = (e) => {
    if (!isLocked) {
      removeEventListeners();
      return;
    }
    
    // Block F12
    if (e.key === 'F12') {
      e.preventDefault();
      onDevToolsDetected();
    }
    
    // Block Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
    if (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key.toUpperCase())) {
      e.preventDefault();
      onDevToolsDetected();
    }
    
    // Block Ctrl+U (view source)
    if (e.ctrlKey && e.key.toUpperCase() === 'U') {
      e.preventDefault();
    }
  };
  document.addEventListener('keydown', keydownHandler, true);
}

// Remove event listeners when unlocked
function removeEventListeners() {
  if (keydownHandler) {
    document.removeEventListener('keydown', keydownHandler, true);
    keydownHandler = null;
  }
  if (visibilityHandler) {
    document.removeEventListener('visibilitychange', visibilityHandler);
    visibilityHandler = null;
  }
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  stopGuard();
  stopDevToolsDetection();
  removeEventListeners();
});