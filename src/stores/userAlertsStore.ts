import { defineStore } from "pinia";
import { ref } from "vue";

import { i18n } from "@/lib/i18n";
import { deepClone } from "@/util/data";

// Types & Interfaces
import type { DetectorConfig } from "@/features/market_live/cxDetectors.types";

export const useAlertsStore = defineStore(
	"prunplanner_alerts",
	() => {
		// state
		const userAlerts = ref<DetectorConfig[]>([]);
		const activeDraft = ref<DetectorConfig | null>(null);

		// actions
		const startEditing = (alert: DetectorConfig) => {
			activeDraft.value = deepClone(alert);
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
				name: i18n.global.t(
					"market_live.components.alert_manager.new_alert_name"
				),
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
