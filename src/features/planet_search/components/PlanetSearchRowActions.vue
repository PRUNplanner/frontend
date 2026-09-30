<script setup lang="ts">
	import { computed } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Types & Interfaces
	import type { PlanetSearchIndexEntry } from "@/features/api/schemas/gameData.schemas";

	// UI
	import { buttonConfig } from "@/ui/styles";
	import { PlusSharp, StarBorderSharp, StarSharp } from "@vicons/material";

	const props = defineProps<{
		planet: PlanetSearchIndexEntry;
		pinned: boolean;
		showPin: boolean;
	}>();

	const emit = defineEmits<{ (e: "pin"): void }>();

	const name = computed(
		() => props.planet.planet_name || props.planet.planet_natural_id
	);
	// 26 px square buttons in both views
	const square =
		"inline-flex items-center justify-center w-[26px] h-[26px] rounded-sm";
</script>

<template>
	<div class="flex flex-row gap-1">
		<router-link
			:to="`/plan/${planet.planet_natural_id}`"
			target="_blank"
			rel="noopener"
			:class="[
				square,
				buttonConfig.colors.primary.base,
				buttonConfig.colors.primary.hover,
			]"
			:aria-label="t('planet_search.results.create_plan', { planet: name })">
			<PlusSharp class="w-4 h-4" />
		</router-link>
		<button
			v-if="showPin"
			type="button"
			:class="[
				square,
				'border border-white/20 cursor-pointer',
				pinned ? 'bg-blue-800' : 'hover:bg-white/10',
			]"
			:aria-pressed="pinned"
			:aria-label="
				t(
					pinned
						? 'planet_search.results.unpin'
						: 'planet_search.results.pin',
					{ planet: name }
				)
			"
			@click="emit('pin')">
			<StarSharp v-if="pinned" class="w-4 h-4" />
			<StarBorderSharp v-else class="w-4 h-4" />
		</button>
	</div>
</template>
