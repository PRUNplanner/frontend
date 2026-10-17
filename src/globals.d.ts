/// <reference types="vite/client" />

declare const __INDEXEDDB_VERSION__: number;
declare const __APP_VERSION__: string;
declare const __BUILD_ID__: string;

interface Window {
	__APP_CONFIG__?: {
		POSTHOG_KEY?: string;
	};
}
