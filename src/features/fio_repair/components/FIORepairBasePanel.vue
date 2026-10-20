<script setup lang="ts">
	import { computed } from "vue";
	import { useI18n } from "vue-i18n";

	const { t } = useI18n();

	// Composables
	import { usePreferences } from "@/features/preferences/usePreferences";
	import { trackEvent } from "@/lib/analytics/useAnalytics";

	// Components
	import FIORepairDueTag from "@/features/fio_repair/components/FIORepairDueTag.vue";
	import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";
	import XITTransferActionButton from "@/features/xit/components/XITTransferActionButton.vue";

	// Util
	import { formatAmount, formatNumber } from "@/util/numbers";

	// Types & Interfaces
	import type {
		FIORepairConfidence,
		IFIORepairBase,
	} from "@/features/fio_repair/fioRepair.types";
	import type { IMaterialIOMinimal } from "@/features/planning/usePlanCalculation.types";
	import type { IRepairMaterialList } from "@/features/repair_analysis/useRepairAnalysis.types";
	import type { PSelectOption } from "@/ui/ui.types";

	// UI
	import {
		PButton,
		PCheckbox,
		PInputNumber,
		PSelect,
		PTag,
		PTooltip,
	} from "@/ui";
	import { ChevronLeftSharp, ClearSharp } from "@vicons/material";

	/**
	 * One base: its repair target (matched or picked plan, or the
	 * interval), building types, and the repair flight for arrival day with
	 * the load and the XIT Repair action
	 *
	 * @author jplacht
	 */
	const {
		base,
		flight,
		interval,
		usePlans,
		cxName,
		nav = undefined,
	} = defineProps<{
		base: IFIORepairBase;
		flight: {
			load: IRepairMaterialList;
			fromStore: IMaterialIOMinimal[];
			extra: number;
		};
		interval: number;
		usePlans: boolean;
		cxName: string | undefined;
		/** close (drawer) or back (phone) button in the header */
		nav?: "close" | "back";
	}>();

	const useStore = defineModel<boolean>("useStore", { required: true });

	const emit = defineEmits<{
		(e: "close"): void;
		(e: "change", setting: "arrival"): void;
	}>();

	const { fioRepairArrivalDays, fioRepairPlanLinks, setFioRepairPlanLink } =
		usePreferences();

	/*
	 * Repair target
	 */
	const NONE = "none";
	const percent = (score: number) => formatNumber(score * 100, 0);

	const options = computed<PSelectOption[]>(() => [
		...base.match.candidates.map((c) => ({
			label: c.empire
				? t("fio.repair.panel.option_plan", {
						plan: c.plan.plan_name,
						score: percent(c.score),
						empire: c.empire.empire_name,
					})
				: t("fio.repair.panel.option_plan_loose", {
						plan: c.plan.plan_name,
						score: percent(c.score),
					}),
			value: c.plan.uuid,
		})),
		{
			label: t("fio.repair.panel.option_none", { n: interval }),
			value: NONE,
		},
	]);

	const target = computed<string>({
		get: () => base.match.candidate?.plan.uuid ?? NONE,
		set: (value) => {
			if (!base.siteId) return;
			setFioRepairPlanLink(base.siteId, value === NONE ? null : value);
			trackEvent("fio_repair:plan_link_set", {
				to: value === NONE ? "none" : "plan",
			});
		},
	});

	const hasLink = computed(
		() => !!base.siteId && !!fioRepairPlanLinks.value[base.siteId]
	);

	function automatic(): void {
		if (!base.siteId) return;
		setFioRepairPlanLink(base.siteId, undefined);
		trackEvent("fio_repair:plan_link_set", { to: "auto" });
	}

	const confidence = computed<FIORepairConfidence>(() =>
		usePlans ? base.match.confidence : "none"
	);

	const TAG: Record<
		FIORepairConfidence,
		"success" | "warning" | "primary" | "secondary"
	> = {
		match: "success",
		likely: "warning",
		picked: "primary",
		nopick: "primary",
		none: "secondary",
	};

	const reason = computed(() => {
		const n = interval;
		if (!usePlans) return t("fio.repair.panel.reason.off", { n });
		const c = base.match.confidence;
		if (c === "likely")
			return t("fio.repair.panel.reason.likely", {
				score: percent(base.match.candidate!.score),
			});
		if (c === "none")
			return base.match.candidates.length
				? t("fio.repair.panel.reason.none_candidates", { n })
				: t("fio.repair.panel.reason.none", { n });
		return t(`fio.repair.panel.reason.${c}`, { n });
	});

	function sinceText(since: number | null, wasRepaired: boolean): string {
		if (since === null) return t("fio.repair.list.no_date");
		return wasRepaired
			? t("fio.repair.panel.types.days", { n: since })
			: t("fio.repair.list.built", { n: since });
	}

	/*
	 * Load
	 */
	const maxCost = computed(() => flight.load.materials[0]?.cost || 1);
	const elements = computed(() =>
		flight.load.materials.map((m) => ({
			ticker: m.ticker,
			value: m.amount,
		}))
	);
	const cargo = computed(() => ({
		weight: formatNumber(flight.load.weight, 0),
		volume: formatNumber(flight.load.volume, 0),
	}));

	const label = "text-xs font-medium uppercase tracking-wide text-muted";
</script>

<template>
	<aside
		:aria-label="base.name"
		class="@container flex flex-col bg-surface border border-line rounded-panel text-sm"
		data-testid="fio-repair-panel">
		<div class="grid gap-1 p-3 border-b border-line">
			<div class="flex items-center gap-2">
				<PButton
					v-if="nav === 'back'"
					type="ghost"
					:aria-label="$t('fio.repair.panel.back')"
					data-testid="fio-repair-back"
					@click="emit('close')">
					<template #icon>
						<ChevronLeftSharp />
					</template>
				</PButton>
				<h2 class="text-lg font-bold text-ink-strong truncate">
					{{ base.name }}
				</h2>
				<span v-if="base.planet !== base.name" class="text-muted">
					{{ base.planet }}
				</span>
				<span class="grow" />
				<FIORepairDueTag :status="base.status" :due="base.due" />
				<PButton
					v-if="nav === 'close'"
					type="ghost"
					:aria-label="$t('fio.repair.panel.close')"
					data-testid="fio-repair-close"
					@click="emit('close')">
					<template #icon>
						<ClearSharp />
					</template>
				</PButton>
			</div>
			<span class="text-muted tabular-nums">
				{{ $t("fio.repair.panel.buildings", base.buildings.length) }}
			</span>
		</div>

		<div class="grid gap-1.5 px-3 py-2.5 border-b border-line">
			<span :class="label">{{ $t("fio.repair.panel.target") }}</span>
			<PTooltip :disabled="!!base.siteId">
				<template #trigger>
					<PSelect
						v-model:value="target"
						:options="options"
						:disabled="!base.siteId"
						size="sm"
						:aria-label="$t('fio.repair.panel.target')"
						class="w-full"
						data-testid="fio-repair-target" />
				</template>
				{{ $t("fio.repair.panel.needs_refresh") }}
			</PTooltip>
			<span class="flex items-start gap-1.5 text-xs text-muted-strong">
				<PTag
					:type="TAG[confidence]"
					data-testid="fio-repair-confidence">
					{{ $t(`fio.repair.panel.confidence.${confidence}`) }}
				</PTag>
				<span>{{ reason }}</span>
			</span>
			<PButton
				v-if="hasLink"
				size="sm"
				type="secondary"
				class="justify-self-start"
				data-testid="fio-repair-auto"
				@click="automatic">
				{{ $t("fio.repair.panel.auto") }}
			</PButton>
			<router-link
				v-if="!base.match.candidates.length"
				:to="`/plan/${base.planet}`"
				class="text-xs text-link hover:underline justify-self-start">
				{{ $t("fio.repair.panel.create", { planet: base.name }) }}
			</router-link>
		</div>

		<!-- one grid, so columns size to their content; narrow panels drop
		     the condition (the list shows the base's lowest) -->
		<div
			class="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] @[22rem]:grid-cols-[minmax(0,1fr)_auto_auto_auto_auto] gap-x-2.5 items-center px-3 pt-2 pb-2.5 border-b border-line">
			<div class="contents text-xs text-muted">
				<span class="py-1">{{
					$t("fio.repair.panel.types.building")
				}}</span>
				<span class="py-1">{{
					$t("fio.repair.panel.types.target")
				}}</span>
				<span class="py-1">{{
					$t("fio.repair.panel.types.since")
				}}</span>
				<span class="py-1 hidden @[22rem]:block">
					{{ $t("fio.repair.panel.types.condition") }}
				</span>
				<span class="py-1">{{ $t("fio.repair.panel.types.due") }}</span>
			</div>
			<div
				v-for="type in base.types"
				:key="type.ticker"
				class="contents tabular-nums"
				data-testid="fio-repair-type">
				<b
					class="min-h-7 flex items-center font-medium text-ink-strong">
					{{ type.count }}× {{ type.ticker }}
				</b>
				<span class="text-muted-strong">
					{{ $t("fio.repair.panel.types.days", { n: type.target }) }}
				</span>
				<span>{{ sinceText(type.since, type.wasRepaired) }}</span>
				<span class="hidden @[22rem]:block">
					{{ formatNumber(type.condition * 100, 1) }} %
				</span>
				<span>
					<FIORepairDueTag :status="type.status" :due="type.due" />
				</span>
			</div>
		</div>

		<div class="grid gap-3 p-3 border-b border-line">
			<span :class="label">{{
				$t("fio.repair.panel.flight.title")
			}}</span>
			<div class="flex flex-wrap items-center gap-x-3.5 gap-y-2">
				<span class="inline-flex items-center gap-1.5">
					{{ $t("fio.repair.panel.flight.arrives") }}
					<PInputNumber
						v-model:value="fioRepairArrivalDays"
						show-buttons
						size="sm"
						:min="0"
						:max="30"
						:aria-label="$t('fio.repair.panel.flight.arrives')"
						class="w-28"
						data-testid="fio-repair-arrival"
						@update:value="emit('change', 'arrival')" />
					{{ $t("fio.repair.panel.flight.days") }}
				</span>
				<span class="text-xs text-muted" data-testid="fio-repair-extra">
					{{
						flight.extra > 0
							? $t("fio.repair.panel.flight.extra", {
									cost: formatNumber(flight.extra, 0),
								})
							: $t("fio.repair.panel.flight.today")
					}}
				</span>
				<span class="basis-full text-xs text-muted">
					{{ $t("fio.repair.panel.flight.hint") }}
				</span>
			</div>
			<div
				class="grid grid-cols-2 border border-line rounded-panel bg-surface-sunken/40">
				<div class="grid gap-0.5 px-2.5 py-2">
					<span :class="label">{{
						$t("fio.repair.panel.flight.weight")
					}}</span>
					<b
						class="text-xl font-medium tabular-nums text-ink-strong"
						data-testid="fio-repair-weight">
						{{ cargo.weight }} t
					</b>
				</div>
				<div class="grid gap-0.5 px-2.5 py-2 border-s border-line">
					<span :class="label">{{
						$t("fio.repair.panel.flight.volume")
					}}</span>
					<b class="text-xl font-medium tabular-nums text-ink-strong">
						{{ cargo.volume }} m³
					</b>
				</div>
			</div>
			<PCheckbox
				v-model:checked="useStore"
				data-testid="fio-repair-store">
				{{ $t("fio.repair.panel.flight.store") }}
			</PCheckbox>
		</div>

		<div class="grid gap-1.5 px-3 py-2.5">
			<div class="flex justify-between items-center gap-2 min-h-8">
				<span class="grid gap-px">
					<span :class="label">
						{{
							$t("fio.repair.panel.load.title", {
								n: base.buildings.length,
							})
						}}
					</span>
					<span class="text-xs text-muted tabular-nums">
						{{
							$t("fio.repair.panel.load.summary", {
								n: flight.load.materials.length,
								...cargo,
							})
						}}
					</span>
				</span>
				<XITTransferActionButton
					source="fio_repair"
					:elements="elements"
					:button-text="$t('fio.repair.xit.button')"
					:drawer-title="
						$t('fio.repair.xit.title', { base: base.name })
					"
					transfer-name="Repair"
					:note="$t('fio.repair.xit.note', cargo)" />
			</div>
			<p v-if="!flight.load.materials.length" class="text-muted-strong">
				{{ $t("fio.repair.panel.load.nothing") }}
			</p>
			<div
				v-for="m in flight.load.materials"
				:key="m.ticker"
				class="grid grid-cols-[46px_minmax(0,1fr)_60px_88px] items-center gap-2 min-h-6.5 tabular-nums"
				data-testid="fio-repair-material">
				<MaterialTile :key="m.ticker" :ticker="m.ticker" />
				<div class="h-1 rounded-sm bg-white/6" aria-hidden="true">
					<div
						class="h-full rounded-sm bg-white/35"
						:style="{ width: `${(m.cost / maxCost) * 100}%` }" />
				</div>
				<span class="text-end">{{ formatAmount(m.amount) }}</span>
				<span class="text-end text-muted-strong text-nowrap">
					{{ formatNumber(m.cost, 0) }} ȼ
				</span>
			</div>
			<p
				v-if="flight.fromStore.length"
				class="text-xs text-muted"
				data-testid="fio-repair-from-store">
				{{
					$t("fio.repair.panel.flight.from_store", {
						materials: flight.fromStore
							.map((m) => `${formatAmount(m.input)} ${m.ticker}`)
							.join(", "),
					})
				}}
			</p>
			<div
				class="flex justify-between items-baseline pt-1.5 border-t border-line">
				<span>
					{{
						$t("fio.repair.panel.load.total", {
							name:
								cxName ??
								$t("fio.repair.panel.load.no_preference"),
						})
					}}
				</span>
				<b
					class="text-base font-medium tabular-nums text-ink-strong"
					data-testid="fio-repair-total">
					{{ formatNumber(flight.load.cost, 0) }} ȼ
				</b>
			</div>
			<p class="text-xs text-muted">
				{{ $t("fio.repair.panel.load.footer", { base: base.name }) }}
			</p>
		</div>
	</aside>
</template>
