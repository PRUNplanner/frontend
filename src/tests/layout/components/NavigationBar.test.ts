import { describe, it, expect, beforeEach, vi } from "vitest";
import { flushPromises, RouterLinkStub } from "@vue/test-utils";
import { createPinia, type Pinia, setActivePinia } from "pinia";

import { useUserStore } from "@/stores/userStore";
import NavigationBar from "@/layout/components/NavigationBar.vue";
import PTag from "@/ui/components/PTag.vue";
import { mountComponent } from "@/tests/mountComponent";

// Types & Interfaces
import type {
	FIOStatus,
	UserProfile,
} from "@/features/api/schemas/user.schemas";

vi.mock("@/router", () => ({ default: { push: vi.fn() } }));
const execute = vi.fn();
vi.mock("@/lib/query_cache/useQuery", () => ({
	useQuery: () => ({ execute }),
}));

const FIO = "common.navigation.fio";

function profile(fio_status: FIOStatus): UserProfile {
	return {
		id: 1,
		username: "test-user",
		email: null,
		is_email_verified: true,
		fio_apikey: fio_status === "none" ? null : "key",
		prun_username: fio_status === "none" ? null : "PRUN",
		fio_status,
		fio_last_refreshed_at: null,
	};
}

let pinia: Pinia;

async function fioTag(status: FIOStatus) {
	useUserStore().profile = profile(status);
	const { wrapper } = await mountComponent(NavigationBar, {}, { pinia });
	const tag = wrapper.findAllComponents(PTag).at(-1)!;
	const link = wrapper
		.findAllComponents(RouterLinkStub)
		.find((l) => l.findComponent(PTag).exists());
	return { text: tag.text(), type: tag.props("type"), link: link?.props("to") };
}

describe("NavigationBar FIO tag", () => {
	beforeEach(() => {
		pinia = createPinia();
		setActivePinia(pinia);
		execute.mockReset().mockResolvedValue(undefined);
	});

	it("handles the storage 404 of a failing user without FIO data", async () => {
		const notFound = Promise.reject(
			Object.assign(new Error("No storage data available."), {
				status: 404,
			})
		);
		const handled = vi.spyOn(notFound, "catch");
		execute.mockReturnValue(notFound);

		expect((await fioTag("error")).text).toBe(`${FIO}.fio_inactive`);
		expect(execute).toHaveBeenCalledOnce();
		// an unhandled rejection doesn't fail this run, so check it is caught
		expect(handled).toHaveBeenCalledOnce();
	});

	it.each([
		["none", `${FIO}.fio_inactive`, "warning"],
		["error", `${FIO}.fio_inactive`, "warning"],
		["syncing", `${FIO}.fio_syncing`, "secondary"],
		["no_data", `${FIO}.fio_no_data`, "warning"],
		["invalid_credentials", `${FIO}.fio_rejected`, "error"],
	] as const)("%s links to the profile", async (status, text, type) => {
		expect(await fioTag(status)).toEqual({ text, type, link: "/profile" });
	});

	it.each(["syncing", "no_data", "invalid_credentials"] as const)(
		"does not ask for storage while %s",
		async (status) => {
			await fioTag(status);
			expect(execute).not.toHaveBeenCalled();
		}
	);

	it("loads the storage once the first refresh is done", async () => {
		await fioTag("syncing");

		useUserStore().profile = profile("ok");
		await flushPromises();

		expect(execute).toHaveBeenCalledOnce();
	});

	it("ok shows FIO as active, without a link", async () => {
		expect(await fioTag("ok")).toEqual({
			text: `${FIO}.fio_active`,
			type: "success",
			link: undefined,
		});
	});
});
