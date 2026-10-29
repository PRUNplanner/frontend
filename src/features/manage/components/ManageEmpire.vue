<script setup lang="ts">
	import {
		computed,
		type ComputedRef,
		onUnmounted,
		ref,
		type Ref,
		watch,
	} from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Composables
	import { useQuery } from "@/lib/query_cache/useQuery";
	import { trackEvent } from "@/lib/analytics/useAnalytics";

	// Types & Interfaces
	import type {
		CX,
		CXEmpireJunction,
	} from "@/features/api/schemas/cxData.schemas";
	import type { PlanEmpireElement } from "@/features/api/schemas/empireData.schemas";
	import type { PlanFaction } from "@/features/api/schemas/planningData.schemas";
	import type { PSelectOption } from "@/ui/ui.types";

	// Util
	import { inertClone } from "@/util/data";
	import { capitalizeString } from "@/util/text";

	// UI
	import {
		PDataTable,
		PForm,
		PFormItem,
		PButton,
		PInput,
		PInputNumber,
		PSelect,
		useConfirm,
	} from "@/ui";
	const confirm = useConfirm();
	import type { PDataTableColumn } from "@/ui/ui.types";
	import { ClearSharp, PlusSharp } from "@vicons/material";

	const props = defineProps<{ empires: PlanEmpireElement[]; cx: CX[] }>();

	// Local Data & Watcher
	const localEmpires: ComputedRef<PlanEmpireElement[]> = computed(() =>
		inertClone(props.empires)
	);
	const localCX: ComputedRef<CX[]> = computed(() => inertClone(props.cx));

	watch([() => props.empires, () => props.cx], () => {
		generateCXOptions();
		generateEmpireCXMap();
	});

	const emit = defineEmits<{
		(e: "update:cxList", value: CX[]): void;
		(e: "update:empireList", value: PlanEmpireElement[]): void;
	}>();

	const refCXOptions: Ref<PSelectOption[]> = ref([]);
	const refEmpireCXMap: Ref<Record<string, string | undefined>> = ref({});
	// CX per empire as saved, to count and keep unsaved select changes
	const loadedCXMap: Ref<Record<string, string | undefined>> = ref({});
	const refShowCreateEmpire: Ref<boolean> = ref(false);

	const refCreateFaction: Ref<PlanFaction> = ref("NONE");
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

		// re-apply unsaved selects of empires and CX that still exist
		const cxUuids = new Set(localCX.value.map((c) => c.uuid));
		const edited: Record<string, string | undefined> = { ...map };
		Object.entries(refEmpireCXMap.value).forEach(([empire, cx]) => {
			if (
				empire in map &&
				cx !== loadedCXMap.value[empire] &&
				(cx === undefined || cxUuids.has(cx))
			)
				edited[empire] = cx;
		});

		loadedCXMap.value = map;
		refEmpireCXMap.value = edited;
	}

	const changedCount: ComputedRef<number> = computed(
		() =>
			Object.keys(loadedCXMap.value).filter(
				(e) => refEmpireCXMap.value[e] !== loadedCXMap.value[e]
			).length
	);

	function discard(): void {
		refEmpireCXMap.value = { ...loadedCXMap.value };
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

	const cxEmpireJunctions: ComputedRef<CXEmpireJunction[]> = computed(() => {
		const jct: CXEmpireJunction[] = [];

		// use all cx
		localCX.value.forEach((cx) => {
			const point: CXEmpireJunction = {
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

	/**
	 * Saves the CX selects and reloads the CX list, throws on failure
	 * @author jplacht
	 */
	async function save(): Promise<void> {
		trackEvent("manage:empire_cx_assign");

		await useQuery("PatchEmpireCXJunctions", {
			junctions: cxEmpireJunctions.value,
		}).execute();

		emit("update:cxList", await useQuery("GetAllCX").execute());
	}

	defineExpose({ changedCount, save, discard });

	async function createEmpire(): Promise<void> {
		refIsCreating.value = true;

		try {
			if (compCanCreate.value) {
				trackEvent("manage:empire_create");

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

	async function handleDeleteConfirm(empireUuid: string): Promise<void> {
		const confirmed = await confirm({
			title: t("management.empire.deletion.title"),
			content: t("management.empire.deletion.content"),
			positiveText: t("common.buttons.delete"),
			negativeText: t("common.buttons.cancel"),
		});
		if (confirmed) deleteEmpire(empireUuid);
	}

	async function deleteEmpire(empireUuid: string): Promise<void> {
		refIsDeleting.value = empireUuid;
		trackEvent("manage:empire_delete");

		try {
			await useQuery("DeleteEmpire", { empireUuid: empireUuid }).execute();
			// forced reload of all Empires
			emit("update:empireList", await useQuery("GetAllEmpires").execute());
		} catch (err) {
			console.error(err);
		} finally {
			refIsDeleting.value = undefined;
		}
	}

	// Narrow screens get cards instead of the table
	const media =
		typeof window.matchMedia === "function"
			? window.matchMedia("(min-width: 640px)")
			: undefined;
	const isWide: Ref<boolean> = ref(media?.matches ?? true);
	const onMedia = (e: MediaQueryListEvent) => (isWide.value = e.matches);
	media?.addEventListener("change", onMedia);
	onUnmounted(() => media?.removeEventListener("change", onMedia));

	// the cards in the table's default order, by name
	const sortedEmpires: ComputedRef<PlanEmpireElement[]> = computed(() =>
		[...localEmpires.value].sort((a, b) =>
			a.empire_name.localeCompare(b.empire_name)
		)
	);

	const columns = computed<PDataTableColumn<PlanEmpireElement>[]>(() => [
		{
			key: "empire_name",
			title: t("management.empire.table.empire_name"),
			sorter: true,
			defaultSortOrder: "ascend",
		},
		{ key: "empire_faction", title: t("management.empire.table.faction") },
		{ key: "permits", title: t("management.empire.table.permits") },
		{ key: "plans", title: t("management.empire.table.plans") },
		{ key: "cx", title: t("management.empire.table.cx"), width: 200 },
		{ key: "configuration", title: "" },
	]);
</script>

<template>
	<div class="flex flex-row flex-wrap gap-3 justify-between">
		<h2 class="text-xl font-bold my-auto">
			{{ $t("management.empire.title") }}
		</h2>
		<div class="flex gap-x-3">
			<PButton @click="refShowCreateEmpire = !refShowCreateEmpire">
				<template #icon><PlusSharp /></template>
				{{ $t("management.empire.buttons.new_empire") }}
			</PButton>
		</div>
	</div>
	<div class="py-3 text-muted">
		{{ $t("management.empire.description") }}
	</div>
	<div
		:class="
			!refShowCreateEmpire
				? 'opacity-0 overflow-hidden h-0'
				: 'opacity-100'
		"
		class="transition-all duration-500 border-t border-b border-white/10">
		<div
			class="flex flex-col gap-3 py-3 w-full sm:w-1/2 sm:min-w-100">
			<div class="grow">
				<PForm>
					<PFormItem :label="t('management.empire.form.empire_name')">
						<PInput
							v-model:value="refCreateName"
							class="w-full"
							:placeholder="
								t('management.empire.form.empire_placeholder')
							" />
					</PFormItem>
					<PFormItem :label="t('management.empire.form.faction')">
						<PSelect
							v-model:value="refCreateFaction"
							class="w-full"
							:options="factionOptions" />
					</PFormItem>
					<PFormItem
						:label="t('management.empire.form.permits_total')">
						<PInputNumber
							v-model:value="refCreatePermitsTotal"
							show-buttons
							:min="2"
							class="w-full" />
					</PFormItem>
					<PFormItem
						:label="t('management.empire.form.permits_used')">
						<PInputNumber
							v-model:value="refCreatePermitsUsed"
							show-buttons
							:min="1"
							class="w-full" />
					</PFormItem>
				</PForm>
			</div>
			<div class="self-end">
				<PButton
					:disabled="!compCanCreate"
					:loading="refIsCreating"
					@click="createEmpire">
					{{ $t("common.buttons.create") }}
				</PButton>
			</div>
		</div>
	</div>
	<PDataTable
		v-if="isWide"
		:columns="columns"
		:data="localEmpires"
		striped
		class="pt-3">
		<template #cell-empire_name="{ row }">
				<router-link
					:to="`/empire/${row.uuid}`"
					class="text-link-primary font-bold hover:underline">
					{{ row.empire_name }}
				</router-link>
		</template>
		<template #cell-empire_faction="{ row }">
				{{ capitalizeString(row.empire_faction) }}
		</template>
		<template #cell-permits="{ row }">
				{{ row.empire_permits_used }} /
				{{ row.empire_permits_total }}
		</template>
		<template #cell-plans="{ row }">
				{{ row.plans.length }}
		</template>
		<template #cell-cx="{ row }">
				<div class="max-w-50">
					<PSelect
						:key="`${row.uuid}#${refEmpireCXMap[row.uuid]}`"
						v-model:value="refEmpireCXMap[row.uuid]"
						:aria-label="$t('management.empire.table.cx')"
						:options="refCXOptions" />
				</div>
		</template>
		<template #cell-configuration="{ row }">
				<div class="justify-end flex gap-x-3">
					<PButton
						:aria-label="$t('common.buttons.delete')"
						size="sm"
						type="error"
						:loading="refIsDeleting === row.uuid"
						@click="handleDeleteConfirm(row.uuid)">
						<template #icon><ClearSharp /></template>
					</PButton>
				</div>
		</template>
		<template #empty>
			<div class="flex flex-col gap-y-3">
				<div class="text-center">
					{{ $t("management.empire.table.nodata_title") }}
				</div>
				<div class="text-center">
					{{ $t("management.empire.table.nodata_label") }}
				</div>
			</div>
		</template>
	</PDataTable>
	<div v-else class="flex flex-col gap-3 pt-3">
		<div
			v-for="row in sortedEmpires"
			:key="row.uuid"
			class="flex flex-col gap-3 border border-white/10 rounded bg-gray-dark p-3">
			<div class="flex items-start justify-between gap-3">
				<div class="min-w-0">
					<router-link
						:to="`/empire/${row.uuid}`"
						class="block py-3 -my-2 text-link-primary font-bold hover:underline truncate">
						{{ row.empire_name }}
					</router-link>
					<div class="text-xs text-muted">
						{{ capitalizeString(row.empire_faction) }} ·
						{{ $t("management.empire.table.permits") }}
						{{ row.empire_permits_used }} /
						{{ row.empire_permits_total }} ·
						{{ $t("management.empire.table.plans") }}
						{{ row.plans.length }}
					</div>
				</div>
				<PButton
					:aria-label="$t('common.buttons.delete')"
					size="sm"
					type="error"
					:loading="refIsDeleting === row.uuid"
					@click="handleDeleteConfirm(row.uuid)">
					<template #icon><ClearSharp /></template>
				</PButton>
			</div>
			<div class="flex items-center gap-3">
				<span class="text-muted" aria-hidden="true">
					{{ $t("management.empire.table.cx") }}
				</span>
				<PSelect
					:key="`${row.uuid}#${refEmpireCXMap[row.uuid]}`"
					v-model:value="refEmpireCXMap[row.uuid]"
					class="grow min-w-0"
					:aria-label="$t('management.empire.table.cx')"
					:options="refCXOptions" />
			</div>
		</div>
		<div v-if="!sortedEmpires.length" class="text-center">
			{{ $t("management.empire.table.nodata_title") }}
			<br />
			{{ $t("management.empire.table.nodata_label") }}
		</div>
	</div>
</template>
