<script setup lang="ts">
	import {
		computed,
		type ComputedRef,
		type PropType,
		ref,
		type Ref,
	} from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Composables
	import { useQuery } from "@/lib/query_cache/useQuery";
	import { trackEvent } from "@/lib/analytics/useAnalytics";

	// Types & Interfaces
	import type { CX } from "@/features/api/schemas/cxData.schemas";

	// Util
	import { inertClone } from "@/util/data";

	// UI
	import { PButton, PDataTable, PInput, PTag, useConfirm } from "@/ui";
	const confirm = useConfirm();
	import type { PDataTableColumn } from "@/ui/ui.types";
	import { ClearSharp, PlusSharp } from "@vicons/material";

	const props = defineProps({
		cx: {
			type: Array as PropType<CX[]>,
			required: true,
		},
	});

	// Local Data
	const localCX: ComputedRef<CX[]> = computed(() => inertClone(props.cx));

	const refShowCreateCX: Ref<boolean> = ref(false);
	const refIsCreating: Ref<boolean> = ref(false);
	const refIsDeleting: Ref<string | undefined> = ref(undefined);
	const refNewCXName: Ref<string | undefined> = ref(undefined);
	const compCanCreate: ComputedRef<boolean> = computed(() => {
		if (
			refNewCXName.value &&
			refNewCXName.value !== "" &&
			refNewCXName.value.length > 0 &&
			refNewCXName.value.length <= 100
		)
			return true;
		return false;
	});

	const emit = defineEmits<{
		(e: "update:cxList", value: CX[]): void;
	}>();

	async function createCX(): Promise<void> {
		if (compCanCreate.value) {
			refIsCreating.value = true;

			trackEvent("manage:cx_create");

			try {
				await useQuery("CreateCX", {
					cxName: refNewCXName.value!,
				}).execute();

				// forced reload of all CX
				emit("update:cxList", await useQuery("GetAllCX").execute());

				refNewCXName.value = "";
				refShowCreateCX.value = false;
			} catch (err) {
				console.error(err);
			} finally {
				refIsCreating.value = false;
			}
		}
	}

	async function handleDeleteConfirm(cxUuid: string): Promise<void> {
		const confirmed = await confirm({
			title: t("management.cx.deletion.title"),
			content: t("management.cx.deletion.content"),
			positiveText: t("common.buttons.delete"),
			negativeText: t("common.buttons.cancel"),
		});
		if (confirmed) deleteCX(cxUuid);
	}

	async function deleteCX(cxUuid: string): Promise<void> {
		refIsDeleting.value = cxUuid;

		trackEvent("manage:cx_delete", { cx_uuid: cxUuid });

		try {
			const deletionResult: boolean = await useQuery("DeleteCX", {
				cxUuid: cxUuid,
			}).execute();

			if (deletionResult) {
				// forced reload of all CX
				emit("update:cxList", await useQuery("GetAllCX").execute());
			}
		} catch (err) {
			console.error(err);
		} finally {
			refIsDeleting.value = undefined;
		}
	}

	const columns = computed<PDataTableColumn<CX>[]>(() => [
		{ key: "cx_name", title: t("management.cx.table.cx_name") },
		{
			key: "uuid",
			title: t("management.cx.table.assigned_to_empire"),
			titleAlign: "center",
		},
		{ key: "configuration", title: "" },
	]);
</script>

<template>
	<div class="flex flex-row flex-wrap gap-3 justify-between">
		<h2 class="text-xl font-bold my-auto">
			{{ $t("management.cx.title") }}
		</h2>
		<PButton @click="refShowCreateCX = !refShowCreateCX">
			<template #icon><PlusSharp /></template>
			{{ $t("management.cx.buttons.new_cx") }}
		</PButton>
	</div>
	<div class="py-3 text-muted">
		{{ $t("management.cx.description") }}
	</div>
	<div
		:class="
			!refShowCreateCX ? 'opacity-0 overflow-hidden h-0' : 'opacity-100'
		"
		class="transition-all duration-500 border-t border-b border-white/10">
		<div class="flex gap-x-3 py-2">
			<div class="my-auto">{{ $t("management.cx.form.cx_name") }}</div>
			<div class="grow">
				<PInput
					v-model:value="refNewCXName"
					:aria-label="$t('management.cx.form.cx_name')"
					:placeholder="t('management.cx.form.cx_placeholder')" />
			</div>
			<PButton
				:loading="refIsCreating"
				:disabled="!compCanCreate"
				@click="createCX">
				{{ $t("common.buttons.create") }}
			</PButton>
		</div>
	</div>

	<PDataTable :columns="columns" :data="localCX" striped class="pt-3">
		<template #cell-cx_name="{ row }">
				<router-link
					:to="`/exchanges/${row.uuid}`"
					class="text-link-primary font-bold hover:underline">
					{{ row.cx_name }}
				</router-link>
		</template>
		<template #cell-uuid="{ row }">
				<div class="text-center">
					<PTag v-if="row.empires.length > 0" type="success">
						{{ $t("common.buttons.yes") }} ({{
							row.empires.length
						}})
					</PTag>
					<PTag v-else type="error">
						{{ $t("common.buttons.no") }}
					</PTag>
				</div>
		</template>
		<template #cell-configuration="{ row }">
				<div class="text-end">
					<PButton
						:aria-label="$t('common.buttons.delete')"
						size="sm"
						type="error"
						:loading="refIsDeleting === row.uuid ? true : false"
						@click="handleDeleteConfirm(row.uuid)">
						<template #icon><ClearSharp /></template>
					</PButton>
				</div>
		</template>
		<template #empty>
			<div class="flex flex-col gap-y-3">
				<div class="text-center">
					{{ $t("management.cx.table.nodata_title") }}
				</div>
				<div class="text-center">
					{{ $t("management.cx.table.nodata_label") }}
				</div>
			</div>
		</template>
	</PDataTable>
</template>
