<script setup lang="ts">
	import { useHead } from "@unhead/vue";

	useHead({
		title: "Email Verification | PRUNplanner",
	});

	defineProps({
		verifyCode: {
			type: String,
			required: false,
			default: null,
		},
	});

	import VerifyEmailComponent from "@/features/account/components/VerifyEmailComponent.vue";
</script>

<template>
	<div class="flex justify-center items-center p-10">
		<div class="w-100 py-2 px-4 border border-white/10">
			<VerifyEmailComponent :verify-code="verifyCode" />
		</div>
	</div>
</template>
