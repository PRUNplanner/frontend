<script setup lang="ts">
	import { defineAsyncComponent, type PropType, ref } from "vue";

	// Composables
	import { useEmpireForm } from "@/features/empire/useEmpireForm";
	import { trackEvent } from "@/lib/analytics/useAnalytics";

	// Components
	import EmpireConfigurationForm from "@/features/empire/components/EmpireConfigurationForm.vue";
	import SaveConflictNotice from "@/features/save_conflict/components/SaveConflictNotice.vue";
	const SaveConflictDialog = defineAsyncComponent(
		() =>
			import("@/features/save_conflict/components/SaveConflictDialog.vue")
	);

	// Types & Interfaces
	import type { PlanEmpireElement } from "@/features/api/schemas/empireData.schemas";

	// UI
	import { PButton, PIcon } from "@/ui";
	import { buttonConfig } from "@/ui/styles";
	import { CheckSharp, SaveSharp, SearchSharp } from "@vicons/material";

	const props = defineProps({
		empire: {
			type: Object as PropType<PlanEmpireElement>,
			required: true,
		},
	});

	const emit = defineEmits<{
		(e: "reload:empires"): void;
	}>();

	const { localData, isLoading, conflict, remoteNotice, reloadSaved, save } =
		useEmpireForm(() => props.empire);
	const saved = ref(false);

	/**
	 * Saves the empire configuration, marks step 1 as done
	 * @author jplacht
	 *
	 * @async
	 * @returns {Promise<void>}
	 */
	async function saveEmpire(): Promise<void> {
		trackEvent("onboarding:step_click", { step: "empire_save" });
		saved.value = await save();
		if (saved.value) emit("reload:empires");
	}

	const primaryLink = [
		buttonConfig.base,
		buttonConfig.colors.primary.base,
		buttonConfig.colors.primary.hover,
		"px-4 gap-2 h-9 w-fit text-sm font-bold",
	].join(" ");
</script>

<template>
	<section
		class="max-w-2xl m-3 sm:m-6 p-4 sm:p-6 border border-white/10 rounded flex flex-col gap-6"
		aria-labelledby="empire-onboarding-title">
		<div>
			<h1 id="empire-onboarding-title" class="text-2xl font-bold">
				{{ $t("empire.onboarding.title") }}
			</h1>
			<p class="text-white/80 mt-1">
				{{ $t("empire.onboarding.intro") }}
			</p>
		</div>

		<ol class="flex flex-col gap-6">
			<li class="flex flex-row gap-3">
				<span
					class="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold"
					:class="saved ? 'bg-positive text-black' : 'bg-white/10'">
					<PIcon v-if="saved" :size="16"><CheckSharp /></PIcon>
					<template v-else>1</template>
				</span>
				<div class="grow min-w-0 flex flex-col gap-3">
					<div>
						<h2 class="font-bold">
							{{ $t("empire.onboarding.empire.title") }}
						</h2>
						<p class="text-sm text-white/80">
							{{ $t("empire.onboarding.empire.help") }}
						</p>
					</div>
					<SaveConflictNotice
						:notice="remoteNotice"
						@reload="reloadSaved" />
					<EmpireConfigurationForm v-model="localData" />
					<div class="flex flex-row items-center gap-3">
						<PButton
							type="secondary"
							:loading="isLoading"
							@click="saveEmpire">
							<template #icon><SaveSharp /></template>
							{{ $t("common.buttons.save") }}
						</PButton>
						<span
							v-if="saved"
							class="text-sm text-positive"
							role="status">
							{{ $t("empire.onboarding.empire.saved") }}
						</span>
					</div>
				</div>
			</li>

			<li class="flex flex-row gap-3">
				<span
					class="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold bg-blue-800">
					2
				</span>
				<div class="grow min-w-0 flex flex-col gap-3">
					<div>
						<h2 class="font-bold">
							{{ $t("empire.onboarding.plan.title") }}
						</h2>
						<p class="text-sm text-white/80">
							{{ $t("empire.onboarding.plan.help") }}
						</p>
					</div>
					<router-link
						to="/search"
						:class="primaryLink"
						@click="
							trackEvent('onboarding:step_click', {
								step: 'planet_search',
							})
						">
						<PIcon :size="16"><SearchSharp /></PIcon>
						{{ $t("empire.onboarding.plan.action") }}
					</router-link>
				</div>
			</li>

			<li class="flex flex-row gap-3">
				<span
					class="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold bg-white/10">
					3
				</span>
				<div class="grow min-w-0">
					<h2 class="font-bold">
						{{ $t("empire.onboarding.prices.title") }}
					</h2>
					<i18n-t
						keypath="empire.onboarding.prices.help"
						tag="p"
						class="text-sm text-white/80">
						<template #exchanges>
							<router-link
								to="/exchanges"
								class="text-link-primary hover:underline"
								@click="
									trackEvent('onboarding:step_click', {
										step: 'exchanges',
									})
								">
								{{ $t("empire.onboarding.prices.exchanges") }}
							</router-link>
						</template>
					</i18n-t>
				</div>
			</li>
		</ol>
		<SaveConflictDialog v-if="conflict.show.value" :conflict="conflict" />
	</section>
</template>
