import { createApp } from "vue";
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

const app = createApp(AppProvider);
app.config.performance = true;
app.config.errorHandler = trackVueError;

app.use(router);

// reload once when a deploy removed a lazy chunk this tab still references
import { registerChunkReload } from "@/lib/chunkReload";
registerChunkReload(router);

app.use(pinia);

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

// axios
import axiosSetup from "@/util/axiosSetup";
axiosSetup();

// unhead
import { createHead } from "@unhead/vue/client";

const head = createHead();

app.use(head);

// directives
import clickOutsideDirective from "@/layout/directives/clickOutsideDirective";
import { useUserStore } from "./stores/userStore";
import type { Composer } from "vue-i18n";

app.directive("click-outside", clickOutsideDirective);

// mount
app.mount("#app");
