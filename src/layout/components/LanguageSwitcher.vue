<script setup lang="ts">
	import { useUserStore } from "@/stores/userStore";
	const userStore = useUserStore();
</script>

<template>
	<div>Current: {{ userStore.currentLocale }}</div>
	<div>
		<div @click="userStore.setLocale('en-US')">EN</div>
		<div @click="userStore.setLocale('de-DE')">DE</div>
	</div>
</template>
