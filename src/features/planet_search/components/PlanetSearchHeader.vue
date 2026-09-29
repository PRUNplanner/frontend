<script setup lang="ts">
	import { computed, nextTick, ref, type Ref } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Util
	import { chipLabel } from "@/features/planet_search/planetSearchLabels.util";

	// Types & Interfaces
	import type {
		PlanetSearchFilter,
		PlanetSearchReference,
		PlanetSearchSaved,
	} from "@/features/planet_search/planetSearch.schemas";
	import type { IPlanetSearchChip } from "@/features/planet_search/planetSearch.types";

	// UI
	import { PButton, PInput, PSelect } from "@/ui";
	import { popoverConfig } from "@/ui/styles";
	import { NPopover } from "naive-ui";
	import { SearchSharp } from "@vicons/material";

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

	// the select only triggers a load, it doesn't keep a value
	const loadValue: Ref<string | null> = ref(null);
	const savedOptions = computed(() =>
		props.saved.map((s) => ({ label: s.name, value: s.id }))
	);
	function onLoad(id: string | number | null | undefined) {
		const saved = props.saved.find((s) => s.id === id);
		if (saved) emit("load", saved);
		nextTick(() => (loadValue.value = null));
	}

	const saving: Ref<boolean> = ref(false);
	const saveName: Ref<string | null | undefined> = ref("");
	function startSave() {
		saveName.value =
			props.chips
				.map((c) => chipLabel(c, props.filter.minDaily, t, props.refName))
				.join(" · ") || t("planet_search.header.default_name");
		saving.value = true;
	}
	function confirmSave() {
		const name =
			saveName.value?.trim() || t("planet_search.header.default_name");
		emit("save", name);
		saving.value = false;
	}

	const manageOpen: Ref<boolean> = ref(false);
</script>

<template>
	<div
		class="px-3 lg:px-6 py-3 border-b border-white/10 flex flex-row flex-wrap items-center gap-2">
		<label class="relative flex-1 min-w-[240px] max-w-[560px]">
			<span class="sr-only">{{ t("planet_search.header.search_label") }}</span>
			<SearchSharp
				class="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted pointer-events-none z-10" />
			<PInput
				v-model:value="text"
				class="w-full [&_input]:pl-7!"
				:aria-label="t('planet_search.header.search_label')"
				:placeholder="t('planet_search.header.search_placeholder')" />
		</label>

		<div class="flex flex-row flex-wrap items-center gap-2">
			<span class="text-sm text-muted">
				{{ t("planet_search.header.saved") }}
			</span>
			<PSelect
				v-model:value="loadValue"
				class="min-w-[200px]"
				:options="savedOptions"
				:disabled="!saved.length"
				:aria-label="t('planet_search.header.load_saved')"
				:placeholder="t('planet_search.header.load_saved')"
				@update:value="onLoad" />

			<NPopover
				v-model:show="manageOpen"
				trigger="click"
				placement="bottom-end"
				:show-arrow="false"
				:class="popoverConfig.panel">
				<template #trigger>
					<PButton type="secondary" :aria-expanded="manageOpen">
						{{ t("planet_search.header.manage") }}
					</PButton>
				</template>
				<div class="flex flex-col gap-2 w-[380px] max-w-[90vw]">
					<p v-if="!saved.length" class="text-sm text-muted">
						{{ t("planet_search.header.no_saved") }}
					</p>
					<div
						v-for="(s, i) in saved"
						:key="s.id"
						class="flex flex-row items-center gap-2">
						<PInput
							class="flex-1"
							:value="s.name"
							:aria-label="
								t('planet_search.header.rename_label', {
									n: i + 1,
								})
							"
							@update:value="(v) => emit('rename', s, v ?? '')" />
						<PButton
							size="sm"
							@click="
								emit('load', s);
								manageOpen = false;
							">
							{{ t("planet_search.header.load") }}
						</PButton>
						<PButton
							size="sm"
							type="error"
							@click="emit('delete', s)">
							{{ t("planet_search.header.delete") }}
						</PButton>
					</div>
				</div>
			</NPopover>

			<form
				v-if="saving"
				class="flex flex-row items-center gap-2"
				@submit.prevent="confirmSave">
				<PInput
					v-model:value="saveName"
					class="w-[280px]"
					:aria-label="t('planet_search.header.save_name')" />
				<PButton html-type="submit">
					{{ t("planet_search.header.save_confirm") }}
				</PButton>
				<PButton type="secondary" @click="saving = false">
					{{ t("planet_search.header.cancel") }}
				</PButton>
			</form>
			<PButton v-else type="secondary" @click="startSave">
				{{ t("planet_search.header.save") }}
			</PButton>

			<PButton @click="emit('copy')">
				{{ t("planet_search.header.copy_link") }}
			</PButton>
			<PButton type="secondary" @click="emit('reset')">
				{{ t("planet_search.header.reset") }}
			</PButton>
		</div>
	</div>
</template>
