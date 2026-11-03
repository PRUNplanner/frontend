import DOMPurify from "dompurify";
import type { showdown } from "vue-showdown";

/**
 * Help pages are Crowdin translations merged from bot PRs: their HTML only
 * reaches the DOM through DOMPurify, so a hostile translation can't run
 * script, event handlers or `javascript:` links.
 *
 * @param {string} html Showdown output
 * @returns {string} Sanitised HTML
 */
export function sanitizeHelpHtml(html: string): string {
	return DOMPurify.sanitize(html, {
		USE_PROFILES: { html: true },
		FORBID_TAGS: ["style"],
	});
}

/** Showdown output extension, the last step before the HTML is set */
export const sanitizeExtension: showdown.ShowdownExtension = {
	type: "output",
	filter: sanitizeHelpHtml,
};
