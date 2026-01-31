<script setup lang="ts">
	import { ref, Ref } from "vue";
	import { useHead } from "@unhead/vue";

	// Components
	import WrapperGameDataLoader from "@/features/wrapper/components/WrapperGameDataLoader.vue";
	import WrapperPlanningDataLoader from "@/features/wrapper/components/WrapperPlanningDataLoader.vue";
	import HelpDrawer from "@/features/help/components/HelpDrawer.vue";
	import CXPreferenceSelector from "@/features/exchanges/components/CXPreferenceSelector.vue";
	import UpkeepPriceCalculator from "@/features/government/components/UpkeepPriceCalculator.vue";

	useHead({
		title: "Upkeep Price Calculator | PRUNplanner",
	});

	// UI
	import { PForm, PFormItem } from "@/ui";

	const planetNaturalId: string = "OT-580b";
	const refSelectedCXUuid: Ref<string | undefined> = ref(undefined);
</script>

<template>
	<WrapperGameDataLoader load-exchanges load-materials>
		<WrapperPlanningDataLoader
			load-c-x
			:planet-natural-id="planetNaturalId"
			@update:cx-uuid="(d) => (refSelectedCXUuid = d)">
			<template #default>
				<div class="min-h-screen flex flex-col">
					<div
						class="px-6 py-3 border-b border-white/10 flex flex-row justify-between">
						<h1 class="text-2xl font-bold my-auto">
							Upkeep Price Calculator
						</h1>
						<div class="flex flex-row gap-x-3">
							<PForm>
								<PFormItem label="CX Preference">
									<CXPreferenceSelector
										:cx-uuid="refSelectedCXUuid"
										@update:cxuuid="
											(value) =>
												(refSelectedCXUuid = value)
										" />
								</PFormItem>
							</PForm>
							<HelpDrawer file-name="tools_upkeep_price_calculator" />
						</div>
					</div>

					<div class="px-6 py-3">
						<UpkeepPriceCalculator :cx-uuid="refSelectedCXUuid" />
					</div>
				</div>
			</template>
		</WrapperPlanningDataLoader>
	</WrapperGameDataLoader>
</template>
