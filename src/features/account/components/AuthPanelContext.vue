<script setup lang="ts">
	// Composables
	import { useAuthPanel } from "@/features/account/useAuthPanel";

	// UI
	import PNotice from "@/ui/components/PNotice.vue";

	/**
	 * Why the panel was opened, above its forms: the planet a plan is
	 * started on, where the login leads.
	 *
	 * @author jplacht
	 */
	const { context } = useAuthPanel();
</script>

<template>
	<PNotice v-if="context" class="mb-6 text-sm">
		<i18n-t keypath="homepage.auth_panel.plan_context" tag="span">
			<template #planet>
				<b class="text-white">{{ context.planet }}</b>
			</template>
			<template #id>{{ context.id }}</template>
			<template #name>{{ context.planet }}</template>
		</i18n-t>
	</PNotice>
</template>
