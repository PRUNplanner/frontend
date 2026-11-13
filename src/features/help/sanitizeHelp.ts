import DOMPurify, { type Config } from "dompurify";

/** what help HTML may hold; the build (vite.help.ts) uses the same */
export const HELP_PURIFY_CONFIG: Config = {
	USE_PROFILES: { html: true },
	FORBID_TAGS: ["style"],
};

/**
 * Help pages are Crowdin translations merged from bot PRs. They are
 * sanitised at build time, and again here before they reach the DOM, so a
 * hostile translation can't run script, event handlers or `javascript:`
 * links.
 *
 * @param {string} html Help HTML from the `?help` import
 * @returns {string} Sanitised HTML
 */
export function sanitizeHelpHtml(html: string): string {
	return DOMPurify.sanitize(html, HELP_PURIFY_CONFIG) as string;
}
