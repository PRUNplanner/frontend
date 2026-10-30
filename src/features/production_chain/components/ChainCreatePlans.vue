<script setup lang="ts">
	import { computed, ref, watch, type Ref } from "vue";
	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// API
	import { useQuery } from "@/lib/query_cache/useQuery";

	// Engine
	import { planDrafts } from "@/features/production_chain/engine/chainBases";

	// Util
	import { cogcKey } from "@/features/production_chain/productionChain.util";
	import { planetDisplayName } from "@/util/planetName";

	// Schemas
	import { PlanFactionSchema } from "@/features/api/schemas/planningData.schemas";

	// Types & Interfaces
	import type {
		PlanCreateData,
		PlanFaction,
	} from "@/features/api/schemas/planningData.schemas";
	import type { PlanEmpireElement } from "@/features/api/schemas/empireData.schemas";
	import type {
		IChainBaseResult,
		IChainResult,
	} from "@/features/production_chain/engine/chainSolver.types";
	import type {
		IChainCreated,
		IChainEmpireChoice,
	} from "@/features/production_chain/productionChain.types";

	// UI
	import { PButton, PInput, PModal, PSegmented, PSelect, PTable } from "@/ui";

	const { result, targets, create } = defineProps<{
		result: IChainResult;
		/** target tickers, for the default names */
		targets: string[];
		create: (
			drafts: { base: string; data: PlanCreateData }[],
			empire: IChainEmpireChoice
		) => Promise<IChainCreated>;
	}>();

	const show = defineModel<boolean>("show", { required: true });

	type IKind = IChainEmpireChoice["kind"];

	const names: Ref<Record<string, string>> = ref({});
	const kind: Ref<IKind> = ref("new");
	const empireName = ref("");
	const faction: Ref<PlanFaction> = ref("NONE");
	const existing: Ref<string | undefined> = ref(undefined);
	const empires: Ref<PlanEmpireElement[]> = ref([]);
	const creating = ref(false);
	const outcome: Ref<IChainCreated | null> = ref(null);

	/** materials own production covers: no step in the new plans */
	const had = computed(() =>
		result.order.filter((t) => result.rows[t].source === "have")
	);

	/** bases with steps; an empty base makes no plan */
	const bases = computed(() =>
		result.bases.filter((b) => b.materials.length)
	);
	const planetOf = (b: IChainBaseResult) =>
		b.planet
			? planetDisplayName(
					b.planet.planet_natural_id,
					b.planet.planet_name
				)
			: null;
	const baseName = (b: { id: string; name: string }) =>
		b.name || t("production_chains.bases.unnamed", { id: b.id });

	// a fresh form each time the dialog opens
	watch(
		show,
		async (open) => {
			if (!open) return;
			const label = targets.join(" ");
			names.value = Object.fromEntries(
				bases.value.map((b) => [b.id, `${label} · ${baseName(b)}`])
			);
			empireName.value = t("production_chains.create.empire_default", {
				targets: label,
			});
			outcome.value = null;
			try {
				empires.value = await useQuery("GetAllEmpires").execute();
			} catch {
				empires.value = [];
			}
		},
		{ immediate: true }
	);

	const kindOptions = computed(() => [
		{
			value: "new" as const,
			label: t("production_chains.create.new_empire"),
		},
		{
			value: "existing" as const,
			label: t("production_chains.create.existing_empire"),
			disabled: !empires.value.length,
		},
		{
			value: "none" as const,
			label: t("production_chains.create.no_empire"),
		},
	]);
	const factionOptions = PlanFactionSchema.options.map((f) => ({
		value: f,
		label: t(`production_chains.create.faction.${f}`),
	}));
	const empireOptions = computed(() =>
		empires.value.map((e) => ({ value: e.uuid, label: e.empire_name }))
	);

	/** why the plans can't be created yet, null when they can */
	const blocker = computed(() => {
		if (!bases.value.length) return t("production_chains.create.no_steps");
		if (bases.value.some((b) => !b.planet))
			return t("production_chains.create.needs_planet");
		if (bases.value.some((b) => b.overArea))
			return t("production_chains.create.over_area");
		if (bases.value.some((b) => !names.value[b.id]?.trim()))
			return t("production_chains.create.needs_name");
		if (kind.value === "new" && !empireName.value.trim())
			return t("production_chains.create.needs_empire_name");
		if (kind.value === "existing" && !existing.value)
			return t("production_chains.create.needs_empire");
		return null;
	});

	function choice(): IChainEmpireChoice {
		if (kind.value === "new")
			return {
				kind: "new",
				name: empireName.value.trim(),
				faction: faction.value,
			};
		const e = empires.value.find((x) => x.uuid === existing.value);
		if (kind.value === "existing" && e)
			return { kind: "existing", uuid: e.uuid, name: e.empire_name };
		return { kind: "none" };
	}

	async function submit(): Promise<void> {
		if (blocker.value || creating.value) return;
		creating.value = true;
		try {
			const trimmed = Object.fromEntries(
				Object.entries(names.value).map(([id, n]) => [id, n.trim()])
			);
			outcome.value = await create(planDrafts(result, trimmed), choice());
		} finally {
			creating.value = false;
		}
	}

	const failedName = computed(() => {
		const id = outcome.value?.failed;
		const b = result.bases.find((x) => x.id === id);
		return b ? `${b.id} · ${baseName(b)}` : id;
	});
</script>

<template>
	<PModal
		v-model:show="show"
		:title="
			outcome
				? t('production_chains.create.created', outcome.plans.length)
				: t('production_chains.create.title', bases.length)
		"
		width="min(56rem, 100%)">
		<div class="flex flex-col gap-4" data-testid="chain-create-plans">
			<template v-if="!outcome">
				<p class="text-muted">
					{{ $t("production_chains.create.intro") }}
				</p>
				<p
					v-if="had.length"
					class="text-xs text-have"
					data-testid="chain-create-have">
					{{
						$t("production_chains.have.create_note", {
							list: had.join(", "),
						})
					}}
				</p>
				<div class="overflow-x-auto">
					<PTable>
						<thead>
							<!-- below sm the planet, COGC and counts sit under the name -->
							<tr class="whitespace-nowrap">
								<th>
									{{ $t("production_chains.create.base") }}
								</th>
								<th>
									{{
										$t("production_chains.create.plan_name")
									}}
								</th>
								<th class="hidden sm:table-cell">
									{{ $t("production_chains.create.planet") }}
								</th>
								<th class="hidden sm:table-cell">
									{{ $t("production_chains.create.cogc") }}
								</th>
								<th class="hidden sm:table-cell numeric">
									{{
										$t("production_chains.create.buildings")
									}}
								</th>
								<th class="hidden sm:table-cell numeric">
									{{ $t("production_chains.create.permits") }}
								</th>
							</tr>
						</thead>
						<tbody>
							<tr
								v-for="b in bases"
								:key="b.id"
								:data-testid="`chain-create-row-${b.id}`">
								<td class="font-mono font-bold align-top">
									{{ b.id }}
								</td>
								<td class="w-full sm:w-auto sm:min-w-48">
									<PInput
										v-model:value="names[b.id]"
										size="sm"
										class="w-full"
										:aria-label="
											t(
												'production_chains.create.plan_name_of',
												{ id: b.id }
											)
										" />
									<span
										class="sm:hidden block pt-1 text-xs text-muted">
										{{
											$t(
												"production_chains.create.phone_line",
												{
													planet:
														planetOf(b) ??
														t(
															"production_chains.create.no_planet"
														),
													cogc: t(cogcKey(b.cogc)),
													built: b.built,
													permits: b.permits,
												}
											)
										}}
									</span>
									<span
										v-if="b.noFarming.length"
										class="block pt-1 text-xs text-warning"
										:data-testid="`chain-create-no-farming-${b.id}`">
										{{
											$t(
												"production_chains.create.no_farming",
												{ list: b.noFarming.join(", ") }
											)
										}}
									</span>
									<span
										v-if="b.notOnPlanet.length"
										class="block pt-1 text-xs text-warning"
										:data-testid="`chain-create-not-on-planet-${b.id}`">
										{{
											$t(
												"production_chains.create.not_on_planet",
												{
													list: b.notOnPlanet.join(
														", "
													),
												}
											)
										}}
									</span>
								</td>
								<td
									class="hidden sm:table-cell whitespace-nowrap">
									<span v-if="b.planet">{{
										planetOf(b)
									}}</span>
									<span v-else class="text-warning">{{
										$t("production_chains.create.no_planet")
									}}</span>
								</td>
								<td
									class="hidden sm:table-cell whitespace-nowrap">
									{{ $t(cogcKey(b.cogc)) }}
								</td>
								<td
									class="hidden sm:table-cell numeric tabular-nums">
									{{ b.built }}
								</td>
								<td
									class="hidden sm:table-cell numeric tabular-nums"
									:class="{ 'text-negative': b.overArea }">
									{{ b.permits }}
								</td>
							</tr>
						</tbody>
					</PTable>
				</div>

				<div class="flex flex-col gap-2">
					<div class="text-xs uppercase text-muted">
						{{ $t("production_chains.create.empire") }}
					</div>
					<PSegmented
						v-model:value="kind"
						:options="kindOptions"
						size="sm"
						:label="t('production_chains.create.empire')" />
					<div
						v-if="kind === 'new'"
						class="flex flex-wrap items-center gap-2">
						<PInput
							v-model:value="empireName"
							size="sm"
							class="w-64"
							:aria-label="
								t('production_chains.create.empire_name')
							" />
						<span class="text-muted">{{
							$t("production_chains.create.faction_label")
						}}</span>
						<PSelect
							v-model:value="faction"
							:options="factionOptions"
							size="sm"
							class="w-48"
							:aria-label="
								t('production_chains.create.faction_label')
							"
							data-testid="chain-create-faction" />
					</div>
					<PSelect
						v-else-if="kind === 'existing'"
						v-model:value="existing"
						:options="empireOptions"
						size="sm"
						class="w-64"
						:aria-label="
							t('production_chains.create.existing_empire')
						" />
					<p class="text-xs text-muted">
						{{ $t("production_chains.create.faction_note") }}
					</p>
				</div>
			</template>

			<template v-else>
				<p
					v-if="outcome.failed"
					class="text-negative"
					role="alert"
					data-testid="chain-create-error">
					{{
						outcome.failed === "empire"
							? $t("production_chains.create.empire_failed")
							: $t("production_chains.create.failed", {
									base: failedName,
								})
					}}
				</p>
				<ul
					v-if="outcome.plans.length"
					class="flex flex-col gap-1"
					data-testid="chain-create-result">
					<li v-for="p in outcome.plans" :key="p.uuid">
						<RouterLink
							:to="{
								name: 'plan',
								params: {
									planetNaturalId: p.planetId,
									planUuid: p.uuid,
								},
							}"
							class="text-link hover:underline">
							{{ p.base }} · {{ p.name }}
						</RouterLink>
					</li>
					<li v-if="outcome.empire">
						<RouterLink
							:to="{
								name: 'empire',
								params: { empireUuid: outcome.empire.uuid },
							}"
							class="text-link hover:underline">
							{{
								$t("production_chains.create.open_empire", {
									name: outcome.empire.name,
								})
							}}
						</RouterLink>
					</li>
				</ul>
				<p class="text-xs text-muted">
					{{ $t("production_chains.create.stays") }}
				</p>
			</template>
		</div>
		<template #action>
			<div class="flex flex-wrap items-center justify-end gap-3 w-full">
				<template v-if="!outcome">
					<span
						v-if="blocker"
						class="text-xs text-muted flex-1"
						data-testid="chain-create-blocker">
						{{ blocker }}
					</span>
					<PButton
						:disabled="!!blocker || creating"
						:loading="creating"
						data-testid="chain-create-submit"
						@click="submit">
						{{
							$t("production_chains.create.submit", bases.length)
						}}
					</PButton>
				</template>
				<PButton v-else type="secondary" @click="show = false">
					{{ $t("production_chains.create.close") }}
				</PButton>
			</div>
		</template>
	</PModal>
</template>
