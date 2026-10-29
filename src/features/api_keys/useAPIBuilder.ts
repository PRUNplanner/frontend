import { computed, reactive, ref, watch } from "vue";

import config from "@/lib/config";
import {
	API_ENDPOINTS,
	endpointFormats,
	resolvePath,
} from "@/features/api_keys/apiEndpoints";

// Types & Interfaces
import type {
	APIEndpointFormat,
	APIEndpointParam,
	IAPIEndpoint,
	IAPISnippets,
} from "@/features/api_keys/apiEndpoints.types";

export const API_KEY_PLACEHOLDER = "<YOUR_KEY>";

/**
 * The snippets for one endpoint, format and set of picked values
 *
 * @author jplacht
 *
 * @param {IAPIEndpoint} endpoint Endpoint
 * @param {APIEndpointFormat} format Picked format
 * @param {Partial<Record<APIEndpointParam, string | null>>} values Picked values
 * @param {string | null} key Key created on this visit, else the placeholder
 * @returns {IAPISnippets | null} null while a value is missing
 */
export function buildSnippets(
	endpoint: IAPIEndpoint,
	format: APIEndpointFormat,
	values: Partial<Record<APIEndpointParam, string | null>>,
	key: string | null
): IAPISnippets | null {
	const csvPath = endpoint.csvPath ?? null;
	const path = resolvePath(
		format === "csv" && csvPath ? csvPath : endpoint.path,
		values
	);
	// Python reads the CSV variant whenever there is one
	const pythonPath = resolvePath(csvPath ?? endpoint.path, values);
	if (path === null || pythonPath === null) return null;

	const apiKey = key ?? API_KEY_PLACEHOLDER;
	const base = config.API_BASE_URL.replace(/\/+$/, "");
	const plainUrl = `${base}/${path}`;
	const url = endpoint.needsKey ? `${plainUrl}?api_key=${apiKey}` : plainUrl;
	const header = `Authorization: Api-Key ${apiKey}`;

	const curl = endpoint.needsKey
		? `curl -H "${header}" "${plainUrl}"`
		: `curl "${plainUrl}"`;

	const request = endpoint.needsKey
		? [
				"response = requests.get(",
				`    "${base}/${pythonPath}",`,
				`    headers={"Authorization": "Api-Key ${apiKey}"},`,
				")",
			]
		: [`response = requests.get("${base}/${pythonPath}")`];

	const python = (
		csvPath
			? [
					"import csv",
					"import io",
					"",
					"import requests",
					"",
					...request,
					"response.raise_for_status()",
					"",
					"for row in csv.DictReader(io.StringIO(response.text)):",
					"    print(row)",
				]
			: [
					"import requests",
					"",
					...request,
					"response.raise_for_status()",
					"",
					"print(response.json())",
				]
	).join("\n");

	return {
		url,
		sheets: format === "csv" ? `=IMPORTDATA("${url}")` : null,
		curl,
		python,
	};
}

/**
 * State of the API Keys page's URL builder. The key lives only in the
 * caller's memory: never persisted, cached or tracked.
 *
 * @author jplacht
 *
 * @param {() => string | null} key The key created on this visit
 */
export function useAPIBuilder(key: () => string | null) {
	const endpointId = ref<string>(API_ENDPOINTS[0].id);
	const endpoint = computed<IAPIEndpoint>(
		() =>
			API_ENDPOINTS.find((e) => e.id === endpointId.value) ??
			API_ENDPOINTS[0]
	);
	const formats = computed<APIEndpointFormat[]>(() =>
		endpointFormats(endpoint.value)
	);
	const format = ref<APIEndpointFormat>(formats.value[0]);

	// CSV again whenever the endpoint has it
	watch(endpointId, () => (format.value = formats.value[0]));

	const values = reactive<Partial<Record<APIEndpointParam, string | null>>>(
		{ exchange: "AI1", days: "7" }
	);

	const snippets = computed<IAPISnippets | null>(() =>
		buildSnippets(endpoint.value, format.value, values, key())
	);

	return { endpointId, endpoint, formats, format, values, snippets };
}
