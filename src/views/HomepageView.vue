<script setup lang="ts">
	import {
		computed,
		defineAsyncComponent,
		onMounted,
		ref,
		type Component,
	} from "vue";
	import { useI18n } from "vue-i18n";
	import { useHead } from "@unhead/vue";

	// Composables
	import { useAuthPanel } from "@/features/account/useAuthPanel";
	import { prefetchMarketReport } from "@/features/market_report/useMarketReport";
	import { useInView } from "@/features/market_report/useInView";
	import { usePreferences } from "@/features/preferences/usePreferences";
	import { trackEvent } from "@/lib/analytics/useAnalytics";
	import { SupportedLanguages } from "@/lib/i18n";
	import { htmlLang } from "@/lib/seo/site";

	// Stores
	import { useUserStore } from "@/stores/userStore";

	// Components
	import HomepageLanguage from "@/layout/components/HomepageLanguage.vue";
	import HomepageTour from "@/features/homepage/components/HomepageTour.vue";
	import HomepageMarketSkeleton from "@/features/homepage/components/HomepageMarketSkeleton.vue";
	// its chunk loads with the section's data, never with the page
	const HomepageMarketToday = defineAsyncComponent(
		() => import("@/features/homepage/components/HomepageMarketToday.vue")
	);
	import AnalyticsFooterLink from "@/features/analytics/components/AnalyticsFooterLink.vue";

	// UI
	import { PIcon, PSelect } from "@/ui";
	import {
		AccountTreeSharp,
		ArrowForwardSharp,
		BarChartSharp,
		BuildSharp,
		CalculateSharp,
		CodeSharp,
		HomeWorkSharp,
		LanguageSharp,
		NorthEastSharp,
		ShoppingCartSharp,
		ShowChartSharp,
		TrendingUpSharp,
	} from "@vicons/material";
	import {
		CROWDIN_URL,
		EXAMPLE_PLAN_PATH,
		GITHUB_URL,
		EMPIRE_TOUR,
		PLAN_COUNT,
		PLAN_TOUR,
		PLANET_SEARCH_TOUR,
		PLAYER_COUNT,
		landingCard,
		landingEyebrow,
		landingGrid4,
		landingOutlineButton,
		landingPrimaryButton,
	} from "@/features/homepage/homepage.constants";

	const { t } = useI18n();
	const { open } = useAuthPanel();
	const { locale } = usePreferences();
	const userStore = useUserStore();

	// the full title, without the "· PRUNplanner" of every other page
	useHead({
		title: () => t("homepage.seo.title"),
		titleTemplate: "%s",
	});

	// the translation banner, only when the browser language is not the
	// active locale's (English by default); the footer select is always
	// there. Not before mount: the prerender doesn't know the browser.
	const mounted = ref(false);
	onMounted(() => (mounted.value = true));
	const showLanguageSelector = computed<boolean>(() => {
		if (!mounted.value) return false;
		const browser = navigator.language.toLowerCase().split("-")[0];
		return browser !== locale.value.toLowerCase().split("_")[0];
	});

	const number = (value: number) =>
		new Intl.NumberFormat(htmlLang(locale.value)).format(value);
	const languageCount = SupportedLanguages.length;

	const exampleOpened = (source: "hero" | "shared_plans") =>
		trackEvent("landing:example_open", { source });

	// shots are 1440×900 captures at 2x
	const image = (name: string) => `/images/homepage/${name}.webp`;

	// one large shot at 150 % width, offset to its focal area
	const setup = [
		{ key: "plan", image: "plan", offset: "-ml-[22%] -mt-[9%]" },
		{ key: "empire", image: "empire", offset: "-ml-[40%] -mt-[4%]" },
		{ key: "exchange", image: "exchanges", offset: "-ml-[3%] -mt-[3%]" },
	];
	const setupStep = ref(setup[0]);

	const tools: { key: string; icon: Component; fio?: boolean }[] = [
		{ key: "market_live", icon: ShowChartSharp },
		{ key: "market_exploration", icon: BarChartSharp },
		{ key: "recipe_roi", icon: TrendingUpSharp },
		{ key: "production_chains", icon: AccountTreeSharp },
		{ key: "hq_calculator", icon: HomeWorkSharp },
		{ key: "repair", icon: BuildSharp, fio: true },
		{ key: "carts", icon: ShoppingCartSharp },
		{ key: "upkeep", icon: CalculateSharp },
	];

	// "Market today" mounts about a screen ahead, never before a scroll
	const marketEl = ref<HTMLElement | null>(null);
	const marketSeen = useInView(marketEl);

	const faq = ["what", "free", "fio", "try", "official", "languages"];

	// shared looks
	const container = "mx-auto w-full max-w-[1240px] px-6";
	const section = `${container} pt-30 scroll-mt-16 flex flex-col gap-11`;
	const eyebrow = landingEyebrow;
	const sectionTitle =
		"m-0 text-[clamp(32px,4vw,54px)] leading-[1.05] font-black tracking-[-0.025em] text-white";
	const card = landingCard;
	const cardTitle =
		"m-0 text-[28px] leading-[1.12] font-bold tracking-[-0.015em] text-white";
	const pill =
		"normal-case tracking-normal font-mono text-xs text-white/78 border border-white/28 rounded-full px-2.5 py-0.5";
	const grid4 = landingGrid4;
</script>

<template>
	<div class="text-[17px] leading-[1.55] text-white overflow-x-clip">
		<!-- Hero -->
		<section id="top" class="relative px-6 pt-22">
			<div
				aria-hidden="true"
				class="absolute inset-0 pointer-events-none bg-[radial-gradient(rgba(255,255,255,0.13)_1px,transparent_1.5px)] bg-size-[28px_28px] mask-b-from-0% mask-b-to-62%" />
			<div
				class="relative mx-auto max-w-[1240px] flex flex-col items-center text-center gap-7">
				<h1
					class="m-0 max-w-[1100px] flex flex-col items-center gap-7 text-balance text-[clamp(44px,6.6vw,92px)] leading-[0.98] font-black tracking-[-0.035em] text-white">
					<span
						class="inline-flex items-center gap-2.5 px-3.5 py-1.75 border border-white/10 rounded-full bg-[#0a1010] font-mono text-[12.5px] leading-normal font-normal tracking-[0.06em] uppercase text-white/78">
						<span
							aria-hidden="true"
							class="size-1.75 rounded-full bg-prunplanner" />
						{{ $t("homepage.hero.eyebrow") }}
					</span>
					<i18n-t keypath="homepage.hero.title" tag="span">
						<template #accent>
							<span class="text-prunplanner">{{
								$t("homepage.hero.title_accent")
							}}</span>
						</template>
					</i18n-t>
				</h1>
				<p
					class="m-0 max-w-[760px] text-balance text-[clamp(19px,1.9vw,24px)] leading-[1.35] font-medium text-white">
					{{ $t("homepage.hero.positioning") }}
				</p>
				<p
					class="m-0 max-w-[680px] text-[clamp(17px,1.5vw,20px)] text-white/78">
					{{ $t("homepage.hero.lead") }}
				</p>
				<div class="flex flex-wrap justify-center gap-3 pt-1">
					<router-link
						v-if="userStore.isLoggedIn"
						to="/empire"
						data-cta
						:class="landingPrimaryButton">
						{{ $t("homepage.hero.cta_logged_in") }}
						<PIcon :size="18"><ArrowForwardSharp /></PIcon>
					</router-link>
					<button
						v-else
						type="button"
						data-cta
						:class="landingPrimaryButton"
						@click="open('registration', 'hero')">
						{{ $t("homepage.hero.cta") }}
						<PIcon :size="18"><ArrowForwardSharp /></PIcon>
					</button>
					<router-link
						:to="EXAMPLE_PLAN_PATH"
						data-example
						:class="landingOutlineButton"
						@click="exampleOpened('hero')">
						{{ $t("homepage.hero.example") }}
					</router-link>
				</div>
				<p
					v-if="!userStore.isLoggedIn"
					class="m-0 font-mono text-[13px] text-white/62">
					{{ $t("homepage.hero.example_note") }}
				</p>

				<div class="mt-9 w-full max-w-[1180px]">
					<HomepageTour
						name="plan"
						image="plan"
						:alt="$t('homepage.hero.image_alt')"
						:steps="PLAN_TOUR"
						layout="strip"
						eager>
						<template #header>
							<div
								class="flex items-center gap-2 px-4 py-3 border-b border-white/10">
								<span
									v-for="dot in 3"
									:key="dot"
									aria-hidden="true"
									class="size-2.5 rounded-full bg-white/18" />
								<span class="ml-3 font-mono text-[12.5px] text-white/62">
									{{ $t("homepage.hero.image_title") }}
								</span>
							</div>
						</template>
					</HomepageTour>
				</div>
			</div>
		</section>

		<!-- Numbers strip -->
		<section
			:aria-label="$t('homepage.numbers.label')"
			:class="container"
			class="pt-6">
			<div :class="grid4" class="max-w-[1180px] mx-auto rounded-[14px]">
				<div
					v-for="cell in [
						{
							value: `${number(PLAYER_COUNT)}+`,
							text: $t('homepage.numbers.players'),
							accent: true,
						},
						{
							value: `${number(PLAN_COUNT)}+`,
							text: $t('homepage.numbers.plans'),
							accent: true,
						},
						{
							value: $t('homepage.numbers.free_value'),
							text: $t('homepage.numbers.free'),
						},
						{
							value: $t('homepage.numbers.languages_value', {
								count: languageCount,
							}),
							text: $t('homepage.numbers.languages'),
						},
					]"
					:key="cell.value"
					data-number
					class="bg-[#0a1010] px-6 py-6.5 flex flex-col gap-1">
					<div
						class="text-[34px] leading-[1.05] font-black tracking-[-0.02em]"
						:class="cell.accent ? 'text-prunplanner' : 'text-white'">
						{{ cell.value }}
					</div>
					<div class="text-[15px] text-white/78">{{ cell.text }}</div>
				</div>
			</div>
		</section>

		<!-- What players use most -->
		<section id="features" :class="section">
			<div class="flex flex-col gap-3.5 max-w-[760px]">
				<div :class="eyebrow">{{ $t("homepage.most_used.eyebrow") }}</div>
				<h2 :class="sectionTitle">{{ $t("homepage.most_used.title") }}</h2>
			</div>
			<div class="flex flex-col gap-6">
				<HomepageTour
					name="planet_search"
					image="planet-search"
					:alt="$t('homepage.most_used.planet_search.alt')"
					:steps="PLANET_SEARCH_TOUR"
					layout="list">
					<div :class="eyebrow">
						{{ $t("homepage.most_used.planet_search.label") }}
					</div>
					<h3 :class="cardTitle" class="text-[32px]!">
						{{ $t("homepage.most_used.planet_search.title") }}
					</h3>
					<p class="m-0 text-white/78">
						{{ $t("homepage.most_used.planet_search.lead") }}
					</p>
				</HomepageTour>
				<HomepageTour
					name="empire"
					image="empire"
					:alt="$t('homepage.most_used.empire.alt')"
					:steps="EMPIRE_TOUR"
					layout="list"
					reverse>
					<div :class="eyebrow">
						{{ $t("homepage.most_used.empire.label") }}
					</div>
					<h3 :class="cardTitle" class="text-[32px]!">
						{{ $t("homepage.most_used.empire.title") }}
					</h3>
					<p class="m-0 text-white/78">
						{{ $t("homepage.most_used.empire.lead") }}
					</p>
				</HomepageTour>

				<div class="flex flex-wrap gap-6">
					<article
						v-for="tool in [
							{ key: 'resource_roi', image: 'resource-roi' },
							{ key: 'fio_burn', image: 'fio-burn', fio: true },
						]"
						:key="tool.key"
						:class="card"
						class="flex-[1_1_380px] min-w-0 flex flex-col overflow-hidden">
						<div class="p-8 sm:px-10 sm:pt-10 flex flex-col gap-4">
							<div :class="eyebrow" class="flex flex-wrap items-center gap-2.5">
								{{ $t(`homepage.most_used.${tool.key}.label`) }}
								<span v-if="tool.fio" :class="pill">
									{{ $t("homepage.most_used.needs_fio") }}
								</span>
							</div>
							<h3 :class="cardTitle">
								{{ $t(`homepage.most_used.${tool.key}.title`) }}
							</h3>
							<p class="m-0 text-white/78">
								{{ $t(`homepage.most_used.${tool.key}.lead`) }}
							</p>
						</div>
						<div
							class="mt-auto ml-8 sm:ml-10 h-75 overflow-hidden border-t border-l border-white/16 rounded-tl-[10px]">
							<img
								:src="image(tool.image)"
								width="2880"
								height="1800"
								:alt="$t(`homepage.most_used.${tool.key}.alt`)"
								loading="lazy"
								class="block w-245 max-w-none h-auto" />
						</div>
					</article>
				</div>

				<div class="flex flex-wrap gap-6">
					<article
						:class="card"
						class="flex-[1_1_380px] min-w-0 p-8 sm:p-10 flex flex-col gap-4">
						<div :class="eyebrow">
							{{ $t("homepage.most_used.starter.label") }}
						</div>
						<h3 :class="cardTitle">
							{{ $t("homepage.most_used.starter.title") }}
						</h3>
						<p class="m-0 text-white/78">
							{{ $t("homepage.most_used.starter.text") }}
						</p>
					</article>
					<article
						:class="card"
						class="flex-[1_1_380px] min-w-0 p-8 sm:p-10 flex flex-col gap-4">
						<div :class="eyebrow">
							{{ $t("homepage.most_used.shared.label") }}
						</div>
						<h3 :class="cardTitle">
							{{ $t("homepage.most_used.shared.title") }}
						</h3>
						<p class="m-0 text-white/78">
							{{ $t("homepage.most_used.shared.text") }}
						</p>
						<router-link
							:to="EXAMPLE_PLAN_PATH"
							data-example
							class="mt-auto self-start min-h-11 inline-flex items-center gap-2 font-bold text-prunplanner hover:underline"
							@click="exampleOpened('shared_plans')">
							{{ $t("homepage.hero.example") }}
							<PIcon :size="18"><ArrowForwardSharp /></PIcon>
						</router-link>
					</article>
				</div>
			</div>
		</section>

		<!-- Market today: the frame is prerendered, the numbers load once the
		section comes near -->
		<section id="market" :class="section" aria-labelledby="market-title">
			<div class="flex flex-col gap-3.5 max-w-[820px]">
				<div :class="eyebrow" class="flex items-center gap-2.5">
					<span
						aria-hidden="true"
						class="size-1.75 rounded-full bg-prunplanner motion-safe:animate-pulse" />
					{{ $t("homepage.market.eyebrow") }}
				</div>
				<h2 id="market-title" :class="sectionTitle">
					{{ $t("homepage.market.title") }}
				</h2>
			</div>
			<div ref="marketEl">
				<Suspense v-if="marketSeen">
					<HomepageMarketToday />
					<template #fallback><HomepageMarketSkeleton /></template>
				</Suspense>
				<HomepageMarketSkeleton v-else />
			</div>
			<div>
				<router-link
					to="/market"
					data-market-cta
					:class="landingPrimaryButton"
					@mouseenter="prefetchMarketReport()"
					@focus="prefetchMarketReport()"
					@click="
						trackEvent('landing:market_click', { target: 'cta' })
					">
					{{ $t("homepage.market.cta") }}
					<PIcon :size="18"><ArrowForwardSharp /></PIcon>
				</router-link>
			</div>
		</section>

		<!-- From first base to empire -->
		<section id="how" :class="section">
			<div class="flex flex-col gap-3.5 max-w-[760px]">
				<div :class="eyebrow">{{ $t("homepage.setup.eyebrow") }}</div>
				<h2 :class="sectionTitle">{{ $t("homepage.setup.title") }}</h2>
				<p class="m-0 text-[18px] text-white/78">
					{{ $t("homepage.setup.lead") }}
				</p>
			</div>
			<div class="flex flex-wrap gap-7 items-stretch">
				<div
					role="group"
					:aria-label="$t('homepage.setup.label')"
					class="flex-[1_1_340px] flex flex-col gap-3">
					<button
						v-for="(item, index) in setup"
						:key="item.key"
						type="button"
						:aria-pressed="setupStep.key === item.key"
						class="flex gap-4.5 p-5.5 rounded-xl border text-left cursor-pointer transition-colors"
						:class="
							setupStep.key === item.key
								? 'border-prunplanner/55 bg-prunplanner/8'
								: 'border-white/10 hover:border-white/28'
						"
						@click="setupStep = item">
						<span
							class="pt-1 font-mono text-sm font-bold text-prunplanner">
							0{{ index + 1 }}
						</span>
						<span class="flex flex-col gap-1.5">
							<span class="text-[22px] font-bold text-white">
								{{ $t(`homepage.setup.${item.key}.label`) }}
							</span>
							<span class="text-base text-white/78">
								{{ $t(`homepage.setup.${item.key}.text`) }}
							</span>
						</span>
					</button>
				</div>
				<div
					:class="card"
					class="flex-[2_1_560px] min-w-0 aspect-[16/10] overflow-hidden border-white/16! rounded-[14px]!">
					<img
						:key="setupStep.key"
						:src="image(setupStep.image)"
						width="2880"
						height="1800"
						:alt="$t(`homepage.setup.${setupStep.key}.alt`)"
						loading="lazy"
						class="block w-[150%] max-w-none h-auto"
						:class="setupStep.offset" />
				</div>
			</div>
		</section>

		<!-- Tools -->
		<section id="tools" :class="section">
			<div class="flex flex-col gap-3.5 max-w-[760px]">
				<div :class="eyebrow">{{ $t("homepage.tools.eyebrow") }}</div>
				<h2 :class="sectionTitle">{{ $t("homepage.tools.title") }}</h2>
				<p class="m-0 text-[18px] text-white/78">
					{{ $t("homepage.tools.lead") }}
				</p>
			</div>
			<div :class="grid4" class="rounded-2xl">
				<div
					v-for="tool in tools"
					:key="tool.key"
					data-tool
					class="bg-[#030707] p-7 flex flex-col gap-2.5">
					<PIcon :size="26" class="text-prunplanner">
						<component :is="tool.icon" />
					</PIcon>
					<h3
						class="m-0 flex flex-wrap items-center gap-2.5 text-[18px] font-bold text-white">
						{{ $t(`homepage.tools.${tool.key}.label`) }}
						<span v-if="tool.fio" :class="pill">
							{{ $t("homepage.tools.with_fio") }}
						</span>
					</h3>
					<p class="m-0 text-[15px] text-white/62">
						{{ $t(`homepage.tools.${tool.key}.text`) }}
					</p>
				</div>
			</div>
		</section>

		<!-- FAQ -->
		<section
			id="faq"
			:class="container"
			class="pt-30 scroll-mt-16 flex flex-wrap gap-x-14 gap-y-7">
			<div class="flex-[1_1_300px] flex flex-col gap-3.5">
				<div :class="eyebrow">{{ $t("homepage.faq.eyebrow") }}</div>
				<h2 :class="sectionTitle">{{ $t("homepage.faq.title") }}</h2>
			</div>
			<div class="flex-[2_1_520px] min-w-0 border-t border-white/10">
				<details
					v-for="item in faq"
					:key="item"
					class="group border-b border-white/10">
					<summary
						class="list-none [&::-webkit-details-marker]:hidden min-h-11 py-4.5 flex items-center justify-between gap-4 cursor-pointer">
						<h3 class="m-0 text-[19px] font-bold text-white">
							{{ $t(`homepage.faq.${item}.question`) }}
						</h3>
						<svg
							aria-hidden="true"
							width="18"
							height="18"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2.4"
							stroke-linecap="round"
							class="shrink-0 text-prunplanner transition-transform group-open:rotate-45">
							<path d="M12 5v14M5 12h14" />
						</svg>
					</summary>
					<p class="m-0 pb-5 max-w-[760px] text-white/78">
						{{
							$t(`homepage.faq.${item}.answer`, {
								count: languageCount - 1,
							})
						}}
					</p>
				</details>
			</div>
		</section>

		<!-- Closing panel -->
		<section :class="container" class="pt-30">
			<div
				class="relative flex flex-wrap overflow-hidden rounded-[20px] bg-[#0a1010] border border-prunplanner/35 shadow-[0_40px_120px_-50px_rgba(192,226,24,0.3)]">
				<div
					aria-hidden="true"
					class="absolute inset-0 pointer-events-none bg-[radial-gradient(rgba(255,255,255,0.12)_1px,transparent_1.5px)] bg-size-[28px_28px] mask-r-from-0% mask-r-to-75%" />
				<div
					class="relative flex-[3_1_480px] px-[clamp(24px,4vw,64px)] py-[clamp(36px,5vw,72px)] flex flex-col items-start gap-5.5">
					<i18n-t
						keypath="homepage.closing.title"
						tag="h2"
						class="m-0 max-w-[640px] text-balance text-[clamp(32px,4.2vw,58px)] leading-[1.02] font-black tracking-[-0.03em] text-white">
						<template #accent>
							<span class="text-prunplanner">{{
								$t("homepage.closing.title_accent")
							}}</span>
						</template>
					</i18n-t>
					<p class="m-0 text-[18px] text-white/78">
						{{
							$t("homepage.closing.text", {
								players: number(PLAYER_COUNT),
							})
						}}
					</p>
					<button
						v-if="!userStore.isLoggedIn"
						type="button"
						data-closing-cta
						:class="landingPrimaryButton"
						class="mt-1.5"
						@click="open('registration', 'closing')">
						{{ $t("homepage.closing.cta") }}
						<PIcon :size="18"><ArrowForwardSharp /></PIcon>
					</button>
				</div>
				<div
					class="relative flex-[2_1_320px] bg-[#030707] border-l border-white/10 flex flex-col justify-center">
					<a
						v-for="link in [
							{
								href: GITHUB_URL,
								icon: CodeSharp,
								title: $t('homepage.closing.github'),
								text: $t('homepage.closing.github_text'),
							},
							{
								href: CROWDIN_URL,
								icon: LanguageSharp,
								title: $t('homepage.closing.translate'),
								text: $t('homepage.closing.translate_text', {
									count: languageCount,
								}),
							},
						]"
						:key="link.href"
						:href="link.href"
						target="_blank"
						rel="noopener"
						class="flex items-center gap-4 px-8 py-7 not-last:border-b border-white/10 hover:bg-white/3">
						<span
							aria-hidden="true"
							class="shrink-0 size-11 rounded-[10px] bg-prunplanner/10 inline-flex items-center justify-center text-prunplanner">
							<PIcon :size="22"><component :is="link.icon" /></PIcon>
						</span>
						<span class="grow flex flex-col">
							<span class="text-[18px] font-bold text-white">
								{{ link.title }}
							</span>
							<span class="text-[14.5px] text-white/62">
								{{ link.text }}
							</span>
						</span>
						<PIcon :size="18" class="shrink-0 text-white/62">
							<NorthEastSharp />
						</PIcon>
					</a>
				</div>
			</div>
		</section>

		<div v-if="showLanguageSelector" :class="container" class="pt-18">
			<HomepageLanguage />
		</div>

		<footer :class="container" class="pt-18 pb-10 text-[14.5px] text-muted">
			<div
				class="pt-7 border-t border-white/10 flex flex-col md:flex-row md:items-center gap-6">
				<span class="grow">{{ $t("homepage.footer.made_in") }}</span>
				<router-link
					to="/imprint-tos"
					class="inline-flex items-center min-h-11 text-muted-strong hover:underline">
					{{ $t("homepage.footer.imprint") }}
				</router-link>
				<AnalyticsFooterLink class="text-muted-strong" />
				<a
					:href="CROWDIN_URL"
					target="_blank"
					rel="noopener"
					class="inline-flex items-center min-h-11 text-muted-strong hover:underline">
					{{ $t("homepage.footer.translate") }}
				</a>
				<label class="flex items-center gap-2">
					{{ $t("homepage.footer.language") }}
					<PSelect
						v-model:value="locale"
						:options="SupportedLanguages"
						:aria-label="$t('homepage.footer.language')" />
				</label>
			</div>
		</footer>
	</div>
</template>
