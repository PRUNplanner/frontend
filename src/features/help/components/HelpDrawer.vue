<script setup lang="ts">
	import { PropType, ref, Ref, watch } from "vue";

	import { NDrawer, NDrawerContent, NButton } from "naive-ui";
	import { VueShowdown } from "vue-showdown";

	const showDrawer: Ref<boolean> = ref(false);

	async function loadMarkdown(): Promise<string> {
		const markdownFiles = import.meta.glob("@/assets/help/*.md", {
			query: "?raw",
			import: "default",
		}) as Record<string, () => Promise<string>>;

		const path = `/src/assets/help/${props.fileName}.md`;
		const loader = markdownFiles[path];
		if (!loader)
			throw new Error(`Markdown file "${props.fileName}" not found.`);
		return await loader();
	}

	const markdownContent = ref("");

	const props = defineProps({
		fileName: {
			type: String,
			required: true,
		},
		drawerTitle: {
			type: String,
			required: false,
			default: "Help",
		},
		buttonTitle: {
			type: String,
			required: false,
			default: "Help",
		},
		buttonSize: {
			type: String as PropType<"tiny" | "small" | "medium" | "large">,
			required: false,
			default: "small",
		},
		buttonClass: {
			type: String,
			required: false,
			default: "",
		},
		drawerWidth: {
			type: Number,
			required: false,
			default: 600,
		},
	});

	watch(showDrawer, async () => {
		if (showDrawer.value) {
			markdownContent.value = await loadMarkdown();
		}
	});
</script>

<template>
	<div :class="buttonClass">
		<n-button
			:size="buttonSize"
			secondary
			@click="() => (showDrawer = !showDrawer)">
			{{ buttonTitle }}
		</n-button>
	</div>
	<n-drawer v-model:show="showDrawer" :width="drawerWidth" placement="right">
		<n-drawer-content closable>
			<template #header>
				{{ drawerTitle }}
			</template>
			<div v-if="markdownContent != ''" id="markdown">
				<VueShowdown :markdown="markdownContent" />
			</div>
			<div v-else class="text-center text-red-500">
				Unable to load '{{ fileName }}'
			</div>
		</n-drawer-content>
	</n-drawer>
</template>
