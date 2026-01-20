import PlexPlugin from './plugins/plex.js';
import JustWatchPlugin from './plugins/justwatch.js';
import TVMazePlugin from './plugins/tvmaze.js';
import { ProgressBar, Table, style } from './utils/terminal.js';

/**
 * Main application class for Plex Where to Watch
 */
class Main {
    constructor() {
        this.plex = new PlexPlugin();
        this.justwatch = new JustWatchPlugin();
        this.tvMaze = new TVMazePlugin();
    }

    /**
     * Create and return a progress bar instance
     * @param {number} total - Total number of items
     * @returns {ProgressBar} Progress bar instance
     */
    createProgressBar(total) {
        return new ProgressBar(total, {
            width: 40,
            complete: '█',
            incomplete: '░',
            showValue: true
        });
    }

    /**
     * Generate a table showing which shows are available on a specific provider
     * @param {number} providerId - Provider ID to filter by
     * @param {Array<Object>} showDetails - Array of show data with offers
     * @param {Array<Object>} providers - Array of all providers
     * @returns {string} Formatted table string
     */
    generateTableForProvider(providerId, showDetails, providers) {
        const filteredShows = showDetails.filter(show =>
            show.offers.some(offer => parseInt(offer.provider_id) === parseInt(providerId))
        );

        const providerName = providers.find(
            provider => parseInt(Object.keys(provider)[0]) === parseInt(providerId)
        )?.[providerId] ?? 'Unknown Provider';

        const table = new Table({
            head: ['Show Name', providerName]
        });

        for (const show of filteredShows) {
            const hasOffer = show.offers.some(
                offer => parseInt(offer.provider_id) === parseInt(providerId)
            );
            table.push([
                show.title,
                hasOffer ? style.green('✓') : style.red('✗')
            ]);
        }

        return table.toString();
    }

    /**
     * Main application logic
     */
    async start() {
        try {
            console.log(style.bold('\n🎬 Plex Where to Watch\n'));

            // Fetch TV shows and providers
            console.log('Fetching TV shows from Plex...');
            const tvShows = await this.plex.getTVShows();
            console.log(style.green(`✓ Found ${tvShows.length} TV shows\n`));

            console.log('Fetching streaming providers...');
            const providers = await this.justwatch.getAvailableProviders();
            console.log(style.green(`✓ Monitoring ${providers.length} providers\n`));

            // Process shows with progress bar
            const progressBar = this.createProgressBar(tvShows.length);
            const showDetails = [];

            console.log('Processing shows...');
            for (let i = 0; i < tvShows.length; i++) {
                const show = tvShows[i];

                // Search for show on JustWatch and TVMaze
                const [searchResult, tvMazeData] = await Promise.all([
                    this.justwatch.searchShow(show.title, providers),
                    this.tvMaze.searchShow(show.title)
                ]);

                progressBar.update(i + 1);

                if (searchResult?.length > 0) {
                    const showData = searchResult[0];
                    showDetails.push(showData);

                    // Extract provider IDs from offers
                    const providerIds = showData.offers.map(offer => parseInt(offer.provider_id));
                    const showProviders = providers.filter(provider =>
                        providerIds.includes(parseInt(Object.keys(provider)[0]))
                    );

                    // Add "Ended" label if show has ended
                    const labels = tvMazeData?.status === 'Ended'
                        ? [...showProviders, { '999999999': 'Ended' }]
                        : showProviders;

                    await this.plex.setLabel(show.id, labels);
                }
            }

            progressBar.stop();
            console.log(style.green(`\n✓ Processed ${showDetails.length} shows\n`));

            // Display tables for each provider
            for (const provider of providers) {
                const providerId = parseInt(Object.keys(provider)[0]);
                const providerName = provider[providerId];
                const table = this.generateTableForProvider(providerId, showDetails, providers);

                console.log(`\nTable for ${style.boldUnderline(providerName)}:`);
                console.log(table);
            }

            console.log(style.green('\n✓ Done!\n'));
        } catch (error) {
            console.error(style.red(`\n✗ Error: ${error.message}\n`));
            console.error(error.stack);
            process.exit(1);
        }
    }
}

const main = new Main();
main.start();

