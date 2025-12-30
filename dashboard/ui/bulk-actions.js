// Bulk Actions Manager - Handles bulk selection and operations

class BulkActionsManager {
    constructor(state, repoService, onUpdate) {
        this.state = state;
        this.repoService = repoService;
        this.onUpdate = onUpdate;
        // Pending actions that haven't been applied yet
        this.pendingActions = {
            status: null,
            role: null,
            collection: null,
            tags: []
        };
    }

    setup() {
        this.setupSelectionMode();
        this.setupBulkActions();
        this.setupApplyCancel();
    }

    // Setup selection mode toggle
    setupSelectionMode() {
        const selectModeBtn = document.getElementById("select-mode-btn");
        if (selectModeBtn) {
            selectModeBtn.addEventListener("click", () => {
                this.toggleSelectionMode();
            });
        }
    }

    toggleSelectionMode() {
        try {
            const newMode = !this.state.selectionMode;
            this.state.setSelectionMode(newMode);

            // Always re-query elements to ensure we have fresh references
            const bulkBar = document.getElementById("bulk-bar");
            const selectModeBtn = document.getElementById("select-mode-btn");
            const previewRow = document.getElementById("bulk-preview-row");

            if (newMode) {
                if (bulkBar) bulkBar.classList.add("show");
                if (selectModeBtn) {
                    // Use both textContent and innerText to ensure update
                    selectModeBtn.textContent = "Exit Bulk Mode";
                    selectModeBtn.innerText = "Exit Bulk Mode";
                    // Also update innerHTML as fallback
                    selectModeBtn.innerHTML = "Exit Bulk Mode";
                }
                document.body.classList.add("bulk-mode-active");
            } else {
                // Clear selection and pending actions when exiting
                try {
                    this.state.clearSelection();
                } catch (e) {
                    console.error("Error clearing selection:", e);
                }
                
                try {
                    this.clearPendingActions();
                } catch (e) {
                    console.error("Error clearing pending actions:", e);
                }
                
                if (bulkBar) bulkBar.classList.remove("show");
                if (selectModeBtn) {
                    // Use both textContent and innerText to ensure update
                    selectModeBtn.textContent = "Bulk Action";
                    selectModeBtn.innerText = "Bulk Action";
                    // Also update innerHTML as fallback
                    selectModeBtn.innerHTML = "Bulk Action";
                }
                if (previewRow) previewRow.style.display = "none";
                document.body.classList.remove("bulk-mode-active");
            }

            this.updateBulkBar();
            this.updatePreview();
            if (this.onUpdate) this.onUpdate();
        } catch (error) {
            console.error("Error toggling selection mode:", error);
            this.showToast("Failed to toggle bulk mode: " + error.message);
        }
    }

    // Setup bulk action buttons
    setupBulkActions() {
        // Clear selection
        const clearBtn = document.getElementById("bulk-clear-btn");
        if (clearBtn) {
            clearBtn.addEventListener("click", () => {
                this.state.clearSelection();
                this.updateBulkBar();
                if (this.onUpdate) this.onUpdate();
            });
        }

        // Select All
        const selectAllBtn = document.getElementById("bulk-select-all-btn");
        if (selectAllBtn) {
            selectAllBtn.addEventListener("click", () => {
                const filtered = this.state.getFilteredRepos();
                this.state.selectAll(filtered.map(r => r.id));
                this.updateBulkBar();
                if (this.onUpdate) this.onUpdate();
            });
        }

        // Select None
        const selectNoneBtn = document.getElementById("bulk-select-none-btn");
        if (selectNoneBtn) {
            selectNoneBtn.addEventListener("click", () => {
                this.state.clearSelection();
                this.updateBulkBar();
                if (this.onUpdate) this.onUpdate();
            });
        }

        // Delete
        const deleteBtn = document.getElementById("bulk-delete-btn");
        if (deleteBtn) {
            deleteBtn.addEventListener("click", () => this.bulkDelete());
        }

        // Status change - only update pending, don't apply
        const statusSelect = document.getElementById("bulk-status");
        if (statusSelect) {
            statusSelect.addEventListener("change", (e) => {
                const status = e.target.value;
                if (status) {
                    this.pendingActions.status = status;
                } else {
                    this.pendingActions.status = null;
                }
                this.updatePreview();
            });
        }

        // Role change - only update pending, don't apply
        const roleSelect = document.getElementById("bulk-role");
        if (roleSelect) {
            roleSelect.addEventListener("change", (e) => {
                const role = e.target.value;
                if (role) {
                    this.pendingActions.role = role === "__null__" ? null : role;
                } else {
                    this.pendingActions.role = null;
                }
                this.updatePreview();
            });
        }

        // Move to collection - only update pending, don't apply
        const collectionInput = document.getElementById("bulk-collection");
        if (collectionInput) {
            collectionInput.addEventListener("input", (e) => {
                const collection = e.target.value.trim();
                if (collection) {
                    this.pendingActions.collection = collection;
                } else {
                    this.pendingActions.collection = null;
                }
                this.updatePreview();
            });
        }

        // Add tags - only update pending, don't apply
        const tagInput = document.getElementById("bulk-tag");
        if (tagInput) {
            tagInput.addEventListener("input", (e) => {
                const tags = e.target.value.trim().split(",").map(t => t.trim()).filter(Boolean);
                this.pendingActions.tags = tags;
                this.updatePreview();
            });
        }
    }

    // Update bulk action bar
    updateBulkBar() {
        const countEl = document.getElementById("bulk-count");
        const selectAllBtn = document.getElementById("bulk-select-all-btn");
        const selectNoneBtn = document.getElementById("bulk-select-none-btn");

        const count = this.state.selectedRepoIds.size;
        const filteredCount = this.state.getFilteredRepos().length;

        if (countEl) {
            countEl.textContent = String(count);
        }

        // Show/hide Select All/None buttons
        if (selectAllBtn && selectNoneBtn) {
            if (count === 0) {
                selectAllBtn.style.display = "inline-flex";
                selectNoneBtn.style.display = "none";
            } else if (count === filteredCount) {
                selectAllBtn.style.display = "none";
                selectNoneBtn.style.display = "inline-flex";
            } else {
                selectAllBtn.style.display = "inline-flex";
                selectNoneBtn.style.display = "inline-flex";
            }
        }

        // Update collection datalist
        this.updateBulkCollectionDatalist();
        
        // Update preview when selection changes
        this.updatePreview();
    }

    // Update collection datalist for autocomplete
    updateBulkCollectionDatalist() {
        const datalist = document.getElementById("bulk-collection-list");
        if (!datalist) return;

        const collections = this.state.getAllCollections();
        datalist.innerHTML = collections.map(c =>
            `<option value="${escapeHTML(c)}"></option>`
        ).join("");
    }

    // Bulk operations
    async bulkUpdateStatus(status) {
        if (this.state.selectedRepoIds.size === 0) {
            this.showToast("No repositories selected");
            return;
        }

        try {
            const repoIds = Array.from(this.state.selectedRepoIds);
            await this.repoService.bulkUpdateStatus(repoIds, status);
            this.showToast(`Updated ${repoIds.length} repositories`);
            this.state.clearSelection();
            this.updateBulkBar();
            if (this.onUpdate) this.onUpdate();
        } catch (error) {
            console.error("Bulk status update error:", error);
            this.showToast("Failed to update status");
        }
    }

    async bulkUpdateRole(role) {
        if (this.state.selectedRepoIds.size === 0) {
            this.showToast("No repositories selected");
            return;
        }

        try {
            const repoIds = Array.from(this.state.selectedRepoIds);
            await this.repoService.bulkUpdateRole(repoIds, role);
            this.showToast(`Updated ${repoIds.length} repositories`);
            this.state.clearSelection();
            this.updateBulkBar();
            if (this.onUpdate) this.onUpdate();
        } catch (error) {
            console.error("Bulk role update error:", error);
            this.showToast("Failed to update role");
        }
    }

    async bulkMoveToCollection(collection) {
        if (this.state.selectedRepoIds.size === 0) {
            this.showToast("No repositories selected");
            return;
        }

        try {
            const repoIds = Array.from(this.state.selectedRepoIds);
            await this.repoService.bulkMoveToCollection(repoIds, collection);
            this.showToast(`Moved ${repoIds.length} repositories to ${collection}`);
            this.state.clearSelection();
            this.updateBulkBar();
            if (this.onUpdate) this.onUpdate();
        } catch (error) {
            console.error("Bulk move error:", error);
            this.showToast("Failed to move repositories");
        }
    }

    async bulkAddTags(tags) {
        if (this.state.selectedRepoIds.size === 0) {
            this.showToast("No repositories selected");
            return;
        }

        try {
            const repoIds = Array.from(this.state.selectedRepoIds);
            await this.repoService.bulkAddTags(repoIds, tags);
            this.showToast(`Added tags to ${repoIds.length} repositories`);
            this.state.clearSelection();
            this.updateBulkBar();
            if (this.onUpdate) this.onUpdate();
        } catch (error) {
            console.error("Bulk tag error:", error);
            this.showToast("Failed to add tags");
        }
    }

    async bulkDelete() {
        if (this.state.selectedRepoIds.size === 0) {
            this.showToast("No repositories selected");
            return;
        }

        const count = this.state.selectedRepoIds.size;
        const confirmed = confirm(`Are you sure you want to delete ${count} repositories? This cannot be undone.`);

        if (!confirmed) return;

        try {
            const repoIds = Array.from(this.state.selectedRepoIds);
            await this.repoService.bulkDelete(repoIds);
            this.showToast(`Deleted ${count} repositories`);
            this.state.clearSelection();
            this.updateBulkBar();
            if (this.onUpdate) this.onUpdate();
        } catch (error) {
            console.error("Bulk delete error:", error);
            this.showToast("Failed to delete repositories");
        }
    }

    // Setup Apply and Cancel buttons
    setupApplyCancel() {
        const applyBtn = document.getElementById("bulk-apply-btn");
        const cancelBtn = document.getElementById("bulk-cancel-btn");

        if (applyBtn) {
            applyBtn.addEventListener("click", () => this.applyPendingActions());
        }

        if (cancelBtn) {
            cancelBtn.addEventListener("click", () => this.clearPendingActions());
        }
    }

    // Update preview of pending actions
    updatePreview() {
        const previewEl = document.getElementById("bulk-preview");
        const previewRow = document.getElementById("bulk-preview-row");
        const applyBtn = document.getElementById("bulk-apply-btn");
        const cancelBtn = document.getElementById("bulk-cancel-btn");

        const actions = [];
        if (this.pendingActions.status) {
            const statusLabels = {
                "chuaxem": "🌑 Unviewed",
                "daxem": "👁️ Viewed",
                "dangdung": "🚀 In Use"
            };
            actions.push(`Status: ${statusLabels[this.pendingActions.status] || this.pendingActions.status}`);
        }
        if (this.pendingActions.role !== null) {
            const roleLabels = {
                "ui-frontend": "🎨 UI/Frontend",
                "backend-api": "⚙️ Backend/API",
                "auth": "🔐 Auth",
                "payments": "💳 Payments",
                "ai-ml": "🤖 AI/ML",
                "infra-tooling": "🛠️ Infra/Tooling",
                "other": "📦 Other",
                "__null__": "❓ Uncategorized"
            };
            const roleLabel = this.pendingActions.role === null ? "❓ Uncategorized" : (roleLabels[this.pendingActions.role] || this.pendingActions.role);
            actions.push(`Role: ${roleLabel}`);
        }
        if (this.pendingActions.collection) {
            actions.push(`Collection: ${this.pendingActions.collection}`);
        }
        if (this.pendingActions.tags.length > 0) {
            actions.push(`Tags: ${this.pendingActions.tags.join(", ")}`);
        }

        const hasPending = actions.length > 0 && this.state.selectedRepoIds.size > 0;

        // Show/hide preview row
        if (previewRow) {
            previewRow.style.display = hasPending ? "flex" : "none";
        }

        if (previewEl) {
            if (hasPending) {
                previewEl.style.display = "flex";
                previewEl.innerHTML = `<span class="bulk-preview-text">📋 Pending: ${actions.join(" • ")}</span>`;
            } else {
                previewEl.style.display = "none";
            }
        }

        if (applyBtn) {
            applyBtn.style.display = hasPending ? "inline-flex" : "none";
        }

        if (cancelBtn) {
            cancelBtn.style.display = hasPending ? "inline-flex" : "none";
        }
    }

    // Clear pending actions
    clearPendingActions() {
        this.pendingActions = {
            status: null,
            role: null,
            collection: null,
            tags: []
        };

        // Reset form inputs
        const statusSelect = document.getElementById("bulk-status");
        const roleSelect = document.getElementById("bulk-role");
        const collectionInput = document.getElementById("bulk-collection");
        const tagInput = document.getElementById("bulk-tag");

        if (statusSelect) statusSelect.value = "";
        if (roleSelect) roleSelect.value = "";
        if (collectionInput) collectionInput.value = "";
        if (tagInput) tagInput.value = "";

        this.updatePreview();
    }

    // Apply all pending actions
    async applyPendingActions() {
        if (this.state.selectedRepoIds.size === 0) {
            this.showToast("No repositories selected");
            return;
        }

        const hasAnyAction = this.pendingActions.status !== null ||
                           this.pendingActions.role !== null ||
                           this.pendingActions.collection !== null ||
                           this.pendingActions.tags.length > 0;

        if (!hasAnyAction) {
            this.showToast("No pending actions to apply");
            return;
        }

        try {
            const repoIds = Array.from(this.state.selectedRepoIds);
            const updates = [];

            // Apply status
            if (this.pendingActions.status !== null) {
                await this.repoService.bulkUpdateStatus(repoIds, this.pendingActions.status);
                updates.push(`Status: ${this.pendingActions.status}`);
            }

            // Apply role
            if (this.pendingActions.role !== null) {
                await this.repoService.bulkUpdateRole(repoIds, this.pendingActions.role);
                updates.push(`Role: ${this.pendingActions.role || "Uncategorized"}`);
            }

            // Apply collection
            if (this.pendingActions.collection !== null) {
                await this.repoService.bulkMoveToCollection(repoIds, this.pendingActions.collection);
                updates.push(`Collection: ${this.pendingActions.collection}`);
            }

            // Apply tags
            if (this.pendingActions.tags.length > 0) {
                await this.repoService.bulkAddTags(repoIds, this.pendingActions.tags);
                updates.push(`Tags: ${this.pendingActions.tags.join(", ")}`);
            }

            this.showToast(`✅ Applied ${updates.length} change(s) to ${repoIds.length} repositories`);
            this.state.clearSelection();
            this.clearPendingActions();
            this.updateBulkBar();
            if (this.onUpdate) this.onUpdate();
        } catch (error) {
            console.error("Bulk apply error:", error);
            this.showToast("Failed to apply changes: " + error.message);
        }
    }

    // Helper
    showToast(message) {
        if (window.showToast) {
            window.showToast(message);
        } else {
            console.log("Toast:", message);
        }
    }
}

// Export factory function
function createBulkActionsManager(state, repoService, onUpdate) {
    return new BulkActionsManager(state, repoService, onUpdate);
}

// Expose to global scope for Chrome Extension
window.createBulkActionsManager = createBulkActionsManager;
