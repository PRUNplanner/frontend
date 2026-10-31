<script setup lang="ts">
	import { computed, type ComputedRef, ref, type Ref } from "vue";
	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Composables
	import { usePlanetData } from "@/database/services/usePlanetData";
	const { planetName } = usePlanetData();

	// Util
	import { changeLineText } from "@/features/save_conflict/changeLineText";
	import {
		formatWhen,
		versionLabel,
	} from "@/features/planning/planVersions.util";

	// Types & Interfaces
	import type { PlanVersionListItem } from "@/features/api/schemas/planningData.schemas";
	import type { IChangeLine } from "@/features/save_conflict/saveConflict.types";

	// UI
	import { PButton, PNotice } from "@/ui";

	/**
	 * Shown while an older version is previewed read-only: compare it with
	 * the edits, restore it, open it as a new plan or go back
	 */
	const props = defineProps<{
		version: PlanVersionListItem;
		/** the version's differences from the edits */
		compare: () => IChangeLine[];
	}>();

	const emit = defineEmits<{
		(e: "restore"): void;
		(e: "activate"): void;
		(e: "open-as-plan"): void;
		(e: "back"): void;
	}>();

	const refChanges: Ref<IChangeLine[] | null> = ref(null);

	function toggleCompare(): void {
		refChanges.value = refChanges.value ? null : props.compare();
	}

	const name: ComputedRef<string> = computed(() =>
		versionLabel(props.version, t)
	);
	const lines: ComputedRef<string[]> = computed(() =>
		(refChanges.value ?? []).map((line) =>
			changeLineText(line, t, (id) => planetName(id, id))
		)
	);
</script>

<template>
	<PNotice type="warning" data-version-preview>
		<p>
			{{
				t("plan.versions.banner", {
					name,
					when: formatWhen(version.created_at, t, true),
				})
			}}
		</p>
		<!-- in the body, not the notice's #action: there the row can't wrap on a phone -->
		<div class="flex flex-wrap gap-2 pt-2">
			<PButton
				type="secondary"
				class="pointer-coarse:h-11"
				@click="toggleCompare">
				{{
					refChanges
						? t("plan.versions.hide_compare")
						: t("plan.versions.compare")
				}}
			</PButton>
			<PButton class="pointer-coarse:h-11" @click="emit('restore')">
				{{ t("plan.versions.restore") }}
			</PButton>
			<PButton
				v-if="!version.is_active"
				type="secondary"
				class="pointer-coarse:h-11"
				@click="emit('activate')">
				{{ t("plan.versions.make_active") }}
			</PButton>
			<PButton
				type="secondary"
				class="pointer-coarse:h-11"
				@click="emit('open-as-plan')">
				{{ t("plan.versions.open_as_plan") }}
			</PButton>
			<PButton
				type="secondary"
				class="pointer-coarse:h-11"
				@click="emit('back')">
				{{ t("plan.versions.back") }}
			</PButton>
		</div>
		<div v-if="refChanges" class="pt-2" data-version-compare>
			<h3 class="font-bold pb-1">
				{{ t("plan.versions.compare_title", { name }) }}
			</h3>
			<p v-if="lines.length === 0" class="text-muted">
				{{ t("plan.versions.no_changes") }}
			</p>
			<ul v-else class="flex flex-col gap-1 text-sm">
				<li v-for="(line, index) in lines" :key="index">{{ line }}</li>
			</ul>
		</div>
	</PNotice>
</template>
