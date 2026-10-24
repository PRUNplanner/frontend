<script setup lang="ts">
	import { computed, nextTick, ref, watch } from "vue";
	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Components
	import ChainRecipeText from "@/features/production_chain/components/ChainRecipeText.vue";

	// Util
	import { formatMoney } from "@/features/production_chain/productionChain.util";
	import { formatNumber } from "@/util/numbers";

	// Types & Interfaces
	import type { IChainRecipeEffect } from "@/features/production_chain/engine/chainSolver.types";

	// UI
	import { PPopover } from "@/ui";

	const { ticker, anchor, options, price } = defineProps<{
		ticker: string;
		anchor: HTMLElement | undefined;
		options: IChainRecipeEffect[];
		/** CX price of the material */
		price: number;
	}>();

	const show = defineModel<boolean>("show", { required: true });

	const emit = defineEmits<{
		(e: "pick", recipeId: string): void;
	}>();

	const money = (v: number) =>
		t("production_chains.money", { value: formatMoney(v) });

	const hours = (ms: number) =>
		t("production_chains.hours", {
			n: formatNumber(ms / 3_600_000, ms >= 36_000_000 ? 1 : 2),
		});

	// a change with its sign, "±0" for none
	const signed = (v: number) => (v > 0 ? "+" : "−");

	const rows = computed(() =>
		options.map((o) => ({
			...o,
			profit:
				Math.abs(o.deltaProfit) < 0.5
					? t("production_chains.recipe_picker.no_change")
					: t("production_chains.recipe_picker.profit", {
							value:
								signed(o.deltaProfit) + money(Math.abs(o.deltaProfit)),
						}),
			built:
				o.deltaBuilt === 0
					? t("production_chains.recipe_picker.no_change")
					: signed(o.deltaBuilt) +
						t(
							"production_chains.recipe_picker.buildings",
							Math.abs(o.deltaBuilt)
						),
		}))
	);

	function pick(id: string): void {
		emit("pick", id);
		show.value = false;
	}

	const list = ref<HTMLElement | null>(null);
	const buttons = () => [
		...(list.value?.querySelectorAll<HTMLButtonElement>("button") ?? []),
	];

	// focus into the list on open (the in-use recipe), back to the recipe
	// button it opened from on close
	// (immediate: the picker mounts already open the first time)
	watch(
		show,
		async (open, was) => {
			if (!open) return was && anchor?.focus();
			await nextTick();
			const all = buttons();
			(all.find((b) => b.getAttribute("aria-current")) ?? all[0])?.focus();
		},
		{ immediate: true }
	);

	/** arrows, Home and End move between the options */
	function onKeydown(e: KeyboardEvent): void {
		const all = buttons();
		const i = all.indexOf(document.activeElement as HTMLButtonElement);
		const next =
			e.key === "ArrowDown"
				? Math.min(i + 1, all.length - 1)
				: e.key === "ArrowUp"
					? Math.max(i - 1, 0)
					: e.key === "Home"
						? 0
						: e.key === "End"
							? all.length - 1
							: null;
		if (next === null) return;
		e.preventDefault();
		all[next]?.focus();
	}
</script>

<template>
	<PPopover
		v-model:show="show"
		trigger="manual"
		placement="bottom-start"
		:anchor="anchor"
		panel-class="p-0 w-[min(32rem,calc(100vw-2rem))]"
		@clickoutside="show = false">
		<div
			role="dialog"
			:aria-label="t('production_chains.recipe_picker.title', { ticker })">
			<div class="flex justify-between gap-3 px-3 py-2 border-b border-line">
				<span class="font-bold">
					{{ $t("production_chains.recipe_picker.title", { ticker }) }}
				</span>
				<span class="text-xs text-muted">
					{{
						$t("production_chains.recipe_picker.hint", {
							price: money(price),
						})
					}}
				</span>
			</div>
			<ul
				ref="list"
				class="max-h-[60vh] overflow-y-auto p-1"
				@keydown="onKeydown">
				<li v-for="o in rows" :key="o.recipe.recipe_id">
					<button
						type="button"
						class="w-full flex justify-between gap-3 px-2 py-2 rounded-control text-left hover:bg-hover cursor-pointer"
						:class="{ 'bg-selected': o.inUse }"
						:aria-current="o.inUse ? 'true' : undefined"
						data-testid="chain-recipe-option"
						@click="pick(o.recipe.recipe_id)">
						<span class="min-w-0">
							<ChainRecipeText :recipe="o.recipe" :ticker="ticker" />
							<span class="block text-xs text-muted">
								{{ o.recipe.building_ticker }} ·
								{{ hours(o.recipe.time_ms) }}
								<template v-if="o.isDefault">
									· {{ $t("production_chains.recipe_picker.default") }}
								</template>
								<template v-if="o.byproducts">
									· {{ $t("production_chains.recipe_picker.byproducts") }}
								</template>
							</span>
						</span>
						<span class="text-right shrink-0 tabular-nums">
							<span class="block">{{ money(o.unitCost) }}</span>
							<span
								v-if="o.inUse"
								class="block text-xs text-muted">
								{{ $t("production_chains.recipe_picker.in_use") }}
							</span>
							<span
								v-else
								class="block text-xs"
								:class="
									o.deltaProfit > 0.5
										? 'text-positive'
										: o.deltaProfit < -0.5
											? 'text-negative'
											: 'text-muted'
								">
								{{ o.profit }} · {{ o.built }}
							</span>
						</span>
					</button>
				</li>
			</ul>
		</div>
	</PPopover>
</template>
