# Quick Fix Guide - Chrome Web Store Submission

This guide provides exact code changes needed to fix critical issues before Chrome Web Store submission.

## 🚨 Critical Fix #1: Replace Vietnamese Text

### File: `content.js`

**Line 243:**
```javascript
// OLD (Vietnamese):
showNotification("Extension không khả dụng. Vui lòng reload extension.", "error", 5000);

// NEW (English):
showNotification("Extension is not available. Please reload the extension.", "error", 5000);
```

**Line 255:**
```javascript
// OLD (Vietnamese):
showNotification("Extension đã được cập nhật. Vui lòng F5 (tải lại) trang này để tiếp tục.", "error", 5000);

// NEW (English):
showNotification("Extension has been updated. Please refresh (F5) this page to continue.", "error", 5000);
```

**Line 262:**
```javascript
// OLD (Vietnamese):
showNotification("Không thể lấy thông tin repo", "error");

// NEW (English):
showNotification("Unable to retrieve repository information", "error");
```

**Line 305:**
```javascript
// OLD (Vietnamese - same as line 255):
showNotification("Extension đã được cập nhật. Vui lòng F5 (tải lại) trang này để tiếp tục.", "error", 5000);

// NEW (English):
showNotification("Extension has been updated. Please refresh (F5) this page to continue.", "error", 5000);
```

**Line 307:**
```javascript
// OLD (Vietnamese):
showNotification("Không thể kết nối với extension. Vui lòng F5 trang web.", "error", 5000);

// NEW (English):
showNotification("Unable to connect to extension. Please refresh the page.", "error", 5000);
```

**Line 322:**
```javascript
// OLD (Vietnamese - same as line 255):
showNotification("Extension đã được cập nhật. Vui lòng F5 (tải lại) trang này để tiếp tục.", "error", 5000);

// NEW (English):
showNotification("Extension has been updated. Please refresh (F5) this page to continue.", "error", 5000);
```

### File: `background.js`

**Line 431:**
```javascript
// OLD (Vietnamese):
error: "Repo này đã được lưu rồi!",

// NEW (English):
error: "This repository has already been saved!",
```

---

## ⚠️ Medium Fix #2: Privacy Policy Link

### File: `popup/popup.html`

**Line 1044:**
```html
<!-- OLD (GitHub blob URL - fragile): -->
<a href="https://github.com/dacthinh05/github-repo-saver/blob/main/PRIVACY.md" target="_blank"

<!-- NEW (GitHub raw URL - stable): -->
<a href="https://raw.githubusercontent.com/dacthinh05/github-repo-saver/main/PRIVACY.md" target="_blank"
```

**Alternative Option (GitHub Pages - more user-friendly):**
If you set up GitHub Pages, use:
```html
<a href="https://dacthinh05.github.io/github-repo-saver/PRIVACY.md" target="_blank"
```

---

## 📝 Medium Fix #3: Add Donation Disclosure

### File: `CHROME_STORE_DESCRIPTION.md`

Add this section **before** the "### 📋 Requirements" section (around line 92):

```markdown
### 💝 Support the Project

GitHub Repo Saver is completely free with no limits. All features are available to everyone. If you find this extension useful, you can optionally support the project through donations:

- **Ko-fi**: Quick and secure payment via the extension's donate button
- **Cryptocurrency**: USDT donations (BEP20/TRX) via QR codes
- **Banking**: Direct bank transfer (available in donation modal)

All donations are completely optional and help keep the project free and open-source. Your support is greatly appreciated! 🙏

```

---

## ✅ Verification Steps

After making changes:

1. **Test all error messages:**
   - Disable extension → Try to save repo → Check error message is in English
   - Save duplicate repo → Check error message is in English
   - Reload extension → Check all notifications are in English

2. **Test Privacy Policy link:**
   - Click Privacy Policy link in donate modal
   - Verify it opens without authentication
   - Verify content displays correctly

3. **Verify store description:**
   - Check donation section is included
   - Verify it's clear donations are optional

---

## 🎯 Pre-Submission Checklist

- [ ] All Vietnamese text replaced with English
- [ ] Privacy Policy link updated
- [ ] Donation disclosure added to store description
- [ ] Tested extension on fresh Chrome profile
- [ ] All error messages display correctly
- [ ] Privacy Policy link works
- [ ] Store description finalized

---

**Estimated Time:** 1-2 hours  
**Priority:** Fix Critical issues first, then Medium issues

