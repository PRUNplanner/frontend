import { createI18n } from "vue-i18n";
import en_US from "./locales/en-US.json";

const i18n = createI18n({
	legacy: false,
	locale: "en-US",
	fallbackLocale: "en-US",
	messages: {
		"en-US": en_US,
	},
});

export default i18n;
