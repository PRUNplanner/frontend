<script setup lang="ts">
	import { useI18n } from "vue-i18n";
	import { useHead } from "@unhead/vue";

	const { t } = useI18n();
	useHead({ title: t("common.not_found.title") });
</script>

<template>
	<div class="px-6 py-20 flex flex-col items-center gap-3 text-center">
		<h1 class="text-2xl font-bold text-white">
			{{ $t("common.not_found.title") }}
		</h1>
		<p class="text-muted">{{ $t("common.not_found.text") }}</p>
		<router-link to="/" class="text-link hover:underline">
			{{ $t("common.not_found.home") }}
		</router-link>
	</div>
</template>
