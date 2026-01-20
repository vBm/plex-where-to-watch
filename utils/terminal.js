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
