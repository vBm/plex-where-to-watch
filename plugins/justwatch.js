import config from '../config.json' with { type: 'json' };

/**
 * JustWatch API plugin for finding streaming availability
 */

export default class JustWatchPlugin {
    constructor() {
        this.country = config.justwatch.country;
        this.providers = config.justwatch.providers;
    }

    /**
     * Make a GraphQL request to JustWatch API
     * @param {Object} query - GraphQL query object with operationName and query string
     * @param {Object} variables - Variables for the GraphQL query
     * @returns {Promise<Object>} API response data
     */
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
                    variables,
                    query: query.query,
                }),
            });

            if (!response.ok) {
                const errorResponse = await response.json().catch(() => ({}));
                console.error(`API request failed: ${response.status} - ${response.statusText}`, errorResponse);
                throw new Error(`API request failed: ${response.status} - ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`Error making API request: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get available streaming providers from JustWatch
     * @returns {Promise<Array<Object>>} Array of provider objects with ID and name
     */
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
            const data = dataRaw.data?.packages ?? [];

            const allProviders = data.reduce((acc, provider) => {
                if (this.providers.includes(provider.clearName)) {
                    acc.push({ [provider.packageId]: provider.clearName });
                }
                return acc;
            }, []);

            // Debug: Check for missing providers
            const foundProviderNames = allProviders.map(p => Object.values(p)[0]);
            const missingProviders = this.providers.filter(name => !foundProviderNames.includes(name));

            if (missingProviders.length > 0) {
                console.warn(`⚠️  Provider name mismatch - not found in JustWatch API: ${missingProviders.join(', ')}`);
                console.warn(`   Available providers in ${this.country}: ${data.map(p => p.clearName).slice(0, 10).join(', ')}...`);
            }

            return allProviders;
        } catch (error) {
            throw new Error(`Error fetching JustWatch providers: ${error.message}`);
        }
    }

    /**
     * Search for a TV show on JustWatch and get streaming availability
     * @param {string} showTitle - Title of the show to search for
     * @param {Array<Object>} providers - Array of provider objects to filter by
     * @returns {Promise<Array<Object>>} Array with show data and offers, or empty array if not found
     */
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

            const dataRaw = await this.makeApiRequest(query, {
                country: this.country,
                language: "en",
                first: 4,
                filter: { searchQuery: showTitle }
            });

            const show = dataRaw.data?.popularTitles?.edges?.[0]?.node;

            if (!show?.offers?.length) {
                return [];
            }

            const providerIds = providers.map(provider => Object.keys(provider)[0]);
            const filteredProviders = new Set();

            const mappedOffers = show.offers
                .filter(offer => {
                    const providerId = offer.package?.packageId?.toString();
                    if (providerId && providerIds.includes(providerId)) {
                        filteredProviders.add(providerId);
                        return true;
                    }
                    return false;
                })
                .map(offer => ({
                    monetization_type: offer.monetizationType,
                    provider_id: offer.package.packageId,
                    package_short_name: offer.package.shortName,
                    package_clear_name: offer.package.clearName
                }));

            if (mappedOffers.length === 0) {
                return [];
            }

            return [{
                title: show.content?.title,
                id: show.objectId,
                offers: mappedOffers
            }];

        } catch (error) {
            console.error(`Error searching show on JustWatch: ${error.message}`);
            return [];
        }
    }
}
