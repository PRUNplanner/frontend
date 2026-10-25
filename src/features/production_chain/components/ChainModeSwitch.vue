<script lang="ts">
	import type { LocationQuery } from "vue-router";

	type IMode = "plan" | "check";

	// each mode's last query, so switching back returns to it; module scope,
	// as each page mounts its own switch
	const last: Partial<Record<IMode, LocationQuery>> = {};
</script>

<script setup lang="ts">
	import { computed } from "vue";
	import { useRoute, useRouter } from "vue-router";
	import { useI18n } from "vue-i18n";

	// Composables
	import { trackEvent } from "@/lib/analytics/useAnalytics";

	// UI
	import { PSegmented } from "@/ui";

	const { t } = useI18n();

	const route = useRoute();
	const router = useRouter();

	const mode = computed<IMode>({
		get: () => (route.query.mode === "check" ? "check" : "plan"),
		set: (next) => {
			if (next === mode.value) return;
			last[mode.value] = route.query;
			if (next === "check")
				trackEvent("production_chain:action", { action: "mode_check" });
			router.replace({
				query: last[next] ?? (next === "check" ? { mode: "check" } : {}),
			});
		},
	});

	const options = computed(() => [
		{ value: "plan" as IMode, label: t("production_chains.check.mode.plan") },
		{ value: "check" as IMode, label: t("production_chains.check.mode.check") },
	]);
</script>

<template>
	<PSegmented
		v-model:value="mode"
		:options="options"
		:label="t('production_chains.check.mode.label')"
		data-testid="chain-mode" />
</template>
