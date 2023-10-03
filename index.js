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

    async generateTable(showDetails, providers) {
        const providerIds = providers.map(provider => Object.keys(provider)[0]);

        let table;
        if (this.tableType === "streamable") {
            table = new Table({
                head: ["Show Name", ...providers.map(provider => provider[Object.keys(provider)[0]])]
            });
        } else {
            table = new Table({
                head: ["Show Name", ...providers.map(provider => provider[Object.keys(provider)[0]])]
            });
        }

        // Iterate through each show detail
        showDetails.forEach(show => {
            const row = []; // Create a new row for each show
            row.push(show.title); // Add the show title

            // Iterate through each provider
            providerIds.forEach(providerId => {
                const hasOffer = show.offers.some(
                    offer => parseInt(offer.provider_id) === parseInt(providerId)
                );

                // Add a checkmark or 'X' based on whether the show is available for the provider
                row.push(hasOffer ? clc.green("✓") : clc.red("✗"));
            });

            if (this.tableType === "all" || row.slice(1).some(cell => cell === clc.green("✓"))) {
                // Add the row to the table only if it's "all" table or at least one provider has the show
                table.push(row);
            }
        });

        return table.toString(); // Return the formatted table as a string
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

            const table = await this.generateTable(showDetails, providers);

            console.log(table);
        } catch (error) {
            console.error(error.message);
        }
    }


}

const main = new Main();
main.start();
