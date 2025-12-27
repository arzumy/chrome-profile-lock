# 🔐 Profile Lock - Chrome Extension

A Chrome extension that locks your browser profile with a password for privacy protection. Perfect for freelancers who use separate Chrome profiles for different clients, or anyone who shares a computer and wants to protect their browsing data.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue)](https://developer.chrome.com/docs/extensions/mv3/)

## Features

- 🔐 **Password Protection**: Lock your Chrome profile with a secure password
- 🚀 **Auto-lock on Startup**: Profile is automatically locked when Chrome starts
- ⏰ **Idle Auto-lock**: Optionally lock after 5 minutes of inactivity
- 🎨 **Clean UI**: Modern, non-intrusive lock screen overlay
- 🔄 **Easy Management**: Change or remove password anytime

## 📋 Requirements

- Google Chrome (or Chromium-based browser) version 88 or higher
- Chrome Extensions API support (Manifest V3)

## 🚀 Installation

### Method 1: Install from GitHub (Recommended)

1. **Download the extension:**
   ```bash
   git clone https://github.com/arzumy/chrome-profile-lock.git
   cd chrome-profile-lock
   ```
   Or download as ZIP from the repository and extract it.

2. **Load in Chrome:**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable **Developer mode** (toggle in the top right)
   - Click **Load unpacked**
   - Select the `chrome-profile-lock` folder
   - The extension icon will appear in your toolbar

3. **Restart Chrome** to ensure the extension loads properly

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

## 🛠️ How It Works

1. **Password Storage**: Password is hashed using SHA-256 before storage
2. **Local Storage**: Hash is stored in Chrome's local storage (per-profile, never synced)
3. **Content Script**: Injects a lock overlay on all pages when locked
4. **Background Service Worker**: Manages lock state and idle detection
5. **Messaging API**: Communication between components via Chrome's messaging API

### Technical Details

- **Manifest Version**: 3 (MV3)
- **Permissions**: `storage`, `tabs`, `idle`
- **Content Scripts**: Runs on all URLs (`<all_urls>`) at document start
- **Storage**: Uses `chrome.storage.local` (data stays on your device)
- **No Network Access**: Extension operates completely offline - no data is sent to external servers

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

## 📁 Project Structure

```
chrome-profile-lock/
├── manifest.json              # Extension configuration (Manifest V3)
├── background.js              # Service worker (manages lock state & idle detection)
├── content.js                 # Content script (injects lock overlay)
├── lock-overlay.css           # Lock screen styles
├── popup.html                 # Extension popup UI
├── popup.js                   # Popup functionality
├── icons/                     # Extension icons
│   ├── lock-16.png
│   ├── lock-48.png
│   └── lock-128.png
├── README.md                  # This file
├── SECURITY_REVIEW.md         # Security analysis documentation
├── CONTENT_JS_REVIEW.md       # Content script review
└── PERFORMANCE_OPTIMIZATIONS.md # Performance analysis
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

This extension provides a **deterrent** for casual access to your Chrome profile. It is not designed to protect against determined attackers with physical or administrative access to your computer. For maximum security, use OS-level user accounts and full-disk encryption.

## 🙏 Acknowledgments

- Built with Chrome Extensions Manifest V3
- Uses Chrome Storage API for local data persistence
- Icons designed for clarity and visibility

## 🤖 Development

This project was **100% built with [Claude AI](https://claude.ai) and [Cursor](https://cursor.sh)**. The entire codebase, documentation, and architecture were developed through AI-assisted pair programming, demonstrating the power of modern AI coding assistants.

---

**Made with ❤️ for privacy-conscious users**
