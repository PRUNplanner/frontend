/**
 * Resolves once the page has loaded and the browser is idle: for work that
 * must not compete with the first paint and its LCP (posthog-js, the login
 * forms of a visitor's header)
 */
export function afterLoad(): Promise<void> {
	return new Promise((resolve) => {
		const idle = () =>
			typeof requestIdleCallback === "function"
				? requestIdleCallback(() => resolve(), { timeout: 3000 })
				: setTimeout(resolve);
		if (document.readyState === "complete") idle();
		else window.addEventListener("load", idle, { once: true });
	});
}
