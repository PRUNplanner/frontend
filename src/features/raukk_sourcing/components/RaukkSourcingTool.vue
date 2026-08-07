<script setup lang="ts">
	import { computed, ComputedRef, PropType, ref, Ref, toRef } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Stores
	import { useRaukkSourcingStore } from "@/features/raukk_sourcing/raukkSourcingStore";
	const sourcingStore = useRaukkSourcingStore();

	// Composables
	import { useRaukkSnapshot } from "@/features/raukk_sourcing/useRaukkSnapshot";

	// Components
	import RaukkInputsTable from "@/features/raukk_sourcing/components/RaukkInputsTable.vue";
	import RaukkOutputsTable from "@/features/raukk_sourcing/components/RaukkOutputsTable.vue";

	// Util
	import { formatDate } from "@/util/date";

	// UI
	import { PButton, PSelect, PTag, PTooltip, PInput } from "@/ui";
	import { PSelectOption } from "@/ui/ui.types";

	// Types & Interfaces
	import { IPlanResult } from "@/features/planning/usePlanCalculation.types";
	import {
		IRaukkTickerSource,
		RAUKK_REPAIR_DAY,
	} from "@/features/raukk_sourcing/raukkSourcing.types";

	const props = defineProps({
		planUuid: {
			type: String,
			required: false,
			default: undefined,
		},
		planName: {
			type: String,
			required: false,
			default: "",
		},
		planetNaturalId: {
			type: String,
			required: true,
		},
		cxUuid: {
			type: String,
			required: false,
			default: undefined,
		},
		planResult: {
			type: Object as PropType<IPlanResult>,
			required: true,
		},
		disabled: {
			type: Boolean,
			required: false,
			default: false,
		},
	});

	const {
		config,
		inputRows,
		outputRows,
		repairCost,
		snapshot,
		staleSources,
		sourceOptions,
		computeSnapshot,
	} = await useRaukkSnapshot({
		planUuid: toRef(props, "planUuid"),
		planName: toRef(props, "planName"),
		planetNaturalId: toRef(props, "planetNaturalId"),
		cxUuid: toRef(props, "cxUuid"),
		planResult: computed(() => props.planResult),
	});

	/** Configuration is read only without a stored plan uuid as well */
	const readOnly: ComputedRef<boolean> = computed(
		() => props.disabled || props.planUuid === undefined
	);

	const repairDayOptions: ComputedRef<PSelectOption[]> = computed(() =>
		[30, 60, 90, 120].map((day) => ({ label: `${day}`, value: day }))
	);

	function changeRepairDay(day: RAUKK_REPAIR_DAY): void {
		if (readOnly.value || !props.planUuid) return;

		sourcingStore.setRepairDay(props.planUuid, day);
	}

	function changeSource(
		ticker: string,
		source: IRaukkTickerSource | undefined
	): void {
		if (readOnly.value || !props.planUuid) return;

		if (source === undefined) {
			sourcingStore.clearTickerSource(props.planUuid, ticker);
			return;
		}

		sourcingStore.setTickerSource(props.planUuid, ticker, source);
	}

	/*
	 * Snapshot actions
	 */

	const refIsComputing: Ref<boolean> = ref(false);

	async function compute(): Promise<void> {
		refIsComputing.value = true;
		await computeSnapshot();
		refIsComputing.value = false;
	}

	/*
	 * Import & Export
	 */

	const refShowImport: Ref<boolean> = ref(false);
	const refImportPayload: Ref<string | null> = ref(null);
	const refImportMessage: Ref<string | undefined> = ref(undefined);
	const refImportFailed: Ref<boolean> = ref(false);
	const refFileInput: Ref<HTMLInputElement | null> = ref(null);

	function exportJSON(): void {
		const blob: Blob = new Blob([sourcingStore.exportJSON()], {
			type: "application/json;charset=utf-8;",
		});

		const url: string = URL.createObjectURL(blob);
		const link: HTMLAnchorElement = document.createElement("a");
		link.href = url;
		link.setAttribute("download", "PRUNplannerSourcing.json");

		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);

		URL.revokeObjectURL(url);
	}

	function applyImport(payload: string): void {
		try {
			sourcingStore.importJSON(payload);

			refImportFailed.value = false;
			refImportMessage.value = t(
				"raukk_sourcing.controls.import_success"
			);
			refShowImport.value = false;
			refImportPayload.value = null;
		} catch (error) {
			refImportFailed.value = true;
			refImportMessage.value = t("raukk_sourcing.controls.import_error", {
				message: error instanceof Error ? error.message : "unknown",
			});
		}
	}

	async function handleFileChange(event: Event): Promise<void> {
		const target: HTMLInputElement = event.target as HTMLInputElement;
		const file: File | undefined = target.files?.[0];

		if (file) applyImport(await file.text());

		target.value = "";
	}
</script>

<template>
	<h2 class="pb-3 text-white/80 font-bold text-lg">
		{{ $t("raukk_sourcing.title") }}
	</h2>
	<div class="text-white/50 pb-3">
		{{ $t("raukk_sourcing.info") }}
	</div>

	<div
		class="border rounded-[3px] border-white/20 p-3 flex flex-row flex-wrap gap-3 justify-between">
		<div class="flex flex-row flex-wrap gap-3 child:my-auto">
			<div class="font-bold">
				{{ $t("raukk_sourcing.controls.repair_day") }}
			</div>
			<PSelect
				class="w-25!"
				:value="config.repairDay"
				:options="repairDayOptions"
				:disabled="readOnly"
				@update:value="(v) => changeRepairDay(Number(v) as RAUKK_REPAIR_DAY)" />

			<PButton
				type="primary"
				:loading="refIsComputing"
				:disabled="readOnly"
				@click="compute">
				{{ $t("raukk_sourcing.controls.compute") }}
			</PButton>

			<PTooltip>
				<template #trigger>
					<PButton disabled>
						{{ $t("raukk_sourcing.controls.recompute_chain") }}
					</PButton>
				</template>
				{{ $t("raukk_sourcing.controls.recompute_chain_disabled") }}
			</PTooltip>
		</div>

		<div class="flex flex-row flex-wrap gap-3 child:my-auto">
			<PButton type="secondary" @click="exportJSON">
				{{ $t("raukk_sourcing.controls.export") }}
			</PButton>
			<PButton type="secondary" @click="refShowImport = !refShowImport">
				{{ $t("raukk_sourcing.controls.import") }}
			</PButton>
		</div>
	</div>

	<div v-if="refShowImport" class="pt-3 flex flex-col gap-3">
		<PInput
			v-model:value="refImportPayload"
			type="textarea"
			:rows="4"
			:placeholder="$t('raukk_sourcing.controls.import_placeholder')" />
		<div class="flex flex-row gap-3">
			<PButton
				type="primary"
				:disabled="!refImportPayload"
				@click="applyImport(refImportPayload ?? '')">
				{{ $t("raukk_sourcing.controls.import_apply") }}
			</PButton>
			<input
				ref="refFileInput"
				type="file"
				accept=".json"
				style="display: none"
				@change="handleFileChange" />
			<PButton type="secondary" @click="refFileInput?.click()">
				{{ $t("raukk_sourcing.controls.import_file") }}
			</PButton>
			<PButton type="secondary" @click="refShowImport = false">
				{{ $t("raukk_sourcing.controls.import_cancel") }}
			</PButton>
		</div>
	</div>

	<div v-if="refImportMessage" class="pt-3">
		<span :class="refImportFailed ? 'text-negative' : 'text-positive'">
			{{ refImportMessage }}
		</span>
	</div>

	<div class="pt-3 flex flex-row flex-wrap gap-3 child:my-auto">
		<template v-if="snapshot">
			<span class="text-white/60">
				{{
					$t("raukk_sourcing.snapshot.computed_at", {
						timestamp: formatDate(
							new Date(snapshot.computedAt),
							"YYYY-MM-DD HH:mm"
						),
					})
				}}
			</span>
			<PTag size="sm" :type="snapshot.stale ? 'error' : 'success'">
				{{
					snapshot.stale
						? $t("raukk_sourcing.snapshot.stale")
						: $t("raukk_sourcing.snapshot.current")
				}}
			</PTag>
		</template>
		<span v-else class="text-white/60">
			{{ $t("raukk_sourcing.snapshot.never") }}
		</span>

		<PTag v-if="staleSources.length > 0" size="sm" type="warning">
			{{
				$t("raukk_sourcing.snapshot.stale_sources", {
					count: staleSources.length,
				})
			}}
		</PTag>
	</div>

	<div v-if="props.planUuid === undefined" class="pt-3 text-white/50">
		{{ $t("raukk_sourcing.unsaved_plan") }}
	</div>
	<div v-else-if="props.disabled" class="pt-3 text-white/50">
		{{ $t("raukk_sourcing.read_only") }}
	</div>

	<h3 class="font-bold py-3">
		{{ $t("raukk_sourcing.inputs_title") }}
	</h3>
	<RaukkInputsTable
		:rows="inputRows"
		:source-options="sourceOptions"
		:repair-cost-per-day="repairCost.total"
		:disabled="readOnly"
		@update:source="changeSource" />

	<h3 class="font-bold py-3">
		{{ $t("raukk_sourcing.outputs_title") }}
	</h3>
	<RaukkOutputsTable :rows="outputRows" />
</template>
