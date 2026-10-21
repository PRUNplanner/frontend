<script setup lang="ts">
	// Components
	import HomepageMarketSectorsHeader from "@/features/homepage/components/HomepageMarketSectorsHeader.vue";

	// Util
	import {
		landingCard,
		landingGrid4,
		marketCard,
		marketMoversCard,
		marketGrid,
		marketLead,
		marketSector,
	} from "@/features/homepage/homepage.constants";

	// "Market today" before its data: in the prerender, until the section
	// comes near, and while its chunk and data load
	const pulse = "bg-white/5 motion-safe:animate-pulse";
</script>

<template>
	<div aria-busy="true" data-skeleton class="flex flex-col gap-9">
		<span class="sr-only">{{ $t("wrapper.loading") }}</span>
		<div :class="[marketLead, pulse]" class="rounded-lg" />
		<div :class="marketGrid">
			<div
				v-for="i in 2"
				:key="i"
				:class="[
					landingCard,
					i === 1 ? marketCard : marketMoversCard,
					pulse,
				]" />
		</div>
		<div class="flex flex-col gap-3">
			<HomepageMarketSectorsHeader />
			<div :class="landingGrid4" class="rounded-2xl">
				<div
					v-for="i in 8"
					:key="i"
					:class="marketSector"
					class="bg-[#0a1010] p-4">
					<div :class="pulse" class="h-full rounded-md" />
				</div>
			</div>
		</div>
	</div>
</template>
