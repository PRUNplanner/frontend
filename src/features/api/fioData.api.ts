import axios, { AxiosInstance } from "axios";

// config
import config from "@/lib/config";

// schemas
import { FIOPlanetFeeSchema } from "@/features/api/schemas/fioData.schemas";

// types
import { IFIOProductionFeeTable } from "@/features/api/fioData.types";

// Own instance: the PRUNplanner auth interceptors and no-cache headers
// on the global axios instance must not apply to the third-party FIO
// API. The inherited no-cache headers are not CORS-safelisted and FIO
// rejects their preflight, so reset the inherited header buckets.
const fioClient: AxiosInstance = axios.create({
	baseURL: config.FIO_BASE_URL,
	timeout: 15_000,
});
fioClient.defaults.headers.get = {};
fioClient.defaults.headers.common = {};

/**
 * Calls the FIO /planet/{planetNaturalId} endpoint and extracts the
 * government-set production fee data
 * @author raukk
 *
 * @export
 * @async
 * @param {string} planetNaturalId Planet Natural Id ('OT-580b')
 * @returns {Promise<IFIOProductionFeeTable>} Planet Production Fees
 */
export async function callFIOPlanetFees(
	planetNaturalId: string
): Promise<IFIOProductionFeeTable> {
	const { data } = await fioClient.get(`/planet/${planetNaturalId}`);
	return FIOPlanetFeeSchema.parse(data);
}
