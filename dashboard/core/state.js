// Global State Management for Dashboard

class DashboardState {
    constructor() {
        // Repos data
        this.allRepos = [];

        // Filter state
        this.searchQuery = "";
        this.activeFilter = "all";
        this.activeStatusFilter = "";
        this.activeRoleFilter = "";
        this.activeCollectionFilter = "";
        this.sortBy = "newest";

        // Cache for filtered results
        this.filteredReposCache = null;
        this.cacheKey = null;

        // UI state
        this.selectionMode = false;
        this.selectedRepoIds = new Set();
        this.editingRepoId = null;
        this.renderInProgress = false;

        // Keyboard navigation
        this.selectedRepoIndex = -1;
        this.keyboardNavEnabled = false;

        // Debounce timers
        this.searchDebounceTimer = null;

        // Sync state
        this.syncEnabled = false;

        // Listeners for state changes
        this.listeners = new Map();
    }

    // Subscribe to state changes
    subscribe(key, callback) {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, []);
        }
        this.listeners.get(key).push(callback);

        // Return unsubscribe function
        return () => {
            const callbacks = this.listeners.get(key);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        };
    }

    // Notify listeners
    notify(key) {
        if (this.listeners.has(key)) {
            this.listeners.get(key).forEach(callback => callback());
        }
    }

    // Update repos
    setRepos(repos) {
        this.allRepos = repos;
        this.invalidateCache();
        this.notify('repos');
    }

    // Update search query
    setSearchQuery(query) {
        this.searchQuery = query;
        this.invalidateCache();
        this.notify('search');
    }

    // Update filters
    setFilter(filterType, value) {
        switch (filterType) {
            case 'main':
                this.activeFilter = value;
                break;
            case 'status':
                this.activeStatusFilter = value;
                break;
            case 'role':
                this.activeRoleFilter = value;
                break;
            case 'collection':
                this.activeCollectionFilter = value;
                break;
        }
        this.invalidateCache();
        this.notify('filter');
    }

    // Update sort
    setSort(sortBy) {
        this.sortBy = sortBy;
        this.invalidateCache();
        this.notify('sort');
    }

    // Clear all filters
    clearFilters() {
        this.activeFilter = "all";
        this.activeStatusFilter = "";
        this.activeRoleFilter = "";
        this.activeCollectionFilter = "";
        this.searchQuery = "";
        this.invalidateCache();
        this.notify('filter');
        this.notify('search');
    }

    // Selection mode
    setSelectionMode(enabled) {
        this.selectionMode = enabled;
        if (!enabled) {
            this.selectedRepoIds.clear();
        }
        this.notify('selection');
    }

    toggleRepoSelection(repoId) {
        if (this.selectedRepoIds.has(repoId)) {
            this.selectedRepoIds.delete(repoId);
        } else {
            this.selectedRepoIds.add(repoId);
        }
        this.notify('selection');
    }

    selectAll(repoIds) {
        this.selectedRepoIds = new Set(repoIds);
        this.notify('selection');
    }

    clearSelection() {
        this.selectedRepoIds.clear();
        this.notify('selection');
    }

    // Cache management
    invalidateCache() {
        this.filteredReposCache = null;
        this.cacheKey = null;
    }

    getCacheKey() {
        return `${this.searchQuery}|${this.activeFilter}|${this.activeStatusFilter}|${this.activeRoleFilter}|${this.activeCollectionFilter}|${this.sortBy}`;
    }

    // Get filtered repos with caching
    getFilteredRepos() {
        const currentCacheKey = this.getCacheKey();
        if (this.filteredReposCache && this.cacheKey === currentCacheKey) {
            return this.filteredReposCache;
        }

        let filtered = [...this.allRepos];

        // Apply search
        if (this.searchQuery) {
            const query = this.searchQuery.trim().toLowerCase();
            if (query) {
                filtered = filtered.filter(repo => {
                    const name = (repo.customName || repo.name || "").toLowerCase();
                    const owner = (repo.owner || "").toLowerCase();
                    const desc = (repo.description || "").toLowerCase();
                    const note = (repo.note || "").toLowerCase();
                    const collection = (repo.collection || "").toLowerCase();
                    if (name.includes(query) || owner.includes(query) || desc.includes(query) || note.includes(query) || collection.includes(query)) {
                        return true;
                    }
                    const customTags = repo.customTags || [];
                    const techTags = repo.technicalTags || repo.topics || [];
                    return customTags.some(tag => tag.toLowerCase().includes(query)) ||
                        techTags.some(tag => tag.toLowerCase().includes(query));
                });
            }
        }

        // Apply filters
        if (this.activeFilter === "all") {
            // Show everything
        } else {
            if (this.activeStatusFilter) {
                filtered = filtered.filter(repo => repo.status === this.activeStatusFilter);
            }

            if (this.activeRoleFilter) {
                if (this.activeRoleFilter === "__null__") {
                    filtered = filtered.filter(repo => !repo.role || repo.role === null || repo.role === undefined);
                } else {
                    filtered = filtered.filter(repo => repo.role === this.activeRoleFilter);
                }
            }

            if (this.activeCollectionFilter) {
                filtered = filtered.filter(repo => (repo.collection || "") === this.activeCollectionFilter);
            }
        }

        // Apply sort (Pinned always first)
        filtered.sort((a, b) => {
            const ap = a.pinned ? 1 : 0;
            const bp = b.pinned ? 1 : 0;
            if (ap !== bp) return bp - ap;

            switch (this.sortBy) {
                case "newest":
                    return (b.savedAt || 0) - (a.savedAt || 0);
                case "oldest":
                    return (a.savedAt || 0) - (b.savedAt || 0);
                case "name":
                    return (a.customName || a.name || "").localeCompare((b.customName || b.name || ""));
                case "stars":
                    return (b.stars || 0) - (a.stars || 0);
                case "forks":
                    return (b.forks || 0) - (a.forks || 0);
                case "updated":
                    return (b.updatedAt || 0) - (a.updatedAt || 0);
                case "recent":
                    return (b.lastOpenedAt || 0) - (a.lastOpenedAt || 0);
                default:
                    return 0;
            }
        });

        // Cache result
        this.filteredReposCache = filtered;
        this.cacheKey = currentCacheKey;
        return filtered;
    }

    // Get statistics
    getStats() {
        const total = this.allRepos.length;
        const filteredCount = this.getFilteredRepos().length;
        const unviewed = this.allRepos.filter(r => r.status === "chuaxem").length;
        const inUse = this.allRepos.filter(r => r.status === "dangdung").length;

        return { total, filteredCount, unviewed, inUse };
    }

    // Find repo by ID
    findRepo(repoId) {
        return this.allRepos.find(r => r.id === repoId);
    }

    // Get all collections
    getAllCollections() {
        const collections = new Set();
        this.allRepos.forEach(repo => {
            if (repo.collection) {
                collections.add(repo.collection);
            }
        });
        return Array.from(collections).sort();
    }

    // Get all tags
    getAllTags() {
        const tags = new Set();
        this.allRepos.forEach(repo => {
            (repo.customTags || []).forEach(tag => tags.add(tag));
        });
        return Array.from(tags).sort();
    }
}

// Export singleton instance
const dashboardState = new DashboardState();

// Expose to global scope for Chrome Extension
window.dashboardState = dashboardState;