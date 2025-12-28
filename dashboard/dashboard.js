// Modern Repo Saver Dashboard

const STATUS_LABELS = {
  chuaxem: "Unviewed",
  daxem: "Viewed",
  dathu: "Tried",
  dangdung: "In Use",
  bo: "Dropped"
};

const STATUS_COLORS = {
  chuaxem: "#9CA3AF",
  daxem: "#60A5FA",
  dathu: "#A78BFA",
  dangdung: "#34D399",
  bo: "#F87171"
};

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

let allRepos = [];
let searchQuery = "";
let sortBy = "newest";
let activeFilter = ""; // Empty by default to allow dropdown filters
let activeStatusFilter = "";
let activeRoleFilter = "";
let editingRepoId = null;

// -----------------------------
// Chrome Sync UI
// -----------------------------
let syncEnabled = false;

function formatSyncStatus(meta) {
  if (!meta) return "Sync enabled";
  const parts = [];
  if (Number.isFinite(meta.syncedCount)) parts.push(`${meta.syncedCount} synced`);
  if (meta.partial) parts.push("partial");
  if (Number.isFinite(meta.updatedAt)) {
    try {
      const d = new Date(meta.updatedAt);
      parts.push(d.toLocaleString(undefined, { month: "2-digit", day: "2-digit", year: "numeric" }));
      parts.push(d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }));
    } catch {
      // ignore
    }
  }
  return parts.join(" • ") || "Sync enabled";
}

async function refreshSyncStatus() {
  try {
    const res = await chrome.runtime.sendMessage({ type: "GET_SYNC_STATUS" });
    syncEnabled = !!res?.enabled;
    const btn = document.getElementById("sync-toggle-btn");
    const label = document.getElementById("sync-toggle-label");
    const statusWrap = document.getElementById("sync-status");
    const statusText = document.getElementById("sync-status-text");
    if (label) label.textContent = syncEnabled ? "On" : "Off";
    if (btn) btn.dataset.enabled = syncEnabled ? "true" : "false";
    if (statusWrap && statusText) {
      if (syncEnabled) {
        statusWrap.style.display = "flex";
        statusText.textContent = formatSyncStatus(res?.meta);
      } else {
        statusWrap.style.display = "none";
      }
    }
  } catch {
    // ignore
  }
}

async function toggleSync() {
  const next = !syncEnabled;
  const btn = document.getElementById("sync-toggle-btn");
  if (btn) btn.style.opacity = "0.7";
  try {
    const res = await chrome.runtime.sendMessage({ type: "SET_SYNC_ENABLED", enabled: next });
    if (!res?.success) {
      showToast(res?.error || "Failed to update Sync setting");
    } else {
      showToast(next ? "Sync enabled" : "Sync disabled");
    }
  } catch (e) {
    showToast("Failed to update Sync setting");
  } finally {
    if (btn) btn.style.opacity = "1";
    await refreshSyncStatus();
    // Reload repos so the UI reflects sync source-of-truth
    await loadRepos();
  }
}

// Simple HTML escape to prevent injection when rendering repo data
function escapeHTML(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Capitalize the first letter for nicer display (does not change stored IDs/URLs)
function capitalizeFirstLetter(value) {
  const s = String(value ?? "").trim();
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Format stars (e.g. 2000 -> 2k)
function formatStars(count) {
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1).replace(/\.0$/, '') + 'm';
  }
  if (count >= 1000) {
    return (count / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  }
  return count;
}

// Load repos
async function loadRepos() {
  try {
    const loadingEl = document.getElementById("loading");
    if (loadingEl) {
      loadingEl.textContent = "Loading repositories...";
    }

    const response = await chrome.runtime.sendMessage({ type: "GET_ALL_REPOS" });

    if (!response) {
      throw new Error("No response from background script");
    }

    if (response.error) {
      throw new Error(response.error);
    }

    const repos = response.repos || [];
    const licenseInfo = {
      license: response.license || "free",
      isPro: response.isPro || false,
      repoCount: response.repoCount || repos.length,
      limit: response.limit || null,
      remaining: response.limit ? Math.max(0, response.limit - repos.length) : null
    };



    // Update license UI
    updateLicenseUI(licenseInfo);

    allRepos = repos.map(repo => ({
      ...repo,
      status: repo.status || "chuaxem",
      role: repo.role || null, // Allow null role
      customTags: repo.customTags || [],
      technicalTags: repo.technicalTags || repo.topics || [],
      note: repo.note || "",
      stars: repo.stars || 0,
      forks: repo.forks || 0,
      updatedAt: repo.updatedAt || repo.savedAt || Date.now()
    }));

    renderRepos();
    updateStats();

    if (loadingEl) {
      loadingEl.style.display = "none";
    }
  } catch (error) {
    console.error("Error loading repos:", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      name: error.name
    });

    const loadingEl = document.getElementById("loading");
    if (loadingEl) {
      loadingEl.textContent = `Error loading repositories: ${error.message || "Unknown error"}`;
      loadingEl.style.color = "#F87171";
    }

    // Show empty state
    const repoGrid = document.getElementById("repo-grid");
    const emptyState = document.getElementById("empty-state");
    if (repoGrid) repoGrid.style.display = "none";
    if (emptyState) {
      emptyState.style.display = "block";
      emptyState.innerHTML = `
        <div class="empty-state-icon">⚠️</div>
        <h2>Error Loading Repositories</h2>
        <p>${escapeHTML(error.message || "Please try refreshing the page")}</p>
      `;
    }
  }
}

// Get filtered repos
function getFilteredRepos() {
  let filtered = [...allRepos];

  // Apply search
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter(repo =>
      repo.name.toLowerCase().includes(query) ||
      (repo.description || "").toLowerCase().includes(query) ||
      (repo.customTags || []).some(tag => tag.toLowerCase().includes(query)) ||
      (repo.technicalTags || []).some(tag => tag.toLowerCase().includes(query))
    );
  }

  // Apply filters
  // If "All" button is clicked, activeFilter = "all" shows everything
  // Otherwise, use dropdown filters (can combine status + role for 2-layer filtering)

  if (activeFilter === "all") {
    // "All" button is selected - show everything, ignore dropdowns
    // No filtering needed
  } else {
    // Use dropdown filters - apply BOTH if selected (AND logic)
    // Filter by status
    if (activeStatusFilter) {
      filtered = filtered.filter(repo => repo.status === activeStatusFilter);

    }

    // Filter by role
    if (activeRoleFilter) {
      if (activeRoleFilter === "__null__") {
        // Filter for uncategorized repos (null or undefined role)
        filtered = filtered.filter(repo => !repo.role || repo.role === null || repo.role === undefined);
      } else {
        filtered = filtered.filter(repo => repo.role === activeRoleFilter);
      }

    }

    // If no filters selected, show all (default behavior)
    if (!activeStatusFilter && !activeRoleFilter) {

    }
  }

  // Apply sort
  filtered.sort((a, b) => {
    switch (sortBy) {
      case "newest":
        return (b.savedAt || 0) - (a.savedAt || 0);
      case "oldest":
        return (a.savedAt || 0) - (b.savedAt || 0);
      case "name":
        return a.name.localeCompare(b.name);
      case "stars":
        return (b.stars || 0) - (a.stars || 0);
      case "forks":
        return (b.forks || 0) - (a.forks || 0);
      case "updated":
        return (b.updatedAt || 0) - (a.updatedAt || 0);
      default:
        return 0;
    }
  });

  return filtered;
}

// Update stats
function updateStats() {
  const total = allRepos.length;
  const filteredCount = getFilteredRepos().length;
  const unviewed = allRepos.filter(r => r.status === "chuaxem").length;
  const inUse = allRepos.filter(r => r.status === "dangdung").length;

  const totalEl = document.getElementById("total-count");
  const filteredEl = document.getElementById("filtered-count");
  const unviewedEl = document.getElementById("unviewed-count");
  const inUseEl = document.getElementById("in-use-count");

  if (totalEl) totalEl.textContent = String(total);
  if (filteredEl) filteredEl.textContent = String(filteredCount);
  if (unviewedEl) unviewedEl.textContent = String(unviewed);
  if (inUseEl) inUseEl.textContent = String(inUse);
}

// Update license UI - Simplified for donate model
function updateLicenseUI(licenseInfo) {
  const licenseInfoEl = document.getElementById("license-info");
  const licenseTextEl = document.getElementById("license-text");
  const exportBtn = document.getElementById("export-btn");
  const importBtn = document.getElementById("import-btn");

  // Always show Export/Import - free for everyone
  if (exportBtn) exportBtn.style.display = "flex";
  if (importBtn) importBtn.style.display = "flex";

  // Simple info display
  if (licenseInfoEl) {
    licenseInfoEl.style.display = "flex";
    licenseInfoEl.style.background = "var(--bg-card)";
    licenseInfoEl.style.color = "var(--text-muted)";
    licenseInfoEl.style.border = "1px solid var(--border)";
  }
  if (licenseTextEl) {
    licenseTextEl.textContent = `${licenseInfo.repoCount || 0} repos`;
  }
}

// Show upgrade modal - REMOVED (donate model instead)
function showUpgradeModal() {
  // Free version - no upgrade needed
}

// Render repos
function renderRepos() {
  const filtered = getFilteredRepos();
  const grid = document.getElementById("repo-grid");
  const loading = document.getElementById("loading");
  const emptyState = document.getElementById("empty-state");

  if (loading) loading.style.display = "none";

  if (filtered.length === 0) {
    if (grid) grid.style.display = "none";
    if (emptyState) emptyState.style.display = "block";
    return;
  }

  if (grid) grid.style.display = "grid";
  if (emptyState) emptyState.style.display = "none";

  grid.innerHTML = filtered.map(repo => {
    const role = repo.role || 'infra-tooling';
    const status = repo.status || 'chuaxem';
    const customTags = repo.customTags || [];
    const technicalTags = repo.technicalTags || repo.topics || [];
    const updatedDate = repo.updatedAt ? new Date(repo.updatedAt).toLocaleDateString() : "N/A";
    const displayName = capitalizeFirstLetter(repo.customName || repo.name);
    const safeName = escapeHTML(displayName);
    const safeOwner = escapeHTML(repo.owner || "Unknown");
    const safeDesc = escapeHTML(repo.description || "No description provided.");
    const safeUrl = escapeHTML(repo.url || "#");
    const safeId = escapeHTML(repo.id || "");
    const safeNote = repo.note ? escapeHTML(repo.note) : "";

    return `
      <div class="repo-card">
          <div class="repo-header">
          <div class="repo-title">
          <h3 class="repo-name">
            <a href="${safeUrl}" target="_blank">${safeName}</a>
          </h3>
            <div class="repo-owner" style="margin-top: 4px; font-size: 13px; color: var(--text-muted);">
              by ${safeOwner}
            </div>
          </div>
              <div class="repo-badges">
            <span class="badge role-badge">${ROLE_LABELS[role] || role}</span>
            <span class="badge status-badge" style="background: ${STATUS_COLORS[status]}22; color: ${STATUS_COLORS[status]}; border-color: ${STATUS_COLORS[status]}44">
              ${STATUS_LABELS[status]}
                </span>
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
            ${Object.entries(STATUS_LABELS).map(([value, label]) =>
      `<option value="${value}" ${repo.status === value ? "selected" : ""}>${label}</option>`
    ).join("")}
          </select>
        </div>
      </div>
    `;
  }).join("");

  // Attach listeners immediately after rendering
  attachEventListeners();
  updateStats();
}

// Clean GitHub URL - remove query parameters and fragments
function cleanGitHubUrl(url) {
  try {
    const urlObj = new URL(url);
    // Remove all query parameters
    urlObj.search = '';
    // Remove fragment
    urlObj.hash = '';
    // Return clean URL
    return urlObj.toString();
  } catch (error) {
    console.error("Error cleaning URL:", error);
    // Fallback: remove query string manually
    return url.split('?')[0].split('#')[0];
  }
}

// Attach event listeners - DIRECT ATTACHMENT, NO DELEGATION
function attachEventListeners() {


  // Copy buttons
  const copyButtons = document.querySelectorAll(".copy-btn");

  copyButtons.forEach((btn, index) => {

    btn.onclick = function (e) {
      e.preventDefault();
      e.stopPropagation();

      const repoUrl = this.dataset.repoUrl;
      // Clean URL first
      const cleanUrl = cleanGitHubUrl(repoUrl);
      const cloneUrl = cleanUrl.endsWith('.git') ? cleanUrl : `${cleanUrl}.git`;
      const cloneCommand = `git clone ${cloneUrl}`;





      navigator.clipboard.writeText(cloneCommand).then(() => {
        showToast("Git clone command copied!");
        this.textContent = "Copied!";
        setTimeout(() => {
          this.textContent = "Copy";
        }, 2000);
      }).catch(err => {
        console.error("Failed to copy:", err);
        const textarea = document.createElement("textarea");
        textarea.value = cloneCommand;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        showToast("Git clone command copied!");
      });
    };
    // Also try addEventListener
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();

      const repoUrl = this.dataset.repoUrl;
      // Clean URL first
      const cleanUrl = cleanGitHubUrl(repoUrl);
      // Remove .git if present, git clone will add it automatically
      const cloneUrl = cleanUrl.endsWith('.git') ? cleanUrl.slice(0, -4) : cleanUrl;
      const cloneCommand = `git clone ${cloneUrl}`;

      navigator.clipboard.writeText(cloneCommand).then(() => {
        showToast("Git clone command copied!");
        this.textContent = "Copied!";
        setTimeout(() => { this.textContent = "Copy"; }, 2000);
      });
    });
  });

  // Edit buttons - SIMPLE AND DIRECT
  const editButtons = document.querySelectorAll(".edit-btn");


  editButtons.forEach((btn, index) => {
    const repoId = btn.dataset.repoId || btn.getAttribute("data-repo-id");


    if (!repoId) {
      console.error(`Edit button ${index} has no repo ID!`);
      return;
    }

    // Remove all existing event listeners by cloning
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);

    // Set repo ID again
    newBtn.dataset.repoId = repoId;
    newBtn.setAttribute("data-repo-id", repoId);

    // Add click handler - SIMPLE AND DIRECT
    newBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      const id = this.dataset.repoId || this.getAttribute("data-repo-id");

      showToast("Opening edit modal..."); // Debug toast

      if (!id) {
        console.error("No repo ID found!");
        showToast("Error: No repository ID");
        return;
      }

      try {

        openEditModal(id);

      } catch (error) {
        console.error("Error opening edit modal:", error);
        console.error(error.stack);
        showToast("Failed to open edit modal: " + error.message);
      }
    }, true); // Use capture phase

    // Also add as onclick for extra safety
    newBtn.onclick = function (e) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      const id = this.dataset.repoId || this.getAttribute("data-repo-id");


      if (!id) {
        console.error("No repo ID found!");
        return;
      }

      try {
        openEditModal(id);
      } catch (error) {
        console.error("Error opening edit modal:", error);
      }

      return false;
    };


  });

  // Delete buttons - use custom confirm modal
  const deleteButtons = document.querySelectorAll(".delete-btn");

  deleteButtons.forEach((btn, index) => {
    const repoId = btn.dataset.repoId || btn.getAttribute("data-repo-id");


    if (!repoId) {
      console.error(`Delete button ${index} has no repo ID!`);
      return;
    }

    // Remove existing listeners by cloning
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    newBtn.dataset.repoId = repoId;
    newBtn.setAttribute("data-repo-id", repoId);

    // Add click handler
    newBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      const id = this.dataset.repoId || this.getAttribute("data-repo-id");


      if (!id) {
        console.error("No repo ID found!");
        showToast("Error: No repository ID");
        return;
      }

      openDeleteConfirmModal(id);
    }, true);

    // Also add onclick for backup
    newBtn.onclick = function (e) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      const id = this.dataset.repoId || this.getAttribute("data-repo-id");


      if (!id) {
        return;
      }

      openDeleteConfirmModal(id);
      return false;
    };


  });

  // Status selects
  const statusSelects = document.querySelectorAll(".status-select");

  statusSelects.forEach((select, index) => {

    select.onchange = function (e) {
      e.preventDefault();
      e.stopPropagation();
      const repoId = this.dataset.repoId;
      const newStatus = this.value;

      updateRepoStatus(repoId, newStatus);
    };
    select.addEventListener("change", function (e) {
      e.preventDefault();
      e.stopPropagation();
      const repoId = this.dataset.repoId;
      const newStatus = this.value;

      updateRepoStatus(repoId, newStatus);
    });
  });


}

// Update repo status
async function updateRepoStatus(repoId, newStatus) {
  try {
    if (!repoId || typeof repoId !== "string") {
      showToast("Failed to update status: missing repo ID");
      return;
    }
    if (!newStatus || typeof newStatus !== "string") {
      showToast("Failed to update status: invalid status");
      return;
    }
    await chrome.runtime.sendMessage({
      type: "UPDATE_REPO",
      repoId: repoId,
      updates: { status: newStatus }
    });
    await loadRepos();
    showToast("Status updated");
  } catch (error) {
    console.error("Error updating status:", error);
    showToast("Failed to update status");
  }
}

// Delete repo
let deletingRepoId = null;

// Open delete confirm modal
function openDeleteConfirmModal(repoId) {

  const repo = allRepos.find(r => r.id === repoId);
  if (!repo) {
    console.error("Repo not found:", repoId);
    showToast("Repository not found");
    return;
  }

  deletingRepoId = repoId;
  const modal = document.getElementById("delete-confirm-modal");
  if (!modal) {
    console.error("Delete confirm modal not found!");
    showToast("Delete modal not found");
    return;
  }

  // Show modal
  modal.style.display = "flex";
  modal.style.pointerEvents = "auto";
  modal.style.opacity = "1";
  modal.style.visibility = "visible";

  void modal.offsetHeight; // Force reflow

  modal.classList.add("show");


}

// Close delete confirm modal
function closeDeleteConfirmModal() {

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
  deletingRepoId = null;

}

// Delete repo (called after confirmation)
async function deleteRepo(repoId) {

  try {
    const response = await chrome.runtime.sendMessage({
      type: "REMOVE_REPO",
      repoId: repoId
    });


    if (response && response.error) {
      console.error("Error from background:", response.error);
      showToast("Failed to delete: " + response.error);
      return;
    }

    // Close modal first
    closeDeleteConfirmModal();

    // Force reload repos

    await loadRepos();

    showToast("Repository deleted");
  } catch (error) {
    console.error("Error deleting repo:", error);
    console.error(error.stack);
    showToast("Failed to delete repository: " + error.message);
  }
}

// Open edit modal
function openEditModal(repoId) {




  if (!repoId) {
    console.error("No repo ID provided!");
    showToast("Error: No repository ID");
    return;
  }

  const repo = allRepos.find(r => r.id === repoId);
  if (!repo) {
    console.error("Repo not found! ID:", repoId);

    showToast("Repository not found");
    return;
  }



  editingRepoId = repoId;
  const modal = document.getElementById("edit-modal");
  if (!modal) {
    console.error("Edit modal element not found!");
    showToast("Edit modal not found");
    return;
  }



  // Set values
  const nameInput = document.getElementById("edit-name");
  const noteInput = document.getElementById("edit-note");
  const descriptionInput = document.getElementById("edit-description");

  console.log("Input elements:", {
    nameInput: !!nameInput,
    noteInput: !!noteInput,
    descriptionInput: !!descriptionInput
  });

  if (nameInput) {
    nameInput.value = (repo.customName || repo.name || "");
  }

  if (noteInput) {
    noteInput.value = repo.note || "";

  }

  if (descriptionInput) {
    descriptionInput.value = repo.description || "";

  }

  // Update note count
  if (noteInput) {
    const noteCount = document.getElementById("edit-note-count");
    if (noteCount) {
      noteCount.textContent = (repo.note || "").length;
    }
  }

  renderEditTags(repo.customTags || []);

  // Show modal - simple and reliable approach
  // Remove any inline styles that might interfere
  modal.style.display = "";
  modal.style.opacity = "";
  modal.style.visibility = "";
  modal.style.pointerEvents = "";

  // Add show class (CSS handles display: flex and opacity)
  modal.classList.add("show");

  // Small delay to ensure CSS transition works
  setTimeout(() => {
    const computedStyle = window.getComputedStyle(modal);
    if (computedStyle.display === "none" || computedStyle.opacity === "0") {
      // Fallback: force display if CSS didn't work
      modal.style.display = "flex";
      modal.style.opacity = "1";
      modal.style.visibility = "visible";
      modal.style.pointerEvents = "auto";
    }
  }, 10);


}

// Render edit tags
function renderEditTags(tags) {
  const container = document.getElementById("edit-tags-container");
  if (!container) return;

  // Ensure input exists (keep one input; do not recreate every render)
  let input = container.querySelector("#edit-tags-input");
  if (!input) {
    input = document.createElement("input");
    input.type = "text";
    input.className = "tag-input";
    input.id = "edit-tags-input";
    input.placeholder = "Type and press Enter...";
    container.appendChild(input);
  }

  // Remove existing tag chips but keep the input
  container.querySelectorAll(".tag-item").forEach(el => el.remove());

  // Render chips before the input
  const safeTags = (Array.isArray(tags) ? tags : [])
    .map(t => String(t || "").trim())
    .filter(Boolean);

  safeTags.forEach(tag => {
    const tagEl = document.createElement("span");
    tagEl.className = "tag-item";
    tagEl.textContent = tag + " ×";
    tagEl.dataset.tag = tag;
    tagEl.style.cursor = "pointer";
    tagEl.style.userSelect = "none";
    container.insertBefore(tagEl, input);
  });

  // Attach handlers once (direct input handlers + delegation remove)
  if (!container.dataset.tagsBound) {
    container.dataset.tagsBound = "1";

    // Remove tag on click (delegation)
    container.addEventListener("click", (e) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      const chip = target.closest(".tag-item");
      if (!chip) return;
      e.preventDefault();
      e.stopPropagation();
      const tagToRemove = chip.dataset.tag;
      const currentTags = Array.from(container.querySelectorAll(".tag-item"))
        .map(el => (el.dataset.tag || "").trim())
        .filter(Boolean);
      const next = currentTags.filter(t => t !== tagToRemove);
      renderEditTags(next);
    });
  }

  // Bind input events once (some environments don't bubble keydown reliably)
  if (!input.dataset.bound) {
    input.dataset.bound = "1";

    const commitValue = () => {
      const raw = input.value || "";
      const parts = raw
        .split(/[,\n]/g)
        .map(s => s.trim())
        .filter(Boolean);
      if (parts.length === 0) return;

      const currentTags = Array.from(container.querySelectorAll(".tag-item"))
        .map(el => (el.dataset.tag || "").trim())
        .filter(Boolean);

      const next = [...currentTags];
      for (const p of parts) {
        if (!next.includes(p)) next.push(p);
      }
      input.value = "";
      renderEditTags(next);
    };

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        commitValue();
      }
    });

    // If user clicks away with text still present, commit it
    input.addEventListener("blur", () => {
      commitValue();
    });
  }

  // Keep focus for better UX
  setTimeout(() => {
    try { input.focus(); } catch { /* ignore */ }
  }, 0);
}

// Close edit modal
function closeEditModal() {
  const editModal = document.getElementById("edit-modal");
  if (!editModal) return;

  // Remove show class
  editModal.classList.remove("show");

  // Clear inline styles
  editModal.style.display = "";
  editModal.style.opacity = "";
  editModal.style.visibility = "";
  editModal.style.pointerEvents = "";

  editingRepoId = null;

}

// Save edit
async function saveEdit() {
  if (!editingRepoId) {
    console.error("No repo ID for editing");
    return;
  }



  const nameInput = document.getElementById("edit-name");
  const noteInput = document.getElementById("edit-note");
  const descriptionInput = document.getElementById("edit-description");
  const tagsContainer = document.getElementById("edit-tags-container");

  const customNameRaw = nameInput ? nameInput.value.trim() : "";
  const note = noteInput ? noteInput.value.trim() : "";
  const description = descriptionInput ? descriptionInput.value.trim() : "";
  const customTags = tagsContainer ? Array.from(tagsContainer.querySelectorAll(".tag-item"))
    .map(el => String(el.dataset.tag || "").trim())
    .filter(Boolean) : [];

  const updates = {
    customTags: Array.from(new Set(customTags))
  };

  if (customNameRaw) updates.customName = customNameRaw;
  else updates.customName = undefined;

  if (note) updates.note = note;
  else updates.note = undefined;

  if (description) updates.description = description;



  try {
    await chrome.runtime.sendMessage({
      type: "UPDATE_REPO",
      repoId: editingRepoId,
      updates: updates
    });

    await loadRepos();
    closeEditModal();
    showToast("Repository updated");
  } catch (error) {
    console.error("Error updating repo:", error);
    showToast("Failed to update repository");
  }
}

// Global handlers for inline onclick
window.handleFilterClick = function (btn, filter) {

  document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  activeFilter = filter;
  // Reset dropdowns when clicking All
  if (filter === "all") {
    activeStatusFilter = "";
    activeRoleFilter = "";
    const statusSelect = document.getElementById("status-filter");
    const roleSelect = document.getElementById("role-filter");
    if (statusSelect) statusSelect.value = "";
    if (roleSelect) roleSelect.value = "";
  }
  renderRepos();
};

window.handleStatusFilterChange = function (value) {

  activeStatusFilter = value || "";
  // Always uncheck All button when using dropdowns
  document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
  activeFilter = ""; // Clear "All" filter to allow dropdown filters


  renderRepos();
};

window.handleRoleFilterChange = function (value) {

  activeRoleFilter = value || "";
  // Always uncheck All button when using dropdowns
  document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
  activeFilter = ""; // Clear "All" filter to allow dropdown filters


  renderRepos();
};

window.handleSearchInput = function (value) {

  searchQuery = value;
  renderRepos();
};

window.handleSortChange = function (value) {

  sortBy = value;
  renderRepos();
};

window.handleEditClick = function (repoId) {

  if (!repoId) {
    console.error("No repo ID provided!");
    showToast("Error: No repository ID");
    return;
  }
  try {
    openEditModal(repoId);
  } catch (error) {
    console.error("Error opening edit modal:", error);
    console.error(error.stack);
    showToast("Failed to open edit modal: " + error.message);
  }
};

// Setup filters - NO INLINE HANDLERS, ONLY EVENT LISTENERS
function setupFilters() {


  // Filter buttons - PRIMARY event listeners
  const filterButtons = document.querySelectorAll(".filter-btn");


  filterButtons.forEach((btn, index) => {
    const filterValue = btn.dataset.filter;


    // Remove any existing listeners by cloning
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    newBtn.dataset.filter = filterValue;

    // Add click listener
    newBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();

      document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
      this.classList.add("active");
      activeFilter = filterValue;
      activeStatusFilter = "";
      activeRoleFilter = "";
      renderRepos();
    });
  });

  // Status filter select - PRIMARY event listener
  const statusSelect = document.getElementById("status-filter");

  if (statusSelect) {
    statusSelect.addEventListener("change", function (e) {
      const value = this.value || "";

      activeStatusFilter = value;
      document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
      activeFilter = "";

      renderRepos();
    });

  } else {
    console.error("❌ Status filter not found!");
  }

  // Role filter select - PRIMARY event listener
  const roleSelect = document.getElementById("role-filter");

  if (roleSelect) {
    roleSelect.addEventListener("change", function (e) {
      const value = this.value || "";

      activeRoleFilter = value;
      document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
      activeFilter = "";

      renderRepos();
    });

  } else {
    console.error("❌ Role filter not found!");
  }

  // Search input - PRIMARY event listeners
  const searchInput = document.getElementById("search-input");

  if (searchInput) {
    searchInput.addEventListener("input", function (e) {
      searchQuery = this.value;

      renderRepos();
    });
    searchInput.addEventListener("keyup", function (e) {
      searchQuery = this.value;
      renderRepos();
    });

  } else {
    console.error("❌ Search input not found!");
  }

  // Sort select - PRIMARY event listener
  const sortSelect = document.getElementById("sort-select");

  if (sortSelect) {
    sortSelect.addEventListener("change", function (e) {
      sortBy = this.value;

      renderRepos();
    });

  } else {
    console.error("❌ Sort select not found!");
  }


}

// Setup edit modal
function setupEditModal() {
  const modal = document.getElementById("edit-modal");
  const cancelBtn = document.getElementById("cancel-edit-btn");
  const saveBtn = document.getElementById("save-edit-btn");
  const noteInput = document.getElementById("edit-note");
  const noteCount = document.getElementById("edit-note-count");

  if (!modal || !cancelBtn || !saveBtn) {
    console.error("Edit modal elements not found!");
    return;
  }

  modal.onclick = function (e) {
    if (e.target === modal) closeEditModal();
  };

  cancelBtn.onclick = function (e) {
    e.preventDefault();
    e.stopPropagation();
    closeEditModal();
  };

  saveBtn.onclick = function (e) {
    e.preventDefault();
    e.stopPropagation();
    saveEdit();
  };

  if (noteInput && noteCount) {
    noteInput.oninput = function (e) {
      const length = this.value.length;
      noteCount.textContent = length;
      if (length > 500) {
        this.value = this.value.slice(0, 500);
        noteCount.textContent = "500";
      }
    };
  }
}

// Export repos to JSON (Free for everyone)
async function exportRepos(repos) {
  // No license check - free for everyone

  try {
    const dataStr = JSON.stringify(repos, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `github-repos-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);

    showToast(`✅ Exported ${repos.length} repositories!`, "success");
  } catch (err) {
    console.error("Export failed:", err);
    showToast("❌ Export failed", "error");
  }
}

// Import repos from JSON (Free for everyone)
async function importRepos() {
  // No license check - free for everyone

  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';

  input.onchange = async (e) => {
    try {
      const file = e.target.files[0];
      if (!file) return;

      const text = await file.text();
      const importedRepos = JSON.parse(text);

      if (!Array.isArray(importedRepos)) {
        throw new Error("Invalid format: expected array of repositories");
      }

      // Get existing repos
      const response = await chrome.runtime.sendMessage({ type: "GET_ALL_REPOS" });
      const existingRepos = response.repos || [];
      const existingIds = new Set(existingRepos.map(r => r.id));

      // Filter out duplicates
      const newRepos = importedRepos.filter(r => !existingIds.has(r.id));

      if (newRepos.length === 0) {
        showToast("ℹ️ No new repositories to import (all already exist)", "success");
        return;
      }

      // Import each new repo
      let imported = 0;
      for (const repo of newRepos) {
        try {
          await chrome.runtime.sendMessage({
            type: "CONFIRM_SAVE_REPO",
            repo: repo,
            role: repo.role,
            customTags: repo.customTags || [],
            note: repo.note
          });
          imported++;
        } catch (err) {
          console.error(`Failed to import ${repo.name}:`, err);
        }
      }

      showToast(`✅ Imported ${imported} new repositories!`, "success");

      // Reload repos
      setTimeout(() => {
        loadRepos();
      }, 1500);

    } catch (err) {
      console.error("Import failed:", err);
      showToast(`❌ Import failed: ${err.message}`, "error");
    }
  };

  input.click();
}

// Setup export/import buttons
function setupExportImport() {
  const exportBtn = document.getElementById("export-btn");
  const importBtn = document.getElementById("import-btn");

  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      exportRepos(allRepos);
    });
  }

  if (importBtn) {
    importBtn.addEventListener("click", () => {
      importRepos();
    });
  }

  // Rate 5 Stars button
  const rateBtn = document.getElementById("rate-btn");
  if (rateBtn) {
    rateBtn.addEventListener("click", () => {
      const extensionId = chrome.runtime.id;
      const webStoreUrl = `https://chrome.google.com/webstore/detail/${extensionId}/reviews`;
      window.open(webStoreUrl, "_blank");
    });
  }
}

// Setup delete confirm modal
function setupDeleteConfirmModal() {
  const modal = document.getElementById("delete-confirm-modal");
  const cancelBtn = document.getElementById("cancel-delete-btn");
  const confirmBtn = document.getElementById("confirm-delete-btn");

  if (!modal || !cancelBtn || !confirmBtn) {
    console.error("Delete confirm modal elements not found!");
    return;
  }

  // Close on overlay click
  modal.onclick = function (e) {
    if (e.target === modal) {
      closeDeleteConfirmModal();
    }
  };

  // Cancel button
  cancelBtn.onclick = function (e) {
    e.preventDefault();
    e.stopPropagation();
    closeDeleteConfirmModal();
  };

  // Confirm button
  confirmBtn.onclick = function (e) {
    e.preventDefault();
    e.stopPropagation();
    if (deletingRepoId) {

      deleteRepo(deletingRepoId);
    } else {
      console.error("No repo ID to delete!");
      showToast("Error: No repository ID");
    }
  };

  // Also add event listeners as backup
  cancelBtn.addEventListener("click", function (e) {
    e.preventDefault();
    e.stopPropagation();
    closeDeleteConfirmModal();
  });

  confirmBtn.addEventListener("click", function (e) {
    e.preventDefault();
    e.stopPropagation();
    if (deletingRepoId) {
      deleteRepo(deletingRepoId);
    }
  });


}

// Show toast
function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add("show"), 10);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Initialize when DOM is ready
function initializeDashboard() {





  // Wait for body
  if (!document.body) {

    setTimeout(initializeDashboard, 50);
    return;
  }

  // Check if elements exist
  const searchInput = document.getElementById("search-input");
  const filterButtons = document.querySelectorAll(".filter-btn");



  // Wait a bit more to ensure all elements are rendered
  setTimeout(() => {
    try {



      setupFilters();


      setupEditModal();


      setupDeleteConfirmModal();


      setupExportImport();

      // Sync toggle
      const syncBtn = document.getElementById("sync-toggle-btn");
      if (syncBtn) {
        syncBtn.addEventListener("click", () => {
          toggleSync();
        });
      }
      refreshSyncStatus();


      loadRepos().then(() => {


      }).catch(err => {
        console.error("❌ Error loading repos:", err);
        console.error(err.stack);
      });
    } catch (error) {
      console.error("❌ Error initializing dashboard:", error);
      console.error(error.stack);
    }
  }, 300);
}

// Start initialization - try multiple approaches



if (document.readyState === 'loading') {

  document.addEventListener('DOMContentLoaded', function () {

    initializeDashboard();
  });
} else {

  initializeDashboard();
}

// Also try window.onload as backup
window.addEventListener('load', function () {

  // Re-setup filters in case they weren't ready
  setTimeout(() => {
    const filterButtons = document.querySelectorAll(".filter-btn");
    if (filterButtons.length > 0 && !filterButtons[0].onclick) {

      setupFilters();
    }
  }, 100);
});
