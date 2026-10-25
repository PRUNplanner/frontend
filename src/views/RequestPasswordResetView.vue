<script setup lang="ts">
	import { useHead } from "@unhead/vue";

	useHead({
		title: "Password Reset",
	});

	import RequestPasswordReset from "@/features/account/components/RequestPasswordReset.vue";
</script>

<template>
	<!-- the auth panel's look, as a page -->
	<div class="mx-auto max-w-[480px] px-4 sm:px-6 py-10 sm:py-16">
		<RequestPasswordReset />
	</div>
</template>
