<script setup lang="ts">
	import { usePreferences } from "@/features/preferences/usePreferences";
	const { locale } = usePreferences();
	import { SupportedLanguages } from "@/lib/i18n";

	// UI
	import PSelect from "@/ui/components/PSelect.vue";
</script>

<template>
	<div
		class="border border-dashed border-prunplanner/50 py-3 px-2 flex flex-row items-center gap-6 divide-x divide-prunplanner/50 divide-dashed">
		<p class="flex-grow px-3">
			Thanks to the incredible efforts of the PRUNplanner community, our
			planning tools and features are accessible globally. The platform
			natively supports
			<strong>
				{{ SupportedLanguages.map((e) => e.label).join(", ") }} </strong
			>. Want to see PRUNplanner in your language? Join our translation
			project on
			<a
				href="https://crowdin.com/project/prunplanner"
				target="_blank"
				class="underline hover:text-prunplanner">
				Crowdin</a
			>!
		</p>
		<div class="text-end">
			<PSelect
				v-model:value="locale"
				:options="SupportedLanguages"
				:aria-label="$t('common.ui.language')" />
		</div>
	</div>
</template>
