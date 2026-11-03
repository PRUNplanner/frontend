<script setup lang="ts">
	// every help markdown renders through here: showdown, then DOMPurify
	import { VueShowdown } from "vue-showdown";
	import { sanitizeExtension } from "@/features/help/sanitizeHelp";

	defineProps<{ markdown: string }>();
</script>

<template>
	<VueShowdown
		:markdown="markdown"
		flavor="github"
		:options="{ tables: true, emoji: true }"
		:extensions="[sanitizeExtension]" />
</template>
