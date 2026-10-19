/// <reference types="vite/client" />
/// <reference types="vite/types/importMeta.d.ts" />

declare const __APP_VERSION__: string;

interface ImportMetaEnv {
	readonly VITE_API_BASE_URL: string;
	readonly VITE_GAME_DATA_STALE_MINUTES_BUILDINGS: number;
	readonly VITE_GAME_DATA_STALE_MINUTES_RECIPES: number;
	readonly VITE_GAME_DATA_STALE_MINUTES_MATERIALS: number;
	readonly VITE_GAME_DATA_STALE_MINUTES_EXCHANGES: number;
	readonly VITE_GAME_DATA_STALE_MINUTES_PLANETS: number;
	readonly VITE_GAME_DATA_MAX_AGE_MINUTES_BUILDINGS: number;
	readonly VITE_GAME_DATA_MAX_AGE_MINUTES_RECIPES: number;
	readonly VITE_GAME_DATA_MAX_AGE_MINUTES_MATERIALS: number;
	readonly VITE_GAME_DATA_MAX_AGE_MINUTES_EXCHANGES: number;
	readonly VITE_GAME_DATA_WRITE_DELAY_MS: number;
	readonly VITE_INDEXEDDB_DBNAME: string | undefined;
	/** "true" adds the /dev/kit page to a build (the e2e stack) */
	readonly VITE_KIT_PAGE: string | undefined;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
