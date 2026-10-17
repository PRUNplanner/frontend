<script setup lang="ts">
	import { onMounted, type Ref, ref } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Unhead
	import { useHead } from "@unhead/vue";
	useHead({
		title: `${t("help.view_title")} | PRUNplanner`,
	});

	import HelpTutorial from "@/features/help/components/HelpTutorial.vue";
	import { VueShowdown } from "vue-showdown";

	// markdown loader from changelog
	async function loadMarkdown(): Promise<string> {
		const markdownFiles = import.meta.glob("@/assets/help/*.md", {
			query: "?raw",
			import: "default",
		}) as Record<string, () => Promise<string>>;

		const path = `/src/assets/help/changelog.md`;
		const loader = markdownFiles[path];
		if (!loader) throw new Error(`Markdown file "changelog" not found.`);

		return await loader();
	}

	const markdownContent: Ref<string> = ref("");

	onMounted(async () => (markdownContent.value = await loadMarkdown()));

	// one release per h1, divided by a line
	const changelogClass = [
		"text-sm leading-relaxed text-muted-strong",
		"[&_h1]:text-base [&_h1]:font-bold [&_h1]:text-ink-strong [&_h1]:mb-3",
		"[&_h1]:mt-6 [&_h1]:pt-6 [&_h1]:border-t [&_h1]:border-line",
		"[&_h1:first-child]:mt-0 [&_h1:first-child]:pt-0 [&_h1:first-child]:border-t-0",
		"[&_p]:mb-3 [&_strong]:text-ink-strong",
		"[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_ul]:space-y-2 [&_li]:marker:text-muted",
		"[&_a]:text-link-primary [&_a:hover]:underline",
	].join(" ");
</script>

<template>
	<div class="min-h-screen flex flex-col">
		<div
			class="px-6 py-3 border-b border-white/10 flex flex-row flex-wrap gap-x-6 gap-y-2 justify-between">
			<h1 class="text-2xl font-bold my-auto">{{ $t("help.title") }}</h1>
		</div>

		<div class="grow flex flex-col lg:flex-row">
			<div class="flex-1 min-w-0 px-6 py-8">
				<HelpTutorial />
			</div>
			<aside
				class="lg:w-md shrink-0 border-t lg:border-t-0 lg:border-l border-line"
				aria-labelledby="changelog">
				<div class="lg:sticky lg:top-0 lg:h-screen flex flex-col">
					<h2
						id="changelog"
						class="shrink-0 px-6 pt-8 pb-4 text-lg font-bold">
						{{ $t("help.changelog.title") }}
					</h2>
					<div
						v-if="markdownContent != ''"
						class="flex-1 min-h-0 overflow-auto px-6 pb-8"
						:class="changelogClass">
						<VueShowdown
							:markdown="markdownContent"
							flavor="github"
							:options="{ tables: true, emoji: true }" />
					</div>
				</div>
			</aside>
		</div>
	</div>
</template>
