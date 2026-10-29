import { ref, watch, type Ref } from "vue";

// Schemas
import {
	BaseROISettingsSchema,
	type BaseROISettings,
} from "@/features/base_roi/baseROI.schemas";

const STORAGE_KEY = "prunplanner_base_roi";

/** the defaults, a fresh object per call */
export function defaultBaseROISettings(): BaseROISettings {
	return BaseROISettingsSchema.parse({});
}

function readStored(): unknown {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		return raw === null ? undefined : JSON.parse(raw);
	} catch {
		// storage blocked or corrupt: defaults
		return {};
	}
}

/**
 * Base ROI settings in this browser, validated field by field. Not a
 * UserPreference, which would sync to the backend.
 * @author jplacht
 */
export function useBaseROISettings(): {
	settings: Ref<BaseROISettings>;
	hasStored: Ref<boolean>;
} {
	const stored = readStored();
	const parsed = BaseROISettingsSchema.safeParse(stored ?? {});
	const settings: Ref<BaseROISettings> = ref(
		parsed.success ? parsed.data : defaultBaseROISettings()
	);
	// nothing stored yet: the first visit, the setup dialog opens
	const hasStored = ref(stored !== undefined);

	watch(
		settings,
		(value) => {
			try {
				localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
				hasStored.value = true;
			} catch {
				// storage blocked or full: settings live for this page only
			}
		},
		{ deep: true }
	);

	return { settings, hasStored };
}
