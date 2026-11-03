<script setup lang="ts">
	import { useUserStore } from "@/stores/userStore";

	/*
	 * AppSidebar's box until its chunk arrives, so the page beside it
	 * doesn't move when it does
	 */
	const userStore = useUserStore();
</script>

<template>
	<div
		class="h-screen sticky top-0 shrink-0 border-r border-line bg-gray-dark"
		:class="
			userStore.preferences.layoutNavigationStyle === 'full'
				? 'w-62'
				: 'w-16'
		" />
</template>
