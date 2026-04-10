<script setup lang="ts">
	import { onMounted, onUnmounted, ref } from "vue";

	// Composables
	import { useExchangeSSE } from "@/features/market_live/useExchangeSSE";

	// Components
	import HelpDrawer from "@/features/help/components/HelpDrawer.vue";
	import AlertManager from "@/features/market_live/components/AlertManager.vue";
	import AlertFeed from "@/features/market_live/components/AlertFeed.vue";
	import CXPointTable from "@/features/market_live/components/CXPointTable.vue";

	// UI
	import PButton from "@/ui/components/PButton.vue";
	import {
		CloseSharp,
		EditSharp,
		NotificationsNoneSharp,
		NotificationsActiveSharp,
		ClearSharp,
	} from "@vicons/material";

	const showAlertManager = ref<boolean>(false);

	const {
		connect,
		disconnect,
		clearEventLog,
		cxPointTableData,
		eventLog,
		detectorsActive,
		isConnected,
		isProcessing,
	} = useExchangeSSE();

	// connect + disconnect  hooks
	onMounted(async () => {
		connect();
	});
	onUnmounted(() => {
		disconnect();
		clearEventLog();
	});
</script>

<template>
	<div class="min-h-screen flex flex-col">
		<div
			class="px-6 py-3 border-b border-white/10 flex flex-row justify-between gap-x-3">
			<h1 class="text-2xl font-bold">Market Live Data</h1>
			<div>
				<div class="flex flex-row gap-x-3 child:my-auto">
					<div class="flex items-center gap-2 font-medium">
						<span class="relative flex h-3 w-3">
							<span
								v-if="isConnected"
								class="absolute inline-flex h-full w-full animate-ping rounded-full bg-positive opacity-75"></span>

							<span
								class="relative inline-flex h-3 w-3 rounded-full"
								:class="
									isConnected ? 'bg-positive' : 'bg-negative'
								">
							</span>
						</span>

						<span
							:class="
								isConnected ? 'text-positive' : 'text-negative'
							">
							{{ isConnected ? "Connected" : "Disconnected" }}
						</span>
					</div>
					<HelpDrawer file-name="tools_market_live" />
				</div>
			</div>
		</div>
		<div class="px-6 py-3">
			<div class="grid grid-cols-1 xl:grid-cols-[auto_700px] gap-3">
				<div class="rounded border border-white/10 p-3">
					<div
						class="pb-3 flex flex-row justify-between items-center">
						<h2 class="text-lg font-bold">Alert Feed</h2>
						<div class="flex flex-row gap-3">
							<PButton
								:type="showAlertManager ? 'error' : 'secondary'"
								@click="
									() => (showAlertManager = !showAlertManager)
								">
								<template #icon>
									<CloseSharp v-if="showAlertManager" />
									<EditSharp v-else />
								</template>
								<span v-if="showAlertManager">
									Close Alert Manager
								</span>
								<span v-if="!showAlertManager">
									Open Alert Manager
								</span>
							</PButton>
							<PButton type="error" @click="clearEventLog">
								<template #icon>
									<ClearSharp />
								</template>
								Clear Log
							</PButton>
							<PButton
								:type="detectorsActive ? 'success' : 'error'"
								:loading="isProcessing"
								@click="
									() => {
										detectorsActive = !detectorsActive;
									}
								">
								<template #icon>
									<NotificationsActiveSharp
										v-if="detectorsActive" />
									<NotificationsNoneSharp v-else />
								</template>
							</PButton>
						</div>
					</div>
					<div
						v-if="showAlertManager"
						class="p-3 mb-3 rounded border border-white/10">
						<AlertManager />
					</div>
					<div>
						<AlertFeed :event-log="eventLog" />
					</div>
				</div>
				<div>
					<CXPointTable :data="cxPointTableData" />
				</div>
			</div>
		</div>
	</div>
</template>
