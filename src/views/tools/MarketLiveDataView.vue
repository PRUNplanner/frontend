<script setup lang="ts">
	import { onMounted, onUnmounted, ref } from "vue";

	// Composables
	import { useExchangeSSE } from "@/features/market_live/useExchangeSSE";

	// Components
	import HelpDrawer from "@/features/help/components/HelpDrawer.vue";
	import AlertManager from "@/features/market_live/components/AlertManager.vue";
	import AlertFeed from "@/features/market_live/components/AlertFeed.vue";
	import CXPointTable from "@/features/market_live/components/CXPointTable.vue";
	import MessageHistory from "@/features/market_live/components/MessageHistory.vue";

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
		messageHistory,
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
	<div class="h-dvh flex flex-col overflow-hidden">
		<div
			class="px-6 py-3 border-b border-white/10 flex flex-row justify-between gap-x-3 shrink-0">
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
		<div class="px-6 py-3 flex-1 min-h-0">
			<div
				class="grid grid-cols-1 xl:grid-cols-[auto_700px] gap-3 h-full">
				<div class="flex flex-col h-full overflow-hidden">
					<div
						class="flex-1 flex flex-col min-h-0 rounded border border-white/10 p-3">
						<div
							class="pb-3 flex flex-row justify-between items-center shrink-0">
							<h2 class="text-lg font-bold">Alert Feed</h2>
							<div class="flex flex-row gap-3">
								<PButton
									:type="
										showAlertManager ? 'error' : 'secondary'
									"
									@click="
										() =>
											(showAlertManager =
												!showAlertManager)
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
									:type="
										detectorsActive ? 'success' : 'error'
									"
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
						<div class="flex-1 overflow-y-auto custom-scroll">
							<div
								v-if="showAlertManager"
								class="shrink-0 p-3 mb-3 rounded border border-white/10">
								<AlertManager />
							</div>
							<AlertFeed :event-log="eventLog" />
						</div>
					</div>
					<div
						class="h-[250px] shrink-0 overflow-y-auto custom-scroll mt-3 rounded border border-white/10 p-3">
						<MessageHistory :data="messageHistory" />
					</div>
				</div>
				<div class="flex-1 min-h-0">
					<CXPointTable :data="cxPointTableData" class="h-full" />
				</div>
			</div>
		</div>
	</div>
</template>
