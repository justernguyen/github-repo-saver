# GitHub Repo Saver

A modern Chrome extension to save, organize, and manage your favorite GitHub repositories with a beautiful interface.

## Features

- 📌 **One-Click Save**: Save repositories directly from GitHub with a single click
- 🎨 **Beautiful UI**: Modern glassmorphism design with smooth animations
- 🏷️ **Smart Categorization**: Organize repos by role (Frontend, Backend, AI/ML, etc.)
- 📊 **Status Tracking**: Track repository status (Unviewed, In Use, Tried, Dropped)
- 🔍 **Powerful Search**: Search by name, description, tags, or language
- 📝 **Custom Notes**: Add personal notes to each repository
- 💾 **Unlimited Storage**: Uses IndexedDB for storing unlimited repositories
- 🌙 **Dark Mode**: Beautiful dark theme optimized for developers

## Installation

### From Chrome Web Store
1. Visit the [Chrome Web Store page](#) (coming soon)
2. Click "Add to Chrome"
3. Start saving your favorite repos!

### Manual Installation (Development)
1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (top right)
4. Click "Load unpacked"
5. Select the `extension-dist` folder
6. The extension is now installed!

## Usage

### Saving a Repository
1. Navigate to any GitHub repository page
2. Click the "📌 Save Github" button (appears near the Star button)
3. A popup will appear with repository information pre-filled
4. (Optional) Select a role category for the repository
5. (Optional) Add custom tags or notes
6. Click "Save" to add it to your collection

### Managing Your Collection
1. Click the extension icon in your browser toolbar
2. Click "View Dashboard" to see all saved repositories
3. Use filters to find specific repos by status, role, or search terms
4. Update status, edit details, or delete repositories as needed

## Permissions

This extension requires the following permissions:

- **storage & unlimitedStorage**: To save your repository collection locally
- **activeTab & tabs**: To detect when you're on a GitHub repository page
- **scripting**: To inject the "Save Github" button on GitHub pages
- **host_permissions (github.com)**: To access repository information from GitHub

## Privacy

This extension:
- ✅ Stores all data locally on your device
- ✅ Does NOT send any data to external servers
- ✅ Does NOT track your browsing activity
- ✅ Only accesses GitHub.com pages when you explicitly save a repository

See [PRIVACY.md](PRIVACY.md) for full privacy policy.

## Development

### Tech Stack
- Manifest V3
- Vanilla JavaScript (no frameworks)
- IndexedDB for data storage
- Modern CSS with CSS Variables

### Project Structure
```
extension-dist/
├── manifest.json         # Extension configuration
├── background.js         # Service worker (background tasks)
├── content.js            # Content script (GitHub page integration)
├── popup/
│   ├── popup.html        # Popup UI
│   ├── popup.js          # Popup logic
│   └── popup.css         # Popup styles
├── dashboard/
│   ├── dashboard.html    # Dashboard UI
│   ├── dashboard.js      # Dashboard logic
│   └── dashboard.css     # Dashboard styles
└── icons/                # Extension icons
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - Copyright (c) 2025 Thịnh Lynx

See [LICENSE](LICENSE) file for details.

## Support

If you encounter any issues or have suggestions:
- Open an issue on [GitHub](https://github.com/dacthinh05)
- Contact: Thịnh Lynx

## Changelog

### Version 2.0.0
- Complete UI redesign with modern glassmorphism
- Added role-based categorization
- Improved search and filtering
- Added status tracking
- Migrated to IndexedDB for unlimited storage
- Enhanced error handling and user feedback

---

**Made with ❤️ by Thịnh Lynx**  
*For developers who love discovering great repositories*

© 2025 Thịnh Lynx. All rights reserved.
