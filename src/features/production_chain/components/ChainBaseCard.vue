<script setup lang="ts">
	import { computed, ref } from "vue";
	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Components
	import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";

	// Util
	import {
		cogcBonus,
		cogcKey,
		expertKey,
		expertsText,
		formatMoney,
		formatShare,
	} from "@/features/production_chain/productionChain.util";

	// Engine
	import {
		expertTypeOf,
		workforceRecord,
	} from "@/features/production_chain/engine/chainSolver";
	import {
		MAX_EXPERTS_PER_TYPE,
		MAX_EXPERTS_TOTAL,
	} from "@/features/planning/engine/efficiency";
	import { environmentExtras } from "@/features/planet_search/environmentExtras.util";
	import { formatNumber } from "@/util/numbers";
	import { planetDisplayName } from "@/util/planetName";

	// Schemas
	import { PlanCOGCProgramSchema } from "@/features/api/schemas/planningData.schemas";

	// Types & Interfaces
	import type {
		ExpertType,
		PlanCOGCProgram,
	} from "@/features/api/schemas/planningData.schemas";
	import type {
		ChainBaseCOGC,
		ChainExperts,
		ChainLux,
		IChainBase,
		IChainBaseResult,
	} from "@/features/production_chain/engine/chainSolver.types";

	// UI
	import { PButton, PInput, PInputNumber, PPopover, PSelect } from "@/ui";

	const { base, choice, efficiency, removable, fits } = defineProps<{
		base: IChainBaseResult;
		choice: IChainBase;
		/** chain efficiency, 1 = 100 % */
		efficiency: number;
		removable: boolean;
		/** whether a program helps any of the base's buildings */
		fits: (program: PlanCOGCProgram) => boolean;
	}>();

	const emit = defineEmits<{
		(e: "rename", name: string): void;
		(e: "remove"): void;
		(e: "cogc", cogc: ChainBaseCOGC): void;
		(e: "planet"): void;
		(e: "lux", lux: ChainLux): void;
		// undefined: auto
		(e: "experts", experts: ChainExperts | undefined): void;
	}>();

	const LUX: ChainLux[] = ["both", "lux2", "lux1", "none"];
	const luxOptions = LUX.map((lux) => ({
		value: lux,
		label: t(`production_chains.bases.lux_option.${lux}`, {
			pct: formatShare(workforceRecord(lux).pioneer.efficiency),
		}),
	}));

	const expertName = (type: ExpertType) => t(expertKey(type));
	const expertsLine = computed(() => {
		const text =
			expertsText(base.experts, expertName) ||
			t("production_chains.bases.experts_none");
		return base.expertsAuto
			? t("production_chains.bases.experts_auto", { text })
			: text;
	});
	/** the base's expertises and any type with experts */
	const expertTypes = computed(() => {
		const types = new Set<ExpertType>();
		for (const b of base.buildingTypes) {
			const type = expertTypeOf(b.expertise);
			if (type) types.add(type);
		}
		for (const [type, n] of Object.entries(base.experts))
			if (n > 0) types.add(type as ExpertType);
		return [...types];
	});
	const editExperts = ref(false);
	/** at most 5 per type and 6 in total */
	const maxFor = (type: ExpertType) =>
		Math.min(
			MAX_EXPERTS_PER_TYPE,
			MAX_EXPERTS_TOTAL -
				Object.entries(base.experts).reduce(
					(s, [k, n]) => (k === type ? s : s + n),
					0
				)
		);
	function setExpert(type: ExpertType, n: number): void {
		const amount = Math.max(0, Math.min(maxFor(type), Math.round(n)));
		emit("experts", { ...base.experts, [type]: amount });
	}

	// always needed, so not listed
	const SURFACE_EXTRAS = ["MCG", "AEF"];

	const money = (v: number) =>
		t("production_chains.money", { value: formatMoney(v) });
	const program = (p: PlanCOGCProgram) => t(cogcKey(p));

	const planet = computed(() => {
		const p = base.planet;
		if (!p) return null;
		return {
			name: planetDisplayName(p.planet_natural_id, p.planet_name),
			surface: t(
				p.surface
					? "production_chains.bases.rocky"
					: "production_chains.bases.gaseous"
			),
			extras: environmentExtras(p)
				.map((e) => e.ticker)
				.filter((x) => !SURFACE_EXTRAS.includes(x)),
			fertility:
				p.fertility > -1
					? t("production_chains.bases.fertility", {
							pct: `${p.fertility >= 0 ? "+" : ""}${formatShare((p.fertility * 10) / 33)}`,
						})
					: null,
		};
	});

	const cogcOptions = computed(() => {
		const programs = PlanCOGCProgramSchema.options.filter(
			(p) => p !== "---"
		);
		const sorted = [
			...programs.filter((p) => fits(p)),
			...programs.filter((p) => !fits(p)),
		];
		return [
			{
				value: "auto",
				label: t("production_chains.bases.cogc_running", {
					program:
						base.running === "---"
							? t("production_chains.bases.cogc_nothing")
							: program(base.running),
				}),
			},
			{ value: "none", label: t("production_chains.bases.cogc_off") },
			...sorted.map((p) => ({
				value: p,
				label: program(p),
				badge: [
					fits(p)
						? t("production_chains.bases.bonus", {
								pct: cogcBonus(p),
							})
						: "",
					p !== base.running
						? t("production_chains.bases.not_running")
						: "",
				]
					.filter(Boolean)
					.join(" · "),
			})),
		];
	});

	/** the program in use helps buildings here */
	const fitLine = computed(() =>
		base.cogc !== "---" && fits(base.cogc)
			? t("production_chains.bases.cogc_fits", {
					program: program(base.cogc),
					pct: cogcBonus(base.cogc),
				})
			: null
	);
	const planned = computed(
		() => base.cogc !== "---" && base.cogc !== base.running
	);

	const workforce = computed(() =>
		Object.entries(base.workforce)
			.filter(([, w]) => w > 0)
			.map(
				([tier, w]) =>
					`${t(`production_chains.results.tier.${tier}`)} ${formatNumber(w, 0)}`
			)
			.join(" · ")
	);
	const workforceTotal = computed(() =>
		Object.values(base.workforce).reduce((a, b) => a + b, 0)
	);

	const effClass = (e: number) =>
		e > efficiency + 1e-9
			? "text-positive"
			: e < efficiency - 1e-9
				? "text-negative"
				: "text-muted";
</script>

<template>
	<section
		class="rounded-panel border border-line p-3 flex flex-col gap-3 min-w-0"
		:data-testid="`chain-base-card-${base.id}`">
		<div class="flex items-center gap-2">
			<span
				class="px-1.5 rounded-control border border-line font-mono font-bold">
				{{ base.id }}
			</span>
			<PInput
				:value="choice.name"
				size="sm"
				class="flex-1 min-w-0"
				:placeholder="
					t('production_chains.bases.unnamed', { id: base.id })
				"
				:aria-label="t('production_chains.bases.name', { id: base.id })"
				@update:value="(v) => emit('rename', v ?? '')" />
			<button
				v-if="removable"
				type="button"
				class="min-w-6 min-h-6 inline-flex items-center justify-center rounded-control text-muted hover:text-ink-strong hover:bg-hover cursor-pointer"
				:aria-label="
					t('production_chains.bases.remove', { id: base.id })
				"
				:title="t('production_chains.bases.remove_title')"
				@click="emit('remove')">
				×
			</button>
		</div>

		<div class="flex flex-wrap items-center gap-3">
			<button
				type="button"
				class="text-left px-2 py-1 rounded-control border border-line hover:bg-hover cursor-pointer min-w-48"
				aria-haspopup="dialog"
				:data-testid="`chain-base-planet-${base.id}`"
				@click="emit('planet')">
				<template v-if="planet">
					<span class="block font-bold">{{ planet.name }}</span>
					<span class="block text-xs text-muted">
						{{ planet.surface }}
						<template v-if="planet.extras.length">
							· {{ planet.extras.join(", ") }}</template
						>
						<template v-if="planet.fertility">
							· {{ planet.fertility }}</template
						>
						·
						<span class="text-link"
							>{{ $t("production_chains.bases.change") }} ▾</span
						>
					</span>
				</template>
				<template v-else-if="choice.planetId">
					<span class="block font-bold">{{ choice.planetId }}</span>
					<span class="block text-xs text-muted">{{
						$t("production_chains.bases.planet_loading")
					}}</span>
				</template>
				<span
v-else
class="text-link"
					>{{ $t("production_chains.bases.pick_planet") }} ▾</span
				>
			</button>
			<label class="flex items-center gap-2 flex-1 min-w-48">
				<span class="text-xs uppercase text-muted">{{
					$t("production_chains.bases.cogc")
				}}</span>
				<PSelect
					:value="choice.cogc"
					:options="cogcOptions"
					size="sm"
					class="flex-1"
					:aria-label="
						t('production_chains.bases.cogc_of', { id: base.id })
					"
					@update:value="
						(v) => v && emit('cogc', v as ChainBaseCOGC)
					" />
			</label>
		</div>

		<div
			class="flex flex-wrap items-center gap-3"
			:data-testid="`chain-base-setup-${base.id}`">
			<span class="text-xs uppercase text-muted">{{
				$t("production_chains.bases.setup")
			}}</span>
			<label class="flex items-center gap-2">
				<span class="text-xs text-muted">{{
					$t("production_chains.bases.lux")
				}}</span>
				<PSelect
					:value="base.lux"
					:options="luxOptions"
					size="sm"
					class="w-44"
					:aria-label="t('production_chains.bases.lux_of', { id: base.id })"
					@update:value="(v) => v && emit('lux', v as ChainLux)" />
			</label>
			<div class="flex items-center gap-2 min-w-0">
				<span class="text-xs text-muted">{{
					$t("production_chains.bases.experts")
				}}</span>
				<span
					class="text-sm truncate"
					:data-testid="`chain-base-experts-${base.id}`"
					>{{ expertsLine }}</span
				>
				<PPopover
					v-if="expertTypes.length"
					v-model:show="editExperts"
					placement="bottom-start">
					<template #trigger>
						<PButton
							type="secondary"
							size="sm"
							:data-testid="`chain-base-experts-edit-${base.id}`">
							{{ $t("production_chains.bases.experts_edit") }}
						</PButton>
					</template>
					<div class="flex flex-col gap-2 w-72 max-w-[90vw]">
						<label
							v-for="type in expertTypes"
							:key="type"
							class="flex items-center justify-between gap-2">
							<span class="text-sm">{{ expertName(type) }}</span>
							<PInputNumber
								:value="base.experts[type]"
								show-buttons
								size="sm"
								class="w-28"
								:min="0"
								:max="maxFor(type)"
								:aria-label="
									t('production_chains.bases.experts_of', {
										type: expertName(type),
									})
								"
								@update:value="(v) => setExpert(type, v ?? 0)" />
						</label>
						<p class="text-xs text-muted">
							{{ $t("production_chains.bases.experts_limits") }}
						</p>
						<PButton
							type="secondary"
							size="sm"
							:disabled="base.expertsAuto"
							:data-testid="`chain-base-experts-auto-${base.id}`"
							@click="emit('experts', undefined)">
							{{ $t("production_chains.bases.experts_reset") }}
						</PButton>
					</div>
				</PPopover>
			</div>
		</div>

		<p v-if="fitLine" class="text-sm text-positive">
			{{ fitLine }}
			<template v-if="planned">
{{
				$t("production_chains.bases.planned")
			}}
</template>
		</p>
		<ul
			v-if="
				base.noFarming.length ||
				base.notOnPlanet.length ||
				base.overArea
			"
			class="text-sm text-warning"
			:data-testid="`chain-base-warnings-${base.id}`">
			<li v-if="base.overArea">
				{{
					$t("production_chains.bases.over_area", {
						n: formatNumber(base.area, 0),
					})
				}}
			</li>
			<li v-if="base.noFarming.length">
				{{
					$t("production_chains.bases.no_farming", {
						list: base.noFarming.join(", "),
					})
				}}
			</li>
			<li v-if="base.notOnPlanet.length">
				{{
					$t("production_chains.bases.not_on_planet", {
						list: base.notOnPlanet.join(", "),
					})
				}}
			</li>
		</ul>
		<p v-if="!base.materials.length" class="text-sm text-muted">
			{{ $t("production_chains.bases.empty") }}
		</p>

		<div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
			<div class="rounded-control border border-line px-2 py-1.5 min-w-0">
				<div class="text-xs uppercase text-muted">
					{{ $t("production_chains.bases.buildings") }}
				</div>
				<div class="font-bold tabular-nums">{{ base.built }}</div>
			</div>
			<div class="rounded-control border border-line px-2 py-1.5 min-w-0">
				<div class="text-xs uppercase text-muted">
					{{ $t("production_chains.bases.area") }}
				</div>
				<div
					class="font-bold tabular-nums"
					:class="{ 'text-negative': base.overArea }">
					{{ formatNumber(base.area, 0) }} /
					{{ formatNumber(base.areaAvailable, 0) }}
				</div>
				<div
					class="h-1 rounded-control bg-surface-sunken overflow-hidden my-1">
					<div
						class="h-full"
						:class="base.overArea ? 'bg-negative' : 'bg-positive'"
						:style="{
							width: `${Math.min(100, (base.area / base.areaAvailable) * 100)}%`,
						}" />
				</div>
				<div class="text-xs text-muted">
					{{ $t("production_chains.bases.permits", base.permits) }}
				</div>
			</div>
			<div class="rounded-control border border-line px-2 py-1.5 min-w-0">
				<div class="text-xs uppercase text-muted">
					{{ $t("production_chains.bases.workforce") }}
				</div>
				<div class="font-bold tabular-nums">
					{{ formatNumber(workforceTotal, 0) }}
				</div>
				<div class="text-xs text-muted truncate" :title="workforce">
					{{ workforce }}
				</div>
			</div>
			<div class="rounded-control border border-line px-2 py-1.5 min-w-0">
				<div class="text-xs uppercase text-muted">
					{{ $t("production_chains.bases.upkeep") }}
				</div>
				<div class="font-bold tabular-nums">
					{{ money(base.upkeep + base.wear) }}
				</div>
				<div class="text-xs text-muted">
					{{ $t("production_chains.bases.per_day") }}
				</div>
			</div>
		</div>

		<ul
			class="flex flex-col gap-1 tabular-nums"
			:data-testid="`chain-base-buildings-${base.id}`">
			<li
				v-for="b in base.buildingTypes"
				:key="b.ticker"
				class="grid grid-cols-[1fr_auto_2rem] gap-2 items-baseline">
				<span class="min-w-0 truncate">
					<span class="font-mono font-bold">{{ b.ticker }}</span>
					<span class="text-xs text-muted pl-1">{{
						b.materials.join(", ")
					}}</span>
				</span>
				<span :class="effClass(b.efficiency)">{{
					formatShare(b.efficiency)
				}}</span>
				<span class="text-right font-bold">{{ b.built }}</span>
			</li>
			<li
				v-if="base.materials.length"
				class="grid grid-cols-[1fr_auto_2rem] gap-2 items-baseline text-muted">
				<span class="min-w-0 truncate">
					<span class="font-mono">STO</span>
					<span class="text-xs pl-1">{{
						$t("production_chains.bases.storage")
					}}</span>
				</span>
				<span />
				<span class="text-right">1</span>
			</li>
		</ul>

		<div v-if="base.materials.length" class="flex flex-wrap gap-1">
			<MaterialTile v-for="m in base.materials" :key="m" :ticker="m" />
		</div>
	</section>
</template>
