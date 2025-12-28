// Parse GitHub URL to get owner and repo name
function parseGitHubUrl(url) {
  try {
    const urlObj = new URL(url);
    if (!urlObj.hostname.includes("github.com")) return null;

    const parts = urlObj.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;

    return {
      owner: parts[0],
      name: parts[1].replace(/\.git$/, "")
    };
  } catch {
    return null;
  }
}

// Generate repo ID
function generateRepoId(owner, name) {
  return `${owner}/${name}`.toLowerCase();
}

// Extract repo information from GitHub page
function extractRepoInfo() {
  try {
    const url = window.location.href;
    const repoInfo = parseGitHubUrl(url);
    if (!repoInfo) return null;

    // Get description
    const descMeta = document.querySelector('meta[name="description"]');
    const description = descMeta?.getAttribute("content") || "";
    const cleanDescription = description.replace(/^[^·]*·\s*/, "");

    // Get language
    const languageEl = document.querySelector('h2[class*="language-color"], span[itemprop="programmingLanguage"]');
    const language = languageEl?.textContent?.trim() || null;

    // Helper to parse GitHub numbers (handles 'k' and 'm' suffixes)
    function parseGitHubNumber(text) {
      if (!text) return 0;
      const cleanText = text.replace(/,/g, "").trim().toLowerCase();
      if (cleanText.endsWith('k')) {
        return Math.round(parseFloat(cleanText.slice(0, -1)) * 1000);
      }
      if (cleanText.endsWith('m')) {
        return Math.round(parseFloat(cleanText.slice(0, -1)) * 1000000);
      }
      return parseInt(cleanText) || 0;
    }

    // Get stars count - improved selectors
    let stars = 0;
    // Try ID selector first (most reliable)
    let starElement = document.querySelector('#repo-stars-counter-star');
    if (starElement) {
      stars = parseGitHubNumber(starElement.textContent);
    }
    // Try social count
    if (stars === 0) {
      starElement = document.querySelector('a[href$="/stargazers"] #repo-stars-counter-star');
      if (starElement) {
        stars = parseGitHubNumber(starElement.textContent);
      }
    }
    // Try aria-label as fallback
    if (stars === 0) {
      const starButton = document.querySelector('a[href$="/stargazers"]');
      if (starButton) {
        const ariaLabel = starButton.getAttribute("aria-label") || "";
        const match = ariaLabel.match(/([\d\.,]+[km]?)\s+star/i);
        if (match) {
          stars = parseGitHubNumber(match[1]);
        }
      }
    }

    // Get forks count - improved selectors
    let forks = 0;
    // Try ID selector first (most reliable)
    let forkElement = document.querySelector('#repo-network-counter');
    if (forkElement) {
      forks = parseGitHubNumber(forkElement.textContent);
    }
    // Try href-based selector
    if (forks === 0) {
      forkElement = document.querySelector('a[href$="/forks"] #repo-network-counter, a[href*="/network/members"] #repo-network-counter');
      if (forkElement) {
        forks = parseGitHubNumber(forkElement.textContent);
      }
    }
    // Try aria-label as fallback
    if (forks === 0) {
      const forkButton = document.querySelector('a[href$="/forks"], a[href*="/network/members"]');
      if (forkButton) {
        const ariaLabel = forkButton.getAttribute("aria-label") || "";
        const match = ariaLabel.match(/([\d\.,]+[km]?)\s+fork/i);
        if (match) {
          forks = parseGitHubNumber(match[1]);
        }
      }
    }

    // Get topics/tags
    const topicLinks = document.querySelectorAll('a[href^="/topics/"]');
    const topics = Array.from(topicLinks)
      .map(link => link.textContent?.trim())
      .filter(Boolean)
      .slice(0, 10);

    // Get updated date - try multiple selectors
    let updatedAt = null;
    const relativeTimeEl = document.querySelector('relative-time[datetime]');
    if (relativeTimeEl) {
      const datetime = relativeTimeEl.getAttribute("datetime");
      if (datetime) {
        updatedAt = new Date(datetime).getTime();
      }
    }

    // Fallback: try to find "Updated" text
    if (!updatedAt) {
      const allText = document.body.textContent || "";
      const updatedMatch = allText.match(/Updated\s+(\w+\s+\d+,\s+\d{4})/i);
      if (updatedMatch) {
        const dateStr = updatedMatch[1];
        const parsed = new Date(dateStr);
        if (!isNaN(parsed.getTime())) {
          updatedAt = parsed.getTime();
        }
      }
    }

    // If still no date, use current time as fallback
    if (!updatedAt) {
      updatedAt = Date.now();
    }

    return {
      id: generateRepoId(repoInfo.owner, repoInfo.name),
      name: repoInfo.name,
      owner: repoInfo.owner,
      description: cleanDescription,
      language: language,
      topics: topics,
      stars: stars,
      forks: forks,
      updatedAt: updatedAt,
      url: url
    };
  } catch (error) {
    console.error("Error extracting repo from DOM:", error);
    return null;
  }
}

// Detect donation links
function detectDonationLinks() {
  const links = {};
  try {
    const sponsorsLinks = Array.from(document.querySelectorAll('a[href*="github.com/sponsors"]'));
    if (sponsorsLinks.length > 0) {
      links.githubSponsors = sponsorsLinks[0].href;
    }

    const buyMeACoffeeLinks = Array.from(document.querySelectorAll('a[href*="buymeacoffee.com"]'));
    if (buyMeACoffeeLinks.length > 0) {
      links.buyMeACoffee = buyMeACoffeeLinks[0].href;
    }

    const openCollectiveLinks = Array.from(document.querySelectorAll('a[href*="opencollective.com"]'));
    if (openCollectiveLinks.length > 0) {
      links.openCollective = openCollectiveLinks[0].href;
    }
  } catch (error) {
    console.error("Error detecting donation links:", error);
  }
  return links;
}

// Create save button - Modern floating style
function createSaveButton() {
  const button = document.createElement("button");
  button.textContent = "📌 Save Github";
  button.className = "github-repo-saver-btn";
  button.style.cssText = `
    margin-left: 8px;
    background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
    color: white;
    border: none;
    border-radius: 6px;
    padding: 6px 14px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
    box-shadow: 0 2px 8px rgba(79, 70, 229, 0.3);
  `;

  button.addEventListener("mouseenter", () => {
    button.style.transform = "translateY(-1px)";
    button.style.boxShadow = "0 4px 12px rgba(79, 70, 229, 0.4)";
  });

  button.addEventListener("mouseleave", () => {
    button.style.transform = "translateY(0)";
    button.style.boxShadow = "0 2px 8px rgba(79, 70, 229, 0.3)";
  });

  return button;
}

// Find where to insert the button
function findButtonContainer() {
  const starButton = document.querySelector('div[class*="unstarred"], button[data-hydro-click*="star"]');
  if (starButton?.parentElement) {
    return starButton.parentElement;
  }

  return document.querySelector('div[class*="pagehead-actions"], div[class*="HeaderActions"]');
}


// Insert save button with throttle and max retries
let insertRetryCount = 0;
const MAX_RETRIES = 10;
const RETRY_DELAY = 500;
let insertTimeout = null;

function insertSaveButton() {
  // Don't insert if button already exists
  if (document.querySelector(".github-repo-saver-btn")) {
    insertRetryCount = 0; // Reset on success
    return;
  }

  const container = findButtonContainer();
  if (!container) {
    // Throttle retries with max limit
    if (insertRetryCount < MAX_RETRIES) {
      insertRetryCount++;
      if (insertTimeout) clearTimeout(insertTimeout);
      insertTimeout = setTimeout(insertSaveButton, RETRY_DELAY);
    } else {
      // Max retries reached, stop trying
      insertRetryCount = 0;
    }
    return;
  }

  // Success - reset counter
  insertRetryCount = 0;
  if (insertTimeout) clearTimeout(insertTimeout);

  const button = createSaveButton();

  // Add multiple event listeners to ensure it works
  button.addEventListener("click", handleSaveClick, true); // Capture phase
  button.addEventListener("click", handleSaveClick, false); // Bubble phase
  button.onclick = handleSaveClick; // Fallback

  container.appendChild(button);
}

// Handle save button click
async function handleSaveClick(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  }

  try {
    // Check if chrome.runtime exists and is valid
    if (typeof chrome === "undefined" || !chrome.runtime) {
      showNotification("Extension is not available. Please reload the extension.", "error", 5000);
      return;
    }

    // Try to access runtime.id to check if context is valid
    try {
      const runtimeId = chrome.runtime.id;
      if (!runtimeId) {
        throw new Error("No runtime ID");
      }
    } catch (err) {
      console.error("Extension context invalidated:", err);
      showNotification("Extension has been updated. Please refresh (F5) this page to continue.", "error", 5000);
      return;
    }

    const repoData = extractRepoInfo();

    if (!repoData || !repoData.id) {
      showNotification("Unable to retrieve repository information", "error");
      return;
    }

    const donationLinks = detectDonationLinks();

    try {
      await chrome.runtime.sendMessage({
        type: "SAVE_REPO",
        repoData: {
          ...repoData,
          donationLinks: donationLinks
        }
      });

      // Badge disabled - không hiện số thông báo trên icon
      // try {
      //   await chrome.runtime.sendMessage({ type: "SHOW_BADGE" });
      // } catch (badgeError) {
      //   console.log("Badge update failed (non-critical):", badgeError);
      // }


      // Open popup window automatically
      try {
        await chrome.runtime.sendMessage({ type: "OPEN_POPUP_WINDOW" });
      } catch (popupError) {
        // Fallback: show notification
        showNotification("✨ Repo pre-saved! Click the extension icon to finish saving.", "success", 6000);
      }
    } catch (error) {
      // Log only critical errors for production debugging

      // Check if it's a context invalidated error (various formats)
      const errorStr = String(error).toLowerCase();
      const errorMsg = (error?.message || "").toLowerCase();

      if (errorStr.includes("context invalidated") ||
        errorMsg.includes("context invalidated") ||
        errorStr.includes("extension context") ||
        errorMsg.includes("extension context") ||
        errorStr.includes("could not establish connection") ||
        errorMsg.includes("could not establish connection")) {
        showNotification("Extension has been updated. Please refresh (F5) this page to continue.", "error", 5000);
      } else {
        showNotification("Unable to connect to extension. Please refresh the page.", "error", 5000);
      }
      return;
    }
  } catch (error) {
    // Log only critical errors for production debugging

    // Check if it's a context invalidated error
    const errorStr = String(error).toLowerCase();
    const errorMsg = (error?.message || "").toLowerCase();

    if (errorStr.includes("context invalidated") ||
      errorMsg.includes("context invalidated") ||
      errorStr.includes("extension context") ||
      errorMsg.includes("extension context")) {
      showNotification("Extension has been updated. Please refresh (F5) this page to continue.", "error", 5000);
    } else {
      showNotification(
        "Có lỗi xảy ra: " + (error instanceof Error ? error.message : String(error)),
        "error",
        5000
      );
    }
  }
}

// Show notification
function showNotification(message, type = "success", duration = 3000) {
  const notification = document.createElement("div");
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === "success" ? "#238636" : "#da3633"};
    color: white;
    padding: 12px 20px;
    border-radius: 6px;
    z-index: 10000;
    font-size: 14px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    max-width: 400px;
    line-height: 1.5;
  `;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.opacity = "0";
    notification.style.transition = "opacity 0.3s";
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, duration);
}

// Handle QUICK_SAVE message from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "QUICK_SAVE") {
    handleSaveClick();
    sendResponse({ success: true });
  }
  return true;
});

// Initialize
function init() {
  const pathParts = window.location.pathname.split("/").filter(Boolean);
  if (pathParts.length < 2) return;

  // Only show button on main repo page, not on sub-pages
  const subPages = ["tree", "blob", "commits", "branches", "tags", "releases"];
  if (pathParts.length > 2 && !subPages.includes(pathParts[2])) return;

  // Insert button when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", insertSaveButton);
  } else {
    insertSaveButton();
  }

  // Watch for URL changes (SPA navigation) with throttle
  let currentUrl = location.href;
  let urlChangeTimeout = null;
  new MutationObserver(() => {
    const newUrl = location.href;
    if (newUrl !== currentUrl) {
      currentUrl = newUrl;
      insertRetryCount = 0; // Reset retry count on URL change
      if (urlChangeTimeout) clearTimeout(urlChangeTimeout);
      urlChangeTimeout = setTimeout(insertSaveButton, 500);
    }
  }).observe(document.body, {
    subtree: true,
    childList: true
  });
}

init();
