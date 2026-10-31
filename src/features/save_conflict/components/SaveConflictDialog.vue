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
	import { changeLineText } from "@/features/save_conflict/changeLineText";

	// Types & Interfaces
	import type { SaveConflictOption } from "@/features/save_conflict/saveConflict.types";

	// UI
	import { PButton, PModal } from "@/ui";

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

	// a draft conflict has its own texts under save_conflict.<variant>.*
	function key(name: string): string {
		const variant = props.conflict.variant.value;
		return variant === "save"
			? `save_conflict.${name}`
			: `save_conflict.${variant}.${name}`;
	}

	const sides = computed(() => {
		const changes = props.conflict.changes.value;
		if (!changes) return [];
		const both = new Set(changes.both);

		// a draft of an older save: that save isn't known, only the draft's
		// changes from the current one are
		const theirs =
			props.conflict.variant.value === "draft_base"
				? []
				: [{ title: t(key("theirs")), lines: changes.theirs }];
		return [...theirs, { title: t(key("mine")), lines: changes.mine }].map(
			({ title, lines }) => {
				const { shown, more } = collapse(lines);
				return {
					title,
					more,
					lines: shown.map((line) => ({
						text: changeLineText(line, t, (id) =>
							planetName(id, id)
						),
						both: both.has(line.area),
					})),
				};
			}
		);
	});
</script>

<template>
	<PModal
		:show="show"
		:width="640"
		:title="
			conflict.deleted.value
				? t('save_conflict.deleted_title')
				: t(key('title'))
		"
		@update:show="(value: boolean) => !value && conflict.choose(null)">
		<p class="pb-3">
			{{
				conflict.deleted.value
					? t("save_conflict.deleted_text")
					: t(key("text"))
			}}
		</p>
		<p v-if="conflict.loading.value" class="text-muted">
			{{ t("save_conflict.loading") }}
		</p>
		<div
			v-else-if="sides.length > 0"
			class="grid grid-cols-1 sm:grid-cols-2 gap-6">
			<div v-for="side in sides" :key="side.title">
				<h3 class="font-bold pb-2">{{ side.title }}</h3>
				<ul class="flex flex-col gap-1 text-sm">
					<li v-if="side.lines.length === 0" class="text-muted">
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
					<li v-if="side.more > 0" class="text-muted">
						{{ t("save_conflict.more", { n: side.more }) }}
					</li>
				</ul>
			</div>
		</div>
		<p
			v-else-if="
				!conflict.deleted.value && conflict.changes.value === null
			"
			class="text-muted">
			{{ t("save_conflict.load_failed") }}
		</p>
		<ul class="pt-4 flex flex-col gap-1 text-xs text-muted">
			<li v-for="option in options" :key="option">
				<strong>{{ t(key(`option.${option}`)) }}:</strong>
				{{
					conflict.deleted.value
						? t(`save_conflict.deleted_option_help.${option}`)
						: t(key(`option_help.${option}`))
				}}
			</li>
		</ul>
		<template #action>
			<div class="flex flex-wrap justify-end gap-3">
				<PButton type="secondary" @click="conflict.choose(null)">
					{{ t(key("option.close")) }}
				</PButton>
				<PButton
					v-for="(option, index) in [...options].reverse()"
					:key="option"
					:type="
						index === options.length - 1 ? 'primary' : 'secondary'
					"
					@click="conflict.choose(option)">
					{{ t(key(`option.${option}`)) }}
				</PButton>
			</div>
		</template>
	</PModal>
</template>
