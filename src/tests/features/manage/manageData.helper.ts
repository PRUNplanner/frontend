import { vi } from "vitest";
import { provideManageData } from "@/features/manage/useManageData";

// Types & Interfaces
import type {
	IManageData,
	IManageSection,
	ManageSectionName,
} from "@/features/manage/useManageData.types";

/**
 * Provides real Manage data for a mounted section and keeps what it
 * registers, with its reloads spied: pass `setup` to mountComponent, then read `host.data` and
 * `host.sections`
 */
export function manageDataHost() {
	const host = {
		data: undefined as unknown as IManageData,
		sections: {} as Partial<Record<ManageSectionName, IManageSection>>,
	};
	function setup(): void {
		const data = provideManageData();
		const register = data.register;
		data.register = (name, section) => {
			host.sections[name] = section;
			register(name, section);
		};
		// spied, the sections take them in their setup
		data.refetchCX = vi.fn(data.refetchCX);
		data.refetchEmpires = vi.fn(data.refetchEmpires);
		data.refetchPlans = vi.fn(data.refetchPlans);
		host.data = data;
	}
	return { host, setup };
}
