<script setup lang="ts">
	import { computed, ref, type Ref } from "vue";
	import { useRouter } from "vue-router";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Composables
	import { useAuthPanel } from "@/features/account/useAuthPanel";
	import { useUserStore } from "@/stores/userStore";

	// Engine & Util
	import {
		activeProgram,
		fertilityPercent,
		filteredMaterials,
		planetInfrastructure,
	} from "@/features/planet_search/planetSearch.engine";
	import {
		CHART_LIMIT,
		chartData,
		chartYMaterial,
	} from "@/features/planet_search/planetSearchChart.util";
	import { paretoFrontier } from "@/ui/charts/scatter.util";
	import { useChartTheme } from "@/ui/charts/chartTheme";
	import { formatNumber } from "@/util/numbers";
	import { planetDisplayName } from "@/util/planetName";

	// Components
	import PlanetSearchRowActions from "@/features/planet_search/components/PlanetSearchRowActions.vue";
	import PScatter from "@/ui/charts/PScatter.vue";

	// Types & Interfaces
	import type {
		PlanetCOGCProgramType,
		PlanetSearchIndexEntry,
	} from "@/features/api/schemas/gameData.schemas";
	import type {
		PlanetSearchFilter,
		PlanetSearchReference,
	} from "@/features/planet_search/planetSearch.schemas";
	import type { IPlanetSearchContext } from "@/features/planet_search/planetSearch.types";
	import type { IScatterPoint } from "@/ui/charts/scatter.types";

	// UI
	import { PButton, PButtonGroup, PSelect } from "@/ui";

	const props = defineProps<{
		/** results, sorted */
		planets: PlanetSearchIndexEntry[];
		filter: PlanetSearchFilter;
		ctx: IPlanetSearchContext;
		pins: string[];
		showPins: boolean;
		refName: (ref: PlanetSearchReference) => string;
	}>();

	const emit = defineEmits<{
		(e: "pin", planetNaturalId: string): void;
	}>();

	const router = useRouter();
	const theme = useChartTheme();

	const picked: Ref<string | null> = ref(null);
	const colourBy: Ref<"frontier" | "cogc"> = ref("frontier");
	const active: Ref<string | null> = ref(null);

	const materials = computed(() => filteredMaterials(props.filter));
	const material = computed(() =>
		chartYMaterial(props.filter, picked.value)
	);
	const data = computed(() =>
		chartData(props.planets, props.filter, props.ctx, material.value)
	);

	const target = computed(() =>
		data.value.axis.refs.map(props.refName).join(", ")
	);
	const xTitle = computed(() =>
		data.value.axis.nearest
			? t("planet_search.chart.x_nearest", { target: target.value })
			: t("planet_search.chart.x_refs", { target: target.value })
	);
	const yTitle = computed(() =>
		material.value
			? t("planet_search.chart.per_day", { material: material.value })
			: t("planet_search.chart.fertility")
	);

	const name = (p: PlanetSearchIndexEntry) =>
		planetDisplayName(p.planet_natural_id, p.planet_name);

	const frontier = computed(
		() =>
			new Set(
				paretoFrontier(
					data.value.points.map((p) => ({
						key: p.planet.planet_natural_id,
						x: p.x,
						y: p.y,
					}))
				)
			)
	);

	/*
	 * COGC colours: the most common programs get the first slots
	 */
	const PALETTE_SIZE = 6;
	const programs = computed(() => {
		const count = new Map<PlanetCOGCProgramType, number>();
		for (const p of data.value.points) {
			const program = activeProgram(p.planet, props.ctx.now);
			if (program) count.set(program, (count.get(program) ?? 0) + 1);
		}
		return [...count.entries()]
			.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
			.map(([program]) => program);
	});
	const palette = computed(() => {
		const th = theme.value;
		// ponytail: 6 colours (positive/negative would repeat AI1/CI1 in the
		// colour-blind palette), rarer programs share the muted "other"
		return [
			th.exchange("AI1"),
			th.exchange("CI1"),
			th.exchange("IC1"),
			th.exchange("NC1"),
			th.warning,
			th.ink,
		];
	});
	function programColour(program: PlanetCOGCProgramType | null): string {
		const slot = program ? programs.value.indexOf(program) : -1;
		return slot >= 0 && slot < PALETTE_SIZE
			? palette.value[slot]
			: theme.value.muted;
	}
	const legend = computed(() => [
		...programs.value.slice(0, PALETTE_SIZE).map((p) => ({
			label: t(`game.cogc_program.${p}`),
			colour: programColour(p),
		})),
		{
			label:
				programs.value.length > PALETTE_SIZE
					? t("planet_search.chart.other_programs")
					: t("planet_search.chart.no_program"),
			colour: theme.value.muted,
		},
	]);

	/*
	 * Points
	 */
	const fertRange = computed(() => {
		const f = data.value.points.map((p) => fertilityPercent(p.planet) ?? 0);
		return { min: Math.min(...f), max: Math.max(...f) };
	});

	const points = computed((): IScatterPoint[] => {
		const { min, max } = fertRange.value;
		return data.value.points.map((p) => {
			const id = p.planet.planet_natural_id;
			const onFrontier = frontier.value.has(id);
			const fert = fertilityPercent(p.planet) ?? 0;
			return {
				key: id,
				label: name(p.planet),
				x: p.x,
				y: p.y,
				// without a material, Y already is fertility
				size: material.value
					? max > min
						? (fert - min) / (max - min)
						: 0.5
					: undefined,
				color:
					colourBy.value === "cogc"
						? programColour(activeProgram(p.planet, props.ctx.now))
						: onFrontier
							? theme.value.positive
							: theme.value.muted,
				ring: props.pins.includes(id),
				emphasis: onFrontier,
			};
		});
	});

	const byKey = computed(
		() =>
			new Map(data.value.points.map((p) => [p.planet.planet_natural_id, p]))
	);

	// ranked list: best Y first
	const ranked = computed(() =>
		[...data.value.points].sort((a, b) => b.y - a.y)
	);
	const maxY = computed(() => Math.max(...ranked.value.map((p) => p.y), 0));

	const yText = (y: number) =>
		material.value ? formatNumber(y, 2) : `${formatNumber(y, 0)} %`;

	function details(id: string) {
		const planet = byKey.value.get(id)!.planet;
		const fert = fertilityPercent(planet);
		const program = activeProgram(planet, props.ctx.now);
		return {
			fertility: fert === null ? "—" : `${formatNumber(fert, 0)} %`,
			infra:
				planetInfrastructure(planet).join(" · ") ||
				t("planet_search.results.no_infrastructure"),
			program: program ? t(`game.cogc_program.${program}`) : null,
		};
	}

	function select(id: string) {
		if (props.showPins) emit("pin", id);
	}

	// a visitor logs in first, as with the + of a row
	const userStore = useUserStore();
	const authPanel = useAuthPanel();
	function open(id: string) {
		if (!userStore.isLoggedIn) {
			const planet = props.planets.find((p) => p.planet_natural_id === id);
			authPanel.open("login", "planet_search_plan", {
				next: `/plan/${id}`,
				context: {
					planet: planet
						? planetDisplayName(id, planet.planet_name)
						: id,
					id,
				},
			});
			return;
		}
		window.open(router.resolve(`/plan/${id}`).href, "_blank", "noopener");
	}
</script>

<template>
	<div class="@container p-3 flex flex-col gap-3">
		<div class="flex flex-row flex-wrap items-center gap-x-6 gap-y-2">
			<div class="flex flex-row items-center gap-2">
				<span class="text-muted">{{ t("planet_search.chart.y") }}</span>
				<PSelect
					v-if="materials.length > 1"
					:value="material"
					class="w-28"
					size="sm"
					:aria-label="t('planet_search.chart.y_select')"
					:options="materials.map((m) => ({ label: m, value: m }))"
					@update:value="(v) => (picked = String(v))" />
				<span class="font-bold">{{ yTitle }}</span>
			</div>
			<div class="flex flex-row items-center gap-2">
				<span class="text-muted">{{ t("planet_search.chart.x") }}</span>
				<span class="font-bold">{{ xTitle }}</span>
			</div>
			<div class="flex flex-row items-center gap-2 @2xl:ml-auto">
				<span class="text-muted">
					{{ t("planet_search.chart.colour_by") }}
				</span>
				<PButtonGroup
					role="group"
					:aria-label="t('planet_search.chart.colour_by')">
					<PButton
						v-for="c in ['frontier', 'cogc'] as const"
						:key="c"
						size="sm"
						:pressed="colourBy === c"
						@click="colourBy = c">
						{{ t(`planet_search.chart.colour_${c}`) }}
					</PButton>
				</PButtonGroup>
			</div>
		</div>

		<ul
			class="flex flex-row flex-wrap gap-x-4 gap-y-1 text-sm text-muted"
			:aria-label="t('planet_search.chart.legend')">
			<template v-if="colourBy === 'frontier'">
				<li class="flex items-center gap-1.5">
					<span
						class="size-2.5 rounded-full"
						:style="{ background: theme.positive }" />
					{{ t("planet_search.chart.legend_frontier") }}
				</li>
				<li class="flex items-center gap-1.5">
					<span
						class="size-2.5 rounded-full"
						:style="{ background: theme.muted }" />
					{{ t("planet_search.chart.legend_other") }}
				</li>
			</template>
			<template v-else>
				<li
					v-for="l in legend"
					:key="l.label"
					class="flex items-center gap-1.5">
					<span
						class="size-2.5 rounded-full"
						:style="{ background: l.colour }" />
					{{ l.label }}
				</li>
			</template>
			<li class="flex items-center gap-1.5">
				<span class="size-2.5 rounded-full border-2 border-white" />
				{{ t("planet_search.chart.legend_pinned") }}
			</li>
		</ul>

		<div
			class="grid grid-cols-1 gap-3 @4xl:grid-cols-[minmax(0,1fr)_300px]">
			<div class="min-w-0 flex flex-col gap-2">
				<div class="h-[360px] sm:h-[480px]">
					<PScatter
						v-model:active="active"
						:points="points"
						:frontier="[...frontier]"
						:x-title="xTitle"
						:y-title="yTitle"
						:label="
							t('planet_search.chart.label', {
								x: xTitle,
								y: yTitle,
							})
						"
						@select="select"
						@open="open">
						<template #tooltip="{ point }">
							<dl
								class="grid grid-cols-[auto_auto] gap-x-4 gap-y-0.5 min-w-52">
								<dt class="font-bold">{{ point.label }}</dt>
								<dd class="font-mono text-muted text-right">
									{{ point.key }}
									<template v-if="point.ring">
										· {{ t("planet_search.chart.legend_pinned") }}
									</template>
								</dd>
								<dt class="text-muted">{{ yTitle }}</dt>
								<dd class="font-mono text-right">{{ yText(point.y) }}</dd>
								<dt class="text-muted">
									{{ t("planet_search.chart.tooltip_jumps", { target }) }}
								</dt>
								<dd class="font-mono text-right">{{ point.x }}</dd>
								<!-- Y already is fertility without a material -->
								<template v-if="material">
									<dt class="text-muted">
										{{ t("planet_search.chart.fertility") }}
									</dt>
									<dd class="font-mono text-right">
										{{ details(point.key).fertility }}
									</dd>
								</template>
								<dt class="text-muted">
									{{ t("planet_search.chart.tooltip_infra") }}
								</dt>
								<dd class="font-mono text-right">{{ details(point.key).infra }}</dd>
								<template v-if="details(point.key).program">
									<dt class="text-muted">
										{{ t("planet_search.chart.colour_cogc") }}
									</dt>
									<dd class="text-right">{{ details(point.key).program }}</dd>
								</template>
							</dl>
						</template>
					</PScatter>
				</div>

				<div class="flex flex-col gap-1 text-sm text-muted">
					<p v-if="data.capped">
						{{
							t("planet_search.chart.capped", {
								limit: CHART_LIMIT,
								total: data.capped,
							})
						}}
					</p>
					<p v-if="data.noRoute">
						{{
							t(
								"planet_search.chart.no_route",
								{ n: data.noRoute },
								data.noRoute
							)
						}}
					</p>
					<p v-if="data.noValue">
						{{
							material
								? t(
										"planet_search.chart.no_material",
										{ n: data.noValue, material },
										data.noValue
									)
								: t(
										"planet_search.chart.not_fertile",
										{ n: data.noValue },
										data.noValue
									)
						}}
					</p>
					<p>
						<template v-if="material && data.points.length">
							{{
								t("planet_search.chart.size", {
									min: formatNumber(fertRange.min, 0),
									max: formatNumber(fertRange.max, 0),
								})
							}}
							·
						</template>
						{{
							showPins
								? t("planet_search.chart.actions")
								: t("planet_search.chart.actions_touch")
						}}
					</p>
				</div>
			</div>

			<section
				class="min-w-0 border border-white/10 rounded flex flex-col"
				:aria-label="t('planet_search.chart.ranked', { y: yTitle })">
				<div
					class="px-3 py-2 border-b border-white/10 flex flex-row justify-between items-baseline gap-2">
					<h3 class="font-bold">
						{{ t("planet_search.chart.ranked", { y: yTitle }) }}
					</h3>
					<span class="text-xs text-muted text-right">
						{{ t("planet_search.chart.tooltip_jumps", { target }) }}
					</span>
				</div>
				<ol class="@4xl:max-h-[520px] @4xl:overflow-y-auto">
					<li
						v-for="p in ranked"
						:key="p.planet.planet_natural_id"
						:data-key="p.planet.planet_natural_id"
						class="px-3 py-1.5 min-h-11 grid grid-cols-[minmax(0,1fr)_4rem_auto_2rem_auto] items-center gap-2 border-b border-white/5"
						:class="{
							'bg-white/10': active === p.planet.planet_natural_id,
						}"
						@mouseenter="active = p.planet.planet_natural_id"
						@mouseleave="active = null"
						@focusin="active = p.planet.planet_natural_id"
						@focusout="active = null">
						<div class="min-w-0">
							<div class="font-bold truncate">{{ name(p.planet) }}</div>
							<div class="text-xs font-mono text-muted">
								{{ p.planet.planet_natural_id }}
							</div>
						</div>
						<div class="h-1.5 rounded-full bg-white/10">
							<div
								class="h-full rounded-full"
								:class="
									frontier.has(p.planet.planet_natural_id)
										? 'bg-positive'
										: 'bg-white/40'
								"
								:style="{
									width: `${maxY ? (p.y / maxY) * 100 : 0}%`,
								}" />
						</div>
						<span class="font-mono text-right">{{ yText(p.y) }}</span>
						<span class="font-mono text-right">{{ p.x }}</span>
						<PlanetSearchRowActions
							:planet="p.planet"
							:pinned="pins.includes(p.planet.planet_natural_id)"
							:show-pin="showPins"
							@pin="emit('pin', p.planet.planet_natural_id)" />
					</li>
				</ol>
			</section>
		</div>
	</div>
</template>
