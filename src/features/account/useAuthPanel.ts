import { ref, type Ref } from "vue";

// Module state: the homepage header renders the panels, other components
// (the shared plan banner) open them.
const showLogin: Ref<boolean> = ref(false);
const showRegistration: Ref<boolean> = ref(false);

/**
 * Login and registration panels of the homepage header, at most one open.
 * @author jplacht
 */
export function useAuthPanel() {
	function toggleLogin(): void {
		showRegistration.value = false;
		showLogin.value = !showLogin.value;
	}

	function toggleRegistration(): void {
		showLogin.value = false;
		showRegistration.value = !showRegistration.value;
	}

	function close(): void {
		showLogin.value = false;
		showRegistration.value = false;
	}

	/**
	 * Opens a panel from further down the page and scrolls up to it.
	 *
	 * @param {"login" | "registration"} panel Panel to open
	 */
	function open(panel: "login" | "registration"): void {
		showLogin.value = panel === "login";
		showRegistration.value = panel === "registration";
		window.scrollTo({ top: 0, behavior: "smooth" });
	}

	return {
		showLogin,
		showRegistration,
		toggleLogin,
		toggleRegistration,
		open,
		close,
	};
}
