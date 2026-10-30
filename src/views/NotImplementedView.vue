<script setup lang="ts">
	import { useHead } from "@unhead/vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	useHead({ title: t("common.not_implemented.title") });

	// UI
	import { PIcon } from "@/ui";
	import { HourglassEmptySharp } from "@vicons/material";
</script>

<template>
	<div class="relative w-full h-full">
		<div class="absolute inset-0 flex items-center justify-center">
			<!-- the tables' empty state look -->
			<div class="flex flex-col items-center text-sm">
				<PIcon :size="40" class="text-white/38">
					<HourglassEmptySharp />
				</PIcon>
				<div class="mt-2 text-muted">
					{{ t("common.not_implemented.title") }}
				</div>
				<div class="mt-3 text-center text-white/82">
					<i18n-t
						keypath="common.not_implemented.open_source"
						tag="div">
						<template #link>
							<a
								href="https://github.com/PRUNplanner/frontend"
								target="_blank"
								class="text-link-primary hover:underline">
								{{ t("common.not_implemented.repository") }}</a
							>
						</template>
					</i18n-t>
					<i18n-t keypath="common.not_implemented.contact" tag="div">
						<template #link>
							<a
								href="https://discord.gg/2MDR5DYSfY"
								target="_blank"
								class="text-link-primary hover:underline"
								>{{ t("common.not_implemented.discord") }}</a
							>
						</template>
					</i18n-t>
				</div>
			</div>
		</div>
	</div>
</template>
