import { defineStore } from "pinia";
import { computed, ref, watch } from "vue";

import { useUserStore } from "@/stores/userStore";
import { i18n } from "@/lib/i18n";
import { tokenUserId } from "@/lib/crossTab";
import { readStorage, userStorageKey, writeStorage } from "@/lib/storage";
import { deepClone } from "@/util/data";

// Types & Interfaces
import type { DetectorConfig } from "@/features/market_live/cxDetectors.types";

const STORE_KEY = "prunplanner_alerts";

/** The alerts stored under a key, none if missing or corrupt */
function readAlerts(key: string): DetectorConfig[] {
	try {
		const stored = JSON.parse(readStorage(key) ?? "null")?.userAlerts;
		return Array.isArray(stored) ? stored : [];
	} catch {
		return [];
	}
}

export const useAlertsStore = defineStore(STORE_KEY, () => {
	// state
	const userAlerts = ref<DetectorConfig[]>([]);
	const activeDraft = ref<DetectorConfig | null>(null);

	// stored per user (browser only, not on the backend), so the next
	// user of the browser never sees them
	const userStore = useUserStore();
	// re-evaluated once per user change; userStorageKey also moves the old
	// unkeyed alerts to that user
	const storageKey = computed(() => {
		const id = tokenUserId(userStore.refreshToken);
		return id === undefined ? undefined : userStorageKey(STORE_KEY, id);
	});

	watch(
		storageKey,
		(key) => {
			activeDraft.value = null;
			userAlerts.value = key ? readAlerts(key) : [];
		},
		{ immediate: true, flush: "sync" }
	);
	watch(
		userAlerts,
		(alerts) => {
			if (storageKey.value)
				writeStorage(
					storageKey.value,
					JSON.stringify({ userAlerts: alerts })
				);
		},
		// sync: a change just before a user switch still goes to its user
		{ deep: true, flush: "sync" }
	);

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
});
