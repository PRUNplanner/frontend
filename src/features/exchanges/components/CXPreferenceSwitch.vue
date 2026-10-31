<script setup lang="ts">
	import { computed } from "vue";

	// Composables
	import { useCXData } from "@/features/cx/useCXData";

	// Types & Interfaces
	import type { CX } from "@/features/api/schemas/cxData.schemas";

	// UI
	import { PForm, PFormItem, PSelect } from "@/ui";

	/*
	 * "Switch Preference" and the empires using it, linked to their view
	 * and to Management, where they are assigned
	 */
	const { cx } = defineProps<{ cx: CX }>();

	const emit = defineEmits<{
		(e: "switch", cxUuid: string): void;
	}>();

	const { getPreferenceOptions } = useCXData();
	const options = computed(() => getPreferenceOptions(false));
	const label = computed(
		() => options.value.find((o) => o.value === cx.uuid)?.label
	);

	function pick(value: string | number | null | undefined): void {
		if (value && value !== cx.uuid) emit("switch", String(value));
	}
</script>

<template>
	<div class="flex flex-col gap-2">
		<!-- label above the select, which gets the full column -->
		<PForm class="grid-cols-1!">
			<PFormItem :label="$t('exchanges.switch.label')">
				<!-- a long name ends in an ellipsis, the title shows it in full -->
				<PSelect
					searchable
					class="w-full min-w-0 [&_.text-nowrap]:truncate [&_.text-nowrap]:min-w-0"
					:title="label"
					:value="cx.uuid"
					:options="options"
					@update:value="pick" />
			</PFormItem>
		</PForm>
		<i18n-t
			v-if="cx.empires.length"
			keypath="exchanges.switch.used_by"
			tag="p"
			class="text-sm text-muted">
			<template #empires>
				<span v-for="(e, i) in cx.empires" :key="e.uuid">
					<span v-if="i > 0">, </span>
					<RouterLink :to="`/empire/${e.uuid}`" class="text-link">
						{{ e.empire_name }}
					</RouterLink>
				</span>
			</template>
			<template #management>
				<RouterLink to="/manage" class="text-link">
					{{ $t("exchanges.switch.management") }}
				</RouterLink>
			</template>
		</i18n-t>
		<i18n-t
			v-else
			keypath="exchanges.switch.unused"
			tag="p"
			class="text-sm text-muted">
			<template #management>
				<RouterLink to="/manage" class="text-link">
					{{ $t("exchanges.switch.management") }}
				</RouterLink>
			</template>
		</i18n-t>
	</div>
</template>
