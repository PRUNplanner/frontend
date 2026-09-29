<script setup lang="ts">
	import { computed, ref, type Ref } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Engine
	import {
		addMaterial,
		refKey,
		SEARCH_COGC,
		SEARCH_CX,
		SEARCH_EXTRAS,
		SEARCH_INFRASTRUCTURE,
		setGroups,
		toggle,
		toggleReference,
	} from "@/features/planet_search/planetSearch.engine";

	// Components
	import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";

	// Types & Interfaces
	import type { PlanEmpireElement } from "@/features/api/schemas/empireData.schemas";
	import type {
		PlanetSearchFilter,
		PlanetSearchMaterialGroup,
		PlanetSearchReference,
	} from "@/features/planet_search/planetSearch.schemas";
	import type { IPlanetSearchFacets } from "@/features/planet_search/planetSearch.types";

	// UI
	import { PCheckbox, PInput, PInputNumber, PSelect } from "@/ui";

	const props = defineProps<{
		filter: PlanetSearchFilter;
		facets: IPlanetSearchFacets;
		materials: string[];
		maxDaily: Record<string, number>;
		empires: PlanEmpireElement[];
		empireUuid: string | undefined;
		showPlans: boolean;
		planetNames: Record<string, string>;
	}>();

	const emit = defineEmits<{
		(e: "update:filter", value: PlanetSearchFilter): void;
		(e: "update:empire", value: string): void;
	}>();

	function set(patch: Partial<PlanetSearchFilter>) {
		emit("update:filter", { ...props.filter, ...patch });
	}

	/*
	 * Materials
	 */
	function updateGroup(
		index: number,
		change: (g: PlanetSearchMaterialGroup) => PlanetSearchMaterialGroup
	) {
		emit(
			"update:filter",
			setGroups(
				props.filter,
				props.filter.materialGroups.map((g, i) =>
					i === index ? change(g) : g
				)
			)
		);
	}

	function removeGroup(index: number) {
		emit(
			"update:filter",
			setGroups(
				props.filter,
				props.filter.materialGroups.filter((_, i) => i !== index)
			)
		);
	}

	function setMin(ticker: string, value: number | null) {
		const minDaily = { ...props.filter.minDaily };
		if (value && value > 0) minDaily[ticker] = value;
		else delete minDaily[ticker];
		set({ minDaily });
	}

	// the add selects keep no value, a pick adds the material
	const addValue: Ref<string | null> = ref(null);
	function materialOptions(groupIndex: number) {
		const counts = props.facets.materials[groupIndex] ?? {};
		return props.materials
			.filter((m) => counts[m] !== undefined)
			.map((m) => ({
				label: t("planet_search.materials.option", {
					material: m,
					n: counts[m],
				}),
				value: m,
			}));
	}
	function onAdd(groupIndex: number, ticker: string | number | null | undefined) {
		if (typeof ticker === "string")
			emit("update:filter", addMaterial(props.filter, groupIndex, ticker));
		addValue.value = null;
	}

	/*
	 * Distance
	 */
	const planQuery: Ref<string | null | undefined> = ref("");
	const empire = computed(() =>
		props.empires.find((e) => e.uuid === props.empireUuid)
	);
	const empireOptions = computed(() =>
		props.empires.map((e) => ({
			label: t("planet_search.distance.empire_option", {
				name: e.empire_name,
				n: e.plans.length,
			}),
			value: e.uuid,
		}))
	);
	const pickedKeys = computed(
		() => new Set(props.filter.references.map(refKey))
	);
	const planOptions = computed(() => {
		const q = (planQuery.value ?? "").trim().toLowerCase();
		return (empire.value?.plans ?? []).filter(
			(p) =>
				!q ||
				p.plan_name.toLowerCase().includes(q) ||
				p.planet_natural_id.toLowerCase().includes(q) ||
				(props.planetNames[p.planet_natural_id] ?? "").toLowerCase().includes(q)
		);
	});
	const pickedPlans = computed(() =>
		(empire.value?.plans ?? []).filter((p) =>
			pickedKeys.value.has(`plan:${p.uuid}`)
		)
	);
	function toggleRef(ref: PlanetSearchReference) {
		emit("update:filter", toggleReference(props.filter, ref));
	}

	const pill =
		"inline-flex items-center gap-2 px-2 min-h-11 lg:min-h-8 rounded border text-sm whitespace-nowrap cursor-pointer";
	const pillOn = "border-blue-300/60 bg-blue-950";
	const pillOff = "border-white/20 hover:bg-white/10";
	const segment =
		"px-2 min-h-11 lg:min-h-7 text-xs cursor-pointer whitespace-nowrap";
</script>

<template>
	<div class="flex flex-col gap-6 text-sm">
		<!-- Materials -->
		<section class="flex flex-col gap-3">
			<div class="flex flex-row justify-between items-center gap-2">
				<h3 class="text-base font-bold">
					{{ t("planet_search.materials.title") }}
				</h3>
				<div
					role="group"
					:aria-label="t('planet_search.materials.groups_op_label')"
					class="flex border border-white/20 rounded overflow-hidden">
					<button
						v-for="op in ['all', 'any'] as const"
						:key="op"
						type="button"
						:class="[segment, filter.groupsOp === op ? 'bg-blue-800' : '']"
						:aria-pressed="filter.groupsOp === op"
						@click="set({ groupsOp: op })">
						{{
							t(
								op === "all"
									? "planet_search.materials.all_groups"
									: "planet_search.materials.any_group"
							)
						}}
					</button>
				</div>
			</div>

			<template v-for="(group, gi) in filter.materialGroups" :key="gi">
				<div
					v-if="gi > 0"
					class="text-center text-xs font-bold uppercase text-muted">
					{{
						t(
							filter.groupsOp === "any"
								? "planet_search.materials.or"
								: "planet_search.materials.and"
						)
					}}
				</div>
				<div
					class="border border-white/15 rounded p-3 flex flex-col gap-2">
					<div class="flex flex-row items-center gap-2">
						<span class="text-muted">
							{{ t("planet_search.materials.group", { n: gi + 1 }) }}
						</span>
						<div
							role="group"
							:aria-label="
								t('planet_search.materials.group_op_label', {
									n: gi + 1,
								})
							"
							class="flex border border-white/20 rounded overflow-hidden">
							<button
								v-for="op in ['any', 'all'] as const"
								:key="op"
								type="button"
								:class="[segment, group.op === op ? 'bg-blue-800' : '']"
								:aria-pressed="group.op === op"
								@click="updateGroup(gi, (g) => ({ ...g, op }))">
								{{
									t(
										op === "any"
											? "planet_search.materials.any_of"
											: "planet_search.materials.all_of"
									)
								}}
							</button>
						</div>
						<button
							type="button"
							class="ml-auto px-1 text-muted hover:text-white cursor-pointer min-h-11 lg:min-h-6"
							:aria-label="
								t('planet_search.materials.remove_group_label', {
									n: gi + 1,
								})
							"
							@click="removeGroup(gi)">
							{{ t("planet_search.materials.remove_group") }}
						</button>
					</div>

					<template v-for="(m, mi) in group.materials" :key="m">
						<div v-if="mi > 0" class="text-xs text-muted">
							{{
								t(
									group.op === "all"
										? "planet_search.materials.and"
										: "planet_search.materials.or"
								)
							}}
						</div>
						<div class="flex flex-row items-center gap-2">
							<MaterialTile :ticker="m" :enable-popover="false" />
							<span class="text-muted whitespace-nowrap">
								{{ t("planet_search.materials.min") }}
							</span>
							<PInputNumber
								class="w-24"
								size="sm"
								:value="filter.minDaily[m] ?? 0"
								:min="0"
								decimals
								placeholder="0"
								:aria-label="
									t('planet_search.materials.min_label', {
										material: m,
									})
								"
								@update:value="(v) => setMin(m, v ?? null)" />
							<span class="whitespace-nowrap">
								{{ t("planet_search.materials.per_day") }}
								<span class="text-muted">
									{{
										t("planet_search.materials.max", {
											max: (maxDaily[m] ?? 0).toFixed(1),
										})
									}}
								</span>
							</span>
							<button
								type="button"
								class="ml-auto min-w-11 min-h-11 lg:min-w-7 lg:min-h-7 border border-white/20 rounded hover:bg-white/10 cursor-pointer"
								:aria-label="
									t('planet_search.materials.remove_material', {
										material: m,
									})
								"
								@click="
									updateGroup(gi, (g) => ({
										...g,
										materials: g.materials.filter(
											(x) => x !== m
										),
									}))
								">
								×
							</button>
						</div>
					</template>

					<PSelect
						v-model:value="addValue"
						searchable
						:options="materialOptions(gi)"
						:placeholder="t('planet_search.materials.add_material')"
						:aria-label="
							t('planet_search.materials.add_material_label', {
								n: gi + 1,
							})
						"
						@update:value="(v) => onAdd(gi, v)" />
				</div>
			</template>

			<button
				type="button"
				class="border border-dashed border-blue-300/60 rounded min-h-11 lg:min-h-9 hover:bg-white/5 cursor-pointer"
				@click="
					set({
						materialGroups: [
							...filter.materialGroups,
							{ op: 'any', materials: [] },
						],
					})
				">
				{{ t("planet_search.materials.add_group") }}
			</button>
		</section>

		<!-- Planet conditions -->
		<section class="flex flex-col gap-2">
			<h3 class="text-base font-bold">
				{{ t("planet_search.conditions.title") }}
			</h3>
			<p class="text-muted">
				{{ t("planet_search.conditions.description") }}
			</p>
			<div class="flex flex-row flex-wrap gap-2">
				<button
					v-for="s in ['rocky', 'gaseous'] as const"
					:key="s"
					type="button"
					:class="[pill, filter.surface.includes(s) ? pillOn : pillOff]"
					:aria-pressed="filter.surface.includes(s)"
					:disabled="
						filter.surface.length === 1 && filter.surface[0] === s
					"
					@click="set({ surface: toggle(filter.surface, s) })">
					{{ t(`planet_search.conditions.${s}`) }}
					<span v-if="!filter.surface.includes(s)" class="text-muted">
						{{ facets.surface[s] }}
					</span>
				</button>
				<button
					type="button"
					:class="[pill, filter.fertile ? pillOn : pillOff]"
					:aria-pressed="filter.fertile"
					@click="set({ fertile: !filter.fertile })">
					{{ t("planet_search.conditions.fertile") }}
					<span v-if="!filter.fertile" class="text-muted">
						{{ facets.fertile }}
					</span>
				</button>
			</div>

			<p class="text-muted mt-2">
				{{ t("planet_search.conditions.extras_title") }}
			</p>
			<div class="grid grid-cols-2 gap-2">
				<button
					v-for="e in SEARCH_EXTRAS"
					:key="e"
					type="button"
					:class="[
						pill,
						'justify-between',
						filter.acceptedExtras.includes(e) ? pillOn : pillOff,
					]"
					:aria-pressed="filter.acceptedExtras.includes(e)"
					@click="
						set({ acceptedExtras: toggle(filter.acceptedExtras, e) })
					">
					<span class="flex items-center gap-2 min-w-0">
						<span class="font-mono font-bold">{{ e }}</span>
						<span class="truncate">
							{{ t(`planet_search.conditions.${e}`) }}
						</span>
					</span>
					<span
						v-if="!filter.acceptedExtras.includes(e)"
						class="text-muted">
						{{ facets.extras[e] }}
					</span>
				</button>
			</div>
		</section>

		<!-- COGC -->
		<section class="flex flex-col gap-2">
			<h3 class="text-base font-bold">
				{{ t("planet_search.cogc.title") }}
			</h3>
			<div class="flex flex-row flex-wrap gap-2">
				<button
					v-for="c in SEARCH_COGC"
					:key="c"
					type="button"
					:class="[pill, filter.cogc.includes(c) ? pillOn : pillOff]"
					:aria-pressed="filter.cogc.includes(c)"
					@click="set({ cogc: toggle(filter.cogc, c) })">
					{{ t(`game.cogc_program.${c}`) }}
					<span v-if="!filter.cogc.includes(c)" class="text-muted">
						{{ facets.cogc[c] }}
					</span>
				</button>
			</div>
		</section>

		<!-- Infrastructure -->
		<section class="flex flex-col gap-2">
			<h3 class="text-base font-bold">
				{{ t("planet_search.infrastructure.title") }}
			</h3>
			<div class="flex flex-row flex-wrap gap-2">
				<button
					v-for="v in SEARCH_INFRASTRUCTURE"
					:key="v"
					type="button"
					:class="[
						pill,
						filter.infrastructure.includes(v) ? pillOn : pillOff,
					]"
					:title="t(`planet_search.infrastructure.${v}`)"
					:aria-pressed="filter.infrastructure.includes(v)"
					@click="
						set({ infrastructure: toggle(filter.infrastructure, v) })
					">
					{{ v }}
					<span
						v-if="!filter.infrastructure.includes(v)"
						class="text-muted">
						{{ facets.infrastructure[v] }}
					</span>
				</button>
			</div>
		</section>

		<!-- Distance -->
		<section class="flex flex-col gap-2">
			<h3 class="text-base font-bold">
				{{ t("planet_search.distance.title") }}
			</h3>

			<template v-if="showPlans">
				<p v-if="!empires.length" class="text-muted">
					{{ t("planet_search.distance.no_empires") }}
				</p>
				<template v-else>
					<PSelect
						:value="empireUuid"
						:options="empireOptions"
						:aria-label="t('planet_search.distance.empire')"
						@update:value="(v) => emit('update:empire', String(v))" />

					<div
						v-if="pickedPlans.length"
						class="flex flex-row flex-wrap gap-2">
						<span
							v-for="p in pickedPlans"
							:key="p.uuid"
							class="inline-flex items-center gap-1 pl-2 rounded border border-blue-300/60 bg-blue-950 text-xs">
							{{ p.plan_name }}
							<button
								type="button"
								class="min-w-11 min-h-11 lg:min-w-6 lg:min-h-6 cursor-pointer hover:bg-white/10"
								:aria-label="
									t('planet_search.distance.remove_plan', {
										plan: p.plan_name,
									})
								"
								@click="
									toggleRef({ kind: 'plan', planUuid: p.uuid })
								">
								×
							</button>
						</span>
					</div>

					<PInput
						v-model:value="planQuery"
						:aria-label="
							t('planet_search.distance.plan_filter', {
								n: empire?.plans.length ?? 0,
							})
						"
						:placeholder="
							t('planet_search.distance.plan_filter', {
								n: empire?.plans.length ?? 0,
							})
						" />
					<div
						class="max-h-[200px] overflow-y-auto border border-white/10 rounded px-2 py-1 [&_.pcheckbox_label]:min-h-6">
						<p v-if="!planOptions.length" class="text-muted py-1">
							{{ t("planet_search.distance.no_plans") }}
						</p>
						<div
							v-for="p in planOptions"
							:key="p.uuid"
							class="flex flex-row items-center justify-between gap-2 min-h-11 lg:min-h-8">
							<PCheckbox
								:checked="pickedKeys.has(`plan:${p.uuid}`)"
								@update:checked="
									toggleRef({ kind: 'plan', planUuid: p.uuid })
								">
								{{
									t("planet_search.distance.plan_option", {
										plan: p.plan_name,
										planet:
											planetNames[p.planet_natural_id] ||
											p.planet_natural_id,
									})
								}}
							</PCheckbox>
							<span
								v-if="!pickedKeys.has(`plan:${p.uuid}`)"
								class="text-muted">
								{{ facets.references[`plan:${p.uuid}`] }}
							</span>
						</div>
					</div>
				</template>
			</template>

			<p class="text-muted mt-1">
				{{ t("planet_search.distance.exchanges") }}
			</p>
			<div class="flex flex-row flex-wrap gap-2">
				<button
					v-for="code in SEARCH_CX"
					:key="code"
					type="button"
					:class="[
						pill,
						pickedKeys.has(`cx:${code}`) ? pillOn : pillOff,
					]"
					:aria-pressed="pickedKeys.has(`cx:${code}`)"
					@click="toggleRef({ kind: 'cx', code })">
					{{ code }}
					<span v-if="!pickedKeys.has(`cx:${code}`)" class="text-muted">
						{{ facets.references[`cx:${code}`] }}
					</span>
				</button>
			</div>

			<label class="flex flex-col gap-1 mt-2">
				<span>
					{{ t("planet_search.distance.max_jumps") }}:
					<span class="font-bold">{{ filter.maxJumps }}</span>
					<span class="text-muted">
						({{
							t("planet_search.distance.max_jumps_value", {
								n: filter.maxJumps,
							})
						}})
					</span>
				</span>
				<input
					type="range"
					min="0"
					max="30"
					step="1"
					class="w-full accent-prunplanner min-h-11 lg:min-h-6"
					:aria-label="t('planet_search.distance.max_jumps')"
					:value="filter.maxJumps"
					@input="
						set({
							maxJumps: Number(
								($event.target as HTMLInputElement).value
							),
						})
					" />
			</label>
		</section>
	</div>
</template>
