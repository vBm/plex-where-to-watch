/**
 * TVMaze API plugin for fetching TV show metadata
 */
export default class TVMazePlugin {
    constructor() {
        this.baseUrl = 'https://api.tvmaze.com/';
    }

    /**
     * Extract the main name from a show title, removing year and extra info
     * @param {string} showTitle - Full show title
     * @returns {string} Extracted main name
     */
    extractMainName(showTitle) {
        // Regular expression to match the main name of the show and handle cases with a colon
        const mainNameRegex = /^(.*?)(?::\s*(.*))?(\(\d{4}\))?(?:\s*\(.*?\))?$/;
        const match = showTitle.match(mainNameRegex);

        if (match) {
            const extractedName = match[1] || match[2];
            return extractedName.trim();
        }

        return showTitle;
    }

    /**
     * Search for a TV show on TVMaze
     * @param {string} showTitle - Title of the show to search for
     * @returns {Promise<Object|null>} Show data or null if not found
     */
    async searchShow(showTitle) {
        try {
            const mainName = this.extractMainName(showTitle);
            const url = new URL('singlesearch/shows', this.baseUrl);
            url.searchParams.set('q', mainName);

            const response = await fetch(url);

            if (!response.ok) {
                return null;
            }

            return await response.json();
        } catch (error) {
            return null;
        }
    }
}
