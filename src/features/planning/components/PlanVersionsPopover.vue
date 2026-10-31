<script setup lang="ts">
	import {
		computed,
		type ComputedRef,
		nextTick,
		ref,
		type Ref,
		useTemplateRef,
	} from "vue";
	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Util
	import {
		formatWhen,
		versionLabel,
	} from "@/features/planning/planVersions.util";

	// Types & Interfaces
	import type { PlanVersionListItem } from "@/features/api/schemas/planningData.schemas";

	// UI
	import { PButton, PCheckbox, PDrawer, PInput, PPopover, PTag } from "@/ui";
	import { EditOutlined, VisibilityOutlined } from "@vicons/material";

	/**
	 * The plan's versions, opened from the save status: named ones by
	 * default, the draft on top while there are unsaved changes, rename
	 * in place and preview. A bottom sheet on a phone.
	 */
	const props = defineProps<{
		versions: PlanVersionListItem[];
		modified: boolean;
		draftSavedAt: Date | null;
		/** positions the popover; none on a phone */
		anchor?: HTMLElement;
		phone: boolean;
	}>();

	const emit = defineEmits<{
		(e: "preview", versionUuid: string): void;
		(e: "rename", versionUuid: string, name: string): void;
	}>();

	const show = defineModel<boolean>("show", { default: false });

	const refNamedOnly: Ref<boolean> = ref(true);

	// the active version is listed also when unnamed
	const shown: ComputedRef<PlanVersionListItem[]> = computed(() =>
		refNamedOnly.value
			? props.versions.filter((v) => v.name !== "" || v.is_active)
			: props.versions
	);
	const hidden: ComputedRef<number> = computed(
		() => props.versions.length - shown.value.length
	);

	function sub(version: PlanVersionListItem): string {
		const parts: string[] = [];
		if (version.name) parts.push(formatWhen(version.created_at, t, true));
		if (version.kind === "restore") {
			const source = props.versions.find(
				(v) => v.uuid === version.source_version
			);
			parts.push(
				source
					? t("plan.versions.restored_from", {
							name: versionLabel(source, t),
						})
					: t("plan.versions.restored")
			);
		} else if (version.kind === "baseline")
			parts.push(t("plan.versions.baseline"));
		else if (version.kind === "admin") parts.push(t("plan.versions.admin"));
		return parts.join(" · ");
	}

	/*
	 * Inline rename: Enter saves, Escape cancels
	 */
	const refRenaming: Ref<string | null> = ref(null);
	const refRenameDraft: Ref<string> = ref("");
	const refRenameInput = useTemplateRef<{ focus: () => void }[]>("rename");

	function startRename(version: PlanVersionListItem): void {
		refRenaming.value = version.uuid;
		refRenameDraft.value = version.name;
		void nextTick(() => refRenameInput.value?.[0]?.focus());
	}

	function commitRename(version: PlanVersionListItem): void {
		if (refRenaming.value !== version.uuid) return;
		refRenaming.value = null;
		const name: string = refRenameDraft.value.trim().slice(0, 80);
		if (name !== version.name) emit("rename", version.uuid, name);
	}

	function preview(version: PlanVersionListItem): void {
		show.value = false;
		emit("preview", version.uuid);
	}

	const draftSub: ComputedRef<string> = computed(() =>
		props.draftSavedAt
			? `${t("plan.versions.draft_kept", { time: formatWhen(props.draftSavedAt, t) })} · ${t("plan.versions.not_in_empires")}`
			: t("plan.versions.draft_none")
	);

	const iconButton =
		"pointer-coarse:h-11 pointer-coarse:min-w-11 text-muted hover:text-ink";
</script>

<template>
	<component
		:is="phone ? PDrawer : PPopover"
		v-model:show="show"
		v-bind="
			phone
				? {
						placement: 'bottom',
						title: t('plan.versions.title'),
						autoFocus: false,
					}
				: {
						trigger: 'manual',
						anchor,
						placement: 'bottom-start',
						panelClass: 'p-0 w-96 max-w-[calc(100vw-2rem)]',
						'aria-label': t('plan.versions.title'),
						onClickoutside: () => (show = false),
					}
		"
		data-versions>
		<div
			class="flex items-center justify-between gap-3 px-3 py-2 border-b border-line">
			<span v-if="!phone" class="font-bold">
				{{ t("plan.versions.title") }}
			</span>
			<PCheckbox v-model:checked="refNamedOnly">
				{{ t("plan.versions.named_only") }}
			</PCheckbox>
		</div>
		<ul class="max-h-96 overflow-y-auto">
			<li
				v-if="modified"
				class="flex flex-col gap-0.5 px-3 py-2 border-b border-line"
				data-draft-row>
				<span class="text-ink">{{ t("plan.versions.draft_row") }}</span>
				<span class="text-xs text-muted">{{ draftSub }}</span>
			</li>
			<li v-if="versions.length === 0" class="px-3 py-2 text-muted">
				{{ t("plan.versions.empty") }}
			</li>
			<li
				v-for="version in shown"
				:key="version.uuid"
				class="flex items-center gap-2 px-3 py-2 border-b border-line"
				data-version>
				<div class="flex flex-col gap-0.5 flex-1 min-w-0">
					<PInput
						v-if="refRenaming === version.uuid"
						ref="rename"
						v-model:value="refRenameDraft"
						placeholder=""
						:aria-label="t('plan.versions.rename_label')"
						@keydown.enter.prevent="commitRename(version)"
						@keydown.esc.stop="refRenaming = null" />
					<span v-else class="text-ink truncate">
						{{ versionLabel(version, t) }}
					</span>
					<span v-if="sub(version)" class="text-xs text-muted">
						{{ sub(version) }}
					</span>
				</div>
				<PTag v-if="version.is_active" type="primary" size="sm">
					{{ t("plan.versions.active") }}
				</PTag>
				<PButton
					type="ghost"
					:class="iconButton"
					:aria-label="t('plan.versions.rename')"
					@click="startRename(version)">
					<template #icon><EditOutlined /></template>
				</PButton>
				<PButton
					type="ghost"
					:class="iconButton"
					:aria-label="t('plan.versions.preview')"
					@click="preview(version)">
					<template #icon><VisibilityOutlined /></template>
				</PButton>
			</li>
		</ul>
		<p class="px-3 py-2 text-xs text-muted">
			{{ t("plan.versions.footer") }}
			<template v-if="hidden > 0">
				{{ t("plan.versions.hidden", { n: hidden }, hidden) }}
			</template>
		</p>
	</component>
</template>
