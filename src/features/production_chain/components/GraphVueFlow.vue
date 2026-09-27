<script setup lang="ts">
	import type { PropType } from "vue";

	// Components
	import ChainNode from "@/features/production_chain/components/ChainNode.vue";

	// Vue Flow
	import { VueFlow } from "@vue-flow/core";
	import { MiniMap } from "@vue-flow/minimap";

	// Types & Interfaces
	import type {
		IFlowEdge,
		IFlowNode,
	} from "@/features/production_chain/productionGraph.types";
	import type { NodeColorType } from "@/features/production_chain/components/ChainNode.types";

	defineProps({
		nodes: {
			type: Array as PropType<IFlowNode[]>,
			required: true,
		},
		edges: {
			type: Array as PropType<IFlowEdge[]>,
			required: true,
		},
		selectedNodeColorType: {
			type: String as PropType<NodeColorType>,
			required: true,
		},
	});
</script>

<template>
	<div
		style="width: 100%; height: 85vh"
		class="bg-white/3 border border-white/10">
		<VueFlow :nodes="nodes" :edges="edges" :nodes-connectable="false">
			<MiniMap
				pannable
				zoomable
				position="bottom-left"
				mask-color="#1A1A1A"
				node-color="#bf000c"
				node-stroke-color="#bf000c" />

			<template #node-chain="props">
				<ChainNode
					:id="props.id"
					:data="props.data"
					:color-type="selectedNodeColorType" />
			</template>
		</VueFlow>
	</div>
</template>
