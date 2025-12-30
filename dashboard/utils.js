// Shared utilities for GitHub Repo Saver

// Escape HTML to prevent XSS
function escapeHTML(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Capitalize the first letter for nicer display
function capitalizeFirstLetter(value) {
  const s = String(value ?? "").trim();
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Escape regex special characters
function escapeRegExp(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Highlight search query in text (with XSS protection)
function highlightText(value, query) {
  const raw = String(value ?? "");
  const safe = escapeHTML(raw);
  // Sanitize query to prevent XSS
  const q = escapeHTML(String(query ?? "").trim());
  if (!q) return safe;
  // Escape regex special chars in sanitized query
  const escapedQuery = escapeRegExp(q);
  const re = new RegExp(escapedQuery, "ig");
  return safe.replace(re, (m) => `<mark class="hl">${m}</mark>`);
}

// Format star/fork count (1k, 1.5k, 1m, etc.)
function formatStars(count) {
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1).replace(/\.0$/, '') + 'm';
  }
  if (count >= 1000) {
    return (count / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  }
  return count;
}

// Normalize collection name
function normalizeCollection(value) {
  const s = String(value ?? "").trim();
  return s || "";
}

// Detect OS for clone command instructions
function detectOS() {
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;
  if (/Mac|iPhone|iPad|iPod/.test(userAgent) && !window.MSStream) {
    return 'macOS';
  }
  if (/Win/.test(userAgent)) {
    return 'Windows';
  }
  if (/Linux/.test(userAgent)) {
    return 'Linux';
  }
  return 'Unknown';
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

