<script setup lang="ts">
	import { computed, type ComputedRef, ref, type Ref } from "vue";
	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Composables
	import { trackEvent } from "@/lib/analytics/useAnalytics";

	// Util
	import {
		formatWhen,
		versionLabel,
	} from "@/features/planning/planVersions.util";

	// Components
	import PlanSavePopover from "@/features/planning/components/PlanSavePopover.vue";
	import PlanVersionsPopover from "@/features/planning/components/PlanVersionsPopover.vue";

	// Types & Interfaces
	import type { PlanVersionListItem } from "@/features/api/schemas/planningData.schemas";

	// UI
	import { PButton, PButtonGroup, PSpin, PTooltip } from "@/ui";
	import {
		ErrorOutlineSharp,
		RedoSharp,
		SaveSharp,
		UndoSharp,
	} from "@vicons/material";

	/**
	 * The plan's save control, one segmented group: undo, redo, the save
	 * status (opens the versions) and Save with its menu while there is
	 * something to save. `part` splits it on a phone: history in the
	 * header, status and Save in the bar above the app's bottom bar.
	 */
	const props = withDefaults(
		defineProps<{
			part?: "all" | "history" | "save";
			/** undo and redo off (preview, read-only plan) */
			readOnly: boolean;
			/** own plan: status and Save; a shared copy has history only */
			own: boolean;
			existing: boolean;
			saveable: boolean;
			saving: boolean;
			failed: boolean;
			modified: boolean;
			canUndo: boolean;
			canRedo: boolean;
			savedAt: Date;
			versions: PlanVersionListItem[];
			/** drafts and versions exist: an own, created plan */
			versioned: boolean;
			draftSavedAt: Date | null;
			draftResumed: boolean;
			draftFailed: boolean;
			restoredFrom: PlanVersionListItem | null;
			preview: PlanVersionListItem | null;
			phone?: boolean;
		}>(),
		{ part: "all", phone: false }
	);

	const emit = defineEmits<{
		(e: "undo"): void;
		(e: "redo"): void;
		(e: "save", name: string): void;
		(e: "save-as-copy"): void;
		(e: "discard"): void;
		(e: "retry-draft"): void;
		(e: "preview", versionUuid: string): void;
		(e: "rename", versionUuid: string, name: string): void;
		(e: "activate", versionUuid: string): void;
		(e: "delete", versionUuid: string): void;
	}>();

	const showSaveMenu = defineModel<boolean>("saveMenu", { default: false });
	const refShowVersions: Ref<boolean> = ref(false);
	const refStatus: Ref<HTMLElement | null> = ref(null);

	const showHistory: ComputedRef<boolean> = computed(
		() => props.part !== "save"
	);
	const showSaveParts: ComputedRef<boolean> = computed(
		() => props.own && props.part !== "history"
	);

	type SaveState =
		| "preview"
		| "unnamed"
		| "saving"
		| "failed"
		| "new"
		| "restored"
		| "draft_failed"
		| "draft_from"
		| "draft_kept"
		| "unsaved"
		| "saved";

	const state: ComputedRef<SaveState> = computed(() => {
		if (props.preview) return "preview";
		if (!props.saveable) return "unnamed";
		if (props.saving) return "saving";
		if (props.failed) return "failed";
		if (!props.existing) return "new";
		if (!props.modified) return "saved";
		if (props.restoredFrom) return "restored";
		if (props.versioned && props.draftFailed) return "draft_failed";
		if (props.draftSavedAt && props.draftResumed) return "draft_from";
		if (props.draftSavedAt) return "draft_kept";
		return "unsaved";
	});

	const activeVersion: ComputedRef<PlanVersionListItem | undefined> =
		computed(() => props.versions.find((v) => v.is_active));

	const status: ComputedRef<string> = computed(() => {
		switch (state.value) {
			case "preview":
				return t("plan.save_status.viewing", {
					name: versionLabel(props.preview!, t),
				});
			case "unnamed":
				return props.existing
					? t("plan.save_status.name_to_save")
					: t("plan.save_status.name_to_create");
			case "saving":
				return t("plan.save_status.saving");
			case "failed":
				return t("plan.save_status.failed");
			case "new":
				return t("plan.save_status.unsaved");
			case "restored":
				return t("plan.save_status.restored", {
					name: versionLabel(props.restoredFrom!, t),
				});
			case "draft_failed":
				return t("plan.save_status.draft_failed");
			case "draft_from":
				return t("plan.save_status.draft_from", {
					when: formatWhen(props.draftSavedAt!, t),
				});
			case "draft_kept":
				return t("plan.save_status.draft_kept", {
					time: formatWhen(props.draftSavedAt!, t),
				});
			case "unsaved":
				return t("plan.save_status.unsaved");
			default: {
				const version = activeVersion.value;
				const time: string = formatWhen(
					version?.created_at ?? props.savedAt,
					t
				);
				if (version?.name)
					return t("plan.save_status.saved_named", {
						time,
						name: version.name,
					});
				// an unnamed restore names its source while it's listed
				const source: PlanVersionListItem | undefined =
					version?.kind === "restore"
						? props.versions.find(
								(v) => v.uuid === version.source_version
							)
						: undefined;
				return source
					? t("plan.save_status.saved_from", {
							time,
							name: versionLabel(source, t),
						})
					: t("plan.save_status.saved_at", { time });
			}
		}
	});

	// Save shows while there is something to save
	const showSave: ComputedRef<boolean> = computed(
		() =>
			showSaveParts.value &&
			state.value !== "preview" &&
			state.value !== "saved"
	);

	const saveLabel: ComputedRef<string> = computed(() => {
		if (props.failed) return t("plan.save_status.retry");
		return props.existing
			? t("common.buttons.save")
			: t("common.buttons.create");
	});

	// the status opens the versions; "Draft not saved" retries the draft
	function onStatus(): void {
		if (!props.versioned) return;
		if (state.value === "draft_failed") {
			emit("retry-draft");
			return;
		}
		refShowVersions.value = !refShowVersions.value;
		if (refShowVersions.value)
			trackEvent("plan:history_open", { trigger: "button" });
	}

	const segment = "pointer-coarse:h-11 pointer-coarse:min-w-11";
</script>

<template>
	<div class="inline-flex items-center gap-2">
		<PButtonGroup
			class="rounded-control border border-white/15 bg-black/30">
			<template v-if="showHistory">
				<PTooltip placement="bottom">
					<template #trigger>
						<PButton
							type="ghost"
							:class="segment"
							:disabled="readOnly || !canUndo"
							:aria-label="t('plan.history.undo')"
							@click="emit('undo')">
							<template #icon><UndoSharp /></template>
						</PButton>
					</template>
					{{ t("plan.history.undo_key") }}
				</PTooltip>
				<PTooltip placement="bottom">
					<template #trigger>
						<PButton
							type="ghost"
							:class="segment"
							:disabled="readOnly || !canRedo"
							:aria-label="t('plan.history.redo')"
							@click="emit('redo')">
							<template #icon><RedoSharp /></template>
						</PButton>
					</template>
					{{ t("plan.history.redo_key") }}
				</PTooltip>
			</template>
			<button
				v-if="showSaveParts"
				ref="refStatus"
				type="button"
				class="flex items-center gap-2 h-7 px-2 text-sm text-nowrap border-l border-line first:border-l-0 pointer-coarse:h-11"
				:class="[
					versioned ? 'cursor-pointer hover:bg-hover' : 'cursor-auto',
					state === 'preview' ? 'text-warning' : '',
					state === 'failed' || state === 'draft_failed'
						? 'text-negative'
						: '',
					state === 'saved' || state === 'unnamed'
						? 'text-muted'
						: '',
				]"
				:title="
					state === 'draft_failed'
						? t('plan.save_status.draft_failed_hint')
						: undefined
				"
				:aria-label="versioned ? undefined : status"
				:aria-haspopup="versioned && state !== 'draft_failed'"
				data-save-status
				@click="onStatus">
				<PSpin v-if="saving" size="xs" />
				<ErrorOutlineSharp
					v-else-if="state === 'failed' || state === 'draft_failed'"
					class="size-4" />
				<span
					v-else-if="
						state === 'unsaved' ||
						state === 'draft_kept' ||
						state === 'draft_from' ||
						state === 'restored' ||
						state === 'new'
					"
					aria-hidden="true"
					class="inline-block size-1.5 rounded-full bg-warning"
					data-unsaved />
				<span aria-live="polite">{{ status }}</span>
			</button>
			<template v-if="showSaveParts && state !== 'preview'">
				<PButton
					v-if="showSave"
					:type="failed ? 'error' : 'primary'"
					:class="segment"
					:loading="saving"
					:disabled="!saveable || saving"
					data-save
					@click="emit('save', '')">
					<template #icon>
						<ErrorOutlineSharp v-if="failed" />
						<SaveSharp v-else />
					</template>
					{{ saveLabel }}
				</PButton>
				<!-- also when saved: Save as copy and naming the current state -->
				<PlanSavePopover
					v-if="existing && saveable"
					v-model:show="showSaveMenu"
					:modified="modified"
					:primary="showSave"
					:saving="saving"
					@save="(name: string) => emit('save', name)"
					@save-as-copy="emit('save-as-copy')"
					@discard="emit('discard')" />
			</template>
		</PButtonGroup>
		<PlanVersionsPopover
			v-if="versioned && showSaveParts"
			v-model:show="refShowVersions"
			:versions="versions"
			:modified="modified"
			:draft-saved-at="draftSavedAt"
			:anchor="refStatus ?? undefined"
			:phone="phone"
			@preview="(uuid: string) => emit('preview', uuid)"
			@rename="(uuid: string, name: string) => emit('rename', uuid, name)"
			@activate="(uuid: string) => emit('activate', uuid)"
			@delete="(uuid: string) => emit('delete', uuid)" />
	</div>
</template>
