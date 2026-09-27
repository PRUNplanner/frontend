<script setup lang="ts">
	import type { PSelectOption } from "../ui.types";

	const {
		option,
		selectedValue,
		highlighted = false,
	} = defineProps<{
		option: PSelectOption;
		selectedValue:
			| Array<null | string | number | undefined>
			| null
			| string
			| number
			| undefined;
		highlighted?: boolean;
	}>();

	const emit = defineEmits<{
		(e: "click", value: string | number | undefined): void;
	}>();

	function isSelected(v: null | string | number | undefined): boolean {
		if (Array.isArray(selectedValue)) return selectedValue.includes(v);
		else return selectedValue === v;
	}
</script>

<template>
	<template v-if="option.children">
		<div
			class="border-t border-b border-white/20 bg-white/5 hover:bg-white/5! font-bold">
			{{ option.label }}
		</div>
		<template
			v-for="child in option.children"
			:key="`${option.value}#${child.value}`">
			<div
				class="flex flex-row items-center"
				:class="[
					highlighted ? 'bg-gray-700' : '',
					isSelected(option.value)
						? 'text-link-primary font-bold'
						: '',
				]"
				@click="emit('click', child.value)">
				<div class="pl-3 grow hover:cursor-pointer">
					{{ child.label }}
				</div>
				<div
					v-if="isSelected(child.value)"
					class="text-white fill-white h-4 w-4">
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
						<g fill="none">
							<path
								d="M14.046 3.486a.75.75 0
												0 1-.032 1.06l-7.93 7.474a.85.85
												0 0
												1-1.188-.022l-2.68-2.72a.75.75 0
												1 1 1.068-1.053l2.234
												2.267l7.468-7.038a.75.75 0 0 1
												1.06.032z"
								fill="currentColor" />
						</g>
					</svg>
				</div>
			</div>
		</template>
	</template>
	<template v-else>
		<div
			class="flex flex-row items-center"
			:class="[
				highlighted ? 'bg-gray-700' : '',
				isSelected(option.value) ? 'text-link-primary font-bold' : '',
			]"
			@click="emit('click', option.value)">
			<div class="grow hover:cursor-pointer">
				{{ option.label }}
			</div>
			<div
				v-if="isSelected(option.value)"
				class="text-white fill-white h-4 w-4">
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
					<g fill="none">
						<path
							d="M14.046 3.486a.75.75 0 0 1-.032 1.06l-7.93 7.474a.85.85 0 0 1-1.188-.022l-2.68-2.72a.75.75 0 1 1 1.068-1.053l2.234 2.267l7.468-7.038a.75.75 0 0 1 1.06.032z"
							fill="currentColor" />
					</g>
				</svg>
			</div>
		</div>
	</template>
</template>
