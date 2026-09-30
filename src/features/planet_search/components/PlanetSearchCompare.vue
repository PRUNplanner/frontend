<script setup lang="ts">
	import { computed, ref, type Ref } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Engine
	import {
		activeProgram,
		fertilityPercent,
		filteredMaterials,
		planetInfrastructure,
		planetJumps,
		rankValues,
		SEARCH_CX,
	} from "@/features/planet_search/planetSearch.engine";
	import { environmentExtras } from "@/features/planet_search/environmentExtras.util";
	import { MAX_PINS } from "@/features/planet_search/planetSearchUrl.util";
	import { formatNumber } from "@/util/numbers";

	// Types & Interfaces
	import type { PlanetSearchIndexEntry } from "@/features/api/schemas/gameData.schemas";
	import type {
		PlanetSearchFilter,
		PlanetSearchReference,
	} from "@/features/planet_search/planetSearch.schemas";
	import type { IPlanetSearchContext } from "@/features/planet_search/planetSearch.types";

	const props = defineProps<{
		planets: PlanetSearchIndexEntry[];
		filter: PlanetSearchFilter;
		ctx: IPlanetSearchContext;
		refName: (ref: PlanetSearchReference) => string;
	}>();

	const emit = defineEmits<{ (e: "unpin", planetNaturalId: string): void }>();

	const open: Ref<boolean> = ref(true);

	interface ICell {
		text: string;
		style?: string;
		best?: boolean;
	}
	interface IRow {
		label: string;
		cells: ICell[];
		differs: boolean;
	}

	const name = (p: PlanetSearchIndexEntry) =>
		p.planet_name && p.planet_name !== p.planet_natural_id
			? `${p.planet_name} (${p.planet_natural_id})`
			: p.planet_natural_id;

	function textRow(
		label: string,
		value: (p: PlanetSearchIndexEntry) => string
	): IRow {
		const texts = props.planets.map(value);
		return {
			label,
			cells: texts.map((text) => ({ text })),
			differs: texts.length > 1 && texts.some((x) => x !== texts[0]),
		};
	}

	function rankRow(
		label: string,
		value: (p: PlanetSearchIndexEntry) => number | null,
		format: (v: number) => string,
		higherIsBetter: boolean
	): IRow {
		const values = props.planets.map(value);
		const ranks = rankValues(values, higherIsBetter);
		return {
			label,
			differs: false,
			cells: values.map((v, i) => {
				const rank = ranks[i];
				return {
					text: v === null ? "—" : format(v),
					best: rank === 1,
					style:
						rank === null
							? undefined
							: `background: color-mix(in srgb, color-mix(in srgb, var(--color-positive) ${Math.round(rank * 100)}%, var(--color-negative)) 24%, transparent)`,
				};
			}),
		};
	}

	const rows = computed((): IRow[] => {
		const materials = filteredMaterials(props.filter);
		const daily = (p: PlanetSearchIndexEntry, m: string) =>
			p.resources.find((r) => r.material_ticker === m)?.daily_extraction ??
			null;
		const jumps = (p: PlanetSearchIndexEntry, r: PlanetSearchReference) => {
			const j = planetJumps(p, r, props.ctx);
			return j === -1 ? null : j;
		};

		return [
			textRow(t("planet_search.compare.extras"), (p) =>
				environmentExtras(p)
					.map((e) => e.ticker)
					.join(", ")
			),
			rankRow(
				t("planet_search.compare.fertility"),
				fertilityPercent,
				(v) => formatNumber(v, 0),
				true
			),
			...materials.map((m) =>
				rankRow(
					t("planet_search.compare.per_day", { material: m }),
					(p) => daily(p, m),
					(v) => formatNumber(v, 1),
					true
				)
			),
			textRow(
				t("planet_search.compare.other"),
				(p) =>
					p.resources
						.filter((r) => !materials.includes(r.material_ticker))
						.map(
							(r) =>
								`${r.material_ticker} ${formatNumber(r.daily_extraction, 1)}`
						)
						.join(", ") || "—"
			),
			textRow(t("planet_search.compare.cogc"), (p) => {
				const c = activeProgram(p, props.ctx.now);
				return c ? t(`game.cogc_program.${c}`) : "—";
			}),
			textRow(
				t("planet_search.compare.infrastructure"),
				(p) => planetInfrastructure(p).join(", ") || "—"
			),
			textRow(t("planet_search.compare.cx"), (p) =>
				SEARCH_CX.map((code) => {
					const j = planetJumps(p, { kind: "cx", code }, props.ctx);
					return j === -1 ? "—" : String(j);
				}).join(" / ")
			),
			...props.filter.references.map((r) =>
				rankRow(
					t("planet_search.compare.jumps", { ref: props.refName(r) }),
					(p) => jumps(p, r),
					String,
					false
				)
			),
		];
	});
</script>

<template>
	<div class="border-t border-white/10 bg-black px-6 py-2 flex flex-col gap-2">
		<div class="flex flex-row flex-wrap items-center gap-2">
			<button
				type="button"
				class="px-3 py-1 rounded bg-blue-800 font-bold cursor-pointer"
				:aria-expanded="open"
				:aria-label="t('planet_search.compare.toggle')"
				@click="open = !open">
				{{ t("planet_search.compare.title", { n: planets.length, max: MAX_PINS }) }}
				<span aria-hidden="true">{{ open ? "▼" : "▲" }}</span>
			</button>
			<span
				v-for="p in planets"
				:key="p.planet_natural_id"
				class="inline-flex items-center gap-1 pl-3 rounded-full border border-blue-300/60 bg-blue-950 text-sm">
				{{ name(p) }}
				<button
					type="button"
					class="w-7 h-7 rounded-full cursor-pointer hover:bg-white/10"
					:aria-label="t('planet_search.compare.remove', { planet: name(p) })"
					@click="emit('unpin', p.planet_natural_id)">
					×
				</button>
			</span>
			<span class="ml-auto text-xs text-muted">
				{{
					planets.length
						? t("planet_search.compare.hint")
						: t("planet_search.compare.hint_empty")
				}}
			</span>
		</div>

		<div v-if="open && planets.length" class="max-h-[380px] overflow-auto">
			<table class="w-full text-sm border-separate border-spacing-0">
				<thead class="sticky top-0 bg-black">
					<tr>
						<th class="text-left px-2 py-1">
							<span class="sr-only">{{ t("planet_search.compare.row_label") }}</span>
						</th>
						<th
							v-for="p in planets"
							:key="p.planet_natural_id"
							class="text-left px-2 py-1 font-bold whitespace-nowrap">
							{{ name(p) }}
						</th>
					</tr>
				</thead>
				<tbody>
					<tr
						v-for="row in rows"
						:key="row.label"
						:class="{ 'bg-blue-400/10': row.differs }">
						<th scope="row" class="text-left font-normal text-muted px-2 py-1 whitespace-nowrap">
							{{ row.label }}
						</th>
						<td
							v-for="(cell, i) in row.cells"
							:key="i"
							class="px-2 py-1 tabular-nums"
							:class="{ 'font-bold': cell.best }"
							:style="cell.style">
							{{ cell.text }}
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>
</template>
