<script setup lang="ts">
	import {
		computed,
		defineAsyncComponent,
		ref,
		type Ref,
		shallowRef,
		watch,
	} from "vue";
	import { useI18n } from "vue-i18n";
	import { RouterLink } from "vue-router";

	// Stores
	import { usePlanningStore } from "@/stores/planningStore";

	// Composables
	import { trackEvent } from "@/lib/analytics/useAnalytics";
	import { useCXSave } from "@/features/cx/useCXSave";
	import { useExchangePlanData } from "@/features/exchanges/useExchangePlanData";
	import { usePlanetData } from "@/database/services/usePlanetData";

	// Util
	import { deepClone } from "@/util/data";
	import { formatNumber } from "@/util/numbers";
	import {
		ALL_PLANETS,
		buildPayload,
		changedScopes,
		setPlanetRules,
	} from "@/features/exchanges/cxEdit.util";
	import {
		setBuyPrice,
		withoutFixedPrice,
	} from "@/features/exchanges/fixedPrices.util";
	import { priceSourceLabel } from "@/features/exchanges/exchangeLabel.util";
	import { COGM_DRIFT_THRESHOLD } from "@/features/exchanges/exchangeNotes.util";

	// Components
	import PlanCOGMTable from "@/features/planning/components/tools/PlanCOGMTable.vue";
	import CXFixedPriceTable from "@/features/exchanges/components/CXFixedPriceTable.vue";
	import SaveBar from "@/features/save_bar/components/SaveBar.vue";
	import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";
	import SaveConflictNotice from "@/features/save_conflict/components/SaveConflictNotice.vue";
	const SaveConflictDialog = defineAsyncComponent(
		() =>
			import("@/features/save_conflict/components/SaveConflictDialog.vue")
	);

	// Types & Interfaces
	import type { IProductionBuildingRecipeCOGM } from "@/features/planning/usePlanCalculation.types";
	import type {
		CX,
		CXData,
		CXDataTickerOption,
	} from "@/features/api/schemas/cxData.schemas";
	import type { PriceType } from "@/features/cx/priceBook";
	import type { IMaterialCOGM } from "@/features/exchanges/useExchangePlanData.types";

	// UI
	import { PButton, PButtonGroup, PNotice, PTag } from "@/ui";
	import { CheckSharp } from "@vicons/material";

	const props = defineProps<{
		cogmData: IProductionBuildingRecipeCOGM;
		cxUuid?: string;
		// the plan's planet; without it (ROI overview) only the table shows
		planetId?: string;
	}>();

	const { t } = useI18n();
	const planningStore = usePlanningStore();
	const cxSave = useCXSave("cogm");
	const { planetName } = usePlanetData();

	// the CX as stored and as edited here
	const loaded = shallowRef<CX | null>(null);
	const edit: Ref<CXData | null> = ref(null);
	const saveState = ref<"idle" | "saving" | "error">("idle");

	function load(): void {
		cxSave.remoteNotice.value = null;
		saveState.value = "idle";
		loaded.value =
			props.cxUuid && planningStore.cxs[props.cxUuid]
				? planningStore.getCX(props.cxUuid)
				: null;
		edit.value = loaded.value ? deepClone(loaded.value.cx_data) : null;
	}
	watch(() => props.cxUuid, load, { immediate: true });

	const { bases, materialCOGMs, priceBookFor } = useExchangePlanData({
		plans: () => Object.values(planningStore.plans),
		empires: () => Object.values(planningStore.empires),
		cx: () => loaded.value ?? undefined,
		cxData: () => edit.value ?? undefined,
		includeOthers: () => false,
	});

	const showPanel = computed(() => !!loaded.value && !!props.planetId);

	// the plan's prices, as saved
	const planPrices = computed(() =>
		props.planetId
			? priceBookFor(props.planetId, loaded.value?.cx_data)
			: undefined
	);

	// a material's price without its fixed prices, unsaved edits included
	function marketPrice(ticker: string, type: PriceType) {
		const book = priceBookFor(
			props.planetId,
			edit.value ? withoutFixedPrice(edit.value, ticker) : undefined
		);
		return {
			price: book.getPrice(ticker, type),
			source: book.getPriceSource(ticker, type),
		};
	}

	const cxName = computed(() => loaded.value?.cx_name ?? "");
	const planetLabel = computed(() =>
		props.planetId ? planetName(props.planetId, props.planetId) : ""
	);

	// the CX's empire with a plan on this planet, else its only empire
	const empireName = computed(() => {
		const empires = loaded.value?.empires ?? [];
		const here = empires.find((e) =>
			e.plans.some((p) => p.planet_natural_id === props.planetId)
		);
		return (
			here?.empire_name ??
			(empires.length === 1 ? empires[0].empire_name : undefined)
		);
	});

	/*
	 * Per output: COGM here, market and the all-planets buy price
	 */

	const round2 = (v: number) => Math.round(v * 100) / 100;

	function allPlanetsBuy(ticker: string): number | null {
		return (
			edit.value?.ticker_empire.find(
				(p) => p.ticker === ticker && p.type !== "SELL"
			)?.value ?? null
		);
	}

	// linked plans buying the material, by name
	function buyers(ticker: string): string[] {
		return [
			...new Set(
				bases.value
					.filter((b) =>
						b.materials.some(
							(m) => m.ticker === ticker && m.delta < 0
						)
					)
					.map((b) => b.planName)
			),
		];
	}

	const outputs = computed(() =>
		props.cogmData.outputCOGM.map((output) => {
			const cogm = round2(output.costTotal);
			const fixed = allPlanetsBuy(output.ticker);
			const drift =
				fixed !== null && cogm > 0 ? (fixed - cogm) / cogm : null;
			return {
				ticker: output.ticker,
				cogm,
				market: marketPrice(output.ticker, "BUY"),
				fixed,
				drift:
					drift !== null && Math.abs(drift) > COGM_DRIFT_THRESHOLD
						? drift
						: null,
				buyers: buyers(output.ticker),
			};
		})
	);

	function useCOGM(ticker: string, value: number): void {
		if (!edit.value) return;
		edit.value = {
			...edit.value,
			ticker_empire: setBuyPrice(edit.value.ticker_empire, ticker, value),
		};
		scope.value = ALL_PLANETS;
		trackEvent("exchange:use_cogm", {
			location: "cogm",
			material_ticker: ticker,
		});
	}

	/*
	 * Fixed prices of all planets or this planet
	 */

	const scope = ref<string>(ALL_PLANETS);

	const scopePrices = computed<CXDataTickerOption[]>({
		get: () => {
			if (!edit.value) return [];
			if (scope.value === ALL_PLANETS) return edit.value.ticker_empire;
			return (
				edit.value.ticker_planets.find((p) => p.planet === scope.value)
					?.preferences ?? []
			);
		},
		set: (prices) => {
			if (!edit.value) return;
			edit.value =
				scope.value === ALL_PLANETS
					? { ...edit.value, ticker_empire: prices }
					: setPlanetRules(
							edit.value,
							scope.value,
							"ticker_planets",
							prices
						);
		},
	});

	// COGMs of the linked plans; this recipe's outputs when no plan has them
	const cogms = computed(() => {
		const map = new Map<string, IMaterialCOGM>(materialCOGMs.value);
		props.cogmData.outputCOGM.forEach((o) => {
			if (map.has(o.ticker)) return;
			map.set(o.ticker, {
				ticker: o.ticker,
				value: o.costTotal,
				entries: [
					{
						planUuid: "",
						planName: t("plan.tools.cogm.prices.this_plan"),
						planet: props.planetId ?? "",
						value: o.costTotal,
					},
				],
			});
		});
		return map;
	});

	/*
	 * Save bar
	 */

	const changes = computed(() =>
		loaded.value && edit.value
			? changedScopes(loaded.value.cx_data, edit.value).length
			: 0
	);

	async function save(): Promise<void> {
		if (!loaded.value || !edit.value) return;
		saveState.value = "saving";
		try {
			trackEvent("exchange:update", {
				cx_uuid: loaded.value.uuid,
				location: "cogm",
			});
			const saved = await cxSave.save(loaded.value, {
				cx_name: loaded.value.cx_name,
				cx_data: buildPayload(edit.value),
			});
			saveState.value = "idle";
			// reload the CX from the store
			if (saved) load();
		} catch (err) {
			console.error("Error saving CX", err);
			saveState.value = "error";
		}
	}

	function discard(): void {
		trackEvent("exchange:discard", { location: "cogm" });
		load();
	}

	/*
	 * Saved or deleted in another tab: without unsaved edits the CX
	 * reloads, with them a notice offers to
	 */
	watch(
		() => (props.cxUuid ? planningStore.cxs[props.cxUuid] : undefined),
		(cx) => {
			const current = loaded.value;
			if (saveState.value === "saving" || !current || !edit.value)
				return;
			if (
				cx &&
				(cx.uuid !== current.uuid ||
					cx.modified_at === current.modified_at)
			)
				return;

			if (
				cxSave.onRemoteChange(cx, current, {
					cx_name: current.cx_name,
					cx_data: edit.value,
				})
			)
				load();
		}
	);

	const pct = (v: number) => formatNumber(v * 100, 0, false, true);
</script>

<template>
	<div
		class="grid grid-cols-1"
		:class="
			showPanel
				? 'xl:grid-cols-2 gap-6 xl:divide-x divide-white/10 xl:child:first:pr-6'
				: ''
		">
		<div class="flex flex-col gap-2">
			<p class="text-muted text-xs">
				{{ $t("plan.tools.cogm.info") }}
				<template v-if="loaded">
					{{
						empireName
							? $t("plan.tools.cogm.prices_from_empire", {
									preference: cxName,
									empire: empireName,
								})
							: $t("plan.tools.cogm.prices_from", {
									preference: cxName,
								})
					}}
				</template>
			</p>
			<p class="text-muted text-xs">
				{{ $t("plan.tools.cogm.workforce_note") }}
			</p>
			<PNotice v-if="planetId && !loaded" data-no-preference>
				{{ $t("plan.tools.cogm.no_preference") }}
				<RouterLink to="/manage" class="text-link hover:underline">
					{{ $t("plan.tools.cogm.manage_link") }}
				</RouterLink>
			</PNotice>
			<PlanCOGMTable
				:data="cogmData"
				:prices="planPrices"
				:market="(ticker: string) => marketPrice(ticker, 'BUY').price"
				:cx-uuid="loaded ? cxUuid : undefined"
				:planet-id="planetId" />
			<p v-if="planPrices" class="text-muted text-xs">
				{{ $t("plan.tools.cogm.tags_hint") }}
			</p>
		</div>

		<div v-if="showPanel && edit" class="flex flex-col gap-3" data-prices>
			<div class="flex flex-wrap items-baseline justify-between gap-3">
				<h2 class="text-lg font-bold">
					{{ $t("plan.tools.cogm.prices.title", { name: cxName }) }}
				</h2>
				<RouterLink
					:to="`/exchanges/${cxUuid}?scope=${ALL_PLANETS}`"
					class="text-link hover:underline"
					data-open-exchanges>
					{{ $t("plan.tools.cogm.prices.open_exchanges") }}
				</RouterLink>
			</div>
			<SaveConflictNotice
				:notice="cxSave.remoteNotice.value"
				@reload="load" />

			<div
				v-for="o in outputs"
				:key="o.ticker"
				class="flex flex-col gap-3 border border-white/10 rounded p-3"
				:data-output="o.ticker">
				<MaterialTile :ticker="o.ticker" />
				<dl class="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-sm">
					<dt class="text-muted">
						{{
							$t("plan.tools.cogm.prices.cogm_here", {
								planet: planetLabel,
							})
						}}
					</dt>
					<dd class="text-right font-bold tabular-nums">
						{{ formatNumber(o.cogm) }} ȼ
					</dd>
					<dt class="text-muted">
						{{
							$t("plan.tools.cogm.prices.market", {
								source: priceSourceLabel(o.market.source, t),
							})
						}}
					</dt>
					<dd class="text-right tabular-nums">
						{{ formatNumber(o.market.price) }} ȼ
					</dd>
					<dt class="text-muted">
						{{ $t("plan.tools.cogm.prices.buy_all") }}
					</dt>
					<dd class="text-right tabular-nums" data-buy-all>
						{{
							o.fixed === null
								? $t("plan.tools.cogm.prices.not_fixed")
								: `${formatNumber(o.fixed)} ȼ`
						}}
					</dd>
				</dl>
				<div v-if="o.fixed === null">
					<PButton
						type="secondary"
						data-use-cogm
						@click="useCOGM(o.ticker, o.cogm)">
						{{ $t("plan.tools.cogm.prices.use") }}
					</PButton>
				</div>
				<PNotice v-else-if="o.drift !== null" data-drift>
					<div class="font-bold">
						{{
							$t("plan.tools.cogm.prices.drift", {
								diff: pct(o.drift),
							})
						}}
					</div>
					<div class="text-xs text-muted">
						{{ $t("plan.tools.cogm.prices.drift_hint") }}
					</div>
					<template #action>
						<PButton
							size="sm"
							type="secondary"
							data-update-cogm
							@click="useCOGM(o.ticker, o.cogm)">
							{{
								$t("plan.tools.cogm.prices.update", {
									value: formatNumber(o.cogm),
								})
							}}
						</PButton>
					</template>
				</PNotice>
				<div v-else>
					<PTag type="success" size="sm" data-matches>
						<CheckSharp class="size-3" />
						{{ $t("plan.tools.cogm.prices.matches") }}
					</PTag>
				</div>
				<p class="text-xs text-muted">
					{{
						$t("plan.tools.cogm.prices.changes", {
							ticker: o.ticker,
							preference: cxName,
						})
					}}
					<template v-if="o.buyers.length">
						{{
							$t("plan.tools.cogm.prices.buyers", {
								plans: o.buyers.join(", "),
								ticker: o.ticker,
							})
						}}
					</template>
				</p>
			</div>

			<div class="flex flex-wrap items-center justify-between gap-3 pt-3">
				<h3 class="text-base font-bold">
					{{ $t("plan.tools.cogm.prices.fixed_title") }}
				</h3>
				<PButtonGroup
					role="group"
					:aria-label="$t('plan.tools.cogm.prices.scope')">
					<PButton
						size="sm"
						:pressed="scope === ALL_PLANETS"
						@click="scope = ALL_PLANETS">
						{{ $t("plan.tools.cogm.prices.all_planets") }}
					</PButton>
					<PButton
						size="sm"
						:pressed="scope === planetId"
						data-scope-planet
						@click="scope = planetId ?? ALL_PLANETS">
						{{ planetLabel }}
					</PButton>
				</PButtonGroup>
			</div>
			<CXFixedPriceTable
				:key="scope"
				v-model:prices="scopePrices"
				:inherited="scope === ALL_PLANETS ? [] : edit.ticker_empire"
				:cogms="scope === ALL_PLANETS ? cogms : undefined"
				:market-price="marketPrice"
				location="cogm" />
			<SaveBar
				v-if="changes > 0 || saveState === 'error'"
				class="mx-0! bottom-3!"
				:count="changes"
				:state="saveState"
				@save="save"
				@discard="discard" />
		</div>
		<SaveConflictDialog
			v-if="cxSave.conflict.show.value"
			:conflict="cxSave.conflict" />
	</div>
</template>
