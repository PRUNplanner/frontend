<script setup lang="ts">
	import {
		computed,
		ComputedRef,
		PropType,
		ref,
		Ref,
		watch,
		WritableComputedRef,
	} from "vue";

	// Composables
	import { usePlanetData } from "@/database/services/usePlanetData";
	const { planetNames, loadPlanetName } = usePlanetData();
	import { useQuery } from "@/lib/query_cache/useQuery";
	import { trackEvent } from "@/lib/analytics/useAnalytics";

	// Util
	import { inertClone } from "@/util/data";

	// Types & Interfaces
	import { IPlan, IPlanEmpireElement } from "@/stores/planningStore.types";
	import {
		IPlanEmpireJunction,
		IPlanEmpireJunctionBasePlanners,
		IPlanEmpireMatrix,
		IPlanEmpireMatrixEmpires,
	} from "@/features/manage/manage.types";
	import { PSelectOption } from "@/ui/ui.types";

	// Components
	import SharingButton from "@/features/sharing/components/SharingButton.vue";
	import ManageAssignmentFilters from "@/features/manage/components/ManageAssignmentFilters.vue";

	// UI
	import { PCheckbox, PButton, PIcon } from "@/ui";
	import { useDialog } from "naive-ui";
	const dialog = useDialog();
	import { XNDataTable, XNDataTableColumn } from "@skit/x.naive-ui";
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
			type: Array as PropType<IPlanEmpireElement[]>,
			required: true,
		},
		plans: {
			type: Array as PropType<IPlan[]>,
			required: true,
		},
	});

	// Local Data & Watcher
	const localEmpires: WritableComputedRef<IPlanEmpireElement[]> = computed({
		get: () => inertClone(props.empires),
		set: (value: IPlanEmpireElement[]) => emit("update:empireList", value),
	});
	const localPlans: ComputedRef<IPlan[]> = computed(() =>
		inertClone(props.plans)
	);

	watch([() => props.empires, () => props.plans], () => {
		generateMatrix();
	});

	const emit = defineEmits<{
		(e: "update:empireList", value: IPlanEmpireElement[]): void;
		(e: "update:planList", value: IPlan[]): void;
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
				planUuid: plan.uuid!,
				planetId: plan.planet_natural_id,
				empires: localEmpires.value.reduce(
					(acc, item) => (
						(acc[item.uuid] = empirePlans[item.uuid].includes(
							plan.uuid!
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
	const patchJunctionData: ComputedRef<IPlanEmpireJunction[]> = computed(
		() => {
			const junctions: IPlanEmpireJunction[] = [];

			matrixEmpires.value.forEach((me) => {
				const indJunction = {
					empire_uuid: me.empireUuid,
					baseplanners: [] as IPlanEmpireJunctionBasePlanners[],
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
			.then((e: IPlanEmpireElement[]) => {
				emit("update:empireList", e);
			});

		useQuery("GetAllPlans")
			.execute()
			.then((p: IPlan[]) => emit("update:planList", p));
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
			title: "Confirm Plan Deletion",
			content: "Are you sure? Deleting the Plan can't be reversed.",
			positiveText: "Delete",
			negativeText: "Cancel",
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
			.finally(() => {
				refIsDeleting.value = undefined;
			});
	}
</script>

<template>
	<div class="flex flex-row flex-wrap gap-3 justify-between">
		<h2 class="text-xl font-bold my-auto">Plan ↔ Empire Assignments</h2>
		<div class="flex gap-x-3">
			<PButton :loading="refIsPatching" @click="patchJunctions">
				<template #icon><SaveSharp /></template>
				Update Plan Assignments
			</PButton>
			<PButton @click="reload">
				<template #icon><ChangeCircleOutlined /></template>
				Reload
			</PButton>
		</div>
	</div>
	<div class="py-3 text-white/60">
		Every planned base can be assigned to multiple empires. This allows you
		to simultaneously keep track of your existing Prosperous Universe
		empire, corporation production chains or future expansion plans.
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
		:pagination="{ pageSize: 50 }">
		<x-n-data-table-column key="planName" title="Plan" sorter="default">
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
		<x-n-data-table-column key="planetId" title="Planet" sorter="default">
			<template #render-cell="{ rowData }">
				<div class="w-43.75 text-wrap">
					{{
						planetNames[rowData.planetId] ||
						loadPlanetName(rowData.planetId) ||
						"Loading..."
					}}
				</div>
			</template>
		</x-n-data-table-column>

		<x-n-data-table-column key="options" title="Configuration">
			<template #render-cell="{ rowData }">
				<div class="flex flex-row flex-wrap gap-1">
					<PButton
						size="sm"
						type="error"
						:loading="refIsDeleting === rowData.planUuid"
						@click="handleDeleteConfirm(rowData.planUuid)">
						<template #icon><ClearSharp /></template>
					</PButton>
					<PButton
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
						<PIcon
							color="rgb(192,226,24)"
							:size="16"
							@click="changeAllToEmpire(e.empireUuid, true)">
							<AddCircleOutlineSharp />
						</PIcon>
						<PIcon
							color="rgb(199,0,57)"
							:size="16"
							@click="changeAllToEmpire(e.empireUuid, false)">
							<CircleOutlined />
						</PIcon>
					</div>
				</template>
				<template #render-cell="{ rowData }">
					<div class="flex flex-col items-center">
						<PCheckbox
							v-model:checked="rowData.empires[e.empireUuid]" />
					</div>
				</template>
			</x-n-data-table-column>
		</x-n-data-table-column>
		<template #empty>
			<div class="flex flex-col gap-y-3">
				<div class="text-center">No Plans available.</div>
				<div class="text-center">
					Use
					<router-link
						to="/search"
						class="text-link-primary hover:underline">
						Planet Search
					</router-link>
					to create your first plan.
				</div>
			</div>
		</template>
	</x-n-data-table>
</template>
