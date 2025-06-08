<script setup lang="ts">
	import {
		computed,
		ComputedRef,
		PropType,
		ref,
		Ref,
		watch,
		h,
		VNodeChild,
	} from "vue";

	// Stores
	import { usePlanningStore } from "@/stores/planningStore";
	const planningStore = usePlanningStore();

	// API
	import { callUpdateCXJunctions } from "@/features/cx/cxData.api";
	import {
		callCreateEmpire,
		callDeleteEmpire,
	} from "@/features/empire/empireData.api";

	// Types & Interfaces
	import {
		ICX,
		IPlanEmpireElement,
		PLAN_FACTION,
	} from "@/stores/planningStore.types";
	import { ICXEmpireJunction } from "@/features/manage/manage.types";
	import { SelectMixedOption } from "naive-ui/es/select/src/interface";

	// Util
	import { inertClone } from "@/util/data";
	import { capitalizeString } from "@/util/text";

	// UI
	import {
		useDialog,
		NForm,
		NFormItem,
		NInput,
		NInputNumber,
		NSelect,
		NTag,
		NButton,
		NCheckbox,
	} from "naive-ui";
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
	const localEmpires: Ref<IPlanEmpireElement[]> = ref(
		inertClone(props.empires)
	);
	const localCX: Ref<ICX[]> = ref(inertClone(props.cx));

	watch(
		() => props.empires,
		(newData: IPlanEmpireElement[]) => {
			localEmpires.value = inertClone(newData);
			generateCXOptions();
			generateEmpireCXMap();
		},
		{ deep: true }
	);
	watch(
		() => props.cx,
		(newData: ICX[]) => {
			localCX.value = inertClone(newData);
			generateCXOptions();
			generateEmpireCXMap();
		},
		{ deep: true }
	);

	const emit = defineEmits<{
		(e: "update:cxList", value: ICX[]): void;
		(e: "update:empireList", value: IPlanEmpireElement[]): void;
	}>();

	const refCXOptions: Ref<SelectMixedOption[]> = ref([]);
	const refEmpireCXMap: Ref<Record<string, string | undefined>> = ref({});
	const refIsUpdatingJunctions: Ref<boolean> = ref(false);
	const refShowCreateEmpire: Ref<boolean> = ref(false);

	const refCreateFaction: Ref<PLAN_FACTION> = ref("NONE");
	const refCreatePermitsUsed: Ref<number> = ref(1);
	const refCreatePermitsTotal: Ref<number> = ref(2);
	const refCreateName: Ref<string | undefined> = ref(undefined);
	const refCreateUseFioStorage: Ref<boolean> = ref(false);
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

	const factionOptions: SelectMixedOption[] = [
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
		const options: SelectMixedOption[] = [
			{
				value: undefined,
				label: "None",
			},
		];

		localCX.value.forEach((c) => {
			options.push({
				value: c.uuid,
				label: c.name,
			});
		});

		refCXOptions.value = options;
	}

	function selectRenderLabelWithTooltip(option: SelectMixedOption): VNodeChild {
		// Native UI tooltips do look nicer, but are annoying when trying to
		// interact with the select. Instead, we'll wrap the label in a div with
		// 'title' set on it so we get the browser native tooltips
		return h("div", { title: option.label }, { default: () => option.label });
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
			await callUpdateCXJunctions(cxEmpireJunctions.value);
			// forced reload of all CX
			emit("update:cxList", await planningStore.getAllCX(true));
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
				await callCreateEmpire({
					faction: refCreateFaction.value,
					permits_used: refCreatePermitsUsed.value,
					permits_total: refCreatePermitsTotal.value,
					name: refCreateName.value!,
					use_fio_storage: refCreateUseFioStorage.value,
				});

				// forced reload of all Empires
				emit("update:empireList", await planningStore.getAllEmpires(true));
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
		const deletionResult: boolean = await callDeleteEmpire(empireUuid);

		if (deletionResult) {
			// forced reload of all Empires
			emit("update:empireList", await planningStore.getAllEmpires(true));
		}

		refIsDeleting.value = undefined;
	}
</script>

<template>
	<div class="flex justify-between">
		<h2 class="text-xl font-bold my-auto">Empire Configuration</h2>
		<div class="flex gap-x-3">
			<n-button
				size="small"
				@click="refShowCreateEmpire = !refShowCreateEmpire"
			>
				<template #icon><PlusSharp /></template>
				New Empire
			</n-button>
			<n-button
				size="small"
				:loading="refIsUpdatingJunctions"
				@click="updateCXJunctions"
			>
				<template #icon><SaveSharp /></template>
				Update CX Assignments
			</n-button>
		</div>
	</div>
	<div class="py-3 text-white/60">
		Removing empires will not delete any associated plans — they will simply
		become unassigned. You can create edit existing empires in the Empire View.
		To ensure correct plan efficiency calculations, make sure each empire has
		your Faction and the appropriate Permits.
	</div>
	<div
		:class="
			!refShowCreateEmpire ? 'opacity-0 overflow-hidden !h-0' : 'opacity-100'
		"
		class="transition-all duration-500 border-t border-b border-white/10"
	>
		<div class="flex gap-x-3 pt-3 w-1/2 min-w-[400px]">
			<div class="flex-grow">
				<n-form
					label-placement="left"
					label-width="auto"
					label-align="left"
					size="small"
				>
					<n-form-item label="Empire Name">
						<n-input
							v-model:value="refCreateName"
							placeholder="Empire Name (max. 100 characters)"
						/>
					</n-form-item>
					<n-form-item label="Faction">
						<n-select
							:options="factionOptions"
							v-model:value="refCreateFaction"
						/>
					</n-form-item>
					<n-form-item label="Permits Total">
						<n-input-number
							v-model:value="refCreatePermitsTotal"
							show-button
							:min="2"
							class="w-full"
						/>
					</n-form-item>
					<n-form-item label="Permits Used">
						<n-input-number
							v-model:value="refCreatePermitsUsed"
							show-button
							:min="1"
							class="w-full"
						/>
					</n-form-item>
					<n-form-item label="Use FIO Storage?">
						<n-checkbox v-model:checked="refCreateUseFioStorage" />
					</n-form-item>
				</n-form>
			</div>
			<n-button
				size="small"
				:disabled="!compCanCreate"
				:loading="refIsCreating"
				@click="createEmpire"
			>
				Create
			</n-button>
		</div>
	</div>
	<x-n-data-table :data="localEmpires" striped class="pt-3">
		<x-n-data-table-column title="Name" key="name">
			<template #render-cell="{ rowData }">
				<router-link
					:to="`/empire/${rowData.uuid}`"
					class="text-link-primary font-bold hover:underline"
				>
					{{ rowData.name }}
				</router-link>
			</template>
		</x-n-data-table-column>
		<x-n-data-table-column title="Faction" key="faction">
			<template #render-cell="{ rowData }">
				{{ capitalizeString(rowData.faction) }}
			</template>
		</x-n-data-table-column>
		<x-n-data-table-column title="Permits" key="permits">
			<template #render-cell="{ rowData }">
				{{ rowData.permits_used }} / {{ rowData.permits_total }}
			</template>
		</x-n-data-table-column>
		<x-n-data-table-column title="Plans" key="plans">
			<template #render-cell="{ rowData }">
				{{ rowData.baseplanners.length }}
			</template>
		</x-n-data-table-column>
		<x-n-data-table-column title="FIO" key="fio">
			<template #render-cell="{ rowData }">
				<n-tag
					size="small"
					:bordered="false"
					type="success"
					v-if="rowData.use_fio_storage"
				>
					Yes
				</n-tag>
				<n-tag size="small" :bordered="false" type="error" v-else>No</n-tag>
			</template>
		</x-n-data-table-column>
		<x-n-data-table-column title="CX" key="cx" width="200">
			<template #render-cell="{ rowData }">
				<div class="max-w-[200px]">
					<n-select
						size="small"
						:options="refCXOptions"
						:render-label="selectRenderLabelWithTooltip"
						placeholder="None"
						v-model:value="refEmpireCXMap[rowData.uuid]"
					/>
				</div>
			</template>
		</x-n-data-table-column>
		<x-n-data-table-column title="" key="configuration">
			<template #render-cell="{ rowData }">
				<div class="justify-end flex gap-x-3">
					<n-button
						size="tiny"
						type="error"
						:loading="refIsDeleting === rowData.uuid"
						@click="handleDeleteConfirm(rowData.uuid)"
					>
						<template #icon><ClearSharp /></template>
					</n-button>
				</div>
			</template>
		</x-n-data-table-column>
	</x-n-data-table>
</template>
