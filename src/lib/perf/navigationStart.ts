// the hard load starts at 0 (performance.now's origin), every in-app
// navigation when the router begins it
let startedAt = 0;
let kind: "hard" | "spa" = "hard";
let first = true;

/** Called by the router's beforeEach for every navigation */
export function markNavigationStart(): void {
	if (first) {
		first = false;
		return;
	}
	startedAt = performance.now();
	kind = "spa";
}

/** performance.now() of the current navigation's start */
export function navigationStartedAt(): number {
	return startedAt;
}

/** whether the current page came from a hard load or in-app navigation */
export function navigationKind(): "hard" | "spa" {
	return kind;
}
