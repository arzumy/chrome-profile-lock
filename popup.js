// Popup script for Profile Lock extension

const sections = {
  setup: document.getElementById('setup-section'),
  locked: document.getElementById('locked-section'),
  unlocked: document.getElementById('unlocked-section'),
  change: document.getElementById('change-section'),
  remove: document.getElementById('remove-section')
};

const status = document.getElementById('status');
const statusText = document.getElementById('status-text');

// Initialize
checkState();

function checkState() {
  chrome.runtime.sendMessage({ action: 'getLockState' }, (response) => {
    hideAllSections();
    
    if (!response.hasPassword) {
      // No password set
      status.className = 'status unlocked';
      statusText.textContent = 'No password set';
      sections.setup.classList.remove('hidden');
    } else if (response.isLocked) {
      // Locked
      status.className = 'status locked';
      statusText.textContent = 'Profile is locked';
      sections.locked.classList.remove('hidden');
    } else {
      // Unlocked
      status.className = 'status unlocked';
      statusText.textContent = 'Profile is unlocked';
      sections.unlocked.classList.remove('hidden');
    }
  });
}

function hideAllSections() {
  Object.values(sections).forEach(s => s.classList.add('hidden'));
}

function showMessage(elementId, message, isError = true) {
  const el = document.getElementById(elementId);
  el.textContent = message;
  el.className = isError ? 'error' : 'success';
  setTimeout(() => el.textContent = '', 3000);
}

// Set password
document.getElementById('set-password-btn').addEventListener('click', () => {
  const password = document.getElementById('new-password').value;
  const confirm = document.getElementById('confirm-password').value;
  const autoLock = document.getElementById('auto-lock').checked;
  
  if (!password) {
    showMessage('setup-message', 'Please enter a password');
    return;
  }
  
  if (password.length < 4) {
    showMessage('setup-message', 'Password must be at least 4 characters');
    return;
  }
  
  if (password !== confirm) {
    showMessage('setup-message', 'Passwords do not match');
    return;
  }
  
  chrome.runtime.sendMessage({ 
    action: 'setPassword', 
    password,
    autoLockEnabled: autoLock
  }, (response) => {
    if (response.success) {
      checkState();
    } else {
      showMessage('setup-message', response.error || 'Failed to set password');
    }
  });
});

// Unlock
document.getElementById('unlock-btn').addEventListener('click', () => {
  const password = document.getElementById('unlock-password').value;
  
  if (!password) {
    showMessage('unlock-message', 'Please enter your password');
    return;
  }
  
  chrome.runtime.sendMessage({ action: 'unlock', password }, (response) => {
    if (response.success) {
      checkState();
    } else {
      showMessage('unlock-message', response.error || 'Incorrect password');
      document.getElementById('unlock-password').value = '';
    }
  });
});

// Lock
document.getElementById('lock-btn').addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'lock' }, () => {
    checkState();
  });
});

// Show change password section
document.getElementById('change-password-btn').addEventListener('click', () => {
  hideAllSections();
  sections.change.classList.remove('hidden');
});

// Cancel change password
document.getElementById('cancel-change-btn').addEventListener('click', () => {
  checkState();
});

// Save new password
document.getElementById('save-password-btn').addEventListener('click', () => {
  const current = document.getElementById('current-password').value;
  const newPass = document.getElementById('new-password-change').value;
  const confirm = document.getElementById('confirm-password-change').value;
  
  if (!current || !newPass) {
    showMessage('change-message', 'Please fill in all fields');
    return;
  }
  
  if (newPass.length < 4) {
    showMessage('change-message', 'New password must be at least 4 characters');
    return;
  }
  
  if (newPass !== confirm) {
    showMessage('change-message', 'New passwords do not match');
    return;
  }
  
  chrome.runtime.sendMessage({ 
    action: 'changePassword', 
    currentPassword: current,
    newPassword: newPass
  }, (response) => {
    if (response.success) {
      showMessage('change-message', 'Password changed successfully!', false);
      setTimeout(checkState, 1500);
    } else {
      showMessage('change-message', response.error || 'Failed to change password');
    }
  });
});

// Show remove password section
document.getElementById('remove-password-btn').addEventListener('click', () => {
  hideAllSections();
  sections.remove.classList.remove('hidden');
});

// Cancel remove
document.getElementById('cancel-remove-btn').addEventListener('click', () => {
  checkState();
});

// Confirm remove password
document.getElementById('confirm-remove-btn').addEventListener('click', () => {
  const password = document.getElementById('remove-password').value;
  
  if (!password) {
    showMessage('remove-message', 'Please enter your password');
    return;
  }
  
  chrome.runtime.sendMessage({ action: 'removePassword', password }, (response) => {
    if (response.success) {
      checkState();
    } else {
      showMessage('remove-message', response.error || 'Incorrect password');
    }
  });
});

// Handle Enter key on password inputs
document.querySelectorAll('input[type="password"]').forEach(input => {
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const section = input.closest('.section');
      const btn = section.querySelector('button.primary');
      if (btn) btn.click();
    }
  });
});
