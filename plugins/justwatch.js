import config from '../config.json' assert { type: 'json' };

export default class JustWatchPlugin {
    constructor() {
        this.country = config.justwatch.country;
        this.providers = config.justwatch.providers;
    }

    async makeApiRequest(query, variables) {
        try {
            const response = await fetch("https://apis.justwatch.com/graphql", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Referer": "https://www.justwatch.com/",
                    "Referrer-Policy": "strict-origin-when-cross-origin"
                },
                body: JSON.stringify({
                    operationName: query.operationName,
                    variables: variables,
                    query: query.query,
                }),
            });

            if (!response.ok) {
                const errorResponse = await response.json();
                console.error(`API request failed: ${response.status} - ${response.statusText}`, errorResponse);
                throw new Error(`API request failed: ${response.status} - ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`Error making API request: ${error.message}`);
            throw error;
        }
    }

    async getAvailableProviders() {
        try {
            const query = {
                operationName: "GetPackages",
                variables: { platform: "WEB", country: this.country },
                query: `
                    query GetPackages($platform: Platform! = WEB, $country: Country!) {
                        packages(country: $country, platform: $platform, includeAddons: false) {
                            ...Package
                            bundles(platform: $platform, country: $country) {
                                id
                                bundleId
                                technicalName
                                selected
                                packages(country: $country, platform: $platform) {
                                    clearName
                                    __typename
                                }
                                __typename
                            }
                            addons(country: $country, platform: $platform) {
                                ...Package
                                __typename
                            }
                            __typename
                        }
                    }

                    fragment Package on Package {
                        clearName
                        id
                        shortName
                        technicalName
                        packageId
                        selected
                        monetizationTypes
                        addonParent(country: $country, platform: $platform) {
                            id
                            __typename
                        }
                        __typename
                    }
                `,
            };

            const dataRaw = await this.makeApiRequest(query, { platform: "WEB", country: this.country });
            const data = dataRaw.data.packages;

            const allProviders = data.reduce((foo, provider) => {
                if (this.providers.includes(provider.clearName)) {
                    foo.push({ [provider.packageId]: provider.clearName });
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
            const query = {
                operationName: "GetSuggestedTitles",
                variables: { country: this.country, language: "en", first: 4, filter: { searchQuery: showTitle } },
                query: `
                    query GetSuggestedTitles($country: Country!, $language: Language!, $first: Int!, $filter: TitleFilter) {
                        popularTitles(country: $country, first: $first, filter: $filter) {
                            edges {
                                node {
                                    ...SuggestedTitle
                                    __typename
                                }
                                __typename
                            }
                            __typename
                        }
                    }

                    fragment SuggestedTitle on MovieOrShow {
                        id
                        objectType
                        objectId
                        content(country: $country, language: $language) {
                            fullPath
                            title
                            originalReleaseYear
                            posterUrl
                            fullPath
                            __typename
                        }
                        offers(country: $country, platform: WEB) {
                            monetizationType
                            package {
                                packageId
                                shortName
                                clearName
                                technicalName
                            }
                        }
                        __typename
                    }
                `,
            };

            const dataRaw = await this.makeApiRequest(query, { country: this.country, language: "en", first: 4, filter: { searchQuery: showTitle } });
            const show = dataRaw.data.popularTitles?.edges[0]?.node;

            if (!show || !show.offers || !show.offers[0]) {
                return []; // No valid offers found, return an empty array
            }

            const filteredOffers = show.offers || [];

            if (filteredOffers.length === 0) {
                return []; // No valid offers found, return an empty array
            }

            const providerIds = providers.map(provider => Object.keys(provider)[0]); // Extract provider IDs

            const filteredProviders = {};
            filteredOffers.forEach(offer => {
                const providerId = offer.package.packageId.toString();  // Adjust the field name if needed

                if (providerIds.includes(providerId)) {
                    if (!filteredProviders[providerId]) {
                        filteredProviders[providerId] = [];
                    }

                    filteredProviders[providerId].push(offer);
                }
            });

            const mappedOffers = filteredOffers.map(offer => ({
                monetization_type: offer.monetizationType,
                provider_id: offer.package.packageId,  // Adjust the field name if needed
                package_short_name: offer.package.shortName,  // Adjust the field name if needed
                package_clear_name: offer.package.clearName
            }));

            const finalData = {
                title: show.content.title,
                id: show.objectId,
                offers: mappedOffers.filter(offer => filteredProviders[offer.provider_id])
            };

            return [finalData]; // Return data as an array

        } catch (error) {
            console.error(`Error searching show on JustWatch: ${error.message}`);
            // Handle the error appropriately
        }
    }
}
