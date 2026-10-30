import { shallowReactive } from "vue";

// Types & Interfaces
import type {
	StepConfig,
	StepState,
} from "@/features/wrapper/dataLoader.types";

/**
 * A loader step's state. Shallow: its fields are tracked, its data stays
 * the raw object the query cache holds, not a deep proxy of it.
 *
 * @param {StepConfig<TData>} cfg Step config
 * @returns {StepState<TData>} Step state
 */
export function step<TData>(cfg: StepConfig<TData>): StepState<TData> {
	return shallowReactive({
		cfg,
		data: null,
		loading: false,
		error: null,
		triggered: false,
	});
}
