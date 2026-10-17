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
	<button
		type="button"
		class="absolute z-9999 top-3 right-5 py-2 px-3 bg-prunplanner border border-white/40 shadow-lg cursor-pointer child:text-center text-xs max-w-[300px]"
		@click="reload">
		<i18n-t
			keypath="common.version_update.title"
			tag="span"
			class="block uppercase">
			<template #app>
				<strong>PRUNplanner</strong>
			</template>
		</i18n-t>
		{{ " " }}
		<span class="block text-black/80">
			{{ $t("common.version_update.action") }}
		</span>
	</button>
</template>
