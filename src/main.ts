import { createApp } from "vue";
import "@/assets/css/style.css";
import AppProvider from "@/AppProvider.vue";

// i18n
import i18n from "./i18n";

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
const app = createApp(AppProvider);
app.config.performance = true;

app.use(i18n);
app.use(router);
app.use(pinia);

// axios
import axiosSetup from "@/util/axiosSetup";
axiosSetup();

// highcharts
import HighChartsVue from "highcharts-vue";

import * as Highcharts from "highcharts";
import "highcharts/modules/stock";

import { highchartsOptions } from "@/layout/highcartsOptions";

Highcharts.setOptions(highchartsOptions);

app.use(HighChartsVue);

// unhead
import { createHead } from "@unhead/vue/client";

const head = createHead();

app.use(head);

// vue-showdown, markdown support
import { VueShowdownPlugin } from "vue-showdown";

app.use(VueShowdownPlugin, { flavor: "github", tables: true, emoji: true });

// directives
import clickOutsideDirective from "@/layout/directives/clickOutsideDirective";

app.directive("click-outside", clickOutsideDirective);

// mount
app.mount("#app");
