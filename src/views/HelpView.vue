<script setup lang="ts">
	/**
	 * /help: the help centre's home. Search, most read, every area, the
	 * latest release and where to ask. Public, no login needed.
	 *
	 * @author jplacht
	 */
	import { computed, ref, type Ref } from "vue";
	import { useI18n } from "vue-i18n";
	import { useHead } from "@unhead/vue";
	const { t, locale } = useI18n({ useScope: "global" });

	// Components
	import HelpLayout from "@/features/help/components/HelpLayout.vue";

	// Util
	import {
		articlesByArea,
		getArticle,
		POPULAR_ARTICLES,
		WHATS_NEW,
	} from "@/features/help/helpArticles";
	import { loadArticle } from "@/features/help/helpContent";
	import { markHelpSource } from "@/features/help/helpSource";
	import { sanitizeHelpHtml } from "@/features/help/sanitizeHelp";
	import {
		HELP_DISCORD_URL,
		HELP_GITHUB_URL,
	} from "@/features/help/help.constants";

	// Types & Interfaces
	import type { IHelpDoc } from "@/features/help/help.types";

	useHead({
		title: t("help.view_title"),
		meta: [{ name: "description", content: t("help.home.description") }],
	});

	const areas = articlesByArea().filter((a) => a.area !== "reference");

	const layout: Ref<InstanceType<typeof HelpLayout> | null> = ref(null);

	// the latest release: the changelog up to its second release heading
	const changelog: Ref<IHelpDoc | null> = ref(null);
	const latest = computed(() => {
		const doc = changelog.value;
		if (!doc) return null;
		const html = doc.html.split(/(?=<h2[ >])/)[0] ?? "";
		return {
			title: doc.toc[0]?.title ?? "",
			id: doc.toc[0]?.id ?? "",
			html: sanitizeHelpHtml(html),
		};
	});

	changelog.value =
		(await loadArticle(getArticle(WHATS_NEW)!, locale.value))?.doc ?? null;
</script>

<template>
	<HelpLayout ref="layout" wide>
		<div class="flex flex-col gap-10">
			<section class="flex flex-col gap-4">
				<h1 class="text-3xl leading-tight font-bold text-ink-strong">
					{{ t("help.home.title") }}
				</h1>
				<p class="text-base text-muted-strong max-w-2xl">
					{{ t("help.home.lead") }}
				</p>
				<button
					type="button"
					class="flex items-center gap-3 h-12 px-4 max-w-2xl border border-line-strong rounded-control bg-surface text-left text-base text-muted hover:bg-hover cursor-pointer"
					data-testid="help-home-search"
					@click="layout?.openSearch()">
					<span class="flex-1">{{
						t("help.search.placeholder")
					}}</span>
					<kbd
						class="font-mono text-xs border border-line rounded-control px-1.5"
						>/</kbd
					>
				</button>
				<div class="flex flex-wrap items-center gap-2 text-sm">
					<span class="text-muted">{{
						t("help.home.most_read")
					}}</span>
					<RouterLink
						v-for="id in POPULAR_ARTICLES"
						:key="id"
						:to="`/help/${id}`"
						class="px-2.5 py-1 rounded-control border border-line text-ink hover:bg-hover"
						@click="markHelpSource('nav')">
						{{ t(`help.articles.${id}.title`) }}
					</RouterLink>
				</div>
			</section>

			<section>
				<h2 class="text-lg font-bold text-ink-strong mb-4">
					{{ t("help.home.browse") }}
				</h2>
				<!-- columns, not a grid: each card as tall as its links -->
				<div class="columns-1 sm:columns-2 2xl:columns-3 gap-3">
					<div
						v-for="a in areas"
						:key="a.area"
						class="break-inside-avoid mb-3 flex flex-col gap-2 p-4 rounded-panel border border-line bg-surface">
						<h3 class="font-bold text-ink-strong">
							{{ t(`help.areas.${a.area}`) }}
						</h3>
						<ul class="flex flex-col gap-1 text-sm">
							<li v-for="art in a.articles" :key="art.id">
								<RouterLink
									:to="`/help/${art.id}`"
									class="text-link-primary hover:underline"
									@click="markHelpSource('nav')">
									<span v-if="art.parent">
										{{ t(`help.parents.${art.parent}`) }}:
									</span>
									{{ t(`help.articles.${art.id}.title`) }}
								</RouterLink>
							</li>
						</ul>
					</div>
				</div>
			</section>

			<div
				class="grid grid-cols-1 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-3 items-start">
				<section
					v-if="latest"
					class="flex flex-col gap-2 p-4 rounded-panel border border-line bg-surface"
					data-testid="help-whats-new">
					<div class="flex items-baseline justify-between gap-3">
						<h2 class="text-lg font-bold text-ink-strong">
							{{ t("help.home.whats_new") }}
						</h2>
						<span class="text-xs text-muted">{{
							latest.title
						}}</span>
					</div>
					<!-- sanitised at build time and again here (docs/security.md) -->
					<!-- eslint-disable vue/no-v-html -->
					<div
						class="text-sm leading-relaxed text-ink [&_h2]:hidden [&_p]:mb-2 [&_strong]:text-ink-strong [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mt-1 [&_li]:marker:text-muted [&_a]:text-link-primary"
						v-html="latest.html" />
					<!-- eslint-enable vue/no-v-html -->
					<RouterLink
						:to="`/help/${WHATS_NEW}`"
						class="text-sm text-link-primary hover:underline"
						@click="markHelpSource('nav')">
						{{ t("help.home.all_releases") }}
					</RouterLink>
				</section>

				<section
					class="flex flex-col gap-2 p-4 rounded-panel border border-line bg-surface">
					<h2 class="text-lg font-bold text-ink-strong">
						{{ t("help.home.stuck_title") }}
					</h2>
					<i18n-t
						keypath="help.home.stuck_text"
						tag="p"
						class="text-sm text-ink">
						<template #discord>
							<a
								:href="HELP_DISCORD_URL"
								target="_blank"
								rel="noopener"
								class="text-link-primary hover:underline">
								{{ t("help.home.discord") }}
							</a>
						</template>
						<template #github>
							<a
								:href="HELP_GITHUB_URL"
								target="_blank"
								rel="noopener"
								class="text-link-primary hover:underline">
								{{ t("help.home.github") }}
							</a>
						</template>
					</i18n-t>
				</section>
			</div>
		</div>
	</HelpLayout>
</template>
