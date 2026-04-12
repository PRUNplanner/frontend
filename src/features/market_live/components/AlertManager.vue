<script setup lang="ts">
	import { computed } from "vue";
	import { storeToRefs } from "pinia";

	// Composables
	import { useAlertsStore } from "@/stores/userAlertsStore";

	// Components
	import RuleGroup from "@/features/market_live/components/RuleGroup.vue";

	// UI
	import PSelect from "@/ui/components/PSelect.vue";
	import PForm from "@/ui/components/PForm.vue";
	import PFormItem from "@/ui/components/PFormItem.vue";
	import PInput from "@/ui/components/PInput.vue";
	import PButton from "@/ui/components/PButton.vue";
	import PTag from "@/ui/components/PTag.vue";
	import { PlusSharp } from "@vicons/material";

	const alertsStore = useAlertsStore();
	const { userAlerts, activeDraft } = storeToRefs(alertsStore);

	const { startEditing, cancelEditing, saveEdit, addAlert, deleteAlert } =
		alertsStore;

	const isEditing = computed(() => !!activeDraft.value);
</script>

<template>
	<div class="">
		<header class="flex justify-between pb-3">
			<div class="my-auto">
				<h2 class="text-lg font-bold">
					{{ isEditing ? "Edit Alert" : "Alert Manager" }}
				</h2>
				<span class="text-xs text-negative!">
					Alerts are currently stored on this device only and are not
					synced to your account.
				</span>
			</div>

			<div class="flex gap-3">
				<PButton v-if="!isEditing" @click="addAlert">
					<template #icon><PlusSharp /></template>
					Create New Alert
				</PButton>

				<template v-else>
					<PButton type="secondary" @click="cancelEditing">
						Discard
					</PButton>
					<PButton @click="saveEdit"> Save </PButton>
				</template>
			</div>
		</header>

		<main>
			<div v-if="!isEditing" class="grid gap-1">
				<div
					v-for="alert in userAlerts"
					:key="alert.id"
					class="group bg-gray-dark border border-white/10 p-2 rounded flex justify-between items-center">
					<div class="">
						<div class="flex items-center gap-3">
							<PTag v-if="alert.enabled" type="success">
								Active
							</PTag>
							<PTag v-else type="secondary">Paused</PTag>
							<h3 class="font-bold">
								{{ alert.name }}
							</h3>
						</div>
					</div>

					<div
						class="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
						<PButton @click="startEditing(alert)"> Edit </PButton>
						<PButton type="error" @click="deleteAlert(alert.id)">
							Delete
						</PButton>
					</div>
				</div>

				<div
					v-if="userAlerts.length === 0"
					class="text-center py-3 rounded border border-dashed border-white/10">
					No alerts found. Start by creating your first detector
					signal.
				</div>
			</div>

			<div v-else class="space-y-3">
				<section class="p-3 rounded border border-white/10">
					<div class="grid grid-cols-3 gap-3">
						<div>
							<PForm>
								<PFormItem label="Alert Name">
									<PInput
										v-model:value="activeDraft!.name"
										class="w-full" />
								</PFormItem>
							</PForm>
						</div>
						<div>
							<PForm>
								<PFormItem label="Severity">
									<PSelect
										v-model:value="activeDraft!.severity"
										:options="[
											{ label: 'Low', value: 'LOW' },
											{
												label: 'Medium',
												value: 'MEDIUM',
											},
											{ label: 'High', value: 'HIGH' },
										]" />
								</PFormItem>
							</PForm>
						</div>
						<div>
							<PForm>
								<PFormItem label="Status">
									<PButton
										:type="
											activeDraft!.enabled
												? 'success'
												: 'secondary'
										"
										@click="
											() =>
												(activeDraft!.enabled =
													!activeDraft!.enabled)
										">
										<span v-if="activeDraft!.enabled">
											Active
										</span>
										<span v-else>Inactive</span>
									</PButton>
								</PFormItem>
							</PForm>
						</div>
					</div>
				</section>

				<section class="p-3 rounded border border-white/10">
					<h2 class="text-lg font-bold pb-1">Logic Configuration</h2>

					<div>
						<RuleGroup
							:group="activeDraft!.logic"
							@update:group="
								(newLogic) => (activeDraft!.logic = newLogic)
							" />
					</div>
				</section>
			</div>
		</main>
	</div>
</template>

<style scoped>
	/* Scoped styles for some subtle animations */
	.animate-in {
		animation: fadeIn 0.4s ease-out;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
