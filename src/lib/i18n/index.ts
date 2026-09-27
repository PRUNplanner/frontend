import { createI18n, type I18n } from "vue-i18n";

import type { PSelectOption } from "@/ui/ui.types";

// eager load all en_US as initial version + message object
const enModules = import.meta.glob("@/locales/en_US/*.json", { eager: true });

const en_US = Object.entries(enModules).reduce(
	(acc, [path, module]) => {
		const key = path.split("/").pop()?.replace(".json", "");
		if (key) {
			acc[key] = (module as { default: object }).default;
		}
		return acc;
	},
	{} as Record<string, unknown>
);

export const localeLazyLoaders = import.meta.glob("@/locales/**/*.json");

export const SUPPORTED_LOCALES = [
	"de_DE",
	"en_US",
	"es_ES",
	"fr_FR",
	"it_IT",
	"ja_JP",
	"ko_KR",
	"nl_NL",
	"pt_PT",
	"ru_RU",
	"zh_CN",
] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export type AppLocale = SupportedLocale | "keymode";
export type MessageSchema = typeof en_US;

export const SupportedLanguages: PSelectOption[] = [
	{
		label: "English",
		value: "en_US",
	},
	{
		label: "Deutsch",
		value: "de_DE",
	},
	// {
	// 	label: "Español",
	// 	value: "es_ES",
	// },
	// {
	// 	label: "Français",
	// 	value: "fr_FR",
	// },
	// {
	// 	label: "Italiano",
	// 	value: "it_IT",
	// },
	// {
	// 	label: "日本",
	// 	value: "ja_JP",
	// },
	// {
	// 	label: "한국어",
	// 	value: "ko_KR",
	// },
	// {
	// 	label: "Nederlands",
	// 	value: "nl_NL",
	// },
	// {
	// 	label: "Português",
	// 	value: "pt_PT",
	// },
	{
		label: "Русский",
		value: "ru_RU",
	},
	{
		label: "简体中文",
		value: "zh_CN",
	},
];

export const i18n: I18n<
	MessageSchema,
	Record<string, unknown>,
	Record<string, unknown>,
	AppLocale,
	false
> = createI18n({
	legacy: false,
	locale: "en_US" as AppLocale,
	fallbackLocale: {
		keymode: [],
		de_DE: ["en_US"],
		es_ES: ["en_US"],
		fr_FR: ["en_US"],
		it_IT: ["en_US"],
		ja_JP: ["en_US"],
		ko_KR: ["en_US"],
		nl_NL: ["en_US"],
		pt_PT: ["en_US"],
		ru_RU: ["en_US"],
		zh_CN: ["en_US"],
	},
	messages: {
		en_US,
		keymode: {},
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	} as any,
	globalInjection: true,
	missing: (locale, key) => {
		if (locale === "keymode") return key;
	},
});
