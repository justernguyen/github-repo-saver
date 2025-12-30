// Virtual Scroller - Handles efficient rendering of large lists
class VirtualScroller {
    constructor(options) {
        this.container = options.container;
        this.renderItem = options.renderItem;
        this.itemHeight = options.itemHeight || 280; // Default height approximation
        this.buffer = options.buffer || 5; // Number of items to render outside viewport
        this.items = [];

        this.scroller = null;
        this.content = null;

        // Bind methods
        this.onScroll = this.onScroll.bind(this);
        this.currentScrollTop = 0;

        this.setup();
    }

    setup() {
        // Ensure container has relative positioning
        this.container.style.position = 'relative';
        this.container.style.overflowY = 'auto'; // Ensure it can scroll if it's the scroll container

        // Create inner content wrapper
        this.content = document.createElement('div');
        this.content.className = 'virtual-content';
        this.content.style.position = 'absolute';
        this.content.style.top = '0';
        this.content.style.left = '0';
        this.content.style.width = '100%';

        // Copy essential grid styles from container (hardcoded for now based on dashboard css)
        this.content.style.display = 'grid';
        this.content.style.gridTemplateColumns = 'repeat(auto-fill, minmax(300px, 1fr))';
        this.content.style.gap = '20px';

        this.container.appendChild(this.content);

        // If container is window/body, we listen to window scroll
        // Otherwise listen to container scroll
        const scrollTarget = this.container === document.body ? window : this.container;
        scrollTarget.addEventListener('scroll', this.onScroll, { passive: true });

        // Handle resize
        window.addEventListener('resize', this.onScroll, { passive: true });
    }

    setItems(items) {
        this.items = items;
        // Update total height
        const totalHeight = this.items.length * this.itemHeight;
        this.container.style.height = this.container === document.body ? 'auto' : '100%';

        // If we are using a spacer element strategy:
        // We update the height of a dummy element or the container itself to mimic scrollbar
        // But since we are grid, calculation is tricky.
        // For repo grid, standard Virtual Scroll works best with List view or fixed Grid rows.

        // Let's assume a Flex/Grid layout with fixed width cards.
        // We need to calculate how many columns fit in the container.
        this.render();
    }

    // Helper to count columns based on container width
    getColumns() {
        // Assuming standard repo card width + gap
        // .repo-card min-width is usually ~300px or so
        // We can measure container width
        const containerWidth = this.container.clientWidth;
        // Estimate card width including gap (adjust based on CSS)
        const cardWidth = 350;
        return Math.floor(containerWidth / cardWidth) || 1;
    }

    onScroll(e) {
        // Throttle via RequestAnimationFrame
        if (this.ticking) return;
        this.ticking = true;
        requestAnimationFrame(() => {
            this.currentScrollTop = (this.container === document.body ? window.scrollY : this.container.scrollTop);
            this.render();
            this.ticking = false;
        });
    }

    render() {
        if (!this.items.length) {
            this.content.innerHTML = "";
            this.container.style.height = "auto";
            return;
        }

        const columns = this.getColumns();
        const rows = Math.ceil(this.items.length / columns);
        const totalHeight = rows * this.itemHeight;

        // Update phantom height
        // We can't set height on container if it's responsible for layout.
        // Instead we use a placeholder approach: 
        // Set container min-height to totalHeight
        this.container.style.minHeight = `${totalHeight}px`;

        // Viewport calculation
        // Get viewport height
        const viewportHeight = window.innerHeight; // Or container height

        // Calculate start and end rows
        const startRow = Math.floor(this.currentScrollTop / this.itemHeight);
        const endRow = Math.ceil((this.currentScrollTop + viewportHeight) / this.itemHeight);

        // Add buffer
        const bufferedStartRow = Math.max(0, startRow - this.buffer);
        const bufferedEndRow = Math.min(rows, endRow + this.buffer);

        const startIndex = bufferedStartRow * columns;
        const endIndex = Math.min(this.items.length, bufferedEndRow * columns);

        // Render visible items
        const visibleItems = this.items.slice(startIndex, endIndex);

        // Create HTML - ensure renderItem is called properly
        const html = visibleItems.map(item => {
            try {
                return this.renderItem(item);
            } catch (err) {
                console.error("Error rendering item:", err, item);
                return `<div class="repo-card"><p>Error rendering item</p></div>`;
            }
        }).join("");
        this.content.innerHTML = html;

        // Offset content
        const offsetY = bufferedStartRow * this.itemHeight;
        this.content.style.transform = `translateY(${offsetY}px)`;

        // Re-attach listeners if needed? 
        // Since we are replacing innerHTML, we might lose listeners bound to specific elements.
        // We rely on Event Delegation (dashboard already implements this!).
    }
}

// Export factory function
function createVirtualScroller(options) {
    return new VirtualScroller(options);
}

// Expose global
window.createVirtualScroller = createVirtualScroller;
