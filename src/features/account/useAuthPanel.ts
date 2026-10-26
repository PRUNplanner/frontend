import { ref, type Ref } from "vue";

// Composables
import { trackEvent } from "@/lib/analytics/useAnalytics";

// Types & Interfaces
import type { IAnalyticsEventProperties } from "@/lib/analytics/useAnalytics.types";

type AuthPanel = "login" | "registration";
type AuthPanelSource = IAnalyticsEventProperties["landing:auth_open"]["source"];

interface IAuthPanelOptions {
	/** Where a login from this panel leads */
	next?: string;
	/** The planet a plan is started on, named above the form */
	context?: { planet: string; id: string };
}

// Module state: the homepage header renders the panel, other components
// (the landing page, the shared plan banner, Planet Search) open it.
const showLogin: Ref<boolean> = ref(false);
const showRegistration: Ref<boolean> = ref(false);
const next: Ref<string | undefined> = ref(undefined);
const context: Ref<IAuthPanelOptions["context"]> = ref(undefined);

/**
 * Login and registration panel of the homepage header, one form at a time.
 * @author jplacht
 */
export function useAuthPanel() {
	function show(panel: AuthPanel | null): void {
		showLogin.value = panel === "login";
		showRegistration.value = panel === "registration";
	}

	function toggle(panel: AuthPanel, isOpen: boolean): void {
		if (isOpen) close();
		else open(panel, "header");
	}

	const toggleLogin = (): void => toggle("login", showLogin.value);
	const toggleRegistration = (): void =>
		toggle("registration", showRegistration.value);

	function close(): void {
		show(null);
		next.value = undefined;
		context.value = undefined;
	}

	/** The welcome state after a registration: on to the login form */
	function showLoginForm(): void {
		show("login");
	}

	/**
	 * Opens the panel on a form, where the page is: it slides in over it.
	 * `next` and `context` last until it closes, also across the switch.
	 *
	 * @param {AuthPanel} panel Form to show
	 * @param {AuthPanelSource} source Where the visitor opened it
	 * @param {IAuthPanelOptions} options Where a login leads, and why
	 */
	function open(
		panel: AuthPanel,
		source: AuthPanelSource,
		options: IAuthPanelOptions = {}
	): void {
		show(panel);
		next.value = options.next;
		context.value = options.context;
		trackEvent("landing:auth_open", { panel, source });
	}

	/**
	 * The switch inside the open panel
	 *
	 * @param {AuthPanel} panel Form switched to
	 */
	function switchTo(panel: AuthPanel): void {
		show(panel);
	}

	return {
		showLogin,
		showRegistration,
		next,
		context,
		toggleLogin,
		toggleRegistration,
		open,
		switchTo,
		showLoginForm,
		close,
	};
}
