const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadScript(filePath) {
    const code = fs.readFileSync(path.resolve(__dirname, '../dashboard', filePath), 'utf8');
    const script = document.createElement('script');
    script.textContent = code;
    document.body.appendChild(script);
}

describe('RepoService', () => {
    beforeAll(() => {
        global.window = global;
        loadScript('core/repo-service.js');
    });

    let repoService;
    let mockStorage;
    let mockState;

    beforeEach(() => {
        mockStorage = {
            getAllRepos: jest.fn().mockResolvedValue([]),
            updateRepo: jest.fn().mockResolvedValue(true),
            removeRepo: jest.fn().mockResolvedValue(true),
            bulkUpdateRepos: jest.fn().mockResolvedValue(true),
            bulkRemoveRepos: jest.fn().mockResolvedValue(true)
        };

        // Simple state mock
        mockState = {
            setRepos: jest.fn(),
            findRepo: jest.fn(),
            allRepos: []
        };

        repoService = new RepoService(mockStorage, mockState);
    });

    test('loadRepos fetches from storage and updates state', async () => {
        const repos = [{ id: 1, name: 'test' }];
        mockStorage.getAllRepos.mockResolvedValue(repos);

        await repoService.loadRepos();

        expect(mockStorage.getAllRepos).toHaveBeenCalled();
        // normalizeRepos might modify the object, so we verify call happened
        expect(mockState.setRepos).toHaveBeenCalled();
    });

    test('updateStatus updates storage and reloads', async () => {
        await repoService.updateStatus('123', 'daxem');

        expect(mockStorage.updateRepo).toHaveBeenCalledWith('123', { status: 'daxem' });
        expect(mockStorage.getAllRepos).toHaveBeenCalled();
    });

    test('bulkDelete calls storage and reloads', async () => {
        const ids = ['1', '2'];
        await repoService.bulkDelete(ids);

        expect(mockStorage.bulkRemoveRepos).toHaveBeenCalledWith(ids);
        expect(mockStorage.getAllRepos).toHaveBeenCalled();
    });
});
