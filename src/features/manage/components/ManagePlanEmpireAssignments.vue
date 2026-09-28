<script setup lang="ts">
	import {
		computed,
		type ComputedRef,
		type PropType,
		ref,
		type Ref,
		watch,
		type WritableComputedRef,
	} from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Composables
	import { usePlanetData } from "@/database/services/usePlanetData";
	const { planetName } = usePlanetData();
	import { useQuery } from "@/lib/query_cache/useQuery";
	import { trackEvent } from "@/lib/analytics/useAnalytics";

	// Util
	import { inertClone } from "@/util/data";

	// Types & Interfaces
	import type { Plan } from "@/features/api/schemas/planningData.schemas";
	import type {
		PlanEmpireElement,
		PlanEmpireJunction,
	} from "@/features/api/schemas/empireData.schemas";
	import type {
		IPlanEmpireMatrix,
		IPlanEmpireMatrixEmpires,
	} from "@/features/manage/manage.types";
	import type { PSelectOption } from "@/ui/ui.types";

	// Components
	import SharingButton from "@/features/sharing/components/SharingButton.vue";
	import ManageAssignmentFilters from "@/features/manage/components/ManageAssignmentFilters.vue";

	// UI
	import { PCheckbox, PButton, PIcon } from "@/ui";
	import { useDialog } from "naive-ui";
	const dialog = useDialog();
	import { XNDataTable, XNDataTableColumn } from "@skit/x.naive-ui";
	import { tablePagination } from "@/util/pagination";
	import {
		ContentCopySharp,
		ClearSharp,
		SaveSharp,
		ChangeCircleOutlined,
		AddCircleOutlineSharp,
		CircleOutlined,
	} from "@vicons/material";

	const props = defineProps({
		empires: {
			type: Array as PropType<PlanEmpireElement[]>,
			required: true,
		},
		plans: {
			type: Array as PropType<Plan[]>,
			required: true,
		},
	});

	// Local Data & Watcher
	const localEmpires: WritableComputedRef<PlanEmpireElement[]> = computed({
		get: () => inertClone(props.empires),
		set: (value: PlanEmpireElement[]) => emit("update:empireList", value),
	});
	const localPlans: ComputedRef<Plan[]> = computed(() =>
		inertClone(props.plans)
	);

	watch([() => props.empires, () => props.plans], () => {
		generateMatrix();
	});

	const emit = defineEmits<{
		(e: "update:empireList", value: PlanEmpireElement[]): void;
		(e: "update:planList", value: Plan[]): void;
	}>();

	const matrixEmpires: Ref<IPlanEmpireMatrixEmpires[]> = ref([]);
	const matrix: Ref<IPlanEmpireMatrix[]> = ref([]);
	const refIsPatching: Ref<boolean> = ref(false);
	const refIsCloning: Ref<string | undefined> = ref(undefined);
	const refIsDeleting: Ref<string | undefined> = ref(undefined);

	const filterPlanNames: Ref<string[]> = ref([]);
	const filterEmpires: Ref<string[]> = ref([]);
	const filterOptionsPlanNames: ComputedRef<PSelectOption[]> = computed(() =>
		localPlans.value.map((e) => ({
			label: e.plan_name ?? "Missing Plan Name",
			value: e.uuid,
		}))
	);
	const filterOptionsEmpires: ComputedRef<PSelectOption[]> = computed(() =>
		localEmpires.value.map((e) => ({ label: e.empire_name, value: e.uuid }))
	);

	// generate initial matrix upon props passing
	generateMatrix();

	const filteredMatrix = computed(() => {
		let filtered = matrix.value;

		// filter plan names
		if (filterPlanNames.value.length > 0) {
			filtered = filtered.filter((f) =>
				filterPlanNames.value.includes(f.planUuid)
			);
		}

		// filter for active in empire
		if (filterEmpires.value.length > 0) {
			filtered = filtered.filter((f) =>
				Object.entries(f.empires)
					.filter(([_, value]) => value === true)
					.map(([key]) => key)
					.find((e) => filterEmpires.value.includes(e))
			);
		}

		return filtered;
	});

	function generateMatrix(): void {
		// reset matrix and empires
		matrix.value = [];
		matrixEmpires.value = [];

		matrixEmpires.value = localEmpires.value
			.map((e) => {
				return {
					empireUuid: e.uuid,
					empireName: e.empire_name,
				};
			})
			.sort((a, b) => (a.empireName > b.empireName ? 1 : -1));

		// prepare flatmap of all plan uuids within an empire
		const empirePlans: Record<string, string[]> = localEmpires.value.reduce(
			(acc, item) => (
				(acc[item.uuid] = item.plans.map((p) => p.uuid)),
				acc
			),
			{} as Record<string, string[]>
		);

		// prepare matrix based on plans
		localPlans.value.forEach((plan) => {
			matrix.value.push({
				// all plans coming from backend have a name and uuid, force it
				planName: plan.plan_name!,
				planUuid: plan.uuid,
				planetId: plan.planet_natural_id,
				empires: localEmpires.value.reduce(
					(acc, item) => (
						(acc[item.uuid] = empirePlans[item.uuid].includes(
							plan.uuid
						)),
						acc
					),
					{} as Record<string, boolean>
				),
			});
		});
	}

	function reload(): void {
		trackEvent("manage_plans_reload");
		localEmpires.value = inertClone(props.empires);
		generateMatrix();
	}

	function changeAllToEmpire(empireUuid: string, value: boolean): void {
		trackEvent("manage_plans_assign_all", { value });

		matrix.value.forEach((mv) => {
			// check if part of filtered view
			if (filteredMatrix.value.length != matrix.value.length) {
				if (
					filteredMatrix.value
						.map((e) => e.planUuid)
						.includes(mv.planUuid)
				) {
					mv.empires[empireUuid] = value;
				}
			} else {
				mv.empires[empireUuid] = value;
			}
		});
	}

	// junction patch matrix
	const patchJunctionData: ComputedRef<PlanEmpireJunction[]> = computed(
		() => {
			const junctions: PlanEmpireJunction[] = [];

			matrixEmpires.value.forEach((me) => {
				const indJunction = {
					empire_uuid: me.empireUuid,
					baseplanners: [] as PlanEmpireJunction["baseplanners"],
				};

				matrix.value.forEach((mp) => {
					if (mp.empires[me.empireUuid]) {
						indJunction.baseplanners.push({
							baseplanner_uuid: mp.planUuid,
						});
					}
				});

				return junctions.push(indJunction);
			});

			return junctions;
		}
	);

	async function updateEmitEmpiresPlans(): Promise<void> {
		useQuery("GetAllEmpires")
			.execute()
			.then((e: PlanEmpireElement[]) => {
				emit("update:empireList", e);
			});

		useQuery("GetAllPlans")
			.execute()
			.then((p: Plan[]) => emit("update:planList", p));
	}

	async function patchJunctions(): Promise<void> {
		refIsPatching.value = true;

		trackEvent("manage_plans_junctions_update");

		useQuery("PatchEmpirePlanJunctions", {
			junctions: patchJunctionData.value,
		})
			.execute()
			.then(() => updateEmitEmpiresPlans())
			.finally(() => (refIsPatching.value = false));
	}

	async function clonePlan(
		planUuid: string,
		planName: string
	): Promise<void> {
		refIsCloning.value = planUuid;

		trackEvent("manage_plans_clone", { planUuid });

		useQuery("ClonePlan", {
			planUuid: planUuid,
			cloneName: `${planName} (Clone)`,
		})
			.execute()
			.then(() => updateEmitEmpiresPlans())
			.finally(() => {
				refIsCloning.value = undefined;
			});
	}

	function handleDeleteConfirm(planUuid: string): void {
		dialog.warning({
			title: t("management.assignments.deletion.title"),
			content: t("management.assignments.deletion.content"),
			positiveText: t("common.buttons.delete"),
			negativeText: t("common.buttons.cancel"),
			onPositiveClick: () => {
				deletePlan(planUuid);
			},
		});
	}

	async function deletePlan(planUuid: string): Promise<void> {
		refIsDeleting.value = planUuid;

		trackEvent("manage_plans_delete", { planUuid });

		useQuery("DeletePlan", {
			planUuid: planUuid,
		})
			.execute()
			.then(() => updateEmitEmpiresPlans())
			.catch((err) => {
				console.error(err);
			})
			.finally(() => {
				refIsDeleting.value = undefined;
			});
	}

	const pagination = tablePagination(50);
</script>

<template>
	<div class="flex flex-row flex-wrap gap-3 justify-between">
		<h2 class="text-xl font-bold my-auto">
			{{ $t("management.assignments.title") }}
		</h2>
		<div class="flex gap-x-3">
			<PButton :loading="refIsPatching" @click="patchJunctions">
				<template #icon><SaveSharp /></template>
				{{ $t("management.assignments.buttons.update_assignments") }}
			</PButton>
			<PButton @click="reload">
				<template #icon><ChangeCircleOutlined /></template>
				{{ $t("management.assignments.buttons.reload") }}
			</PButton>
		</div>
	</div>
	<div class="py-3 text-white/60">
		{{ $t("management.assignments.description") }}
	</div>

	<ManageAssignmentFilters
		v-model:filter-plan-names="filterPlanNames"
		v-model:filter-empires="filterEmpires"
		:options-plan-names="filterOptionsPlanNames"
		:options-empires="filterOptionsEmpires"
		@apply:filter="generateMatrix" />
	<x-n-data-table
		:data="filteredMatrix"
		striped
		:single-line="false"
		:pagination="pagination">
		<x-n-data-table-column
			key="planName"
			:title="t('management.assignments.table.plan')"
			sorter="default"
			default-sort-order="ascend">
			<template #render-cell="{ rowData }">
				<div class="w-43.75 text-wrap">
					<router-link
						:to="`/plan/${rowData.planetId}/${rowData.planUuid}`"
						class="text-link-primary font-bold hover:underline">
						{{ rowData.planName }}
					</router-link>
				</div>
			</template>
		</x-n-data-table-column>
		<x-n-data-table-column
			key="planetId"
			:title="t('management.assignments.table.planet')"
			sorter="default">
			<template #render-cell="{ rowData }">
				<div class="w-43.75 text-wrap">
					{{ planetName(rowData.planetId, "Loading...") }}
				</div>
			</template>
		</x-n-data-table-column>

		<x-n-data-table-column
			key="options"
			:title="t('management.assignments.table.configuration')">
			<template #render-cell="{ rowData }">
				<div class="flex flex-row flex-wrap gap-1">
					<PButton
						:aria-label="$t('common.buttons.delete')"
						size="sm"
						type="error"
						:loading="refIsDeleting === rowData.planUuid"
						@click="handleDeleteConfirm(rowData.planUuid)">
						<template #icon><ClearSharp /></template>
					</PButton>
					<PButton
						:aria-label="$t('common.buttons.clone_plan')"
						size="sm"
						:loading="refIsCloning === rowData.planUuid"
						@click="clonePlan(rowData.planUuid, rowData.planName)">
						<template #icon><ContentCopySharp /></template>
					</PButton>
					<SharingButton
						:key="rowData.planUuid"
						#
						button-size="sm"
						:plan-uuid="rowData.planUuid" />
				</div>
			</template>
		</x-n-data-table-column>

		<!-- Empire Columns -->
		<x-n-data-table-column v-for="e in matrixEmpires" :key="e.empireUuid">
			<template #title>
				<div class="max-w-25 text-wrap">
					{{ e.empireName }}
				</div>
			</template>
			<x-n-data-table-column :key="`ASSIGN#${e.empireUuid}`">
				<template #title>
					<div class="py-1 flex flex-row justify-center gap-1">
						<button
							type="button"
							class="p-1 cursor-pointer"
							:aria-label="
								$t('management.assignments.table.assign_all', {
									empire: e.empireName,
								})
							"
							@click="changeAllToEmpire(e.empireUuid, true)">
							<PIcon color="var(--color-positive)" :size="16">
								<AddCircleOutlineSharp />
							</PIcon>
						</button>
						<button
							type="button"
							class="p-1 cursor-pointer"
							:aria-label="
								$t(
									'management.assignments.table.unassign_all',
									{
										empire: e.empireName,
									}
								)
							"
							@click="changeAllToEmpire(e.empireUuid, false)">
							<PIcon color="var(--color-negative)" :size="16">
								<CircleOutlined />
							</PIcon>
						</button>
					</div>
				</template>
				<template #render-cell="{ rowData }">
					<div class="flex flex-col items-center">
						<PCheckbox
							v-model:checked="rowData.empires[e.empireUuid]"
							:aria-label="
								$t(
									'management.assignments.table.assign_label',
									{
										plan: rowData.planName,
										empire: e.empireName,
									}
								)
							" />
					</div>
				</template>
			</x-n-data-table-column>
		</x-n-data-table-column>
		<template #empty>
			<div class="flex flex-col gap-y-3">
				<div class="text-center">
					{{ $t("management.assignments.table.nodata_title") }}
				</div>
				<div class="text-center">
					{{ $t("management.assignments.table.nodata_label") }}
				</div>
			</div>
		</template>
	</x-n-data-table>
</template>
