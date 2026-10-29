<script setup lang="ts">
	import { toRaw } from "vue";

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
	import PNotice from "@/ui/components/PNotice.vue";
	import { PlusSharp, ClearSharp } from "@vicons/material";

	const props = defineProps<{
		group: RuleGroupType;
	}>();

	const emit = defineEmits<{
		remove: [];
		"update:group": [value: RuleGroupType];
	}>();

	// a key per condition object, not its index: deleting a row must not hand
	// its component (and its inputs) to the next one. Raw objects: the draft
	// is a deep ref, so a stored condition comes back as a new proxy
	const ids = new WeakMap<Detector | RuleGroupType, number>();
	let nextId = 0;
	const keyOf = (item: Detector | RuleGroupType): number => {
		let id = ids.get(toRaw(item));
		if (id === undefined) ids.set(toRaw(item), (id = nextId++));
		return id;
	};

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
		// an edited condition keeps its row
		ids.set(toRaw(updatedItem), keyOf(newConditions[index]));
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
					:pressed="group.operator === op"
					@click="emit('update:group', { ...group, operator: op })">
					{{ op }}
				</PButton>
			</PButtonGroup>

			<div class="flex gap-2">
				<PButton @click="addCondition">
					<template #icon><PlusSharp /></template>

					{{
						$t(
							"market_live.components.rule_builder.buttons.add_condition"
						)
					}}
				</PButton>
				<PButton @click="addSubGroup">
					<template #icon><PlusSharp /></template>
					{{
						$t(
							"market_live.components.rule_builder.buttons.add_group"
						)
					}}
				</PButton>
				<PButton type="error" @click="emit('remove')">
					<template #icon><ClearSharp /></template>
					{{
						$t("market_live.components.rule_builder.buttons.remove")
					}}
				</PButton>
			</div>
		</div>

		<div class="space-y-1">
			<div
				v-for="(item, index) in group.conditions"
				:key="keyOf(item)">
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

				<PNotice v-else type="error" class="text-xs">
					{{
						$t("market_live.components.rule_builder.error", {
							value: JSON.stringify(item),
						})
					}}
				</PNotice>
			</div>

			<div
				v-if="group.conditions.length === 0"
				class="text-xs text-slate-400 italic pl-2">
				{{ $t("market_live.components.rule_builder.empty") }}
			</div>
		</div>
	</div>
</template>
