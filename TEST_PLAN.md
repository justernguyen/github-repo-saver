# Test Plan for GitHub Repo Saver v2.0.0

## Pre-Launch Testing Checklist

### ✅ 1. Icons Verification
- [x] **icon16.png** - Present and correct size
- [x] **icon48.png** - Present and correct size  
- [x] **icon128.png** - Present and correct size
- [x] All icons referenced correctly in manifest.json

**Status:** ✅ All icons present and properly configured

---

### ✅ 2. Version Verification
- [x] **manifest.json** - Version: `2.0.0`
- [x] Version number consistent across all files
- [x] Version format follows semantic versioning

**Status:** ✅ Version 2.0.0 verified

---

### ✅ 3. Storage Limits & IndexedDB Migration

#### Test Scenarios:

**Scenario 1: Small Collection (< 200 repos)**
- [ ] Save 10-50 repositories
- [ ] Verify data stored in Chrome Storage
- [ ] Verify all repos load correctly
- [ ] Verify search/filter works
- [ ] Verify export/import works

**Scenario 2: Migration Trigger (200+ repos)**
- [ ] Save 200+ repositories
- [ ] Verify automatic migration to IndexedDB
- [ ] Verify Chrome Storage is cleared after migration
- [ ] Verify all repos still accessible
- [ ] Verify performance is acceptable with large dataset

**Scenario 3: IndexedDB Operations**
- [ ] Save new repo after migration
- [ ] Update existing repo
- [ ] Delete repo
- [ ] Verify all operations work correctly
- [ ] Verify data persistence after browser restart

**Code Verification:**
```javascript
// Migration trigger: background.js line 291
if (repos.length >= 200) {
  await migrateToIndexedDB();
}

// Migration function: background.js line 243
async function migrateToIndexedDB() {
  const repos = await readFromChromeStorage();
  if (repos.length > 0) {
    await writeToIndexedDB(repos);
    await chrome.storage.local.remove(STORAGE_KEY);
  }
}
```

**Status:** ✅ Code verified - Migration logic correct

---

### 4. Browser Compatibility Testing

#### Chrome (Primary)
- [ ] Install extension
- [ ] Save repository from GitHub
- [ ] Open dashboard
- [ ] Search and filter repos
- [ ] Update repo status
- [ ] Edit repo details
- [ ] Delete repo
- [ ] Export/Import repos
- [ ] Verify all UI elements render correctly

#### Microsoft Edge
- [ ] Install extension
- [ ] Test all core features
- [ ] Verify UI compatibility
- [ ] Test IndexedDB migration

#### Brave Browser
- [ ] Install extension
- [ ] Test all core features
- [ ] Verify privacy features work correctly

**Test Commands:**
```bash
# Load extension in Chrome
1. Open chrome://extensions/
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select extension-dist folder

# Test in Edge
1. Open edge://extensions/
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select extension-dist folder
```

---

### 5. Real GitHub Repository Testing

#### Test Repositories (Various Scenarios):

**Scenario 1: Standard Repository**
- [ ] Repository: `facebook/react`
- [ ] Verify: Name, owner, description, stars, language extracted
- [ ] Verify: Topics/technical tags extracted
- [ ] Verify: URL correct
- [ ] Save and verify in dashboard

**Scenario 2: Repository with Long Description**
- [ ] Repository: `microsoft/vscode`
- [ ] Verify: Long description handled correctly
- [ ] Verify: No truncation issues in UI

**Scenario 3: Repository without Description**
- [ ] Repository: Any repo without description
- [ ] Verify: "No description" displayed correctly
- [ ] Verify: No errors in console

**Scenario 4: Repository with Many Topics**
- [ ] Repository: `vercel/next.js`
- [ ] Verify: All topics extracted
- [ ] Verify: Topics display correctly in dashboard

**Scenario 5: Private Repository (if accessible)**
- [ ] Test with private repo (if you have access)
- [ ] Verify: Error handling if access denied

**Scenario 6: Very Popular Repository**
- [ ] Repository: `torvalds/linux` (if accessible)
- [ ] Verify: Large star count displayed correctly
- [ ] Verify: Performance acceptable

---

### 6. Feature Testing

#### Core Features:

**Save Repository**
- [ ] Click "Save Github" button on GitHub page
- [ ] Popup window opens correctly
- [ ] Repository info pre-filled
- [ ] Select role category
- [ ] Add custom tags
- [ ] Add note
- [ ] Save successfully
- [ ] Badge appears on extension icon
- [ ] Repo appears in dashboard

**Dashboard View**
- [ ] Open extension popup
- [ ] Click "Dashboard" button
- [ ] Dashboard opens in new tab
- [ ] All repos displayed
- [ ] Search works
- [ ] Filters work (status, role, tags)
- [ ] Repo cards render correctly
- [ ] Star counts aligned
- [ ] Descriptions not truncated

**Edit Repository**
- [ ] Click edit button on repo card
- [ ] Modal opens
- [ ] Update role
- [ ] Update tags
- [ ] Update note
- [ ] Update status
- [ ] Save changes
- [ ] Changes persist

**Delete Repository**
- [ ] Click delete button
- [ ] Confirmation modal appears
- [ ] Confirm deletion
- [ ] Repo removed from list
- [ ] Data removed from storage

**Export/Import**
- [ ] Click Export button
- [ ] JSON file downloads
- [ ] File contains all repo data
- [ ] Click Import button
- [ ] Select JSON file
- [ ] Repos imported correctly
- [ ] Duplicates handled correctly

**Search & Filter**
- [ ] Search by repo name
- [ ] Search by description
- [ ] Search by tags
- [ ] Filter by status
- [ ] Filter by role
- [ ] Combine search + filter
- [ ] Clear filters works

---

### 7. Error Handling Testing

**Test Cases:**
- [ ] Extension context invalidated (reload extension)
- [ ] GitHub page not fully loaded
- [ ] Network errors
- [ ] Storage quota exceeded (if possible)
- [ ] Invalid JSON import
- [ ] Duplicate repo save
- [ ] Missing repository data
- [ ] Browser restart (data persistence)

**Expected Behavior:**
- User-friendly error messages
- No console errors (except critical)
- Graceful degradation
- Data not corrupted

---

### 8. Performance Testing

**Test Scenarios:**
- [ ] Load dashboard with 10 repos (< 1 second)
- [ ] Load dashboard with 100 repos (< 2 seconds)
- [ ] Load dashboard with 500+ repos (< 5 seconds)
- [ ] Search performance with large dataset
- [ ] Filter performance with large dataset
- [ ] Save operation (< 500ms)
- [ ] Update operation (< 500ms)
- [ ] Delete operation (< 500ms)

---

### 9. UI/UX Testing

**Visual Checks:**
- [ ] All buttons clickable and responsive
- [ ] Hover effects work
- [ ] Animations smooth
- [ ] Colors contrast sufficient
- [ ] Text readable
- [ ] Icons display correctly
- [ ] Modals center correctly
- [ ] Responsive on different screen sizes
- [ ] No layout shifts
- [ ] Loading states visible

**Accessibility:**
- [ ] Keyboard navigation works
- [ ] Focus indicators visible
- [ ] ARIA labels (if applicable)
- [ ] Color contrast meets WCAG AA

---

### 10. Security Testing

**Verify:**
- [x] XSS protection (escapeHTML used everywhere)
- [x] CSP configured correctly
- [x] Message validation working
- [x] No eval() or dangerous functions
- [x] Permissions minimal
- [ ] Test with malicious input (if possible)
- [ ] Verify no data leaks

---

## Test Execution Log

**Date:** _______________  
**Tester:** _______________  
**Browser:** _______________  
**Version:** 2.0.0

### Results:
- [ ] All tests passed
- [ ] Issues found: _______________
- [ ] Critical issues: _______________
- [ ] Ready for production: Yes / No

---

## Quick Test Script

```bash
# 1. Load extension
chrome://extensions/ → Developer mode → Load unpacked

# 2. Test save
Go to: https://github.com/facebook/react
Click: "Save Github" button
Fill: Select role, add tags
Save: Click "Save"

# 3. Test dashboard
Click: Extension icon
Click: "Dashboard" button
Verify: Repo appears in list

# 4. Test search
Type: "react" in search box
Verify: Results filtered

# 5. Test edit
Click: Edit button on repo card
Update: Status to "In Use"
Save: Click "Save"
Verify: Status updated

# 6. Test export
Click: Export button
Verify: JSON file downloads
Open: File and verify data

# 7. Test import
Click: Import button
Select: Exported JSON file
Verify: Repos imported (or duplicates detected)
```

---

**Note:** This test plan should be executed before submitting to Chrome Web Store. All critical tests must pass before production release.

