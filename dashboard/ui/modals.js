// Modals Manager - Handles all modal dialogs with clean, professional UI

class ModalsManager {
    constructor(state, repoService, onUpdate) {
        this.state = state;
        this.repoService = repoService;
        this.onUpdate = onUpdate;
        this.editingRepoId = null;
        this.deletingRepoId = null;
    }

    // Setup all modals
    setup() {
        this.setupEditModal();
        this.setupDeleteModal();
    }

    // ==================== EDIT MODAL ====================

    setupEditModal() {
        const cancelBtn = document.getElementById("cancel-edit-btn");
        const saveBtn = document.getElementById("save-edit-btn");
        const modal = document.getElementById("edit-modal");

        if (cancelBtn) {
            cancelBtn.addEventListener("click", () => this.closeEditModal());
        }

        if (saveBtn) {
            saveBtn.addEventListener("click", () => this.saveEdit());
        }

        if (modal) {
            modal.addEventListener("click", (e) => {
                if (e.target === modal) {
                    this.closeEditModal();
                }
            });
        }

        // Note character counter
        const noteInput = document.getElementById("edit-note");
        const noteCount = document.getElementById("edit-note-count");
        if (noteInput && noteCount) {
            noteInput.addEventListener("input", () => {
                noteCount.textContent = noteInput.value.length;
            });
        }
    }

    openEditModal(repoId) {
        if (!repoId) {
            console.error("No repo ID provided!");
            this.showToast("Error: No repository ID");
            return;
        }

        const repo = this.state.findRepo(repoId);
        if (!repo) {
            console.error("Repo not found! ID:", repoId);
            this.showToast("Repository not found");
            return;
        }

        this.editingRepoId = repoId;
        const modal = document.getElementById("edit-modal");
        if (!modal) {
            console.error("Edit modal element not found!");
            this.showToast("Edit modal not found");
            return;
        }

        // Set values
        const nameInput = document.getElementById("edit-name");
        const collectionInput = document.getElementById("edit-collection");
        const roleInput = document.getElementById("edit-role");
        const noteInput = document.getElementById("edit-note");
        const descriptionInput = document.getElementById("edit-description");

        if (nameInput) nameInput.value = repo.customName || repo.name || "";
        if (collectionInput) {
            collectionInput.value = repo.collection || "";

            // Setup collection autocomplete with datalist
            this.setupCollectionAutocomplete(collectionInput);
        }
        if (roleInput) {
            const roleValue = repo.role || null;
            roleInput.value = roleValue === null ? "__null__" : roleValue;
        }
        if (noteInput) {
            noteInput.value = repo.note || "";
            const noteCount = document.getElementById("edit-note-count");
            if (noteCount) noteCount.textContent = noteInput.value.length;
        }
        if (descriptionInput) descriptionInput.value = repo.description || "";

        // Render tags
        this.renderEditTags(repo.customTags || []);

        // Show modal
        modal.style.display = "flex";
        modal.style.pointerEvents = "auto";
        modal.style.opacity = "1";
        modal.style.visibility = "visible";
        void modal.offsetHeight;
        modal.classList.add("show");

        // Focus first input
        if (nameInput) {
            setTimeout(() => nameInput.focus(), 100);
        }
    }

    closeEditModal() {
        const modal = document.getElementById("edit-modal");
        if (modal) {
            modal.classList.remove("show");
            modal.style.opacity = "0";
            setTimeout(() => {
                modal.style.display = "none";
                modal.style.visibility = "hidden";
                modal.style.pointerEvents = "none";
            }, 300);
        }
        this.editingRepoId = null;
    }

    async saveEdit() {
        if (!this.editingRepoId) {
            this.showToast("Error: No repository selected");
            return;
        }

        const nameInput = document.getElementById("edit-name");
        const collectionInput = document.getElementById("edit-collection");
        const roleInput = document.getElementById("edit-role");
        const noteInput = document.getElementById("edit-note");
        const descriptionInput = document.getElementById("edit-description");

        const updates = {
            customName: nameInput ? nameInput.value.trim() : "",
            collection: collectionInput ? normalizeCollection(collectionInput.value) : "",
            role: roleInput && roleInput.value !== "__null__" ? roleInput.value : null,
            note: noteInput ? noteInput.value.trim() : "",
            description: descriptionInput ? descriptionInput.value.trim() : ""
        };

        // Get tags from container
        const tagsContainer = document.getElementById("edit-tags-container");
        if (tagsContainer) {
            const tagElements = tagsContainer.querySelectorAll(".tag-item");
            updates.customTags = Array.from(tagElements).map(el => el.dataset.tag).filter(Boolean);
        }

        try {
            await this.repoService.updateRepo(this.editingRepoId, updates);
            this.closeEditModal();
            this.showToast("Repository updated");
            if (this.onUpdate) this.onUpdate();
        } catch (error) {
            console.error("Error saving edit:", error);
            this.showToast("Failed to save changes");
        }
    }

    setupCollectionAutocomplete(collectionInput) {
        if (!collectionInput) return;

        // Helper function to escape HTML
        const escapeHTML = window.escapeHTML || ((str) => {
            if (!str) return '';
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        });

        // Get or create datalist
        let datalist = document.getElementById("edit-collection-datalist");
        if (!datalist) {
            datalist = document.createElement("datalist");
            datalist.id = "edit-collection-datalist";
            // Insert after the input's parent or append to body
            const formGroup = collectionInput.closest('.form-group');
            if (formGroup) {
                formGroup.appendChild(datalist);
            } else {
                collectionInput.parentNode.insertBefore(datalist, collectionInput.nextSibling);
            }
        }

        // Get all collections from state
        const collections = this.state.getAllCollections();

        // Clear and populate datalist
        datalist.innerHTML = collections.map(c => {
            const escaped = escapeHTML(c);
            return `<option value="${escaped}">${escaped}</option>`;
        }).join("");

        // Connect input to datalist
        if (!collectionInput.getAttribute('list')) {
            collectionInput.setAttribute('list', 'edit-collection-datalist');
        }
    }

    renderEditTags(tags) {
        const container = document.getElementById("edit-tags-container");
        const input = document.getElementById("edit-tags-input");
        if (!container || !input) return;

        // Clear existing tags (keep input)
        container.querySelectorAll(".tag-item").forEach(el => el.remove());

        // Render tags
        tags.forEach(tag => {
            const tagEl = document.createElement("div");
            tagEl.className = "tag-item";
            tagEl.dataset.tag = tag;
            tagEl.innerHTML = `
        ${escapeHTML(tag)}
        <span class="tag-remove" data-tag="${escapeHTML(tag)}">×</span>
      `;
            container.insertBefore(tagEl, input);

            // Remove handler
            const removeBtn = tagEl.querySelector(".tag-remove");
            removeBtn.addEventListener("click", () => {
                tagEl.remove();
            });
        });

        // Setup input handlers
        const newInput = input.cloneNode(true);
        input.parentNode.replaceChild(newInput, input);

        // Get all existing tags for autocomplete
        const allTags = this.state.getAllTags();

        // Autocomplete datalist
        let datalist = document.getElementById("edit-tags-datalist");
        if (!datalist) {
            datalist = document.createElement("datalist");
            datalist.id = "edit-tags-datalist";
            container.appendChild(datalist);
        }
        datalist.innerHTML = allTags.map(tag => `<option value="${escapeHTML(tag)}"></option>`).join("");
        newInput.setAttribute("list", "edit-tags-datalist");

        // Add tag on Enter
        newInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                const value = newInput.value.trim();
                if (value) {
                    // Check if tag already exists
                    const existingTags = Array.from(container.querySelectorAll(".tag-item")).map(el => el.dataset.tag);
                    if (!existingTags.includes(value)) {
                        this.renderEditTags([...existingTags, value]);
                    }
                    newInput.value = "";
                }
            }
        });
    }

    // ==================== DELETE MODAL ====================

    setupDeleteModal() {
        const cancelBtn = document.getElementById("cancel-delete-btn");
        const confirmBtn = document.getElementById("confirm-delete-btn");
        const modal = document.getElementById("delete-confirm-modal");

        if (cancelBtn) {
            cancelBtn.addEventListener("click", () => this.closeDeleteModal());
        }

        if (confirmBtn) {
            confirmBtn.addEventListener("click", () => this.confirmDelete());
        }

        if (modal) {
            modal.addEventListener("click", (e) => {
                if (e.target === modal) {
                    this.closeDeleteModal();
                }
            });
        }
    }

    openDeleteModal(repoId) {
        const repo = this.state.findRepo(repoId);
        if (!repo) {
            console.error("Repo not found:", repoId);
            this.showToast("Repository not found");
            return;
        }

        this.deletingRepoId = repoId;
        const modal = document.getElementById("delete-confirm-modal");
        if (!modal) {
            console.error("Delete confirm modal not found!");
            this.showToast("Delete modal not found");
            return;
        }

        modal.style.display = "flex";
        modal.style.pointerEvents = "auto";
        modal.style.opacity = "1";
        modal.style.visibility = "visible";
        void modal.offsetHeight;
        modal.classList.add("show");
    }

    closeDeleteModal() {
        const modal = document.getElementById("delete-confirm-modal");
        if (modal) {
            modal.classList.remove("show");
            modal.style.opacity = "0";
            setTimeout(() => {
                modal.style.display = "none";
                modal.style.visibility = "hidden";
                modal.style.pointerEvents = "none";
            }, 300);
        }
        this.deletingRepoId = null;
    }

    async confirmDelete() {
        if (!this.deletingRepoId) {
            this.showToast("Error: No repository selected");
            return;
        }

        try {
            await this.repoService.deleteRepo(this.deletingRepoId);
            this.closeDeleteModal();
            this.showToast("Repository deleted");
            if (this.onUpdate) this.onUpdate();
        } catch (error) {
            console.error("Error deleting repo:", error);
            this.showToast("Failed to delete repository");
        }
    }

    // ==================== SHORTCUTS MODAL ====================

    showShortcutsModal() {
        const modal = document.createElement("div");
        modal.className = "modal-overlay";
        modal.id = "shortcuts-modal";

        const shortcuts = [
            { key: "Ctrl + K", desc: "Focus Search", icon: "🔍", color: "#3B82F6" },
            { key: "/", desc: "Quick Search", icon: "⚡", color: "#F59E0B" },
            { key: "Ctrl + B", desc: "Bulk Selection", icon: "☑️", color: "#8B5CF6" },
            { key: "Ctrl + Z", desc: "Undo Action", icon: "↩️", color: "#3B82F6" },
            { key: "Ctrl + Shift + Z", desc: "Redo Action", icon: "↪️", color: "#3B82F6" },
            { key: "Ctrl + Shift + S", desc: "Open Dashboard", icon: "🚀", color: "#10B981" },
            { key: "Esc", desc: "Close / Exit", icon: "✕", color: "#64748B" }
        ];

        modal.innerHTML = `
      <div class="modal" style="max-width: 700px; border-radius: 20px; overflow: hidden;">
        <!-- Modern Header -->
        <div style="background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%); padding: 32px 32px 24px; position: relative; overflow: hidden;">
          <div style="position: absolute; top: -50px; right: -50px; width: 200px; height: 200px; background: rgba(255,255,255,0.1); border-radius: 50%; filter: blur(60px);"></div>
          <div style="display: flex; justify-content: space-between; align-items: center; position: relative; z-index: 1;">
            <div style="display: flex; align-items: center; gap: 16px;">
              <div style="width: 48px; height: 48px; background: rgba(255,255,255,0.2); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px; backdrop-filter: blur(10px);">⌨️</div>
              <div>
                <h2 style="margin: 0; font-size: 28px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.02em;">Keyboard Shortcuts</h2>
                <p style="margin: 4px 0 0 0; font-size: 14px; color: rgba(255,255,255,0.8); font-weight: 500;">Master your workflow</p>
              </div>
            </div>
            <button type="button" id="shortcuts-modal-close" style="background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.2); color: #FFFFFF; padding: 10px 20px; border-radius: 10px; font-weight: 600; font-size: 13px; cursor: pointer; transition: all 0.2s; backdrop-filter: blur(10px);">Close</button>
          </div>
        </div>
        
        <!-- Shortcuts List -->
        <div style="padding: 32px; background: #0F172A; max-height: 60vh; overflow-y: auto;">
          <div style="display: grid; gap: 16px;">
            ${shortcuts.map(s => `
              <div class="shortcut-card" style="display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; background: linear-gradient(135deg, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0.8) 100%); border-radius: 16px; border: 1px solid rgba(148, 163, 184, 0.1); transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); cursor: default; position: relative; overflow: hidden;">
                <div style="position: absolute; top: 0; left: 0; width: 4px; height: 100%; background: ${s.color}; opacity: 0; transition: opacity 0.3s;"></div>
                <div style="display: flex; align-items: center; gap: 16px; flex: 1;">
                  <div style="width: 44px; height: 44px; background: linear-gradient(135deg, ${s.color}15, ${s.color}08); border: 1px solid ${s.color}30; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0;">
                    ${s.icon}
                  </div>
                  <div>
                    <div style="color: #F1F5F9; font-weight: 600; font-size: 15px; margin-bottom: 4px; letter-spacing: -0.01em;">${s.desc}</div>
                    <div style="color: #94A3B8; font-size: 12px; font-weight: 500;">Press to ${s.desc.toLowerCase()}</div>
                  </div>
                </div>
                <kbd style="background: linear-gradient(135deg, #1E293B 0%, #0F172A 100%); border: 1.5px solid rgba(148, 163, 184, 0.2); padding: 10px 16px; border-radius: 10px; font-family: 'SF Mono', 'Monaco', 'Consolas', 'Courier New', monospace; font-size: 13px; color: #F1F5F9; font-weight: 700; letter-spacing: 0.5px; box-shadow: 0 4px 12px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08); min-width: fit-content; white-space: nowrap; transition: all 0.2s;">
                  ${s.key}
                </kbd>
              </div>
            `).join("")}
          </div>
        </div>
        
        <!-- Footer -->
        <div style="padding: 24px 32px; background: rgba(15, 23, 42, 0.5); border-top: 1px solid rgba(30, 41, 59, 0.5); display: flex; align-items: center; gap: 12px;">
          <div style="width: 40px; height: 40px; background: linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(217, 119, 6, 0.1)); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0;">💡</div>
          <div>
            <div style="color: #FDE68A; font-weight: 700; font-size: 13px; margin-bottom: 2px;">Pro Tip</div>
            <div style="color: #94A3B8; font-size: 12px; line-height: 1.5;">Use these shortcuts to navigate faster and boost your productivity!</div>
          </div>
        </div>
      </div>
    `;

        // Add CSS for hover effects
        if (!document.getElementById('shortcuts-modal-styles')) {
            const style = document.createElement('style');
            style.id = 'shortcuts-modal-styles';
            style.textContent = `
                .shortcut-card:hover {
                    transform: translateX(4px);
                    border-color: rgba(99, 102, 241, 0.4) !important;
                    background: linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(139, 92, 246, 0.08) 100%) !important;
                    box-shadow: 0 8px 24px rgba(99, 102, 241, 0.15);
                }
                .shortcut-card:hover > div:first-child {
                    opacity: 1 !important;
                }
                .shortcut-card:hover kbd {
                    border-color: rgba(148, 163, 184, 0.4) !important;
                    box-shadow: 0 6px 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1) !important;
                    transform: scale(1.05);
                }
                #shortcuts-modal-close:hover {
                    background: rgba(255,255,255,0.25) !important;
                    border-color: rgba(255,255,255,0.3) !important;
                    transform: translateY(-1px);
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(modal);

        const closeBtn = modal.querySelector("#shortcuts-modal-close");
        if (closeBtn) {
            closeBtn.addEventListener("click", () => modal.remove());
        }
        modal.addEventListener("click", (e) => {
            if (e.target === modal) modal.remove();
        });

        const escListener = (e) => {
            if (e.key === "Escape") {
                modal.remove();
                document.removeEventListener("keydown", escListener);
            }
        };
        document.addEventListener("keydown", escListener);

        modal.style.display = "flex";
        modal.style.pointerEvents = "auto";
        modal.style.opacity = "1";
        modal.style.visibility = "visible";
        setTimeout(() => modal.classList.add("show"), 10);
    }

    // ==================== STATISTICS MODAL WITH DONUT CHARTS ====================

    // Helper: Create clean donut chart with labels on slices
    createPieChart(data, colors, size = 260) {
        const total = data.reduce((sum, item) => sum + item.value, 0);
        if (total === 0) return '<div style="color: #64748B; text-align: center; padding: 40px; font-size: 14px;">No data available</div>';

        const centerX = size / 2;
        const centerY = size / 2;
        const radius = size * 0.42;
        const innerRadius = size * 0.25;

        let currentAngle = -90;

        const slices = data.map((item, index) => {
            const percentage = (item.value / total) * 100;
            const angle = (percentage / 100) * 360;
            const startAngle = currentAngle;
            const endAngle = currentAngle + angle;
            const midAngle = (startAngle + endAngle) / 2;

            currentAngle = endAngle;

            // Calculate path coordinates
            const startRad = (startAngle * Math.PI) / 180;
            const endRad = (endAngle * Math.PI) / 180;
            const midRad = (midAngle * Math.PI) / 180;

            const x1 = centerX + radius * Math.cos(startRad);
            const y1 = centerY + radius * Math.sin(startRad);
            const x2 = centerX + radius * Math.cos(endRad);
            const y2 = centerY + radius * Math.sin(endRad);

            const largeArc = angle > 180 ? 1 : 0;

            // Pie chart path (full wedge from center)
            const pathData = [
                `M ${centerX} ${centerY}`,
                `L ${x1} ${y1}`,
                `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
                'Z'
            ].join(' ');

            const color = colors[item.rawStatus || item.rawRole] || colors[index % Object.keys(colors).length] || '#64748B';

            // Label position (on the slice - 60% from center)
            const labelRadius = radius * 0.6;
            const labelX = centerX + labelRadius * Math.cos(midRad);
            const labelY = centerY + labelRadius * Math.sin(midRad);

            return {
                path: pathData,
                color: color,
                label: item.label,
                value: item.value,
                percentage: percentage.toFixed(0),
                labelX,
                labelY,
                showLabel: percentage > 8 // Only show label if slice is big enough
            };
        });

        return `
            <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="filter: drop-shadow(0 4px 16px rgba(0,0,0,0.3));">
                <!-- Donut slices -->
                ${slices.map((slice, idx) => `
                    <g>
                        <path 
                            d="${slice.path}" 
                            fill="${slice.color}" 
                            stroke="#1E293B" 
                            stroke-width="2"
                            style="transition: all 0.3s ease; cursor: pointer;"
                            onmouseover="this.style.opacity='0.85'"
                            onmouseout="this.style.opacity='1'">
                            <title>${slice.label}: ${slice.value} (${slice.percentage}%)</title>
                        </path>
                    </g>
                `).join('')}
                
                <!-- Labels on slices -->
                ${slices.filter(s => s.showLabel).map((slice) => `
                    <g>
                        <text 
                            x="${slice.labelX}" 
                            y="${slice.labelY - 6}" 
                            text-anchor="middle" 
                            style="font-size: 11px; font-weight: 700; fill: #0F172A; pointer-events: none;">
                            ${slice.label}
                        </text>
                        <text 
                            x="${slice.labelX}" 
                            y="${slice.labelY + 8}" 
                            text-anchor="middle" 
                            style="font-size: 14px; font-weight: 800; fill: #0F172A; pointer-events: none;">
                            ${slice.percentage}%
                        </text>
                    </g>
                `).join('')}
            </svg>
        `;
    }

    showStatisticsModal() {
        const stats = this.repoService.calculateStatistics();
        const STATUS_LABELS = window.STATUS_LABELS || {
            chuaxem: "Unviewed",
            daxem: "Viewed",
            dangdung: "In Use"
        };
        const ROLE_LABELS = window.ROLE_LABELS || {
            'ui-frontend': 'UI / Frontend',
            'backend-api': 'Backend / API',
            'auth': 'Auth',
            'payments': 'Payments',
            'ai-ml': 'AI / ML',
            'infra-tooling': 'Infra / Tooling',
            'other': 'Other',
            null: 'Uncategorized',
            undefined: 'Uncategorized'
        };
        const escapeHTML = window.escapeHTML || ((str) => {
            if (!str) return '';
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        });

        const statusData = stats.byStatus.map(s => ({
            label: STATUS_LABELS[s.status] || s.status,
            value: s.count,
            rawStatus: s.status
        }));

        const roleData = stats.byRole.map(r => ({
            label: ROLE_LABELS[r.role] || r.role || 'Uncategorized',
            value: r.count,
            rawRole: r.role
        }));

        const statusColors = {
            'chuaxem': '#64748B',  // Slate
            'daxem': '#3B82F6',    // Blue
            'dangdung': '#10B981'  // Green
        };

        const roleColors = {
            'ui-frontend': '#8B5CF6', // Purple
            'backend-api': '#3B82F6', // Blue
            'auth': '#10B981',        // Green
            'payments': '#F59E0B',    // Amber
            'ai-ml': '#EC4899',       // Pink
            'infra-tooling': '#06B6D4', // Cyan
            'other': '#94A3B8',       // Slate Light
            null: '#475569'           // Slate Dark
        };

        const modal = document.createElement("div");
        modal.className = "modal-overlay";
        modal.id = "stats-modal";
        modal.innerHTML = `
      <div class="modal" style="max-width: 900px; max-height: 90vh; display: flex; flex-direction: column; border-radius: 12px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.5); background: #0F172A;">
         <!-- Compact Header -->
         <div style="background: #1E293B; padding: 14px 20px; border-bottom: 1px solid rgba(148, 163, 184, 0.1); flex-shrink: 0;">
           <div style="display: flex; justify-content: space-between; align-items: center;">
             <div>
               <h2 style="margin: 0; font-size: 16px; font-weight: 600; color: #F1F5F9; letter-spacing: -0.01em;">Repository Statistics</h2>
             </div>
             <button type="button" id="stats-modal-close" style="background: transparent; border: 1px solid rgba(148, 163, 184, 0.2); color: #94A3B8; padding: 5px 12px; border-radius: 6px; font-weight: 500; font-size: 11px; cursor: pointer; transition: all 0.2s;">Close</button>
           </div>
         </div>
        
        <!-- Scrollable Content -->
        <div style="flex: 1; overflow-y: auto; overflow-x: hidden; padding: 20px; background: #0F172A; scrollbar-width: thin; scrollbar-color: rgba(148, 163, 184, 0.3) rgba(15, 23, 42, 0.5);">
          <style>
            #stats-modal .modal > div:last-child::-webkit-scrollbar {
              width: 8px;
            }
            #stats-modal .modal > div:last-child::-webkit-scrollbar-track {
              background: rgba(15, 23, 42, 0.5);
              border-radius: 4px;
            }
            #stats-modal .modal > div:last-child::-webkit-scrollbar-thumb {
              background: rgba(148, 163, 184, 0.3);
              border-radius: 4px;
            }
            #stats-modal .modal > div:last-child::-webkit-scrollbar-thumb:hover {
              background: rgba(148, 163, 184, 0.5);
            }
          </style>
        
          <!-- Compact Stats Row -->
          <div style="display: flex; gap: 10px; margin-bottom: 18px; align-items: center;">
            <div class="stat-main-card" style="flex: 1; padding: 10px 14px; background: linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(139, 92, 246, 0.08) 100%); border: 1px solid rgba(99, 102, 241, 0.25); border-radius: 10px; position: relative; overflow: hidden; transition: all 0.3s; display: flex; align-items: center; gap: 12px;">
              <div style="position: absolute; top: -8px; right: -8px; width: 40px; height: 40px; background: rgba(99, 102, 241, 0.1); border-radius: 50%; filter: blur(20px);"></div>
              <div style="position: relative; z-index: 1; flex-shrink: 0;">
                <div style="font-size: 9px; color: #94A3B8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">TOTAL REPOS</div>
                <div style="font-size: 24px; font-weight: 800; color: #818CF8; letter-spacing: -0.02em; line-height: 1;">${stats.total}</div>
              </div>
            </div>
            
            <div class="stat-main-card" style="flex: 1; padding: 10px 14px; background: linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(5, 150, 105, 0.08) 100%); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 10px; position: relative; overflow: hidden; transition: all 0.3s; display: flex; align-items: center; gap: 12px;">
              <div style="position: absolute; top: -8px; right: -8px; width: 40px; height: 40px; background: rgba(16, 185, 129, 0.1); border-radius: 50%; filter: blur(20px);"></div>
              <div style="position: relative; z-index: 1; flex-shrink: 0;">
                <div style="font-size: 9px; color: #94A3B8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">COLLECTIONS</div>
                <div style="font-size: 24px; font-weight: 800; color: #34D399; letter-spacing: -0.02em; line-height: 1;">${stats.collections}</div>
              </div>
            </div>
          </div>

          <!-- Compact Charts Section -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: ${stats.topCollections.length > 0 ? '20px' : '0'};">
            <!-- Status Distribution -->
            <div class="chart-card" style="background: linear-gradient(135deg, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0.8) 100%); border: 1px solid rgba(148, 163, 184, 0.15); border-radius: 16px; padding: 20px; position: relative; overflow: visible; display: flex; flex-direction: column; align-items: center;">
              <div style="position: absolute; top: -30px; right: -30px; width: 100px; height: 100px; background: rgba(99, 102, 241, 0.05); border-radius: 50%; filter: blur(40px);"></div>
              <div style="margin-bottom: 18px; position: relative; z-index: 1; text-align: center; width: 100%;">
                <h3 style="margin: 0; color: #F1F5F9; font-size: 15px; font-weight: 700; letter-spacing: -0.01em;">By Status</h3>
              </div>
              <div style="display: flex; justify-content: center; align-items: center; position: relative; z-index: 1; width: 100%; flex: 1;">
                ${this.createPieChart(statusData, statusColors, 260)}
              </div>
            </div>

            <!-- Role Distribution -->
            <div class="chart-card" style="background: linear-gradient(135deg, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0.8) 100%); border: 1px solid rgba(148, 163, 184, 0.15); border-radius: 16px; padding: 20px; position: relative; overflow: visible; display: flex; flex-direction: column; align-items: center;">
              <div style="position: absolute; top: -30px; right: -30px; width: 100px; height: 100px; background: rgba(139, 92, 246, 0.05); border-radius: 50%; filter: blur(40px);"></div>
              <div style="margin-bottom: 18px; position: relative; z-index: 1; text-align: center; width: 100%;">
                <h3 style="margin: 0; color: #F1F5F9; font-size: 15px; font-weight: 700; letter-spacing: -0.01em;">By Role</h3>
              </div>
              <div style="display: flex; justify-content: center; align-items: center; position: relative; z-index: 1; width: 100%; flex: 1;">
                ${this.createPieChart(roleData, roleColors, 260)}
              </div>
            </div>
          </div>

          <!-- Top Collections (Bar Chart) -->
          ${stats.topCollections.length > 0 ? `
            <div style="background: linear-gradient(135deg, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0.8) 100%); border: 1px solid rgba(148, 163, 184, 0.15); border-radius: 16px; padding: 20px;">
              <div style="margin-bottom: 16px;">
                <h3 style="margin: 0; color: #F1F5F9; font-size: 14px; font-weight: 700; letter-spacing: -0.01em;">Top Collections</h3>
                <p style="margin: 4px 0 0 0; color: #64748B; font-size: 11px; font-weight: 500;">Most organized repositories</p>
              </div>
              
              <div style="display: flex; flex-direction: column; gap: 10px;">
                ${stats.topCollections.filter(c => c.name).slice(0, 8).map((c, idx) => {
            const colors = ['#6366F1', '#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#64748B', '#94A3B8'];
            const color = colors[idx % colors.length];
            const maxCount = Math.max(...stats.topCollections.map(c => c.count));
            const percentage = (c.count / maxCount) * 100;

            return `
                    <div style="display: flex; align-items: center; gap: 10px;">
                      <div style="min-width: 100px; max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        <span style="color: #CBD5E1; font-size: 12px; font-weight: 600;">${escapeHTML(c.name)}</span>
                      </div>
                      <div style="flex: 1; height: 20px; background: rgba(30, 41, 59, 0.6); border-radius: 4px; overflow: hidden; position: relative;">
                        <div style="height: 100%; background: ${color}; width: ${percentage}%; transition: width 0.5s ease; border-radius: 4px;"></div>
                      </div>
                      <div style="min-width: 28px; text-align: right;">
                        <span style="color: #F1F5F9; font-size: 12px; font-weight: 700;">${c.count}</span>
                      </div>
                    </div>
                    `;
        }).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    `;

        // Add CSS for hover effects
        if (!document.getElementById('stats-modal-styles')) {
            const style = document.createElement('style');
            style.id = 'stats-modal-styles';
            style.textContent = `
                .stat-main-card:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 12px 32px rgba(0,0,0,0.3);
                    border-color: rgba(99, 102, 241, 0.4) !important;
                }
                .chart-card:hover {
                    border-color: rgba(148, 163, 184, 0.2) !important;
                    box-shadow: 0 8px 24px rgba(0,0,0,0.2);
                }
                .stat-item:hover {
                    background: rgba(30, 41, 59, 0.8) !important;
                    transform: translateX(4px);
                    border-left-width: 5px !important;
                }
                .collection-item:hover {
                    transform: translateX(4px) translateY(-1px);
                    border-left-width: 5px !important;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.25), 0 0 12px rgba(99, 102, 241, 0.15) !important;
                }
                .collection-item:hover > div:first-child {
                    opacity: 1 !important;
                }
                #stats-modal-close:hover {
                    background: linear-gradient(135deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.25) 100%) !important;
                    border-color: rgba(255,255,255,0.45) !important;
                    transform: translateY(-2px) scale(1.02);
                    box-shadow: 0 6px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.4), 0 0 0 1px rgba(255,255,255,0.15) !important;
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(modal);

        const closeBtn = modal.querySelector("#stats-modal-close");
        if (closeBtn) {
            closeBtn.addEventListener("click", () => this.closeStatsModal());
        }
        modal.addEventListener("click", (e) => {
            if (e.target === modal) this.closeStatsModal();
        });

        modal.style.display = "flex";
        modal.style.pointerEvents = "auto";
        modal.style.opacity = "1";
        modal.style.visibility = "visible";
        setTimeout(() => modal.classList.add("show"), 10);
    }

    closeStatsModal() {
        const modal = document.getElementById("stats-modal");
        if (modal) {
            modal.classList.remove("show");
            setTimeout(() => modal.remove(), 300);
        }
    }

    showToast(message) {
        if (window.showToast) {
            window.showToast(message);
        } else {
            console.log("Toast:", message);
        }
    }
}

function createModalsManager(state, repoService, onUpdate) {
    return new ModalsManager(state, repoService, onUpdate);
}

window.createModalsManager = createModalsManager;
