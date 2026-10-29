/**
 * Points to the changelog once per browser after a release bump; the very
 * first visit only remembers the release.
 */

import { trackEvent } from "@/lib/analytics/useAnalytics";
import { i18n } from "@/lib/i18n";
import { toast } from "@/ui/useToast";
import { readStorage, writeStorage } from "@/lib/storage";

const KEY = "prunplanner_seen_release";

export function announceRelease(openChangelog: () => void): void {
	const seen = readStorage(KEY);
	writeStorage(KEY, __APP_VERSION__);
	if (seen === null || seen === __APP_VERSION__) return;

	const { t } = i18n.global;
	toast(
		t("common.version_update.whats_new_title", {
			version: __APP_VERSION__,
		}),
		{
			duration: 10_000,
			action: {
				label: t("common.version_update.whats_new_action"),
				onClick: () => {
					trackEvent("app:whats_new_click");
					openChangelog();
				},
			},
		}
	);
}
