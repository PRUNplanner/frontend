<script setup lang="ts">
	import { computed, ref, watch } from "vue";
	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Util
	import {
		FILTER_FROM,
		filterPlans,
		trackNav,
	} from "@/layout/components/navigation/navigation.util";
	import { formatNumber } from "@/util/numbers";

	// Types & Interfaces
	import type {
		INavPlan,
		NavArea,
	} from "@/layout/components/navigation/navigation.types";

	// UI
	import { PIcon, PInput } from "@/ui";
	import { CloseSharp, FilterAltOutlined } from "@vicons/material";

	/**
	 * The current empire's plans (sorted by the caller), the open plan
	 * marked, a filter field from FILTER_FROM plans on
	 *
	 * @author jplacht
	 */
	const {
		plans,
		empireUuid,
		openPlanUuid = undefined,
		stray = undefined,
		area,
		profits = undefined,
		large = false,
	} = defineProps<{
		plans: INavPlan[];
		/** a new empire clears the filter */
		empireUuid: string;
		openPlanUuid?: string;
		/** the open plan when the empire doesn't hold it */
		stray?: INavPlan;
		area: NavArea;
		/** daily profit by plan uuid, shown where known */
		profits?: Record<string, number>;
		/** taller rows with the planet on a second line (phone sheet) */
		large?: boolean;
	}>();

	const filter = ref("");
	watch(
		() => empireUuid,
		() => (filter.value = "")
	);

	const hasFilter = computed(() => plans.length >= FILTER_FROM);
	const shown = computed(() =>
		hasFilter.value ? filterPlans(plans, filter.value) : plans
	);

	// Escape clears a filled field; an empty one lets a popover or sheet close
	function onKeydown(e: KeyboardEvent): void {
		if (e.key !== "Escape" || !filter.value) return;
		e.preventDefault();
		filter.value = "";
	}

	function planLink(p: INavPlan): string {
		return `/plan/${p.planet_natural_id}/${p.uuid}`;
	}

	const rowClass = computed(() =>
		large
			? "min-h-14 px-3 py-2 rounded-md"
			: "h-[29px] pointer-coarse:h-11 px-2.5 rounded-control"
	);
</script>

<template>
	<div class="flex flex-col min-h-0">
		<div v-if="hasFilter" class="relative shrink-0 pb-1.5">
			<PInput
				v-model:value="filter"
				size="sm"
				:placeholder="t('common.navigation.plans_filter')"
				:aria-label="t('common.navigation.plans_filter')"
				@keydown="onKeydown">
				<template #prefix>
					<PIcon :size="14"><FilterAltOutlined /></PIcon>
				</template>
			</PInput>
			<button
				v-if="filter"
				type="button"
				class="touch-target absolute right-1.5 top-[3px] flex items-center justify-center size-6 rounded-control text-muted hover:text-ink hover:bg-hover cursor-pointer"
				:aria-label="t('common.navigation.plans_filter_clear')"
				@click="filter = ''">
				<PIcon :size="14"><CloseSharp /></PIcon>
			</button>
		</div>
		<ul class="overflow-y-auto min-h-0" data-nav-plans>
			<li v-if="stray" class="pb-1 mb-1 border-b border-line">
				<RouterLink
					:to="planLink(stray)"
					aria-current="page"
					class="flex flex-col justify-center gap-0.5 bg-prunplanner/10 text-prunplanner"
					:class="large ? rowClass : 'min-h-[29px] px-2.5 py-1.5 rounded-control'"
					@click="trackNav('plan', area, 'plans')">
					<span class="flex items-baseline gap-2 min-w-0">
						<span class="truncate flex-1" :title="stray.plan_name || stray.planet_natural_id">
							{{ stray.plan_name || stray.planet_natural_id }}
						</span>
						<span class="font-mono text-xs opacity-70">
							{{ stray.planet_natural_id }}
						</span>
					</span>
					<span class="text-xs leading-none text-muted">
						{{ t("common.navigation.not_in_empire") }}
					</span>
				</RouterLink>
			</li>
			<li v-for="p in shown" :key="p.uuid">
				<RouterLink
					:to="planLink(p)"
					:aria-current="p.uuid === openPlanUuid ? 'page' : undefined"
					class="flex items-center gap-2"
					:class="[
						rowClass,
						p.uuid === openPlanUuid
							? 'bg-prunplanner/10 text-prunplanner'
							: 'text-ink hover:bg-hover',
					]"
					@click="trackNav('plan', area, 'plans')">
					<template v-if="large">
						<span class="flex flex-col flex-1 min-w-0">
							<span class="truncate" :title="p.plan_name">{{ p.plan_name }}</span>
							<span class="font-mono text-xs text-muted">
								{{ p.planet_natural_id }}
							</span>
						</span>
						<span
							v-if="profits?.[p.uuid] !== undefined"
							class="font-mono text-sm"
							:class="
								profits[p.uuid] >= 0
									? 'text-positive'
									: 'text-negative'
							">
							{{ profits[p.uuid] >= 0 ? "+" : ""
							}}{{ formatNumber(profits[p.uuid]) }}
						</span>
					</template>
					<template v-else>
						<span class="truncate flex-1" :title="p.plan_name">{{ p.plan_name }}</span>
						<span
							class="font-mono text-xs"
							:class="
								p.uuid === openPlanUuid
									? 'opacity-70'
									: 'text-muted'
							">
							{{ p.planet_natural_id }}
						</span>
					</template>
				</RouterLink>
			</li>
		</ul>
		<p v-if="!plans.length" class="px-2.5 py-1 text-xs text-muted">
			{{ t("common.navigation.no_plans") }} ·
			<RouterLink
				to="/search"
				class="text-link-primary hover:underline"
				@click="trackNav('search', area, 'plans')">
				{{ t("common.navigation.planet_search") }}
			</RouterLink>
		</p>
		<p v-else-if="!shown.length" class="px-2.5 py-1 text-xs text-muted">
			{{ t("common.navigation.plans_filter_empty") }}
		</p>
	</div>
</template>
