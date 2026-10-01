import config from "@/lib/config";

export interface IClientErrorReport {
	kind: "validation" | "server" | "network";
	method: string;
	path_template: string;
	status?: number;
	failed_request_id?: string;
	issues?: string[];
	client_ms?: number;
}

const DEDUPE_MS = 60_000;
const MAX_REPORTS = 20;

// last send per kind + path + issues, and the reports sent in this tab
const lastSent = new Map<string, number>();
let sent = 0;
let routeName: string | undefined;

/**
 * Route the next reports are sent from, set by the router
 *
 * @param {string | undefined} name Route name
 */
export function setClientErrorRoute(name: string | undefined): void {
	routeName = name;
}

/**
 * Reports an API error to the backend, which logs it to Axiom. Sent
 * whether or not the user consented to analytics, with plain fetch and
 * no token: never through apiService, so a failing report can't report
 * itself. Fire and forget, errors are swallowed.
 *
 * @param {IClientErrorReport} report Error report
 */
export function reportClientError(report: IClientErrorReport): void {
	const key = [report.kind, report.path_template, report.issues].join("|");
	const now = Date.now();
	if (sent >= MAX_REPORTS || now - (lastSent.get(key) ?? -Infinity) < DEDUPE_MS)
		return;
	lastSent.set(key, now);
	sent++;

	try {
		fetch(`${config.API_BASE_URL}/client-errors/`, {
			method: "POST",
			keepalive: true,
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				...report,
				// the backend's bounds
				issues: report.issues
					?.slice(0, 20)
					.map((issue) => issue.slice(0, 200)),
				release: __APP_VERSION__,
				route_name: routeName?.slice(0, 80),
			}),
		}).catch(() => {});
	} catch {
		// fetch unavailable, nothing to report to
	}
}
