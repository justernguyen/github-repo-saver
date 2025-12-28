# Privacy Policy for GitHub Repo Saver

**Last Updated:** December 2025

## Overview

GitHub Repo Saver is a browser extension that helps you save, organize, and manage your favorite GitHub repositories locally in your browser.

## Data Collection & Storage

### What We Collect
- **Repository Information**: We store repository metadata (name, owner, description, stars, language, topics) that you explicitly save
- **User Preferences**: Your categorization choices (role, status, custom tags, notes) are stored locally

### What We DON'T Collect
- ❌ No personal information (email, name, location)
- ❌ No browsing history outside of GitHub
- ❌ No authentication tokens or credentials
- ❌ No repository content (code, files, commits)
- ❌ No analytics or tracking data

## Data Storage

All data is stored **locally** in your browser using:
- **IndexedDB**: For repository data (when you have 200+ repos)
- **Chrome Storage API**: For smaller datasets and preferences

**Optional Sync (across your devices):** If you enable "Sync across devices" in the dashboard, your saved repository list is stored using **Chrome Sync** (`chrome.storage.sync`) and synchronized by your browser across devices signed into the same Chrome profile. This synchronization is handled by Chrome/Google; we do not operate any external servers.

**Important notes about Chrome Sync:**
- Chrome Sync has storage limits (approximately 100KB total)
- If your repository collection exceeds this limit, only the most recently saved repositories will be synced (partial sync)
- Sync data is encrypted by Chrome and stored on Google's servers as part of your Chrome profile
- You can disable sync at any time in the dashboard, which will stop syncing but will not delete already synced data from Chrome Sync
- To fully remove synced data, you must clear Chrome Sync data in Chrome settings

## Permissions Explained

- **`storage`**: Required to save your repository list locally
- **`https://github.com/*`**: Required to access GitHub repository pages

## Third-Party Services

- **Ko-fi**: If you choose to donate via Ko-fi, you'll be redirected to their website. We do not collect or store any payment information.
- **Chrome Web Store**: Standard extension distribution platform

## Data Deletion

You can delete your data at any time by:
1. Removing individual repositories in the dashboard
2. Uninstalling the extension (this removes all local data)

**If Chrome Sync is enabled:**
- Disabling sync in the dashboard stops future syncing but does not delete already synced data
- To remove synced data from Chrome Sync, you must clear Chrome Sync data in Chrome settings (chrome://settings/syncSetup)
- Local data deletion (removing repos or uninstalling) does not automatically delete synced data

## Contact

If you have questions about this privacy policy, contact:
- **Email**: dacthinh05@gmail.com
- **GitHub**: https://github.com/justernguyen

## Changes to This Policy

We may update this privacy policy from time to time. The "Last Updated" date at the top indicates when changes were made.

---

**This extension is open-source and privacy-focused. Your data stays on your device.**
