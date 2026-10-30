<script setup lang="ts">
	import {
		computed,
		onBeforeUnmount,
		onMounted,
		ref,
		type Ref,
		toRef,
		watch,
	} from "vue";
	import { debounce, type DebouncedFunc } from "lodash-es";

	// Stores
	import { usePlanningStore } from "@/stores/planningStore";

	// Composables
	import { useFIORepair } from "@/features/fio_repair/useFIORepair";
	import { usePreferences } from "@/features/preferences/usePreferences";
	import { trackEvent, reportError } from "@/lib/analytics/useAnalytics";

	// Components
	import ComputingProgress from "@/layout/components/ComputingProgress.vue";
	import FIORepairBaseList from "@/features/fio_repair/components/FIORepairBaseList.vue";
	import FIORepairBasePanel from "@/features/fio_repair/components/FIORepairBasePanel.vue";
	import FIORepairSettings from "@/features/fio_repair/components/FIORepairSettings.vue";
	import FIORepairStats from "@/features/fio_repair/components/FIORepairStats.vue";
	import FIORepairTimeline from "@/features/fio_repair/components/FIORepairTimeline.vue";

	// Types & Interfaces
	import type { Plan } from "@/features/api/schemas/planningData.schemas";
	import type { PlanEmpireElement } from "@/features/api/schemas/empireData.schemas";
	import type { FIORepairFilter } from "@/features/fio_repair/fioRepair.types";

	// UI
	import { PDrawer, useToast } from "@/ui";
	import { useI18n } from "vue-i18n";

	const { t } = useI18n();
	const toast = useToast();

	/**
	 * FIO Repair's page body once planning and game data are loaded:
	 * settings, stats, timeline, the base list and the selected base's
	 * panel (beside the list from 1200 px, a drawer below, its own view on
	 * phones)
	 *
	 * @author jplacht
	 */
	const props = defineProps<{
		plans: Plan[];
		empires: PlanEmpireElement[];
	}>();

	const planningStore = usePlanningStore();
	const {
		defaultCXUuid,
		fioRepairIntervalDays,
		fioRepairDueSoonDays,
		fioRepairArrivalDays,
	} = usePreferences();

	const usePlans: Ref<boolean> = ref(true);
	const { bases, progress, load, flight } = useFIORepair(
		toRef(props, "plans"),
		toRef(props, "empires"),
		usePlans
	);

	const ready = ref(false);
	onMounted(() =>
		load()
			.catch((err) => {
				reportError(err);
				toast(t("common.ui.load_failed"), { type: "error" });
			})
			.finally(() => (ready.value = true))
	);

	/*
	 * Layout
	 */
	const media = (query: string) =>
		typeof window.matchMedia === "function"
			? window.matchMedia(query)
			: null;
	const wideQuery = media("(min-width: 1200px)");
	const phoneQuery = media("(max-width: 767px)");
	const isWide = ref(wideQuery?.matches ?? true);
	const isPhone = ref(phoneQuery?.matches ?? false);
	const phoneDetail = ref(false);
	const drawer = ref(false);
	const onWide = (e: MediaQueryListEvent) => {
		isWide.value = e.matches;
		if (e.matches) drawer.value = false;
	};
	const onPhone = (e: MediaQueryListEvent) => {
		isPhone.value = e.matches;
		if (e.matches) drawer.value = false;
		else phoneDetail.value = false;
	};
	wideQuery?.addEventListener("change", onWide);
	phoneQuery?.addEventListener("change", onPhone);

	const root: Ref<HTMLElement | null> = ref(null);

	/*
	 * Selection and filter
	 */
	const filter: Ref<FIORepairFilter> = ref("all");
	const selected: Ref<string | undefined> = ref(undefined);
	const selectedBase = computed(() =>
		bases.value.find((b) => b.planet === selected.value)
	);

	let used = false;
	watch(bases, (list) => {
		// the first base is selected on load, and when the selected one left
		if (!list.some((b) => b.planet === selected.value))
			selected.value = list[0]?.planet;
		if (!used && list.length) {
			used = true;
			trackEvent("tool:use", { tool_name: "fio_repair" });
		}
	});

	function select(planet: string): void {
		selected.value = planet;
		const base = selectedBase.value;
		if (base)
			trackEvent("fio_repair:base_open", {
				status: base.status,
				confidence: usePlans.value ? base.match.confidence : "none",
			});
		if (isPhone.value) {
			phoneDetail.value = true;
			root.value?.scrollIntoView?.({ block: "start" });
		} else if (!isWide.value) drawer.value = true;
	}

	function filterTo(f: FIORepairFilter): void {
		filter.value = f;
	}

	const counts = computed(() => {
		const c = { matched: 0, likely: 0, none: 0 };
		for (const b of bases.value) {
			const conf = b.match.confidence;
			if (conf === "match" || conf === "picked") c.matched++;
			else if (conf === "likely") c.likely++;
			else c.none++;
		}
		return c;
	});

	/*
	 * Repair flight of the selected base
	 */
	const useStore = ref(true);
	const flightData = computed(() =>
		selectedBase.value
			? flight(
					selectedBase.value,
					fioRepairArrivalDays.value,
					useStore.value
				)
			: undefined
	);
	const cxName = computed(() =>
		defaultCXUuid.value
			? planningStore.cxs[defaultCXUuid.value]?.cx_name
			: undefined
	);

	/*
	 * Analytics: a burst of changes to one setting is one event
	 */
	type Setting =
		"interval" | "due_soon" | "arrival" | "exchange" | "use_plans";
	const settingEvents = new Map<Setting, DebouncedFunc<() => void>>();
	function trackSetting(setting: Setting): void {
		let send = settingEvents.get(setting);
		if (!send) {
			send = debounce(
				() => trackEvent("fio_repair:setting_change", { setting }),
				1000
			);
			settingEvents.set(setting, send);
		}
		send();
	}

	onBeforeUnmount(() => {
		settingEvents.forEach((send) => send.flush());
		wideQuery?.removeEventListener("change", onWide);
		phoneQuery?.removeEventListener("change", onPhone);
	});
</script>

<template>
	<ComputingProgress
		v-if="!ready"
		:step="progress.current"
		:total="progress.total"
		:message="$t('fio.repair.computing')" />
	<!-- from 1200 px the panel takes the right column from the top, so the
	     XIT is in the first view -->
	<div
		v-else
		ref="root"
		:class="
			isWide && selectedBase
				? 'grid grid-cols-[minmax(0,1fr)_minmax(360px,400px)] gap-5 items-start'
				: 'flex flex-col'
		">
		<div
			v-if="!(isPhone && phoneDetail)"
			class="min-w-0 flex flex-col gap-3.5">
			<FIORepairSettings
				v-model:use-plans="usePlans"
				:counts="counts"
				@change="trackSetting" />
			<FIORepairStats
				:bases="bases"
				:due-soon="fioRepairDueSoonDays"
				@filter="filterTo" />
			<FIORepairTimeline
				:bases="bases"
				:due-soon="fioRepairDueSoonDays"
				:selected="selected"
				@select="select"
				@unknown="filterTo('overdue')" />
			<FIORepairBaseList
				v-model:filter="filter"
				:bases="bases"
				:selected="selected"
				:interval="fioRepairIntervalDays"
				:use-plans="usePlans"
				@select="select" />
		</div>
		<FIORepairBasePanel
			v-if="
				selectedBase &&
				flightData &&
				(isWide || (isPhone && phoneDetail))
			"
			v-model:use-store="useStore"
			:base="selectedBase"
			:flight="flightData"
			:interval="fioRepairIntervalDays"
			:use-plans="usePlans"
			:cx-name="cxName"
			:nav="isPhone ? 'back' : undefined"
			:class="
				isWide
					? 'min-w-0 sticky top-4 max-h-[calc(100vh-32px)] overflow-y-auto'
					: 'w-full'
			"
			@close="phoneDetail = false"
			@change="trackSetting" />

		<PDrawer
			v-if="!isWide && !isPhone"
			v-model:show="drawer"
			:width="420"
			:closable="false"
			body-class="p-0!">
			<FIORepairBasePanel
				v-if="selectedBase && flightData"
				v-model:use-store="useStore"
				:base="selectedBase"
				:flight="flightData"
				:interval="fioRepairIntervalDays"
				:use-plans="usePlans"
				:cx-name="cxName"
				nav="close"
				class="border-0 rounded-none min-h-full"
				@close="drawer = false"
				@change="trackSetting" />
		</PDrawer>
	</div>
</template>
