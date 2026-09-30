<script setup lang="ts">
	import { useVersionCheck } from "@/lib/useVersionCheck";
	const { markUpdated } = useVersionCheck();

	import { trackEvent } from "@/lib/analytics/useAnalytics";

	async function reload(): Promise<void> {
		markUpdated()
			.then(() => {
				trackEvent("app:version_reload");
			})
			.finally(() => {
				window.location.reload();
			});
	}
</script>

<template>
	<div
		class="absolute z-9999 top-3 right-5 py-2 px-3 bg-prunplanner border border-white/40 shadow-lg cursor-pointer child:text-center text-xs max-w-[300px]"
		@click="reload">
		<div class="uppercase">
			<strong>PRUNplanner</strong> has been updated!
		</div>
		<div class="text-black/80">Click to load the newest version.</div>
	</div>
</template>
