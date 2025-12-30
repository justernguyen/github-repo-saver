// Repo Card Renderer - Handles rendering of repository cards

class RepoRenderer {
    constructor(state) {
        this.state = state;
        this.INCREMENTAL_RENDER_THRESHOLD = 100;
        this.INCREMENTAL_RENDER_BATCH_SIZE = 50;
    }

    // Render single repo card
    renderRepoCard(repo) {
        const q = (this.state.searchQuery || "").trim();
        const role = repo.role || 'infra-tooling';
        const status = repo.status || 'chuaxem';
        const customTags = repo.customTags || [];
        const technicalTags = repo.technicalTags || repo.topics || [];
        const updatedDate = repo.updatedAt ? new Date(repo.updatedAt).toLocaleDateString() : "N/A";
        const displayName = capitalizeFirstLetter(repo.customName || repo.name);
        const safeName = highlightText(displayName, q);
        const safeOwner = escapeHTML(repo.owner || "Unknown");
        const safeDesc = highlightText(repo.description || "No description provided.", q);
        const safeUrl = escapeHTML(repo.url || "#");
        const safeId = escapeHTML(repo.id || "");
        const safeNote = repo.note ? escapeHTML(repo.note) : "";
        const safeCollection = repo.collection ? escapeHTML(repo.collection) : "";
        const pinned = !!repo.pinned;

        return `
      <div class="repo-card" ${this.state.selectionMode ? 'data-repo-id="' + safeId + '"' : ''}>
          <div class="repo-header">
            <div class="repo-header-top">
              <div class="repo-header-left">
                <h3 class="repo-name">
                  <a href="${safeUrl}" target="_blank" class="repo-link" data-repo-id="${safeId}">${safeName}</a>
                </h3>
                <button
                  type="button"
                  class="pin-btn"
                  data-repo-id="${safeId}"
                  data-pinned="${pinned ? "true" : "false"}"
                  title="${pinned ? "Pinned" : "Pin"}"
                  aria-label="${pinned ? "Pinned" : "Pin"}"
                >${pinned ? "★" : "☆"}</button>
              </div>
              <div class="repo-header-right">
                ${safeCollection ? `<span class="collection-chip">🗂️ ${safeCollection}</span>` : ""}
                <span class="badge role-badge" data-role="${role || '__null__'}">${ROLE_LABELS[role] || role || 'Uncategorized'}</span>
                ${this.state.selectionMode ? `<input class="select-checkbox" type="checkbox" data-repo-id="${safeId}" ${this.state.selectedRepoIds.has(repo.id) ? "checked" : ""} />` : ""}
              </div>
            </div>
            <div class="repo-owner" style="margin-top: 4px; font-size: 13px; color: var(--text-muted);">
              by ${safeOwner}
            </div>
          </div>
        
        <div class="repo-meta">
          <div class="meta-item">⭐ <b>${formatStars(repo.stars || 0)}</b></div>
          <div class="meta-item">🍴 <b>${formatStars(repo.forks || 0)}</b></div>
          <div class="meta-item">🗓️ <b>${updatedDate}</b></div>
          ${repo.language ? `<div class="meta-item">🌐 <b>${escapeHTML(repo.language)}</b></div>` : ""}
          </div>
        
        <p class="repo-description">${safeDesc}</p>
          
        ${(technicalTags.length > 0 || customTags.length > 0) ? `
            <div class="repo-tags">
            ${technicalTags.slice(0, 5).map(tag => `<span class="tag">${escapeHTML(tag)}</span>`).join("")}
            ${customTags.slice(0, 5).map(tag => `<span class="tag">${escapeHTML(tag)}</span>`).join("")}
            </div>
        ` : ""}
          
        ${repo.note ? `<div class="repo-note">${safeNote}</div>` : ""}
          
          <div class="repo-actions">
          <div class="action-buttons">
            <button type="button" class="action-btn copy-btn" data-repo-url="${safeUrl}" data-repo-name="${safeName}">Clone</button>
            <button type="button" class="action-btn edit-btn" data-repo-id="${safeId}">Edit</button>
            <button type="button" class="action-btn danger delete-btn" data-repo-id="${safeId}">Delete</button>
          </div>
          <select class="status-select" data-repo-id="${safeId}">
            ${Object.entries(STATUS_LABELS).map(([value, label]) => {
            const icons = {
                chuaxem: "🌑",
                daxem: "👁️",
                dangdung: "🚀"
            };
            return `<option value="${value}" ${repo.status === value ? "selected" : ""}>${icons[value] || ""} ${label}</option>`;
        }).join("")}
          </select>
        </div>
      </div>
    `;
    }

    // Render all repos
    async renderRepos(grid) {
        if (this.state.renderInProgress) return;
        this.state.renderInProgress = true;

        const filtered = this.state.getFilteredRepos();
        const loading = document.getElementById("loading");
        const emptyState = document.getElementById("empty-state");

        if (loading) loading.style.display = "none";

        if (filtered.length === 0) {
            if (grid) grid.style.display = "none";
            if (emptyState) emptyState.style.display = "block";
            this.state.renderInProgress = false;
            return;
        }

        if (grid) grid.style.display = "grid";
        if (emptyState) emptyState.style.display = "none";

        // Virtual Scrolling for large datasets (> 200 items) - temporarily disabled for testing
        if (filtered.length > 200) {
            if (!this.virtualScroller) {
                this.virtualScroller = window.createVirtualScroller({
                    container: grid,
                    renderItem: (repo) => this.renderRepoCard(repo),
                    itemHeight: 320, // Approx card height + gap
                    buffer: 5
                });
            }
            this.virtualScroller.setItems(filtered);
        } else {
            // Clean up virtual scroller if it exists (switching from large key to small)
            if (this.virtualScroller) {
                // Reset container styles forced by virtual scroller
                grid.style.position = "";
                grid.style.height = "";
                grid.style.minHeight = "";
                grid.style.overflowY = "";
                grid.innerHTML = ""; // Clear content
                this.virtualScroller = null;
            }

            grid.innerHTML = filtered.map(repo => this.renderRepoCard(repo)).join("");
        }

        this.state.renderInProgress = false;

        // Reset keyboard navigation
        this.state.selectedRepoIndex = -1;
        this.state.keyboardNavEnabled = false;
        document.querySelectorAll(".repo-card").forEach(card => {
            card.classList.remove("keyboard-selected");
        });
    }
}

// Export factory function
function createRepoRenderer(state) {
    return new RepoRenderer(state);
}

// Expose to global scope for Chrome Extension
window.createRepoRenderer = createRepoRenderer;
