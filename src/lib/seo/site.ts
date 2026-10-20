// the production origin: canonical links and the sitemap name it on every host
export const SITE_URL = "https://prunplanner.org";

/** "en_US" as a BCP 47 tag for <html lang>; key mode is English */
export function htmlLang(locale: string): string {
	return locale === "keymode" ? "en" : locale.replace("_", "-");
}

/**
 * sitemap.xml of the indexable pages
 *
 * @param {string[]} paths Paths of the routes with meta.indexable
 * @param {Date} date Build date, the lastmod of every page
 */
export function buildSitemap(paths: string[], date: Date): string {
	const lastmod = date.toISOString().slice(0, 10);
	const urls = paths
		.map(
			(path) =>
				`  <url><loc>${SITE_URL}${path}</loc><lastmod>${lastmod}</lastmod></url>`
		)
		.join("\n");
	return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}
