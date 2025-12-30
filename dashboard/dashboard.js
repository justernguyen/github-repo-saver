// Modern Repo Saver Dashboard - Refactored Architecture
// This file is now the main orchestrator, with business logic extracted to modules

// ==================== INITIALIZATION ====================

// Initialize services and managers
// These will be set after modules load
let state, storage, repoService, renderer;

let filtersManager;
let modalsManager;
let bulkActionsManager;
let eventHandlers;

// ==================== TOAST NOTIFICATIONS ====================

function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    background: linear-gradient(135deg, #6366F1 0%, #4F46E5 100%);
    color: white;
    padding: 16px 24px;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 600;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
    z-index: 10000;
    animation: slideIn 0.3s ease;
    max-width: 400px;
  `;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = "slideOut 0.3s ease";
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 300);
  }, 3000);
}

// Make showToast available globally for modules
window.showToast = showToast;

// Add toast animations
if (!document.getElementById("toast-styles")) {
  const style = document.createElement("style");
  style.id = "toast-styles";
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(400px);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);
}

// ==================== STATS UPDATE ====================

function updateStats() {
  const stats = state.getStats();
  const totalEl = document.getElementById("total-count");
  const filteredEl = document.getElementById("filtered-count");
  const unviewedEl = document.getElementById("unviewed-count");
  const inUseEl = document.getElementById("in-use-count");

  if (totalEl) totalEl.textContent = String(stats.total);
  if (filteredEl) filteredEl.textContent = String(stats.filteredCount);
  if (unviewedEl) unviewedEl.textContent = String(stats.unviewed);
  if (inUseEl) inUseEl.textContent = String(stats.inUse);
}

// ==================== MAIN RENDER ====================

async function renderDashboard() {
  const grid = document.getElementById("repo-grid");
  await renderer.renderRepos(grid);
  updateStats();

  // Attach event listeners after render
  if (eventHandlers) {
    eventHandlers.setup();
  }

  // Update bulk bar if in selection mode
  if (bulkActionsManager && state.selectionMode) {
    bulkActionsManager.updateBulkBar();
  }

  // Update collection filter options
  if (filtersManager) {
    filtersManager.updateCollectionOptions();
  }
}

// ==================== EXPORT / IMPORT ====================

function setupExportImport() {
  // Export button
  const exportBtn = document.getElementById("export-btn");
  if (exportBtn) {
    // Remove old listeners by cloning
    const newExportBtn = exportBtn.cloneNode(true);
    exportBtn.parentNode.replaceChild(newExportBtn, exportBtn);

    newExportBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        if (!storage || !state) {
          showToast("Services not ready. Please wait...");
          return;
        }
        storage.exportToJSON(state.allRepos);
        showToast("Repos exported successfully!");
      } catch (error) {
        console.error("Export error:", error);
        showToast("Export failed: " + error.message);
      }
    });
  }

  // Import button
  const importBtn = document.getElementById("import-btn");

  // Create hidden file input if it doesn't exist
  let importInput = document.getElementById("import-input");
  if (!importInput) {
    importInput = document.createElement("input");
    importInput.type = "file";
    importInput.id = "import-input";
    importInput.accept = ".json,application/json";
    importInput.style.display = "none";
    document.body.appendChild(importInput);
    console.log("✅ Created import input element");
  }

  if (importBtn) {
    // Remove old listeners by cloning
    const newImportBtn = importBtn.cloneNode(true);
    importBtn.parentNode.replaceChild(newImportBtn, importBtn);

    // Create new input to avoid duplicate listeners
    const newImportInput = importInput.cloneNode(true);
    importInput.parentNode.replaceChild(newImportInput, importInput);
    importInput = newImportInput; // Update reference

    newImportBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log("📥 Import button clicked, triggering file picker...");
      importInput.click();
    });

    importInput.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) {
        console.log("⚠️ No file selected");
        return;
      }

      console.log("📂 File selected:", file.name);

      try {
        if (!storage || !state || !repoService) {
          showToast("Services not ready. Please wait...");
          importInput.value = "";
          return;
        }

        console.log("🔄 Importing repos from file...");
        const repos = await storage.importFromJSON(file);
        console.log(`✅ Parsed ${repos.length} repos from file`);

        // Merge with existing repos (avoid duplicates)
        const existingIds = new Set(state.allRepos.map(r => r.id));
        const newRepos = repos.filter(r => !existingIds.has(r.id));

        if (newRepos.length === 0) {
          showToast("No new repos to import (all already exist)");
          importInput.value = "";
          return;
        }

        console.log(`📦 Importing ${newRepos.length} new repos...`);
        // Import new repos
        for (const repo of newRepos) {
          await chrome.runtime.sendMessage({
            type: "CONFIRM_SAVE_REPO",
            repo: repo,
            role: repo.role || null,
            customTags: repo.customTags || [],
            note: repo.note || ""
          });
        }

        await repoService.loadRepos();
        await renderDashboard();
        showToast(`Imported ${newRepos.length} new repos`);
        console.log(`✅ Successfully imported ${newRepos.length} repos`);

        // Reset input
        importInput.value = "";
      } catch (error) {
        console.error("❌ Import error:", error);
        console.error(error.stack);
        showToast("Import failed: " + error.message);
        importInput.value = "";
      }
    });
  } else {
    console.warn("⚠️ Import button not found!");
  }
}

// ==================== SYNC ====================

async function refreshSyncStatus() {
  try {
    const status = await storage.getSyncStatus();
    state.syncEnabled = status.enabled;

    const syncBtn = document.getElementById("sync-toggle-btn");
    const syncLabel = document.getElementById("sync-toggle-label");

    if (syncBtn) {
      syncBtn.setAttribute("data-enabled", status.enabled ? "true" : "false");
    }

    if (syncLabel) {
      syncLabel.textContent = status.enabled ? "ON" : "OFF";
    }

    // Update sync status text if available
    const syncStatusEl = document.getElementById("sync-status-text");
    if (syncStatusEl && status.meta) {
      const meta = status.meta;
      if (meta.partial) {
        syncStatusEl.innerHTML = `<b>${meta.syncedCount}</b> / ${meta.localCount} repos synced`;
      } else {
        syncStatusEl.innerHTML = `<b>${meta.syncedCount}</b> repos synced`;
      }
    }
  } catch (error) {
    console.error("Error refreshing sync status:", error);
  }
}

async function toggleSync() {
  try {
    const newState = !state.syncEnabled;

    if (newState) {
      const confirmed = confirm(
        "Enable Chrome Sync?\n\n" +
        "Your repos will be synced across devices using your Google account.\n" +
        "Note: Chrome Sync has storage limits. Large collections may be partially synced."
      );
      if (!confirmed) return;
    }

    await storage.setSyncEnabled(newState);
    await refreshSyncStatus();
    showToast(newState ? "Sync enabled" : "Sync disabled");
  } catch (error) {
    console.error("Sync error:", error);
    showToast("Sync error: " + error.message);
  }
}

// ==================== STATISTICS ====================

function setupStatistics() {
  const actionsRow = document.querySelector(".actions-row");
  if (!actionsRow) return;

  let statsBtn = document.getElementById("stats-btn");
  if (!statsBtn) {
    statsBtn = document.createElement("button");
    statsBtn.type = "button";
    statsBtn.className = "stat-card button";
    statsBtn.id = "stats-btn";
    statsBtn.textContent = "📊 Stats";
    actionsRow.insertBefore(statsBtn, actionsRow.firstChild);
  }

  // Remove old listeners and add new one
  const newBtn = statsBtn.cloneNode(true);
  statsBtn.parentNode.replaceChild(newBtn, statsBtn);
  newBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      if (modalsManager) {
        modalsManager.showStatisticsModal();
      }
    } catch (error) {
      console.error("Error showing statistics:", error);
      showToast("Failed to show statistics");
    }
  });
}

// ==================== SHORTCUTS BUTTON ====================

function setupShortcuts() {
  const actionsRow = document.querySelector(".actions-row");
  if (!actionsRow) return;

  let shortcutsBtn = document.getElementById("shortcuts-btn");
  if (!shortcutsBtn) {
    shortcutsBtn = document.createElement("button");
    shortcutsBtn.type = "button";
    shortcutsBtn.className = "stat-card button";
    shortcutsBtn.id = "shortcuts-btn";
    shortcutsBtn.textContent = "⌨️ Shortcuts";
    // Insert before Stats button if it exists, otherwise at start
    const statsBtn = document.getElementById("stats-btn");
    if (statsBtn) {
      actionsRow.insertBefore(shortcutsBtn, statsBtn);
    } else {
      actionsRow.insertBefore(shortcutsBtn, actionsRow.firstChild);
    }
  }

  // Remove old listeners and add new one
  const newBtn = shortcutsBtn.cloneNode(true);
  shortcutsBtn.parentNode.replaceChild(newBtn, shortcutsBtn);
  newBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      if (modalsManager) {
        modalsManager.showShortcutsModal();
      }
    } catch (error) {
      console.error("Error showing shortcuts:", error);
    }
  });
}

// ==================== RATE BUTTON ====================

function setupRateButton() {
  const rateBtn = document.getElementById("rate-btn");
  if (rateBtn) {
    rateBtn.addEventListener("click", () => {
      window.open("https://chromewebstore.google.com/detail/github-repo-saver/your-extension-id", "_blank");
    });
  }
}

// ==================== KEYBOARD SHORTCUTS ====================

function setupKeyboardShortcuts() {
  // Only setup once to avoid duplicate listeners
  if (window.keyboardShortcutHandler) {
    return;
  }

  window.keyboardShortcutHandler = function (e) {
    // Ctrl/Cmd + K: Focus search
    if ((e.ctrlKey || e.metaKey) && e.key === "k") {
      e.preventDefault();
      e.stopPropagation();
      const searchInput = document.getElementById("search-input");
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
      return;
    }

    // Ctrl/Cmd + B: Toggle bulk mode
    if ((e.ctrlKey || e.metaKey) && e.key === "b") {
      e.preventDefault();
      e.stopPropagation();
      if (bulkActionsManager) {
        bulkActionsManager.toggleSelectionMode();
      }
      return;
    }

    // Escape: Close modals or exit bulk mode
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();

      const editModal = document.getElementById("edit-modal");
      const deleteModal = document.getElementById("delete-confirm-modal");
      const statsModal = document.getElementById("stats-modal");

      if (editModal && editModal.classList.contains("show")) {
        if (modalsManager) modalsManager.closeEditModal();
      } else if (deleteModal && deleteModal.classList.contains("show")) {
        if (modalsManager) modalsManager.closeDeleteModal();
      } else if (statsModal && statsModal.classList.contains("show")) {
        if (modalsManager && modalsManager.closeStatsModal) {
          modalsManager.closeStatsModal();
        } else {
          statsModal.classList.remove("show");
          statsModal.style.display = "none";
        }
      } else if (state.selectionMode) {
        if (bulkActionsManager) {
          bulkActionsManager.toggleSelectionMode();
        }
      }
      return;
    }

    // Slash (/) key: Focus search (when not in input)
    if (e.key === "/" && !e.ctrlKey && !e.metaKey) {
      const activeElement = document.activeElement;
      const isInput = activeElement && (
        activeElement.tagName === "INPUT" ||
        activeElement.tagName === "TEXTAREA" ||
        activeElement.isContentEditable
      );

      if (!isInput) {
        e.preventDefault();
        e.stopPropagation();
        const searchInput = document.getElementById("search-input");
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }
    }
  };

  // Use capture phase to ensure shortcuts are handled first
  document.addEventListener("keydown", window.keyboardShortcutHandler, true);
  console.log("✅ Keyboard shortcuts enabled");
}

// ==================== INITIALIZATION ====================

async function initializeDashboard() {
  if (!document.body) {
    setTimeout(initializeDashboard, 50);
    return;
  }

  setTimeout(async () => {
    try {
      console.log("🚀 Initializing dashboard...");

      // Wait for modules to load
      if (!window.dashboardState || !window.storageService) {
        console.warn("⚠️ Modules not loaded yet, retrying...");
        setTimeout(initializeDashboard, 100);
        return;
      }

      // Initialize services
      state = window.dashboardState;
      storage = window.storageService;

      // Initialize History Manager
      const historyManager = window.createHistoryManager ? window.createHistoryManager(state) : null;
      if (historyManager) {
        historyManager.setupKeyboardShortcuts();
        console.log("✅ History manager initialized");
      }

      // Check required factory functions
      if (!window.createRepoService) {
        console.error("❌ createRepoService not found! Check repo-service.js loading.");
        setTimeout(initializeDashboard, 100);
        return;
      }
      if (!window.createRepoRenderer) {
        console.error("❌ createRepoRenderer not found! Check repo-renderer.js loading.");
        setTimeout(initializeDashboard, 100);
        return;
      }
      
      repoService = window.createRepoService(storage, state, historyManager);
      renderer = window.createRepoRenderer(state);
      console.log("✅ Services initialized");

      // Setup filters
      if (!window.createFiltersManager) {
        console.error("❌ createFiltersManager not found! Check filters.js loading.");
        setTimeout(initializeDashboard, 100);
        return;
      }
      filtersManager = window.createFiltersManager(state, renderDashboard);
      filtersManager.setup();
      console.log("✅ Filters setup complete");

      // Setup modals
      if (!window.createModalsManager) {
        console.error("❌ createModalsManager not found! Check modals.js loading.");
        setTimeout(initializeDashboard, 100);
        return;
      }
      modalsManager = window.createModalsManager(state, repoService, renderDashboard);
      modalsManager.setup();
      console.log("✅ Modals setup complete");

      // Setup bulk actions
      if (!window.createBulkActionsManager) {
        console.error("❌ createBulkActionsManager not found! Check bulk-actions.js loading.");
        setTimeout(initializeDashboard, 100);
        return;
      }
      bulkActionsManager = window.createBulkActionsManager(state, repoService, renderDashboard);
      bulkActionsManager.setup();
      console.log("✅ Bulk actions setup complete");

      // Setup event handlers
      if (!window.createEventHandlers) {
        console.error("❌ createEventHandlers not found! Check event-handlers.js loading.");
        setTimeout(initializeDashboard, 100);
        return;
      }
      eventHandlers = window.createEventHandlers(state, repoService, modalsManager, renderDashboard);
      console.log("✅ Event handlers ready");

      // Setup other UI
      setupExportImport();
      setupStatistics();
      setupShortcuts();
      setupRateButton();
      setupKeyboardShortcuts();
      console.log("✅ UI setup complete");

      // Sync
      const syncBtn = document.getElementById("sync-toggle-btn");
      if (syncBtn) {
        syncBtn.addEventListener("click", toggleSync);
      }
      await refreshSyncStatus();
      console.log("✅ Sync status loaded");

      // Load and render repos
      console.log("📦 Loading repos...");
      await repoService.loadRepos();
      console.log(`✅ Loaded ${state.allRepos.length} repos`);

      await renderDashboard();
      console.log("✅ Dashboard rendered");

      // Subscribe to state changes for auto-rerender
      state.subscribe('repos', renderDashboard);
      state.subscribe('filter', renderDashboard);
      state.subscribe('search', renderDashboard);
      state.subscribe('sort', renderDashboard);
      state.subscribe('selection', () => {
        if (bulkActionsManager) {
          bulkActionsManager.updateBulkBar();
        }
      });
      console.log("✅ State subscriptions active");

      console.log("🎉 Dashboard initialization complete!");

    } catch (error) {
      console.error("❌ Error initializing dashboard:", error);
      console.error(error.stack);
      showToast("Failed to load dashboard: " + error.message);

      const loadingEl = document.getElementById("loading");
      if (loadingEl) {
        loadingEl.textContent = `Error: ${error.message}`;
        loadingEl.style.color = "#F87171";
      }
    }
  }, 300);
}

// ==================== START ====================

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeDashboard);
} else {
  initializeDashboard();
}

// Backup on window load
window.addEventListener('load', () => {
  setTimeout(() => {
    const filterButtons = document.querySelectorAll(".filter-btn");
    if (filterButtons.length > 0 && !filterButtons[0].onclick && filtersManager) {
      console.log("🔄 Re-setting up filters...");
      filtersManager.setup();
    }
  }, 100);
});
