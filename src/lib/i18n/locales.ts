/**
 * The locales the app ships, apart from the i18n setup so schemas can use
 * them without loading vue-i18n (the MCP server reads user preferences)
 * @author jplacht
 */
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
