<script setup lang="ts">
	import { computed, onBeforeUnmount, ref, type Ref } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Components
	import PlanetSearchSavedActions from "@/features/planet_search/components/PlanetSearchSavedActions.vue";

	// Types & Interfaces
	import type {
		PlanetSearchFilter,
		PlanetSearchReference,
		PlanetSearchSaved,
	} from "@/features/planet_search/planetSearch.schemas";
	import type { IPlanetSearchChip } from "@/features/planet_search/planetSearch.types";

	// UI
	import { PButton, PInput, PPopover } from "@/ui";
	import { MoreHorizSharp, SearchSharp } from "@vicons/material";

	const props = defineProps<{
		filter: PlanetSearchFilter;
		chips: IPlanetSearchChip[];
		saved: PlanetSearchSaved[];
		refName: (ref: PlanetSearchReference) => string;
	}>();

	const emit = defineEmits<{
		(e: "update:text", value: string): void;
		(e: "save", name: string): void;
		(e: "load", saved: PlanetSearchSaved): void;
		(e: "rename", saved: PlanetSearchSaved, name: string): void;
		(e: "delete", saved: PlanetSearchSaved): void;
		(e: "copy"): void;
		(e: "reset"): void;
	}>();

	const text = computed({
		get: () => props.filter.text,
		set: (v: string | null | undefined) => emit("update:text", v ?? ""),
	});

	// phones fold the saved-search buttons into one "⋯" next to the name
	const wideQuery =
		typeof window.matchMedia === "function"
			? window.matchMedia("(min-width: 640px)")
			: null;
	const isPhone: Ref<boolean> = ref(!(wideQuery?.matches ?? true));
	const onMedia = (e: MediaQueryListEvent) => (isPhone.value = !e.matches);
	wideQuery?.addEventListener("change", onMedia);
	onBeforeUnmount(() => wideQuery?.removeEventListener("change", onMedia));

	const moreOpen: Ref<boolean> = ref(false);
</script>

<template>
	<div
		class="px-4 sm:px-6 py-3 border-b border-white/10 flex flex-row flex-wrap items-center gap-2">
		<label class="flex-1 min-w-0 sm:min-w-[240px] max-w-[560px]">
			<span class="sr-only">{{
				t("planet_search.header.search_label")
			}}</span>
			<PInput
				v-model:value="text"
				class="w-full"
				:aria-label="t('planet_search.header.search_label')"
				:placeholder="t('planet_search.header.search_placeholder')">
				<template #prefix><SearchSharp class="w-4 h-4" /></template>
			</PInput>
		</label>

		<PPopover v-if="isPhone" v-model:show="moreOpen" placement="bottom-end">
			<template #trigger>
				<PButton
					type="secondary"
					class="min-w-11 min-h-11"
					:aria-label="t('planet_search.header.more')">
					<MoreHorizSharp class="w-5 h-5" />
				</PButton>
			</template>
			<PlanetSearchSavedActions
				class="flex-col items-stretch! w-[280px] max-w-[85vw] [&_button]:min-h-11 [&_form]:flex-wrap"
				:filter="filter"
				:chips="chips"
				:saved="saved"
				:ref-name="refName"
				@save="(name) => emit('save', name)"
				@load="(s) => emit('load', s)"
				@rename="(s, name) => emit('rename', s, name)"
				@delete="(s) => emit('delete', s)"
				@copy="emit('copy')"
				@reset="emit('reset')" />
		</PPopover>
		<PlanetSearchSavedActions
			v-else
			class="ml-auto"
			:filter="filter"
			:chips="chips"
			:saved="saved"
			:ref-name="refName"
			@save="(name) => emit('save', name)"
			@load="(s) => emit('load', s)"
			@rename="(s, name) => emit('rename', s, name)"
			@delete="(s) => emit('delete', s)"
			@copy="emit('copy')"
			@reset="emit('reset')" />
	</div>
</template>
