# GitHub Repo Saver

A powerful Chrome extension to save, organize, and manage your favorite GitHub repositories with advanced categorization, bulk operations, and cross-device sync.

## 🚀 Features

### Core Functionality
- **Save Repositories**: One-click save from any GitHub repository page
- **Smart Organization**: Categorize repos by role (UI/Frontend, Backend/API, Auth, Payments, AI/ML, Infra/Tooling, Other)
- **Status Tracking**: Track viewing status (Unviewed, Viewed, In Use)
- **Collections**: Group repositories into custom collections
- **Tags**: Add custom tags and technical tags for better organization
- **Notes**: Add personal notes to each repository
- **Pin Repositories**: Pin important repos to the top

### Advanced Features
- **Bulk Actions**: Select multiple repos and apply changes (status, role, collection, tags) with preview before applying
- **Search & Filter**: Powerful search with highlighting, filter by status, role, collection
- **Statistics Dashboard**: Visual statistics with pie charts showing distribution by role
- **Export/Import**: Export your data to JSON or import from backup
- **Chrome Sync**: Optional cross-device synchronization using Chrome Sync
- **Keyboard Shortcuts**: 
  - `Ctrl+K` or `/` - Focus search
  - `Ctrl+B` - Toggle bulk mode
  - `Escape` - Close modals or exit bulk mode
  - `Ctrl+Z` - Undo
  - `Ctrl+Y` - Redo

### User Experience
- **Dark Theme**: Beautiful dark theme optimized for developers
- **Responsive Design**: Works seamlessly on different screen sizes
- **Performance Optimized**: Handles 1000+ repositories efficiently with incremental rendering
- **Auto-capitalization**: Repository names are automatically capitalized
- **OS Detection**: Clone commands adapt to your operating system (Windows/Mac/Linux)

## 📦 Installation

1. Download the extension from Chrome Web Store (or load unpacked)
2. Click the extension icon to open the popup
3. Visit any GitHub repository page
4. Click "Save GitHub" button to save the repo

## 🎯 Usage

### Saving a Repository
1. Navigate to any GitHub repository page
2. Click the "Save GitHub" button (injected by the extension)
3. Optionally customize name, add tags, select role, and add notes
4. Click "Save" to add to your collection

### Managing Repositories
- **Dashboard**: Click extension icon → "Open Dashboard" or right-click → "Options"
- **Filter**: Use quick filters or search to find specific repos
- **Edit**: Click "Edit" on any repo card to modify details
- **Bulk Actions**: Click "Bulk Action" to select multiple repos and apply changes

### Bulk Operations
1. Click "Bulk Action" button
2. Select repositories (click cards or checkboxes)
3. Choose actions (Status, Role, Collection, Tags)
4. Review pending changes in preview
5. Click "Apply" to confirm or "Cancel" to discard

## 🔒 Privacy & Security

- **100% Local Storage**: All data stored locally in your browser
- **No Tracking**: No analytics, no data collection
- **Optional Sync**: Chrome Sync is optional and handled by Chrome
- **No External Servers**: All operations happen locally

See [PRIVACY.md](PRIVACY.md) for detailed privacy information.

## 🛠️ Technical Details

### Architecture
- **Manifest V3**: Modern Chrome Extension architecture
- **Modular Design**: Separated into core services and UI components
- **Storage**: IndexedDB for large datasets (200+ repos), Chrome Storage for smaller ones
- **Performance**: Debounced search, memoized filters, incremental rendering

### Modules
- **Core**: State management, storage service, repo service, history manager
- **UI**: Repo renderer, filters, modals, bulk actions, event handlers
- **Utils**: Helper functions, constants, utilities

## 📝 Data Format

Repositories are stored with the following structure:
```json
{
  "id": "owner/repo",
  "name": "repo-name",
  "owner": "owner",
  "description": "Description",
  "url": "https://github.com/owner/repo",
  "stars": 1234,
  "forks": 567,
  "language": "JavaScript",
  "status": "chuaxem|daxem|dangdung",
  "role": "ui-frontend|backend-api|auth|payments|ai-ml|infra-tooling|other",
  "collection": "My Collection",
  "customTags": ["tag1", "tag2"],
  "technicalTags": ["react", "typescript"],
  "note": "Personal notes",
  "pinned": false,
  "savedAt": 1234567890,
  "updatedAt": 1234567890
}
```

## 🔄 Export/Import

- **Export**: Download all repositories as JSON
- **Import**: Upload JSON file to restore repositories
- **Format Support**: Both array format `[...]` and object format `{"repos": [...]}`

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` or `/` | Focus search input |
| `Ctrl+B` | Toggle bulk mode |
| `Escape` | Close modal or exit bulk mode |
| `Ctrl+Z` | Undo last action |
| `Ctrl+Y` | Redo last action |

## 📊 Statistics

View statistics about your repositories:
- Total repositories
- Distribution by role (pie chart)
- Pinned repositories count
- Roles used count

## 🎨 UI Features

- **Dark Theme**: Professional dark theme
- **Role Badges**: Color-coded role badges (AUTH, UI, Backend, etc.)
- **Status Icons**: Visual status indicators
- **Hover Effects**: Smooth transitions and hover states
- **Responsive Cards**: Repository cards with all information at a glance

## 🐛 Troubleshooting

### Repositories not loading
- Check browser console for errors
- Try refreshing the dashboard
- Check if storage quota is exceeded

### Sync not working
- Ensure Chrome Sync is enabled in Chrome settings
- Check sync status in dashboard
- Note: Chrome Sync has storage limits (100KB)

### Import fails
- Ensure JSON file is valid
- Check file format (array or object with `repos` key)
- Verify repository structure matches expected format

## 📄 License

See [LICENSE](LICENSE) file for details.

## 👤 Author

**Thịnh Lynx**
- GitHub: [@dacthinh05](https://github.com/dacthinh05)
- Email: dacthinh05@gmail.com

## 🙏 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Contact: dacthinh05@gmail.com

---

**Version**: 2.1.0  
**Last Updated**: December 2025


