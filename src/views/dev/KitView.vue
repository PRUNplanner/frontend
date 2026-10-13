<script setup lang="ts">
	import { computed, type Ref, ref } from "vue";

	// Unhead
	import { useHead } from "@unhead/vue";

	// Types & Interfaces
	import type {
		ButtonColorKey,
		ColorKey,
		PDataTableColumn,
		PDropdownOption,
		PSelectOption,
		SizeKey,
	} from "@/ui/ui.types";

	// UI
	import {
		PButton,
		PButtonGroup,
		PCheckbox,
		PDataTable,
		PDrawer,
		PDropdown,
		PForm,
		PFormItem,
		PFormSeparator,
		PIcon,
		PInput,
		PInputNumber,
		PModal,
		PPopover,
		PProgressBar,
		PSelect,
		PSelectMultiple,
		PSpin,
		PTable,
		PTag,
		PTooltip,
		PValue,
		useConfirm,
		useToast,
	} from "@/ui";
	import { InfoOutlined, SaveSharp } from "@vicons/material";

	/**
	 * Every kit component in every size, type and state, to check the kit by
	 * eye, keyboard and touch, and for the UI audit. Dev server and e2e
	 * builds only (VITE_KIT_PAGE), so its text isn't translated.
	 *
	 * @author jplacht
	 */
	useHead({ title: "UI kit | PRUNplanner" });

	const sizes: SizeKey[] = ["md", "sm"];
	const buttonTypes: ButtonColorKey[] = [
		"primary",
		"secondary",
		"success",
		"warning",
		"error",
		"ghost",
	];
	const tagTypes: ColorKey[] = [
		"primary",
		"secondary",
		"success",
		"warning",
		"error",
	];

	const text: Ref<string | null> = ref("Text");
	const empty: Ref<string | null> = ref(null);
	const amount: Ref<number | null> = ref(5);
	const checked = ref(true);
	const unchecked = ref(false);

	const options: PSelectOption[] = [
		{ label: "Antares I", value: "AI1", badge: "AI1" },
		{ label: "Benton", value: "CI1", badge: "CI1" },
		{ label: "Hortus", value: "IC1", badge: "IC1" },
		{ label: "Moria", value: "NC1", badge: "NC1" },
	];
	const groupOptions: PSelectOption[] = [
		{
			label: "Metals",
			value: undefined,
			children: [
				{ label: "Aluminium", value: "AL" },
				{ label: "Iron", value: "FE" },
			],
		},
		{
			label: "Gases",
			value: undefined,
			children: [
				{ label: "Oxygen", value: "O" },
				{ label: "Nitrogen", value: "N" },
			],
		},
	];
	const single: Ref<string | number | null | undefined> = ref("AI1");
	const singleEmpty: Ref<string | number | null | undefined> = ref(null);
	const multiple: Ref<(string | number | null | undefined)[]> = ref([
		"AI1",
		"IC1",
	]);

	const dropdownOptions: PDropdownOption[] = [
		{ key: "save", label: "Save", icon: SaveSharp },
		{ key: "copy", label: "Copy", hint: "Makes a new plan" },
		{ type: "divider" },
		{ key: "delete", label: "Delete", danger: true },
	];

	const showPopover = ref(false);
	const showModal = ref(false);
	const showDrawer = ref(false);

	const confirm = useConfirm();
	const toast = useToast();

	interface IKitRow {
		ticker: string;
		amount: number;
		delta: number;
	}
	const rows: IKitRow[] = Array.from({ length: 12 }, (_, i) => ({
		ticker: ["AL", "FE", "O", "N", "H2O", "RAT"][i % 6] + i,
		amount: (i * 37) % 101,
		delta: ((i * 13) % 21) - 10,
	}));
	const columns = computed<PDataTableColumn<IKitRow>[]>(() => [
		{ key: "ticker", title: "Ticker", sorter: true },
		{ key: "amount", title: "Amount", align: "right", sorter: true },
		{ key: "delta", title: "Delta", align: "right", sorter: true },
	]);
</script>

<template>
	<div class="min-h-screen flex flex-col">
		<div class="px-6 py-3 border-b border-white/10">
			<h1 class="text-2xl font-bold my-auto">UI kit</h1>
		</div>

		<div class="px-6 py-3 flex flex-col gap-6">
			<section>
				<h2 class="text-lg font-bold pb-3">PButton</h2>
				<div class="flex flex-col gap-3">
					<div
						v-for="size in sizes"
						:key="size"
						class="flex flex-wrap items-center gap-3">
						<PButton
							v-for="type in buttonTypes"
							:key="type"
							:type="type"
							:size="size">
							{{ type }} {{ size }}
						</PButton>
						<PButton :size="size" type="secondary" disabled>
							disabled
						</PButton>
						<PButton :size="size" loading>loading</PButton>
						<PButton :size="size" type="secondary" aria-label="Save">
							<template #icon><SaveSharp /></template>
						</PButton>
					</div>
					<div class="flex flex-wrap items-center gap-3">
						<PButtonGroup>
							<PButton type="secondary">Left</PButton>
							<PButton type="secondary">Middle</PButton>
							<PButton type="secondary">Right</PButton>
						</PButtonGroup>
					</div>
				</div>
			</section>

			<section>
				<h2 class="text-lg font-bold pb-3">Fields</h2>
				<div
					v-for="size in sizes"
					:key="size"
					class="flex flex-wrap items-center gap-3 pb-3">
					<PInput
						v-model:value="text"
						:size="size"
						:aria-label="`Text ${size}`"
						class="w-40" />
					<PInput
						v-model:value="empty"
						:size="size"
						:aria-label="`Empty ${size}`"
						class="w-40" />
					<PInputNumber
						v-model:value="amount"
						:size="size"
						:aria-label="`Amount ${size}`"
						class="w-32" />
					<PInputNumber
						v-model:value="amount"
						:size="size"
						show-buttons
						:aria-label="`Amount with buttons ${size}`"
						class="w-32" />
					<PSelect
						v-model:value="single"
						:options="options"
						:size="size"
						:aria-label="`Exchange ${size}`"
						class="w-40" />
					<PSelectMultiple
						v-model:value="multiple"
						:options="options"
						:size="size"
						:aria-label="`Exchanges ${size}`"
						class="w-56" />
					<PButton :size="size" type="secondary">Button</PButton>
					<PCheckbox v-model:checked="checked" :size="size">
						Checked
					</PCheckbox>
					<PCheckbox v-model:checked="unchecked" :size="size">
						Unchecked
					</PCheckbox>
					<PCheckbox v-model:checked="unchecked" :size="size" indeterminate>
						Some
					</PCheckbox>
				</div>
				<div class="flex flex-wrap items-center gap-3 pb-3">
					<PInput
						v-model:value="text"
						disabled
						aria-label="Disabled text"
						class="w-40" />
					<PInputNumber
						v-model:value="amount"
						disabled
						show-buttons
						aria-label="Disabled amount"
						class="w-32" />
					<PSelect
						v-model:value="single"
						:options="options"
						disabled
						aria-label="Disabled exchange"
						class="w-40" />
					<PCheckbox v-model:checked="checked" disabled>
						Disabled
					</PCheckbox>
					<PInput
						v-model:value="text"
						type="password"
						aria-label="Password"
						class="w-40" />
				</div>
				<div class="flex flex-wrap items-start gap-3">
					<PSelect
						v-model:value="singleEmpty"
						:options="groupOptions"
						searchable
						clearable
						aria-label="Material, searchable"
						class="w-48" />
					<PSelectMultiple
						v-model:value="multiple"
						:options="options"
						searchable
						clearable
						aria-label="Exchanges"
						class="w-72" />
					<PInput
						v-model:value="text"
						type="textarea"
						:rows="3"
						aria-label="Notes"
						class="w-60" />
				</div>
			</section>

			<section class="max-w-lg">
				<h2 class="text-lg font-bold pb-3">PForm</h2>
				<PForm>
					<PFormItem label="Name">
						<PInput v-model:value="text" />
					</PFormItem>
					<PFormItem label="Amount">
						<PInputNumber v-model:value="amount" show-buttons />
						<template #info>Between 0 and 100.</template>
					</PFormItem>
					<PFormSeparator>
						<div class="border-t border-white/10 my-2" />
					</PFormSeparator>
					<PFormItem label="Exchange">
						<PSelect v-model:value="single" :options="options" />
					</PFormItem>
					<PFormItem label="Active">
						<PCheckbox v-model:checked="checked" />
					</PFormItem>
				</PForm>
			</section>

			<section>
				<h2 class="text-lg font-bold pb-3">PTag</h2>
				<div
					v-for="size in sizes"
					:key="size"
					class="flex flex-wrap items-center gap-3 pb-3">
					<PTag
						v-for="type in tagTypes"
						:key="type"
						:type="type"
						:size="size"
						:value="`${type} ${size}`" />
				</div>
			</section>

			<section>
				<h2 class="text-lg font-bold pb-3">Overlays</h2>
				<div class="flex flex-wrap items-center gap-3">
					<PTooltip>
						<template #trigger>
							<PIcon :size="20"><InfoOutlined /></PIcon>
						</template>
						Tooltip on an icon
					</PTooltip>
					<PTooltip>
						<template #trigger>
							<PButton type="secondary">Tooltip on a button</PButton>
						</template>
						The button keeps its own name
					</PTooltip>
					<PPopover v-model:show="showPopover">
						<template #trigger>
							<PButton type="secondary">Popover</PButton>
						</template>
						<div class="flex flex-col gap-3 w-60">
							<p>A select inside a popover:</p>
							<PSelect
								v-model:value="single"
								:options="options"
								aria-label="Exchange in popover" />
						</div>
					</PPopover>
					<PDropdown :options="dropdownOptions">
						<PButton type="secondary">Dropdown</PButton>
					</PDropdown>
					<PButton type="secondary" @click="showModal = true">
						Modal
					</PButton>
					<PButton type="secondary" @click="showDrawer = true">
						Drawer
					</PButton>
					<PButton
						type="secondary"
						@click="
							confirm({
								title: 'Delete plan',
								content: 'This deletes the plan.',
								positiveText: 'Delete',
								negativeText: 'Cancel',
							})
						">
						Confirm
					</PButton>
					<PButton type="secondary" @click="toast('Plan saved')">
						Toast
					</PButton>
					<PButton
						type="secondary"
						@click="toast('Saving failed', { type: 'error' })">
						Error toast
					</PButton>
					<PButton
						type="secondary"
						@click="
							toast('Plan deleted', {
								action: { label: 'Undo', onClick: () => {} },
								closable: true,
							})
						">
						Toast with action
					</PButton>
				</div>
				<PModal v-model:show="showModal" title="Modal">
					<div class="flex flex-col gap-3">
						<p>A select inside a modal:</p>
						<PSelect
							v-model:value="single"
							:options="options"
							aria-label="Exchange in modal" />
					</div>
					<template #action>
						<div class="flex justify-end gap-3">
							<PButton type="secondary" @click="showModal = false">
								Cancel
							</PButton>
							<PButton @click="showModal = false">Save</PButton>
						</div>
					</template>
				</PModal>
				<PDrawer v-model:show="showDrawer" title="Drawer" :width="400">
					<div class="flex flex-col gap-3">
						<p>A select inside a drawer:</p>
						<PSelect
							v-model:value="single"
							:options="groupOptions"
							searchable
							aria-label="Material in drawer" />
					</div>
				</PDrawer>
			</section>

			<section>
				<h2 class="text-lg font-bold pb-3">Status</h2>
				<div class="flex flex-wrap items-center gap-6">
					<PSpin size="xs" />
					<PSpin />
					<PSpin size="lg" />
					<PSpin size="xl" />
					<div class="w-60"><PProgressBar :step="3" :total="8" /></div>
					<PValue :value="1234.5" />
					<PValue :value="-42" arrow />
					<PValue :value="0" />
				</div>
			</section>

			<section class="flex flex-wrap gap-6">
				<div>
					<h2 class="text-lg font-bold pb-3">PTable</h2>
					<PTable striped>
						<thead>
							<tr>
								<th>Ticker</th>
								<th class="numeric">Amount</th>
							</tr>
						</thead>
						<tbody>
							<tr v-for="r in rows.slice(0, 4)" :key="r.ticker">
								<td>{{ r.ticker }}</td>
								<td class="numeric">{{ r.amount }}</td>
							</tr>
						</tbody>
					</PTable>
				</div>
				<div class="grow max-w-xl">
					<h2 class="text-lg font-bold pb-3">PDataTable</h2>
					<PDataTable
						:columns="columns"
						:data="rows"
						:row-key="(r: IKitRow) => r.ticker"
						:page-size="5"
						striped>
						<template #cell-delta="{ row }">
							<PValue :value="row.delta" />
						</template>
						<template #expand="{ row }">
							Details of {{ row.ticker }}
						</template>
					</PDataTable>
				</div>
			</section>
		</div>
	</div>
</template>
