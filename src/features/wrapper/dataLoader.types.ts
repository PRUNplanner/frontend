export interface StepConfig<TData> {
	key: string;
	name: string;
	enabled: () => boolean;
	dependsOn?: string;
	load: () => Promise<TData>;
	onSuccess: (d: TData) => void;
}

export interface StepState<TData> {
	cfg: StepConfig<TData>;
	data: TData | null;
	loading: boolean;
	error: Error | null;
	triggered: boolean;
}
