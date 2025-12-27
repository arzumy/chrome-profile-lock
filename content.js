// Content script - shows lock overlay on all pages

let lockOverlay = null;
let isLocked = true;

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
      // Extension context invalidated, try again later
      setTimeout(checkLockState, 1000);
      return;
    }
    
    if (response) {
      isLocked = response.isLocked && response.hasPassword;
      if (isLocked) {
        showLockOverlay();
      } else {
        hideLockOverlay();
      }
    }
  });
}

function showLockOverlay() {
  if (lockOverlay) return;
  
  // Create overlay container
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
  
  // Insert at the very beginning of the page
  if (document.body) {
    document.body.insertBefore(lockOverlay, document.body.firstChild);
  } else {
    document.documentElement.appendChild(lockOverlay);
  }
  
  // Handle form submission
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
      } else {
        errorDiv.textContent = response?.error || 'Incorrect password';
        passwordInput.value = '';
        passwordInput.focus();
      }
    });
  });
  
  // Focus password input
  setTimeout(() => passwordInput.focus(), 100);
  
  // Prevent any interaction with the page behind
  lockOverlay.addEventListener('click', (e) => e.stopPropagation());
  lockOverlay.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') e.preventDefault();
  });
}

function hideLockOverlay() {
  if (lockOverlay) {
    lockOverlay.remove();
    lockOverlay = null;
  }
}

// Re-check on visibility change (user returns to tab)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    checkLockState();
  }
});
