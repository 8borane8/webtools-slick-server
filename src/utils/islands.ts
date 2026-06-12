export const ISLAND_PREFIX = "/~islands/";

export const nameToIslandUrl = (name: string) => `${ISLAND_PREFIX}${name}`;
export const islandUrlToName = (url: string) => url.slice(ISLAND_PREFIX.length);
