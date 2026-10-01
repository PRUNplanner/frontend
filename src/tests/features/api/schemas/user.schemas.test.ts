import { describe, it, expect } from "vitest";

import { UserProfileSchema } from "@/features/api/schemas/user.schemas";

const base = {
	id: 1,
	username: "test",
	email: null,
	is_email_verified: true,
	fio_apikey: "key",
	prun_username: "PRUN",
};

describe("UserProfileSchema", () => {
	it("takes the FIO status and the last refresh", () => {
		const parsed = UserProfileSchema.parse({
			...base,
			fio_status: "no_data",
			fio_last_refreshed_at: "2026-10-01T12:00:00Z",
		});

		expect(parsed.fio_status).toBe("no_data");
		expect(parsed.fio_last_refreshed_at).toBe("2026-10-01T12:00:00Z");
	});

	it("allows no refresh yet", () => {
		expect(
			UserProfileSchema.parse({
				...base,
				fio_status: "syncing",
				fio_last_refreshed_at: null,
			}).fio_last_refreshed_at
		).toBeNull();
	});

	it("rejects an unknown status", () => {
		expect(
			UserProfileSchema.safeParse({
				...base,
				fio_status: "broken",
				fio_last_refreshed_at: null,
			}).success
		).toBe(false);
	});
});
