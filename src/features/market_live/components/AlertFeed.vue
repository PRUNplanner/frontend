<script setup lang="ts">
	import type { MarketEvent } from "@/features/market_live/cxDetectors.types";
	import { formatNumber } from "@/util/numbers";
	import { formatDate } from "@/util/date";

	import AlertFeedDetail from "@/features/market_live/components/AlertFeedDetail.vue";

	defineProps<{
		eventLog: MarketEvent[];
	}>();

	// Map operators to symbols
	const opMap: Record<string, string> = {
		gt: ">",
		lt: "<",
		eq: "=",
		neq: "≠",
		matches: "≈",
	};

	const formatVal = (val: string | number) => {
		if (typeof val === "number") {
			return formatNumber(val, 2, true);
		}
		return val;
	};
</script>

<template>
	<div class="@container w-full border border-white/10 rounded">
		<div
			class="grid grid-cols-[minmax(0,1fr)_5rem_5rem] @sm:grid-cols-[minmax(0,1fr)_5rem_minmax(0,1fr)_5rem] @2xl:grid-cols-[minmax(0,2fr)_5rem_minmax(0,5fr)_minmax(0,2fr)_5rem] gap-2 @2xl:gap-4 px-4 py-2 bg-gray-dark text-xs uppercase border-b border-white/10">
			<div class="min-w-0">
				{{ $t("market_live.components.alert_feed.table.ticker_alert") }}
			</div>
			<div class="text-center">
				{{ $t("market_live.components.alert_feed.table.severity") }}
			</div>
			<div class="hidden @2xl:block">
				{{ $t("market_live.components.alert_feed.table.logic") }}
			</div>
			<div class="hidden @sm:block text-end">
				{{ $t("market_live.components.alert_feed.table.event") }}
			</div>
			<div class="text-end">
				{{ $t("market_live.components.alert_feed.table.time") }}
			</div>
		</div>

		<div class="divide-y divide-white/10 overflow-y-auto">
			<template v-for="event in eventLog" :key="event.id">
				<div class="group mx-auto cursor-pointer">
					<div
						class="grid grid-cols-[minmax(0,1fr)_5rem_5rem] @sm:grid-cols-[minmax(0,1fr)_5rem_minmax(0,1fr)_5rem] @2xl:grid-cols-[minmax(0,2fr)_5rem_minmax(0,5fr)_minmax(0,2fr)_5rem] gap-2 @2xl:gap-4 px-2 py-1 items-center hover:bg-white/5 transition-colors border-l-4 border-b-dark-gray"
						:class="{
							'border-transparent': event.severity === 'LOW',
							'border-orange-400': event.severity === 'MEDIUM',
							'border-red-600': event.severity === 'HIGH',
							'bg-red-500/20': event.severity === 'HIGH',
						}">
						<div class="min-w-0">
							<p
								class="text-white font-bold text-sm tracking-tight group-hover:text-prunplanner transition-colors">
								{{ event.ticker }}
							</p>
							<p class="text-white/50 text-[10px] uppercase">
								{{ event.metadata.name }}
							</p>
						</div>

						<div class="flex justify-center">
							<span
								class="text-xs px-2 py-0.5 rounded"
								:class="{
									'bg-gray-dark text-white/50':
										event.severity === 'LOW',
									'bg-orange-500/10 text-orange-500 border border-orange-500/20':
										event.severity === 'MEDIUM',
									'bg-red-600 text-white':
										event.severity === 'HIGH',
								}">
								{{
									$t(
										`market_live.severity_type.${event.severity}`
									)
								}}
							</span>
						</div>

						<div class="hidden @2xl:flex flex-wrap gap-2 font-mono">
							<div
								v-for="(trigger, idx) in event.metadata
									.triggers"
								:key="idx"
								class="flex items-center gap-1.5 bg-gray-dark border border-white/10 px-2 py-1 rounded text-xs shadow-inner">
								<span class="text-white/50 italic">
									{{ trigger.field }}
								</span>
								<span class="text-white font-bold">
									{{ formatVal(trigger.currentValue) }}
								</span>
								<span class="text-prunplanner">
									{{
										opMap[trigger.operator] ||
										trigger.operator
									}}
								</span>
								<span class="text-white/50">
									{{ formatVal(trigger.targetValue) }}
								</span>

								<span
									v-if="trigger.comparisonType !== 'static'"
									class="text-[9px] px-1 rounded bg-gray-dark border border-white/10 text-white/50">
									{{
										trigger.comparisonType ===
										"previous_pct"
											? "RELATIVE CHANGE"
											: "PREVIOUS"
									}}
								</span>
							</div>
						</div>

						<div
							class="col-span-3 @sm:col-span-1 order-last @sm:order-none @sm:text-end font-mono text-xs">
							<template
								v-for="(trigger, idx) in event.metadata
									.triggers"
								:key="'d' + idx">
								<div
									v-if="
										typeof event.metadata.data[
											trigger.field
										] === 'number'
									"
									:class="
										Number(trigger.currentValue) >
										Number(trigger.targetValue)
											? 'text-positive'
											: 'text-negative'
									">
									<span
										v-if="
											event.metadata.prevData?.[
												trigger.field
											]
										">
										{{
											formatNumber(
												event.metadata.prevData?.[
													trigger.field
												] as number,
												2,
												true
											)
										}}
										<span
											v-if="
												trigger.field.includes('_pct')
											">
											%
										</span>
										&rarr;
									</span>
									{{
										formatNumber(
											event.metadata.data[
												trigger.field
											] as number,
											2,
											true
										)
									}}
									<span v-if="trigger.field.includes('_pct')"
										>%</span
									>
								</div>
							</template>
						</div>

						<div
							class="flex flex-row gap-x-1 text-white/80 text-xs font-mono text-end">
							<div class="flex-grow">
								{{ formatDate(event.timestamp, "HH:mm:ss") }}
							</div>
							<div>
								<svg
									class="w-4 h-4 text-gray-600 group-hover:text-gray-300 transition-transform group-hover:rotate-180"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M19 9l-7 7-7-7"></path>
								</svg>
							</div>
						</div>
					</div>
					<div
						class="hidden group-hover:block animate-in fade-in slide-in-from-top-1 duration-200 bg-white/5 px-2 py-1 border-l-4"
						:class="{
							'border-transparent': event.severity === 'LOW',
							'border-orange-400': event.severity === 'MEDIUM',
							'border-red-600': event.severity === 'HIGH',
							'bg-red-500/20': event.severity === 'HIGH',
						}">
						<div class="col-span-12">
							<AlertFeedDetail
								:key="`DETAIL#${event.id}`"
								:data="event.metadata.data" />
						</div>
					</div>
				</div>
			</template>

			<div
				v-if="eventLog.length === 0"
				class="p-6 text-white/50 text-center text-xs">
				{{ $t("market_live.components.alert_feed.waiting") }}
			</div>
		</div>
	</div>
</template>
