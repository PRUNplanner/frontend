import "vue-router";

declare module "vue-router" {
	interface RouteMeta {
		requiresAuth?: boolean;
		/** in search engines: canonical URL, in the sitemap; all others noindex */
		indexable?: boolean;
	}
}
