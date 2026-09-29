<script setup lang="ts">
	import {
		computed,
		type ComputedRef,
		onUnmounted,
		type PropType,
		reactive,
		ref,
		type Ref,
		shallowRef,
		watch,
	} from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Composables
	import { usePlanetData } from "@/database/services/usePlanetData";
	const { getPlanet } = usePlanetData();
	import { useQuery } from "@/lib/query_cache/useQuery";
	import { trackEvent } from "@/lib/analytics/useAnalytics";
	import {
		cellKey,
		splitKey,
		toJunctions,
		useAssignmentMatrix,
	} from "@/features/manage/useAssignmentMatrix";

	// Stores
	import { usePlanningStore } from "@/stores/planningStore";
	const planningStore = usePlanningStore();

	// Types & Interfaces
	import type { Plan } from "@/features/api/schemas/planningData.schemas";
	import type { PlanEmpireElement } from "@/features/api/schemas/empireData.schemas";
	import type {
		AssignmentCell,
		IAssignmentEmpire,
		IAssignmentRow,
	} from "@/features/manage/useAssignmentMatrix.types";
	import type { PSelectOption } from "@/ui/ui.types";

	// Components
	import SharingModal from "@/features/sharing/components/SharingModal.vue";
	import ManageAssignmentRow from "@/features/manage/components/ManageAssignmentRow.vue";
	import ManageAssignmentCard from "@/features/manage/components/ManageAssignmentCard.vue";

	// UI
	import { PButton, PIcon, PInput, PSelect } from "@/ui";
	import { NDropdown, type DropdownOption, useDialog } from "naive-ui";
	const dialog = useDialog();
	import {
		ArrowDownwardSharp,
		ArrowUpwardSharp,
		CheckSharp,
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
		/** shows "All changes saved" next to the counts */
		saved: {
			type: Boolean,
			required: false,
			default: false,
		},
	});

	const emit = defineEmits<{
		(e: "update:empireList", value: PlanEmpireElement[]): void;
		(e: "update:planList", value: Plan[]): void;
	}>();

	// Rows: plain frozen objects, planet names resolved once per planet
	// before the rows are built, so the table renders once
	const rows: Ref<readonly IAssignmentRow[]> = shallowRef([]);
	const rowsReady: Ref<boolean> = ref(false);
	const planetNames = new Map<string, string | undefined>();

	function buildRows(): void {
		rows.value = props.plans.map((p) =>
			Object.freeze({
				planUuid: p.uuid,
				planName: p.plan_name,
				planetId: p.planet_natural_id,
				planetName: planetNames.get(p.planet_natural_id),
			})
		);
	}

	async function loadPlanetNames(ids: string[]): Promise<void> {
		await Promise.all(
			ids.map(async (id) => {
				try {
					const planet = await getPlanet(id);
					planetNames.set(
						id,
						planet.planet_name !== id ? planet.planet_name : undefined
					);
				} catch {
					planetNames.set(id, undefined);
				}
			})
		);
	}

	watch(
		() => props.plans,
		async (plans) => {
			const missing = [
				...new Set(plans.map((p) => p.planet_natural_id)),
			].filter((id) => !planetNames.has(id));
			if (missing.length > 0) await loadPlanetNames(missing);
			buildRows();
			rowsReady.value = true;
		},
		{ immediate: true }
	);

	const empires: ComputedRef<IAssignmentEmpire[]> = computed(() =>
		props.empires
			.map((e) => ({ empireUuid: e.uuid, empireName: e.empire_name }))
			.sort((a, b) => a.empireName.localeCompare(b.empireName))
	);

	// Assignment state, pending edits survive reloads (clone, delete, save)
	const matrix = useAssignmentMatrix();
	watch(
		[() => props.empires, () => props.plans],
		() =>
			matrix.load(
				props.empires,
				new Set(props.plans.map((p) => p.uuid))
			),
		{ immediate: true }
	);

	const assignedCounts = computed(() => {
		const perPlan = new Map<string, number>();
		const perEmpire = new Map<string, number>();
		for (const k of matrix.current.value) {
			const [plan, empire] = splitKey(k);
			perPlan.set(plan, (perPlan.get(plan) ?? 0) + 1);
			perEmpire.set(empire, (perEmpire.get(empire) ?? 0) + 1);
		}
		return { perPlan, perEmpire };
	});

	const unassignedCount: ComputedRef<number> = computed(
		() =>
			rows.value.filter(
				(r) => !assignedCounts.value.perPlan.has(r.planUuid)
			).length
	);

	function cells(planUuid: string): string {
		const loaded = matrix.loaded.value;
		const current = matrix.current.value;
		return empires.value
			.map((e): AssignmentCell => {
				const k = cellKey(planUuid, e.empireUuid);
				const was = loaded.has(k);
				const is = current.has(k);
				if (was === is) return is ? "1" : "0";
				return is ? "+" : "-";
			})
			.join("");
	}

	function toggle(planUuid: string, empireUuid: string): void {
		const k = cellKey(planUuid, empireUuid);
		matrix.set([k], !matrix.current.value.has(k));
	}

	// Toolbar: search, empire filter, unassigned only, sorting
	const search: Ref<string | null | undefined> = ref("");
	const filterEmpire: Ref<string | number | null | undefined> = ref(undefined);
	const unassignedOnly: Ref<boolean> = ref(false);
	const sortAsc: Ref<boolean> = ref(true);

	const empireOptions: ComputedRef<PSelectOption[]> = computed(() => [
		{ label: t("management.assignments.all_empires"), value: undefined },
		...empires.value.map((e) => ({
			label: e.empireName,
			value: e.empireUuid,
		})),
	]);

	const shownRows: ComputedRef<IAssignmentRow[]> = computed(() => {
		const q = (search.value ?? "").trim().toLowerCase();
		const empire = filterEmpire.value;

		let shown = rows.value.filter(
			(r) =>
				!q ||
				r.planName.toLowerCase().includes(q) ||
				r.planetId.toLowerCase().includes(q) ||
				(r.planetName?.toLowerCase().includes(q) ?? false)
		);
		if (typeof empire === "string") {
			const current = matrix.current.value;
			shown = shown.filter((r) =>
				current.has(cellKey(r.planUuid, empire))
			);
		}
		if (unassignedOnly.value) {
			const perPlan = assignedCounts.value.perPlan;
			shown = shown.filter((r) => !perPlan.has(r.planUuid));
		}

		const dir = sortAsc.value ? 1 : -1;
		return shown.sort((a, b) => dir * a.planName.localeCompare(b.planName));
	});

	/** header checkbox per empire, over the shown rows */
	const headerStates: ComputedRef<Map<string, "none" | "some" | "all">> =
		computed(() => {
			const current = matrix.current.value;
			return new Map(
				empires.value.map((e) => {
					const n = shownRows.value.filter((r) =>
						current.has(cellKey(r.planUuid, e.empireUuid))
					).length;
					return [
						e.empireUuid,
						n === 0
							? "none"
							: n === shownRows.value.length
								? "all"
								: "some",
					];
				})
			);
		});

	function toggleAllShown(empireUuid: string): void {
		const value = headerStates.value.get(empireUuid) !== "all";
		trackEvent("manage_plans_assign_all", { value });
		matrix.set(
			shownRows.value.map((r) => cellKey(r.planUuid, empireUuid)),
			value
		);
	}

	// Long lists render in chunks, one per frame, so the page never blocks
	// for long; a filter change starts over with the first chunk
	const RENDER_CHUNK = 20;
	const renderLimit: Ref<number> = ref(RENDER_CHUNK);
	let growFrame = 0;

	function grow(): void {
		renderLimit.value += RENDER_CHUNK;
		growFrame =
			renderLimit.value < shownRows.value.length
				? requestAnimationFrame(grow)
				: 0;
	}

	function ensureGrowing(): void {
		if (renderLimit.value < shownRows.value.length && !growFrame)
			growFrame = requestAnimationFrame(grow);
	}

	watch(() => shownRows.value.length, ensureGrowing, { immediate: true });
	watch([search, filterEmpire, unassignedOnly], () => {
		renderLimit.value = RENDER_CHUNK;
		ensureGrowing();
	});
	onUnmounted(() => cancelAnimationFrame(growFrame));

	const renderedRows: ComputedRef<IAssignmentRow[]> = computed(() =>
		shownRows.value.length > renderLimit.value
			? shownRows.value.slice(0, renderLimit.value)
			: shownRows.value
	);

	// Narrow screens get cards instead of the table
	const media =
		typeof window.matchMedia === "function"
			? window.matchMedia("(min-width: 768px)")
			: undefined;
	const isWide: Ref<boolean> = ref(media?.matches ?? true);
	const onMedia = (e: MediaQueryListEvent) => (isWide.value = e.matches);
	media?.addEventListener("change", onMedia);
	onUnmounted(() => media?.removeEventListener("change", onMedia));

	// Row menu: one dropdown and one sharing modal for the whole table
	const menu = reactive({ show: false, x: 0, y: 0, planUuid: "" });
	const busyPlan: Ref<string | undefined> = ref(undefined);
	const sharePlan: Ref<string | undefined> = ref(undefined);
	const showShare: Ref<boolean> = ref(false);

	const menuOptions: ComputedRef<DropdownOption[]> = computed(() => [
		{ label: t("management.assignments.menu.clone"), key: "clone" },
		{ label: t("management.assignments.menu.share"), key: "share" },
		{ type: "divider", key: "divider" },
		{
			label: t("management.assignments.menu.delete"),
			key: "delete",
			props: { style: "color: var(--color-negative)" },
		},
	]);

	function openMenu(planUuid: string, target: HTMLElement): void {
		const rect = target.getBoundingClientRect();
		menu.x = rect.left;
		menu.y = rect.bottom;
		menu.planUuid = planUuid;
		menu.show = true;
	}

	function onMenuSelect(key: string): void {
		menu.show = false;
		const row = rows.value.find((r) => r.planUuid === menu.planUuid);
		if (!row) return;

		if (key === "clone") clonePlan(row.planUuid, row.planName);
		else if (key === "share") {
			sharePlan.value = row.planUuid;
			showShare.value = true;
		} else if (key === "delete") handleDeleteConfirm(row.planUuid);
	}

	async function refetch(): Promise<void> {
		const [empireList, planList] = await Promise.all([
			useQuery("GetAllEmpires").execute(),
			useQuery("GetAllPlans").execute(),
		]);
		emit("update:empireList", empireList);
		emit("update:planList", planList);
	}

	async function clonePlan(
		planUuid: string,
		planName: string
	): Promise<void> {
		busyPlan.value = planUuid;
		trackEvent("manage_plans_clone", { planUuid });

		try {
			await useQuery("ClonePlan", {
				planUuid: planUuid,
				cloneName: `${planName} (Clone)`,
			}).execute();
			await refetch();
		} catch (err) {
			console.error(err);
		} finally {
			busyPlan.value = undefined;
		}
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
		busyPlan.value = planUuid;
		trackEvent("manage_plans_delete", { planUuid });

		try {
			await useQuery("DeletePlan", { planUuid: planUuid }).execute();
			await refetch();
		} catch (err) {
			console.error(err);
		} finally {
			busyPlan.value = undefined;
		}
	}

	/**
	 * Saves the changed empires' assignments and reloads, throws on failure
	 * @author jplacht
	 */
	async function save(): Promise<void> {
		const { changedKeys } = matrix.changes.value;
		if (changedKeys.size === 0) return;

		trackEvent("manage_plans_junctions_update");
		await useQuery("PatchEmpirePlanJunctions", {
			junctions: toJunctions(
				props.empires,
				matrix.current.value,
				changedKeys
			),
		}).execute();
		await refetch();
	}

	const changes = matrix.changes;
	const discard = matrix.discard;
	defineExpose({ changes, save, discard });
</script>

<template>
	<div class="flex flex-row flex-wrap gap-x-6 gap-y-1 justify-between">
		<div>
			<h2 class="text-xl font-bold">
				{{ $t("management.assignments.title") }}
			</h2>
			<div class="pt-1 text-white/60">
				{{ $t("management.assignments.description") }}
			</div>
		</div>
		<div class="flex items-end gap-4 text-white/60">
			<span
				v-if="saved"
				class="flex items-center gap-1.5 text-positive"
				role="status">
				<PIcon :size="14"><CheckSharp /></PIcon>
				{{ $t("management.save_bar.all_saved") }}
			</span>
			<span>
				{{
					$t("management.assignments.plan_count", {
						plans: $t(
							"management.assignments.plans",
							plans.length
						),
						empires: $t(
							"management.assignments.empires",
							empires.length
						),
					})
				}}
			</span>
		</div>
	</div>

	<div class="flex flex-wrap items-center gap-3 py-4">
		<PInput
			v-model:value="search"
			class="w-85 max-w-full"
			:placeholder="$t('management.assignments.search')"
			:aria-label="$t('management.assignments.search')" />
		<div class="flex items-center gap-2">
			<span class="text-white/70">
				{{ $t("management.assignments.filter_empire") }}
			</span>
			<PSelect
				v-model:value="filterEmpire"
				class="w-50"
				:options="empireOptions"
				:aria-label="$t('management.assignments.filter_empire')" />
		</div>
		<PButton
			:type="unassignedOnly ? 'primary' : 'secondary'"
			:aria-pressed="unassignedOnly"
			@click="unassignedOnly = !unassignedOnly">
			{{
				$t("management.assignments.unassigned_only", {
					count: unassignedCount,
				})
			}}
		</PButton>
	</div>

	<div
		v-if="rowsReady && rows.length === 0"
		class="p-10 text-center text-white/60 flex flex-col gap-y-3">
		<div>{{ $t("management.assignments.table.nodata_title") }}</div>
		<div>{{ $t("management.assignments.table.nodata_label") }}</div>
	</div>

	<div
		v-else-if="rowsReady && isWide"
		class="overflow-auto max-h-[80vh] border border-white/10 rounded">
		<table
			class="w-full table-fixed border-collapse"
			:style="{ minWidth: `${280 + 52 + empires.length * 128}px` }">
			<colgroup>
				<col />
				<col class="w-13" />
				<col v-for="e in empires" :key="e.empireUuid" class="w-32" />
			</colgroup>
			<thead class="sticky top-0 z-2 bg-gray-dark">
				<tr>
					<th
						class="sticky left-0 z-3 bg-gray-dark text-left px-4 py-2.5 align-bottom border-b border-white/10"
						:aria-sort="sortAsc ? 'ascending' : 'descending'">
						<button
							type="button"
							class="flex items-center gap-1.5 font-bold cursor-pointer"
							@click="sortAsc = !sortAsc">
							{{ $t("management.assignments.table.plan") }}
							<PIcon :size="14" class="text-white/60">
								<ArrowUpwardSharp v-if="sortAsc" />
								<ArrowDownwardSharp v-else />
							</PIcon>
						</button>
					</th>
					<th class="border-b border-white/10">
						<span class="sr-only">
							{{ $t("management.assignments.row_actions_header") }}
						</span>
					</th>
					<th
						v-for="e in empires"
						:key="e.empireUuid"
						class="px-1.5 pt-2.5 pb-2 align-bottom border-b border-l border-b-white/10 border-l-white/5">
						<div class="flex flex-col items-center gap-1">
							<div
								class="max-w-full truncate text-[13px] font-bold"
								:title="e.empireName">
								{{ e.empireName }}
							</div>
							<div class="text-xs font-normal text-white/55">
								{{
									$t(
										"management.assignments.empire_plans",
										assignedCounts.perEmpire.get(
											e.empireUuid
										) ?? 0
									)
								}}
							</div>
							<input
								type="checkbox"
								class="size-4.5 accent-blue-700 cursor-pointer"
								:checked="headerStates.get(e.empireUuid) === 'all'"
								:indeterminate="
									headerStates.get(e.empireUuid) === 'some'
								"
								:aria-label="
									headerStates.get(e.empireUuid) === 'all'
										? $t(
												'management.assignments.remove_all_shown',
												{ empire: e.empireName }
											)
										: $t(
												'management.assignments.add_all_shown',
												{ empire: e.empireName }
											)
								"
								@change="toggleAllShown(e.empireUuid)" />
						</div>
					</th>
				</tr>
			</thead>
			<tbody>
				<ManageAssignmentRow
					v-for="r in renderedRows"
					:key="r.planUuid"
					:row="r"
					:empires="empires"
					:cells="cells(r.planUuid)"
					:view-count="planningStore.shared[r.planUuid]?.view_count"
					:busy="busyPlan === r.planUuid"
					@toggle="toggle"
					@menu="openMenu" />
				<tr v-if="shownRows.length === 0">
					<td
						:colspan="2 + empires.length"
						class="p-10 text-center text-white/60">
						{{ $t("management.assignments.no_match") }}
					</td>
				</tr>
			</tbody>
		</table>
	</div>

	<div v-else-if="rowsReady" class="flex flex-col gap-3">
		<!-- off-screen cards skip layout and paint -->
		<ManageAssignmentCard
			v-for="r in renderedRows"
			:key="r.planUuid"
			:row="r"
			:empires="empires"
			:cells="cells(r.planUuid)"
			:busy="busyPlan === r.planUuid"
			@toggle="toggle"
			@menu="openMenu" />
		<div
			v-if="shownRows.length === 0"
			class="p-10 text-center text-white/60">
			{{ $t("management.assignments.no_match") }}
		</div>
	</div>

	<!-- created on first use -->
	<n-dropdown
		v-if="menu.planUuid"
		trigger="manual"
		placement="bottom-start"
		:show="menu.show"
		:x="menu.x"
		:y="menu.y"
		:options="menuOptions"
		@select="onMenuSelect"
		@update:show="(show: boolean) => (menu.show = show)"
		@clickoutside="menu.show = false" />

	<SharingModal
		v-if="sharePlan"
		:key="sharePlan"
		v-model:show="showShare"
		:plan-uuid="sharePlan" />
</template>
