/**
 * Loads a help article in the active locale, English where the locale has
 * no file or lags behind the English section ids. Every file is its own
 * chunk (the `?help` import, vite.help.ts), so no help text is in the main
 * bundle.
 *
 * @author jplacht
 */
import type { IHelpArticle, IHelpDoc } from "./help.types";

const DOCS = import.meta.glob("@/assets/help/**/*.md", {
	query: "?help",
	import: "default",
}) as Record<string, () => Promise<IHelpDoc | null>>;

export const FALLBACK_LOCALE = "en_US";

const pathOf = (file: string, locale?: string) =>
	locale
		? `/src/assets/help/${locale}/${file}.md`
		: `/src/assets/help/${file}.md`;

/** the loader for an article in a locale, or undefined without a file */
function loaderOf(
	article: IHelpArticle,
	locale: string
): (() => Promise<IHelpDoc | null>) | undefined {
	if (!article.file) return undefined;
	// the changelog is English only, next to the locale folders
	return DOCS[pathOf(article.file, locale)] ?? DOCS[pathOf(article.file)];
}

/**
 * @returns {Promise} The parsed article and whether it fell back to English;
 * null for an article without a file (Welcome)
 */
export async function loadArticle(
	article: IHelpArticle,
	locale: string
): Promise<{ doc: IHelpDoc; isFallback: boolean } | null> {
	if (!article.file) return null;
	const own = await loaderOf(article, locale)?.();
	if (own) return { doc: own, isFallback: false };
	const english = await loaderOf(article, FALLBACK_LOCALE)?.();
	if (!english) throw new Error(`Help article "${article.id}" has no file`);
	return { doc: english, isFallback: locale !== FALLBACK_LOCALE };
}
