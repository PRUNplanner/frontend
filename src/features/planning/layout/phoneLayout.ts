// Types & Interfaces
import type {
	GridItem,
	GridLayout,
} from "@/features/planning/layout/planLayout.types";

// Util
import { packLayout } from "@/features/planning/layout/packLayout";
import { normaliseLayout } from "@/features/planning/layout/normaliseLayout";
import { PHONE_EDIT_WIDTH } from "@/features/planning/layout/planLayout.constants";

/**
 * The automatic phone arrangement of a wide layout, as a two-column grid:
 * what a phone shows of it (it stacks in reading order, small parts two per
 * row), so the first change in the editor's Phone arrangement starts from
 * what the player already sees there. Following while scrolling is a wide
 * screen's thing: normaliseLayout drops it.
 * @author jplacht
 *
 * @param {GridLayout} wide Normalised wide layout
 * @returns {GridLayout} Normalised phone layout (2 columns)
 */
export function phoneFromWide(wide: GridLayout): GridLayout {
	const packed = packLayout(wide, PHONE_EDIT_WIDTH).items;
	const order = [...wide.items].sort(
		(a, b) =>
			Number(b.pin) - Number(a.pin) ||
			packed[a.id].top - packed[b.id].top ||
			packed[a.id].left - packed[b.id].left
	);
	const items: GridItem[] = order.map((it, y) => {
		const p = packed[it.id];
		return {
			...it,
			els: [...it.els],
			x: p.x === 0 ? 0 : 1,
			w: p.w >= wide.cols ? 2 : 1,
			y,
		};
	});
	return normaliseLayout({ ...wide, items }, "phone");
}
