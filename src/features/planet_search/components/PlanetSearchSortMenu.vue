<script setup lang="ts">
	import { computed, ref, type Ref } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Engine & Util
	import {
		filteredMaterials,
		foundMaterials,
		MAX_SORT_KEYS,
		refKey,
		SEARCH_CX,
	} from "@/features/planet_search/planetSearch.engine";
	import { sortLabel } from "@/features/planet_search/planetSearchLabels.util";

	// Types & Interfaces
	import type { PlanetSearchIndexEntry } from "@/features/api/schemas/gameData.schemas";
	import type {
		PlanetSearchColumn,
		PlanetSearchFilter,
		PlanetSearchReference,
		PlanetSearchView,
	} from "@/features/planet_search/planetSearch.schemas";
	import type { IPlanetSearchSort } from "@/features/planet_search/planetSearch.types";

	// UI
	import { PButton, PButtonGroup, PSelect } from "@/ui";
	import { popoverConfig } from "@/ui/styles";
	import { NPopover } from "naive-ui";
	import { CloseSharp } from "@vicons/material";

	const props = defineProps<{
		/** the chosen chain; empty means the default order */
		sorts: IPlanetSearchSort[];
		defaultSort: IPlanetSearchSort;
		view: PlanetSearchView;
		results: PlanetSearchIndexEntry[];
		filter: PlanetSearchFilter;
		hiddenColumns: PlanetSearchColumn[];
		hiddenMaterials: string[];
		refName: (ref: PlanetSearchReference) => string;
	}>();

	const emit = defineEmits<{
		(e: "sort", value: IPlanetSearchSort[]): void;
	}>();

	const label = (key: string) => sortLabel(key, t, props.refName);
	// materials and fertility sort best first, everything else ascending
	const firstDir = (key: string): IPlanetSearchSort["dir"] =>
		key === "fert" || key.startsWith("mat:") ? "desc" : "asc";

	// the columns the current view shows (hidden ones aren't offered)
	const keys = computed(() => {
		const filtered = filteredMaterials(props.filter);
		const materials =
			props.view === "matrix"
				? Object.keys(foundMaterials(props.results))
						.filter(
							(m) =>
								filtered.includes(m) ||
								!props.hiddenMaterials.includes(m)
						)
						.sort()
				: filtered;
		const shown = (c: PlanetSearchColumn) => !props.hiddenColumns.includes(c);
		return [
			"name",
			...(shown("fert") ? ["fert"] : []),
			...materials.map((m) => `mat:${m}`),
			...props.filter.references
				.filter((r) => r.kind === "plan")
				.map((r) => `ref:${refKey(r)}`),
			...SEARCH_CX.filter(shown).map((c) => `ref:cx:${c}`),
		];
	});

	const options = computed(() =>
		keys.value
			.filter((k) => !props.sorts.some((s) => s.key === k))
			.map((k) => ({ label: label(k), value: k }))
	);

	const addValue: Ref<string | null> = ref(null);
	function add(key: string | number | null | undefined) {
		if (typeof key === "string")
			emit("sort", [...props.sorts, { key, dir: firstDir(key) }]);
		addValue.value = null;
	}

	function setDir(index: number, dir: IPlanetSearchSort["dir"]) {
		emit(
			"sort",
			props.sorts.map((s, i) => (i === index ? { ...s, dir } : s))
		);
	}

	function remove(index: number) {
		emit(
			"sort",
			props.sorts.filter((_, i) => i !== index)
		);
	}

	/*
	 * Stays open while the chain is edited: the "then by" dropdown renders
	 * outside the popover, so its clicks don't count as clicking away.
	 */
	const open: Ref<boolean> = ref(false);
	const triggerEl: Ref<HTMLElement | null> = ref(null);
	function onClickOutside(e: MouseEvent) {
		const target = e.target as Element | null;
		// a picked option is already removed from the page when this runs
		if (!target?.isConnected || target.closest("[data-pselect-dropdown]"))
			return;
		// the trigger's own click toggles the menu
		if (triggerEl.value?.contains(target)) return;
		open.value = false;
	}

	/*
	 * Escape in an open "then by" dropdown only closes that dropdown. Runs in
	 * the capture phase, before the select removes its dropdown.
	 */
	function onEscape() {
		if (!document.querySelector("[data-pselect-dropdown]")) open.value = false;
	}
</script>

<template>
	<NPopover
		trigger="manual"
		placement="bottom-end"
		:show="open"
		:show-arrow="false"
		:class="popoverConfig.panel"
		@clickoutside="onClickOutside">
		<template #trigger>
			<span ref="triggerEl" class="inline-flex">
				<PButton
					type="secondary"
					:aria-expanded="open"
					@click="open = !open">
					{{ t("planet_search.sort.button", { n: sorts.length }) }}
				</PButton>
			</span>
		</template>
		<div
			class="flex flex-col gap-3 w-[320px] max-w-[90vw]"
			@keydown.capture.esc="onEscape">
			<div>
				<h3 class="font-bold text-white">
					{{ t("planet_search.sort.title") }}
				</h3>
				<p class="text-xs text-muted mt-0.5">
					{{ t("planet_search.sort.hint") }}
				</p>
			</div>

			<p
				v-if="!sorts.length"
				class="text-sm text-muted rounded border border-dashed border-white/15 px-2 py-1.5">
				{{
					t("planet_search.sort.default", {
						column: label(defaultSort.key),
						dir: t(`planet_search.sort.${defaultSort.dir}`),
					})
				}}
			</p>
			<ol v-else class="flex flex-col gap-1.5">
				<li
					v-for="(s, i) in sorts"
					:key="s.key"
					class="flex flex-row items-center gap-2 rounded bg-white/5 border border-white/10 pl-2 pr-1 py-1">
					<span
						class="shrink-0 w-5 h-5 rounded-full bg-blue-800 text-white text-xs font-bold flex items-center justify-center"
						aria-hidden="true">
						{{ i + 1 }}
					</span>
					<span class="flex-1 min-w-0 truncate font-medium text-white">
						{{ label(s.key) }}
					</span>
					<PButtonGroup
						role="group"
						:aria-label="
							t('planet_search.sort.direction', {
								column: label(s.key),
							})
						">
						<PButton
							v-for="d in ['asc', 'desc'] as const"
							:key="d"
							size="sm"
							:type="s.dir === d ? 'primary' : 'secondary'"
							:aria-pressed="s.dir === d"
							:title="t(`planet_search.sort.${d}`)"
							:aria-label="t(`planet_search.sort.${d}`)"
							@click="setDir(i, d)">
							{{ d === "asc" ? "▲" : "▼" }}
						</PButton>
					</PButtonGroup>
					<PButton
						size="sm"
						type="secondary"
						:aria-label="
							t('planet_search.sort.remove', { column: label(s.key) })
						"
						@click="remove(i)">
						<template #icon><CloseSharp /></template>
					</PButton>
				</li>
			</ol>

			<div
				v-if="sorts.length < MAX_SORT_KEYS"
				class="flex flex-col gap-1 pt-2 border-t border-white/10">
				<span class="text-xs text-muted">
					{{
						t(
							sorts.length
								? "planet_search.sort.then_by"
								: "planet_search.sort.title"
						)
					}}
				</span>
				<PSelect
					v-model:value="addValue"
					searchable
					:options="options"
					:placeholder="t('planet_search.sort.pick_column')"
					:aria-label="t('planet_search.sort.then_by')"
					@update:value="add" />
			</div>
			<p v-else class="text-xs text-muted pt-2 border-t border-white/10">
				{{ t("planet_search.sort.full", { max: MAX_SORT_KEYS }) }}
			</p>
		</div>
	</NPopover>
</template>
