// Filters Manager - Handles search and filter UI

class FiltersManager {
    constructor(state, onFilterChange) {
        this.state = state;
        this.onFilterChange = onFilterChange;
        this.searchDebounceDelay = 300;
    }

    // Setup all filter controls
    setup() {
        this.setupClearFiltersButton();
        this.setupFilterButtons();
        this.setupStatusFilter();
        this.setupRoleFilter();
        this.setupCollectionFilter();
        this.setupSearchInput();
        this.setupSortSelect();
    }

    // Clear all filters button
    setupClearFiltersButton() {
        const clearFiltersBtn = document.getElementById("clear-filters-btn");
        if (clearFiltersBtn) {
            const newBtn = clearFiltersBtn.cloneNode(true);
            clearFiltersBtn.parentNode.replaceChild(newBtn, clearFiltersBtn);

            newBtn.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();

                this.state.clearFilters();

                // Reset UI
                document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
                const allBtn = document.querySelector('.filter-btn[data-filter="all"]');
                if (allBtn) allBtn.classList.add("active");

                const statusSelect = document.getElementById("status-filter");
                const roleSelect = document.getElementById("role-filter");
                const collectionSelect = document.getElementById("collection-filter");
                const searchInput = document.getElementById("search-input");

                if (statusSelect) statusSelect.value = "";
                if (roleSelect) roleSelect.value = "";
                if (collectionSelect) collectionSelect.value = "";
                if (searchInput) searchInput.value = "";

                if (this.onFilterChange) this.onFilterChange();
            });
        }
    }

    // Filter buttons (All, etc.)
    setupFilterButtons() {
        const filterButtons = document.querySelectorAll(".filter-btn");

        filterButtons.forEach((btn) => {
            const filterValue = btn.dataset.filter;
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            newBtn.dataset.filter = filterValue;

            newBtn.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();

                document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
                newBtn.classList.add("active");

                this.state.setFilter('main', filterValue);
                this.state.setFilter('status', "");
                this.state.setFilter('role', "");
                this.state.setFilter('collection', "");

                // Reset dropdowns
                const statusSelect = document.getElementById("status-filter");
                const roleSelect = document.getElementById("role-filter");
                const collectionSelect = document.getElementById("collection-filter");
                if (statusSelect) statusSelect.value = "";
                if (roleSelect) roleSelect.value = "";
                if (collectionSelect) collectionSelect.value = "";

                if (this.onFilterChange) this.onFilterChange();
            });
        });
    }

    // Status filter dropdown
    setupStatusFilter() {
        const statusSelect = document.getElementById("status-filter");
        if (statusSelect) {
            statusSelect.addEventListener("change", (e) => {
                const value = e.target.value || "";
                this.state.setFilter('status', value);

                document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
                this.state.setFilter('main', "");

                if (this.onFilterChange) this.onFilterChange();
            });
        }
    }

    // Role filter dropdown
    setupRoleFilter() {
        const roleSelect = document.getElementById("role-filter");
        if (roleSelect) {
            roleSelect.addEventListener("change", (e) => {
                const value = e.target.value || "";
                this.state.setFilter('role', value);

                document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
                this.state.setFilter('main', "");

                if (this.onFilterChange) this.onFilterChange();
            });
        }
    }

    // Collection filter dropdown
    setupCollectionFilter() {
        const collectionSelect = document.getElementById("collection-filter");
        if (collectionSelect) {
            collectionSelect.addEventListener("change", (e) => {
                const value = e.target.value || "";
                this.state.setFilter('collection', value);

                document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
                this.state.setFilter('main', "");

                if (this.onFilterChange) this.onFilterChange();
            });
        }
    }

    // Search input with debouncing
    setupSearchInput() {
        const searchInput = document.getElementById("search-input");
        if (searchInput) {
            const newSearchInput = searchInput.cloneNode(true);
            searchInput.parentNode.replaceChild(newSearchInput, searchInput);

            newSearchInput.addEventListener("input", (e) => {
                const query = e.target.value;

                if (this.state.searchDebounceTimer) {
                    clearTimeout(this.state.searchDebounceTimer);
                }

                this.state.searchDebounceTimer = setTimeout(() => {
                    this.state.setSearchQuery(query);
                    if (this.onFilterChange) this.onFilterChange();
                }, this.searchDebounceDelay);
            });
        }
    }

    // Sort select
    setupSortSelect() {
        const sortSelect = document.getElementById("sort-select");
        if (sortSelect) {
            sortSelect.addEventListener("change", (e) => {
                this.state.setSort(e.target.value);
                if (this.onFilterChange) this.onFilterChange();
            });
        }
    }

    // Update collection filter options
    updateCollectionOptions() {
        const collectionSelect = document.getElementById("collection-filter");
        if (!collectionSelect) return;

        const collections = this.state.getAllCollections();
        const currentValue = collectionSelect.value;

        // Clear and rebuild options
        collectionSelect.innerHTML = '<option value="">🗂️ All Collections</option>';
        collections.forEach(collection => {
            const option = document.createElement("option");
            option.value = collection;
            option.textContent = collection;
            collectionSelect.appendChild(option);
        });

        // Restore selection if still valid
        if (currentValue && collections.includes(currentValue)) {
            collectionSelect.value = currentValue;
        }
    }
}

// Export factory function
function createFiltersManager(state, onFilterChange) {
    return new FiltersManager(state, onFilterChange);
}

// Expose to global scope for Chrome Extension
window.createFiltersManager = createFiltersManager;
