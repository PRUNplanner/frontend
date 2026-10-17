<script setup lang="ts">
	import { computed } from "vue";

	// Composables
	import { useVersionCheck } from "@/lib/useVersionCheck";
	import { hasUnsavedChanges } from "@/lib/useUnsavedGuard";
	import { trackEvent } from "@/lib/analytics/useAnalytics";
	const { outdated, later } = useVersionCheck();

	// UI
	import { PButton, PIcon } from "@/ui";
	import { panelConfig } from "@/ui/styles";
	import { RefreshSharp, WarningAmberSharp } from "@vicons/material";

	// outdated wins: this tab can't load game data any more
	const body = computed(() =>
		outdated.value
			? "common.version_update.outdated_body"
			: hasUnsavedChanges()
				? "common.version_update.unsaved_body"
				: "common.version_update.ready_body"
	);

	function reload(): void {
		trackEvent("app:version_reload", { source: "notice" });
		location.reload();
	}

	function dismiss(): void {
		later();
		trackEvent("app:version_later");
	}
</script>

<template>
	<div
		:role="outdated ? 'alert' : 'status'"
		class="flex gap-3 w-[calc(100vw-2rem)] sm:w-96 p-3 text-sm border-l-4"
		:class="[
			panelConfig.panel,
			outdated ? 'border-l-warning' : 'border-l-prunplanner',
		]">
		<PIcon
			:size="20"
			:class="outdated ? 'text-warning' : 'text-prunplanner'">
			<WarningAmberSharp v-if="outdated" />
			<RefreshSharp v-else />
		</PIcon>
		<div class="grow">
			<p class="font-bold text-ink-strong">
				{{
					outdated
						? $t("common.version_update.outdated_title")
						: $t("common.version_update.ready_title")
				}}
			</p>
			<p class="pt-1">{{ $t(body) }}</p>
			<div class="flex gap-2 pt-3">
				<PButton @click="reload">
					{{ $t("common.version_update.reload") }}
				</PButton>
				<PButton v-if="!outdated" type="ghost" @click="dismiss">
					{{ $t("common.version_update.later") }}
				</PButton>
			</div>
		</div>
	</div>
</template>
