import { h } from "vue";

/**
 * A component stub in the module shape `vi.mock` expects. It declares its
 * props, so a test can read them through `findComponent(...).props()`.
 * Load it inside the factory, as factories are hoisted above static imports:
 * `vi.mock(path, async () => (await import("@/tests/stubs")).stubComponent(...))`
 */
export function stubComponent(
	name: string,
	props: string[] | Record<string, unknown> = [],
	render: (this: Record<string, unknown>) => unknown = () => h("div")
) {
	return { default: { name, props, render } };
}

/** MaterialTile, rendering its ticker */
export const materialTile = stubComponent(
	"MaterialTile",
	["ticker", "amount", "max", "enablePopover"],
	function () {
		return h("span", this.ticker as string);
	}
);
