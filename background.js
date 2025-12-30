// Storage key for Chrome storage (legacy support)
const STORAGE_KEY = "github-repo-saver-repos";
// Removed license system - now free with donate option

// -----------------------------
// Chrome Sync (cross-device) support
// -----------------------------
// Note: chrome.storage.sync has strict quotas. We store repos in chunked JSON.
const SYNC_ENABLED_KEY = "github-repo-saver-sync-enabled";
const SYNC_META_KEY = "github-repo-saver-sync-meta";
const SYNC_CHUNK_PREFIX = "github-repo-saver-sync-chunk-";

const encoder = typeof TextEncoder !== "undefined" ? new TextEncoder() : null;
function byteLength(str) {
  if (!str) return 0;
  try {
    if (encoder) return encoder.encode(str).length;
  } catch {
    // ignore
  }
  // Fallback (approx, UTF-16)
  return str.length * 2;
}

function getSyncQuotas() {
  const s = chrome?.storage?.sync;
  return {
    QUOTA_BYTES: s?.QUOTA_BYTES ?? 102400,
    QUOTA_BYTES_PER_ITEM: s?.QUOTA_BYTES_PER_ITEM ?? 8192,
    MAX_ITEMS: s?.MAX_ITEMS ?? 512
  };
}

async function getSyncEnabled() {
  try {
    const res = await chrome.storage.sync.get(SYNC_ENABLED_KEY);
    return !!res[SYNC_ENABLED_KEY];
  } catch {
    return false;
  }
}

async function setSyncEnabled(enabled) {
  await chrome.storage.sync.set({ [SYNC_ENABLED_KEY]: !!enabled });
}

function chunkString(str, chunkSize) {
  const chunks = [];
  for (let i = 0; i < str.length; i += chunkSize) {
    chunks.push(str.slice(i, i + chunkSize));
  }
  return chunks;
}

async function readReposFromSync() {
  try {
    const metaRes = await chrome.storage.sync.get(SYNC_META_KEY);
    const meta = metaRes[SYNC_META_KEY];
    if (!meta || typeof meta !== "object" || !Number.isFinite(meta.chunkCount)) {
      return { repos: null, meta: null };
    }
    const chunkKeys = Array.from({ length: meta.chunkCount }, (_, i) => `${SYNC_CHUNK_PREFIX}${i}`);
    const chunkRes = await chrome.storage.sync.get(chunkKeys);
    const json = chunkKeys.map(k => chunkRes[k] || "").join("");
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return { repos: null, meta: null };
    return { repos: parsed, meta };
  } catch (e) {
    return { repos: null, meta: { error: String(e) } };
  }
}

async function writeReposToSync(repos, { allowPartial = true } = {}) {
  const quotas = getSyncQuotas();
  const chunkSize = Math.min(7800, Math.max(1000, quotas.QUOTA_BYTES_PER_ITEM - 300));

  // Try full first
  let toSync = Array.isArray(repos) ? repos : [];
  let json = JSON.stringify(toSync);
  let jsonBytes = byteLength(json);

  // If too big, optionally sync only most recent subset
  let partial = false;
  if (jsonBytes > quotas.QUOTA_BYTES && allowPartial) {
    const sorted = [...toSync].sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
    const subset = [];
    for (const r of sorted) {
      subset.push(r);
      const testJson = JSON.stringify(subset);
      if (byteLength(testJson) > quotas.QUOTA_BYTES) {
        subset.pop();
        break;
      }
    }
    toSync = subset;
    json = JSON.stringify(toSync);
    jsonBytes = byteLength(json);
    partial = toSync.length !== repos.length;
  }

  // Still too big: hard fail (keep previous sync state)
  if (jsonBytes > quotas.QUOTA_BYTES) {
    throw new Error("Chrome Sync storage quota exceeded");
  }

  const chunks = chunkString(json, chunkSize);
  if (chunks.length > quotas.MAX_ITEMS - 5) {
    throw new Error("Chrome Sync item limit exceeded");
  }

  // Remove old chunks beyond new length
  const prevMetaRes = await chrome.storage.sync.get(SYNC_META_KEY);
  const prevMeta = prevMetaRes[SYNC_META_KEY];
  if (prevMeta && Number.isFinite(prevMeta.chunkCount) && prevMeta.chunkCount > chunks.length) {
    const oldKeys = Array.from(
      { length: prevMeta.chunkCount - chunks.length },
      (_, i) => `${SYNC_CHUNK_PREFIX}${i + chunks.length}`
    );
    await chrome.storage.sync.remove(oldKeys);
  }

  const payload = {};
  chunks.forEach((c, i) => {
    payload[`${SYNC_CHUNK_PREFIX}${i}`] = c;
  });
  payload[SYNC_META_KEY] = {
    v: 1,
    chunkCount: chunks.length,
    updatedAt: Date.now(),
    bytes: jsonBytes,
    partial,
    syncedCount: toSync.length,
    localCount: Array.isArray(repos) ? repos.length : 0
  };

  await chrome.storage.sync.set(payload);
  return payload[SYNC_META_KEY];
}

let syncApplyTimer = null;
async function applySyncToLocalIfEnabled() {
  const enabled = await getSyncEnabled();
  if (!enabled) return;

  const { repos } = await readReposFromSync();
  if (!repos) return;

  // Write to local storage layer (reuse existing migration logic)
  // If repos is large, IndexedDB is preferred; otherwise chrome.storage.local.
  if (repos.length >= 200) {
    await writeToIndexedDB(repos);
    await chrome.storage.local.remove(STORAGE_KEY);
  } else {
    await writeToChromeStorage(repos);
  }
}

async function pushLocalToSync() {
  const enabled = await getSyncEnabled();
  if (!enabled) return { enabled: false };
  const repos = await getAllReposLocalOnly();
  const meta = await writeReposToSync(repos, { allowPartial: true });
  return { enabled: true, meta };
}

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
    "RESTORE_REPO",
    "CONFIRM_SAVE_REPO",
    "GET_ALL_REPOS",
    "GET_LICENSE_INFO",
    "GET_SYNC_STATUS",
    "SET_SYNC_ENABLED",
    "SYNC_NOW",
    "REMOVE_REPO",
    "UPDATE_REPO"
  ]);
  if (!allowedTypes.has(message.type)) return false;
  // Deep validation for repo payloads
  if (message.type === "SAVE_REPO" && !validateRepoPayload(message.repoData)) return false;
  if (message.type === "CONFIRM_SAVE_REPO" && !validateRepoPayload(message.repo)) return false;
  if (message.type === "UPDATE_REPO") {
    if (typeof message.repoId !== "string" || message.repoId.length === 0) return false;
    if (!message.updates || typeof message.updates !== "object" || Array.isArray(message.updates)) return false;
  }
  if (message.type === "REMOVE_REPO" && (typeof message.repoId !== "string" || message.repoId.length === 0)) return false;
  if (message.type === "SET_SYNC_ENABLED" && typeof message.enabled !== "boolean") return false;
  if (message.type === "RESTORE_REPO") {
    if (!message.repo || typeof message.repo !== "object" || !message.repo.id) return false;
  }
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
async function getAllReposLocalOnly() {
  const useIndexedDB = await shouldUseIndexedDB();
  if (useIndexedDB) {
    await migrateToIndexedDB();
    return await readFromIndexedDB();
  }
  return await readFromChromeStorage();
}

// Get all repos (sync-first if enabled; falls back to local)
async function getAllRepos() {
  const enabled = await getSyncEnabled();
  if (enabled) {
    const { repos } = await readReposFromSync();
    if (repos) {
      // Keep local in sync for fast UI reads
      try {
        if (repos.length >= 200) {
          await writeToIndexedDB(repos);
          await chrome.storage.local.remove(STORAGE_KEY);
        } else {
          await writeToChromeStorage(repos);
        }
      } catch {
        // ignore local mirror failures
      }
      return repos;
    }
  }
  return await getAllReposLocalOnly();
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
    const ok = await addToIndexedDB(repoData);
    if (ok) {
      // Best-effort sync push
      try { await pushLocalToSync(); } catch { /* ignore */ }
    }
    return ok;
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
    if (saved) {
      try { await pushLocalToSync(); } catch { /* ignore */ }
    }
    return saved;
  }
}

// Remove repo
async function removeRepo(repoId) {
  const useIndexedDB = await shouldUseIndexedDB();
  if (useIndexedDB) {
    await migrateToIndexedDB();
    const ok = await removeFromIndexedDB(repoId);
    if (ok) {
      try { await pushLocalToSync(); } catch { /* ignore */ }
    }
    return ok;
  } else {
    const repos = await readFromChromeStorage();
    const filtered = repos.filter(r => r.id !== repoId);
    const ok = await writeToChromeStorage(filtered);
    if (ok) {
      try { await pushLocalToSync(); } catch { /* ignore */ }
    }
    return ok;
  }
}

// Update repo
async function updateRepo(repoId, updates) {
  // Always bump updatedAt for "recent activity" features (dashboard sorting, etc.)
  const updatesWithTimestamp =
    updates && typeof updates === "object"
      ? { ...updates, updatedAt: Date.now() }
      : { updatedAt: Date.now() };

  const useIndexedDB = await shouldUseIndexedDB();
  if (useIndexedDB) {
    await migrateToIndexedDB();
    const ok = await updateInIndexedDB(repoId, updatesWithTimestamp);
    if (ok) {
      try { await pushLocalToSync(); } catch { /* ignore */ }
    }
    return ok;
  } else {
    const repos = await readFromChromeStorage();
    const index = repos.findIndex(r => r.id === repoId);
    if (index === -1) return false;
    repos[index] = { ...repos[index], ...updatesWithTimestamp };
    const ok = await writeToChromeStorage(repos);
    if (ok) {
      try { await pushLocalToSync(); } catch { /* ignore */ }
    }
    return ok;
  }
}

// Message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sendResponse);
  return true; // Keep channel open for async response
});

async function handleMessage(message, sendResponse) {
  if (!validateMessage(message)) {
    const t = message && typeof message === "object" ? message.type : null;
    sendResponse({ error: `Invalid message payload${t ? `: ${t}` : ""}` });
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
              width: 470,
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
          const popupWidth = 470;
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

      case "RESTORE_REPO":
        const repoToRestore = message.repo;
        if (!repoToRestore || !repoToRestore.id) {
          sendResponse({ error: "Invalid repo data" });
          break;
        }

        const useIDB = await shouldUseIndexedDB();
        if (useIDB) {
          await migrateToIndexedDB();
          await addToIndexedDB(repoToRestore);
          try { await pushLocalToSync(); } catch { }
        } else {
          const repos = await readFromChromeStorage();
          const idx = repos.findIndex(r => r.id === repoToRestore.id);
          if (idx !== -1) repos[idx] = repoToRestore;
          else repos.push(repoToRestore);
          await writeToChromeStorage(repos);
          try { await pushLocalToSync(); } catch { }
        }
        sendResponse({ success: true });
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

      case "GET_SYNC_STATUS":
        try {
          const enabled = await getSyncEnabled();
          const { meta } = await readReposFromSync();
          sendResponse({
            enabled,
            meta: meta || null
          });
        } catch (e) {
          sendResponse({ enabled: false, error: String(e) });
        }
        break;

      case "SET_SYNC_ENABLED":
        try {
          // Auto-backup before sync
          if (message.enabled) {
            const repos = await getAllReposLocalOnly();
            const backupData = {
              repos: repos,
              timestamp: Date.now(),
              version: "2.1.0"
            };
            await chrome.storage.local.set({
              "github-repo-saver-backup": JSON.stringify(backupData)
            });
          }

          await setSyncEnabled(message.enabled);
          if (message.enabled) {
            // Push local -> sync once on enable, then pull back to normalize local mirror
            const pushRes = await pushLocalToSync();
            await applySyncToLocalIfEnabled();
            sendResponse({ success: true, ...pushRes });
          } else {
            sendResponse({ success: true, enabled: false });
          }
        } catch (e) {
          sendResponse({ success: false, error: String(e) });
        }
        break;

      case "SYNC_NOW":
        try {
          // Auto-backup before sync
          const repos = await getAllReposLocalOnly();
          const backupData = {
            repos: repos,
            timestamp: Date.now(),
            version: "2.1.0"
          };
          await chrome.storage.local.set({
            "github-repo-saver-backup": JSON.stringify(backupData)
          });

          const pushRes = await pushLocalToSync();
          await applySyncToLocalIfEnabled();
          sendResponse({ success: true, ...pushRes });
        } catch (e) {
          sendResponse({ success: false, error: String(e) });
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
  // If sync enabled, pull once on install/update
  try {
    await applySyncToLocalIfEnabled();
  } catch {
    // ignore
  }
});

// Listen for sync changes from other devices and update local mirror
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "sync") return;
  const touched = Object.keys(changes || {});
  const hasMeta = touched.includes(SYNC_META_KEY);
  const hasChunk = touched.some(k => k.startsWith(SYNC_CHUNK_PREFIX));
  if (!hasMeta && !hasChunk) return;

  if (syncApplyTimer) clearTimeout(syncApplyTimer);
  syncApplyTimer = setTimeout(() => {
    applySyncToLocalIfEnabled();
  }, 300);
});
