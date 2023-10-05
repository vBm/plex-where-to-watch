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
            return shows.map(show => ({
                title: show.title,
                id: show.ratingKey
            }));
        } catch (error) {
            throw new Error(`Error fetching TV shows from Plex: ${error.message}`);
        }
    }

    async setLabel(show, providers) {
        if (providers.length === 0) {
            return;
        }

        const label = providers.map(provider => {
            const providerId = Object.keys(provider)[0];
            const providerName = provider[providerId];
            return `label[].tag.tag=${providerName}`;
        }).join('&');

        try {
            const response = await fetch(`${config.plex.base_url}library/metadata/${show}?X-Plex-Token=${config.plex.token}&${label}`, {
                method: 'PUT',
                headers: {
                    'Accept': 'application/json'
                }
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
