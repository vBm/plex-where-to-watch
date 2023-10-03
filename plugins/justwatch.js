import config from '../config.json' assert { type: 'json' };

export default class JustWatchPlugin {
    constructor() {
        this.locale = config.justwatch.locale;
        this.providers = config.justwatch.providers;
    }

    async getAvailableProviders() {
        try {
            const response = await fetch(`https://apis.justwatch.com/content/providers/locale/${this.locale}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(`Error fetching JustWatch providers: ${data.message}`);
            }
            const allProviders = data.reduce((foo, provider) => {
                if (this.providers.includes(provider.clear_name)) {
                    const available = {
                        [provider.id]: provider.clear_name
                    };
                    foo.push(available);
                }
                return foo;
            }, []);
            return allProviders;
        } catch (error) {
            throw new Error(`Error fetching JustWatch providers: ${error.message}`);
        }
    }

    async searchShow(showTitle, providers) {
        try {
            const response = await fetch(`https://apis.justwatch.com/content/titles/${this.locale}/popular?body={"query":"${showTitle}"}`, {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Error searching show on JustWatch: ${response.statusText}`);
            }

            const dataRaw = await response.json();
            const show = dataRaw.items[0];

            if (!show || !show.offers) {
                return []; // No valid offers found, return an empty array
            }

            const filteredOffers = show.offers.filter(offer => (offer.monetization_type === "free" || offer.monetization_type === "flatrate"));

            if (filteredOffers.length === 0) {
                return []; // No valid offers found, return an empty array
            }

            const providerIds = providers.map(provider => Object.keys(provider)[0]); // Extract provider IDs

            const filteredProviders = {};
            filteredOffers.forEach(offer => {
                const providerId = offer.provider_id.toString();

                if (providerIds.includes(providerId)) {
                    if (!filteredProviders[providerId]) {
                        filteredProviders[providerId] = [];
                    }

                    filteredProviders[providerId].push(offer);
                }
            });

            const mappedOffers = filteredOffers.map(offer => ({
                monetization_type: offer.monetization_type,
                provider_id: offer.provider_id,
                package_short_name: offer.package_short_name,
                presentation_type: offer.presentation_type
            }));

            const data = {
                title: show.title,
                id: show.id,
                offers: mappedOffers
            };

            const finalData = {
                ...data,
                offers: data.offers.filter(offer => filteredProviders[offer.provider_id]),
            };

            return [finalData]; // Return data as an array
        } catch (error) {
            //throw new Error(`Error searching show on JustWatch: ${error.message}`);
        }
    }

}
