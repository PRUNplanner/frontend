import { createApp, createSSRApp } from "vue";
import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import "@fontsource/roboto-mono/400.css";
import "@fontsource/roboto-mono/700.css";
import "@/assets/css/style.css";
import AppProvider from "@/AppProvider.vue";

// stores
import { createPinia } from "pinia";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";
// import { usePiniaBroadcast } from "./lib/piniaBroadcastPlugin";

const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);
// pinia.use(usePiniaBroadcast({}));

// routing
import router from "@/router";

// app + uses
import { trackVueError } from "@/lib/analytics/useAnalytics";

// the prerendered landing page is hydrated, any other page rendered
import { isPrerendered, mountApp, prepareMount } from "@/lib/seo/prerenderMount";
const app = (isPrerendered() ? createSSRApp : createApp)(AppProvider);
app.config.performance = import.meta.env.DEV;
app.config.errorHandler = trackVueError;

app.use(router);

// reload once when a deploy removed a lazy chunk this tab still references
import { registerChunkReload } from "@/lib/chunkReload";
registerChunkReload(router);

// share login state and planning changes with the user's other tabs
import { registerCrossTab } from "@/lib/crossTab";
registerCrossTab(router);

app.use(pinia);

// one watcher syncs preference changes to the backend
import { startPreferenceSync } from "@/features/preferences/usePreferences";
startPreferenceSync();

// locale
import { i18n } from "@/lib/i18n";
const userStore = useUserStore();

try {
	await userStore.initLocale(i18n.global as unknown as Composer);
} catch (error) {
	console.error(
		"Failed to initialize locale, falling back to default",
		error
	);
}

app.use(i18n);

// unhead
import { createHead } from "@unhead/vue/client";

const head = createHead();

app.use(head);

import { useUserStore } from "./stores/userStore";
import type { Composer } from "vue-i18n";

// mount, over the prerendered landing page without a flash. Not awaited:
// lazy chunks import from this module, which has to finish evaluating first
prepareMount(router, i18n.global.locale.value)
	.catch(console.error)
	.then(() => mountApp(app));
