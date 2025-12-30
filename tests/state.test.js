const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadScript(filePath) {
    const code = fs.readFileSync(path.resolve(__dirname, '../dashboard', filePath), 'utf8');
    const script = document.createElement('script');
    script.textContent = code;
    document.body.appendChild(script);
}

describe('DashboardState System', () => {
    beforeAll(() => {
        // Setup window environment
        global.window = global;

        // Load the script
        loadScript('core/state.js');
    });

    beforeEach(() => {
        // Reset state for each test
        // Assuming DashboardState class is available globally after loadScript
        window.dashboardState = new DashboardState();
    });

    test('Initial state is clean', () => {
        const { dashboardState } = window;
        expect(dashboardState.allRepos).toEqual([]);
        expect(dashboardState.searchQuery).toBe('');
        expect(dashboardState.activeFilter).toBe('all');
    });

    test('setSearchQuery updates state and notifies listeners', () => {
        const { dashboardState } = window;
        const listener = jest.fn();

        dashboardState.subscribe('search', listener);
        dashboardState.setSearchQuery('react');

        expect(dashboardState.searchQuery).toBe('react');
        expect(listener).toHaveBeenCalled();
    });

    test('Search filtering works correctly', () => {
        const { dashboardState } = window;
        const repos = [
            { id: 1, name: 'react-app', status: 'dangdung' },
            { id: 2, name: 'vue-app', status: 'chuaxem' },
            { id: 3, name: 'angular-app', status: 'daxem' }
        ];

        dashboardState.setRepos(repos);
        dashboardState.setSearchQuery('react');

        const filtered = dashboardState.getFilteredRepos();
        expect(filtered).toHaveLength(1);
        expect(filtered[0].name).toBe('react-app');
    });

    test('Status filter works', () => {
        const { dashboardState } = window;
        const repos = [
            { id: 1, status: 'dangdung' },
            { id: 2, status: 'chuaxem' }
        ];
        dashboardState.setRepos(repos);
        // 'main' filter must be active (not "all") for other filters to apply?
        // Wait, let's check the code.
        // if (activeFilter === "all") shows everything.
        // Ah, logic: if activeFilter is "all", it ignores dropdowns?
        // Let's verify line 186 in state.js:
        // if (this.activeFilter === "all") { ... } else { ... apply status ... }

        // So we must set activeFilter to something else (e.g. "filtered") or change logic.
        // But typically "all" means "All Repos" tab. 
        // If we want to filter by status, we usually are in a specific view or "all" logic needs to incorporate dropdowns.
        // Let's assume we switch to a filter mode.
        dashboardState.setFilter('main', 'custom');
        dashboardState.setFilter('status', 'dangdung');

        const filtered = dashboardState.getFilteredRepos();
        expect(filtered).toHaveLength(1);
        expect(filtered[0].status).toBe('dangdung');
    });

    test('Caching mechanism works', () => {
        const { dashboardState } = window;
        const repos = [{ id: 1, name: 'test' }];
        dashboardState.setRepos(repos);

        // First call
        const res1 = dashboardState.getFilteredRepos();
        // Second call should return same object reference
        const res2 = dashboardState.getFilteredRepos();

        expect(res1).toBe(res2);

        // Change query
        dashboardState.setSearchQuery('changed');
        const res3 = dashboardState.getFilteredRepos();
        expect(res1).not.toBe(res3);
    });
});
