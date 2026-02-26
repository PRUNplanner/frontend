import { usePlanningStore } from "@/stores/planningStore";

// Types & Interfaces
import { PSelectOption } from "@/ui/ui.types";

export function useCXData() {
	const planningStore = usePlanningStore();

	/**
	 * Finds corresponding Empire Uuid for given CXUuid
	 *
	 * @author jplacht
	 *
	 * @param {(string | undefined)} empireUuid Empire Uuid
	 * @returns {(string | undefined)} CX Uuid or undefined if not assigned
	 */
	function findEmpireCXUuid(
		empireUuid: string | undefined
	): string | undefined {
		// if the empire uuid is undefined, no cx can be found
		if (empireUuid === undefined) return undefined;

		//
		const cx = Object.values(planningStore.cxs).find((c) =>
			c.empires.some((e) => e.uuid === empireUuid)
		);

		return cx ? cx.uuid : undefined;
	}

	/**
	 * Gets a selects option for available CX Preferences
	 *
	 * @author jplacht
	 *
	 * @param {boolean} [includeNone=false] Should include a undefined
	 * @returns {PSelectOption[]} Select Options
	 */
	function getPreferenceOptions(
		includeNone: boolean = false
	): PSelectOption[] {
		const options: PSelectOption[] = [];

		// usePrice has a PP30D Universe default, if no cxuuid is given
		if (includeNone) {
			options.push({ label: "None - Universe 30D", value: undefined });
		}

		// add actual cx options from planning store
		planningStore.getAllCX().forEach((cx) => {
			options.push({ label: cx.cx_name, value: cx.uuid });
		});

		return options;
	}

	return {
		findEmpireCXUuid,
		getPreferenceOptions,
	};
}
