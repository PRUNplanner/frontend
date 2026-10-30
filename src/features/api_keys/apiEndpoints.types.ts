export type APIEndpointParam =
	"empire" | "plan" | "cx" | "planet" | "ticker" | "exchange" | "days";
export type APIEndpointFormat = "csv" | "json";
export type APIEndpointGroup = "new" | "planning" | "public";
export type APISnippetKind = "url" | "sheets" | "curl" | "python";

export interface IAPIEndpoint {
	id: string;
	labelKey: string;
	descriptionKey: string;
	/** JSON path below API_BASE_URL, with {param} placeholders */
	path: string;
	/** the CSV variant, when the endpoint has one */
	csvPath?: string;
	needsKey: boolean;
	params: APIEndpointParam[];
	group: APIEndpointGroup;
	/** state-based endpoints: when PRUNplanner last calculated the empire */
	freshnessKey?: string;
}

export interface IAPISnippets {
	url: string;
	/** IMPORTDATA formula, CSV only */
	sheets: string | null;
	curl: string;
	python: string;
}
