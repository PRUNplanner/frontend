import { computed, shallowRef } from "vue";

// Types & Interfaces
import type {
	PlanEmpireElement,
	PlanEmpireJunction,
} from "@/features/api/schemas/empireData.schemas";
import type { IAssignmentChanges } from "@/features/manage/useAssignmentMatrix.types";

/**
 * Key of one matrix cell
 * @author jplacht
 *
 * @param {string} planUuid Plan Uuid
 * @param {string} empireUuid Empire Uuid
 * @returns {string} "<planUuid>|<empireUuid>"
 */
export function cellKey(planUuid: string, empireUuid: string): string {
	return `${planUuid}|${empireUuid}`;
}

export function splitKey(key: string): [string, string] {
	const i = key.indexOf("|");
	return [key.slice(0, i), key.slice(i + 1)];
}

/**
 * Assignments as the backend has them
 * @author jplacht
 *
 * @param {PlanEmpireElement[]} empires Empires with their plans
 * @returns {Set<string>} Cell keys that are assigned
 */
export function buildLoaded(empires: PlanEmpireElement[]): Set<string> {
	const loaded = new Set<string>();
	for (const e of empires)
		for (const p of e.plans) loaded.add(cellKey(p.uuid, e.uuid));
	return loaded;
}

/**
 * Cells that differ between loaded and current state
 * @author jplacht
 *
 * @param {Set<string>} loaded Saved state
 * @param {Set<string>} current Edited state
 * @returns {IAssignmentChanges} Changed keys and counts
 */
export function diff(
	loaded: Set<string>,
	current: Set<string>
): IAssignmentChanges {
	const changedKeys = new Set<string>();
	for (const k of current) if (!loaded.has(k)) changedKeys.add(k);
	for (const k of loaded) if (!current.has(k)) changedKeys.add(k);

	const plans = new Set<string>();
	const empires = new Set<string>();
	for (const k of changedKeys) {
		const [plan, empire] = splitKey(k);
		plans.add(plan);
		empires.add(empire);
	}

	return {
		changedKeys,
		changedCount: changedKeys.size,
		planCount: plans.size,
		empireCount: empires.size,
	};
}

/**
 * Junction payload: the full plan list of every empire with a changed cell
 * @author jplacht
 *
 * @param {PlanEmpireElement[]} empires Empires
 * @param {Set<string>} current Edited state
 * @param {Set<string>} changedKeys Keys from diff()
 * @returns {PlanEmpireJunction[]} Patch payload
 */
export function toJunctions(
	empires: PlanEmpireElement[],
	current: Set<string>,
	changedKeys: Set<string>
): PlanEmpireJunction[] {
	const changedEmpires = new Set([...changedKeys].map((k) => splitKey(k)[1]));
	const plansPerEmpire = new Map<string, string[]>();
	for (const k of current) {
		const [plan, empire] = splitKey(k);
		if (!changedEmpires.has(empire)) continue;
		const list = plansPerEmpire.get(empire);
		if (list) list.push(plan);
		else plansPerEmpire.set(empire, [plan]);
	}

	return empires
		.filter((e) => changedEmpires.has(e.uuid))
		.map((e) => ({
			empire_uuid: e.uuid,
			baseplanners: (plansPerEmpire.get(e.uuid) ?? []).map((uuid) => ({
				baseplanner_uuid: uuid,
			})),
		}));
}

/**
 * Sets many cells at once, returns a new Set
 * @author jplacht
 *
 * @param {Set<string>} current Edited state
 * @param {string[]} keys Cell keys
 * @param {boolean} value Assigned or not
 * @returns {Set<string>} New state
 */
export function setMany(
	current: Set<string>,
	keys: string[],
	value: boolean
): Set<string> {
	const next = new Set(current);
	for (const k of keys) {
		if (value) next.add(k);
		else next.delete(k);
	}
	return next;
}

/**
 * Re-applies pending edits on top of freshly loaded assignments, dropping
 * cells of plans or empires that no longer exist
 * @author jplacht
 *
 * @param {Set<string>} oldLoaded Previously saved state
 * @param {Set<string>} newLoaded Newly saved state
 * @param {Set<string>} current Edited state on top of oldLoaded
 * @param {Set<string>} planUuids Existing plans
 * @param {Set<string>} empireUuids Existing empires
 * @returns {Set<string>} Edited state on top of newLoaded
 */
export function rebase(
	oldLoaded: Set<string>,
	newLoaded: Set<string>,
	current: Set<string>,
	planUuids: Set<string>,
	empireUuids: Set<string>
): Set<string> {
	const next = new Set(newLoaded);
	for (const k of current) {
		if (oldLoaded.has(k)) continue;
		const [plan, empire] = splitKey(k);
		if (planUuids.has(plan) && empireUuids.has(empire)) next.add(k);
	}
	for (const k of oldLoaded) if (!current.has(k)) next.delete(k);
	return next;
}

/**
 * Plan ↔ empire assignment state: saved and edited cells as immutable Sets
 * @author jplacht
 */
export function useAssignmentMatrix() {
	const loaded = shallowRef(new Set<string>());
	const current = shallowRef(new Set<string>());
	const changes = computed(() => diff(loaded.value, current.value));

	function load(empires: PlanEmpireElement[], planUuids: Set<string>): void {
		const next = buildLoaded(empires);
		current.value = rebase(
			loaded.value,
			next,
			current.value,
			planUuids,
			new Set(empires.map((e) => e.uuid))
		);
		loaded.value = next;
	}

	function set(keys: string[], value: boolean): void {
		current.value = setMany(current.value, keys, value);
	}

	function discard(): void {
		current.value = loaded.value;
	}

	return { loaded, current, changes, load, set, discard };
}
