import type { JSONValue } from "@/lib/query_cache/queryCache.types";

export interface StepConfig<TData> {
	key: string;
	name: string;
	enabled: () => boolean;
	dependsOn?: string;
	load: () => Promise<TData>;
	/** refreshed: reloaded after another tab changed it */
	onSuccess: (d: TData, refreshed?: boolean) => void;
	/** cache key; another tab changing data under it reloads the step */
	refreshKey?: () => JSONValue;
}

export interface StepState<TData> {
	cfg: StepConfig<TData>;
	data: TData | null;
	loading: boolean;
	error: Error | null;
	triggered: boolean;
}
