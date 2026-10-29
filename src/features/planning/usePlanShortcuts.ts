import { type ComputedRef, onMounted, onUnmounted, ref, type Ref } from "vue";

// Stores
import { useUserStore } from "@/stores/userStore";

// Composables
import { trackEvent } from "@/lib/analytics/useAnalytics";
import { calcDebug } from "@/lib/debugMode";

// Types & Interfaces
import type {
	IPlanCalculation,
	IPlanViewProps,
} from "@/features/planning/planView.types";

/**
 * Whether a key press goes to a text field, which keeps its own undo
 *
 * @param {EventTarget | null} target Event target
 * @returns {boolean} Text field or editable
 */
function isTextField(target: EventTarget | null): boolean {
	return (
		target instanceof HTMLElement &&
		(target.isContentEditable ||
			["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
	);
}

/**
 * Plan keyboard shortcuts and tracked undo / redo: Ctrl/Cmd+S saves,
 * Ctrl/Cmd+Z undoes, +Shift redoes, Ctrl/Cmd+` opens calculation debug
 * @author jplacht
 *
 * @param {IPlanCalculation} calculation The plan's calculation (history)
 * @param {IPlanViewProps} props The view's props
 * @param {{ canSave: ComputedRef<boolean>; save: (trigger: "shortcut") => void; openSaveAsModal: () => void }} saving Save actions
 */
export function usePlanShortcuts(
	calculation: IPlanCalculation,
	props: IPlanViewProps,
	saving: {
		canSave: ComputedRef<boolean>;
		save: (trigger: "shortcut") => unknown;
		openSaveAsModal: () => void;
	}
) {
	const userStore = useUserStore();
	const { canUndo, canRedo, undo, redo } = calculation;

	/*
	 * Calculation debug (English only by decision): the panel is mounted
	 * only while open, so nothing is traced when it's closed
	 */
	const refShowCalcDebug: Ref<boolean> = ref(false);
	function toggleCalcDebug(source: "button" | "shortcut"): void {
		refShowCalcDebug.value = !refShowCalcDebug.value;
		if (refShowCalcDebug.value) trackEvent("debug:calc_open", { source });
	}

	function trackedUndo(trigger: "button" | "shortcut"): void {
		if (canUndo.value) trackEvent("plan:undo", { trigger });
		undo();
	}

	function trackedRedo(trigger: "button" | "shortcut"): void {
		if (canRedo.value) trackEvent("plan:redo", { trigger });
		redo();
	}

	function onKeydown(e: KeyboardEvent): void {
		if (!(e.ctrlKey || e.metaKey)) return;
		const key: string = e.key.toLowerCase();

		if (
			e.code === "Backquote" &&
			calcDebug.value &&
			!isTextField(e.target)
		) {
			e.preventDefault();
			toggleCalcDebug("shortcut");
		} else if (key === "s") {
			// never open the browser's save dialog on the plan page
			e.preventDefault();
			if (props.shared) {
				if (userStore.isLoggedIn) saving.openSaveAsModal();
			} else if (saving.canSave.value) saving.save("shortcut");
		} else if (key === "z" && !props.disabled && !isTextField(e.target)) {
			e.preventDefault();
			if (e.shiftKey) trackedRedo("shortcut");
			else trackedUndo("shortcut");
		}
	}

	onMounted(() => window.addEventListener("keydown", onKeydown));
	onUnmounted(() => window.removeEventListener("keydown", onKeydown));

	return { refShowCalcDebug, toggleCalcDebug, trackedUndo, trackedRedo };
}
