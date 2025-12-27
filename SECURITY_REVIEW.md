# Security Review - Chrome Profile Lock Extension

## Executive Summary
This security review identifies several critical and high-priority security vulnerabilities in the Chrome Profile Lock extension. The most critical issues relate to password security, lack of rate limiting, and insufficient input validation.

## ✅ POSITIVE SECURITY FINDINGS

### No Data Exfiltration or External Network Requests
**Status:** ✅ **SECURE** - No external data transmission detected

**Analysis:**
- ✅ **No network requests**: No `fetch()`, `XMLHttpRequest`, or any HTTP/HTTPS calls found
- ✅ **No external URLs**: No external server endpoints or API calls
- ✅ **No network permissions**: Manifest only requests `storage`, `tabs`, and `idle` permissions (no `webRequest`, `webNavigation`, or host permissions)
- ✅ **Local storage only**: Uses `chrome.storage.local` (not `chrome.storage.sync` which would sync to Google servers)
- ✅ **Internal messaging only**: All `chrome.runtime.sendMessage()` calls are internal extension communication
- ✅ **No external resources**: All scripts, styles, and icons are bundled locally
- ✅ **No dynamic code execution**: No `eval()`, `Function()`, or dynamic script loading

**Conclusion:** The extension operates completely offline and does **NOT** send any data (passwords, hashes, lock state, or any other information) to external servers. All data remains local to the user's Chrome profile. This is a **strong security practice** for a privacy-focused extension.

---

## 🔴 CRITICAL ISSUES

### 1. Weak Password Hashing Algorithm
**Location:** `background.js:127-133`

**Issue:**
- Uses SHA-256 with a static, hardcoded salt (`'profile-lock-salt-v1'`)
- SHA-256 is a fast hash function designed for data integrity, not password storage
- Static salt means all users share the same salt, making rainbow table attacks easier
- No key derivation function (KDF) like PBKDF2, bcrypt, or Argon2

**Risk:** Passwords can be brute-forced relatively easily. An attacker with access to the stored hash can attempt offline attacks.

**Recommendation:**
```javascript
// Use PBKDF2 with high iteration count
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16)); // Random salt per password
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000, // High iteration count
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );
  // Store both salt and hash
  return {
    salt: Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join(''),
    hash: Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')
  };
}
```

### 2. No Rate Limiting on Password Attempts
**Location:** `background.js:51-64`, `content.js:66-84`, `popup.js:86-102`

**Issue:**
- Unlimited password attempts with no delays or lockouts
- Allows brute force attacks through automated scripts
- No tracking of failed attempts

**Risk:** Attackers can attempt unlimited passwords, making brute force attacks feasible.

**Recommendation:**
- Implement exponential backoff (e.g., 2^attempts seconds delay)
- Lock account after 5-10 failed attempts for a period (e.g., 15 minutes)
- Track failed attempts in storage with timestamps

### 3. Weak Password Policy
**Location:** `popup.js:62-65`, `popup.js:133-136`

**Issue:**
- Minimum password length is only 4 characters
- No maximum length validation
- No complexity requirements (uppercase, lowercase, numbers, special chars)
- No check against common passwords

**Risk:** Users can set very weak passwords that are easily guessable.

**Recommendation:**
- Increase minimum length to at least 8-12 characters
- Add maximum length (e.g., 128 characters) to prevent DoS
- Optionally add complexity requirements
- Consider checking against common password lists

---

## 🟠 HIGH PRIORITY ISSUES

### 4. No Message Origin Validation
**Location:** `background.js:40-115`

**Issue:**
- `chrome.runtime.onMessage.addListener` accepts messages from any source
- No validation that messages come from trusted sources (popup or content scripts)
- Malicious web pages could potentially inject content scripts or send messages

**Risk:** Unauthorized code could send unlock/lock messages, potentially bypassing security.

**Recommendation:**
```javascript
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Validate sender origin
  if (sender.id !== chrome.runtime.id) {
    return false; // Reject messages from other extensions
  }
  
  // For content scripts, verify tab exists and is valid
  if (sender.tab) {
    // Additional validation if needed
  }
  
  // Rest of message handling...
});
```

### 5. Storage Not Encrypted
**Location:** `background.js:52-55`, `background.js:75-80`, etc.

**Issue:**
- Password hash stored in `chrome.storage.local` without additional encryption
- Anyone with file system access to Chrome profile can read the storage
- Storage is in plain JSON format

**Risk:** If an attacker gains access to the user's Chrome profile directory, they can read the password hash and attempt offline attacks.

**Recommendation:**
- Consider using `chrome.storage.encrypted` if available (not standard Chrome API)
- Or implement additional encryption layer using Web Crypto API with a key derived from user's master password
- Note: This is challenging in browser extensions without a master key

### 6. No Input Validation/Sanitization
**Location:** All message handlers in `background.js`

**Issue:**
- No validation of password input type (could be non-string)
- No maximum length validation
- No sanitization of error messages
- Missing null/undefined checks in some places

**Risk:** Could lead to crashes, unexpected behavior, or potential injection if error messages are displayed unsafely.

**Recommendation:**
```javascript
if (message.action === 'unlock') {
  // Validate input
  if (typeof message.password !== 'string') {
    sendResponse({ success: false, error: 'Invalid input' });
    return true;
  }
  if (message.password.length > 128) {
    sendResponse({ success: false, error: 'Password too long' });
    return true;
  }
  // Rest of logic...
}
```

### 7. Missing Content Security Policy (CSP)
**Location:** `manifest.json`

**Issue:**
- No Content Security Policy defined in manifest
- Extension popup and content scripts have no CSP restrictions

**Risk:** Could allow injection attacks if vulnerabilities are introduced later.

**Recommendation:**
Add to `manifest.json`:
```json
"content_security_policy": {
  "extension_pages": "script-src 'self'; object-src 'self'"
}
```

---

## 🟡 MEDIUM PRIORITY ISSUES

### 8. Potential Race Conditions
**Location:** `background.js:51-64` (unlock handler)

**Issue:**
- Multiple unlock attempts could be processed simultaneously
- No locking mechanism to prevent concurrent password verification
- State could be inconsistent if multiple tabs send unlock messages

**Risk:** Could lead to unexpected behavior or timing attacks.

**Recommendation:**
- Implement a simple lock flag to prevent concurrent password verification
- Queue requests or reject concurrent attempts

### 9. innerHTML Usage (Low Risk Currently)
**Location:** `content.js:41-52`

**Issue:**
- Uses `innerHTML` to create overlay, though with static template strings
- If this pattern is extended to include user input, it would be an XSS vulnerability

**Risk:** Currently safe, but dangerous pattern that could be exploited if modified.

**Recommendation:**
- Prefer `textContent` and `createElement`/`appendChild` for dynamic content
- If innerHTML must be used, sanitize all user input

### 10. Broad Content Script Injection
**Location:** `manifest.json:27-35`

**Issue:**
- Content script runs on `<all_urls>` with `all_frames: true`
- Runs at `document_start` on every page
- Could interfere with legitimate websites
- High z-index overlay could potentially be manipulated by malicious pages

**Risk:**
- Performance impact on all pages
- Potential conflicts with website functionality
- Malicious pages might try to manipulate or hide the overlay

**Recommendation:**
- Consider if content script needs to run on all pages
- Add exclusions for chrome://, chrome-extension://, and other special pages
- Ensure overlay cannot be easily removed by page scripts (already using high z-index, but verify)

### 11. Error Message Information Disclosure
**Location:** `background.js:60`, `background.js:95`, `background.js:110`

**Issue:**
- Error messages are generic ("Incorrect password") which is good
- However, timing differences between "password exists" vs "password doesn't exist" could leak information

**Risk:** Timing attacks could reveal whether a password is set.

**Recommendation:**
- Ensure consistent timing for all password operations
- Use constant-time comparison if possible (though JavaScript makes this difficult)

### 12. No Session Timeout
**Location:** `background.js`, `content.js`

**Issue:**
- Once unlocked, profile stays unlocked until manually locked or idle timeout
- No maximum session duration
- If user forgets to lock, profile remains accessible

**Risk:** Unlocked profile could remain accessible if user forgets to lock.

**Recommendation:**
- Add optional maximum session timeout (e.g., 1 hour)
- Remind users to lock when closing browser

---

## 🟢 LOW PRIORITY / BEST PRACTICES

### 13. Missing Error Handling
**Location:** Various locations

**Issue:**
- Some async operations lack proper error handling
- `notifyAllTabs()` catches errors but doesn't log them
- Storage operations could fail silently

**Recommendation:**
- Add comprehensive error handling
- Log errors for debugging (but be careful not to log sensitive data)

### 14. No Password Strength Indicator
**Location:** `popup.js`, `popup.html`

**Issue:**
- Users aren't informed about password strength
- Weak passwords are accepted without warning

**Recommendation:**
- Add password strength meter
- Warn users about weak passwords

### 15. Idle Detection Interval Hardcoded
**Location:** `background.js:37`

**Issue:**
- 5-minute idle interval is hardcoded
- Users cannot customize this

**Recommendation:**
- Make idle interval configurable
- Store in user preferences

---

## Summary of Recommendations

### Immediate Actions Required:
1. ✅ Replace SHA-256 with PBKDF2 or similar KDF with random salts
2. ✅ Implement rate limiting on password attempts
3. ✅ Strengthen password policy (minimum 8-12 characters)
4. ✅ Add message origin validation
5. ✅ Add input validation and sanitization
6. ✅ Add Content Security Policy to manifest

### Should Be Addressed Soon:
7. ✅ Implement session timeout
8. ✅ Add error handling and logging
9. ✅ Consider additional encryption for storage
10. ✅ Prevent race conditions in password verification

### Nice to Have:
11. ✅ Password strength indicator
12. ✅ Configurable idle timeout
13. ✅ Better error messages and user feedback

---

## Testing Recommendations

1. **Penetration Testing:**
   - Attempt brute force attacks
   - Test message injection from malicious pages
   - Verify overlay cannot be bypassed

2. **Security Audit:**
   - Review all message handlers
   - Test edge cases (very long passwords, special characters, etc.)
   - Verify state consistency across tabs

3. **Code Review:**
   - Review all user input handling
   - Verify no sensitive data in logs
   - Check for timing vulnerabilities

---

## References

- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [Chrome Extension Security Best Practices](https://developer.chrome.com/docs/extensions/mv3/security/)
- [Web Crypto API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)

