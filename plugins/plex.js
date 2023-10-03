import config from './../config.json' assert { type: 'json' };

export default class PlexPlugin {
    constructor() {
        this.baseURL = config.plex.base_url;
        this.token = config.plex.token;
        this.library = config.plex.library;
    }

    async getTVShows() {
        try {
            const response = await fetch(`${this.baseURL}library/sections/${this.library}/all?X-Plex-Token=${this.token}`, {
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Error fetching TV shows from Plex: ${response.statusText}`);
            }

            const data = await response.json();
            const shows = data.MediaContainer.Metadata;
            return shows.map(show => show.title);
        } catch (error) {
            throw new Error(`Error fetching TV shows from Plex: ${error.message}`);
        }
    }
}
