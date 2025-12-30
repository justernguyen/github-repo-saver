// Constants for GitHub Repo Saver Dashboard

// Status labels and colors
const STATUS_LABELS = {
  chuaxem: "Unviewed",
  daxem: "Viewed",
  dangdung: "In Use"
};

const STATUS_COLORS = {
  chuaxem: "#9CA3AF",
  daxem: "#60A5FA",
  dangdung: "#34D399"
};

// Role labels
const ROLE_LABELS = {
  'ui-frontend': 'UI',
  'backend-api': 'Backend',
  'auth': 'Auth',
  'payments': 'Payments',
  'ai-ml': 'AI',
  'infra-tooling': 'Infra',
  'other': 'Other',
  null: 'Uncategorized',
  undefined: 'Uncategorized'
};

// Storage thresholds
const STORAGE_THRESHOLDS = {
  CHROME_STORAGE_MAX: 200, // Switch to IndexedDB when > 200 repos
  SYNC_CHUNK_SIZE: 7800, // Max bytes per sync chunk (with 300 byte buffer)
  SYNC_BUFFER: 300 // Buffer for metadata
};

// Performance settings
const PERFORMANCE = {
  SEARCH_DEBOUNCE_MS: 300,
  INCREMENTAL_RENDER_BATCH_SIZE: 50,
  INCREMENTAL_RENDER_THRESHOLD: 100 // Use incremental rendering when > 100 repos
};

// UI Constants
const UI = {
  TOAST_DURATION: 3000,
  MODAL_ANIMATION_DURATION: 300,
  PIN_BUTTON_SIZE: { width: 28, height: 26 }
};

// Data limits
const DATA_LIMITS = {
  MAX_TAG_LENGTH: 50,
  MAX_NOTE_LENGTH: 1000,
  MAX_COLLECTION_NAME_LENGTH: 100,
  MAX_CUSTOM_NAME_LENGTH: 200
};

// Backup settings
const BACKUP = {
  MAX_BACKUP_VERSIONS: 5,
  BACKUP_KEY: "github-repo-saver-backup"
};

// Expose to global scope for Chrome Extension
window.STATUS_LABELS = STATUS_LABELS;
window.STATUS_COLORS = STATUS_COLORS;
window.ROLE_LABELS = ROLE_LABELS;
window.STORAGE_THRESHOLDS = STORAGE_THRESHOLDS;
window.PERFORMANCE = PERFORMANCE;
window.UI = UI;
window.DATA_LIMITS = DATA_LIMITS;
window.BACKUP = BACKUP;
