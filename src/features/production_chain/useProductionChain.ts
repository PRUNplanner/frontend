import {
	computed,
	onScopeDispose,
	ref,
	shallowRef,
	toRaw,
	watch,
	type ComputedRef,
	type Ref,
	type ShallowRef,
} from "vue";
import { useRoute, useRouter } from "vue-router";

// API
import { useQuery } from "@/lib/query_cache/useQuery";

// Composables
import { usePlanContext } from "@/features/planning/usePlanContext";
import { useExchangeData } from "@/database/services/useExchangeData";
import { useCXData } from "@/features/cx/useCXData";
import { trackEvent } from "@/lib/analytics/useAnalytics";

// Engine
import {
	groupRecipesByOutput,
	recipeEffects,
	solveChain,
} from "@/features/production_chain/engine/chainSolver";
import { extractionOptions } from "@/features/production_chain/engine/chainExtraction";
import {
	decodeChain,
	DEFAULT_EFFICIENCY,
	encodeChain,
	type IChainState,
} from "@/features/production_chain/engine/chainUrl";
import { RESOURCE_MATERIAL_OPTIONS } from "@/features/resource_roi_overview/resourceROIOverview.constants";

// Schemas
import { ChainStorageSchema } from "@/features/production_chain/productionChain.schemas";

// Types & Interfaces
import type { PlanetSearchIndexEntry } from "@/features/api/schemas/gameData.schemas";
import type { ProductionChainAction } from "@/lib/analytics/useAnalytics.types";
import type {
	ChainSource,
	IChainContext,
	IChainInput,
	IChainRecipeEffect,
	IChainResult,
} from "@/features/production_chain/engine/chainSolver.types";

const STORAGE_KEY = "prunplanner_production_chain";
const TRACK_DELAY_MS = 1000;
const RESOURCES: ReadonlySet<string> = new Set(
	RESOURCE_MATERIAL_OPTIONS.map((o) => o.value)
);

function readStored(): IChainState | null {
	try {
		const parsed = ChainStorageSchema.safeParse(
			JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null")
		);
		return parsed.success ? decodeChain(parsed.data) : null;
	} catch {
		// storage blocked or corrupt: no last chain
		return null;
	}
}

function writeStored(state: IChainState): void {
	try {
		if (state.input.targets.length)
			localStorage.setItem(STORAGE_KEY, JSON.stringify(encodeChain(state)));
		else localStorage.removeItem(STORAGE_KEY);
	} catch {
		// storage blocked or full: the URL still holds the chain
	}
}

function emptyInput(): IChainInput {
	return {
		targets: [],
		efficiency: DEFAULT_EFFICIENCY,
		rawSource: "buy",
		byproducts: "cover",
		source: {},
		recipeId: {},
		planetId: {},
	};
}

/**
 * The production chain page's state: targets, settings and per-material
 * choices, kept in the URL and the browser; the solved chain; the planet
 * index for extraction, loaded only when something extracts.
 * @author jplacht
 */
export function useProductionChain() {
	const route = useRoute();
	const router = useRouter();
	const { getGameData, createPrices } = usePlanContext();
	const { getExchangeTickerLoaded } = useExchangeData();

	const initial = decodeChain(route.query) ?? readStored();
	// a CX from a link only counts when it is one of the viewer's
	const ownCX = useCXData()
		.getPreferenceOptions()
		.map((o) => o.value);
	const linkCX =
		initial?.cx && ownCX.includes(initial.cx) ? initial.cx : undefined;

	const input: Ref<IChainInput> = ref(initial?.input ?? emptyInput());
	const cxUuid: Ref<string | undefined> = ref(linkCX);
	/** the CX came from the link, so it wins over the user's default */
	const cxFromLink: boolean = linkCX !== undefined;

	const index: ShallowRef<PlanetSearchIndexEntry[] | null> = shallowRef(null);
	const indexLoading: Ref<boolean> = ref(false);
	const indexError: Ref<boolean> = ref(false);

	async function loadIndex(): Promise<void> {
		if (index.value || indexLoading.value) return;
		indexLoading.value = true;
		indexError.value = false;
		try {
			// a cache hit returns the query store's reactive copy
			index.value = toRaw(
				await useQuery("GetPlanetSearchIndex").execute()
			);
		} catch {
			indexError.value = true;
		} finally {
			indexLoading.value = false;
		}
	}

	const gameData = computed(() => getGameData());
	const recipesByOutput = computed(() =>
		groupRecipesByOutput(
			Object.values(gameData.value.recipesByBuilding).flat()
		)
	);
	const extraction = computed(() =>
		index.value ? extractionOptions(index.value) : undefined
	);

	const ctx: ComputedRef<IChainContext> = computed(() => ({
		recipesByOutput: recipesByOutput.value,
		buildings: gameData.value.buildings,
		materials: gameData.value.materials,
		prices: createPrices("", cxUuid.value),
		getExchange: getExchangeTickerLoaded,
		resources: RESOURCES,
		extraction: extraction.value,
	}));

	const result: ComputedRef<IChainResult> = computed(() =>
		solveChain(input.value, ctx.value)
	);

	// extraction needs the planet index
	watch(
		() => result.value.order.some((t) => result.value.rows[t].pending),
		(pending) => pending && loadIndex(),
		{ immediate: true }
	);

	const state = computed<IChainState>(() => ({
		input: input.value,
		cx: cxUuid.value,
	}));

	watch(
		state,
		(value) => {
			router.replace({ query: encodeChain(value) });
			writeStored(value);
		},
		{ deep: true }
	);

	// tool:use for changes, not for the chain the page opened with
	let trackTimer: ReturnType<typeof setTimeout> | undefined;
	watch(
		input,
		(value) => {
			clearTimeout(trackTimer);
			if (!value.targets.length) return;
			trackTimer = setTimeout(
				() =>
					trackEvent("tool:use", {
						tool_name: "production_chain",
						targets: value.targets.map((t) => t.ticker),
						target_count: value.targets.length,
						material_count: result.value.order.length,
						efficiency: value.efficiency,
						raw_source: value.rawSource,
						byproducts: value.byproducts,
					}),
				TRACK_DELAY_MS
			);
		},
		{ deep: true }
	);
	onScopeDispose(() => clearTimeout(trackTimer));

	function track(action: ProductionChainAction): void {
		trackEvent("production_chain:action", { action });
	}

	/** a per-ticker override; undefined removes it */
	function setOverride<K extends "source" | "recipeId" | "planetId">(
		key: K,
		ticker: string,
		value: IChainInput[K][string] | undefined
	): void {
		const next = { ...input.value[key] };
		if (value === undefined) delete next[ticker];
		else next[ticker] = value;
		input.value = { ...input.value, [key]: next };
	}

	function setSource(ticker: string, source: ChainSource): void {
		setOverride("source", ticker, source);
		track("source_set");
	}

	function setRecipe(ticker: string, recipeId: string): void {
		setOverride("recipeId", ticker, recipeId);
		track("recipe_pick");
	}

	/** extract the material on a planet; undefined for the typical planet */
	function setPlanet(ticker: string, planetId: string | undefined): void {
		input.value = {
			...input.value,
			source: { ...input.value.source, [ticker]: "extract" },
		};
		setOverride("planetId", ticker, planetId);
		track("planet_pick");
	}

	function buyAll(tickers: string[]): void {
		const source = { ...input.value.source };
		for (const t of tickers) source[t] = "buy";
		input.value = { ...input.value, source };
		track("buy_all");
	}

	/** undoes buyAll with the sources from before */
	function restoreSources(source: Record<string, ChainSource>): void {
		input.value = { ...input.value, source };
	}

	function recipeOptions(ticker: string): IChainRecipeEffect[] {
		return recipeEffects(input.value, ctx.value, ticker, result.value);
	}

	/** the chain as a link, for sharing */
	function chainLink(): string {
		const { href } = router.resolve({
			name: "production-chain",
			query: encodeChain(state.value),
		});
		return new URL(href, window.location.origin).toString();
	}

	return {
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
		recipeOptions,
		chainLink,
		track,
	};
}
