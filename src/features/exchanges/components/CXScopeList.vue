<script setup lang="ts">
	import { computed, ref } from "vue";
	import { useI18n } from "vue-i18n";

	// Composables
	import { usePlanetData } from "@/database/services/usePlanetData";

	// Util
	import {
		ALL_PLANETS,
		planetsWithRules,
	} from "@/features/exchanges/cxEdit.util";
	import { toRows } from "@/features/exchanges/fixedPrices.util";

	// Types & Interfaces
	import type { CX, CXData } from "@/features/api/schemas/cxData.schemas";
	import type { Plan } from "@/features/api/schemas/planningData.schemas";
	import type { PlanEmpireElement } from "@/features/api/schemas/empireData.schemas";
	import type { IExchangeNote } from "@/features/exchanges/exchangeNotes.util";
	import type { PSelectOption } from "@/ui/ui.types";

	// UI
	import { PButton, PInput, PSelect, PTag } from "@/ui";
	import { ClearSharp } from "@vicons/material";

	/*
	 * The scopes of a preference: Overview, All planets, planets with their
	 * own rules, planets using the all-planets rules (grouped by empire when
	 * several use it), other empires' planets on request and planets with
	 * rules but no plan, with a filter once there are many. A "Rules for"
	 * select below 1024 px.
	 */
	const scope = defineModel<string | undefined>("scope", { required: true });
	const includeOthers = defineModel<boolean>("includeOthers", {
		required: true,
	});

	const { cx, cxData, notes, plans, empires } = defineProps<{
		// as loaded, for the empires using it
		cx: CX;
		// the rules as edited
		cxData: CXData;
		notes: IExchangeNote[];
		// every plan and empire of the player
		plans: Plan[];
		empires: PlanEmpireElement[];
	}>();

	const emit = defineEmits<{
		(e: "delete", planet: string): void;
	}>();

	const { t } = useI18n();
	const { planetName } = usePlanetData();

	const OVERVIEW = "overview";

	const planned = computed(
		() => new Set(plans.map((p) => p.planet_natural_id))
	);
	const withRules = computed(() => planetsWithRules(cxData).sort());
	const own = computed(() =>
		withRules.value.filter((p) => planned.value.has(p))
	);
	const unplanned = computed(() =>
		withRules.value.filter((p) => !planned.value.has(p))
	);

	// planets of the given empires, each once and without own rules
	function planetsOf(list: { plans: { planet_natural_id: string }[] }[]) {
		const seen = new Set(withRules.value);
		return list.map((e) => {
			const planets = [
				...new Set(e.plans.map((p) => p.planet_natural_id)),
			].filter((p) => !seen.has(p));
			planets.forEach((p) => seen.add(p));
			return planets.sort();
		});
	}

	const linked = computed(() => {
		const lists = planetsOf(cx.empires);
		return cx.empires
			.map((e, i) => ({ name: e.empire_name, planets: lists[i] }))
			.filter((g) => g.planets.length > 0);
	});

	const others = computed(() => {
		const linkedUuids = new Set(cx.empires.map((e) => e.uuid));
		const all = [...cx.empires, ...empires];
		const lists = planetsOf(all);
		return [
			...new Set(
				all.flatMap((e, i) => (linkedUuids.has(e.uuid) ? [] : lists[i]))
			),
		].sort();
	});

	// Counts
	const rulesOf = (exchanges: unknown[], tickers: CXData["ticker_empire"]) =>
		exchanges.length + toRows(tickers).length;
	const allCount = computed(() =>
		rulesOf(cxData.cx_empire, cxData.ticker_empire)
	);
	const planetCount = (planet: string) =>
		rulesOf(
			cxData.cx_planets.find((p) => p.planet === planet)?.preferences ?? [],
			cxData.ticker_planets.find((p) => p.planet === planet)
				?.preferences ?? []
		);
	const warned = computed(
		() =>
			new Set(
				notes.filter((n) => n.kind === "warning").map((n) => n.scope)
			)
	);
	const tagType = (s: string) =>
		warned.value.has(s) ? "warning" : "secondary";

	const name = (planet: string) => planetName(planet, planet);

	// the planet filter shows from this many planets
	const FILTER_FROM = 10;
	const filter = ref("");
	const showFilter = computed(
		() =>
			own.value.length +
				linked.value.reduce((n, g) => n + g.planets.length, 0) +
				(includeOthers.value ? others.value.length : 0) +
				unplanned.value.length >=
			FILTER_FROM
	);
	const shown = (planets: string[]) => {
		const q = filter.value.trim().toLowerCase();
		return q
			? planets.filter(
					(p) =>
						p.toLowerCase().includes(q) || name(p).toLowerCase().includes(q)
				)
			: planets;
	};
	const countTitle = (n: number) => t("exchanges.scopes.rules_count", { n }, n);

	// "Rules for" below 1024 px
	const selectValue = computed({
		get: () => scope.value ?? OVERVIEW,
		set: (v) => (scope.value = v === OVERVIEW ? undefined : v),
	});
	const selectOptions = computed<PSelectOption[]>(() => {
		const planets = (label: string, list: string[]) =>
			list.length
				? [
						{
							label,
							value: label,
							children: list.map((p) => ({ label: name(p), value: p })),
						},
					]
				: [];
		return [
			{ label: t("exchanges.scopes.overview"), value: OVERVIEW },
			{ label: t("exchanges.scopes.all"), value: ALL_PLANETS },
			...planets(t("exchanges.scopes.own"), own.value),
			...planets(
				t("exchanges.scopes.inherit"),
				linked.value.flatMap((g) => g.planets)
			),
			...planets(
				t("exchanges.scopes.others"),
				includeOthers.value ? others.value : []
			),
			...planets(t("exchanges.scopes.unplanned"), unplanned.value),
		];
	});

	const itemClass = (s: string | undefined) =>
		[
			"w-full flex items-center justify-between gap-3 px-3 py-2 rounded-md text-left cursor-pointer hover:bg-white/5",
			scope.value === s ? "bg-white/10" : "",
		].join(" ");
</script>

<template>
	<nav :aria-label="$t('exchanges.scopes.label')">
		<PSelect
			v-model:value="selectValue"
			class="lg:hidden w-full"
			:aria-label="$t('exchanges.scopes.label')"
			:options="selectOptions" />

		<div class="hidden lg:flex flex-col gap-1">
			<button
				type="button"
				:class="itemClass(undefined)"
				:aria-current="scope === undefined ? 'page' : undefined"
				@click="scope = undefined">
				<span class="flex flex-col">
					<span>{{ $t("exchanges.scopes.overview") }}</span>
					<span class="text-xs text-muted">
						{{ $t("exchanges.scopes.overview_hint") }}
					</span>
				</span>
			</button>
			<button
				type="button"
				:class="itemClass(ALL_PLANETS)"
				:aria-current="scope === ALL_PLANETS ? 'page' : undefined"
				@click="scope = ALL_PLANETS">
				<span class="flex flex-col">
					<span>{{ $t("exchanges.scopes.all") }}</span>
					<span class="text-xs text-muted">
						{{ $t("exchanges.scopes.all_hint") }}
					</span>
				</span>
				<PTag
					size="sm"
					:type="tagType(ALL_PLANETS)"
					:title="countTitle(allCount)"
					:value="String(allCount)" />
			</button>

			<PInput
				v-if="showFilter"
				v-model:value="filter"
				class="mt-3"
				size="sm"
				:aria-label="$t('exchanges.scopes.filter')"
				:placeholder="$t('exchanges.scopes.filter')" />

			<template v-if="shown(own).length">
				<h3 class="px-3 pt-4 pb-1 text-xs text-muted">
					{{ $t("exchanges.scopes.own") }}
				</h3>
				<button
					v-for="planet in shown(own)"
					:key="planet"
					type="button"
					:class="itemClass(planet)"
					:aria-current="scope === planet ? 'page' : undefined"
					@click="scope = planet">
					<span>{{ name(planet) }}</span>
					<PTag
						size="sm"
						:type="tagType(planet)"
						:title="countTitle(planetCount(planet))"
						:value="String(planetCount(planet))" />
				</button>
			</template>

			<template v-if="linked.some((g) => shown(g.planets).length)">
				<h3 class="px-3 pt-4 pb-1 text-xs text-muted">
					{{ $t("exchanges.scopes.inherit") }}
				</h3>
				<template v-for="group in linked" :key="group.name">
					<h4
						v-if="cx.empires.length > 1 && shown(group.planets).length"
						class="px-3 pt-1 text-xs text-muted">
						{{ group.name }}
					</h4>
					<button
						v-for="planet in shown(group.planets)"
						:key="planet"
						type="button"
						:class="itemClass(planet)"
						:aria-current="scope === planet ? 'page' : undefined"
						@click="scope = planet">
						{{ name(planet) }}
					</button>
				</template>
			</template>

			<template v-if="includeOthers && shown(others).length">
				<h3 class="px-3 pt-4 pb-1 text-xs text-muted">
					{{ $t("exchanges.scopes.others") }}
				</h3>
				<button
					v-for="planet in shown(others)"
					:key="planet"
					type="button"
					:class="itemClass(planet)"
					:aria-current="scope === planet ? 'page' : undefined"
					@click="scope = planet">
					{{ name(planet) }}
				</button>
			</template>

			<template v-if="shown(unplanned).length">
				<h3 class="px-3 pt-4 pb-1 text-xs text-muted">
					{{ $t("exchanges.scopes.unplanned") }}
				</h3>
				<div
					v-for="planet in shown(unplanned)"
					:key="planet"
					class="flex items-center gap-1">
					<button
						type="button"
						:class="itemClass(planet)"
						:aria-current="scope === planet ? 'page' : undefined"
						@click="scope = planet">
						<span>{{ name(planet) }}</span>
						<PTag
							size="sm"
							:type="tagType(planet)"
							:title="countTitle(planetCount(planet))"
							:value="String(planetCount(planet))" />
					</button>
					<PButton
						type="ghost"
						size="sm"
						:aria-label="
							$t('exchanges.scopes.delete', { planet: name(planet) })
						"
						@click="emit('delete', planet)">
						<template #icon><ClearSharp /></template>
					</PButton>
				</div>
			</template>
		</div>

		<PButton
			v-if="others.length"
			class="mt-3"
			type="ghost"
			size="sm"
			@click="includeOthers = !includeOthers">
			{{
				includeOthers
					? $t("exchanges.scopes.hide_others")
					: $t("exchanges.scopes.show_others", { n: others.length })
			}}
		</PButton>
	</nav>
</template>
