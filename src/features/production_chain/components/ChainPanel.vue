<script setup lang="ts">
	import { computed, defineAsyncComponent, ref, type Ref } from "vue";
	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Components
	import ChainStepsTable from "@/features/production_chain/components/ChainStepsTable.vue";
	const ChainGraph = defineAsyncComponent(
		() => import("@/features/production_chain/components/ChainGraph.vue")
	);

	// Util
	import {
		chainCsv,
		NO_OWN,
	} from "@/features/production_chain/productionChain.util";

	// Types & Interfaces
	import type {
		ChainByproductMode,
		ChainHave,
		ChainSource,
		IChainBase,
		IChainExtractionOptions,
		IChainRecipeEffect,
		IChainResult,
	} from "@/features/production_chain/engine/chainSolver.types";
	import type {
		IChainFilter,
		IChainLineMode,
		IChainOrder,
		IChainOwn,
		IChainView,
	} from "@/features/production_chain/productionChain.types";
	import type { ProductionChainAction } from "@/lib/analytics/useAnalytics.types";

	// UI
	import { PButton, PSegmented } from "@/ui";

	const {
		result,
		byproductMode,
		extraction,
		recipeOptions,
		bases,
		own = NO_OWN,
	} =
		defineProps<{
			result: IChainResult;
			byproductMode: ChainByproductMode;
			extraction: ReadonlyMap<string, IChainExtractionOptions> | undefined;
			recipeOptions: (ticker: string) => IChainRecipeEffect[];
			bases: IChainBase[];
			own?: IChainOwn;
		}>();

	const emit = defineEmits<{
		(e: "source", ticker: string, source: ChainSource): void;
		(e: "recipe", ticker: string, recipeId: string): void;
		(e: "planet", ticker: string): void;
		(e: "buyAll", tickers: string[]): void;
		(e: "track", action: ProductionChainAction): void;
		(e: "base", ticker: string, id: string): void;
		(e: "have", ticker: string, value: ChainHave | "off" | undefined): void;
	}>();

	defineSlots<{
		/** the Bases tab */
		bases(): unknown;
	}>();

	const view: Ref<IChainView> = ref("steps");
	const order: Ref<IChainOrder> = ref("chain");
	const filter: Ref<IChainFilter | null> = ref(null);
	const lines: Ref<IChainLineMode> = ref("t");
	const focus: Ref<string | null> = ref(null);
	const graph = ref<{ fit: () => void; zoomBy: (d: 1 | -1) => void } | null>(
		null
	);

	const made = computed(
		() => result.order.filter((t) => result.rows[t].source === "make").length
	);
	const cheaper = computed(() => result.warnings.cheaper.length);
	const thin = computed(() => result.warnings.thin.length);
	/** steps a base's planet can't run as planned */
	const baseWarnings = computed(
		() =>
			result.order.filter(
				(t) => result.rows[t].noFarming || result.rows[t].notOnPlanet
			).length
	);

	const orderOptions = computed(() => [
		{ value: "chain" as const, label: t("production_chains.panel.chain") },
		{ value: "source" as const, label: t("production_chains.panel.by_source") },
	]);
	const lineOptions = computed(() => [
		{ value: "t" as const, label: t("production_chains.panel.lines_t") },
		{ value: "c" as const, label: t("production_chains.panel.lines_c") },
		{ value: "n" as const, label: t("production_chains.panel.lines_n") },
	]);

	function setView(next: IChainView): void {
		view.value = next;
		if (next === "graph") emit("track", "view_graph");
	}

	function toggleFilter(next: IChainFilter): void {
		filter.value = filter.value === next ? null : next;
		view.value = "steps";
	}

	function buyAll(tickers: string[]): void {
		emit("buyAll", tickers);
		filter.value = null;
	}

	function downloadCsv(): void {
		const csv = chainCsv(
			result,
			[
				t("production_chains.csv.material"),
				t("production_chains.csv.per_day"),
				t("production_chains.csv.source"),
				t("production_chains.csv.recipe"),
				t("production_chains.csv.building"),
				t("production_chains.csv.buildings"),
				t("production_chains.csv.unit_cost"),
				t("production_chains.csv.cx_price"),
				t("production_chains.csv.have_per_day"),
			],
			(s) => t(`production_chains.table.${s}`),
			t("production_chains.table.nothing")
		);
		const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
		const a = document.createElement("a");
		a.href = url;
		a.download = "production-chain.csv";
		a.click();
		URL.revokeObjectURL(url);
		emit("track", "csv");
	}
</script>

<template>
	<section class="rounded-panel border border-line min-w-0">
		<div
			class="flex flex-wrap items-center justify-between gap-3 px-3 border-b border-line">
			<div class="flex flex-wrap items-center gap-x-4 gap-y-2">
				<nav :aria-label="t('production_chains.panel.views')" class="flex gap-x-1">
					<button
						v-for="v in ['steps', 'graph', 'bases'] as const"
						:key="v"
						type="button"
						:aria-pressed="view === v ? 'true' : 'false'"
						class="px-3 py-2 -mb-px border-b-2 cursor-pointer hover:text-ink-strong"
						:class="
							view === v
								? 'border-prunplanner text-ink-strong font-bold'
								: 'border-transparent text-muted-strong'
						"
						@click="setView(v)">
						{{ $t(`production_chains.panel.${v}`) }}
					</button>
				</nav>
				<span class="text-xs text-muted">
					{{
						$t("production_chains.panel.summary", {
							materials: result.order.length,
							made,
						})
					}}
				</span>
				<span
					v-if="result.totals.ownCount"
					class="px-2 rounded-control border border-have text-have text-xs"
					data-testid="chain-chip-have">
					{{ $t("production_chains.have.chip", { n: result.totals.ownCount }) }}
				</span>
				<PButton
					v-if="cheaper"
					size="sm"
					type="warning"
					:pressed="filter === 'cheaper'"
					data-testid="chain-chip-cheaper"
					@click="toggleFilter('cheaper')">
					{{ $t("production_chains.panel.cheaper", { n: cheaper }) }}
				</PButton>
				<PButton
					v-if="thin"
					size="sm"
					type="warning"
					:pressed="filter === 'thin'"
					data-testid="chain-chip-thin"
					@click="toggleFilter('thin')">
					{{ $t("production_chains.panel.thin", thin) }}
				</PButton>
				<PButton
					v-if="baseWarnings"
					size="sm"
					type="warning"
					data-testid="chain-chip-bases"
					@click="setView('bases')">
					{{ $t("production_chains.panel.base_warnings", baseWarnings) }}
				</PButton>
				<span
					v-if="!cheaper && !thin && !baseWarnings"
					class="px-2 rounded-control border border-positive text-positive text-xs">
					{{ $t("production_chains.panel.no_warnings") }}
				</span>
				<span
					v-if="result.warnings.cycles.length"
					class="text-xs text-warning">
					{{
						$t("production_chains.panel.cycles", {
							list: result.warnings.cycles.join(", "),
						})
					}}
				</span>
			</div>
			<div class="flex flex-wrap items-center gap-2 py-2">
				<template v-if="view === 'steps'">
					<PSegmented
						v-model:value="order"
						:options="orderOptions"
						size="sm"
						:label="t('production_chains.panel.order')" />
					<PButton size="sm" type="secondary" @click="downloadCsv">
						{{ $t("production_chains.panel.csv") }}
					</PButton>
				</template>
				<template v-else-if="view === 'graph'">
					<span class="text-xs text-muted">{{ $t("production_chains.panel.lines") }}</span>
					<PSegmented
						v-model:value="lines"
						:options="lineOptions"
						size="sm"
						:label="t('production_chains.panel.line_width')" />
					<div role="group" :aria-label="t('production_chains.panel.zoom')" class="flex gap-1">
						<PButton
							size="sm"
							type="secondary"
							:aria-label="t('production_chains.panel.zoom_out')"
							@click="graph?.zoomBy(-1)">
							−
						</PButton>
						<PButton size="sm" type="secondary" @click="graph?.fit()">
							{{ $t("production_chains.panel.fit") }}
						</PButton>
						<PButton
							size="sm"
							type="secondary"
							:aria-label="t('production_chains.panel.zoom_in')"
							@click="graph?.zoomBy(1)">
							+
						</PButton>
					</div>
				</template>
			</div>
		</div>
		<ChainStepsTable
			v-if="view === 'steps'"
			:result="result"
			:order="order"
			:filter="filter"
			:byproduct-mode="byproductMode"
			:extraction="extraction"
			:recipe-options="recipeOptions"
			:bases="bases"
			:own="own"
			@source="(ticker, s) => emit('source', ticker, s)"
			@recipe="(ticker, id) => emit('recipe', ticker, id)"
			@planet="(ticker) => emit('planet', ticker)"
			@buy-all="buyAll"
			@clear-filter="filter = null"
			@base="(ticker, id) => emit('base', ticker, id)"
			@have="(ticker, v) => emit('have', ticker, v)" />
		<slot v-else-if="view === 'bases'" name="bases" />
		<ChainGraph
			v-else
			ref="graph"
			v-model:focus="focus"
			:result="result"
			:lines="lines"
			:own="own"
			@focused="emit('track', 'focus')" />
	</section>
</template>
