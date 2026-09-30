<script setup lang="ts">
	import { ref } from "vue";

	// Composables
	import { useQuery } from "@/lib/query_cache/useQuery";
	import { trackEvent } from "@/lib/analytics/useAnalytics";

	// UI
	import { PButton } from "@/ui";
	import { AddSharp } from "@vicons/material";

	const emit = defineEmits<{
		(e: "created", empireUuid: string): void;
	}>();

	const isCreating = ref(false);

	/**
	 * Creates an empire with the signup defaults and assigns the user's
	 * first CX preference, as a new account has
	 * @author jplacht
	 *
	 * @async
	 * @returns {Promise<void>}
	 */
	async function createEmpire(): Promise<void> {
		isCreating.value = true;
		trackEvent("empire:create");

		try {
			const empire = await useQuery("CreateEmpire", {
				data: {
					empire_name: "My Empire",
					empire_faction: "NONE",
					empire_permits_used: 1,
					empire_permits_total: 2,
				},
			}).execute();

			// CreateEmpire can't set a CX; the user has no other empire,
			// so this junction list is complete
			const cxs = await useQuery("GetAllCX").execute();
			if (cxs.length > 0)
				await useQuery("PatchEmpireCXJunctions", {
					junctions: [
						{
							cx_uuid: cxs[0].uuid,
							empires: [{ empire_uuid: empire.uuid }],
						},
					],
				}).execute();

			emit("created", empire.uuid);
		} catch (err) {
			console.error("Error creating empire", err);
		} finally {
			isCreating.value = false;
		}
	}
</script>

<template>
	<section
		class="max-w-2xl m-3 sm:m-6 p-4 sm:p-6 border border-white/10 rounded flex flex-col gap-3">
		<h1 class="text-2xl font-bold">{{ $t("empire.empty.title") }}</h1>
		<p class="text-white/80">{{ $t("empire.empty.text") }}</p>
		<div class="flex flex-row flex-wrap items-center gap-3">
			<PButton :loading="isCreating" @click="createEmpire">
				<template #icon><AddSharp /></template>
				{{ $t("empire.empty.create") }}
			</PButton>
			<router-link
				to="/manage"
				class="text-link-primary hover:underline inline-flex items-center min-h-7 px-1">
				{{ $t("empire.empty.manage") }}
			</router-link>
		</div>
	</section>
</template>
