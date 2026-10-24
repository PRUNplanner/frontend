<script setup lang="ts">
	import { computed, defineAsyncComponent, ref, type Ref } from "vue";
	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Components
	import HelpDrawer from "@/features/help/components/HelpDrawer.vue";
	import ChainTargets from "@/features/production_chain/components/ChainTargets.vue";
	import ChainSettings from "@/features/production_chain/components/ChainSettings.vue";
	import ChainResults from "@/features/production_chain/components/ChainResults.vue";
	import ChainPanel from "@/features/production_chain/components/ChainPanel.vue";
	import ChainBuyList from "@/features/production_chain/components/ChainBuyList.vue";
	import ChainFootprint from "@/features/production_chain/components/ChainFootprint.vue";
	// opens on demand; it brings the jump map along
	const ChainPlanetPicker = defineAsyncComponent(
		() => import("@/features/production_chain/components/ChainPlanetPicker.vue")
	);
	const ChainBases = defineAsyncComponent(
		() => import("@/features/production_chain/components/ChainBases.vue")
	);
	const ChainBasePlanetPicker = defineAsyncComponent(
		() =>
			import("@/features/production_chain/components/ChainBasePlanetPicker.vue")
	);
	const ChainCreatePlans = defineAsyncComponent(
		() => import("@/features/production_chain/components/ChainCreatePlans.vue")
	);

	// API
	import { useQuery } from "@/lib/query_cache/useQuery";

	// Composables
	import { useProductionChain } from "@/features/production_chain/useProductionChain";
	import { useMaterialData } from "@/database/services/useMaterialData";

	// Engine
	import { extractionUnitCost } from "@/features/production_chain/engine/chainSolver";
	import { SEARCH_CX } from "@/features/planet_search/planetSearch.engine";

	// Util
	import { copyToClipboard } from "@/util/data";
	import { formatMaterialName } from "@/util/text";

	// Types & Interfaces
	import type {
		ChainByproductMode,
		ChainRawSource,
		IChainExtractionSite,
		IChainTarget,
	} from "@/features/production_chain/engine/chainSolver.types";
	import type { PlanetSearchCX } from "@/features/planet_search/planetSearch.schemas";

	// UI
	import { PButton, useToast } from "@/ui";

	const toast = useToast();
	const { materials } = useMaterialData();
	const {
		input,
		cxUuid,
		cxFromLink,
		result,
		ctx,
		index,
		indexLoading,
		indexError,
		loadIndex,
		setSource,
		setRecipe,
		setPlanet,
		buyAll,
		restoreSources,
		addBase,
		removeBase,
		moveTo,
		updateBase,
		split,
		created,
		createPlans,
		recipeOptions,
		chainLink,
		track,
	} = useProductionChain();

	// a two-way binding to one input field
	function field<K extends keyof typeof input.value>(key: K) {
		return computed({
			get: () => input.value[key],
			set: (v) => (input.value = { ...input.value, [key]: v }),
		});
	}
	const targets = field("targets") as Ref<IChainTarget[]>;
	const efficiency = field("efficiency") as Ref<number>;
	const rawSource = field("rawSource") as Ref<ChainRawSource>;
	const byproducts = field("byproducts") as Ref<ChainByproductMode>;

	/** materials that can be produced: with a recipe or a planet resource */
	const targetOptions = computed(() =>
		(materials.value ?? [])
			.filter(
				(m) =>
					ctx.value.recipesByOutput.has(m.ticker) ||
					ctx.value.resources.has(m.ticker)
			)
			.map((m) => ({
				label: `${m.ticker} · ${formatMaterialName(m.name, m.ticker)}`,
				value: m.ticker,
			}))
			.sort((a, b) => a.value.localeCompare(b.value))
	);

	function copyLink(): void {
		copyToClipboard(chainLink());
		toast(t("production_chains.header.link_copied"));
		track("link_copy");
	}

	function onBuyAll(tickers: string[]): void {
		const before = { ...input.value.source };
		buyAll(tickers);
		toast(t("production_chains.filter.bought", tickers.length), {
			action: {
				label: t("production_chains.filter.undo"),
				onClick: () => restoreSources(before),
			},
		});
	}

	// planet picker
	const planetTicker: Ref<string | null> = ref(null);
	const showPlanets = ref(false);

	function openPlanets(ticker: string): void {
		planetTicker.value = ticker;
		showPlanets.value = true;
		loadIndex();
	}

	const planetCX = computed<PlanetSearchCX>(() => {
		const cx = planetTicker.value
			? result.value.rows[planetTicker.value]?.exchange
			: null;
		return SEARCH_CX.includes(cx as PlanetSearchCX)
			? (cx as PlanetSearchCX)
			: "AI1";
	});

	function onSplit(): void {
		split((e) =>
			e
				? t(`game.expertise.${e}`)
				: t("production_chains.bases.unnamed", { id: "A" })
		);
		toast(t("production_chains.bases.split_done", input.value.bases.length));
	}

	// planet picker per base
	const planetBase: Ref<string | null> = ref(null);
	const showBasePlanets = ref(false);
	const myPlanets: Ref<ReadonlySet<string>> = ref(new Set());

	async function openBasePlanets(id: string): Promise<void> {
		planetBase.value = id;
		showBasePlanets.value = true;
		loadIndex();
		try {
			const plans = await useQuery("GetAllPlans").execute();
			myPlanets.value = new Set(plans.map((p) => p.planet_natural_id));
		} catch {
			// no badges without the plan list
		}
	}

	/** the exchange most rows are priced on */
	const cxCode = computed(() => {
		const counts = new Map<string, number>();
		for (const t of result.value.order) {
			const cx = result.value.rows[t].exchange;
			if (cx) counts.set(cx, (counts.get(cx) ?? 0) + 1);
		}
		return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0];
	});
	const baseCX = computed<PlanetSearchCX>(() =>
		SEARCH_CX.includes(cxCode.value as PlanetSearchCX)
			? (cxCode.value as PlanetSearchCX)
			: "AI1"
	);

	// create plans
	const showCreate = ref(false);
	/** bases with steps have a planet and fit */
	const createReady = computed(() =>
		result.value.bases
			.filter((b) => b.materials.length)
			.every((b) => b.planet && !b.overArea)
	);

	const unitCost = (site: IChainExtractionSite) =>
		extractionUnitCost(ctx.value, site, input.value.efficiency);
	const buyPrice = (ticker: string) => ctx.value.prices.getPrice(ticker, "BUY");
</script>

<template>
	<!-- @container: the aside goes beside the panel only when the page leaves the Steps table room -->
	<div class="@container min-h-screen flex flex-col gap-6 px-6 py-3">
		<header class="flex flex-wrap justify-between gap-3 border-b border-line pb-3">
			<div>
				<h1 class="text-2xl font-bold">{{ $t("production_chains.title") }}</h1>
				<p class="text-muted">{{ $t("production_chains.description") }}</p>
			</div>
			<div class="flex flex-wrap items-center gap-3">
				<PButton
					type="secondary"
					:disabled="!targets.length"
					@click="copyLink">
					{{ $t("production_chains.header.copy_link") }}
				</PButton>
				<PButton
					:type="targets.length && createReady ? 'primary' : 'secondary'"
					:disabled="!targets.length"
					data-testid="chain-create-plans"
					@click="showCreate = true">
					{{ $t("production_chains.header.create_plans") }}
				</PButton>
				<HelpDrawer file-name="tools_production_chain" />
			</div>
		</header>

		<div class="flex flex-col gap-3">
			<ChainTargets v-model:targets="targets" :options="targetOptions" />
			<ChainSettings
				v-model:efficiency="efficiency"
				v-model:raw-source="rawSource"
				v-model:byproducts="byproducts"
				v-model:cx-uuid="cxUuid"
				:follow-default="!cxFromLink" />
		</div>

		<div
			v-if="!targets.length"
			class="flex-1 flex flex-col items-center justify-center text-center gap-2 py-24"
			data-testid="chain-empty">
			<h2 class="text-xl font-bold">{{ $t("production_chains.empty.title") }}</h2>
			<p class="text-muted max-w-md">{{ $t("production_chains.empty.text") }}</p>
		</div>

		<template v-else>
			<ChainResults :totals="result.totals" />
			<div
				v-if="indexLoading || indexError"
				class="text-xs"
				:class="indexError ? 'text-negative' : 'text-muted'"
				role="status">
				<template v-if="indexError">
					{{ $t("production_chains.panel.planets_error") }}
					<button type="button" class="text-link hover:underline cursor-pointer" @click="loadIndex">
						{{ $t("production_chains.panel.retry") }}
					</button>
				</template>
				<template v-else>{{ $t("production_chains.panel.loading_planets") }}</template>
			</div>
			<div class="grid grid-cols-1 @min-[1600px]:grid-cols-[minmax(0,1fr)_20rem] gap-6 items-start">
				<ChainPanel
					:result="result"
					:byproduct-mode="input.byproducts"
					:extraction="ctx.extraction"
					:recipe-options="recipeOptions"
					:bases="input.bases"
					@base="moveTo"
					@source="setSource"
					@recipe="setRecipe"
					@planet="openPlanets"
					@buy-all="onBuyAll"
					@track="track">
					<template #bases>
						<ChainBases
							:result="result"
							:bases="input.bases"
							:efficiency="input.efficiency"
							:ctx="ctx"
							:created="created"
							:ready="createReady"
							@split="onSplit"
							@add="addBase"
							@remove="removeBase"
							@rename="(id, name) => updateBase(id, { name })"
							@cogc="(id, cogc) => updateBase(id, { cogc })"
							@planet="openBasePlanets"
							@create="showCreate = true" />
					</template>
				</ChainPanel>
				<!-- @container: its columns follow its own width, beside the panel or below it -->
				<aside class="@container min-w-0">
					<div class="grid gap-3 items-start grid-cols-1 @2xl:grid-cols-2 @5xl:grid-cols-3">
						<ChainBuyList :result="result" @xit="track('xit_copy')" />
						<ChainFootprint
							:totals="result.totals"
							:building-types="result.buildingTypes"
							:prices="buyPrice" />
					</div>
				</aside>
			</div>
		</template>

		<ChainPlanetPicker
			v-if="planetTicker"
			v-model:show="showPlanets"
			:ticker="planetTicker"
			:index="index"
			:options="ctx.extraction?.get(planetTicker)"
			:planet-id="input.planetId[planetTicker]"
			:loading="indexLoading"
			:error="indexError"
			:unit-cost="unitCost"
			:default-c-x="planetCX"
			@use="(id) => setPlanet(planetTicker!, id)" />
		<!-- keyed: each base's picker starts with fresh filters -->
		<ChainBasePlanetPicker
			v-if="planetBase"
			:key="planetBase"
			v-model:show="showBasePlanets"
			:base-id="planetBase"
			:result="result"
			:input="input"
			:ctx="ctx"
			:index="index"
			:loading="indexLoading"
			:error="indexError"
			:default-c-x="baseCX"
			:my-planets="myPlanets"
			@use="(id) => updateBase(planetBase!, { planetId: id })" />
		<ChainCreatePlans
			v-if="showCreate"
			v-model:show="showCreate"
			:result="result"
			:targets="targets.map((x) => x.ticker)"
			:create="createPlans" />
	</div>
</template>
