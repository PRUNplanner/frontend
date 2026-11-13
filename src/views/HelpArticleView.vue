<script setup lang="ts">
	/**
	 * /help/:article: one help article with breadcrumbs, "On this page",
	 * previous/next, rendered from the markdown the build parsed.
	 *
	 * @author jplacht
	 */
	import {
		computed,
		onBeforeUnmount,
		onMounted,
		ref,
		type Ref,
		watch,
	} from "vue";
	import { useRoute, useRouter } from "vue-router";
	import { useI18n } from "vue-i18n";
	import { useHead } from "@unhead/vue";
	const { t, locale } = useI18n({ useScope: "global" });
	const route = useRoute();
	const router = useRouter();

	// Components
	import HelpLayout from "@/features/help/components/HelpLayout.vue";
	import HelpArticle from "@/features/help/components/HelpArticle.vue";
	import HelpToc from "@/features/help/components/HelpToc.vue";

	// Composables
	import { reportError, trackEvent } from "@/lib/analytics/useAnalytics";

	// Util
	import { getArticle, prevNext } from "@/features/help/helpArticles";
	import { loadArticle } from "@/features/help/helpContent";
	import { markHelpSource, takeHelpSource } from "@/features/help/helpSource";

	// Types & Interfaces
	import type { IHelpDoc } from "@/features/help/help.types";

	const article = computed(() => getArticle(String(route.params.article)));
	const section = computed(() => route.hash.slice(1) || undefined);

	const loaded: Ref<{ doc: IHelpDoc | null; isFallback: boolean } | null> =
		ref(null);

	const title = computed(() =>
		article.value ? t(`help.articles.${article.value.id}.title`) : ""
	);
	const lead = computed(
		() =>
			loaded.value?.doc?.sections
				.find((s) => s.text)
				?.text.slice(0, 160) ?? t("help.home.description")
	);
	useHead({
		title,
		meta: [{ name: "description", content: lead }],
	});

	const crumbs = computed(() =>
		article.value
			? [
					t(`help.areas.${article.value.area}`),
					article.value.parent
						? t(`help.parents.${article.value.parent}`)
						: "",
				].filter(Boolean)
			: []
	);
	const neighbours = computed(() =>
		article.value ? prevNext(article.value) : {}
	);

	// the section in view: the last heading above the top of the window
	const active: Ref<string | undefined> = ref(undefined);
	function onScroll(): void {
		const toc = loaded.value?.doc?.toc ?? [];
		let current = toc[0]?.id;
		for (const e of toc) {
			const el = document.getElementById(e.id);
			if (el && el.getBoundingClientRect().top < 120) current = e.id;
		}
		active.value = current;
	}

	let firstView = true;
	function track(): void {
		if (!article.value || !loaded.value) return;
		const fromHelp = takeHelpSource();
		trackEvent("help:article_view", {
			article: article.value.id,
			section: section.value,
			source:
				fromHelp ??
				(firstView && router.options.history.state.back === null
					? "direct"
					: "link"),
			is_fallback_locale: loaded.value.isFallback,
		});
		firstView = false;
	}

	async function load(): Promise<void> {
		if (!article.value) return;
		try {
			loaded.value = (await loadArticle(article.value, locale.value)) ?? {
				doc: null,
				isFallback: false,
			};
		} catch (err) {
			reportError(err);
			loaded.value = { doc: null, isFallback: false };
		}
	}

	watch([() => route.params.article, locale], async ([id], [oldId]) => {
		await load();
		if (id !== oldId) track();
		onScroll();
	});
	watch(section, (s) => (active.value = s ?? active.value));

	onMounted(() => {
		track();
		onScroll();
		window.addEventListener("scroll", onScroll, { passive: true });
	});
	onBeforeUnmount(() => window.removeEventListener("scroll", onScroll));

	await load();
</script>

<template>
	<HelpLayout :current="article?.id">
		<article v-if="article" class="flex flex-col gap-5">
			<nav
				class="flex flex-wrap items-center gap-1.5 text-xs text-muted-strong"
				:aria-label="t('help.article.breadcrumb')">
				<RouterLink to="/help" class="hover:underline">
					{{ t("help.article.root") }}
				</RouterLink>
				<template v-for="c in crumbs" :key="c">
					<span aria-hidden="true">/</span>
					<span>{{ c }}</span>
				</template>
			</nav>
			<h1 class="text-3xl leading-tight font-bold text-ink-strong">
				{{ title }}
			</h1>

			<details
				v-if="loaded?.doc?.toc.length"
				class="xl:hidden border border-line rounded-panel px-3 py-2">
				<summary
					class="cursor-pointer text-sm font-medium text-ink-strong">
					{{ t("help.article.on_this_page") }}
				</summary>
				<div class="pt-3">
					<HelpToc :toc="loaded.doc.toc" :active="active" />
				</div>
			</details>

			<HelpArticle
				v-if="loaded"
				:article="article"
				:doc="loaded.doc"
				:is-fallback="loaded.isFallback"
				:section="section" />

			<nav
				class="mt-2 grid grid-cols-2 gap-3"
				:aria-label="`${t('help.article.previous')} / ${t('help.article.next')}`">
				<RouterLink
					v-if="neighbours.prev"
					:to="`/help/${neighbours.prev.id}`"
					class="flex flex-col p-3 border border-line rounded-panel hover:bg-hover"
					@click="markHelpSource('nav')">
					<span class="text-xs text-muted">
						{{ t("help.article.previous") }}
					</span>
					<span class="text-sm text-link-primary">
						{{ t(`help.articles.${neighbours.prev.id}.title`) }}
					</span>
				</RouterLink>
				<span v-else />
				<RouterLink
					v-if="neighbours.next"
					:to="`/help/${neighbours.next.id}`"
					class="flex flex-col items-end text-right p-3 border border-line rounded-panel hover:bg-hover"
					@click="markHelpSource('nav')">
					<span class="text-xs text-muted">
						{{ t("help.article.next") }}
					</span>
					<span class="text-sm text-link-primary">
						{{ t(`help.articles.${neighbours.next.id}.title`) }}
					</span>
				</RouterLink>
			</nav>
		</article>

		<template v-if="loaded?.doc?.toc.length" #aside>
			<HelpToc :toc="loaded.doc.toc" :active="active" />
		</template>
	</HelpLayout>
</template>
