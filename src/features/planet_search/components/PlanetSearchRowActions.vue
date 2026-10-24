<script setup lang="ts">
	import { computed } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Composables
	import { useAuthPanel } from "@/features/account/useAuthPanel";
	import { useUserStore } from "@/stores/userStore";

	// Util
	import { planetDisplayName } from "@/util/planetName";

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
		() =>
			planetDisplayName(
				props.planet.planet_natural_id,
				props.planet.planet_name
			)
	);
	// 26 px square buttons in both views
	const square =
		"touch-target inline-flex items-center justify-center w-[26px] h-[26px] rounded-sm";
	const plus = [
		square,
		buttonConfig.colors.primary.base,
		buttonConfig.colors.primary.hover,
	];

	// a visitor logs in first, in place, and goes on to the new plan
	const userStore = useUserStore();
	const { open } = useAuthPanel();
	function loginToPlan() {
		open("login", "planet_search_plan", {
			next: `/plan/${props.planet.planet_natural_id}`,
			context: { planet: name.value, id: props.planet.planet_natural_id },
		});
	}
</script>

<template>
	<div class="flex flex-row gap-1">
		<router-link
			v-if="userStore.isLoggedIn"
			:to="`/plan/${planet.planet_natural_id}`"
			target="_blank"
			rel="noopener"
			:class="plus"
			:aria-label="t('planet_search.results.create_plan', { planet: name })">
			<PlusSharp class="w-4 h-4" />
		</router-link>
		<button
			v-else
			type="button"
			:class="[plus, 'cursor-pointer']"
			:aria-label="
				t('planet_search.results.create_plan_login', { planet: name })
			"
			@click="loginToPlan">
			<PlusSharp class="w-4 h-4" />
		</button>
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
