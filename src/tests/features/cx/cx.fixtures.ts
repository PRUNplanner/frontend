// Types & Interfaces
import type { CX, CXData } from "@/features/api/schemas/cxData.schemas";
import type { UserProfile } from "@/features/api/schemas/user.schemas";

/** An exchange preference, without any rules unless `cx_data` sets them */
export function cxFixture({
	uuid,
	name,
	cx_data = {},
	empires = [],
	modified_at = "2026-01-01T00:00:00Z",
}: {
	uuid: string;
	name: string;
	cx_data?: Partial<CXData>;
	empires?: CX["empires"];
	modified_at?: string;
}): CX {
	return {
		uuid,
		cx_name: name,
		empires,
		modified_at,
		cx_data: {
			cx_empire: [],
			cx_planets: [],
			ticker_empire: [],
			ticker_planets: [],
			...cx_data,
		},
	};
}

/** The parts of a profile the FIO storage lookup reads */
export const fioProfile = () =>
	({ fio_apikey: "key", prun_username: "user" }) as UserProfile;
