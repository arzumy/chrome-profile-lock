// Background service worker for Profile Lock extension

let isLocked = true;

// Initialize lock state on startup
chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.set({ isLocked: true });
  isLocked = true;
});

// Also lock when extension is installed/updated
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['passwordHash'], (result) => {
    if (result.passwordHash) {
      chrome.storage.local.set({ isLocked: true });
      isLocked = true;
    } else {
      // No password set yet, keep unlocked for setup
      chrome.storage.local.set({ isLocked: false });
      isLocked = false;
    }
  });
});

// Listen for idle state changes
chrome.idle.onStateChanged.addListener((state) => {
  chrome.storage.local.get(['autoLockEnabled', 'passwordHash'], (result) => {
    if (result.autoLockEnabled && result.passwordHash && (state === 'locked' || state === 'idle')) {
      chrome.storage.local.set({ isLocked: true });
      isLocked = true;
      notifyAllTabs();
    }
  });
});

// Set idle detection interval (in seconds)
chrome.idle.setDetectionInterval(300); // 5 minutes

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getLockState') {
    chrome.storage.local.get(['isLocked', 'passwordHash'], (result) => {
      sendResponse({
        isLocked: result.isLocked ?? true,
        hasPassword: !!result.passwordHash
      });
    });
    return true; // Keep channel open for async response
  }
  
  if (message.action === 'unlock') {
    chrome.storage.local.get(['passwordHash'], async (result) => {
      const inputHash = await hashPassword(message.password);
      if (inputHash === result.passwordHash) {
        chrome.storage.local.set({ isLocked: false });
        isLocked = false;
        notifyAllTabs();
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false, error: 'Incorrect password' });
      }
    });
    return true;
  }
  
  if (message.action === 'lock') {
    chrome.storage.local.set({ isLocked: true });
    isLocked = true;
    notifyAllTabs();
    sendResponse({ success: true });
    return true;
  }
  
  if (message.action === 'setPassword') {
    hashPassword(message.password).then((hash) => {
      chrome.storage.local.set({ 
        passwordHash: hash,
        isLocked: false,
        autoLockEnabled: message.autoLockEnabled ?? true
      });
      isLocked = false;
      sendResponse({ success: true });
    });
    return true;
  }
  
  if (message.action === 'changePassword') {
    chrome.storage.local.get(['passwordHash'], async (result) => {
      const currentHash = await hashPassword(message.currentPassword);
      if (currentHash === result.passwordHash) {
        const newHash = await hashPassword(message.newPassword);
        chrome.storage.local.set({ passwordHash: newHash });
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false, error: 'Current password is incorrect' });
      }
    });
    return true;
  }
  
  if (message.action === 'removePassword') {
    chrome.storage.local.get(['passwordHash'], async (result) => {
      const inputHash = await hashPassword(message.password);
      if (inputHash === result.passwordHash) {
        chrome.storage.local.remove(['passwordHash', 'isLocked', 'autoLockEnabled']);
        isLocked = false;
        notifyAllTabs();
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false, error: 'Incorrect password' });
      }
    });
    return true;
  }
});

// Notify all tabs about lock state change
function notifyAllTabs() {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      chrome.tabs.sendMessage(tab.id, { action: 'lockStateChanged' }).catch(() => {});
    });
  });
}

// Hash password using SHA-256
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'profile-lock-salt-v1');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
