import { defineStore } from "pinia";
import { ref } from "vue";

// Types & Interfaces
import { DetectorConfig } from "@/features/market_live/cxDetectors.types";

// NOTE: Need to connect alert preferences to user preferences + backend

export const useAlertsStore = defineStore(
	"prunplanner_alerts",
	() => {
		// state
		const userAlerts = ref<DetectorConfig[]>([]);
		const activeDraft = ref<DetectorConfig | null>(null);

		// actions
		const startEditing = (alert: DetectorConfig) => {
			activeDraft.value = JSON.parse(JSON.stringify(alert));
		};

		const cancelEditing = () => {
			activeDraft.value = null;
		};

		const saveEdit = () => {
			if (!activeDraft.value) return;

			const index = userAlerts.value.findIndex(
				(a) => a.id === activeDraft.value!.id
			);
			if (index !== -1) {
				userAlerts.value[index] = activeDraft.value;
			}
			activeDraft.value = null;
		};

		const addAlert = () => {
			const newAlert: DetectorConfig = {
				id: crypto.randomUUID(),
				name: "New Alert",
				severity: "LOW",
				logic: {
					operator: "AND",
					conditions: [],
				},
				enabled: false,
			};
			userAlerts.value.push(newAlert);
		};

		const updateAlert = (id: string, updatedConfig: DetectorConfig) => {
			const index = userAlerts.value.findIndex((a) => a.id === id);
			if (index !== -1) {
				userAlerts.value[index] = updatedConfig;
			}
		};

		const deleteAlert = (id: string) => {
			userAlerts.value = userAlerts.value.filter((a) => a.id !== id);
		};

		return {
			userAlerts,
			activeDraft,
			startEditing,
			cancelEditing,
			saveEdit,
			addAlert,
			updateAlert,
			deleteAlert,
		};
	},
	{
		persist: {
			pick: ["userAlerts"],
		},
	}
);
