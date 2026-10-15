<script setup lang="ts">
	import { useI18n } from "vue-i18n";

	// Composables
	import { usePlanetData } from "@/database/services/usePlanetData";

	// Util
	import { formatNumber } from "@/util/numbers";
	import { exchangeOptionLabel } from "@/features/exchanges/exchangeLabel.util";
	import { ALL_PLANETS } from "@/features/exchanges/cxEdit.util";

	// Types & Interfaces
	import type { IExchangeNote } from "@/features/exchanges/exchangeNotes.util";

	// UI
	import { PButton, PNotice } from "@/ui";

	/*
	 * Notes on the rules (see exchangeNotes.util) as notices, with "Open"
	 * to the note's scope and "Use COGM" for a fixed price off its COGM
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
			case "cogm_drift":
				return t("exchanges.notes.cogm_drift.title", {
					ticker: tickers,
					value: formatNumber(note.value!),
					cogm: formatNumber(note.cogm!),
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
	<div v-if="notes.length" class="flex flex-col gap-2">
		<PNotice
			v-for="note in notes"
			:key="noteKey(note)"
			:type="note.kind">
			<div class="font-bold">{{ title(note) }}</div>
			<div class="text-muted">{{ detail(note) }}</div>
			<template
				v-if="
					note.code === 'cogm_drift' ||
					(showOpen && note.code !== 'unused_preference')
				"
				#action>
				<PButton
					v-if="note.code === 'cogm_drift'"
					type="secondary"
					size="sm"
					@click="emit('use-cogm', note)">
					{{ $t("exchanges.notes.use_cogm") }}
				</PButton>
				<PButton
					v-else
					type="ghost"
					size="sm"
					@click="emit('open', target(note))">
					{{ $t("exchanges.notes.open") }}
				</PButton>
			</template>
		</PNotice>
	</div>
</template>
