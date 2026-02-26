<script setup lang="ts">
	import { computed, ComputedRef, PropType, ref, Ref, watch } from "vue";

	// Composables
	import { useQuery } from "@/lib/query_cache/useQuery";
	import { trackEvent } from "@/lib/analytics/useAnalytics";

	// Types & Interfaces
	import {
		ICX,
		IPlanEmpireElement,
		PLAN_FACTION,
	} from "@/stores/planningStore.types";
	import { ICXEmpireJunction } from "@/features/manage/manage.types";
	import { PSelectOption } from "@/ui/ui.types";

	// Util
	import { inertClone } from "@/util/data";
	import { capitalizeString } from "@/util/text";

	// UI
	import {
		PForm,
		PFormItem,
		PButton,
		PInput,
		PInputNumber,
		PSelect,
	} from "@/ui";
	import { useDialog } from "naive-ui";
	const dialog = useDialog();
	import { XNDataTable, XNDataTableColumn } from "@skit/x.naive-ui";
	import { ClearSharp, PlusSharp, SaveSharp } from "@vicons/material";

	const props = defineProps({
		empires: {
			type: Array as PropType<IPlanEmpireElement[]>,
			required: true,
		},
		cx: {
			type: Array as PropType<ICX[]>,
			required: true,
		},
	});

	// Local Data & Watcher
	const localEmpires: ComputedRef<IPlanEmpireElement[]> = computed(() =>
		inertClone(props.empires)
	);
	const localCX: ComputedRef<ICX[]> = computed(() => inertClone(props.cx));

	watch([() => props.empires, () => props.cx], () => {
		generateCXOptions();
		generateEmpireCXMap();
	});

	const emit = defineEmits<{
		(e: "update:cxList", value: ICX[]): void;
		(e: "update:empireList", value: IPlanEmpireElement[]): void;
	}>();

	const refCXOptions: Ref<PSelectOption[]> = ref([]);
	const refEmpireCXMap: Ref<Record<string, string | undefined>> = ref({});
	const refIsUpdatingJunctions: Ref<boolean> = ref(false);
	const refShowCreateEmpire: Ref<boolean> = ref(false);

	const refCreateFaction: Ref<PLAN_FACTION> = ref("NONE");
	const refCreatePermitsUsed: Ref<number> = ref(1);
	const refCreatePermitsTotal: Ref<number> = ref(2);
	const refCreateName: Ref<string | undefined> = ref(undefined);
	const refIsCreating: Ref<boolean> = ref(false);
	const refIsDeleting: Ref<string | undefined> = ref(undefined);
	const compCanCreate: ComputedRef<boolean> = computed(() => {
		if (
			refCreateName.value &&
			refCreateName.value !== "" &&
			refCreateName.value.length > 0 &&
			refCreateName.value.length <= 100 &&
			refCreatePermitsTotal.value >= refCreatePermitsUsed.value
		) {
			return true;
		}
		return false;
	});

	const factionOptions: PSelectOption[] = [
		{ label: "No Faction", value: "NONE" },
		{ label: "Antares", value: "ANTARES" },
		{ label: "Benten", value: "BENTEN" },
		{ label: "Hortus", value: "HORTUS" },
		{ label: "Moria", value: "MORIA" },
		{ label: "Outside Region", value: "OUTSIDEREGION" },
	];

	generateEmpireCXMap();
	generateCXOptions();

	function generateEmpireCXMap(): void {
		const map: Record<string, string | undefined> = {};

		localEmpires.value.forEach((e) => {
			// identify which cx is used
			map[e.uuid] = undefined;

			localCX.value.forEach((c) => {
				if (c.empires.find((ce) => ce.uuid === e.uuid)) {
					map[e.uuid] = c.uuid;
				}
			});
		});

		refEmpireCXMap.value = map;
	}

	function generateCXOptions(): void {
		const options: PSelectOption[] = [
			{
				value: undefined,
				label: "None",
			},
		];

		localCX.value.forEach((c) => {
			options.push({
				value: c.uuid,
				label: c.cx_name,
			});
		});

		refCXOptions.value = options;
	}

	const cxEmpireJunctions: ComputedRef<ICXEmpireJunction[]> = computed(() => {
		const jct: ICXEmpireJunction[] = [];

		// use all cx
		localCX.value.forEach((cx) => {
			const point: ICXEmpireJunction = {
				cx_uuid: cx.uuid,
				empires: [],
			};

			// find empires that have this setup
			Object.entries(refEmpireCXMap.value).forEach((entry) => {
				if (entry[1] === cx.uuid) {
					point.empires.push({
						empire_uuid: entry[0],
					});
				}
			});

			jct.push(point);
		});

		return jct;
	});

	async function updateCXJunctions(): Promise<void> {
		refIsUpdatingJunctions.value = true;

		try {
			trackEvent("manage_empire_junctions_update");

			await useQuery("PatchEmpireCXJunctions", {
				junctions: cxEmpireJunctions.value,
			}).execute();

			emit("update:cxList", await useQuery("GetAllCX").execute());
			refCreateName.value = "";
		} catch (err) {
			console.error(err);
		} finally {
			refIsUpdatingJunctions.value = false;
		}
	}

	async function createEmpire(): Promise<void> {
		refIsCreating.value = true;

		try {
			if (compCanCreate.value) {
				trackEvent("manage_empire_create");

				await useQuery("CreateEmpire", {
					data: {
						empire_faction: refCreateFaction.value,
						empire_permits_used: refCreatePermitsUsed.value,
						empire_permits_total: refCreatePermitsTotal.value,
						empire_name: refCreateName.value!,
					},
				}).execute();

				// forced reload of all Empires
				emit(
					"update:empireList",
					await useQuery("GetAllEmpires").execute()
				);
			}
		} catch (err) {
			console.error(err);
		} finally {
			refIsCreating.value = false;
			refShowCreateEmpire.value = false;
		}
	}

	function handleDeleteConfirm(empireUuid: string): void {
		dialog.warning({
			title: "Confirm Empire Deletion",
			content:
				"Are you sure? Deleting the Empire will not delete plans assigned to it.",
			positiveText: "Delete",
			negativeText: "Cancel",
			onPositiveClick: () => {
				deleteEmpire(empireUuid);
			},
		});
	}

	async function deleteEmpire(empireUuid: string): Promise<void> {
		refIsDeleting.value = empireUuid;
		trackEvent("manage_empire_delete", { empireUuid: empireUuid });
		const deletionResult: boolean = await useQuery("DeleteEmpire", {
			empireUuid: empireUuid,
		}).execute();

		if (deletionResult) {
			// forced reload of all Empires
			emit(
				"update:empireList",
				await useQuery("GetAllEmpires").execute()
			);
		}

		refIsDeleting.value = undefined;
	}
</script>

<template>
	<div class="flex flex-row flex-wrap gap-3 justify-between">
		<h2 class="text-xl font-bold my-auto">Empire Configuration</h2>
		<div class="flex gap-x-3">
			<PButton
				:loading="refIsUpdatingJunctions"
				@click="updateCXJunctions">
				<template #icon><SaveSharp /></template>
				Update CX Assignments
			</PButton>
			<PButton @click="refShowCreateEmpire = !refShowCreateEmpire">
				<template #icon><PlusSharp /></template>
				New Empire
			</PButton>
		</div>
	</div>
	<div class="py-3 text-white/60">
		Removing empires will not delete any associated plans — they will simply
		become unassigned. You can create edit existing empires in the Empire
		View. To ensure correct plan efficiency calculations, make sure each
		empire has your Faction and the appropriate Permits.
	</div>
	<div
		:class="
			!refShowCreateEmpire
				? 'opacity-0 overflow-hidden h-0'
				: 'opacity-100'
		"
		class="transition-all duration-500 border-t border-b border-white/10">
		<div class="flex gap-x-3 pt-3 w-1/2 min-w-100">
			<div class="grow">
				<PForm>
					<PFormItem label="Empire Name">
						<PInput
							v-model:value="refCreateName"
							class="w-full"
							placeholder="Empire Name (max. 100 characters)" />
					</PFormItem>
					<PFormItem label="Faction">
						<PSelect
							v-model:value="refCreateFaction"
							class="w-full"
							:options="factionOptions" />
					</PFormItem>
					<PFormItem label="Permits Total">
						<PInputNumber
							v-model:value="refCreatePermitsTotal"
							show-buttons
							:min="2"
							class="w-full" />
					</PFormItem>
					<PFormItem label="Permits Used">
						<PInputNumber
							v-model:value="refCreatePermitsUsed"
							show-buttons
							:min="1"
							class="w-full" />
					</PFormItem>
				</PForm>
			</div>
			<div>
				<PButton
					:disabled="!compCanCreate"
					:loading="refIsCreating"
					@click="createEmpire">
					Create
				</PButton>
			</div>
		</div>
	</div>
	<x-n-data-table :data="localEmpires" striped class="pt-3">
		<x-n-data-table-column key="empire_name" title="Name">
			<template #render-cell="{ rowData }">
				<router-link
					:to="`/empire/${rowData.uuid}`"
					class="text-link-primary font-bold hover:underline">
					{{ rowData.empire_name }}
				</router-link>
			</template>
		</x-n-data-table-column>
		<x-n-data-table-column key="empire_faction" title="Faction">
			<template #render-cell="{ rowData }">
				{{ capitalizeString(rowData.empire_faction) }}
			</template>
		</x-n-data-table-column>
		<x-n-data-table-column key="permits" title="Permits">
			<template #render-cell="{ rowData }">
				{{ rowData.empire_permits_used }} /
				{{ rowData.empire_permits_total }}
			</template>
		</x-n-data-table-column>
		<x-n-data-table-column key="plans" title="Plans">
			<template #render-cell="{ rowData }">
				{{ rowData.plans.length }}
			</template>
		</x-n-data-table-column>
		<x-n-data-table-column key="cx" title="CX" width="200">
			<template #render-cell="{ rowData }">
				<div class="max-w-50">
					<PSelect
						:key="`${rowData.uuid}#${refEmpireCXMap[rowData.uuid]}`"
						v-model:value="refEmpireCXMap[rowData.uuid]"
						:options="refCXOptions" />
				</div>
			</template>
		</x-n-data-table-column>
		<x-n-data-table-column key="configuration" title="">
			<template #render-cell="{ rowData }">
				<div class="justify-end flex gap-x-3">
					<PButton
						size="sm"
						type="error"
						:loading="refIsDeleting === rowData.uuid"
						@click="handleDeleteConfirm(rowData.uuid)">
						<template #icon><ClearSharp /></template>
					</PButton>
				</div>
			</template>
		</x-n-data-table-column>
		<template #empty>
			<div class="flex flex-col gap-y-3">
				<div class="text-center">No Empires available.</div>
				<div class="text-center">Create your first Empire.</div>
			</div>
		</template>
	</x-n-data-table>
</template>
