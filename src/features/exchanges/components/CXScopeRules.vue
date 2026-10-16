<script setup lang="ts">
	import { computed } from "vue";

	// Util
	import {
		ALL_PLANETS,
		setPlanetRules,
	} from "@/features/exchanges/cxEdit.util";
	import { withoutFixedPrice } from "@/features/exchanges/fixedPrices.util";

	// Components
	import CXExchangeRule from "@/features/exchanges/components/CXExchangeRule.vue";
	import CXFixedPriceTable from "@/features/exchanges/components/CXFixedPriceTable.vue";
	import CXNotes from "@/features/exchanges/components/CXNotes.vue";
	import CXPlanetPrices from "@/features/exchanges/components/CXPlanetPrices.vue";

	// Types & Interfaces
	import type {
		CXData,
		CXDataExchangeOption,
		CXDataTickerOption,
	} from "@/features/api/schemas/cxData.schemas";
	import type { IPriceBook, PriceType } from "@/features/cx/priceBook";
	import type { IExchangeNote } from "@/features/exchanges/exchangeNotes.util";
	import type {
		IMaterialCOGM,
		IMaterialPriceRow,
	} from "@/features/exchanges/useExchangePlanData.types";

	// UI
	import { PButton, PNotice } from "@/ui";

	/*
	 * The rules of one scope, all planets or a planet: its notes, exchange
	 * rule and fixed prices, and on a planet the prices its plans get
	 */
	const cx = defineModel<CXData>("cxData", { required: true });

	const {
		scope,
		planetLabel = "",
		unplanned = false,
		notes,
		cogms,
		planetRows = [],
		pricedData,
		priceBookFor,
	} = defineProps<{
		// ALL_PLANETS or a planet natural id
		scope: string;
		planetLabel?: string;
		// a planet with rules but no plan
		unplanned?: boolean;
		notes: IExchangeNote[];
		cogms: Map<string, IMaterialCOGM>;
		planetRows?: IMaterialPriceRow[];
		pricedData: CXData | undefined;
		priceBookFor: (
			planet: string | undefined,
			cxData: CXData | undefined
		) => IPriceBook;
	}>();

	const emit = defineEmits<{
		(e: "open", scope: string): void;
		(e: "use-cogm", note: IExchangeNote): void;
		(e: "delete", planet: string): void;
	}>();

	const isPlanet = computed(() => scope !== ALL_PLANETS);

	const exchangeRules = computed<CXDataExchangeOption[]>({
		get: () =>
			isPlanet.value
				? (cx.value.cx_planets.find((p) => p.planet === scope)
						?.preferences ?? [])
				: cx.value.cx_empire,
		set: (rules) =>
			(cx.value = isPlanet.value
				? setPlanetRules(cx.value, scope, "cx_planets", rules)
				: { ...cx.value, cx_empire: rules }),
	});

	const fixedPrices = computed<CXDataTickerOption[]>({
		get: () =>
			isPlanet.value
				? (cx.value.ticker_planets.find((p) => p.planet === scope)
						?.preferences ?? [])
				: cx.value.ticker_empire,
		set: (prices) =>
			(cx.value = isPlanet.value
				? setPlanetRules(cx.value, scope, "ticker_planets", prices)
				: { ...cx.value, ticker_empire: prices }),
	});

	// the price without any fixed price for the material
	function marketPrice(ticker: string, type: PriceType) {
		const book = priceBookFor(
			isPlanet.value ? scope : undefined,
			withoutFixedPrice(cx.value, ticker)
		);
		return {
			price: book.getPrice(ticker, type),
			source: book.getPriceSource(ticker, type),
		};
	}
</script>

<template>
	<div class="flex flex-col gap-6">
		<CXNotes
			:notes="notes"
			@open="(s) => emit('open', s)"
			@use-cogm="(n) => emit('use-cogm', n)">
			<h2 class="text-xl font-bold">
				{{ isPlanet ? planetLabel : $t("exchanges.rules.all_title") }}
			</h2>
			<p class="text-muted">
				{{
					isPlanet
						? $t("exchanges.rules.planet_description")
						: $t("exchanges.rules.all_description")
				}}
			</p>
		</CXNotes>

		<PNotice v-if="unplanned" type="info">
			{{ $t("exchanges.rules.unplanned") }}
			<template #action>
				<PButton type="error" size="sm" @click="emit('delete', scope)">
					{{ $t("exchanges.rules.delete") }}
				</PButton>
			</template>
		</PNotice>

		<CXExchangeRule
			:key="scope"
			v-model:rules="exchangeRules"
			:is-planet="isPlanet"
			:inherited="isPlanet ? cx.cx_empire : []" />

		<section class="flex flex-col gap-3">
			<div class="flex flex-wrap items-baseline justify-between gap-3">
				<h3 class="text-lg font-bold">
					{{ $t("exchanges.fixed.title") }}
				</h3>
				<span class="text-muted text-sm">
					{{ $t("exchanges.fixed.hint") }}
				</span>
			</div>
			<CXFixedPriceTable
				:key="scope"
				v-model:prices="fixedPrices"
				:inherited="isPlanet ? cx.ticker_empire : []"
				:cogms="isPlanet ? undefined : cogms"
				:market-price="marketPrice"
				location="exchanges_view" />
		</section>

		<CXPlanetPrices
			v-if="isPlanet"
			:planet="scope"
			:planet-label="planetLabel"
			:rows="planetRows"
			:priced-data="pricedData"
			@open="(s) => emit('open', s)" />
	</div>
</template>
