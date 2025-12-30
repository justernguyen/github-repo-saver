// Repo Service - Business logic for repository operations with Undo History

class RepoService {
    constructor(storageService, state, historyManager) {
        this.storage = storageService;
        this.state = state;
        this.history = historyManager;
    }

    // Load all repos
    async loadRepos() {
        try {
            const repos = await this.storage.getAllRepos();

            // Normalize and migrate old data
            const normalized = repos.map(repo => {
                // Migrate old status values
                let status = repo.status || "chuaxem";
                if (status === "dathu") status = "chuaxem";
                if (status === "bo") status = "chuaxem";

                return {
                    ...repo,
                    id: repo.id || `${repo.owner}/${repo.name}`.toLowerCase(),
                    status,
                    customName: repo.customName || "",
                    customTags: repo.customTags || [],
                    technicalTags: repo.technicalTags || repo.topics || [],
                    role: repo.role || null,
                    note: repo.note || "",
                    collection: repo.collection || "",
                    pinned: !!repo.pinned,
                    lastOpenedAt: repo.lastOpenedAt || 0,
                    stars: repo.stars || 0,
                    forks: repo.forks || 0,
                    updatedAt: repo.updatedAt || repo.savedAt || Date.now()
                };
            });

            this.state.setRepos(normalized);
            return normalized;
        } catch (error) {
            console.error("Error loading repos:", error);
            throw error;
        }
    }

    // Update repo status
    async updateStatus(repoId, newStatus, recordHistory = true) {
        if (!repoId || typeof repoId !== "string") throw new Error("Invalid repo ID");

        const repo = this.state.findRepo(repoId);
        if (!repo) return;
        const oldStatus = repo.status;

        await this.storage.updateRepo(repoId, { status: newStatus });
        await this.loadRepos();

        if (recordHistory && this.history) {
            this.history.push({
                desc: `Status change for ${repo.name}`,
                execute: () => this.updateStatus(repoId, newStatus, false),
                inverse: () => this.updateStatus(repoId, oldStatus, false)
            });
        }
    }

    // Update repo details (edit modal)
    async updateRepo(repoId, updates, recordHistory = true) {
        if (!repoId || typeof repoId !== "string") throw new Error("Invalid repo ID");

        const repo = this.state.findRepo(repoId);
        if (!repo) return;

        // Calculate old values for reverted keys only
        const oldValues = {};
        Object.keys(updates).forEach(key => {
            if (repo.hasOwnProperty(key)) oldValues[key] = repo[key];
        });

        await this.storage.updateRepo(repoId, updates);
        await this.loadRepos();

        if (recordHistory && this.history) {
            this.history.push({
                desc: `Edit details for ${repo.name}`,
                execute: () => this.updateRepo(repoId, updates, false),
                inverse: () => this.updateRepo(repoId, oldValues, false)
            });
        }
    }

    // Delete repo
    async deleteRepo(repoId, recordHistory = true) {
        if (!repoId || typeof repoId !== "string") throw new Error("Invalid repo ID");

        const repo = this.state.findRepo(repoId);
        if (!repo) return;

        // Deep clone repo before deletion to preserve all data for undo
        const repoClone = JSON.parse(JSON.stringify(repo));

        await this.storage.removeRepo(repoId);
        await this.loadRepos();

        if (recordHistory && this.history) {
            this.history.push({
                desc: `Deleted ${repo.name || repoClone.name || repoId}`,
                execute: async () => {
                    await this.deleteRepo(repoId, false);
                },
                inverse: async () => {
                    try {
                        await this.storage.restoreRepo(repoClone);
                        await this.loadRepos();
                    } catch (error) {
                        console.error("Error restoring repo:", error);
                        throw error;
                    }
                }
            });
        }
    }

    // Toggle pin
    async togglePin(repoId, recordHistory = true) {
        const repo = this.state.findRepo(repoId);
        if (!repo) throw new Error("Repo not found");

        const newPinnedState = !repo.pinned;

        await this.storage.updateRepo(repoId, { pinned: newPinnedState });
        await this.loadRepos();

        if (recordHistory && this.history) {
            this.history.push({
                desc: newPinnedState ? `Pinned ${repo.name}` : `Unpinned ${repo.name}`,
                execute: () => this.togglePin(repoId, false),
                inverse: () => this.togglePin(repoId, false)
            });
        }
    }

    // Record repo opened
    async recordOpened(repoId) {
        await this.storage.updateRepo(repoId, { lastOpenedAt: Date.now() });
    }

    // Bulk operations
    async bulkUpdateStatus(repoIds, status, recordHistory = true) {
        if (recordHistory && this.history) {
            const oldStates = repoIds.map(id => {
                const r = this.state.findRepo(id);
                return r ? { id: r.id, status: r.status } : null;
            }).filter(Boolean);

            this.history.push({
                desc: `Bulk status update (${repoIds.length})`,
                execute: () => this.bulkUpdateStatus(repoIds, status, false),
                inverse: async () => {
                    const promises = oldStates.map(s => this.storage.updateRepo(s.id, { status: s.status }));
                    await Promise.all(promises);
                    await this.loadRepos();
                }
            });
        }
        await this.storage.bulkUpdateRepos(repoIds, { status });
        await this.loadRepos();
    }

    async bulkUpdateRole(repoIds, role, recordHistory = true) {
        if (recordHistory && this.history) {
            const oldStates = repoIds.map(id => {
                const r = this.state.findRepo(id);
                return r ? { id: r.id, role: r.role } : null;
            }).filter(Boolean);

            this.history.push({
                desc: `Bulk role update (${repoIds.length})`,
                execute: () => this.bulkUpdateRole(repoIds, role, false),
                inverse: async () => {
                    const promises = oldStates.map(s => this.storage.updateRepo(s.id, { role: s.role }));
                    await Promise.all(promises);
                    await this.loadRepos();
                }
            });
        }
        const updates = { role: role === "__null__" ? null : role };
        await this.storage.bulkUpdateRepos(repoIds, updates);
        await this.loadRepos();
    }

    async bulkMoveToCollection(repoIds, collection, recordHistory = true) {
        if (recordHistory && this.history) {
            const oldStates = repoIds.map(id => {
                const r = this.state.findRepo(id);
                return r ? { id: r.id, collection: r.collection } : null;
            }).filter(Boolean);
            this.history.push({
                desc: `Bulk move collection`,
                execute: () => this.bulkMoveToCollection(repoIds, collection, false),
                inverse: async () => {
                    const promises = oldStates.map(s => this.storage.updateRepo(s.id, { collection: s.collection }));
                    await Promise.all(promises);
                    await this.loadRepos();
                }
            });
        }
        await this.storage.bulkUpdateRepos(repoIds, { collection });
        await this.loadRepos();
    }

    async bulkAddTags(repoIds, newTags, recordHistory = true) {
        if (recordHistory && this.history) {
            const oldStates = repoIds.map(id => {
                const r = this.state.findRepo(id);
                return r ? { id: r.id, customTags: [...(r.customTags || [])] } : null;
            }).filter(Boolean);

            this.history.push({
                desc: `Bulk add tags`,
                execute: () => this.bulkAddTags(repoIds, newTags, false),
                inverse: async () => {
                    const promises = oldStates.map(s => this.storage.updateRepo(s.id, { customTags: s.customTags }));
                    await Promise.all(promises);
                    await this.loadRepos();
                }
            });
        }

        const promises = repoIds.map(async (id) => {
            const repo = this.state.findRepo(id);
            if (repo) {
                const existingTags = repo.customTags || [];
                const mergedTags = [...new Set([...existingTags, ...newTags])];
                await this.storage.updateRepo(id, { customTags: mergedTags });
            }
        });
        await Promise.all(promises);
        await this.loadRepos();
    }

    async bulkDelete(repoIds, recordHistory = true) {
        if (recordHistory && this.history) {
            const oldRepos = repoIds.map(id => this.state.findRepo(id)).filter(Boolean);
            this.history.push({
                desc: `Bulk delete (${repoIds.length})`,
                execute: () => this.bulkDelete(repoIds, false),
                inverse: async () => {
                    const promises = oldRepos.map(r => this.storage.restoreRepo(r));
                    await Promise.all(promises);
                    await this.loadRepos();
                }
            });
        }
        await this.storage.bulkRemoveRepos(repoIds);
        await this.loadRepos();
    }

    // Get statistics
    calculateStatistics() {
        const byRole = {};
        const byStatus = {};
        const byCollection = {};
        let pinned = 0;

        this.state.allRepos.forEach(repo => {
            const role = repo.role || null;
            byRole[role] = (byRole[role] || 0) + 1;
            const status = repo.status || "chuaxem";
            byStatus[status] = (byStatus[status] || 0) + 1;
            const collection = repo.collection || "";
            byCollection[collection] = (byCollection[collection] || 0) + 1;
            if (repo.pinned) pinned++;
        });

        return {
            total: this.state.allRepos.length,
            pinned,
            byRole: Object.entries(byRole).map(([role, count]) => ({ role, count })).sort((a, b) => b.count - a.count),
            byStatus: Object.entries(byStatus).map(([status, count]) => ({ status, count })).sort((a, b) => b.count - a.count),
            collections: Object.keys(byCollection).filter(c => c).length,
            topCollections: Object.entries(byCollection)
                .map(([name, count]) => ({ name, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 10)
        };
    }
}

// Export factory function
function createRepoService(storageService, state, historyManager) {
    return new RepoService(storageService, state, historyManager);
}

// Expose to global scope for Chrome Extension
window.createRepoService = createRepoService;
