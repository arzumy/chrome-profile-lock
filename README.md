# Profile Lock - Chrome Extension

A Chrome extension that locks your browser profile with a password for privacy protection. Perfect for freelancers who use separate Chrome profiles for different clients.

## Features

- 🔐 **Password Protection**: Lock your Chrome profile with a secure password
- 🚀 **Auto-lock on Startup**: Profile is automatically locked when Chrome starts
- ⏰ **Idle Auto-lock**: Optionally lock after 5 minutes of inactivity
- 🎨 **Clean UI**: Modern, non-intrusive lock screen overlay
- 🔄 **Easy Management**: Change or remove password anytime

## Installation

### Method 1: Load Unpacked (Developer Mode)

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (toggle in the top right)
3. Click **Load unpacked**
4. Select the `chrome-profile-lock` folder
5. The extension icon will appear in your toolbar
6. Restart the browser after installation

### Method 2: Pack as .crx (for distribution)

1. Go to `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Pack extension**
4. Select the `chrome-profile-lock` folder
5. This creates a `.crx` file you can share
6. Restart the browser after installation

## Usage

### First Time Setup

1. Click the lock icon in your Chrome toolbar
2. Enter a password (minimum 4 characters)
3. Confirm the password
4. Optionally enable auto-lock when idle
5. Click "Set Password"

### Locking Your Profile

- **Manual**: Click the extension icon → "Lock Now"
- **Automatic**: Profile locks when Chrome starts
- **Idle**: If enabled, locks after 5 minutes of inactivity

### Unlocking

When locked, a full-screen overlay appears. Enter your password to unlock.

### Managing Your Password

Click the extension icon when unlocked to:
- **Lock Now**: Immediately lock the profile
- **Change Password**: Update your password
- **Remove Password**: Disable the lock feature

## Security Notes

⚠️ **Important Limitations**:

1. This extension provides a **deterrent**, not absolute security
2. A determined user could:
   - Disable the extension via `chrome://extensions/`
   - Access Chrome's profile folder directly on disk
   - Use Chrome's Task Manager to close extension processes

### For Maximum Security, Also Consider:

- Using separate OS user accounts (strongest option)
- Enabling full-disk encryption (BitLocker/FileVault)
- Always locking your computer when away
- Using a password manager for sensitive accounts

## How It Works

1. Password is hashed using SHA-256 before storage
2. Hash is stored in Chrome's local storage (per-profile)
3. Content script injects a lock overlay on all pages
4. Background service worker manages lock state
5. Communication happens via Chrome's messaging API

## Troubleshooting

**Lock screen doesn't appear?**
- Refresh the page or restart Chrome
- Check if extension is enabled at `chrome://extensions/`

**Forgot password?**
- Remove and reinstall the extension
- Or delete extension data via `chrome://extensions/` → Details → Clear data

**Extension not working on some pages?**
- Chrome internal pages (`chrome://`) don't allow content scripts
- Some sites with strict CSP may block the overlay

## Files

```
chrome-profile-lock/
├── manifest.json       # Extension configuration
├── background.js       # Service worker (manages lock state)
├── content.js          # Injects lock overlay
├── lock-overlay.css    # Lock screen styles
├── popup.html          # Extension popup UI
├── popup.js            # Popup functionality
└── icons/              # Extension icons
    ├── lock-16.png
    ├── lock-48.png
    └── lock-128.png
```

## License

MIT License - Feel free to modify and distribute.
