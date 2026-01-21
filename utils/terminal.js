/**
 * Native Bun utilities for terminal output
 */

/**
 * ANSI color codes for terminal styling
 */
export const colors = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    underline: '\x1b[4m',

    // Foreground colors
    black: '\x1b[30m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',

    // Background colors
    bgBlack: '\x1b[40m',
    bgRed: '\x1b[41m',
    bgGreen: '\x1b[42m',
    bgYellow: '\x1b[43m',
    bgBlue: '\x1b[44m',
    bgMagenta: '\x1b[45m',
    bgCyan: '\x1b[46m',
    bgWhite: '\x1b[47m',
};

/**
 * Helper functions for colored text
 */
export const style = {
    green: (text) => `${colors.green}${text}${colors.reset}`,
    red: (text) => `${colors.red}${text}${colors.reset}`,
    yellow: (text) => `${colors.yellow}${text}${colors.reset}`,
    blue: (text) => `${colors.blue}${text}${colors.reset}`,
    cyan: (text) => `${colors.cyan}${text}${colors.reset}`,
    magenta: (text) => `${colors.magenta}${text}${colors.reset}`,
    bold: (text) => `${colors.bold}${text}${colors.reset}`,
    dim: (text) => `${colors.dim}${text}${colors.reset}`,
    underline: (text) => `${colors.underline}${text}${colors.reset}`,
    boldUnderline: (text) => `${colors.bold}${colors.underline}${text}${colors.reset}`,
};

/**
 * Progress bar implementation using native Bun APIs
 */
export class ProgressBar {
    constructor(total, options = {}) {
        this.total = total;
        this.current = 0;
        this.width = options.width || 40;
        this.complete = options.complete || '█';
        this.incomplete = options.incomplete || '░';
        this.showValue = options.showValue ?? true;
    }

    /**
     * Update the progress bar to a specific value
     * @param {number} value - Current progress value
     */
    update(value) {
        this.current = value;
        this.render();
    }

    /**
     * Increment the progress bar by 1
     */
    increment() {
        this.current++;
        this.render();
    }

    /**
     * Render the progress bar to stdout
     */
    render() {
        const percentage = this.current / this.total;
        const filled = Math.round(this.width * percentage);
        const empty = this.width - filled;

        const bar = this.complete.repeat(filled) + this.incomplete.repeat(empty);
        const percent = Math.round(percentage * 100);

        const output = this.showValue
            ? `\r${bar} ${percent}% | ${this.current}/${this.total}`
            : `\r${bar} ${percent}%`;

        Bun.write(Bun.stdout, output);
    }

    /**
     * Complete the progress bar and move to next line
     */
    stop() {
        this.current = this.total;
        this.render();
        Bun.write(Bun.stdout, '\n');
    }
}

/**
 * Simple table formatter for terminal output
 */
export class Table {
    constructor(options = {}) {
        this.head = options.head || [];
        this.rows = [];
        this.colWidths = [];
    }

    /**
     * Add a row to the table
     * @param {Array} row - Array of cell values
     */
    push(row) {
        this.rows.push(row);
    }

    /**
     * Calculate column widths based on content
     */
    calculateWidths() {
        const allRows = [this.head, ...this.rows];

        // Strip ANSI codes for width calculation
        const stripAnsi = (str) => str.replace(/\x1b\[[0-9;]*m/g, '');

        for (let colIndex = 0; colIndex < this.head.length; colIndex++) {
            let maxWidth = 0;
            for (const row of allRows) {
                const cellContent = String(row[colIndex] || '');
                const cleanContent = stripAnsi(cellContent);
                maxWidth = Math.max(maxWidth, cleanContent.length);
            }
            this.colWidths[colIndex] = maxWidth;
        }
    }

    /**
     * Pad a string to a specific width (accounting for ANSI codes)
     * @param {string} str - String to pad
     * @param {number} width - Target width
     * @returns {string} Padded string
     */
    pad(str, width) {
        const stripAnsi = (s) => s.replace(/\x1b\[[0-9;]*m/g, '');
        const cleanStr = stripAnsi(str);
        const padding = width - cleanStr.length;
        return str + ' '.repeat(Math.max(0, padding));
    }

    /**
     * Render the table as a string
     * @returns {string} Formatted table
     */
    toString() {
        this.calculateWidths();

        const lines = [];
        const horizontalLine = '─'.repeat(this.colWidths.reduce((a, b) => a + b + 3, 1));

        // Header
        if (this.head.length > 0) {
            lines.push(horizontalLine);
            const headerCells = this.head.map((cell, i) =>
                this.pad(style.bold(String(cell)), this.colWidths[i])
            );
            lines.push(`│ ${headerCells.join(' │ ')} │`);
            lines.push(horizontalLine);
        }

        // Rows
        for (const row of this.rows) {
            const cells = row.map((cell, i) =>
                this.pad(String(cell), this.colWidths[i])
            );
            lines.push(`│ ${cells.join(' │ ')} │`);
        }

        if (this.rows.length > 0) {
            lines.push(horizontalLine);
        }

        return lines.join('\n');
    }
}

/**
 * Interactive multi-select prompt for terminal
 */
export class MultiSelect {
    constructor(message, choices) {
        this.message = message;
        this.choices = choices.map((choice, index) => ({
            name: typeof choice === 'string' ? choice : choice.name,
            value: typeof choice === 'string' ? choice : choice.value,
            selected: typeof choice === 'object' ? choice.selected ?? false : false,
            index
        }));
        this.cursorIndex = 0;
    }

    /**
     * Render the current state of the multi-select
     */
    render() {
        // Clear screen and move cursor to top
        Bun.write(Bun.stdout, '\x1b[2J\x1b[H');

        // Display message
        Bun.write(Bun.stdout, `${style.bold(this.message)}\n`);
        Bun.write(Bun.stdout, style.dim('(Use arrow keys to move, space to select, enter to confirm)\n\n'));

        // Calculate viewport (show max 20 items at a time)
        const viewportHeight = 20;
        const totalItems = this.choices.length;

        // Calculate scroll offset to keep cursor in view
        let scrollOffset = Math.max(0, this.cursorIndex - Math.floor(viewportHeight / 2));
        scrollOffset = Math.min(scrollOffset, Math.max(0, totalItems - viewportHeight));

        const visibleStart = scrollOffset;
        const visibleEnd = Math.min(scrollOffset + viewportHeight, totalItems);

        // Show scroll indicator at top if not at start
        if (scrollOffset > 0) {
            Bun.write(Bun.stdout, style.dim(`  ↑ ${scrollOffset} more above...\n`));
        }

        // Display visible choices
        for (let i = visibleStart; i < visibleEnd; i++) {
            const choice = this.choices[i];
            const cursor = choice.index === this.cursorIndex ? style.cyan('❯') : ' ';
            const checkbox = choice.selected ? style.green('◉') : style.dim('◯');
            const label = choice.index === this.cursorIndex
                ? style.cyan(choice.name)
                : choice.name;

            Bun.write(Bun.stdout, `${cursor} ${checkbox} ${label}\n`);
        }

        // Show scroll indicator at bottom if not at end
        if (visibleEnd < totalItems) {
            Bun.write(Bun.stdout, style.dim(`  ↓ ${totalItems - visibleEnd} more below...\n`));
        }

        // Show selection count
        const selectedCount = this.choices.filter(c => c.selected).length;
        Bun.write(Bun.stdout, `\n${style.bold(`Selected: ${selectedCount}/${totalItems}`)}\n`);
    }

    /**
     * Run the interactive prompt
     * @returns {Promise<Array>} Selected values
     */
    async run() {
        return new Promise((resolve) => {
            // Set stdin to raw mode for keyboard input
            process.stdin.setRawMode(true);
            process.stdin.resume();

            this.render();

            const onData = (data) => {
                const key = data.toString();

                // Handle different key inputs
                if (key === '\x1b[A') { // Up arrow
                    this.cursorIndex = Math.max(0, this.cursorIndex - 1);
                    this.render();
                } else if (key === '\x1b[B') { // Down arrow
                    this.cursorIndex = Math.min(this.choices.length - 1, this.cursorIndex + 1);
                    this.render();
                } else if (key === ' ') { // Spacebar
                    this.choices[this.cursorIndex].selected = !this.choices[this.cursorIndex].selected;
                    this.render();
                } else if (key === '\r' || key === '\n') { // Enter
                    // Clean up
                    process.stdin.setRawMode(false);
                    process.stdin.pause();
                    process.stdin.removeListener('data', onData);

                    // Clear screen and move cursor to top
                    Bun.write(Bun.stdout, '\x1b[2J\x1b[H');

                    // Return selected values
                    const selected = this.choices
                        .filter(choice => choice.selected)
                        .map(choice => choice.value);
                    resolve(selected);
                } else if (key === '\x03') { // Ctrl+C
                    process.stdin.setRawMode(false);
                    process.stdin.pause();
                    process.exit(0);
                }
            };

            process.stdin.on('data', onData);
        });
    }
}

/**
 * Helper function to create and run a multi-select prompt
 * @param {string} message - Prompt message
 * @param {Array} choices - Array of choices (strings or {name, value, selected} objects)
 * @returns {Promise<Array>} Selected values
 */
export async function multiSelect(message, choices) {
    const prompt = new MultiSelect(message, choices);
    return await prompt.run();
}
