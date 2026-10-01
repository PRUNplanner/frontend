<script setup lang="ts">
	import { computed } from "vue";

	// Composables
	import { useAuthPanel } from "@/features/account/useAuthPanel";
	import { usePreferences } from "@/features/preferences/usePreferences";
	import { SupportedLanguages } from "@/lib/i18n";

	// Stores
	import { useUserStore } from "@/stores/userStore";

	// Components
	import HomepageLanguage from "@/layout/components/HomepageLanguage.vue";

	// UI
	import { PSelect } from "@/ui";
	import { buttonConfig } from "@/ui/styles";

	const { open } = useAuthPanel();
	const { locale } = usePreferences();
	const userStore = useUserStore();

	// the translation banner, only when the browser language is not the
	// active locale's (English by default); the footer select is always there
	const showLanguageSelector = computed<boolean>(() => {
		if (typeof navigator === "undefined") return false;
		const browser = navigator.language.toLowerCase().split("-")[0];
		return browser !== locale.value.toLowerCase().split("_")[0];
	});

	// landing buttons are larger than PButton's sizes, colors come from the kit
	const buttonBase =
		"inline-flex items-center justify-center gap-2 h-12 px-5 rounded-sm text-base font-medium cursor-pointer";
	const primaryButton = [
		buttonBase,
		buttonConfig.colors.primary.base,
		buttonConfig.colors.primary.hover,
	].join(" ");
	const outlineButton = `${buttonBase} border border-white/25 text-white hover:bg-white/10`;

	// shots are 1440×900 captures at 2x
	const IMG_W = 2880;
	const IMG_H = 1800;
	const image = (name: string) => `/images/homepage/${name}.webp`;

	// set-up cards show a 2.2x zoomed part of the shot, x/y like background-position
	const ZOOM = 2.2;
	const CARD_H = 200;
	const crop = (x: number, y: number) => ({
		width: `${ZOOM * 100}%`,
		transform: `translate(${-(1 - 1 / ZOOM) * x}%, calc(${-y}% + ${(y / 100) * CARD_H}px))`,
	});

	const setup = [
		{ key: "plan", image: "plan", crop: crop(45, 30) },
		{ key: "empire", image: "empire", crop: crop(80, 15) },
		{ key: "exchange", image: "exchanges", crop: crop(5, 10) },
	];

	const mostUsed = [
		{ key: "planet_search", image: "planet-search", points: 4, fio: false },
		{ key: "resource_roi", image: "resource-roi", points: 3, fio: false },
		{ key: "fio_burn", image: "fio-burn", points: 3, fio: true },
	];

	const tools = [
		{ key: "market_live", fio: false },
		{ key: "market_exploration", fio: false },
		{ key: "recipe_roi", fio: false },
		{ key: "production_chains", fio: false },
		{ key: "hq_calculator", fio: false },
		{ key: "repair", fio: true },
		{ key: "carts", fio: false },
		{ key: "upkeep", fio: false },
	];
</script>

<template>
	<div class="mx-auto w-full max-w-7xl px-4 md:px-10 lg:px-0">
		<!-- Hero -->
		<section
			class="py-18 grid grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-14 items-center">
			<div class="flex flex-col gap-6">
				<div
					class="text-sm uppercase tracking-wide text-prunplanner font-medium">
					{{ $t("homepage.hero.eyebrow") }}
				</div>
				<h1
					class="text-4xl md:text-6xl font-black leading-tight tracking-tight text-white">
					{{ $t("homepage.hero.title") }}
				</h1>
				<p class="text-lg text-muted-strong">
					{{ $t("homepage.hero.lead") }}
				</p>
				<div class="flex flex-col sm:flex-row gap-3 pt-2">
					<router-link
						v-if="userStore.isLoggedIn"
						to="/empire"
						data-cta
						:class="primaryButton">
						{{ $t("homepage.hero.cta_logged_in") }}
					</router-link>
					<button
						v-else
						type="button"
						data-cta
						:class="primaryButton"
						@click="open('registration')">
						{{ $t("homepage.hero.cta") }}
					</button>
					<a href="#how" :class="outlineButton">
						{{ $t("homepage.hero.how") }}
						<span aria-hidden="true">↓</span>
					</a>
				</div>
				<div class="text-sm text-muted">
					{{ $t("homepage.hero.facts") }}
				</div>
			</div>
			<figure class="flex flex-col gap-2.5">
				<img
					:src="image('plan')"
					:width="IMG_W"
					:height="IMG_H"
					:alt="$t('homepage.hero.image_alt')"
					class="w-full rounded-md border border-white/15" />
				<figcaption class="text-sm text-muted">
					{{ $t("homepage.hero.image_caption") }}
				</figcaption>
			</figure>
		</section>

		<!-- Three things to set up -->
		<section id="how" class="py-18 border-t border-white/8 flex flex-col gap-10">
			<div class="flex flex-col gap-2.5 max-w-3xl">
				<h2 class="text-3xl font-bold text-white">
					{{ $t("homepage.setup.title") }}
				</h2>
				<p class="text-base text-muted-strong">
					{{ $t("homepage.setup.lead") }}
				</p>
			</div>
			<div class="grid grid-cols-1 md:grid-cols-3 gap-8">
				<div
					v-for="(item, index) in setup"
					:key="item.key"
					class="flex flex-col gap-3.5">
					<div class="font-mono text-sm text-prunplanner">
						0{{ index + 1 }}
					</div>
					<h3 class="text-xl font-bold text-white">
						{{ $t(`homepage.setup.${item.key}.label`) }}
					</h3>
					<p class="text-base text-muted-strong">
						{{ $t(`homepage.setup.${item.key}.text`) }}
					</p>
					<div
						class="h-50 overflow-hidden rounded-md border border-white/15">
						<img
							:src="image(item.image)"
							:width="IMG_W"
							:height="IMG_H"
							:alt="$t(`homepage.setup.${item.key}.alt`)"
							loading="lazy"
							class="max-w-none h-auto"
							:style="item.crop" />
					</div>
				</div>
			</div>
		</section>

		<!-- What players use most -->
		<section class="py-18 border-t border-white/8 flex flex-col gap-18">
			<div class="flex flex-col gap-2.5 max-w-3xl">
				<h2 class="text-3xl font-bold text-white">
					{{ $t("homepage.most_used.title") }}
				</h2>
				<p class="text-base text-muted-strong">
					{{ $t("homepage.most_used.lead") }}
				</p>
			</div>
			<div
				v-for="(tool, index) in mostUsed"
				:key="tool.key"
				class="grid grid-cols-1 gap-14 items-center"
				:class="
					index % 2 === 1
						? 'lg:grid-cols-[minmax(0,8fr)_minmax(0,5fr)]'
						: 'lg:grid-cols-[minmax(0,5fr)_minmax(0,8fr)]'
				">
				<div
					class="flex flex-col gap-3.5"
					:class="{ 'lg:order-2': index % 2 === 1 }">
					<div
						class="text-sm uppercase tracking-wide text-prunplanner font-medium flex items-center gap-2">
						{{ $t(`homepage.most_used.${tool.key}.label`) }}
						<span
							v-if="tool.fio"
							class="normal-case tracking-normal text-xs text-muted-strong border border-white/25 rounded-sm px-2 py-0.5">
							{{ $t("homepage.most_used.needs_fio") }}
						</span>
					</div>
					<h3 class="text-2xl font-bold text-white">
						{{ $t(`homepage.most_used.${tool.key}.title`) }}
					</h3>
					<p class="text-base text-muted-strong">
						{{ $t(`homepage.most_used.${tool.key}.lead`) }}
					</p>
					<ul class="flex flex-col gap-2 text-base text-white/85">
						<li
							v-for="point in tool.points"
							:key="point"
							class="flex gap-2.5 items-baseline">
							<span
								aria-hidden="true"
								class="size-1.5 shrink-0 -translate-y-0.5 rounded-full bg-prunplanner" />
							{{ $t(`homepage.most_used.${tool.key}.point_${point}`) }}
						</li>
					</ul>
				</div>
				<img
					:src="image(tool.image)"
					:width="IMG_W"
					:height="IMG_H"
					:alt="$t(`homepage.most_used.${tool.key}.alt`)"
					loading="lazy"
					class="w-full rounded-md border border-white/15"
					:class="{ 'lg:order-1': index % 2 === 1 }" />
			</div>
		</section>

		<!-- And the tools around it -->
		<section
			class="py-18 border-t border-white/8 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-14">
			<div class="flex flex-col gap-2.5">
				<h2 class="text-3xl font-bold text-white">
					{{ $t("homepage.tools.title") }}
				</h2>
				<p class="text-base text-muted-strong">
					{{ $t("homepage.tools.lead") }}
				</p>
			</div>
			<div class="grid grid-cols-1 sm:grid-cols-2 gap-x-10">
				<div
					v-for="tool in tools"
					:key="tool.key"
					class="py-4 border-b border-white/8 flex flex-col gap-1">
					<div class="font-bold text-white">
						{{ $t(`homepage.tools.${tool.key}.label`) }}
						<span
							v-if="tool.fio"
							class="font-normal text-xs text-muted">
							{{ $t("homepage.tools.with_fio") }}
						</span>
					</div>
					<div class="text-sm text-muted-strong">
						{{ $t(`homepage.tools.${tool.key}.text`) }}
					</div>
				</div>
			</div>
		</section>

		<!-- Closing band -->
		<section
			class="p-10 border border-white/12 rounded-md flex flex-col md:flex-row md:items-center gap-6">
			<div class="grow flex flex-col gap-1.5">
				<div class="text-2xl font-bold text-white">
					{{ $t("homepage.closing.title") }}
				</div>
				<div class="text-base text-muted-strong">
					{{ $t("homepage.closing.text") }}
				</div>
			</div>
			<a
				href="https://github.com/PRUNplanner/frontend"
				target="_blank"
				rel="noopener"
				:class="outlineButton">
				{{ $t("homepage.closing.github") }}
			</a>
			<button
				v-if="!userStore.isLoggedIn"
				type="button"
				:class="[buttonBase, buttonConfig.colors.secondary.base, buttonConfig.colors.secondary.hover]"
				@click="open('registration')">
				{{ $t("homepage.closing.cta") }}
			</button>
		</section>

		<div v-if="showLanguageSelector" class="pt-18">
			<HomepageLanguage />
		</div>
	</div>

	<footer
		class="mt-18 border-t border-white/8 text-sm text-muted">
		<div
			class="mx-auto w-full max-w-7xl px-4 md:px-10 lg:px-0 py-8 flex flex-col md:flex-row md:items-center gap-6">
			<span class="grow">{{ $t("homepage.footer.made_in") }}</span>
			<router-link to="/imprint-tos" class="inline-flex items-center min-h-6 text-muted-strong hover:underline">
				{{ $t("homepage.footer.imprint") }}
			</router-link>
			<a
				href="https://crowdin.com/project/prunplanner"
				target="_blank"
				rel="noopener"
				class="inline-flex items-center min-h-6 text-muted-strong hover:underline">
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
</template>
