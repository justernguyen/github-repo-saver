// Event Handlers - Centralized event delegation for repo cards

class EventHandlers {
    constructor(state, repoService, modalsManager, onUpdate) {
        this.state = state;
        this.repoService = repoService;
        this.modalsManager = modalsManager;
        this.onUpdate = onUpdate;
        this.attachedListeners = new WeakMap();
    }

    setup() {
        this.setupPinDelegation();
        this.setupCopyButtons();
        this.setupEditDeleteButtons();
        this.setupStatusSelects();
        this.setupRepoLinks();
        this.setupCardClickForBulk();
        this.setupCheckboxes();
    }

    // Pin/Unpin delegation
    setupPinDelegation() {
        if (window.pinDelegationHandler) {
            document.removeEventListener("click", window.pinDelegationHandler, true);
        }

        window.pinDelegationHandler = async (e) => {
            const pinBtn = e.target.closest(".pin-btn");
            if (!pinBtn) return;

            e.preventDefault();
            e.stopPropagation();

            const repoId = pinBtn.dataset.repoId;
            if (!repoId) return;

            try {
                await this.repoService.togglePin(repoId);
                this.showToast("Pin toggled");
                if (this.onUpdate) this.onUpdate();
            } catch (error) {
                console.error("Error toggling pin:", error);
                this.showToast("Failed to toggle pin");
            }
        };

        document.addEventListener("click", window.pinDelegationHandler, true);
    }

    // Copy clone command
    setupCopyButtons() {
        if (window.copyBtnHandler) {
            document.removeEventListener("click", window.copyBtnHandler, true);
        }

        window.copyBtnHandler = async (e) => {
            const btn = e.target.closest(".copy-btn");
            if (!btn) return;

            e.preventDefault();
            e.stopPropagation();

            const repoUrl = btn.dataset.repoUrl;
            const repoName = btn.dataset.repoName || "repository";

            if (!repoUrl) {
                this.showToast("Repository URL not found");
                return;
            }

            const cleanUrl = cleanGitHubUrl(repoUrl);
            const cloneUrl = cleanUrl.endsWith('.git') ? cleanUrl.slice(0, -4) : cleanUrl;
            const cloneCommand = `git clone ${cloneUrl}`;

            const os = detectOS();
            let toastMessage = "Git clone command copied!";

            if (os === 'macOS') {
                toastMessage = "Command copied! Paste in Terminal (Cmd+V)";
            } else if (os === 'Windows') {
                toastMessage = "Command copied! Paste in CMD/PowerShell (Ctrl+V)";
            } else if (os === 'Linux') {
                toastMessage = "Command copied! Paste in terminal (Ctrl+Shift+V)";
            }

            try {
                await navigator.clipboard.writeText(cloneCommand);
                this.showToast(toastMessage);
                const originalText = btn.textContent;
                btn.textContent = "Copied!";
                setTimeout(() => {
                    btn.textContent = originalText;
                }, 2000);
            } catch (err) {
                console.error("Failed to copy:", err);
                const textarea = document.createElement("textarea");
                textarea.value = cloneCommand;
                textarea.style.position = "fixed";
                textarea.style.opacity = "0";
                document.body.appendChild(textarea);
                textarea.select();
                try {
                    document.execCommand("copy");
                    this.showToast(toastMessage);
                    const originalText = btn.textContent;
                    btn.textContent = "Copied!";
                    setTimeout(() => {
                        btn.textContent = originalText;
                    }, 2000);
                } catch (fallbackErr) {
                    console.error("Fallback copy failed:", fallbackErr);
                    this.showToast("Failed to copy. Please copy manually: " + cloneCommand);
                }
                document.body.removeChild(textarea);
            }
        };

        document.addEventListener("click", window.copyBtnHandler, true);
    }

    // Edit and Delete buttons
    setupEditDeleteButtons() {
        if (window.editBtnHandler) {
            document.removeEventListener("click", window.editBtnHandler, true);
        }

        window.editBtnHandler = (e) => {
            const btn = e.target.closest(".edit-btn");
            if (!btn) return;

            e.preventDefault();
            e.stopPropagation();

            const id = btn.dataset.repoId;
            if (!id) {
                console.error("No repo ID found!");
                this.showToast("Error: No repository ID");
                return;
            }

            try {
                this.modalsManager.openEditModal(id);
            } catch (error) {
                console.error("Error opening edit modal:", error);
                this.showToast("Failed to open edit modal");
            }
        };

        document.addEventListener("click", window.editBtnHandler, true);

        if (window.deleteBtnHandler) {
            document.removeEventListener("click", window.deleteBtnHandler, true);
        }

        window.deleteBtnHandler = (e) => {
            const btn = e.target.closest(".delete-btn");
            if (!btn) return;

            e.preventDefault();
            e.stopPropagation();

            const id = btn.dataset.repoId;
            if (!id) {
                console.error("No repo ID found!");
                this.showToast("Error: No repository ID");
                return;
            }

            this.modalsManager.openDeleteModal(id);
        };

        document.addEventListener("click", window.deleteBtnHandler, true);
    }

    // Status select dropdowns
    setupStatusSelects() {
        if (window.statusSelectHandler) {
            document.removeEventListener("change", window.statusSelectHandler, true);
        }

        window.statusSelectHandler = async (e) => {
            const select = e.target.closest(".status-select");
            if (!select) return;

            e.preventDefault();
            e.stopPropagation();

            const repoId = select.dataset.repoId;
            const newStatus = select.value;

            if (repoId && newStatus) {
                try {
                    await this.repoService.updateStatus(repoId, newStatus);
                    this.showToast("Status updated");
                    if (this.onUpdate) this.onUpdate();
                } catch (error) {
                    console.error("Error updating status:", error);
                    this.showToast("Failed to update status");
                }
            }
        };

        document.addEventListener("change", window.statusSelectHandler, true);
    }

    // Repo links - track when opened
    setupRepoLinks() {
        const links = document.querySelectorAll(".repo-link");
        links.forEach((a) => {
            const oldHandler = this.attachedListeners.get(a);
            if (oldHandler) {
                a.removeEventListener("click", oldHandler);
            }

            const handler = async (e) => {
                if (this.state.selectionMode) {
                    return;
                }

                const repoId = a.getAttribute("data-repo-id");
                if (!repoId) return;

                try {
                    await this.repoService.recordOpened(repoId);
                } catch {
                    // ignore
                }
            };

            a.addEventListener("click", handler);
            this.attachedListeners.set(a, handler);
        });
    }

    // Card click for bulk selection
    setupCardClickForBulk() {
        if (window.repoCardClickHandler) {
            document.removeEventListener("click", window.repoCardClickHandler, true);
        }

        window.repoCardClickHandler = (e) => {
            if (!this.state.selectionMode) return;

            const card = e.target.closest(".repo-card");
            if (!card) return;

            const target = e.target;
            const isInteractive = target.tagName === 'BUTTON' ||
                target.tagName === 'INPUT' ||
                target.tagName === 'SELECT' ||
                target.tagName === 'TEXTAREA' ||
                (target.tagName === 'A' && !target.classList.contains('repo-link'));

            if (isInteractive) {
                return;
            }

            if (target.classList.contains('repo-link')) {
                e.preventDefault();
                e.stopPropagation();
            }

            const link = card.querySelector(".repo-link");
            if (!link) return;
            const repoId = link.getAttribute("data-repo-id");
            if (!repoId) return;

            const checkbox = card.querySelector(".select-checkbox");
            if (checkbox) {
                checkbox.checked = !checkbox.checked;
                this.state.toggleRepoSelection(repoId);
            }
        };

        document.addEventListener("click", window.repoCardClickHandler, true);
    }

    // Checkboxes
    setupCheckboxes() {
        const checkboxes = document.querySelectorAll(".select-checkbox");
        checkboxes.forEach((cb) => {
            const oldChangeHandler = this.attachedListeners.get(cb);
            const oldClickHandler = this.attachedListeners.get(cb + "_click");
            if (oldChangeHandler) cb.removeEventListener("change", oldChangeHandler);
            if (oldClickHandler) cb.removeEventListener("click", oldClickHandler);

            const changeHandler = (e) => {
                const id = cb.dataset.repoId;
                if (!id) return;
                this.state.toggleRepoSelection(id);
            };

            const clickHandler = (e) => {
                e.stopPropagation();
            };

            cb.addEventListener("change", changeHandler);
            cb.addEventListener("click", clickHandler);
            this.attachedListeners.set(cb, changeHandler);
            this.attachedListeners.set(cb + "_click", clickHandler);
        });
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
function createEventHandlers(state, repoService, modalsManager, onUpdate) {
    return new EventHandlers(state, repoService, modalsManager, onUpdate);
}

// Expose to global scope for Chrome Extension
window.createEventHandlers = createEventHandlers;
