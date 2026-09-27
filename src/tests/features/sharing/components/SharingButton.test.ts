import {
	describe,
	it,
	expect,
	beforeAll,
	beforeEach,
	afterEach,
	vi,
} from "vitest";
import { DOMWrapper, flushPromises, type VueWrapper } from "@vue/test-utils";
import { createPinia, type Pinia } from "pinia";
import AxiosMockAdapter from "axios-mock-adapter";

import { apiService } from "@/lib/apiService";
import axiosSetup from "@/util/axiosSetup";
import { trackEvent } from "@/lib/analytics/useAnalytics";
import { usePlanningStore } from "@/stores/planningStore";
import SharingButton from "@/features/sharing/components/SharingButton.vue";
import { NModal } from "naive-ui";
import { PButton } from "@/ui";
import { mountComponent } from "@/tests/mountComponent";

vi.mock("@/lib/analytics/useAnalytics", () => ({ trackEvent: vi.fn() }));

const mock = new AxiosMockAdapter(apiService.client);

// payloads are validated as uuids
const PLAN = "00000001-0000-4000-8000-000000000000";
const SHARE = "00000002-0000-4000-8000-000000000000";
const OTHER_PLAN = "00000003-0000-4000-8000-000000000000";
const OTHER_SHARE = "00000004-0000-4000-8000-000000000000";
const SHARE_URL = `https://prunplanner.org/shared/${SHARE}`;

const LIST_URL = /planning\/shared\/$/;
const DELETE_URL = new RegExp(`planning/shared/${SHARE}/$`);

const shared = (plan: string, uuid: string, view_count: number) => ({
	uuid,
	plan,
	view_count,
	created_at: "2026-02-09T12:07:21.068265Z",
});

function seedShared(pinia: Pinia, viewCount = 318) {
	usePlanningStore(pinia).setSharedList([
		// @ts-expect-error fixture date as string
		shared(PLAN, SHARE, viewCount),
		// @ts-expect-error fixture date as string
		shared(OTHER_PLAN, OTHER_SHARE, 5),
	]);
}

async function mountButton(
	props: Record<string, unknown> = {},
	isShared = false
) {
	const pinia = createPinia();
	if (isShared) seedShared(pinia);
	return mountComponent(
		SharingButton,
		{ planUuid: PLAN, ...props },
		{ pinia }
	);
}

const body = () => new DOMWrapper(document.body);
const modal = () => body().find(".n-modal");
// the modal fades out, its show state is final
const shown = (wrapper: VueWrapper) =>
	wrapper.findComponent(NModal).props("show");

/** the button opening the modal is the last PButton, outside the modal */
const toggle = (wrapper: VueWrapper) =>
	wrapper.findAllComponents(PButton).at(-1)!;

function modalButton(text: string) {
	const b = modal()
		.findAll("button")
		.find((b) => b.text() === text);
	expect(b).toBeDefined();
	return b!;
}

async function open(wrapper: VueWrapper) {
	await toggle(wrapper).trigger("click");
	await flushPromises();
}

const tracked = () => vi.mocked(trackEvent).mock.calls.map(([e]) => e);

describe("SharingButton", () => {
	beforeAll(() => {
		axiosSetup();
	});

	beforeEach(() => {
		mock.reset();
		vi.mocked(trackEvent).mockClear();
	});

	afterEach(() => {
		// @ts-expect-error jsdom has no clipboard, remove the stub again
		delete navigator.clipboard;
	});

	it("offers to share an unshared plan", async () => {
		const { wrapper } = await mountButton();

		expect(toggle(wrapper).props("type")).toBe("primary");
		expect(toggle(wrapper).text()).toBe("sharing.buttons.share");
		expect(shown(wrapper)).toBe(false);
	});

	it("shows the views of a shared plan", async () => {
		const { wrapper } = await mountButton({}, true);

		expect(toggle(wrapper).props("type")).toBe("success");
		// the count is an i18n parameter, without messages only the key renders
		expect(toggle(wrapper).text()).toBe("sharing.buttons.views");
	});

	it("shows only the view count on a small button", async () => {
		const shared = await mountButton({ buttonSize: "sm" }, true);
		expect(shared.wrapper.text()).toBe("318");
		expect(toggle(shared.wrapper).props("size")).toBe("sm");

		// unshared, a small button is icon only
		const unshared = await mountButton({ buttonSize: "sm" });
		expect(toggle(unshared.wrapper).text()).toBe("");
	});

	it("shows zero views of a plan shared without views", async () => {
		const pinia = createPinia();
		seedShared(pinia, 0);
		const { wrapper } = await mountComponent(
			SharingButton,
			{ planUuid: PLAN, buttonSize: "sm" },
			{ pinia }
		);

		expect(toggle(wrapper).props("type")).toBe("success");
		expect(wrapper.text()).toBe("0");
	});

	it("toggles the modal", async () => {
		const { wrapper } = await mountButton();

		await open(wrapper);
		expect(modal().find(".n-card-header").text()).toBe("sharing.title");
		expect(modal().text()).toContain("sharing.info");
		expect(modal().text()).toContain("sharing.buttons.create_link");

		await open(wrapper);
		expect(shown(wrapper)).toBe(false);
	});

	it("lists the share url of a shared plan", async () => {
		const { wrapper } = await mountButton({}, true);
		await open(wrapper);

		expect(modal().find(".font-mono").text()).toBe(SHARE_URL);
		expect(modal().text()).toContain("sharing.share_count");
		expect(modal().text()).not.toContain("sharing.info");
		expect(modal().text()).not.toContain("sharing.buttons.create_link");
	});

	it("loads the shared list on mount only when asked", async () => {
		mock.onGet(LIST_URL).reply(200, [shared(PLAN, SHARE, 7)]);

		const { wrapper } = await mountButton();
		expect(mock.history.get).toHaveLength(0);
		expect(toggle(wrapper).props("type")).toBe("primary");

		const loaded = await mountButton({ load: true });
		expect(mock.history.get).toHaveLength(1);
		// the backend knows this plan is shared, with 7 views
		expect(toggle(loaded.wrapper).props("type")).toBe("success");
	});

	it("creates a share and shows its url", async () => {
		let answer!: () => void;
		mock.onPost(LIST_URL).reply(
			() =>
				new Promise((r) => {
					answer = () =>
						r([
							200,
							{
								uuid: SHARE,
								view_count: 0,
								created_at: "2026-02-09T12:07:21Z",
							},
						]);
				})
		);
		mock.onGet(LIST_URL).reply(200, [shared(PLAN, SHARE, 0)]);
		const { wrapper } = await mountButton();
		await open(wrapper);

		await modalButton("sharing.buttons.create_link").trigger("click");
		await flushPromises();
		expect(
			modalButton("sharing.buttons.create_link").attributes("aria-busy")
		).toBe("true");
		expect(tracked()).toEqual([]);

		answer();
		await flushPromises();

		expect(JSON.parse(mock.history.post[0].data)).toEqual({ plan: PLAN });
		// the list is reloaded after creating
		expect(mock.history.get).toHaveLength(1);
		expect(tracked()).toEqual(["plan_share_create"]);
		expect(modal().find(".font-mono").text()).toBe(SHARE_URL);
		expect(toggle(wrapper).props("type")).toBe("success");
	});

	it("leaves no spinner behind when sharing again", async () => {
		mock.onPost(LIST_URL).reply(200, {
			uuid: SHARE,
			view_count: 0,
			created_at: "2026-02-09T12:07:21Z",
		});
		mock.onDelete(DELETE_URL).reply(204);
		// shared after the create, unshared after the delete
		mock.onGet(LIST_URL).replyOnce(200, [shared(PLAN, SHARE, 0)]);
		mock.onGet(LIST_URL).replyOnce(200, []);
		mock.onGet(LIST_URL).replyOnce(200, [shared(PLAN, SHARE, 0)]);
		const { wrapper } = await mountButton();
		const busy = (text: string) =>
			modalButton(text).attributes("aria-busy");

		await open(wrapper);
		await modalButton("sharing.buttons.create_link").trigger("click");
		await flushPromises();
		await modalButton("sharing.buttons.stop_sharing").trigger("click");
		await flushPromises();
		expect(shown(wrapper)).toBe(false);

		await open(wrapper);
		expect(busy("sharing.buttons.create_link")).toBe("false");
		await modalButton("sharing.buttons.create_link").trigger("click");
		await flushPromises();
		expect(busy("sharing.buttons.stop_sharing")).toBe("false");
		expect(mock.history.get).toHaveLength(3);
	});

	it("copies the share url", async () => {
		const writeText = vi.fn(() => Promise.resolve());
		Object.defineProperty(navigator, "clipboard", {
			value: { writeText },
			configurable: true,
		});
		const { wrapper } = await mountButton({}, true);
		await open(wrapper);

		await modalButton("sharing.buttons.copy_url").trigger("click");

		expect(writeText).toHaveBeenCalledWith(SHARE_URL);
	});

	it("stops sharing and closes the modal", async () => {
		let answer!: () => void;
		mock.onDelete(DELETE_URL).reply(
			() => new Promise((r) => (answer = () => r([204])))
		);
		// the backend no longer lists this plan
		mock.onGet(LIST_URL).reply(200, [shared(OTHER_PLAN, OTHER_SHARE, 5)]);
		const { wrapper } = await mountButton({}, true);
		await open(wrapper);

		await modalButton("sharing.buttons.stop_sharing").trigger("click");
		await flushPromises();
		expect(
			modalButton("sharing.buttons.stop_sharing").attributes("aria-busy")
		).toBe("true");
		expect(shown(wrapper)).toBe(true);

		answer();
		await flushPromises();

		expect(mock.history.delete).toHaveLength(1);
		expect(mock.history.get).toHaveLength(1);
		expect(tracked()).toEqual(["plan_share_delete"]);
		expect(shown(wrapper)).toBe(false);
		expect(toggle(wrapper).props("type")).toBe("primary");
		expect(toggle(wrapper).text()).toBe("sharing.buttons.share");
	});

	it("stops the create spinner when sharing fails", async () => {
		mock.onPost(LIST_URL).reply(500);
		const error = vi.spyOn(console, "error").mockImplementation(() => {});
		const { wrapper } = await mountButton();
		await open(wrapper);

		await modalButton("sharing.buttons.create_link").trigger("click");
		await flushPromises();

		expect(mock.history.post).toHaveLength(1);
		expect(
			modalButton("sharing.buttons.create_link").attributes("aria-busy")
		).toBe("false");
		expect(tracked()).toEqual([]);
		expect(toggle(wrapper).props("type")).toBe("primary");
		expect(error).toHaveBeenCalled();
		error.mockRestore();
	});

	it("keeps the modal open when stopping fails", async () => {
		mock.onDelete(DELETE_URL).reply(500);
		const error = vi.spyOn(console, "error").mockImplementation(() => {});
		const { wrapper } = await mountButton({}, true);
		await open(wrapper);

		await modalButton("sharing.buttons.stop_sharing").trigger("click");
		await flushPromises();

		expect(mock.history.delete).toHaveLength(1);
		expect(
			modalButton("sharing.buttons.stop_sharing").attributes("aria-busy")
		).toBe("false");
		expect(shown(wrapper)).toBe(true);
		expect(tracked()).toEqual([]);
		expect(toggle(wrapper).props("type")).toBe("success");
		expect(error).toHaveBeenCalled();
		error.mockRestore();
	});
});
