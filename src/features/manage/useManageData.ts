import {
	computed,
	inject,
	type InjectionKey,
	onUnmounted,
	provide,
	ref,
	shallowReactive,
} from "vue";

// Composables
import { useQuery } from "@/lib/query_cache/useQuery";

// Types & Interfaces
import type { Plan } from "@/features/api/schemas/planningData.schemas";
import type { CX } from "@/features/api/schemas/cxData.schemas";
import type { PlanEmpireElement } from "@/features/api/schemas/empireData.schemas";
import type {
	IManageData,
	IManageSection,
	ManageSectionName,
} from "@/features/manage/useManageData.types";

const manageDataKey: InjectionKey<IManageData> = Symbol("ManageData");
const ORDER: ManageSectionName[] = ["empire", "assignments"];

/**
 * Manage page data, provided by ManageView: the empire, plan and CX
 * lists, their reloads, and the sections the save bar saves together
 * @author jplacht
 *
 * @returns {IManageData} Provided data
 */
export function provideManageData(): IManageData {
	const empireList = ref<PlanEmpireElement[]>([]);
	const planList = ref<Plan[]>([]);
	const cxList = ref<CX[]>([]);
	const sections = shallowReactive<
		Partial<Record<ManageSectionName, IManageSection>>
	>({});

	const registered = (): IManageSection[] =>
		ORDER.flatMap((name) => sections[name] ?? []);

	const data: IManageData = {
		empireList,
		planList,
		cxList,
		refetchCX: async () => {
			cxList.value = await useQuery("GetAllCX").execute();
		},
		refetchEmpires: async () => {
			empireList.value = await useQuery("GetAllEmpires").execute();
		},
		// assignments live on both, so both lists or neither
		refetchPlans: async () => {
			const [empires, plans] = await Promise.all([
				useQuery("GetAllEmpires").execute(),
				useQuery("GetAllPlans").execute(),
			]);
			empireList.value = empires;
			planList.value = plans;
		},
		register: (name, section) => {
			sections[name] = section;
			// a section unmounts with its async component
			onUnmounted(() => {
				if (sections[name] === section) delete sections[name];
			});
		},
		totalChanged: computed(() =>
			registered().reduce((sum, s) => sum + s.changedCount.value, 0)
		),
		saveDetail: computed(
			() =>
				registered()
					.map((s) => s.detail?.value)
					.find(Boolean) ?? undefined
		),
		// a part saved before a failure has no changes left on retry
		saveSections: async () => {
			for (const section of registered())
				if (section.changedCount.value > 0) await section.save();
		},
		discardSections: () => registered().forEach((s) => s.discard()),
	};

	provide(manageDataKey, data);
	return data;
}

/**
 * The Manage page data, in a section of ManageView
 *
 * @returns {IManageData} Provided data
 */
export function useManageData(): IManageData {
	const data = inject(manageDataKey);
	if (!data) throw new Error("useManageData needs provideManageData");
	return data;
}
