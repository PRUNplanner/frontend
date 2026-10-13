import type { PSelectOption } from "@/ui/ui.types";

/**
 * v-for keys for select options: the value itself, so an option keeps its
 * component while a search filters the list, and a numbered key for a
 * missing or repeated value, which would collide as a key.
 *
 * @author jplacht
 *
 * @param {PSelectOption[]} options Options of one list, in render order
 * @returns {(string | number)[]} One unique key per option, same order
 */
export function optionKeys(
	options: Pick<PSelectOption, "value">[]
): (string | number)[] {
	const seen = new Map<PSelectOption["value"], number>();
	return options.map(({ value }) => {
		const count = seen.get(value) ?? 0;
		seen.set(value, count + 1);
		return value !== undefined && count === 0
			? value
			: `\u0000${count}\u0000${String(value)}`;
	});
}
