import { describe, it, expect, vi } from "vitest";
import { DOMWrapper, flushPromises, VueWrapper } from "@vue/test-utils";

import HelpDrawer from "@/features/help/components/HelpDrawer.vue";
import { NDrawer } from "naive-ui";
import { PButton } from "@/ui";
import { mountComponent } from "@/tests/mountComponent";

// single paragraph pages, their text renders as is
import hqEnglish from "@/assets/help/en_US/tools_hq_upgrade_calculator.md?raw";
import hqChinese from "@/assets/help/zh_CN/tools_hq_upgrade_calculator.md?raw";

const PAGE = "tools_hq_upgrade_calculator";

const body = () => new DOMWrapper(document.body);
const drawer = () => body().find(".n-drawer");
// the page is a lazy import, wait for it
const expectPage = (selector: string, text: string) =>
	vi.waitFor(() =>
		expect(drawer().find(`#markdown ${selector}`).text()).toBe(text)
	);
// the drawer slides out, its show state is final
const shown = (wrapper: VueWrapper) =>
	wrapper.findComponent(NDrawer).props("show");

async function toggle(wrapper: VueWrapper) {
	await wrapper.findComponent(PButton).trigger("click");
	await flushPromises();
}

/** the i18n instance is global, like the app's */
function setLocale(wrapper: VueWrapper, locale: string) {
	(wrapper.vm.$i18n as unknown as { locale: string }).locale = locale;
}

describe("HelpDrawer", () => {
	it("renders only the help button until opened", async () => {
		const { wrapper } = await mountComponent(HelpDrawer, {
			fileName: PAGE,
		});

		const button = wrapper.findComponent(PButton);
		expect(button.text()).toBe("common.buttons.help");
		expect(button.props("type")).toBe("secondary");
		expect(button.props("size")).toBe("md");
		expect(shown(wrapper)).toBe(false);
		expect(drawer().exists()).toBe(false);
	});

	it("passes the button and drawer options", async () => {
		const { wrapper } = await mountComponent(HelpDrawer, {
			fileName: PAGE,
			buttonTitle: "Open the manual",
			drawerTitle: "The manual",
			buttonSize: "sm",
			buttonClass: "w-full",
			drawerWidth: 800,
		});

		const button = wrapper.findComponent(PButton);
		expect(button.text()).toBe("Open the manual");
		expect(button.props("size")).toBe("sm");
		expect(button.classes()).toContain("w-full");
		expect(wrapper.findComponent(NDrawer).props("width")).toBe(800);

		await toggle(wrapper);
		expect(drawer().find(".n-drawer-header").text()).toBe("The manual");
	});

	it("opens the page of the file name", async () => {
		const { wrapper } = await mountComponent(HelpDrawer, {
			fileName: PAGE,
		});

		await toggle(wrapper);

		expect(shown(wrapper)).toBe(true);
		expect(wrapper.findComponent(NDrawer).props("width")).toBe(600);
		expect(drawer().find(".n-drawer-header").text()).toBe(
			"common.buttons.help"
		);
		await expectPage("p", hqEnglish.trim());
	});

	it("renders the markdown", async () => {
		const { wrapper } = await mountComponent(HelpDrawer, {
			fileName: "fio_burn",
		});

		await toggle(wrapper);

		// "# Calculations" is the first heading of the page
		await expectPage("h1", "Calculations");
	});

	it("closes on a second click and with the close button", async () => {
		const { wrapper } = await mountComponent(HelpDrawer, {
			fileName: PAGE,
		});

		await toggle(wrapper);
		await toggle(wrapper);
		expect(shown(wrapper)).toBe(false);

		await toggle(wrapper);
		expect(shown(wrapper)).toBe(true);
		await drawer().find(".n-base-close").trigger("click");
		await flushPromises();
		expect(shown(wrapper)).toBe(false);
	});

	it("opens the page of the current locale", async () => {
		const { wrapper } = await mountComponent(HelpDrawer, {
			fileName: PAGE,
		});
		setLocale(wrapper, "zh_CN");

		await toggle(wrapper);

		expect(hqChinese).not.toBe(hqEnglish);
		await expectPage("p", hqChinese.trim());
	});

	it("reloads the page on reopening after a locale change", async () => {
		const { wrapper } = await mountComponent(HelpDrawer, {
			fileName: PAGE,
		});

		await toggle(wrapper);
		await expectPage("p", hqEnglish.trim());
		await toggle(wrapper);

		setLocale(wrapper, "zh_CN");
		await toggle(wrapper);
		await expectPage("p", hqChinese.trim());
	});

	it("falls back to the english page", async () => {
		const { wrapper } = await mountComponent(HelpDrawer, {
			fileName: PAGE,
		});
		// no help folder for this locale
		setLocale(wrapper, "xx_XX");

		await toggle(wrapper);

		await expectPage("p", hqEnglish.trim());
	});
});
