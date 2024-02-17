export default class TVMazePlugin {
    constructor() {
        this.baseUrl = 'https://api.tvmaze.com/';
    }

    extractMainName(showTitle) {
        // Regular expression to match the main name of the show and handle cases with a colon
        const mainNameRegex = /^(.*?)(?::\s*(.*))?(\(\d{4}\))?(?:\s*\(.*?\))?$/;
        const match = showTitle.match(mainNameRegex);

        if (match) {
            const extractedName = match[1] || match[2];
            return extractedName.trim();
        } else {
            return showTitle;
        }
    }

    async searchShow(showTitle) {
        try {
            const mainName = this.extractMainName(showTitle);
            const response = await fetch(`${this.baseUrl}singlesearch/shows?q=${mainName}`);

            if (!response.ok) {
                return null;
            }

            const data = await response.json();

            return data;
        } catch (error) {
            return null;
        }
    }
}
