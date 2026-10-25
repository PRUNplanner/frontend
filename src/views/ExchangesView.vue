<script setup lang="ts">
	import { computed, defineAsyncComponent, ref, type Ref, watch } from "vue";
	import { useRoute, useRouter } from "vue-router";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	import { useHead } from "@unhead/vue";
	useHead({
		title: t("exchanges.view_title"),
	});

	// Stores
	import { usePlanningStore } from "@/stores/planningStore";

	// Composables
	import { trackEvent } from "@/lib/analytics/useAnalytics";
	import { useUnsavedGuard } from "@/lib/useUnsavedGuard";
	import { useCXSave } from "@/features/cx/useCXSave";
	import { usePlanetData } from "@/database/services/usePlanetData";
	import { useExchangeEdit } from "@/features/exchanges/useExchangeEdit";
	import { useExchangePlanData } from "@/features/exchanges/useExchangePlanData";

	// Util
	import {
		ALL_PLANETS,
		buildPayload,
		planetsWithRules,
		setPlanetRules,
	} from "@/features/exchanges/cxEdit.util";
	import { setBuyPrice } from "@/features/exchanges/fixedPrices.util";
	import {
		exchangeNotes,
		type IExchangeNote,
	} from "@/features/exchanges/exchangeNotes.util";

	// Components
	import WrapperPlanningDataLoader from "@/features/wrapper/components/WrapperPlanningDataLoader.vue";
	import WrapperGameDataLoader from "@/features/wrapper/components/WrapperGameDataLoader.vue";
	import SaveBar from "@/features/save_bar/components/SaveBar.vue";
	import SaveConflictNotice from "@/features/save_conflict/components/SaveConflictNotice.vue";
	import CXHeader from "@/features/exchanges/components/CXHeader.vue";
	import CXPreferenceSwitch from "@/features/exchanges/components/CXPreferenceSwitch.vue";
	import CXScopeList from "@/features/exchanges/components/CXScopeList.vue";
	const AsyncCXOverview = defineAsyncComponent(
		() => import("@/features/exchanges/components/CXOverview.vue")
	);
	const AsyncCXScopeRules = defineAsyncComponent(
		() => import("@/features/exchanges/components/CXScopeRules.vue")
	);
	const SaveConflictDialog = defineAsyncComponent(
		() =>
			import("@/features/save_conflict/components/SaveConflictDialog.vue")
	);

	// Types & Interfaces
	import type { CX, CXData } from "@/features/api/schemas/cxData.schemas";
	import type { Plan } from "@/features/api/schemas/planningData.schemas";
	import type { PlanEmpireElement } from "@/features/api/schemas/empireData.schemas";

	// UI
	import { useConfirm } from "@/ui";
	import { buttonConfig } from "@/ui/styles";

	// a link that looks like the primary button
	const createLinkClass = [
		buttonConfig.base,
		buttonConfig.sizes.md.base,
		buttonConfig.colors.primary.base,
		buttonConfig.colors.primary.hover,
		"w-fit",
	].join(" ");

	const props = defineProps({
		cxUuid: {
			type: String,
			required: false,
			default: undefined,
		},
	});

	const route = useRoute();
	const router = useRouter();
	const confirm = useConfirm();
	const planningStore = usePlanningStore();
	const cxSave = useCXSave("exchanges_view");
	const { planetName } = usePlanetData();

	const cxList: Ref<CX[]> = ref([]);
	const plans: Ref<Plan[]> = ref([]);
	const empires: Ref<PlanEmpireElement[]> = ref([]);

	// the route's preference, else the one the loader picks
	const loaderUuid: Ref<string | undefined> = ref(undefined);
	const cxUuid = computed(() => props.cxUuid ?? loaderUuid.value);

	const edit = useExchangeEdit();
	const { loaded, name, data } = edit;
	const unsaved = computed(() => edit.changeCount.value > 0);

	function load(uuid: string): void {
		cxSave.remoteNotice.value = null;
		edit.load(uuid);
	}

	// loads once the store has it
	watch(
		() =>
			cxUuid.value && planningStore.cxs[cxUuid.value]
				? cxUuid.value
				: undefined,
		(uuid) => {
			if (uuid && uuid !== loaded.value?.uuid) load(uuid);
		},
		{ immediate: true }
	);

	// an unknown preference in the route opens the first one
	watch(cxList, (list) => {
		const uuid = cxUuid.value;
		if (!uuid || loaded.value?.uuid === uuid || list.length === 0) return;
		if (!list.some((c) => c.uuid === uuid))
			router.replace(`/exchanges/${list[0].uuid}`);
	});

	/*
	 * Saved or deleted in another tab: without unsaved edits the CX
	 * reloads, with them a notice offers to
	 */
	const saveState: Ref<"idle" | "saving" | "error"> = ref("idle");
	watch(
		() => (cxUuid.value ? planningStore.cxs[cxUuid.value] : undefined),
		(cx) => {
			const current = loaded.value;
			if (saveState.value === "saving" || !current) return;
			if (cxUuid.value !== current.uuid) return;
			if (cx && cx.modified_at === current.modified_at) return;

			const reload = cxSave.onRemoteChange(cx, current, {
				cx_name: name.value,
				cx_data: data.value,
			});
			if (reload) load(current.uuid);
		}
	);

	// Plans of the empires using the preference, priced with the edits
	const includeOthers = ref(false);
	const planData = useExchangePlanData({
		plans: () => plans.value,
		empires: () => empires.value,
		cx: () => loaded.value ?? undefined,
		cxData: () => (loaded.value ? data.value : undefined),
		includeOthers: () => includeOthers.value,
	});

	const plannedPlanets = computed(
		() => new Set(plans.value.map((p) => p.planet_natural_id))
	);

	const notes = computed<IExchangeNote[]>(() => {
		const cxData = planData.pricedData.value;
		if (!cxData || !loaded.value) return [];
		return exchangeNotes({
			cxData,
			bases: planData.bases.value.filter((b) => b.linked),
			bookFor: planData.bookForPlanet.value,
			cogms: planData.materialCOGMs.value,
			linkedEmpires: loaded.value.empires.length,
			plannedPlanets: plannedPlanets.value,
		});
	});

	// planets with their own rules, of all the preference prices
	const planetCounts = computed<[number, number]>(() => {
		const own = planetsWithRules(data.value).filter((p) =>
			plannedPlanets.value.has(p)
		);
		const all = new Set(own);
		loaded.value?.empires.forEach((e) =>
			e.plans.forEach((p) => all.add(p.planet_natural_id))
		);
		return [own.length, all.size];
	});

	// Scope in ?scope=all|<planet>, none or unknown is the Overview
	const scope = computed<string | undefined>({
		get: () => {
			const s = route.query.scope;
			if (typeof s !== "string") return undefined;
			if (s === ALL_PLANETS) return s;
			return plannedPlanets.value.has(s) ||
				planetsWithRules(data.value).includes(s)
				? s
				: undefined;
		},
		set: (s) => {
			router.replace({ query: { ...route.query, scope: s } });
		},
	});
	// COGM drifts stay on the Overview: the fixed price table has its COGMs
	const scopeNotes = computed(() =>
		notes.value.filter(
			(n) => n.scope === scope.value && n.code !== "cogm_drift"
		)
	);
	const isUnplanned = computed(
		() =>
			scope.value !== undefined &&
			scope.value !== ALL_PLANETS &&
			!plannedPlanets.value.has(scope.value)
	);

	// Edits
	function useCOGM(note: IExchangeNote): void {
		const ticker = note.tickers[0];
		data.value = {
			...data.value,
			ticker_empire: setBuyPrice(
				data.value.ticker_empire,
				ticker,
				Math.round(note.cogm! * 100) / 100
			),
		};
		trackEvent("exchange:use_cogm", {
			location: "exchanges_view",
			material_ticker: ticker,
		});
	}

	function deletePlanet(planet: string): void {
		data.value = setPlanetRules(
			setPlanetRules(data.value, planet, "cx_planets", []),
			planet,
			"ticker_planets",
			[]
		);
	}

	function importData(imported: CXData): void {
		data.value = imported;
		scope.value = undefined;
	}

	async function switchTo(uuid: string): Promise<void> {
		if (
			unsaved.value &&
			!(await confirm({
				title: t("exchanges.switch.confirm_title"),
				content: t("exchanges.switch.confirm", { preference: name.value }),
				positiveText: t("exchanges.switch.discard"),
				negativeText: t("exchanges.switch.keep"),
			}))
		)
			return;
		edit.discard();
		router.replace(`/exchanges/${uuid}`);
	}

	// Save bar
	async function save(): Promise<void> {
		const current = loaded.value;
		// PButton stays clickable while loading, a double click saves once
		if (!current || saveState.value === "saving") return;
		saveState.value = "saving";
		trackEvent("exchange:update", {
			cx_uuid: current.uuid,
			location: "exchanges_view",
		});
		try {
			if (
				await cxSave.save(current, {
					cx_name: name.value,
					cx_data: buildPayload(data.value),
				})
			)
				load(current.uuid);
			saveState.value = "idle";
		} catch (err) {
			console.error(err);
			saveState.value = "error";
		}
	}

	function discard(): void {
		trackEvent("exchange:discard", { location: "exchanges_view" });
		edit.discard();
		saveState.value = "idle";
	}

	useUnsavedGuard(
		() => unsaved.value,
		() => t("exchanges.save_bar.leave_unsaved"),
		() =>
			trackEvent("exchange:leave_unsaved", { location: "exchanges_view" })
	);
</script>

<template>
	<WrapperPlanningDataLoader
		plan-list
		empire-list
		load-c-x
		:cx-uuid="props.cxUuid"
		@update:cx-uuid="(uuid: string | undefined) => (loaderUuid = uuid)"
		@data:cx="(value: CX[]) => (cxList = value)"
		@data:plan:list="(value: Plan[]) => (plans = value)"
		@data:empire:list="(value: PlanEmpireElement[]) => (empires = value)">
		<WrapperGameDataLoader load-exchanges load-materials>
			<section
				v-if="!cxUuid"
				class="max-w-2xl m-3 sm:m-6 p-4 sm:p-6 border border-white/10 rounded flex flex-col gap-3">
				<h1 class="text-2xl font-bold">
					{{ $t("exchanges.empty.title") }}
				</h1>
				<p class="text-white/80">{{ $t("exchanges.empty.text") }}</p>
				<router-link to="/manage#cx" :class="createLinkClass">
					{{ $t("exchanges.empty.create") }}
				</router-link>
			</section>
			<div v-else class="min-h-screen flex flex-col">
				<CXHeader
					:name="name"
					:cx-data="loaded ? data : undefined"
					@rename="(value: string) => (name = value)"
					@import="importData" />
				<SaveConflictNotice
					class="mx-6 mt-3"
					:notice="cxSave.remoteNotice.value"
					@reload="load(cxUuid)" />
				<div
					v-if="loaded"
					class="grow grid grid-cols-1 lg:grid-cols-[336px_minmax(0,1fr)] lg:divide-x divide-white/10">
					<aside
						class="min-w-0 px-6 py-4 flex flex-col gap-4 border-b lg:border-b-0 border-white/10">
						<CXPreferenceSwitch :cx="loaded" @switch="switchTo" />
						<CXScopeList
							v-model:scope="scope"
							v-model:include-others="includeOthers"
							:cx="loaded"
							:cx-data="data"
							:notes="notes"
							:plans="plans"
							:empires="empires"
							@delete="deletePlanet" />
					</aside>
					<main class="min-w-0 p-6">
						<AsyncCXOverview
							v-if="scope === undefined"
							:cx-data="data"
							:priced-data="planData.pricedData.value"
							:rows="planData.materialRows.value"
							:notes="notes"
							:calculating="planData.isCalculating.value"
							:progress="[
								planData.progressCurrent.value,
								planData.progressTotal.value,
							]"
							:planet-counts="planetCounts"
							@open="(s: string) => (scope = s)"
							@use-cogm="useCOGM" />
						<AsyncCXScopeRules
							v-else
							v-model:cx-data="data"
							:scope="scope"
							:planet-label="planetName(scope, scope)"
							:unplanned="isUnplanned"
							:notes="scopeNotes"
							:cogms="planData.materialCOGMs.value"
							:planet-rows="
								scope === ALL_PLANETS
									? []
									: planData.planetMaterialRows(scope)
							"
							:priced-data="planData.pricedData.value"
							:price-book-for="planData.priceBookFor"
							@open="(s: string) => (scope = s)"
							@use-cogm="useCOGM"
							@delete="deletePlanet" />
					</main>
				</div>
				<SaveBar
					v-if="unsaved"
					:count="edit.changeCount.value"
					:detail="t('exchanges.save_bar.detail')"
					:state="saveState"
					@save="save"
					@discard="discard" />
				<!-- the bar never covers the last rows -->
				<div v-if="unsaved" class="h-6" />
			</div>
		</WrapperGameDataLoader>
		<SaveConflictDialog
			v-if="cxSave.conflict.show.value"
			:conflict="cxSave.conflict" />
	</WrapperPlanningDataLoader>
</template>
