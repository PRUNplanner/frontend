<script setup lang="ts">
	// Components
	import RuleGroup from "@/features/market_live/components/RuleGroup.vue";
	import DetectorRow from "@/features/market_live/components/DetectorRow.vue";

	// Types & Interfaces
	import type {
		RuleGroup as RuleGroupType,
		Detector,
	} from "@/features/market_live/cxDetectors.types";

	// UI
	import PButton from "@/ui/components/PButton.vue";
	import PButtonGroup from "@/ui/components/PButtonGroup.vue";
	import { PlusSharp, ClearSharp } from "@vicons/material";

	const props = defineProps<{
		group: RuleGroupType;
	}>();

	const emit = defineEmits(["remove", "update:group"]);

	const isRuleGroup = (
		item: Detector | RuleGroupType
	): item is RuleGroupType => {
		return "operator" in item && "conditions" in item;
	};

	const isDetector = (item: Detector | RuleGroupType): item is Detector => {
		return "field" in item;
	};

	const emitUpdate = (updatedConditions: (Detector | RuleGroupType)[]) => {
		emit("update:group", {
			...props.group,
			conditions: [...updatedConditions],
		});
	};

	const addCondition = () => {
		const newDetector: Detector = {
			field: "demand",
			operator: "eq",
			target: { type: "static", value: 0 },
		};
		emitUpdate([...props.group.conditions, newDetector]);
	};

	const addSubGroup = () => {
		const newGroup: RuleGroupType = {
			operator: "AND",
			conditions: [],
		};
		emitUpdate([...props.group.conditions, newGroup]);
	};

	const removeChild = (index: number) => {
		const newConditions = [...props.group.conditions];
		newConditions.splice(index, 1);
		emitUpdate(newConditions);
	};

	const updateChild = (
		index: number,
		updatedItem: Detector | RuleGroupType
	) => {
		const newConditions = [...props.group.conditions];
		newConditions[index] = updatedItem;
		emitUpdate(newConditions);
	};
</script>

<template>
	<div class="pl-6 border-l border-prunplanner my-2 relative">
		<div class="flex items-center gap-4 mb-4">
			<PButtonGroup>
				<PButton
					v-for="op in ['AND', 'OR'] as const"
					:key="op"
					:type="group.operator === op ? 'primary' : 'secondary'"
					@click="emit('update:group', { ...group, operator: op })">
					{{ op }}
				</PButton>
			</PButtonGroup>

			<div class="flex gap-2">
				<PButton @click="addCondition">
					<template #icon><PlusSharp /></template>
					Condition
				</PButton>
				<PButton @click="addSubGroup">
					<template #icon><PlusSharp /></template>
					Group
				</PButton>
				<PButton type="error" @click="emit('remove')">
					<template #icon><ClearSharp /></template>
					Remove
				</PButton>
			</div>
		</div>

		<div class="space-y-1">
			<div v-for="(item, index) in group.conditions" :key="index">
				<RuleGroup
					v-if="isRuleGroup(item)"
					:group="item"
					@update:group="(val) => updateChild(index, val)"
					@remove="removeChild(index)" />

				<DetectorRow
					v-else-if="isDetector(item)"
					:model-value="item"
					@update:model-value="(val) => updateChild(index, val)"
					@remove="removeChild(index)" />

				<div
					v-else
					class="p-2 border border-red-200 bg-red-50 text-red-500 text-[10px]">
					Error: {{ JSON.stringify(item) }}
				</div>
			</div>

			<div
				v-if="group.conditions.length === 0"
				class="text-[10px] text-slate-400 italic pl-2">
				Empty Group
			</div>
		</div>
	</div>
</template>
