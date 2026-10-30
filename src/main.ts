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

// routing
import router from "@/router";

// app + uses
import { trackVueError, reportError } from "@/lib/analytics/useAnalytics";
import {
	isPrerendered,
	mountApp,
	prepareMount,
} from "@/lib/seo/prerenderMount";
import { registerChunkReload } from "@/lib/chunkReload";
import { registerCrossTab } from "@/lib/crossTab";
import { startPreferenceSync } from "@/features/preferences/usePreferences";
import { i18n } from "@/lib/i18n";
import { createHead } from "@unhead/vue/client";
import { useUserStore } from "@/stores/userStore";

const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);

// the prerendered landing page is hydrated, any other page rendered
const app = (isPrerendered() ? createSSRApp : createApp)(AppProvider);
app.config.performance = import.meta.env.DEV;
app.config.errorHandler = trackVueError;

app.use(router);

// reload once when a deploy removed a lazy chunk this tab still references
registerChunkReload(router);

// share login state and planning changes with the user's other tabs
registerCrossTab(router);

app.use(pinia);

// one watcher syncs preference changes to the backend
startPreferenceSync();

app.use(i18n);

// unhead
const head = createHead();

app.use(head);

// locale, then mount over the prerendered landing page without a flash.
// Not awaited: lazy chunks import from this module, which has to finish
// evaluating first
useUserStore()
	.initLocale(i18n.global)
	.catch(reportError)
	.then(() => prepareMount(router, i18n.global.locale.value))
	.catch(reportError)
	.then(() => mountApp(app));
