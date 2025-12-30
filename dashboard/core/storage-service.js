// Storage Service - Abstraction layer for chrome.storage and IndexedDB

class StorageService {
    constructor() {
        this.STORAGE_KEY = "github-repo-saver-repos";
    }

    // Get all repos
    async getAllRepos() {
        // Fallback for standalone testing (file://)
        if (typeof chrome === "undefined" || !chrome.runtime) {
            console.warn("⚠️ Extension API missing. Using MOCK data.");
            return [
                { id: "fb/react", name: "react", owner: "facebook", status: "dangdung", stars: 213000, forks: 45000, description: "A JavaScript library for building user interfaces", role: "ui-frontend", savedAt: Date.now() },
                { id: "vuejs/vue", name: "vue", owner: "vuejs", status: "chuaxem", stars: 205000, forks: 35000, description: "The Progressive JavaScript Framework", role: "ui-frontend", savedAt: Date.now() - 100000 },
                { id: "vercel/next.js", name: "next.js", owner: "vercel", status: "daxem", stars: 110000, forks: 25000, description: "The React Framework", role: "backend-api", savedAt: Date.now() - 200000 },
                // Generate more dummy data for virtual scroll testing
                ...Array.from({ length: 150 }, (_, i) => ({
                    id: `mock/repo-${i}`,
                    name: `mock-repo-${i}`,
                    owner: "mock-user",
                    status: i % 3 === 0 ? "dangdung" : (i % 2 === 0 ? "daxem" : "chuaxem"),
                    stars: Math.floor(Math.random() * 5000),
                    description: `This is a generated mock repository #${i} for testing virtual scrolling.`,
                    role: "other",
                    savedAt: Date.now() - (i * 1000000)
                }))
            ];
        }

        try {
            const response = await chrome.runtime.sendMessage({
                type: "GET_ALL_REPOS"
            });

            if (response && response.error) {
                throw new Error(response.error);
            }

            return response.repos || [];
        } catch (error) {
            console.error("Error getting repos:", error);
            throw error;
        }
    }

    // Update repo
    async updateRepo(repoId, updates) {
        if (typeof chrome === "undefined" || !chrome.runtime) return true;
        try {
            const response = await chrome.runtime.sendMessage({
                type: "UPDATE_REPO",
                repoId,
                updates
            });

            if (response && response.error) {
                throw new Error(response.error);
            }

            return true;
        } catch (error) {
            console.error("Error updating repo:", error);
            throw error;
        }
    }

    // Remove repo
    async removeRepo(repoId) {
        if (typeof chrome === "undefined" || !chrome.runtime) return true;
        try {
            const response = await chrome.runtime.sendMessage({
                type: "REMOVE_REPO",
                repoId
            });

            if (response && response.error) {
                throw new Error(response.error);
            }

            return true;
        } catch (error) {
            console.error("Error removing repo:", error);
            throw error;
        }
    }

    // Restore repo (full object)
    async restoreRepo(repo) {
        if (typeof chrome === "undefined" || !chrome.runtime) return true;
        try {
            const response = await chrome.runtime.sendMessage({
                type: "RESTORE_REPO",
                repo
            });

            if (response && response.error) {
                throw new Error(response.error);
            }

            return true;
        } catch (error) {
            console.error("Error restoring repo:", error);
            throw error;
        }
    }

    // Bulk update repos
    async bulkUpdateRepos(repoIds, updates) {
        const promises = repoIds.map(id => this.updateRepo(id, updates));
        return Promise.all(promises);
    }

    // Bulk remove repos
    async bulkRemoveRepos(repoIds) {
        const promises = repoIds.map(id => this.removeRepo(id));
        return Promise.all(promises);
    }

    // Get sync status
    async getSyncStatus() {
        try {
            const response = await chrome.runtime.sendMessage({
                type: "GET_SYNC_STATUS"
            });
            return response;
        } catch (error) {
            console.error("Error getting sync status:", error);
            return { enabled: false, error: error.message };
        }
    }

    // Set sync enabled
    async setSyncEnabled(enabled) {
        try {
            const response = await chrome.runtime.sendMessage({
                type: "SET_SYNC_ENABLED",
                enabled
            });
            return response;
        } catch (error) {
            console.error("Error setting sync:", error);
            throw error;
        }
    }

    // Sync now
    async syncNow() {
        try {
            const response = await chrome.runtime.sendMessage({
                type: "SYNC_NOW"
            });
            return response;
        } catch (error) {
            console.error("Error syncing:", error);
            throw error;
        }
    }

    // Export repos to JSON
    exportToJSON(repos) {
        const data = {
            version: "2.1.0",
            exportedAt: new Date().toISOString(),
            repos: repos
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `github-repos-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    // Import repos from JSON
    // Supports both formats:
    // 1. Array directly: [{...}, {...}]
    // 2. Object with repos key: {"repos": [{...}, {...}]}
    async importFromJSON(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    let repos = null;

                    // Check if it's an array directly
                    if (Array.isArray(data)) {
                        repos = data;
                    }
                    // Check if it's an object with repos key
                    else if (data.repos && Array.isArray(data.repos)) {
                        repos = data.repos;
                    }
                    // Invalid format
                    else {
                        reject(new Error("Invalid import file format. Expected array or object with 'repos' key."));
                        return;
                    }

                    // Validate repos array
                    if (!repos || repos.length === 0) {
                        reject(new Error("No repositories found in file"));
                        return;
                    }

                    // Validate each repo has required fields
                    const invalidRepos = repos.filter(repo => !repo.id && !(repo.owner && repo.name));
                    if (invalidRepos.length > 0) {
                        console.warn(`⚠️ Found ${invalidRepos.length} repos without id or owner/name`);
                    }

                    resolve(repos);
                } catch (error) {
                    console.error("JSON parse error:", error);
                    reject(new Error("Failed to parse JSON file: " + error.message));
                }
            };

            reader.onerror = () => reject(new Error("Failed to read file"));
            reader.readAsText(file);
        });
    }
}

// Export singleton instance
const storageService = new StorageService();

// Expose to global scope for Chrome Extension
window.storageService = storageService;