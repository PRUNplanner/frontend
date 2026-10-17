<script setup lang="ts">
	// the update notice was put off with "Later": a quiet way back to it
	import { trackEvent } from "@/lib/analytics/useAnalytics";
	import { PButton } from "@/ui";

	function reload(): void {
		trackEvent("app:version_reload", { source: "chip" });
		location.reload();
	}
</script>

<template>
	<PButton size="sm" type="ghost" @click="reload">
		<span class="size-2 rounded-full bg-prunplanner" aria-hidden="true" />
		{{ $t("common.version_update.chip") }}
	</PButton>
</template>
