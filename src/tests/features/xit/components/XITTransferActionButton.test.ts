import { describe, it, expect, afterEach, onTestFinished, vi } from "vitest";
import { h } from "vue";
import { DOMWrapper, flushPromises, type VueWrapper } from "@vue/test-utils";
import { NDrawer } from "naive-ui";

import { trackEvent } from "@/lib/analytics/useAnalytics";
import XITTransferActionButton from "@/features/xit/components/XITTransferActionButton.vue";
import PButton from "@/ui/components/PButton.vue";
import PSelect from "@/ui/components/PSelect.vue";
import { mountComponent } from "@/tests/mountComponent";

vi.mock("@/lib/analytics/useAnalytics", () => ({ trackEvent: vi.fn() }));
vi.mock("@/features/material_tile/components/MaterialTile.vue", () => ({
	default: {
		name: "MaterialTile",
		props: { ticker: String },
		render(this: { ticker: string }) {
			return h("span", this.ticker);
		},
	},
}));

const CONFIGURE = "Configure on Execution";
const ELEMENTS = [
	{ ticker: "BBH", value: 12 },
	{ ticker: "BSE", value: 0 },
	{ ticker: "MCG", value: 1500 },
	{ ticker: "LBH", value: -3 },
];

const MTRA = (origin: string) => ({
	type: "MTRA",
	name: "TransferAction",
	group: "A1",
	origin,
	dest: CONFIGURE,
});

async function mountButton(props: Record<string, unknown> = {}) {
	return mountComponent(XITTransferActionButton, {
		elements: ELEMENTS,
		...props,
	});
}

const body = () => new DOMWrapper(document.body);

async function open(wrapper: VueWrapper) {
	await wrapper.find("button").trigger("click");
	await flushPromises();
}

const xitJSON = () =>
	JSON.parse(
		(body().find(".n-drawer textarea").element as HTMLTextAreaElement).value
	);

const buyCheckbox = () =>
	body().find(".n-drawer input[type=checkbox]").element as HTMLInputElement;

const tableRows = () =>
	body()
		.findAll(".n-drawer tbody tr")
		.map((tr) => tr.findAll("td").map((td) => td.text()));

async function selectOrigin(wrapper: VueWrapper, origin: string) {
	wrapper.findComponent(PSelect).vm.$emit("update:value", origin);
	await flushPromises();
}

describe("XITTransferActionButton", () => {
	afterEach(() => {
		vi.mocked(trackEvent).mockClear();
	});

	it("renders a primary XIT button until shown", async () => {
		const { wrapper } = await mountButton();

		expect(wrapper.find("button").text()).toBe("XIT");
		expect(wrapper.findComponent(PButton).props()).toMatchObject({
			size: "md",
			type: "primary",
		});
		expect(wrapper.findComponent(NDrawer).exists()).toBe(false);
	});

	it("takes button text, size and a secondary style", async () => {
		const { wrapper } = await mountButton({
			buttonText: "Transfer XIT",
			buttonSize: "sm",
			buttonSecondary: true,
		});

		expect(wrapper.find("button").text()).toBe("Transfer XIT");
		expect(wrapper.findComponent(PButton).props()).toMatchObject({
			size: "sm",
			type: "secondary",
		});
	});

	it("opens the drawer once per show", async () => {
		const { wrapper } = await mountButton();

		await open(wrapper);
		expect(wrapper.findComponent(NDrawer).props()).toMatchObject({
			show: true,
			width: 650,
		});
		expect(body().find(".n-drawer-header").text()).toContain("XIT Action");

		// a second click while open does not show it again
		await open(wrapper);
		expect(trackEvent).toHaveBeenCalledTimes(1);
		expect(trackEvent).toHaveBeenCalledWith("xit:transfer_open");
	});

	it("takes a drawer title and width", async () => {
		const { wrapper } = await mountButton({
			drawerTitle: "Supply Cart",
			drawerWidth: 400,
		});
		await open(wrapper);

		expect(wrapper.findComponent(NDrawer).props("width")).toBe(400);
		expect(body().find(".n-drawer-header").text()).toContain("Supply Cart");
	});

	it("shows it again after closing", async () => {
		const { wrapper } = await mountButton();
		await open(wrapper);

		wrapper.findComponent(NDrawer).vm.$emit("update:show", false);
		await flushPromises();
		expect(wrapper.findComponent(NDrawer).props("show")).toBe(false);

		await open(wrapper);
		expect(wrapper.findComponent(NDrawer).props("show")).toBe(true);
		expect(trackEvent).toHaveBeenCalledTimes(2);
	});

	it("lists only positive amounts", async () => {
		const { wrapper } = await mountButton();
		await open(wrapper);

		expect(tableRows()).toEqual([
			["BBH", "12"],
			["MCG", "1,500"],
		]);
	});

	it("generates the XIT JSON without an origin", async () => {
		const { wrapper } = await mountButton();
		await open(wrapper);

		expect(xitJSON()).toEqual({
			actions: [MTRA(CONFIGURE)],
			global: { name: "PRUNplanner Transfer" },
			groups: [
				{
					type: "Manual",
					name: "A1",
					materials: { BBH: 12, MCG: 1500 },
				},
			],
		});
		// without a station there is no CX to buy from
		expect(buyCheckbox().disabled).toBe(true);
		expect(body().text()).toContain("xit.form.buy_from_cx_warning");
	});

	it("names the transfer", async () => {
		const { wrapper } = await mountButton({ transferName: "HQ Upgrade" });
		await open(wrapper);

		expect(xitJSON().global).toEqual({ name: "PRUNplanner HQ Upgrade" });
	});

	it("buys from the CX of a station origin", async () => {
		const { wrapper } = await mountButton();
		await open(wrapper);

		await selectOrigin(wrapper, "Moria Station Warehouse");

		expect(buyCheckbox().disabled).toBe(false);
		expect(buyCheckbox().checked).toBe(true);
		expect(body().text()).not.toContain("xit.form.buy_from_cx_warning");
		expect(xitJSON().actions).toEqual([
			{
				group: "A1",
				exchange: "NC1",
				priceLimits: {},
				buyPartial: false,
				useCXInv: true,
				name: "BuyItems",
				type: "CX Buy",
			},
			MTRA("Moria Station Warehouse"),
		]);

		// buying is a preference
		await body().find(".n-drawer input[type=checkbox]").setValue(false);
		await flushPromises();
		expect(xitJSON().actions).toEqual([MTRA("Moria Station Warehouse")]);
	});

	it("follows changed elements", async () => {
		const { wrapper, setProps } = await mountButton();
		await open(wrapper);

		await setProps({ elements: [{ ticker: "RAT", value: 7 }] });

		expect(xitJSON().groups[0].materials).toEqual({ RAT: 7 });
		expect(tableRows()).toEqual([["RAT", "7"]]);
	});

	it("does not write typing into the generated JSON", async () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		onTestFinished(() => {
			warn.mockRestore();
		});
		const { wrapper } = await mountButton();
		await open(wrapper);

		await body().find(".n-drawer textarea").setValue("test-typing");

		// a write would fail: "computed value is readonly"
		expect(warn).not.toHaveBeenCalled();
	});

	it("copies the XIT JSON", async () => {
		const writeText = vi.fn(() => Promise.resolve());
		Object.defineProperty(navigator, "clipboard", {
			value: { writeText },
			configurable: true,
		});
		const { wrapper } = await mountButton();
		await open(wrapper);
		await selectOrigin(wrapper, "Antares Station Warehouse");

		await body()
			.findAll(".n-drawer button")
			.find((b) => b.text() === "xit.buttons.copy")!
			.trigger("click");

		expect(writeText).toHaveBeenCalledTimes(1);
		expect(JSON.parse(writeText.mock.calls[0][0])).toEqual(xitJSON());
		expect(trackEvent).toHaveBeenCalledWith("xit:transfer_copy");
		// @ts-expect-error jsdom has no clipboard, remove the stub again
		delete navigator.clipboard;
	});

	it("renders an empty transfer without elements", async () => {
		const { wrapper } = await mountButton({ elements: [] });
		await open(wrapper);

		expect(tableRows()).toEqual([]);
		expect(xitJSON().groups[0].materials).toEqual({});
	});
});
