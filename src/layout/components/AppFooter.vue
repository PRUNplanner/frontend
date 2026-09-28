<script setup lang="ts">
	import { usePreferences } from "@/features/preferences/usePreferences";
	const { locale } = usePreferences();
	import { SupportedLanguages } from "@/lib/i18n";

	// UI
	import PSelect from "@/ui/components/PSelect.vue";
</script>

<template>
	<footer
		class="sticky top-[100vh] pr-3 py-1 text-muted text-xs text-end flex flex-row gap-1.5 justify-end items-center">
		<router-link :to="'/imprint-tos'" class="hover:cursor-pointer">
			Imprint & Terms of Service
		</router-link>
		<div>
			<a
				href="https://crowdin.com/project/prunplanner"
				target="_blank"
				class="text-prunplanner hover:underline"
				>Translate?</a
			>
		</div>
		<div>
			<PSelect v-model:value="locale" :options="SupportedLanguages" />
		</div>
	</footer>
</template>
