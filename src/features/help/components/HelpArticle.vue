<script setup lang="ts">
	/**
	 * One help article, the same on /help/:article and in the Help panel:
	 * meta line, the sanitised article HTML, Related and "Was this
	 * helpful?". In-app links go through the router; a section is scrolled
	 * to once the article is there.
	 *
	 * @author jplacht
	 */
	import { computed, nextTick, onMounted, ref, type Ref, watch } from "vue";
	import { useRouter } from "vue-router";
	import { useI18n } from "vue-i18n";
	const { t } = useI18n();
	const router = useRouter();

	// Components
	import HelpFeedback from "@/features/help/components/HelpFeedback.vue";
	import HelpWelcome from "@/features/help/components/HelpWelcome.vue";
	import HelpTermPopover from "@/features/help/components/HelpTermPopover.vue";

	// Util
	import { getArticle } from "@/features/help/helpArticles";
	import { sanitizeHelpHtml } from "@/features/help/sanitizeHelp";

	// Types & Interfaces
	import type { IHelpArticle, IHelpDoc } from "@/features/help/help.types";

	const {
		article,
		doc,
		section = undefined,
		isFallback = false,
		inPanel = false,
	} = defineProps<{
		article: IHelpArticle;
		/** the parsed file; null for the Welcome article */
		doc: IHelpDoc | null;
		section?: string;
		isFallback?: boolean;
		/** the Help panel: no title, no Related, links leave the panel */
		inPanel?: boolean;
	}>();

	const emit = defineEmits<{
		(e: "navigate"): void;
	}>();

	const html = computed(() => (doc ? sanitizeHelpHtml(doc.html) : ""));
	const minutes = computed(() =>
		Math.max(1, Math.round((doc?.words ?? 0) / 200))
	);
	const related = computed(() =>
		article.related
			.map((id) => getArticle(id))
			.filter((a): a is IHelpArticle => !!a)
	);

	const body: Ref<HTMLElement | null> = ref(null);

	/** scrolls the article (window or panel) to a section */
	function scrollTo(id: string | undefined): void {
		if (!id || !body.value) return;
		const el = body.value.querySelector(`#${CSS.escape(id)}`);
		if (el) el.scrollIntoView({ block: "start" });
		// an unknown section: the article from the top
		else if (!inPanel) window.scrollTo({ top: 0 });
	}

	// the article owns its section scroll (the router leaves it alone): once
	// in the document, a frame later for the panel's opening and the page's
	// last layout, and on every section or article change
	function scrollToSection(): void {
		scrollTo(section);
		requestAnimationFrame(() => scrollTo(section));
	}
	onMounted(scrollToSection);
	watch([() => section, html], async () => {
		await nextTick();
		scrollToSection();
	});

	// links inside the article HTML: in-app paths through the router, a
	// section of the article in place
	function onClick(event: MouseEvent): void {
		const link = (event.target as HTMLElement).closest("a");
		const href = link?.getAttribute("href");
		if (!href || event.metaKey || event.ctrlKey || event.shiftKey) return;
		if (href.startsWith("#")) {
			event.preventDefault();
			if (inPanel) scrollTo(href.slice(1));
			else router.push({ hash: href });
		} else if (href.startsWith("/")) {
			event.preventDefault();
			emit("navigate");
			router.push(href);
		}
	}

	const proseClass = [
		"text-sm leading-relaxed text-ink",
		"[&>p:first-child]:text-base [&>p:first-child]:text-ink-strong",
		"[&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-ink-strong [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:scroll-mt-[var(--help-anchor-offset,1.5rem)]",
		"[&_h3]:text-base [&_h3]:font-bold [&_h3]:text-ink-strong [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:scroll-mt-[var(--help-anchor-offset,1.5rem)]",
		"[&_h4]:font-bold [&_h4]:text-ink-strong [&_h4]:mt-4 [&_h4]:mb-1 [&_h4]:scroll-mt-[var(--help-anchor-offset,1.5rem)]",
		"[&_p]:mb-3 [&_strong]:text-ink-strong",
		"[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3",
		"[&_li]:mt-1.5 [&_li]:marker:text-muted [&_li>ul]:mb-0",
		"[&_a]:text-link-primary [&_a:hover]:underline",
		// glossary terms: dotted underline, the popover on hover or focus
		"[&_a.help-term]:text-ink-strong [&_a.help-term]:border-b [&_a.help-term]:border-dotted [&_a.help-term]:border-link-primary [&_a.help-term]:cursor-help [&_a.help-term:hover]:no-underline",
		"[&_code]:font-mono [&_code]:text-xs [&_code]:bg-surface-sunken [&_code]:px-1 [&_code]:rounded-control",
		"[&_table]:w-full [&_table]:mb-4 [&_table]:border-collapse",
		"[&_th]:text-left [&_th]:font-medium [&_th]:text-ink-strong [&_th]:border-b [&_th]:border-line [&_th]:px-3 [&_th]:py-1.5",
		"[&_td]:border-b [&_td]:border-line [&_td]:px-3 [&_td]:py-1.5",
		"[&_blockquote]:border-l-2 [&_blockquote]:border-line-strong [&_blockquote]:pl-4 [&_blockquote]:mb-3 [&_blockquote]:text-muted-strong",
		"[&_.help-callout]:rounded-panel [&_.help-callout]:p-3 [&_.help-callout]:bg-surface [&_.help-callout]:border [&_.help-callout_p:last-child]:mb-0",
		"[&_.help-callout-tip]:border-prunplanner/40 [&_.help-callout-warning]:border-warning/50",
	].join(" ");
</script>

<template>
	<!-- headings stop below the sticky homepage header (HelpLayout) -->
	<div class="flex flex-col gap-4">
		<div
			class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted"
			data-testid="help-meta">
			<span>
				{{
					t("help.article.updated_in", { version: article.updatedIn })
				}}
			</span>
			<span v-if="doc">
				{{ t("help.article.read_time", { minutes }) }}
			</span>
		</div>

		<p
			v-if="isFallback"
			class="text-xs text-muted border border-line rounded-control px-3 py-2">
			{{ t("help.article.fallback") }}
		</p>

		<HelpWelcome v-if="!article.file" />
		<!-- sanitised at build time and again here (docs/security.md) -->
		<!-- eslint-disable vue/no-v-html -->
		<div
			v-else
			ref="body"
			data-testid="help-body"
			:class="proseClass"
			@click="onClick"
			v-html="html" />
		<!-- eslint-enable vue/no-v-html -->
		<HelpTermPopover
			v-if="article.file"
			:root="body"
			@navigate="emit('navigate')" />

		<nav
			v-if="!inPanel && related.length"
			class="mt-4 pt-4 border-t border-line"
			:aria-label="t('help.article.related')">
			<h2
				class="text-xs font-medium uppercase tracking-wider text-muted mb-2">
				{{ t("help.article.related") }}
			</h2>
			<ul class="flex flex-col gap-1">
				<li v-for="r in related" :key="r.id">
					<RouterLink
						:to="`/help/${r.id}`"
						class="text-sm text-link-primary hover:underline">
						{{ t(`help.articles.${r.id}.title`) }}
					</RouterLink>
				</li>
			</ul>
		</nav>

		<HelpFeedback :key="article.id" :article="article.id" />
	</div>
</template>
