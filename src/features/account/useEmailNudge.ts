import {
	computed,
	type ComputedRef,
	type MaybeRefOrGetter,
	toValue,
} from "vue";

import { useI18n } from "vue-i18n";

// API
import { useQuery } from "@/lib/query_cache/useQuery";
import { isApiError } from "@/lib/apiError";

// Composables
import { trackEvent, reportError } from "@/lib/analytics/useAnalytics";

// Stores
import { useUserStore } from "@/stores/userStore";

// Types & Interfaces
import type {
	EmailNudgeAction,
	EmailNudgeState,
} from "@/features/account/useEmailNudge.types";
import type { UserPreference } from "@/features/api/schemas/user.schemas";

// UI
import { useToast } from "@/ui";

// "Not now" hides the banner this long
const SNOOZE_DAYS = 30;

// states whose banner was counted as shown in this visit (page load)
const shownStates = new Set<EmailNudgeState>();

type Dismissal = Pick<
	UserPreference,
	"emailNudgeDismissal" | "emailNudgeDismissedAt"
>;

/**
 * The email nudge: whether the Empire banner shows and what its buttons
 * do. Dismissals are preferences, so they hold on every device.
 *
 * @author jplacht
 *
 * @param {MaybeRefOrGetter<number>} planCount The user's plans
 */
export function useEmailNudge(planCount: MaybeRefOrGetter<number>) {
	const userStore = useUserStore();
	const toast = useToast();
	const { t } = useI18n();

	const state: ComputedRef<EmailNudgeState> = computed(() => {
		const profile = userStore.profile;
		if (!profile?.email) return "none";
		return profile.is_email_verified ? "ready" : "unconfirmed";
	});

	const show: ComputedRef<boolean> = computed(() => {
		const { emailNudgeDismissal, emailNudgeDismissedAt } =
			userStore.preferences;

		if (
			!userStore.isLoggedIn ||
			!userStore.profile ||
			!userStore.preferencesLoaded ||
			state.value === "ready" ||
			toValue(planCount) < 1 ||
			emailNudgeDismissal === "never"
		)
			return false;

		if (emailNudgeDismissal === "later" && emailNudgeDismissedAt) {
			const age = Date.now() - new Date(emailNudgeDismissedAt).getTime();
			if (age < SNOOZE_DAYS * 24 * 60 * 60 * 1000) return false;
		}
		return true;
	});

	// what undo() goes back to
	let previous: Dismissal | null = null;

	function trackAction(action: EmailNudgeAction): void {
		if (state.value === "ready") return;
		trackEvent("account:email_nudge_action", {
			action,
			state: state.value,
		});
	}

	function dismiss(value: "later" | "never"): void {
		previous = {
			emailNudgeDismissal: userStore.preferences.emailNudgeDismissal,
			emailNudgeDismissedAt: userStore.preferences.emailNudgeDismissedAt,
		};
		trackAction(value);
		userStore.setPreference("emailNudgeDismissal", value);
		userStore.setPreference(
			"emailNudgeDismissedAt",
			new Date().toISOString()
		);
	}

	function undo(): void {
		if (!previous) return;
		trackAction("undo");
		userStore.setPreference(
			"emailNudgeDismissal",
			previous.emailNudgeDismissal
		);
		userStore.setPreference(
			"emailNudgeDismissedAt",
			previous.emailNudgeDismissedAt
		);
		previous = null;
	}

	/**
	 * Sends a new verification code
	 *
	 * @returns {Promise<boolean>} Sent
	 */
	async function resend(): Promise<boolean> {
		trackEvent("account:email_verify_request");
		try {
			await useQuery("PostUserResendEmailVerification").execute();
			toast(t("account.email_nudge.code_sent"));
			return true;
		} catch (err) {
			reportError(err);
			toast(
				t(
					isApiError(err) && err.status === 429
						? "account.email_dialog.errors.throttled"
						: "account.email_dialog.errors.unknown"
				),
				{ type: "error" }
			);
			return false;
		}
	}

	/**
	 * Counts the banner as shown, once per visit and state
	 */
	function trackShown(): void {
		if (state.value === "ready" || shownStates.has(state.value)) return;
		shownStates.add(state.value);
		trackEvent("account:email_nudge_shown", { state: state.value });
	}

	return {
		state,
		show,
		trackShown,
		later: () => dismiss("later"),
		never: () => dismiss("never"),
		undo,
		resend,
		trackAction,
	};
}
