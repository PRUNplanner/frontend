class Config {
	public readonly API_BASE_URL: string;
	public readonly SHARE_BASE_URL: string;

	public readonly GAME_DATA_STALE_MINUTES_BUILDINGS: number;
	public readonly GAME_DATA_STALE_MINUTES_RECIPES: number;
	public readonly GAME_DATA_STALE_MINUTES_MATERIALS: number;
	public readonly GAME_DATA_STALE_MINUTES_EXCHANGES: number;
	public readonly GAME_DATA_STALE_MINUTES_PLANETS: number;

	// the oldest IndexedDB copy a tab renders from, refreshed in the
	// background once stale; older ones are fetched first
	public readonly GAME_DATA_MAX_AGE_MINUTES_BUILDINGS: number;
	public readonly GAME_DATA_MAX_AGE_MINUTES_RECIPES: number;
	public readonly GAME_DATA_MAX_AGE_MINUTES_MATERIALS: number;
	public readonly GAME_DATA_MAX_AGE_MINUTES_EXCHANGES: number;
	// a fetch writes IndexedDB this long after it, once idle, so the write
	// never competes with the page loading
	public readonly GAME_DATA_WRITE_DELAY_MS: number;

	public readonly INDEXEDDB_DBNAME: string;

	constructor() {
		this.API_BASE_URL =
			import.meta.env.VITE_API_BASE_URL || "https://api.prunplanner.org";
		this.SHARE_BASE_URL =
			import.meta.env.VITE_SHARE_BASE_URL ||
			"https://prunplanner.org/shared";

		this.GAME_DATA_STALE_MINUTES_BUILDINGS =
			import.meta.env.VITE_GAME_DATA_STALE_MINUTES_BUILDINGS || 24 * 60;
		this.GAME_DATA_STALE_MINUTES_RECIPES =
			import.meta.env.VITE_GAME_DATA_STALE_MINUTES_RECIPES || 24 * 60;
		this.GAME_DATA_STALE_MINUTES_MATERIALS =
			import.meta.env.VITE_GAME_DATA_STALE_MINUTES_MATERIALS || 24 * 60;
		this.GAME_DATA_STALE_MINUTES_EXCHANGES =
			import.meta.env.VITE_GAME_DATA_STALE_MINUTES_EXCHANGES || 30;
		this.GAME_DATA_STALE_MINUTES_PLANETS =
			import.meta.env.VITE_GAME_DATA_STALE_MINUTES_PLANETS || 3 * 60;

		this.GAME_DATA_MAX_AGE_MINUTES_BUILDINGS =
			import.meta.env.VITE_GAME_DATA_MAX_AGE_MINUTES_BUILDINGS || 7 * 24 * 60;
		this.GAME_DATA_MAX_AGE_MINUTES_RECIPES =
			import.meta.env.VITE_GAME_DATA_MAX_AGE_MINUTES_RECIPES || 7 * 24 * 60;
		this.GAME_DATA_MAX_AGE_MINUTES_MATERIALS =
			import.meta.env.VITE_GAME_DATA_MAX_AGE_MINUTES_MATERIALS || 7 * 24 * 60;
		// prices older than their stale time are never shown
		this.GAME_DATA_MAX_AGE_MINUTES_EXCHANGES =
			import.meta.env.VITE_GAME_DATA_MAX_AGE_MINUTES_EXCHANGES || 30;
		this.GAME_DATA_WRITE_DELAY_MS = Number(
			import.meta.env.VITE_GAME_DATA_WRITE_DELAY_MS || 5000
		);
		this.INDEXEDDB_DBNAME =
			import.meta.env.VITE_INDEXEDDB_DBNAME || "prunplanner";
	}
}

const config = new Config();
export default config;
