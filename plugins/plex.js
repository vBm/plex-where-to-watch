import config from './../config.json' with { type: 'json' };

/**
 * Plex Media Server plugin for fetching TV shows and managing labels
 */
export default class PlexPlugin {
    constructor() {
        this.baseURL = config.plex.base_url;
        this.token = config.plex.token;
        this.library = config.plex.library;
    }

    /**
     * Fetch all TV shows from the configured Plex library
     * @returns {Promise<Array<{title: string, id: string}>>} Array of TV shows
     */
    async getTVShows() {
        try {
            const url = new URL(`library/sections/${this.library}/all`, this.baseURL);
            url.searchParams.set('X-Plex-Token', this.token);

            const response = await fetch(url, {
                headers: { 'Accept': 'application/json' }
            });

            if (!response.ok) {
                throw new Error(`Error fetching TV shows from Plex: ${response.statusText}`);
            }

            const data = await response.json();
            const shows = data.MediaContainer?.Metadata ?? [];

            return shows.map(show => ({
                title: show.title,
                id: show.ratingKey
            }));
        } catch (error) {
            throw new Error(`Error fetching TV shows from Plex: ${error.message}`);
        }
    }

    /**
     * Set streaming provider labels on a Plex TV show
     * @param {string} show - The Plex rating key for the show
     * @param {Array<Object>} providers - Array of provider objects
     * @returns {Promise<Object|void>} Response from Plex API
     */
    async setLabel(show, providers) {
        if (providers.length === 0) {
            return;
        }

        const url = new URL(`library/metadata/${show}`, this.baseURL);
        url.searchParams.set('X-Plex-Token', this.token);

        // Add provider labels to URL params
        for (const provider of providers) {
            const [providerId, providerName] = Object.entries(provider)[0];
            url.searchParams.append('label[].tag.tag', providerName);
        }

        try {
            const response = await fetch(url, {
                method: 'PUT',
                headers: { 'Accept': 'application/json' }
            });

            if (!response.ok) {
                throw new Error(`Error updating labels for show ${show}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            throw new Error(`Error updating labels for show ${show}: ${error.message}`);
        }
    }
}
