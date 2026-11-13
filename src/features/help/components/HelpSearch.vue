<script setup lang="ts">
	/**
	 * Help search dialog: every article of the active locale (English where
	 * it lags behind), grouped by area, matches highlighted. ↑/↓ move, Enter
	 * opens the section, Esc closes.
	 *
	 * @author jplacht
	 */
	import { computed, nextTick, ref, type Ref, watch } from "vue";
	import { useRouter } from "vue-router";
	import { useI18n } from "vue-i18n";
	import { debounce } from "lodash-es";
	const { t, locale } = useI18n({ useScope: "global" });
	const router = useRouter();

	// Composables
	import { reportError, trackEvent } from "@/lib/analytics/useAnalytics";

	// Util
	import {
		articlesByArea,
		getArticle,
		HELP_ARTICLES,
	} from "@/features/help/helpArticles";
	import {
		searchHelp,
		type IHelpSearchResult,
	} from "@/features/help/helpSearch";
	import { markHelpSource } from "@/features/help/helpSource";
	import { FALLBACK_LOCALE } from "@/features/help/helpContent";
	import { HELP_DISCORD_URL } from "@/features/help/help.constants";

	// UI (public pages import kit files by path)
	import PInput from "@/ui/components/PInput.vue";
	import PModal from "@/ui/components/PModal.vue";

	// Types & Interfaces
	import type { IHelpSearchEntry } from "@/features/help/help.types";

	const show = defineModel<boolean>("show", { required: true });

	const query: Ref<string | null> = ref("");
	const index: Ref<IHelpSearchEntry[]> = ref([]);
	const active: Ref<number> = ref(0);

	// loaded the first time the dialog opens, again for another locale
	let loadedFor = "";
	watch(
		[show, locale],
		async () => {
			if (!show.value || loadedFor === locale.value) return;
			try {
				const indexes = (await import("virtual:help-search")).default;
				const loader =
					indexes[locale.value] ?? indexes[FALLBACK_LOCALE]!;
				index.value = (await loader()).default;
				loadedFor = locale.value;
			} catch (err) {
				reportError(err);
			}
		},
		{ immediate: true }
	);

	const order = HELP_ARTICLES.map((a) => a.id);
	const titleOf = (id: string) => t(`help.articles.${id}.title`);
	const results = computed(() =>
		searchHelp(index.value, query.value ?? "", titleOf, order)
	);

	// grouped by area in nav order, keeping the rank inside each group
	const groups = computed(() =>
		articlesByArea()
			.map(({ area, articles }) => ({
				area,
				items: results.value.filter((r) =>
					articles.some((a) => a.id === r.article)
				),
			}))
			.filter((g) => g.items.length)
	);
	// the order ↑/↓ walk: as shown
	const flat = computed(() => groups.value.flatMap((g) => g.items));

	watch(query, () => (active.value = 0));

	const track = debounce((q: string, count: number) => {
		if (!q) return;
		trackEvent("help:search", {
			query_length: q.length,
			result_count: count,
		});
		if (!count)
			trackEvent("help:search_no_results", { query_length: q.length });
	}, 600);
	watch(results, (r) => {
		const q = (query.value ?? "").trim();
		if (q) track(q, r.length);
	});

	function open(r: IHelpSearchResult): void {
		// the search that led here counts, though the dialog closes now
		track.flush();
		markHelpSource("search");
		show.value = false;
		router.push(`/help/${r.article}${r.section ? `#${r.section}` : ""}`);
	}

	async function onKeydown(event: KeyboardEvent): Promise<void> {
		const n = flat.value.length;
		if (event.key === "ArrowDown" && n) {
			event.preventDefault();
			active.value = (active.value + 1) % n;
		} else if (event.key === "ArrowUp" && n) {
			event.preventDefault();
			active.value = (active.value - 1 + n) % n;
		} else if (event.key === "Enter" && n) {
			event.preventDefault();
			open(flat.value[active.value]!);
			return;
		} else return;
		await nextTick();
		document
			.getElementById(`help-result-${active.value}`)
			?.scrollIntoView({ block: "nearest" });
	}

	const breadcrumb = (r: IHelpSearchResult) => {
		const a = getArticle(r.article);
		return [
			a?.parent ? t(`help.parents.${a.parent}`) : "",
			titleOf(r.article),
		]
			.filter(Boolean)
			.join(" / ");
	};

	watch(show, (open) => {
		if (open) return;
		track.flush();
		query.value = "";
	});
</script>

<template>
	<PModal
		v-model:show="show"
		:width="640"
		:closable="false"
		class="mt-[12vh]!"
		:aria-label="t('help.search.open')">
		<div class="flex flex-col gap-2 pt-2">
			<PInput
				v-model:value="query"
				:placeholder="t('help.search.placeholder')"
				:aria-label="t('help.search.label')"
				autocomplete="off"
				@keydown="onKeydown" />

			<p class="sr-only" role="status">
				{{
					query
						? t("help.search.results", { count: results.length })
						: ""
				}}
			</p>

			<div
				v-if="flat.length"
				class="max-h-[60vh] overflow-y-auto flex flex-col gap-3 py-1"
				data-testid="help-search-results">
				<div v-for="g in groups" :key="g.area">
					<div
						class="px-2 text-xs font-medium uppercase tracking-wider text-muted mb-1">
						{{ t(`help.areas.${g.area}`) }}
					</div>
					<ul class="flex flex-col">
						<li
							v-for="r in g.items"
							:id="`help-result-${flat.indexOf(r)}`"
							:key="`${r.article}#${r.section}`">
							<a
								:href="`/help/${r.article}${r.section ? `#${r.section}` : ''}`"
								class="flex flex-col gap-0.5 px-2 py-1.5 rounded-control no-underline"
								:class="
									flat.indexOf(r) === active
										? 'bg-selected'
										: 'hover:bg-hover'
								"
								:aria-current="
									flat.indexOf(r) === active
										? 'true'
										: undefined
								"
								@click.prevent="open(r)"
								@mousemove="active = flat.indexOf(r)">
								<span
									class="flex flex-wrap items-baseline gap-x-2">
									<span
										class="text-sm font-medium text-ink-strong">
										<component
											:is="p.mark ? 'mark' : 'span'"
											v-for="(p, i) in r.title"
											:key="i"
											:class="
												p.mark
													? 'bg-prunplanner/25 text-ink-strong rounded-sm'
													: undefined
											"
											>{{ p.text }}</component
										>
									</span>
									<span class="text-xs text-muted">
										{{ breadcrumb(r) }}
									</span>
								</span>
								<span
									v-if="r.snippet.length"
									class="text-xs text-muted-strong line-clamp-2">
									<component
										:is="p.mark ? 'mark' : 'span'"
										v-for="(p, i) in r.snippet"
										:key="i"
										:class="
											p.mark
												? 'bg-prunplanner/25 text-ink-strong rounded-sm'
												: undefined
										"
										>{{ p.text }}</component
									>
								</span>
							</a>
						</li>
					</ul>
				</div>
			</div>

			<div
				v-else-if="query?.trim() && index.length"
				class="px-2 py-6 flex flex-col gap-1 text-center"
				data-testid="help-search-empty">
				<span class="text-sm text-ink-strong">
					{{ t("help.search.no_results", { query: query.trim() }) }}
				</span>
				<i18n-t
					keypath="help.search.ask"
					tag="span"
					class="text-xs text-muted">
					<template #discord>
						<a
							:href="HELP_DISCORD_URL"
							target="_blank"
							rel="noopener"
							class="text-link-primary hover:underline">
							{{ t("help.home.discord") }}
						</a>
					</template>
				</i18n-t>
			</div>

			<div
				class="flex flex-wrap items-center gap-x-4 gap-y-1 px-2 py-2 border-t border-line text-xs text-muted">
				<span
					><kbd class="font-mono">↑ ↓</kbd>
					{{ t("help.search.move") }}</span
				>
				<span
					><kbd class="font-mono">Enter</kbd>
					{{ t("help.search.pick") }}</span
				>
				<span
					><kbd class="font-mono">Esc</kbd>
					{{ t("help.search.close") }}</span
				>
			</div>
		</div>
	</PModal>
</template>
