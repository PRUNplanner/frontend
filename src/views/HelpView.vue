<script setup lang="ts">
	import { onMounted, Ref, ref } from "vue";
	import { useHead } from "@unhead/vue";

	useHead({
		title: "Help | PRUNplanner",
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
</script>

<template>
	<div class="min-h-screen flex flex-col">
		<div
			class="px-6 py-3 border-b border-white/10 flex flex-row justify-between">
			<h1 class="text-2xl font-bold my-auto">Help & Changelog</h1>
		</div>

		<div
			class="grow grid grid-cols-1 lg:grid-cols-[60%_auto] gap-3 divide-x divide-white/10 child:px-6 child:py-3 child:last:pl-3">
			<div>
				<HelpTutorial />
			</div>
			<div>
				<h2 class="text-xl font-bold pb-3">Changelog</h2>
				<div
					v-if="markdownContent != ''"
					id="markdown"
					class="h-screen overflow-auto">
					<VueShowdown :markdown="markdownContent" />
				</div>
			</div>
		</div>
	</div>
</template>
