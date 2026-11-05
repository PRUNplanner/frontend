<script setup lang="ts">
	import { ref } from "vue";
	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Engine
	import { BASE_IDS } from "@/features/production_chain/engine/chainBases";
	import { MAX_AREAS } from "@/features/production_chain/engine/chainAutoLayout";

	// Util
	import { formatNumber } from "@/util/numbers";

	// Types & Interfaces
	import type { ChainMaxArea } from "@/features/production_chain/engine/chainSolver.types";

	// UI
	import { PButton, PIcon, PInputNumber, PSelect } from "@/ui";
	import {
		AutoAwesomeMosaicOutlined,
		CheckCircleOutlined,
		ErrorOutlineOutlined,
		FitScreenOutlined,
		NoteAddOutlined,
	} from "@vicons/material";

	/**
	 * The three steps of the Bases tab: lay the chain out, fit its rate to
	 * a number of bases, create the plans. The step to take next is the
	 * primary button.
	 *
	 * @author jplacht
	 */
	const {
		layingOut = false,
		planCount,
		ready,
		noPlanet,
		overArea,
	} = defineProps<{
		/** auto layout, separate or fit is picking planets */
		layingOut?: boolean;
		/** bases with steps, one plan each */
		planCount: number;
		/** every base with steps has a planet and fits */
		ready: boolean;
		/** bases with steps but no planet */
		noPlanet: number;
		/** bases over 1,000 area */
		overArea: number;
	}>();

	const emit = defineEmits<{
		(e: "autoLayout"): void;
		(e: "fit", bases: number): void;
		(e: "create"): void;
	}>();

	const maxArea = defineModel<ChainMaxArea>("maxArea", { default: 500 });
	const areaOptions = MAX_AREAS.map((a) => ({
		value: a,
		label: t("production_chains.bases.max_area_option", {
			n: formatNumber(a, 0),
		}),
	}));
	const fitCount = ref(2);
</script>

<template>
	<section
		class="grid grid-cols-1 lg:grid-cols-3 rounded-panel border border-line divide-y lg:divide-y-0 lg:divide-x divide-line"
		data-testid="chain-bases-actions">
		<div class="p-4 flex flex-col gap-3 min-w-0">
			<div>
				<h3 class="font-bold flex items-center gap-2">
					<PIcon :size="18" class="text-muted">
						<AutoAwesomeMosaicOutlined />
					</PIcon>
					{{ $t("production_chains.bases.actions.layout_title") }}
				</h3>
				<p class="text-xs text-muted pt-1">
					{{ $t("production_chains.bases.actions.layout_text") }}
				</p>
			</div>
			<div class="flex flex-wrap items-center gap-2 mt-auto">
				<span class="text-sm text-muted">
					{{ $t("production_chains.bases.actions.up_to") }}
				</span>
				<PSelect
					:value="maxArea"
					:options="areaOptions"
					class="w-32"
					:aria-label="t('production_chains.bases.max_area')"
					data-testid="chain-max-area"
					@update:value="
						(v) => v && (maxArea = Number(v) as ChainMaxArea)
					" />
				<PButton
					:type="ready ? 'secondary' : 'primary'"
					:loading="layingOut"
					data-testid="chain-auto-layout"
					@click="emit('autoLayout')">
					{{ $t("production_chains.bases.auto_layout") }}
				</PButton>
			</div>
		</div>

		<div class="p-4 flex flex-col gap-3 min-w-0">
			<div>
				<h3 class="font-bold flex items-center gap-2">
					<PIcon :size="18" class="text-muted">
						<FitScreenOutlined />
					</PIcon>
					{{ $t("production_chains.bases.actions.fit_title") }}
				</h3>
				<p class="text-xs text-muted pt-1">
					{{ $t("production_chains.bases.fit_hint") }}
				</p>
			</div>
			<div class="flex flex-wrap items-center gap-2 mt-auto">
				<PInputNumber
					:value="fitCount"
					:min="1"
					:max="BASE_IDS.length"
					class="w-20"
					:aria-label="t('production_chains.bases.fit_count')"
					data-testid="chain-fit-count"
					@update:value="(v) => v && v >= 1 && (fitCount = v)" />
				<span class="text-sm text-muted">
					{{ $t("production_chains.bases.fit_bases", fitCount) }}
				</span>
				<PButton
					type="secondary"
					:loading="layingOut"
					data-testid="chain-fit"
					@click="emit('fit', fitCount)">
					{{ $t("production_chains.bases.fit_apply") }}
				</PButton>
			</div>
		</div>

		<div class="p-4 flex flex-col gap-3 min-w-0">
			<div>
				<h3 class="font-bold flex items-center gap-2">
					<PIcon :size="18" class="text-muted">
						<NoteAddOutlined />
					</PIcon>
					{{ $t("production_chains.bases.actions.create_title") }}
				</h3>
				<p
					v-if="ready"
					class="text-xs text-positive pt-1 flex items-center gap-1"
					data-testid="chain-bases-ready">
					<PIcon :size="14"><CheckCircleOutlined /></PIcon>
					{{ $t("production_chains.bases.actions.ready", planCount) }}
				</p>
				<ul
					v-else
					class="text-xs text-negative pt-1 flex flex-col gap-0.5"
					data-testid="chain-bases-blocked">
					<li v-if="noPlanet" class="flex items-center gap-1">
						<PIcon :size="14"><ErrorOutlineOutlined /></PIcon>
						{{
							$t(
								"production_chains.bases.actions.no_planet",
								noPlanet
							)
						}}
					</li>
					<li v-if="overArea" class="flex items-center gap-1">
						<PIcon :size="14"><ErrorOutlineOutlined /></PIcon>
						{{
							$t(
								"production_chains.bases.overview.over",
								overArea
							)
						}}
					</li>
				</ul>
			</div>
			<div class="mt-auto">
				<PButton
					:type="ready ? 'primary' : 'secondary'"
					:disabled="!planCount"
					data-testid="chain-bases-create"
					@click="emit('create')">
					{{ $t("production_chains.bases.create", planCount) }}
				</PButton>
			</div>
		</div>
	</section>
</template>
