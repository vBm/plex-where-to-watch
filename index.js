import PlexPlugin from './plugins/plex.js';
import JustWatchPlugin from './plugins/justwatch.js';
import config from './config.json' assert { type: 'json' };
import cliProgress from 'cli-progress';
import Table from 'cli-table3';
import clc from 'cli-color';

class Main {
    constructor() {
        this.plex = new PlexPlugin();
        this.justwatch = new JustWatchPlugin();
        this.tableType = config.table || "all";
    }

    async showProgressBar(total) {
        const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
        progressBar.start(total, 0);

        return {
            increment: () => progressBar.increment(),
            update: (current) => progressBar.update(current),
            stop: () => progressBar.stop(),
        };
    }

    async generateTableForProvider(providerId, showDetails, providers) {
        const filteredShows = showDetails.filter(show => {
            return show.offers.some(offer => parseInt(offer.provider_id) === parseInt(providerId));
        });

        let table = new Table({
            head: ["Show Name", providers.find(provider => parseInt(Object.keys(provider)[0]) === parseInt(providerId))[providerId]]
        });

        filteredShows.forEach(show => {
            const row = [];
            row.push(show.title);

            const hasOffer = show.offers.some(offer => parseInt(offer.provider_id) === parseInt(providerId));
            row.push(hasOffer ? clc.green("✓") : clc.red("✗"));

            table.push(row);
        });

        return table.toString();
    }

    async start() {
        try {
            const tvShows = await this.plex.getTVShows();
            const providers = await this.justwatch.getAvailableProviders();

            const progressBar = await this.showProgressBar(tvShows.length);

            const showDetails = [];

            for (let i = 0; i < tvShows.length; i++) {
                const searchResult = await this.justwatch.searchShow(tvShows[i], providers);
                progressBar.update(i + 1);
                if (searchResult && searchResult.length > 0) {
                    showDetails.push(searchResult[0]);
                }
            }

            progressBar.stop();

            for (const provider of providers) {
                const providerId = parseInt(Object.keys(provider)[0]);
                const table = await this.generateTableForProvider(providerId, showDetails, providers);

                console.log(`Table for Provider ${providerId}:`);
                console.log(table);
            }
        } catch (error) {
            console.error(error.message);
        }
    }


}

const main = new Main();
main.start();
