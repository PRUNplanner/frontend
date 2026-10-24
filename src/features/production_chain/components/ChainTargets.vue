<script setup lang="ts">
	import { computed, ref } from "vue";
	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Components
	import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";

	// Types & Interfaces
	import type { IChainTarget } from "@/features/production_chain/engine/chainSolver.types";
	import type { PSelectOption } from "@/ui/ui.types";

	// UI
	import { PButton, PInputNumber, PSelect } from "@/ui";

	const { options } = defineProps<{
		/** materials that can be produced: with a recipe or a resource */
		options: PSelectOption[];
	}>();

	const targets = defineModel<IChainTarget[]>("targets", { required: true });

	const NEW_TARGET_PER_DAY = 10;

	const addOptions = computed(() =>
		options.filter((o) => !targets.value.some((t) => t.ticker === o.value))
	);
	const adding = ref<string | null>(null);

	/** steps of 1, 5 or 10 by size */
	const stepOf = (n: number) => (n >= 100 ? 10 : n >= 20 ? 5 : 1);

	function set(index: number, perDay: number | null | undefined): void {
		if (perDay == null || !(perDay > 0)) return;
		targets.value = targets.value.map((x, i) =>
			i === index ? { ...x, perDay } : x
		);
	}

	function step(index: number, direction: 1 | -1): void {
		const q = targets.value[index].perDay;
		const s = stepOf(direction < 0 ? Math.max(q - 1, 0) : q);
		set(index, Math.max(direction < 0 ? 1 : 0, q + direction * s));
	}

	function remove(index: number): void {
		targets.value = targets.value.filter((_, i) => i !== index);
	}

	function add(ticker: string | number | null | undefined): void {
		if (typeof ticker !== "string") return;
		targets.value = [
			...targets.value,
			{ ticker, perDay: NEW_TARGET_PER_DAY },
		];
		adding.value = null;
	}
</script>

<template>
	<div>
		<div class="text-xs uppercase tracking-wide text-muted pb-2">
			{{ $t("production_chains.targets.label") }}
		</div>
		<div class="flex flex-wrap items-center gap-2">
			<div
				v-for="(target, index) in targets"
				:key="target.ticker"
				class="flex items-center gap-1 rounded-control border border-line bg-surface-sunken p-1"
				data-testid="chain-target">
				<MaterialTile :key="target.ticker" :ticker="target.ticker" />
				<PButton
					type="secondary"
					size="sm"
					:aria-label="t('production_chains.targets.less', { ticker: target.ticker })"
					@click="step(index, -1)">
					−
				</PButton>
				<PInputNumber
					:value="target.perDay"
					decimals
					:min="0"
					size="sm"
					class="w-20"
					:aria-label="t('production_chains.targets.amount', { ticker: target.ticker })"
					@update:value="(v) => set(index, v)" />
				<PButton
					type="secondary"
					size="sm"
					:aria-label="t('production_chains.targets.more', { ticker: target.ticker })"
					@click="step(index, 1)">
					+
				</PButton>
				<span class="text-xs text-muted px-1">
					{{ $t("production_chains.targets.per_day") }}
				</span>
				<PButton
					type="ghost"
					size="sm"
					:aria-label="t('production_chains.targets.remove', { ticker: target.ticker })"
					@click="remove(index)">
					×
				</PButton>
			</div>
			<PSelect
				:value="adding"
				:options="addOptions"
				searchable
				class="w-64"
				:placeholder="
					targets.length
						? t('production_chains.targets.add')
						: t('production_chains.targets.add_first')
				"
				:aria-label="t('production_chains.targets.add')"
				@update:value="add" />
		</div>
	</div>
</template>
