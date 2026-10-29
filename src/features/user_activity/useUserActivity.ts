import { ref } from "vue";
import { throttle } from "lodash-es";

/*
 * Hooks into user activity and keeps track of last action
 * Will be used to delay / skip actions if the user is inactive
 * and only has the browser tab open.
 */

export function useUserActivity(
	inactivityThreshold: number = 300_000, // 5 min
	maxDelay: number = 10_800_000 // 3 hours
) {
	const lastActivity = ref(Date.now());
	const lastForcedActivity = ref(Date.now());

	// mousemove/scroll fire often: once per 200 ms, at its end
	const updateLastActivity = throttle(
		() => (lastActivity.value = Date.now()),
		200,
		{ leading: false }
	);

	// events to track
	const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];

	events.forEach((event) =>
		window.addEventListener(event, updateLastActivity, { passive: true })
	);

	function updateForcedActivity() {
		lastForcedActivity.value = Date.now();
	}

	function shouldDelay(): boolean {
		// user active
		if (Date.now() - lastActivity.value < inactivityThreshold) {
			return false;
		}

		// max inactivity reached, reset + allow
		if (Date.now() - lastForcedActivity.value > maxDelay) {
			updateForcedActivity();
			return false;
		}

		return true;
	}

	return {
		lastActivity,
		lastForcedActivity,
		shouldDelay,
	};
}
