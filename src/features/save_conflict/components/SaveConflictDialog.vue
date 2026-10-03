<script setup lang="ts">
	import { computed, type ComputedRef, type PropType } from "vue";
	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Composables
	import { usePlanetData } from "@/database/services/usePlanetData";
	const { planetName } = usePlanetData();
	import type { useSaveConflict } from "@/features/save_conflict/useSaveConflict";

	// Util
	import { collapse } from "@/features/save_conflict/saveConflict.util";
	import { cogcTextMapping } from "@/features/planning_data/usePlan";
	import { factionOptions } from "@/features/empire/empire.constants";

	// Types & Interfaces
	import type { PlanCOGCProgram } from "@/features/api/schemas/planningData.schemas";
	import type {
		IChangeLine,
		SaveConflictOption,
	} from "@/features/save_conflict/saveConflict.types";

	// UI
	import { NModal } from "naive-ui";
	import { PButton } from "@/ui";

	const props = defineProps({
		conflict: {
			type: Object as PropType<ReturnType<typeof useSaveConflict>>,
			required: true,
		},
	});

	const show: ComputedRef<boolean> = computed(
		() => props.conflict.show.value
	);

	// the first option is the recommended one
	const options: ComputedRef<SaveConflictOption[]> = computed(
		() => props.conflict.options.value
	);

	// as the exchange selects name them, e.g. "UNIVERSE VWAP 30D"
	function exchange(value: string | number): string {
		return String(value)
			.replace(/_(7D|30D)$/, " VWAP $1")
			.replace("_", " ");
	}

	function faction(value: string | number): string {
		return (
			factionOptions.find((f) => f.value === value)?.label ??
			String(value)
		);
	}

	/**
	 * A line in words: tickers stay, planets, programs, factions, experts
	 * and workforces as the app names them elsewhere
	 *
	 * @param {IChangeLine} line Line
	 * @returns {string} Text
	 */
	function text(line: IChangeLine): string {
		const params: Record<string, string | number> = { ...line.params };

		if (line.key === "cogc") {
			params.from = t(cogcTextMapping[params.from as PlanCOGCProgram]);
			params.to = t(cogcTextMapping[params.to as PlanCOGCProgram]);
		} else if (line.key === "faction") {
			params.from = faction(params.from);
			params.to = faction(params.to);
		} else if (line.key === "experts") {
			params.label = t(
				`game.expertise.${String(params.label).toUpperCase()}`
			);
		} else if (line.key.startsWith("lux_")) {
			params.label = t(`game.workforce_type.${params.label}`);
		} else if (line.key.startsWith("exchange")) {
			params.from = exchange(params.from);
			params.to = exchange(params.to);
		}
		if (params.planet)
			params.planet = planetName(
				String(params.planet),
				String(params.planet)
			);
		if (params.type) params.type = t(`save_conflict.type.${params.type}`);

		return t(`save_conflict.change.${line.key}`, params);
	}

	const sides = computed(() => {
		const changes = props.conflict.changes.value;
		if (!changes) return [];
		const both = new Set(changes.both);

		return [
			{ title: t("save_conflict.theirs"), lines: changes.theirs },
			{ title: t("save_conflict.mine"), lines: changes.mine },
		].map(({ title, lines }) => {
			const { shown, more } = collapse(lines);
			return {
				title,
				more,
				lines: shown.map((line) => ({
					text: text(line),
					both: both.has(line.area),
				})),
			};
		});
	});
</script>

<template>
	<NModal
		:show="show"
		class="w-160! max-w-[90vw]!"
		preset="card"
		:title="
			conflict.deleted.value
				? t('save_conflict.deleted_title')
				: t('save_conflict.title')
		"
		@update:show="(value: boolean) => !value && conflict.choose(null)">
		<p class="pb-3">
			{{
				conflict.deleted.value
					? t("save_conflict.deleted_text")
					: t("save_conflict.text")
			}}
		</p>
		<p v-if="conflict.loading.value" class="text-white/60">
			{{ t("save_conflict.loading") }}
		</p>
		<div
			v-else-if="sides.length > 0"
			class="grid grid-cols-1 sm:grid-cols-2 gap-6">
			<div v-for="side in sides" :key="side.title">
				<h3 class="font-bold pb-2">{{ side.title }}</h3>
				<ul class="flex flex-col gap-1 text-sm">
					<li v-if="side.lines.length === 0" class="text-white/60">
						{{ t("save_conflict.none") }}
					</li>
					<li
						v-for="(line, index) in side.lines"
						:key="index"
						:class="line.both ? 'text-negative font-bold' : ''">
						{{ line.text }}
						<span v-if="line.both" class="text-xs font-normal">
							({{ t("save_conflict.both") }})
						</span>
					</li>
					<li v-if="side.more > 0" class="text-white/60">
						{{ t("save_conflict.more", { n: side.more }) }}
					</li>
				</ul>
			</div>
		</div>
		<p
			v-else-if="
				!conflict.deleted.value && conflict.changes.value === null
			"
			class="text-white/60">
			{{ t("save_conflict.load_failed") }}
		</p>
		<ul class="pt-4 flex flex-col gap-1 text-xs text-white/60">
			<li v-for="option in options" :key="option">
				<strong>{{ t(`save_conflict.option.${option}`) }}:</strong>
				{{
					conflict.deleted.value
						? t(`save_conflict.deleted_option_help.${option}`)
						: t(`save_conflict.option_help.${option}`)
				}}
			</li>
		</ul>
		<template #action>
			<div class="flex flex-wrap justify-end gap-3">
				<PButton type="secondary" @click="conflict.choose(null)">
					{{ t("save_conflict.option.close") }}
				</PButton>
				<PButton
					v-for="(option, index) in [...options].reverse()"
					:key="option"
					:type="
						index === options.length - 1 ? 'primary' : 'secondary'
					"
					@click="conflict.choose(option)">
					{{ t(`save_conflict.option.${option}`) }}
				</PButton>
			</div>
		</template>
	</NModal>
</template>
