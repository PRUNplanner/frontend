<script setup lang="ts">
	import { computed, type PropType } from "vue";

	// Vue Flow
	import { Handle, Position } from "@vue-flow/core";

	// Composables
	import { useMaterialData } from "@/database/services/useMaterialData";

	// Util
	import { formatNumber } from "@/util/numbers";

	// Types & Interfaces
	import { IFlowNodeData } from "@/features/production_chain/productionGraph.types";
	import { nodeDimensions } from "@/features/production_chain/dagre.config";
	import {
		EXPERTISECOLORS,
		NodeColorType,
		WORKFORCECOLORS,
	} from "@/features/production_chain/components/ChainNode.types";

	const props = defineProps({
		id: {
			type: String,
			required: true,
		},
		data: {
			type: Object as PropType<IFlowNodeData>,
			required: true,
		},
		colorType: {
			type: String as PropType<NodeColorType>,
			required: true,
		},
	});

	const { getMaterialClass } = useMaterialData();

	const materialClass = getMaterialClass(props.data.materialTicker);

	const nodeClass = computed(() => {
		if (props.colorType === "Material")
			return `material-tile ${materialClass}`;
		else if (props.colorType === "Expertise") return "material-expertise";
		else return "material-workforce";
	});

	const nodeStyle = computed(() => {
		if (props.colorType === "Expertise")
			return `background-color: ${
				props.data.buildingExpertise &&
				props.data.buildingExpertise !== null
					? EXPERTISECOLORS[props.data.buildingExpertise]
					: "#bf000c"
			};`;
		else if (props.colorType === "Workforce")
			return workforceColorGradient.value;

		return "";
	});

	const workforceColorGradient = computed(() => {
		const sum: number = Object.values(props.data.buildingWorkforce).reduce(
			(sum, element) => sum + element,
			0
		);

		// no workforce, default
		if (sum === 0) return "background-color: #353535;";

		// workforces with amounts
		const activeWorkforces: string[] = Object.keys(
			props.data.buildingWorkforce
		).filter((e) => props.data.buildingWorkforce[e] > 0);

		// just one workforce, color as background
		if (activeWorkforces.length === 1)
			return `background-color: ${WORKFORCECOLORS[activeWorkforces[0]]};`;

		// build up gradient
		let gradient: string = "background: linear-gradient(90deg,";
		const gradientElements: { color: string; position: number }[] = [];
		let c: number = 0;

		activeWorkforces.forEach((workforce) => {
			const share: number = Math.round(
				(props.data.buildingWorkforce[workforce] * 100) / sum
			);

			gradientElements.push({
				color: WORKFORCECOLORS[workforce],
				position: share,
			});
		});

		// build gradient stuff
		const finalGradients: string[] = [];

		gradientElements.forEach((element) => {
			if (gradientElements[c - 1] != undefined) {
				finalGradients.push(
					`${element.color} ${gradientElements[c - 1].position}%`
				);
			}
			finalGradients.push(`${element.color} ${element.position}%`);

			c = c + 1;
		});

		gradient = gradient + finalGradients.join(", ") + ");";

		return gradient;
	});
</script>

<template>
	<Handle v-if="data.hasInput" id="input" type="target" :position="Position.Left" />
	<Handle v-if="data.hasOutput" id="output" type="source" :position="Position.Right" />
	<div
		class="flex flex-col text-white border border-black child:text-center justify-center items-center"
		:class="nodeClass"
		:style="`${nodeStyle} height: ${nodeDimensions.height}px; width: ${nodeDimensions.width}px`">
		<div class="text-xs">
			{{ formatNumber(data.amount, 2, true) }}
		</div>
		<div class="font-bold">
			{{ data.materialTicker }}
		</div>
		<div v-if="data.buildingTicker !== 'N/A'" class="text-xs font-bold">
			{{ data.buildingTicker }}
		</div>
	</div>
</template>
