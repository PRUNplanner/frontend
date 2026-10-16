<script setup lang="ts">
	import { computed, ref } from "vue";
	import { useI18n } from "vue-i18n";

	// Composables
	import { usePlanetData } from "@/database/services/usePlanetData";

	// Util
	import { formatNumber, formatPercent } from "@/util/numbers";
	import { exchangeOptionLabel } from "@/features/exchanges/exchangeLabel.util";
	import { ALL_PLANETS } from "@/features/exchanges/cxEdit.util";

	// Components
	import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";

	// Types & Interfaces
	import type { IExchangeNote } from "@/features/exchanges/exchangeNotes.util";

	// UI
	import { PButton, PIcon, PTable } from "@/ui";
	import { noticeConfig } from "@/ui/styles";
	import {
		InfoOutlined,
		KeyboardArrowDownSharp,
		KeyboardArrowUpSharp,
		WarningSharp,
	} from "@vicons/material";

	/*
	 * The heading (default slot) with the notes on the rules (see
	 * exchangeNotes.util) collapsed behind a button with their count at its
	 * right. Open, one compact row each below with "Open" to the note's
	 * scope, and the COGM drifts as one table with "Use COGM" per material
	 */
	const { notes, showOpen = false } = defineProps<{
		notes: IExchangeNote[];
		// link each note to its scope, for the Overview
		showOpen?: boolean;
	}>();

	const emit = defineEmits<{
		(e: "open", scope: string): void;
		(e: "use-cogm", note: IExchangeNote): void;
	}>();

	const open = ref(false);
	// the button shows the worst kind
	const kind = computed(() =>
		notes.some((n) => n.kind === "warning") ? "warning" : "info"
	);
	const ICONS = { info: InfoOutlined, warning: WarningSharp };

	// COGM drifts are many and alike: one table, largest gap first
	const diff = (n: IExchangeNote) => n.value! - n.cogm!;
	const gap = (n: IExchangeNote) => diff(n) / n.cogm!;
	const drifts = computed(() =>
		notes
			.filter((n) => n.code === "cogm_drift")
			.sort((a, b) => Math.abs(gap(b)) - Math.abs(gap(a)))
	);
	const signed = (text: string, value: number) =>
		value > 0 ? `+${text}` : text;
	const others = computed(() => notes.filter((n) => n.code !== "cogm_drift"));

	const { t } = useI18n();
	const { planetName } = usePlanetData();

	const names = (planets: string[]) =>
		planets.map((p) => planetName(p, p)).join(", ");

	function title(note: IExchangeNote): string {
		const tickers = note.tickers.join(", ");
		switch (note.code) {
			case "exchange_gap":
				return t("exchanges.notes.exchange_gap.title", {
					rule: exchangeOptionLabel(note.option!, t),
					side: t(`exchanges.notes.side.${note.type}`),
					tickers,
				});
			case "fixed_zero":
				return note.scope === ALL_PLANETS
					? t("exchanges.notes.fixed_zero.title_all", { tickers })
					: t("exchanges.notes.fixed_zero.title_planet", {
							tickers,
							planet: names([note.scope]),
						});
			case "planet_redundant":
				return t("exchanges.notes.planet_redundant.title", {
					planet: names([note.scope]),
				});
			case "unplanned_planets":
				return t("exchanges.notes.unplanned_planets.title", {
					planets: names(note.planets),
				});
			default:
				return t(`exchanges.notes.${note.code}.title`, { tickers });
		}
	}

	const detail = (note: IExchangeNote) =>
		t(
			`exchanges.notes.${note.code}.detail`,
			{ planets: names(note.planets) },
			note.planets.length
		);

	const noteKey = (n: IExchangeNote) =>
		[n.code, n.scope, n.option, n.type, ...n.tickers].join("#");

	// the scope to fix it in; planets without a plan open the first one
	const target = (note: IExchangeNote) =>
		note.code === "unplanned_planets" ? note.planets[0] : note.scope;
</script>

<template>
	<div class="flex flex-col gap-3">
		<div class="flex items-start justify-between gap-3">
			<div class="min-w-0">
				<slot />
			</div>
			<PButton
				v-if="notes.length"
				class="shrink-0"
				type="secondary"
				:aria-expanded="open"
				@click="open = !open">
				<template #icon>
					<PIcon :class="noticeConfig.types[kind].icon">
						<component :is="ICONS[kind]" />
					</PIcon>
				</template>
				{{
					$t("exchanges.notes.toggle", { n: notes.length }, notes.length)
				}}
				<PIcon :size="16">
					<component
						:is="open ? KeyboardArrowUpSharp : KeyboardArrowDownSharp" />
				</PIcon>
			</PButton>
		</div>
		<template v-if="open">
			<ul
				v-if="others.length"
				class="rounded-panel border border-white/10 divide-y divide-white/10 text-sm">
				<li
					v-for="note in others"
					:key="noteKey(note)"
					class="flex items-center gap-2 px-3 py-1.5">
					<PIcon
						:size="16"
						class="shrink-0"
						:class="noticeConfig.types[note.kind].icon">
						<component :is="ICONS[note.kind]" />
					</PIcon>
					<div class="grow min-w-0">
						<span class="font-bold">{{ title(note) }}</span>
						<span class="text-muted text-xs ml-2">
							{{ detail(note) }}
						</span>
					</div>
					<PButton
						v-if="showOpen && note.code !== 'unused_preference'"
						class="shrink-0"
						type="ghost"
						size="sm"
						@click="emit('open', target(note))">
						{{ $t("exchanges.notes.open") }}
					</PButton>
				</li>
			</ul>
			<div v-if="drifts.length" class="flex flex-col gap-1 text-sm">
				<div class="flex items-center gap-2">
					<PIcon :size="16" class="shrink-0" :class="noticeConfig.types.info.icon">
						<InfoOutlined />
					</PIcon>
					<span class="font-bold">
						{{
							$t(
								"exchanges.notes.cogm_drift.title",
								{ n: drifts.length },
								drifts.length
							)
						}}
					</span>
					<span class="text-muted text-xs">
						{{ $t("exchanges.notes.cogm_drift.detail") }}
					</span>
				</div>
				<PTable>
					<thead>
						<tr class="text-nowrap">
							<th>{{ $t("exchanges.notes.cogm_drift.material") }}</th>
							<th class="numeric">
								{{ $t("exchanges.notes.cogm_drift.fixed") }}
							</th>
							<th class="numeric">
								{{ $t("exchanges.notes.cogm_drift.cogm") }}
							</th>
							<th class="numeric">
								{{ $t("exchanges.notes.cogm_drift.difference") }}
							</th>
							<th class="w-full">
								{{ $t("exchanges.notes.cogm_drift.made_on") }}
							</th>
							<th />
						</tr>
					</thead>
					<tbody>
						<tr v-for="note in drifts" :key="noteKey(note)">
							<td><MaterialTile :ticker="note.tickers[0]" /></td>
							<td class="numeric tabular-nums">
								{{ formatNumber(note.value!) }}
							</td>
							<td class="numeric tabular-nums">
								{{ formatNumber(note.cogm!) }}
							</td>
							<td class="numeric tabular-nums text-nowrap">
								{{ signed(formatNumber(diff(note)), diff(note)) }}
								<span class="text-muted">
									{{ signed(formatPercent(gap(note) * 100, 0), gap(note)) }}
								</span>
							</td>
							<td class="text-muted text-xs">{{ names(note.planets) }}</td>
							<td>
								<PButton
									type="secondary"
									size="sm"
									@click="emit('use-cogm', note)">
									{{ $t("exchanges.notes.use_cogm") }}
								</PButton>
							</td>
						</tr>
					</tbody>
				</PTable>
			</div>
		</template>
	</div>
</template>
