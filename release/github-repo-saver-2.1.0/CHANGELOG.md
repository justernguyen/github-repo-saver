# GitHub Repo Saver - Version 2.1.0

## 🎉 What's New

### ✨ New Features
- **Fork Count Display**: Now shows the number of forks alongside stars for each repository
- **Sort by Forks**: Added "Most forks" option in the sorting dropdown
- **Improved Number Formatting**: Smart formatting for large numbers (e.g., 2k, 1.5m)

### 🐛 Bug Fixes
- **Fixed Star Count Extraction**: Resolved issue where star counts with 'k' suffix (e.g., 2k) were parsed incorrectly as just "2"
- **Fixed Fork Count Extraction**: Improved selector logic to accurately extract fork counts from GitHub pages
- **Better Number Parsing**: Enhanced parsing to handle commas, 'k' (thousands), and 'm' (millions) suffixes

### 🎨 UI Improvements
- **Better Meta Layout**: Stars, forks, and date are now evenly distributed (left-center-right alignment)
- **Consistent Formatting**: Both stars and forks use the same formatting function for consistency

### 🔧 Technical Improvements
- More reliable DOM selectors using GitHub's ID attributes (`#repo-stars-counter-star`, `#repo-network-counter`)
- Fallback mechanisms for different GitHub page layouts
- Cleaner code structure with reusable `parseGitHubNumber()` function

## 📦 Installation
1. Download `github-repo-saver-2.1.0-upload.zip`
2. Extract the contents
3. Open Chrome and go to `chrome://extensions/`
4. Enable "Developer mode"
5. Click "Load unpacked" and select the extracted folder

## 🔄 Upgrade from 2.0.0
Simply install the new version - all your saved repositories will be preserved!

---

**Release Date**: December 26, 2025
**Author**: Thịnh Lynx
