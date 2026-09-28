<script setup lang="ts">
	import { computed } from "vue";

	// Components
	import HomepageLanguage from "@/layout/components/HomepageLanguage.vue";

	const screenshots: { image: string; text: string }[] = [
		{
			image: "/images/homepage/homepage-empire.png",
			text: "homepage.images.empire",
		},
		{
			image: "/images/homepage/homepage-plan.png",
			text: "homepage.images.plan",
		},
		{
			image: "/images/homepage/homepage-management.png",
			text: "homepage.images.management",
		},
		{
			image: "/images/homepage/homepage-exchanges.png",
			text: "homepage.images.exchanges",
		},
		{
			image: "/images/homepage/homepage-market-exploration.png",
			text: "homepage.images.market_exploration",
		},
		{
			image: "/images/homepage/homepage-planet-search.png",
			text: "homepage.images.planet_search",
		},
	];

	// check, if user language is not English
	const showLanguageSelector = computed<boolean>(() => {
		if (typeof window === "undefined") return true;
		return !!navigator.language.startsWith("en");
	});
</script>

<template>
	<div class="mx-auto w-full max-w-7xl px-4 pb-5 md:px-10 lg:px-0">
		<div class="lg:mb-10">
			<h1
				class="bg-linear-to-b bg-clip-text pb-4 text-5xl md:text-7xl font-extrabold leading-tight text-transparent from-white/50 to-white">
				{{ $t("homepage.hero.title") }} <br />
				{{ $t("homepage.hero.subtitle") }}
			</h1>
			<p class="text-xl text-white/60 font-mono">
				{{ $t("homepage.hero.lead") }}
			</p>
		</div>

		<h1 class="pb-4 text-4xl tracking-tight text-white text-center mt-30">
			{{ $t("homepage.features.section_title") }}
		</h1>
		<p
			class="text-white/60 text-center text-xl"
			:class="showLanguageSelector ? 'mb-4' : 'mb-10'">
			{{ $t("homepage.features.section_lead") }}
		</p>

		<div v-if="showLanguageSelector" class="p-10">
			<HomepageLanguage />
		</div>

		<div
			class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 bg-white/20 gap-px child:p-10 child:hover:bg-linear-315 child:from-white/10 child:to-transparent mb-20">
			<div class="bg-black">
				<div class="flex flex-col">
					<div class="text-white text-2xl font-bold mb-2">
						{{ $t("homepage.features.simulation.label") }}
					</div>
					<div class="text-white/60 text-lg font-mono">
						{{ $t("homepage.features.simulation.text") }}
					</div>
				</div>
			</div>
			<div class="bg-black">
				<div class="flex flex-col">
					<div class="text-white text-2xl font-bold mb-2">
						{{ $t("homepage.features.planning.label") }}
					</div>
					<div class="text-white/60 text-lg font-mono">
						{{ $t("homepage.features.planning.text") }}
					</div>
				</div>
			</div>
			<div class="bg-black">
				<div class="flex flex-col">
					<div class="text-white text-2xl font-bold mb-2">
						{{ $t("homepage.features.gamedata.label") }}
					</div>
					<div class="text-white/60 text-lg font-mono">
						{{ $t("homepage.features.gamedata.text") }}
					</div>
				</div>
			</div>
			<div class="bg-black">
				<div class="flex flex-col">
					<div class="text-white text-2xl font-bold mb-2">
						{{ $t("homepage.features.burn_repair.label") }}
					</div>
					<div class="text-white/60 text-lg font-mono">
						{{ $t("homepage.features.burn_repair.text") }}
					</div>
				</div>
			</div>
			<div class="bg-black">
				<div class="flex flex-col">
					<div class="text-white text-2xl font-bold mb-2">
						{{ $t("homepage.features.market_exploration.label") }}
					</div>
					<div class="text-white/60 text-lg font-mono">
						{{ $t("homepage.features.market_exploration.text") }}
					</div>
				</div>
			</div>
			<div class="bg-black">
				<div class="flex flex-col">
					<div class="text-white text-2xl font-bold mb-2">
						{{ $t("homepage.features.tools.label") }}
					</div>
					<div class="text-white/60 text-lg font-mono">
						{{ $t("homepage.features.tools.text") }}
					</div>
				</div>
			</div>
		</div>

		<div>
			<h1
				class="pb-4 text-4xl tracking-tight text-white text-center mt-30">
				{{ $t("homepage.images.section_title") }}
			</h1>
			<p class="text-white/60 text-center text-xl mb-10">
				{{ $t("homepage.images.section_lead") }}
			</p>
			<div class="grid grid-cols-1 xl:grid-cols-3 gap-3">
				<div
					v-for="(screenshot, index) in screenshots"
					:key="screenshot.image"
					:class="[index >= 3 ? 'hidden xl:block' : '']">
					<img :src="screenshot.image" :alt="screenshot.text" />
					<div class="text-center font-mono text-white/60 px-2">
						{{ $t(screenshot.text) }}
					</div>
				</div>
			</div>
		</div>
	</div>

	<div class="mx-auto w-full max-w-7xl px-5 md:px-10 lg:px-0">
		<h1 class="pb-4 text-4xl tracking-tight text-white text-center mt-30">
			{{ $t("homepage.concepts.section_title") }}
		</h1>
		<p class="text-white/60 text-center text-xl mb-10">
			{{ $t("homepage.concepts.section_lead") }}
		</p>
		<div
			class="grid grid-cols-1 lg:grid-cols-3 divide-x divide-white/20 child:p-10 mb-10">
			<div>
				<div class="text-white text-2xl font-bold mb-2">
					{{ $t("homepage.concepts.plans.label") }}
				</div>
				<div class="text-lg font-mono text-white/60">
					{{ $t("homepage.concepts.plans.text") }}
				</div>
			</div>
			<div>
				<div class="text-white text-2xl font-bold mb-2">
					{{ $t("homepage.concepts.empires.label") }}
				</div>
				<div class="text-lg font-mono text-white/60">
					{{ $t("homepage.concepts.empires.text") }}
				</div>
			</div>
			<div class="">
				<div class="text-white text-2xl font-bold mb-2">
					{{ $t("homepage.concepts.exchanges.label") }}
				</div>
				<div class="text-lg font-mono text-white/60">
					{{ $t("homepage.concepts.exchanges.text") }}
				</div>
			</div>
		</div>
	</div>
	<div>
		<h1 class="pb-4 text-4xl tracking-tight text-white text-center mt-20">
			{{ $t("homepage.tools.section_title") }}
		</h1>
		<div class="flex flex-row flex-wrap items-center justify-center pt-3 gap-10">
			<a href="https://posthog.com/" target="_blank">
				<img
					src="/images/homepage/posthog-logo-white@2x.png"
					class="h-7.5" />
			</a>
			<a href="https://crowdin.com/" target="_blank">
				<img
					src="/images/homepage/crowdin-core-logo-white.png"
					class="h-7.5" />
			</a>
		</div>
	</div>
	<h1 class="pb-4 text-4xl tracking-tight text-white text-center mt-30">
		{{ $t("homepage.open_source.section_title") }}
	</h1>
	<p class="text-white/60 text-center text-xl mb-5">
		<i18n-t keypath="homepage.open_source.section_lead" tag="span">
			<template #link>
				<a
					href="https://github.com/PRUNplanner/frontend"
					target="_blank"
					class="underline hover:text-blue-400">
					{{ $t("homepage.open_source.link_open_source") }}
				</a>
			</template>
		</i18n-t>
		<br />

		<span>{{ $t("homepage.open_source.prompt") }}</span>
	</p>
	<p class="text-white/60 text-center font-mono">
		{{ $t("homepage.love") }}
	</p>
</template>
