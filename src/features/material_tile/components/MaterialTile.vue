<script setup lang="ts">
	/*
		Allowing the drawer to render is quite the performance-hit
		due to many HTML elements being created.
	*/
	import {
		computed,
		type ComputedRef,
		defineAsyncComponent,
		onMounted,
		ref,
		type Ref,
		watch,
	} from "vue";
	import type { Placement } from "@popperjs/core";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Composables
	import { useMaterialData } from "@/database/services/useMaterialData";
	import { useExchangeData } from "@/database/services/useExchangeData";
	import { trackEvent, reportError } from "@/lib/analytics/useAnalytics";
	import { usePreferences } from "@/features/preferences/usePreferences";

	// Components
	import MaterialMarketCard from "@/features/material_tile/components/MaterialMarketCard.vue";
	const MaterialMarketDetails = defineAsyncComponent(
		() =>
			import("@/features/material_tile/components/MaterialMarketDetails.vue")
	);

	// Util
	import { formatNumber } from "@/util/numbers";

	// Interfaces & Types
	import type { Material } from "@/features/api/schemas/gameData.schemas";
	import type { IMaterialExchangeOverview } from "@/database/services/useExchangeData.types";
	import type { IMarketCheck } from "@/features/cx/marketCheck.types";
	import type { DailyContext } from "@/features/material_tile/materialMarket.types";

	// UI
	import { PDrawer, PHoverCard, PSpin, PTooltip, PTable } from "@/ui";

	// Props
	const props = withDefaults(
		defineProps<{
			ticker: string;
			amount?: number;
			// + sold, − bought per day
			daily?: number;
			// whose daily amount it is, for the card's wording
			dailyContext?: DailyContext;
			// the row's Market check, marks "your CX" in the card
			marketCheck?: IMarketCheck;
			disableDrawer?: boolean;
			max?: number;
			enablePopover?: boolean;
			popoverPlacement?: Placement;
		}>(),
		{
			amount: undefined,
			daily: undefined,
			dailyContext: "plan",
			marketCheck: undefined,
			max: undefined,
			disableDrawer: true,
			enablePopover: true,
			popoverPlacement: "left",
		}
	);

	const { getMaterial, getMaterialClass } = useMaterialData();
	const { getMaterialExchangeOverview } = useExchangeData();
	const { marketCardTrigger } = usePreferences();
	// the profile setting: nothing opens on hover or focus, a click pins
	const clickOnly = computed(() => marketCardTrigger.value === "click");

	const refShowDrawer: Ref<boolean> = ref(false);
	const refExchangeOverview: Ref<IMaterialExchangeOverview | undefined> =
		ref(undefined);
	// the market card with its border, px
	const CARD_WIDTH = 626;
	const hoverCard = ref<InstanceType<typeof PHoverCard> | null>(null);

	const material = ref<Material | null>(null);
	const categoryCssClass = ref<string>("");

	const indicatorPercentage: ComputedRef<number> = computed(() => {
		if (props.amount && props.max) {
			return (props.amount / props.max) * 100;
		}
		return 0;
	});

	const indicatorStyle: ComputedRef<string> = computed(() => {
		const percentage: number = 100 - indicatorPercentage.value;

		let color: string;

		if (percentage > 75) {
			color = "rgb(255, 0, 0)";
		} else if (percentage > 50) {
			color = "rgb(255, 165, 0)";
		} else if (percentage > 25) {
			color = "rgb(255, 255, 71)";
		} else {
			color = "rgb(60, 179, 113)";
		}

		const style: string =
			"background: linear-gradient(transparent " +
			percentage.toFixed(4) +
			"%, " +
			color +
			" 0%);";

		return style;
	});

	// the overview is built on the first open, not for every tile on a page
	async function loadOverview(): Promise<void> {
		if (refExchangeOverview.value) return;
		try {
			refExchangeOverview.value = await getMaterialExchangeOverview(
				props.ticker
			);
		} catch {
			refExchangeOverview.value = undefined;
		}
	}

	function openDrawer(source: "tile" | "card"): void {
		if (!material.value) return;
		hoverCard.value?.hide();
		loadOverview();
		refShowDrawer.value = true;
		trackEvent("material:market_drawer_open", {
			material_ticker: props.ticker,
			source,
		});
	}

	function onClick(): void {
		const card = hoverCard.value;
		if (card?.wantsSheet()) return card.openSheet();
		if (!props.disableDrawer && !clickOnly.value) {
			if (refShowDrawer.value) refShowDrawer.value = false;
			else openDrawer("tile");
			return;
		}
		if (!card) return;
		card.togglePin();
	}

	function onPin(pinned: boolean): void {
		if (pinned)
			trackEvent("material:market_card_pin", {
				material_ticker: props.ticker,
			});
	}

	// the drawer returns focus to the tile: that opens no card
	watch(refShowDrawer, (value) => !value && hoverCard.value?.ignoreFocus());

	onMounted(async () => {
		try {
			material.value = await getMaterial(props.ticker);
			categoryCssClass.value = getMaterialClass(props.ticker);
		} catch (err) {
			reportError(err);
		}
	});
</script>

<template>
	<div class="inline-block" :class="`material-tile#${ticker}`">
		<div
			class="flex flex-row items-center justify-center w-full child:first:size-full material-tile"
			:class="[
				categoryCssClass,
				disableDrawer && enablePopover
					? 'hover:cursor-help'
					: !disableDrawer
						? 'hover:cursor-pointer'
						: '',
			]"
			@click="onClick">
			<PHoverCard
				v-if="enablePopover"
				ref="hoverCard"
				:label="t('material_tile.card.label', { ticker })"
				:placement="popoverPlacement"
				:width="CARD_WIDTH"
				:options="{ trigger: marketCardTrigger }"
				@open="loadOverview"
				@pin="onPin">
				<template #trigger>
					<div
						class="flex justify-center items-center"
						:class="{ 'px-2': !!amount }">
						<div v-if="amount" class="pr-1">
							{{ formatNumber(amount, 2, true) }}x
						</div>
						<div class="font-bold text-nowrap">
							{{ ticker }}
						</div>
					</div>
				</template>
				<template #default="{ pinned, sheet, narrow, close }">
					<MaterialMarketCard
						v-if="refExchangeOverview"
						:ticker="ticker"
						:material="material"
						:category-class="categoryCssClass"
						:overview="refExchangeOverview"
						:daily="daily"
						:daily-context="dailyContext"
						:market-check="marketCheck"
						:pinned="pinned"
						:click-opens-details="!disableDrawer && !clickOnly"
						:click-only="clickOnly"
						:sheet="sheet"
						:narrow="narrow"
						@close="close"
						@details="
							() => {
								close();
								openDrawer('card');
							}
						" />
					<div v-else class="flex justify-center p-6">
						<PSpin />
					</div>
				</template>
			</PHoverCard>
			<template v-else>
				<div
					class="flex flex-row w-full justify-center items-center"
					:class="{ 'px-2': !!amount }">
					<div v-if="amount" class="pr-1">
						{{ formatNumber(amount, 2, true) }}x
					</div>
					<div class="font-bold text-nowrap">{{ ticker }}</div>
				</div>
			</template>
			<PTooltip v-if="max">
				<template #trigger>
					<div
						class="w-1.75! my-0! border-white/50"
						:style="indicatorStyle">
						&nbsp;
					</div>
				</template>
				<PTable>
					<tbody>
						<tr>
							<th>{{ $t("material_tile.indicator.value") }}</th>
							<td>{{ formatNumber(amount ?? 0) }}</td>
						</tr>
						<tr>
							<th>{{ $t("material_tile.indicator.max") }}</th>
							<td>{{ formatNumber(max) }}</td>
						</tr>
						<tr>
							<th>{{ $t("material_tile.indicator.pct_max") }}</th>
							<td>
								{{ formatNumber(indicatorPercentage) }}
								%
							</td>
						</tr>
					</tbody>
				</PTable>
			</PTooltip>
		</div>
	</div>

	<PDrawer
		v-if="refShowDrawer && material"
		v-model:show="refShowDrawer"
		:width="760"
		:title="t('material_tile.details.title')">
		<MaterialMarketDetails
			v-if="refExchangeOverview"
			:ticker="ticker"
			:material="material"
			:category-class="categoryCssClass"
			:overview="refExchangeOverview"
			:daily="daily"
			:daily-context="dailyContext"
			:market-check="marketCheck" />
		<div v-else class="flex justify-center p-6">
			<PSpin />
		</div>
	</PDrawer>
</template>
