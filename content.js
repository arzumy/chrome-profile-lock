// Content script - shows lock overlay on all pages

let lockOverlay = null;
let isLocked = true;
let blurStyle = null;
let guardInterval = null;

// Check lock state immediately
checkLockState();

// Listen for lock state changes from background
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'lockStateChanged') {
    checkLockState();
  }
});

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
  
  guardInterval = setInterval(() => {
    if (!isLocked) return;
    
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
    
    // Ensure overlay is still on top
    const overlay = document.getElementById('profile-lock-overlay');
    if (overlay && overlay.parentNode !== document.body?.firstChild) {
      document.body?.insertBefore(overlay, document.body.firstChild);
    }
  }, 50); // Check every 50ms
}

function stopGuard() {
  if (guardInterval) {
    clearInterval(guardInterval);
    guardInterval = null;
  }
}

// === MITIGATION #1: Detect DevTools ===
function startDevToolsDetection() {
  // Method 1: Detect debugger statement timing
  const detectDebugger = () => {
    if (!isLocked) return;
    
    const start = performance.now();
    debugger;
    const end = performance.now();
    
    // If debugger paused, this took longer than 100ms
    if (end - start > 100) {
      onDevToolsDetected();
    }
  };
  
  // Method 2: Detect window size changes (docked DevTools)
  let lastWidth = window.outerWidth;
  let lastHeight = window.outerHeight;
  
  const detectResize = () => {
    if (!isLocked) return;
    
    const widthDiff = Math.abs(window.outerWidth - window.innerWidth);
    const heightDiff = Math.abs(window.outerHeight - window.innerHeight);
    
    // Significant difference suggests DevTools is open
    if (widthDiff > 200 || heightDiff > 200) {
      onDevToolsDetected();
    }
  };
  
  // Method 3: Detect console.log interception
  const detectConsole = () => {
    const element = new Image();
    Object.defineProperty(element, 'id', {
      get: function() {
        onDevToolsDetected();
        return 'devtools-trap';
      }
    });
    console.log('%c', element);
  };
  
  // Run detection periodically
  setInterval(() => {
    if (!isLocked) return;
    detectResize();
    detectConsole();
  }, 1000);
  
  // Uncomment below to use debugger detection (intrusive - causes pauses)
  // setInterval(detectDebugger, 3000);
  
  window.addEventListener('resize', detectResize);
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
  
  lockOverlay = document.createElement('div');
  lockOverlay.id = 'profile-lock-overlay';
  lockOverlay.innerHTML = `
    <div class="lock-container">
      <div class="lock-icon">🔒</div>
      <h1>Profile Locked</h1>
      <p>Enter your password to unlock this profile</p>
      <form id="unlock-form">
        <input type="password" id="unlock-password" placeholder="Password" autocomplete="off" />
        <button type="submit">Unlock</button>
      </form>
      <div id="unlock-error" class="error-message"></div>
    </div>
  `;
  
  if (document.body) {
    document.body.insertBefore(lockOverlay, document.body.firstChild);
  } else {
    document.documentElement.appendChild(lockOverlay);
  }
  
  const form = lockOverlay.querySelector('#unlock-form');
  const passwordInput = lockOverlay.querySelector('#unlock-password');
  const errorDiv = lockOverlay.querySelector('#unlock-error');
  
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
}

function hideLockOverlay() {
  if (lockOverlay) {
    lockOverlay.remove();
    lockOverlay = null;
  }
}

// Re-check on visibility change
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    checkLockState();
  }
});

// Block keyboard shortcuts that might open DevTools
document.addEventListener('keydown', (e) => {
  if (!isLocked) return;
  
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
}, true);