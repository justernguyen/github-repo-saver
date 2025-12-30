// History Manager - Handles Undo/Redo logic
class HistoryManager {
    constructor(state) {
        this.state = state;
        this.undoStack = [];
        this.redoStack = [];
        this.maxStackSize = 50;
    }

    // Register a new action
    // Action structure: { execute: async fn, inverse: async fn, desc: string }
    push(action) {
        this.undoStack.push(action);
        if (this.undoStack.length > this.maxStackSize) {
            this.undoStack.shift();
        }
        this.redoStack = []; // Clear redo stack on new action
        console.log(`Action pushed: ${action.desc}. Undo stack: ${this.undoStack.length}`);
    }

    async undo() {
        if (this.undoStack.length === 0) {
            this.showToast("Nothing to undo");
            return false;
        }

        const action = this.undoStack.pop();
        try {
            console.log(`Undoing: ${action.desc}`);
            await action.inverse();
            this.redoStack.push(action);
            this.showToast(`Undid: ${action.desc}`);
            
            // Trigger state update after undo to refresh UI
            if (this.state && typeof this.state.notify === 'function') {
                this.state.notify('repos');
            }
            
            return true;
        } catch (err) {
            console.error("Undo failed:", err);
            this.showToast(`Undo failed: ${err.message}`);
            // Push back if failed
            this.undoStack.push(action);
            return false;
        }
    }

    async redo() {
        if (this.redoStack.length === 0) {
            // this.showToast("Nothing to redo");
            return false;
        }

        const action = this.redoStack.pop();
        try {
            console.log(`Redoing: ${action.desc}`);
            await action.execute();
            this.undoStack.push(action);
            this.showToast(`Redid: ${action.desc}`);
            return true;
        } catch (err) {
            console.error("Redo failed:", err);
            this.showToast(`Redo failed: ${err.message}`);
            return false;
        }
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();
            const isCtrl = e.ctrlKey || e.metaKey;

            // Ctrl+Z (Undo) - Check for explicit NO shift to avoid conflict with Redo (Ctrl+Shift+Z)
            if (isCtrl && key === 'z' && !e.shiftKey) {
                e.preventDefault();
                this.undo();
            }

            // Ctrl+Y or Ctrl+Shift+Z (Redo)
            const isRedoKey = key === 'y' || (e.shiftKey && key === 'z');
            if (isCtrl && isRedoKey) {
                e.preventDefault();
                this.redo();
            }
        });
    }

    showToast(message) {
        if (window.showToast) {
            window.showToast(message);
        } else {
            console.log("Toast:", message);
        }
    }
}

// Export factory function
function createHistoryManager(state) {
    return new HistoryManager(state);
}

// Expose to global scope for Chrome Extension
window.createHistoryManager = createHistoryManager;
