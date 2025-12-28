// Simple Repo Saver Popup

let pendingRepo = null;
let selectedRole = null;

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

function capitalizeFirstLetter(value) {
  const s = String(value ?? "").trim();
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Resize standalone popup window (opened via ?popup=window) to fit content
function isStandaloneSaveWindow() {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("popup") === "window";
  } catch {
    return false;
  }
}

let resizeRaf = 0;
function resizeWindowToContent({ minHeight = 320, maxHeight = 580 } = {}) {
  if (!isStandaloneSaveWindow()) return;

  if (resizeRaf) cancelAnimationFrame(resizeRaf);
  resizeRaf = requestAnimationFrame(() => {
    try {
      const doc = document.documentElement;
      const contentHeight = Math.max(doc.scrollHeight, doc.offsetHeight);
      const chromeExtra = Math.max(0, window.outerHeight - window.innerHeight);
      const targetOuterHeight = Math.min(
        maxHeight,
        Math.max(minHeight, contentHeight + chromeExtra)
      );
      // Keep current width; adjust height only
      window.resizeTo(window.outerWidth, targetOuterHeight);
    } catch {
      // ignore resize failures
    }
  });
}

// Detect if this is a popup window (opened from Save Github) or extension popup
function isPopupWindow() {
  // Method 1: Check query parameter
  const urlParams = new URLSearchParams(window.location.search);
  const hasPopupParam = urlParams.get('popup') === 'window';

  // Method 2: Check if opened as a window (has window.opener or specific window type)
  const isStandaloneWindow = window.opener !== null || window.location.search.includes('popup=window');

  // Method 3: Check window dimensions (popup windows are smaller)
  const isSmallWindow = window.outerWidth < 500 && window.outerHeight < 700;

  return hasPopupParam || isStandaloneWindow;
}

// Load pending repo
async function loadPendingRepo() {
  try {
    const isWindow = isPopupWindow();

    // Nếu là popup window (từ Save Github), hiển thị form save
    if (isWindow) {
      const response = await chrome.runtime.sendMessage({ type: "GET_PENDING_REPO" });
      pendingRepo = response.repo;

      if (pendingRepo) {
        displayRepoInfo();
        showForm();
        return;
      }
      showNoPending();
      return;
    }

    // Nếu là extension popup (click icon), LUÔN hiển thị dashboard
    showDashboardView();
  } catch (error) {
    console.error("❌ Error loading:", error);
    if (isPopupWindow()) {
      showNoPending();
    } else {
      showDashboardView();
    }
  }
}

// Show dashboard view (for extension popup)
async function showDashboardView() {
  try {
    // Update header for dashboard view
    const headerTitle = document.getElementById("header-title");
    const headerSubtitle = document.getElementById("header-subtitle");
    if (headerTitle) headerTitle.textContent = "My Repos";
    if (headerSubtitle) headerSubtitle.textContent = "Quick access to saved repositories";

    const response = await chrome.runtime.sendMessage({ type: "GET_ALL_REPOS" });
    const repos = response.repos || [];

    // Hide save form, show dashboard
    document.getElementById("content").style.display = "none";
    document.getElementById("actions").style.display = "none";

    const dashboardView = document.getElementById("dashboard-view");
    if (dashboardView) {
      dashboardView.style.display = "block";
      renderDashboardView(repos);
    }
  } catch (error) {
    console.error("Error loading dashboard:", error);
    showNoPending();
  }
}

// Render dashboard view
function renderDashboardView(repos, licenseInfo = null) {
  const dashboardView = document.getElementById("dashboard-view");
  if (!dashboardView) return;

  // Simple info banner - no limits, just donate option
  const infoBanner = `
    <div class="info-banner" style="padding: 8px 12px; border-radius: 8px; margin-bottom: 12px; background: #1E293B; color: #94A3AF; font-size: 11px; text-align: center;">
      ${repos.length} repositories saved • <a href="#" id="donate-link-popup" style="color: #818CF8; font-weight: 600; text-decoration: none;">☕ Support this project</a>
    </div>
  `;

  dashboardView.innerHTML = `
    <div class="search-section">
      <input 
        type="text" 
        id="quick-search" 
        class="quick-search-input" 
        placeholder="Quick search..."
        autocomplete="off"
      />
    </div>
    
    ${infoBanner}
    
    <div class="dashboard-section">
      <div class="repos-count">Recent Repositories</div>
      <div class="recent-repos-list" id="repos-list">
        ${renderReposList(repos)}
      </div>
    </div>
  `;

  // Render fixed footer
  const fixedFooter = document.getElementById("dashboard-footer-fixed");
  const oldFooter = document.getElementById("footer-links");

  // Hide old footer to prevent duplication
  if (oldFooter) oldFooter.style.display = "none";

  if (fixedFooter) {
    fixedFooter.style.display = "flex";
    fixedFooter.innerHTML = `
      <!-- Rating Button (Highlighted Gold) -->
      <button class="rating-btn" id="rating-btn">
        <span class="rating-icon">⭐</span>
        <span class="dashboard-btn-text">Rate 5 Stars</span>
      </button>

      <!-- Dashboard Button (Clean Green) -->
      <button class="view-dashboard-btn" id="view-dashboard-btn">
        <span class="dashboard-btn-text">Dashboard</span>
      </button>
    `;
  }

  // Handle Donate Click (Only Header Icon)
  function openDonateModal() {
    const donateModal = document.getElementById("donate-modal");
    if (donateModal) {
      donateModal.classList.add("active");
    }
  }

  const headerDonateIcon = document.getElementById("header-donate-icon");
  const bannerDonateLink = document.getElementById("donate-link-popup");

  if (headerDonateIcon) headerDonateIcon.addEventListener("click", openDonateModal);
  if (bannerDonateLink) bannerDonateLink.addEventListener("click", (e) => {
    e.preventDefault();
    openDonateModal();
  });

  // Close Donate Modal
  const donateClose = document.getElementById("donate-close");
  const donateModal = document.getElementById("donate-modal");

  if (donateClose) {
    donateClose.addEventListener("click", () => {
      donateModal.classList.remove("active");
    });
  }

  if (donateModal) {
    donateModal.addEventListener("click", (e) => {
      if (e.target === donateModal) {
        donateModal.classList.remove("active");
      }
    });
  }

  // Get Chrome Web Store URL automatically
  function getWebStoreURL() {
    try {
      const extensionId = chrome.runtime.id;
      if (extensionId) {
        return `https://chrome.google.com/webstore/detail/${extensionId}/reviews`;
      }
    } catch (error) {
      console.error("Error getting extension ID:", error);
    }
    return "https://chrome.google.com/webstore";
  }

  // Rating button handler
  const ratingBtn = document.getElementById("rating-btn");
  if (ratingBtn) {
    ratingBtn.addEventListener("click", () => {
      const storeURL = getWebStoreURL();
      chrome.tabs.create({
        url: storeURL,
        active: true
      });
      window.close();
    });
  }

  // View Dashboard button handler
  const viewDashboardBtn = document.getElementById("view-dashboard-btn");
  if (viewDashboardBtn) {
    viewDashboardBtn.addEventListener("click", () => {
      chrome.runtime.sendMessage({ type: "OPEN_DASHBOARD" });
      window.close();
    });
  }

  // Quick search functionality
  const searchInput = document.getElementById("quick-search");
  const reposList = document.getElementById("repos-list");

  searchInput?.addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase().trim();
    const filtered = query
      ? repos.filter(r =>
        r.name.toLowerCase().includes(query) ||
        (r.description || "").toLowerCase().includes(query) ||
        (r.owner || "").toLowerCase().includes(query)
      )
      : repos;

    reposList.innerHTML = renderReposList(filtered.slice(0, 3));
    attachRepoClickHandlers();
  });

  attachRepoClickHandlers();
}

// Render repos list HTML
function renderReposList(repos) {
  const recent = repos.slice(0, 3); // Chỉ hiện 3 repos

  if (recent.length === 0) {
    return '<div class="empty-recent">No repositories found</div>';
  }

  return recent.map(repo => `
    <div class="recent-repo-item-simple" data-url="${escapeHTML(repo.url)}">
      <div class="repo-item-name">${escapeHTML(capitalizeFirstLetter(repo.customName || repo.name))}</div>
      <div class="repo-item-desc">
        ${escapeHTML(repo.description || "No description")}
      </div>
    </div>
  `).join("");
}

// Attach click handlers to repo items
function attachRepoClickHandlers() {
  document.querySelectorAll(".recent-repo-item-simple").forEach(item => {
    item.addEventListener("click", () => {
      const url = item.dataset.url;
      chrome.tabs.create({ url, active: true });
      window.close();
    });
  });
}

// Show notification (for dashboard view)
function showNotification(message, type = "success", duration = 3000) {
  const notification = document.createElement("div");
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: ${type === "error" ? "#F87171" : "#34D399"};
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    animation: slideDown 0.3s ease;
  `;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.opacity = "0";
    notification.style.transition = "opacity 0.3s";
    setTimeout(() => notification.remove(), 300);
  }, duration);
}

function getStatusLabel(status) {
  const labels = {
    chuaxem: "Unviewed",
    daxem: "Viewed",
    dathu: "Tried",
    dangdung: "In Use",
    bo: "Dropped"
  };
  return labels[status] || status;
}

function getRoleLabel(role) {
  const labels = {
    'ui-frontend': 'UI',
    'backend-api': 'Backend',
    'auth': 'Auth',
    'payments': 'Payments',
    'ai-ml': 'AI',
    'infra-tooling': 'Infra',
    'other': 'Other'
  };
  return labels[role] || role;
}

// Auto-suggest role based on repo content
function suggestRole(repo) {
  if (!repo) return null;

  const text = [
    repo.name || "",
    repo.description || "",
    (repo.topics || []).join(" "),
    repo.language || ""
  ].join(" ").toLowerCase();

  // Keywords mapping
  const roleKeywords = {
    "ui-frontend": ["ui", "frontend", "front-end", "react", "vue", "angular", "svelte", "component", "design", "css", "scss", "tailwind", "bootstrap", "ui/ux", "interface", "widget", "theme", "template"],
    "backend-api": ["backend", "back-end", "api", "rest", "graphql", "server", "express", "fastapi", "django", "flask", "spring", "node", "microservice", "endpoint"],
    "auth": ["auth", "authentication", "authorization", "oauth", "jwt", "session", "login", "signin", "password", "security", "identity", "sso", "oauth2"],
    "payments": ["payment", "pay", "stripe", "paypal", "checkout", "billing", "invoice", "subscription", "transaction", "money", "currency", "wallet"],
    "ai-ml": ["ai", "artificial intelligence", "machine learning", "ml", "neural", "deep learning", "tensorflow", "pytorch", "nlp", "computer vision", "gpt", "llm", "model", "training"],
    "infra-tooling": ["infrastructure", "devops", "docker", "kubernetes", "ci/cd", "terraform", "ansible", "deploy", "monitoring", "logging", "tool", "utility", "cli", "script"]
  };

  // Score each role
  const scores = {};
  for (const [role, keywords] of Object.entries(roleKeywords)) {
    scores[role] = keywords.reduce((score, keyword) => {
      return score + (text.includes(keyword) ? 1 : 0);
    }, 0);
  }

  // Find role with highest score
  const suggestedRole = Object.entries(scores)
    .filter(([_, score]) => score > 0)
    .sort(([_, a], [__, b]) => b - a)[0];

  return suggestedRole ? suggestedRole[0] : null;
}

// Display repo info
function displayRepoInfo() {
  const repoNameContainer = document.getElementById("repo-name-container");
  if (!repoNameContainer || !pendingRepo) return;

  repoNameContainer.textContent = capitalizeFirstLetter(pendingRepo.customName || pendingRepo.name || "");

  // Pre-fill description input with default description
  const descriptionInput = document.getElementById("description-input");
  if (descriptionInput && pendingRepo.description) {
    descriptionInput.value = pendingRepo.description;
  }

  // Auto-suggest role
  const suggestedRole = suggestRole(pendingRepo);
  if (suggestedRole) {
    setTimeout(() => {
      const suggestedOption = document.querySelector(`.role-option[data-role="${suggestedRole}"]`);
      if (suggestedOption) {
        suggestedOption.classList.add("suggested");
        // Auto-select if confidence is high (you can adjust this logic)
        // For now, just highlight it
      }
    }, 100);
  }
}

function showForm() {
  document.getElementById("no-pending").style.display = "none";
  document.getElementById("content").style.display = "flex";
  document.getElementById("actions").style.display = "flex";
  // Ensure dashboard view never occupies space in Save window
  const dashboardView = document.getElementById("dashboard-view");
  if (dashboardView) dashboardView.style.display = "none";

  // Hide dashboard footer when saving
  const fixedFooter = document.getElementById("dashboard-footer-fixed");
  if (fixedFooter) fixedFooter.style.display = "none";

  // Show View Dashboard link (only in popup window, not extension popup)
  const dashboardLink = document.getElementById("dashboard-link");
  if (dashboardLink && isPopupWindow()) {
    dashboardLink.style.display = "block";
  }

  // Show header donate icon (only in popup window, not extension popup)
  const headerDonateIcon = document.getElementById("header-donate-icon");
  if (headerDonateIcon && isPopupWindow()) {
    headerDonateIcon.style.display = "flex";
  } else if (headerDonateIcon) {
    headerDonateIcon.style.display = "none";
  }

  // Enable save button since role is now optional
  const saveBtn = document.getElementById("save-btn");
  if (saveBtn) saveBtn.disabled = false;

  // Auto-fit the standalone window to remove blank top/bottom areas
  resizeWindowToContent({ minHeight: 320, maxHeight: 580 });
}

// Show no pending
function showNoPending() {
  document.getElementById("no-pending").style.display = "flex";
  document.getElementById("content").style.display = "none";
  document.getElementById("actions").style.display = "none";
  document.getElementById("dashboard-view").style.display = "none";

  // Hide dashboard footer
  const fixedFooter = document.getElementById("dashboard-footer-fixed");
  if (fixedFooter) fixedFooter.style.display = "none";

  resizeWindowToContent({ minHeight: 260, maxHeight: 520 });
}

// Setup role selector
function setupRoleSelector() {
  const options = document.querySelectorAll(".role-option");
  options.forEach(option => {
    option.addEventListener("click", () => {
      options.forEach(opt => opt.classList.remove("selected"));
      option.classList.add("selected");
      const role = option.dataset.role;
      // Allow "skip" to set role to null
      selectedRole = role === "skip" ? null : role;

      // Enable save button (role is now optional)
      const saveBtn = document.getElementById("save-btn");
      if (saveBtn) saveBtn.disabled = false;
    });
  });

  // Enable save button by default since role is optional
  const saveBtn = document.getElementById("save-btn");
  if (saveBtn && pendingRepo) {
    saveBtn.disabled = false;
  }
}

// Save repo
async function saveRepo() {
  if (!pendingRepo) {
    showError("No repository to save");
    return;
  }

  // Role is now optional, but if user selected "skip", we use null
  // If no role selected at all, we can use null or auto-suggest
  let finalRole = selectedRole;
  if (!finalRole) {
    // Try auto-suggest if user didn't select anything
    finalRole = suggestRole(pendingRepo) || null;
  }

  const saveBtn = document.getElementById("save-btn");
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";
  }

  // Get custom description if provided
  const descriptionInput = document.getElementById("description-input");
  const customDescription = descriptionInput ? descriptionInput.value.trim() : "";

  // Use custom description if provided, otherwise use default from repo
  const finalDescription = customDescription || pendingRepo.description || "";

  try {
    const response = await chrome.runtime.sendMessage({
      type: "CONFIRM_SAVE_REPO",
      repo: {
        ...pendingRepo,
        description: finalDescription
      },
      role: finalRole,
      customTags: [],
      note: undefined
    });

    if (!response.success) {
      if (response.duplicate) {
        showError("This repo is already saved!");
      } else {
        showError(response.error || "Failed to save repo");
      }
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = "Save";
      }
      return;
    }

    await chrome.runtime.sendMessage({ type: "CLEAR_BADGE" });
    window.close();
  } catch (error) {
    console.error("Error saving repo:", error);
    showError("Failed to save repo. Please try again.");
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = "Save";
    }
  }
}

// Show error
function showError(message) {
  const errorEl = document.getElementById("error");
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.style.display = "block";
    setTimeout(() => {
      errorEl.style.display = "none";
    }, 5000);
  }
}

// Setup event listeners
function setupEventListeners() {
  const saveBtn = document.getElementById("save-btn");
  const cancelBtn = document.getElementById("cancel-btn");
  const dashboardLink = document.getElementById("dashboard-link");
  const donateLink = document.getElementById("donate-link");
  const headerDonateIcon = document.getElementById("header-donate-icon");
  const donateModal = document.getElementById("donate-modal");
  const donateClose = document.getElementById("donate-close");

  if (saveBtn) saveBtn.addEventListener("click", saveRepo);
  if (cancelBtn) cancelBtn.addEventListener("click", () => window.close());

  // Re-fit height when user types/resizes the description textarea (standalone window only)
  const desc = document.getElementById("description-input");
  if (desc) {
    const autosizeAndRefit = () => {
      try {
        // Auto-grow textarea up to a sensible max so it feels less cramped
        desc.style.height = "auto";
        const maxPx = 180;
        const next = Math.min(maxPx, desc.scrollHeight || 0);
        if (next > 0) desc.style.height = `${next}px`;
      } catch {
        // ignore
      }
      resizeWindowToContent({ minHeight: 320, maxHeight: 580 });
    };
    desc.addEventListener("input", autosizeAndRefit);
    // Handle manual resize drag end (best-effort)
    desc.addEventListener("mouseup", autosizeAndRefit);
    // Initial fit once content is shown
    setTimeout(autosizeAndRefit, 0);
  }

  if (dashboardLink) {
    // Set href directly
    const dashboardUrl = chrome.runtime.getURL("dashboard/dashboard.html");
    dashboardLink.href = dashboardUrl;

    dashboardLink.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();

      try {
        // Try using background script first
        await chrome.runtime.sendMessage({
          type: "OPEN_DASHBOARD"
        });
        // Close popup after opening dashboard
        window.close();
      } catch (error) {
        // Fallback: use window.open directly
        try {
          window.open(dashboardUrl, "_blank");
          window.close();
        } catch (err) {
          // Last resort: try chrome.tabs.create directly (if available)
          if (chrome.tabs && chrome.tabs.create) {
            try {
              chrome.tabs.create({ url: dashboardUrl, active: true });
              window.close();
            } catch (finalErr) {
              // Silent fail - user can manually open dashboard
            }
          }
        }
      }
    });
  }

  // Header Donate Icon (for both popup window and extension popup)
  if (headerDonateIcon) {
    headerDonateIcon.addEventListener("click", (e) => {
      e.preventDefault();
      if (donateModal) {
        donateModal.classList.add("active");
      }
    });
  }

  // Donate modal - Footer link (chỉ hiện trong popup window)
  if (donateLink) {
    donateLink.addEventListener("click", (e) => {
      e.preventDefault();
      if (donateModal) {
        donateModal.classList.add("active");
      }
    });
  }

  if (donateClose) {
    donateClose.addEventListener("click", () => {
      if (donateModal) {
        donateModal.classList.remove("active");
      }
    });
  }

  // Close modal when clicking outside
  if (donateModal) {
    donateModal.addEventListener("click", (e) => {
      if (e.target === donateModal) {
        donateModal.classList.remove("active");
      }
    });
  }
}



// Export repos to JSON
function exportRepos(repos) {
  try {
    const dataStr = JSON.stringify(repos, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `github-repos-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);

    showNotification(`✅ Exported ${repos.length} repositories!`, "success", 3000);
  } catch (err) {
    // Silent fail - show error toast instead
    showNotification("❌ Export failed", "error", 3000);
  }
}

// Import repos from JSON
function importRepos() {
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
        showNotification("ℹ️ No new repositories to import (all already exist)", "success", 3000);
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
          // Silent fail for individual repo - continue with others
        }
      }

      showNotification(`✅ Imported ${imported} new repositories!`, "success", 3000);

      // Reload dashboard view
      setTimeout(async () => {
        if (isPopupWindow()) {
          // If in popup window, just reload
          window.location.reload();
        } else {
          // If in extension popup, reload dashboard view
          await showDashboardView();
        }
      }, 1500);

    } catch (err) {
      // Show error toast instead of console
      showNotification(`❌ Import failed: ${err.message}`, "error", 5000);
    }
  };

  input.click();
}

// Initialize
async function init() {
  setupRoleSelector();
  setupEventListeners();
  await loadPendingRepo();
}

init();
