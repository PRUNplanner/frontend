import type { JSONValue } from "@/lib/query_cache/queryCache.types";

export interface StepConfig<TData> {
	name: string;
	enabled: () => boolean;
	/** false: wait, e.g. for another step's data */
	ready?: () => boolean;
	load: () => Promise<TData>;
	/**
	 * refreshed: reloaded after another tab changed it. A method, so a step
	 * of any data type fits a StepState<unknown> list.
	 */
	onSuccess(d: TData, refreshed?: boolean): void;
	/** cache key; another tab changing data under it reloads the step */
	refreshKey?: () => JSONValue;
}

export interface StepState<TData> {
	cfg: StepConfig<TData>;
	/** the query cache's own object: read only, copy before editing */
	data: TData | null;
	loading: boolean;
	error: Error | null;
	triggered: boolean;
}
