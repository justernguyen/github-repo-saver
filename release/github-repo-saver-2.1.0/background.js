// Storage key for Chrome storage (legacy support)
const STORAGE_KEY = "github-repo-saver-repos";
// Removed license system - now free with donate option

// IndexedDB setup
const DB_NAME = "github-repo-saver";
const DB_VERSION = 1;
const STORE_NAME = "repos";
let db = null;

// Basic payload validation to reduce abuse of runtime messages
function validateRepoPayload(repo) {
  if (!repo || typeof repo !== "object") return false;
  const strOk = (v, max = 5000) => typeof v === "string" && v.length <= max;
  const numOk = (v) => typeof v === "number" && Number.isFinite(v);
  if (!strOk(repo.id || "", 200)) return false;
  if (!strOk(repo.name || "", 200)) return false;
  if (!strOk(repo.owner || "", 200)) return false;
  if (repo.description && !strOk(repo.description, 5000)) return false;
  if (repo.url && !strOk(repo.url, 2000)) return false;
  if (repo.topics && !Array.isArray(repo.topics)) return false;
  if (repo.topics && repo.topics.some(t => !strOk(t, 200))) return false;
  if (repo.language && !strOk(repo.language, 100)) return false;
  if (repo.stars && !numOk(repo.stars)) return false;
  return true;
}

function validateMessage(message) {
  if (!message || typeof message !== "object") return false;
  const allowedTypes = new Set([
    "SAVE_REPO",
    "OPEN_POPUP",
    "OPEN_POPUP_WINDOW",
    "OPEN_DASHBOARD",
    "SHOW_BADGE",
    "CLEAR_BADGE",
    "CLEAR_PENDING_REPO",
    "GET_PENDING_REPO",
    "CONFIRM_SAVE_REPO",
    "GET_ALL_REPOS",
    "GET_LICENSE_INFO",
    "REMOVE_REPO",
    "UPDATE_REPO"
  ]);
  if (!allowedTypes.has(message.type)) return false;
  // Deep validation for repo payloads
  if (message.type === "SAVE_REPO" && !validateRepoPayload(message.repoData)) return false;
  if (message.type === "CONFIRM_SAVE_REPO" && !validateRepoPayload(message.repo)) return false;
  if (message.type === "UPDATE_REPO" && (typeof message.repoId !== "string" || typeof message.updates !== "object")) return false;
  if (message.type === "REMOVE_REPO" && typeof message.repoId !== "string") return false;
  return true;
}

// Initialize IndexedDB
async function initDB() {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("by-status", "status");
        store.createIndex("by-savedAt", "savedAt");
      }
    };
  });
}

// Read from IndexedDB
async function readFromIndexedDB() {
  try {
    const database = await initDB();
    const transaction = database.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Error reading from IndexedDB:", error);
    return [];
  }
}

// Write to IndexedDB
async function writeToIndexedDB(repos) {
  try {
    if (repos.length > 200) return false;

    const database = await initDB();
    const transaction = database.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => reject(transaction.error);

      // Clear existing data
      const clearRequest = store.clear();
      clearRequest.onsuccess = () => {
        // Add all repos
        let completed = 0;
        if (repos.length === 0) {
          resolve(true);
          return;
        }
        repos.forEach(repo => {
          const putRequest = store.put(repo);
          putRequest.onsuccess = () => {
            completed++;
            if (completed === repos.length) {
              // All puts completed, transaction will complete
            }
          };
          putRequest.onerror = () => reject(putRequest.error);
        });
      };
      clearRequest.onerror = () => reject(clearRequest.error);
    });
  } catch (error) {
    console.error("Error writing to IndexedDB:", error);
    return false;
  }
}

// Add repo to IndexedDB
async function addToIndexedDB(repo) {
  try {
    const database = await initDB();
    const transaction = database.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => reject(transaction.error);

      const request = store.put(repo);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Error adding repo to IndexedDB:", error);
    return false;
  }
}

// Remove repo from IndexedDB
async function removeFromIndexedDB(repoId) {
  try {
    const database = await initDB();
    const transaction = database.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => reject(transaction.error);

      const request = store.delete(repoId);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Error removing repo from IndexedDB:", error);
    return false;
  }
}

// Update repo in IndexedDB
async function updateInIndexedDB(repoId, updates) {
  try {
    const database = await initDB();
    const transaction = database.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const getRequest = store.get(repoId);

    return new Promise((resolve, reject) => {
      getRequest.onsuccess = () => {
        const repo = getRequest.result;
        if (!repo) {
          reject(new Error("Repo not found"));
          return;
        }

        const updated = { ...repo, ...updates };
        const putRequest = store.put(updated);

        transaction.oncomplete = () => resolve(true);
        transaction.onerror = () => reject(transaction.error);
        putRequest.onerror = () => reject(putRequest.error);
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  } catch (error) {
    console.error("Error updating repo in IndexedDB:", error);
    return false;
  }
}

// Legacy Chrome storage functions (for migration)
async function readFromChromeStorage() {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    const data = result[STORAGE_KEY];
    if (!data || typeof data !== "string") return [];
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading from chrome.storage:", error);
    return [];
  }
}

async function writeToChromeStorage(repos) {
  try {
    if (repos.length > 200) return false;
    await chrome.storage.local.set({ [STORAGE_KEY]: JSON.stringify(repos) });
    return true;
  } catch (error) {
    console.error("Error saving to chrome.storage:", error);
    return false;
  }
}

// Check if should use IndexedDB
async function shouldUseIndexedDB() {
  try {
    const repos = await readFromChromeStorage();
    return repos.length >= 200 || repos.length === 0;
  } catch {
    return true;
  }
}

// Migrate from Chrome storage to IndexedDB
async function migrateToIndexedDB() {
  try {
    const repos = await readFromChromeStorage();
    if (repos.length > 0) {
      await writeToIndexedDB(repos);
      await chrome.storage.local.remove(STORAGE_KEY);
    }
  } catch (error) {
    console.error("Error migrating to IndexedDB:", error);
  }
}

// Get all repos (from IndexedDB or Chrome storage)
async function getAllRepos() {
  const useIndexedDB = await shouldUseIndexedDB();
  if (useIndexedDB) {
    await migrateToIndexedDB();
    return await readFromIndexedDB();
  }
  return await readFromChromeStorage();
}

// Save repo
async function saveRepo(repo, role = null, customTags = [], note = undefined) {
  const repoData = {
    ...repo,
    id: repo.id || `${repo.owner}/${repo.name}`.toLowerCase(),
    role: role || null, // Allow null role (uncategorized)
    customTags: customTags || [],
    technicalTags: repo.topics || [],
    note: note || undefined,
    status: "chuaxem",
    savedAt: Date.now(),
    updatedAt: repo.updatedAt || Date.now(),
    stars: repo.stars || 0
  };

  const useIndexedDB = await shouldUseIndexedDB();
  if (useIndexedDB) {
    await migrateToIndexedDB();
    return await addToIndexedDB(repoData);
  } else {
    const repos = await readFromChromeStorage();
    if (repos.some(r => r.id === repoData.id)) {
      return false; // Duplicate
    }
    repos.push(repoData);
    const saved = await writeToChromeStorage(repos);
    if (repos.length >= 200) {
      await migrateToIndexedDB();
    }
    return saved;
  }
}

// Remove repo
async function removeRepo(repoId) {
  const useIndexedDB = await shouldUseIndexedDB();
  if (useIndexedDB) {
    await migrateToIndexedDB();
    return await removeFromIndexedDB(repoId);
  } else {
    const repos = await readFromChromeStorage();
    const filtered = repos.filter(r => r.id !== repoId);
    return await writeToChromeStorage(filtered);
  }
}

// Update repo
async function updateRepo(repoId, updates) {
  const useIndexedDB = await shouldUseIndexedDB();
  if (useIndexedDB) {
    await migrateToIndexedDB();
    return await updateInIndexedDB(repoId, updates);
  } else {
    const repos = await readFromChromeStorage();
    const index = repos.findIndex(r => r.id === repoId);
    if (index === -1) return false;
    repos[index] = { ...repos[index], ...updates };
    return await writeToChromeStorage(repos);
  }
}

// Message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sendResponse);
  return true; // Keep channel open for async response
});

async function handleMessage(message, sendResponse) {
  if (!validateMessage(message)) {
    sendResponse({ error: "Invalid message payload" });
    return;
  }
  try {
    switch (message.type) {
      case "SAVE_REPO":
        await chrome.storage.local.set({ pendingRepo: message.repoData });
        sendResponse({ success: true });
        break;

      case "OPEN_POPUP":
        // Không mở cửa sổ nữa, chỉ trả về thành công để content script biết
        sendResponse({ success: true });
        break;

      case "OPEN_POPUP_WINDOW":
        // Kích thước đồng bộ với popup extension: width 380px
        // Đặt popup ở góc phải, cạnh nút Save Github
        const popupUrl = chrome.runtime.getURL("popup/popup.html?popup=window");

        chrome.windows.getCurrent((currentWindow) => {
          if (chrome.runtime.lastError) {
            // Fallback nếu không lấy được window hiện tại
            chrome.windows.create({
              url: popupUrl,
              type: "popup",
              width: 400,
              height: 480, // Smaller default; popup auto-fits via window.resizeTo in popup.js
              focused: true
            }, (window) => {
              if (chrome.runtime.lastError) {
                // Silent fail - user can manually open popup
              }
            });
            return;
          }

          // Tính toán vị trí: góc phải, cách top một chút
          const popupWidth = 400;
          const popupHeight = 480; // Smaller default; popup auto-fits via window.resizeTo in popup.js
          const left = (currentWindow.left || 0) + (currentWindow.width || 1920) - popupWidth - 20;
          const top = (currentWindow.top || 0) + 60; // Dịch lên trên một chút

          chrome.windows.create({
            url: popupUrl,
            type: "popup",
            width: popupWidth,
            height: popupHeight,
            left: left,
            top: top,
            focused: true
          }, (window) => {
            if (chrome.runtime.lastError) {
              // Silent fail - user can manually open popup
            }
          });
        });
        sendResponse({ success: true });
        break;

      case "OPEN_DASHBOARD":
        chrome.tabs.create({
          url: chrome.runtime.getURL("dashboard/dashboard.html"),
          active: true
        });
        sendResponse({ success: true });
        break;

      case "SHOW_BADGE":
        chrome.action.setBadgeText({ text: "1" });
        chrome.action.setBadgeBackgroundColor({ color: "#238636" });
        sendResponse({ success: true });
        break;

      case "CLEAR_BADGE":
        chrome.action.setBadgeText({ text: "" });
        sendResponse({ success: true });
        break;

      case "CLEAR_PENDING_REPO":
        await chrome.storage.local.remove("pendingRepo");
        chrome.action.setBadgeText({ text: "" });
        sendResponse({ success: true });
        break;

      case "GET_PENDING_REPO":
        const { pendingRepo } = await chrome.storage.local.get("pendingRepo");
        sendResponse({ repo: pendingRepo || null });
        break;

      case "CONFIRM_SAVE_REPO":
        const allRepos = await getAllRepos();
        const repoId = message.repo.id || `${message.repo.owner}/${message.repo.name}`.toLowerCase();

        if (allRepos.some(r => r.id === repoId)) {
          sendResponse({
            success: false,
            error: "This repository has already been saved!",
            duplicate: true
          });
          break;
        }

        // No limit - free for everyone with donate option
        await saveRepo(
          message.repo,
          message.role || null,
          message.customTags || [],
          message.note
        );

        await chrome.storage.local.remove("pendingRepo");
        sendResponse({ success: true });
        break;

      case "GET_ALL_REPOS":
        try {
          const repos = await getAllRepos();
          sendResponse({
            repos: repos || [],
            repoCount: repos.length
          });
        } catch (error) {
          console.error("Error in GET_ALL_REPOS:", error);
          sendResponse({ error: error.message || "Failed to load repositories", repos: [] });
        }
        break;

      case "GET_LICENSE_INFO":
        // No license system - always free
        const repos = await getAllRepos();
        sendResponse({
          license: "free",
          isPro: false,
          repoCount: repos.length,
          limit: null,
          remaining: null
        });
        break;

      case "REMOVE_REPO":
        await removeRepo(message.repoId);
        sendResponse({ success: true });
        break;

      case "UPDATE_REPO":
        await updateRepo(message.repoId, message.updates);
        sendResponse({ success: true });
        break;

      default:
        sendResponse({ error: "Unknown message type" });
    }
  } catch (error) {
    console.error("Error handling message:", error);
    sendResponse({ error: String(error) });
  }
}

// Initialize on install
chrome.runtime.onInstalled.addListener(async () => {
  await migrateToIndexedDB();
});
