<script setup lang="ts">
	import {
		computed,
		defineAsyncComponent,
		onBeforeUnmount,
		onMounted,
		ref,
		watch,
		type ComputedRef,
		type Ref,
	} from "vue";
	import { useRoute, useRouter } from "vue-router";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Composables
	import { useQuery } from "@/lib/query_cache/useQuery";
	import { usePreferences } from "@/features/preferences/usePreferences";
	import { usePlanetSearchPrefs } from "@/features/planet_search/usePlanetSearchPrefs";
	import { useUserStore } from "@/stores/userStore";
	import { trackEvent } from "@/lib/analytics/useAnalytics";

	// Engine & Util
	import {
		activeChips,
		defaultFilter,
		defaultSort,
		facetCounts,
		filteredMaterials,
		filterPlanets,
		indexMaterials,
		materialMax,
		nameSearchNote,
		refKey,
		restrictionHints,
		SEARCH_CX,
		sortPlanets,
	} from "@/features/planet_search/planetSearch.engine";
	import { createSearchContext } from "@/features/planet_search/planetSearchContext.util";
	import {
		decodeSearch,
		encodeSearch,
		MAX_PINS,
		type IPlanetSearchQuery,
	} from "@/features/planet_search/planetSearchUrl.util";
	import {
		hintLabel,
		hintText,
	} from "@/features/planet_search/planetSearchLabels.util";
	import { deepClone } from "@/util/data";

	// Components
	import HelpDrawer from "@/features/help/components/HelpDrawer.vue";
	import PlanetSearchHeader from "@/features/planet_search/components/PlanetSearchHeader.vue";
	import PlanetSearchFilterPanel from "@/features/planet_search/components/PlanetSearchFilterPanel.vue";
	import PlanetSearchResultsBar from "@/features/planet_search/components/PlanetSearchResultsBar.vue";
	const PlanetSearchList = defineAsyncComponent(
		() =>
			import("@/features/planet_search/components/PlanetSearchList.vue")
	);
	const PlanetSearchMatrix = defineAsyncComponent(
		() =>
			import("@/features/planet_search/components/PlanetSearchMatrix.vue")
	);
	const PlanetSearchCompare = defineAsyncComponent(
		() =>
			import(
				"@/features/planet_search/components/PlanetSearchCompare.vue"
			)
	);

	// Types & Interfaces
	import type { PlanetSearchIndexEntry } from "@/features/api/schemas/gameData.schemas";
	import type { PlanEmpireElement } from "@/features/api/schemas/empireData.schemas";
	import type {
		PlanetSearchFilter,
		PlanetSearchReference,
		PlanetSearchSaved,
		PlanetSearchView,
	} from "@/features/planet_search/planetSearch.schemas";
	import type { IPlanetSearchSort } from "@/features/planet_search/planetSearch.types";

	// UI
	import { PButton, PSpin, useToast } from "@/ui";
	import { NDrawer, NDrawerContent } from "naive-ui";
	import {
		KeyboardDoubleArrowLeftSharp,
		KeyboardDoubleArrowRightSharp,
	} from "@vicons/material";

	const route = useRoute();
	const router = useRouter();
	const toast = useToast();
	const userStore = useUserStore();
	const { defaultEmpireUuid } = usePreferences();
	const { prefs } = usePlanetSearchPrefs();

	/*
	 * Search state: the url is its source on load, then mirrors it. A fresh
	 * visit (no params) opens in the last used view, a link in its own.
	 */
	const hasParams = (q: IPlanetSearchQuery) => Object.keys(q).length > 0;
	const initial = decodeSearch(route.query);
	const filter: Ref<PlanetSearchFilter> = ref(initial.filter);
	const sort: Ref<IPlanetSearchSort[]> = ref(initial.sort);
	const view: Ref<PlanetSearchView> = ref(
		hasParams(route.query) ? initial.view : prefs.value.view
	);
	const pins: Ref<string[]> = ref(initial.pins);

	const currentQuery = () =>
		encodeSearch({
			filter: filter.value,
			sort: sort.value,
			view: view.value,
			pins: pins.value,
		});

	watch(view, (v) => (prefs.value.view = v));

	watch(
		[filter, sort, view, pins],
		() => router.replace({ query: currentQuery() }),
		{ deep: true }
	);

	// links to /search while already on it (our own replace is a no-op here)
	watch(
		() => route.query,
		(query) => {
			const next = decodeSearch(query);
			if (
				JSON.stringify(encodeSearch(next)) ===
				JSON.stringify(currentQuery())
			)
				return;
			filter.value = next.filter;
			sort.value = next.sort;
			view.value = next.view;
			pins.value = next.pins;
			if (!loading.value) resolveEmpire();
		}
	);

	// sort keys on a column that went away leave the chain
	watch(
		[filter, view],
		() => {
			const gone = (key: string) =>
				key.startsWith("mat:")
					? view.value === "list" &&
						!filteredMaterials(filter.value).includes(key.slice(4))
					: key.startsWith("ref:plan:") &&
						!filter.value.references.some(
							(r) => `ref:${refKey(r)}` === key
						);
			if (sort.value.some((s) => gone(s.key)))
				sort.value = sort.value.filter((s) => !gone(s.key));
		},
		{ deep: true }
	);

	/*
	 * Data
	 */
	const index: Ref<PlanetSearchIndexEntry[]> = ref([]);
	const loading: Ref<boolean> = ref(true);
	const loadError: Ref<boolean> = ref(false);
	const empires: Ref<PlanEmpireElement[]> = ref([]);
	const empireUuid: Ref<string | undefined> = ref(undefined);
	const now = Date.now();

	const empirePlans = computed(
		() => empires.value.find((e) => e.uuid === empireUuid.value)?.plans ?? []
	);
	const planPlanets: ComputedRef<Record<string, string>> = computed(() =>
		Object.fromEntries(
			empirePlans.value.map((p) => [p.uuid, p.planet_natural_id])
		)
	);

	/**
	 * Selects the empire holding the most of the filter's plans (a plan can
	 * be in several empires; ties keep the current, then the default empire),
	 * then drops plan picks outside it: plans of other players, e.g. from a
	 * shared link, are ignored.
	 */
	function resolveEmpire() {
		const planUuids = filter.value.references.flatMap((r) =>
			r.kind === "plan" ? [r.planUuid] : []
		);
		const held = (uuid: string | undefined) =>
			empires.value
				.find((e) => e.uuid === uuid)
				?.plans.filter((p) => planUuids.includes(p.uuid)).length ?? -1;
		const candidates = [
			empireUuid.value,
			defaultEmpireUuid.value,
			...empires.value.map((e) => e.uuid),
		].filter((uuid) => held(uuid) >= 0);
		// first candidate with the highest count, so ties keep the order above
		empireUuid.value = candidates.reduce<string | undefined>(
			(best, uuid) => (held(uuid) > held(best) ? uuid : best),
			candidates[0]
		);

		const refs = filter.value.references.filter(
			(r) => r.kind === "cx" || planPlanets.value[r.planUuid]
		);
		if (refs.length !== filter.value.references.length)
			filter.value = { ...filter.value, references: refs };
	}

	onMounted(async () => {
		try {
			const [data, empireList] = await Promise.all([
				useQuery("GetPlanetSearchIndex").execute(),
				userStore.isLoggedIn
					? useQuery("GetAllEmpires").execute()
					: Promise.resolve([]),
			]);
			index.value = data;
			empires.value = empireList;
			resolveEmpire();
		} catch {
			loadError.value = true;
		} finally {
			loading.value = false;
		}
	});

	function changeEmpire(uuid: string) {
		empireUuid.value = uuid;
		filter.value = {
			...filter.value,
			references: filter.value.references.filter((r) => r.kind === "cx"),
		};
	}


	/*
	 * Engine
	 */
	const ctx = computed(() =>
		createSearchContext(index.value, planPlanets.value, now)
	);
	const materials = computed(() => indexMaterials(index.value));
	const planetNames = computed(() =>
		Object.fromEntries(
			index.value.map((p) => [p.planet_natural_id, p.planet_name])
		)
	);
	const maxDaily = computed(() => materialMax(index.value));
	const referenceOptions: ComputedRef<PlanetSearchReference[]> = computed(
		() => [
			...empirePlans.value.map((p) => ({
				kind: "plan" as const,
				planUuid: p.uuid,
			})),
			...SEARCH_CX.map((code) => ({ kind: "cx" as const, code })),
		]
	);

	const matched = computed(() =>
		filterPlanets(index.value, filter.value, ctx.value)
	);
	const fallbackSort = computed(() => defaultSort(filter.value));
	const activeSort = computed((): IPlanetSearchSort[] =>
		sort.value.length ? sort.value : [fallbackSort.value]
	);
	const results = computed(() =>
		sortPlanets(matched.value, activeSort.value, ctx.value)
	);
	const facets = computed(() =>
		facetCounts(
			index.value,
			filter.value,
			ctx.value,
			materials.value,
			referenceOptions.value
		)
	);
	const chips = computed(() => activeChips(filter.value));
	const nameNote = computed(() =>
		nameSearchNote(index.value, filter.value, ctx.value)
	);
	// the name note takes over when the filters hide every name match
	const hints = computed(() =>
		index.value.length && !matched.value.length && !nameNote.value
			? restrictionHints(index.value, filter.value, ctx.value, {
					baseline: "all",
				})
			: []
	);

	function refName(ref: PlanetSearchReference): string {
		if (ref.kind === "cx") return ref.code;
		return (
			empirePlans.value.find((p) => p.uuid === ref.planUuid)?.plan_name ??
			"?"
		);
	}

	const hintItems = computed(() =>
		hints.value.map((h) => ({
			label: hintLabel(h, filter.value.minDaily, t, refName),
			filter: h.filter,
		}))
	);

	const nameNoteItem = computed(() => {
		const note = nameNote.value;
		if (!note) return null;
		const shown = note.matches - note.hidden;
		return {
			text: t(
				"planet_search.name_note.text",
				{ n: note.hidden, text: filter.value.text.trim() },
				note.hidden
			),
			hints: note.hints.map((h) => ({
				label: t("planet_search.name_note.relaxation", {
					label: hintText(h, filter.value.minDaily, t, refName),
					n: h.count - shown,
				}),
				filter: h.filter,
			})),
			showAll: {
				label: t("planet_search.name_note.show_all", { n: note.matches }),
				filter: note.showAll,
			},
		};
	});

	// one analytics event per settled search
	let trackTimer: ReturnType<typeof setTimeout> | undefined;
	watch(
		filter,
		() => {
			clearTimeout(trackTimer);
			trackTimer = setTimeout(
				() =>
					trackEvent("planet_search", {
						filter: encodeSearch({
							filter: filter.value,
							sort: [],
							view: "list",
							pins: [],
						}),
						results: matched.value.length,
					}),
				1000
			);
		},
		{ deep: true }
	);
	onBeforeUnmount(() => clearTimeout(trackTimer));

	/*
	 * Pins, saved searches, sharing
	 */
	function togglePin(planetNaturalId: string) {
		if (pins.value.includes(planetNaturalId))
			pins.value = pins.value.filter((p) => p !== planetNaturalId);
		else if (pins.value.length >= MAX_PINS)
			toast(t("planet_search.compare.full", { max: MAX_PINS }));
		else pins.value = [...pins.value, planetNaturalId];
	}

	function saveSearch(name: string) {
		prefs.value.savedSearches.push({
			id: crypto.randomUUID(),
			name,
			filter: deepClone(filter.value),
			view: view.value,
		});
		toast(t("planet_search.header.saved_toast", { name }));
	}

	function loadSearch(saved: PlanetSearchSaved) {
		filter.value = deepClone(saved.filter);
		view.value = saved.view;
		// before the empires load, onMounted resolves it
		if (!loading.value) resolveEmpire();
		toast(t("planet_search.header.loaded_toast", { name: saved.name }));
	}

	function deleteSearch(saved: PlanetSearchSaved) {
		prefs.value.savedSearches = prefs.value.savedSearches.filter(
			(s) => s.id !== saved.id
		);
		toast(t("planet_search.header.deleted_toast", { name: saved.name }));
	}

	async function copyLink() {
		try {
			await navigator.clipboard.writeText(window.location.href);
			toast(t("planet_search.header.link_copied"));
		} catch {
			toast(t("planet_search.header.copy_failed"), { type: "error" });
		}
	}

	function reset() {
		filter.value = defaultFilter();
		sort.value = [];
	}

	/*
	 * Layout: desktop gets the docked panel and compare, small screens a drawer
	 */
	const desktopQuery =
		typeof window.matchMedia === "function"
			? window.matchMedia("(min-width: 1024px)")
			: null;
	const isDesktop: Ref<boolean> = ref(desktopQuery?.matches ?? true);
	const onMedia = (e: MediaQueryListEvent) => (isDesktop.value = e.matches);
	desktopQuery?.addEventListener("change", onMedia);
	onBeforeUnmount(() => desktopQuery?.removeEventListener("change", onMedia));

	const drawerOpen: Ref<boolean> = ref(false);

	const panelProps = computed(() => ({
		filter: filter.value,
		facets: facets.value,
		materials: materials.value,
		maxDaily: maxDaily.value,
		empires: empires.value,
		empireUuid: empireUuid.value,
		showPlans: userStore.isLoggedIn,
		planetNames: planetNames.value,
	}));
</script>

<template>
	<div class="flex flex-col lg:h-dvh">
		<div
			class="px-6 py-3 border-b border-white/10 flex flex-row justify-between">
			<h1 class="text-2xl font-bold my-auto">
				{{ t("planet_search.title") }}
			</h1>
			<HelpDrawer file-name="planet_search" />
		</div>

		<PlanetSearchHeader
			:filter="filter"
			:chips="chips"
			:saved="prefs.savedSearches"
			:ref-name="refName"
			@update:text="(text) => (filter = { ...filter, text })"
			@save="saveSearch"
			@load="loadSearch"
			@rename="(saved, name) => (saved.name = name)"
			@delete="deleteSearch"
			@copy="copyLink"
			@reset="reset" />

		<div v-if="loading" class="flex-1 flex justify-center py-12">
			<PSpin :aria-label="t('planet_search.loading')" />
		</div>
		<p v-else-if="loadError" class="flex-1 px-6 py-12 text-negative">
			{{ t("planet_search.load_error") }}
		</p>

		<div v-else class="flex-1 min-h-0 flex flex-row">
			<aside
				v-if="isDesktop"
				class="shrink-0 border-r border-white/10 flex flex-col min-h-0"
				:class="prefs.filtersCollapsed ? 'w-[52px]' : 'w-[400px]'">
				<div
					class="flex items-center gap-2 px-3 py-2"
					:class="
						prefs.filtersCollapsed
							? 'flex-col'
							: 'flex-row justify-between'
					">
					<h2
						class="text-xs font-bold uppercase tracking-wider text-muted whitespace-nowrap"
						:class="{ '[writing-mode:vertical-rl]': prefs.filtersCollapsed }">
						{{ t("planet_search.filters.title") }} ·
						{{ t("planet_search.filters.active", { n: chips.length }) }}
					</h2>
					<button
						type="button"
						class="cursor-pointer hover:bg-white/20 hover:rounded-sm p-2"
						:class="{ '-order-1': prefs.filtersCollapsed }"
						:aria-label="
							prefs.filtersCollapsed
								? t('planet_search.filters.expand')
								: t('planet_search.filters.collapse')
						"
						:aria-expanded="!prefs.filtersCollapsed"
						@click="
							prefs.filtersCollapsed = !prefs.filtersCollapsed
						">
						<KeyboardDoubleArrowRightSharp
							v-if="prefs.filtersCollapsed"
							class="w-5 h-5" />
						<KeyboardDoubleArrowLeftSharp v-else class="w-5 h-5" />
					</button>
				</div>
				<div
					v-if="!prefs.filtersCollapsed"
					class="flex-1 min-h-0 overflow-y-auto px-4 pb-6">
					<PlanetSearchFilterPanel
						v-bind="panelProps"
						@update:filter="(f) => (filter = f)"
						@update:empire="changeEmpire" />
				</div>
			</aside>

			<section class="flex-1 min-w-0 flex flex-col min-h-0">
				<PlanetSearchResultsBar
					v-model:view="view"
					v-model:hidden-columns="prefs.hiddenColumns"
					v-model:hidden-materials="prefs.hiddenMaterials"
					:count="results.length"
					:total="index.length"
					:results="results"
					:filter="filter"
					:chips="chips"
					:hints="hintItems"
					:name-note="nameNoteItem"
					:is-desktop="isDesktop"
					:ref-name="refName"
					:sorts="sort"
					:default-sort="fallbackSort"
					@update:filter="(f) => (filter = f)"
					@sort="(s) => (sort = s)"
					@open-filters="drawerOpen = true" />

				<div
					class="lg:flex-1 lg:min-h-0 overflow-auto mx-3 lg:mx-6 mb-3 border border-white/10 rounded">
					<PlanetSearchList
						v-if="view === 'list'"
						:planets="results"
						:filter="filter"
						:ctx="ctx"
						:max-daily="maxDaily"
						:sorts="activeSort"
						:pins="pins"
						:show-pins="isDesktop"
						:hidden-columns="prefs.hiddenColumns"
						:ref-name="refName"
						@sort="(s) => (sort = s)"
						@pin="togglePin" />
					<PlanetSearchMatrix
						v-else
						:planets="results"
						:filter="filter"
						:ctx="ctx"
						:max-daily="maxDaily"
						:sorts="activeSort"
						:pins="pins"
						:show-pins="isDesktop"
						:hidden-columns="prefs.hiddenColumns"
						:hidden-materials="prefs.hiddenMaterials"
						:ref-name="refName"
						@sort="(s) => (sort = s)"
						@pin="togglePin" />
				</div>

				<PlanetSearchCompare
					v-if="isDesktop"
					:planets="
						pins
							.map((p) =>
								index.find((i) => i.planet_natural_id === p)
							)
							.filter((p) => p !== undefined)
					"
					:filter="filter"
					:ctx="ctx"
					:ref-name="refName"
					@unpin="togglePin" />
			</section>
		</div>

		<NDrawer
			v-if="!isDesktop"
			v-model:show="drawerOpen"
			width="100%"
			placement="left"
			:auto-focus="false">
			<NDrawerContent body-content-class="!p-0">
				<div class="flex flex-col min-h-full">
					<div
						class="flex flex-row justify-between items-center px-4 py-2 border-b border-white/10">
						<h2 class="font-bold">
							{{ t("planet_search.filters.title") }} ·
							{{
								t("planet_search.filters.active", {
									n: chips.length,
								})
							}}
						</h2>
						<button
							type="button"
							class="min-w-11 min-h-11 text-xl hover:bg-white/20 rounded-sm"
							:aria-label="t('planet_search.filters.close')"
							@click="drawerOpen = false">
							×
						</button>
					</div>
					<!-- 44 px touch targets in the drawer -->
					<div
						class="flex-1 px-4 pb-4 [&_.pselect_label>div]:min-h-11 [&_input:not(.peer)]:min-h-11 [&_.pcheckbox_label]:min-h-11">
						<PlanetSearchFilterPanel
							v-bind="panelProps"
							@update:filter="(f) => (filter = f)"
							@update:empire="changeEmpire" />
					</div>
					<div
						class="sticky bottom-0 p-3 bg-black border-t border-white/10">
						<PButton
							class="w-full min-h-11"
							@click="drawerOpen = false">
							{{
								t("planet_search.filters.show_results", {
									n: results.length,
								})
							}}
						</PButton>
					</div>
				</div>
			</NDrawerContent>
		</NDrawer>
	</div>
</template>
