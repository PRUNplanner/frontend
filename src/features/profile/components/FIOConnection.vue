<script setup lang="ts">
	import { computed, reactive, watch, type Ref, ref, onMounted } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();
	const toast = useToast();

	// API
	import { useQuery } from "@/lib/query_cache/useQuery";

	// Composables
	import { trackEvent, reportError } from "@/lib/analytics/useAnalytics";
	import { isApiError } from "@/lib/apiError";

	// Stores
	import { useUserStore } from "@/stores/userStore";

	// Util
	import { relativeFromDate } from "@/util/date";

	// Components
	import FIOInformation from "@/features/profile/components/FIOInformation.vue";

	// UI
	import { PForm, PFormItem, PInput, PButton, useToast } from "@/ui";

	const userStore = useUserStore();

	// local copy of the FIO fields
	const localFIO = reactive({
		fio_apikey: userStore.profile?.fio_apikey ?? null,
		prun_username: userStore.profile?.prun_username ?? null,
	});
	const isUpdating: Ref<boolean> = ref(false);
	// the form matches the stored profile (an emptied field counts as null)
	const wasSaved = computed(
		() =>
			(localFIO.fio_apikey || null) ===
				(userStore.profile?.fio_apikey ?? null) &&
			(localFIO.prun_username || null) ===
				(userStore.profile?.prun_username ?? null)
	);
	const isThrottled: Ref<boolean> = ref(false);

	// backend error codes per FIO field, shown under the field
	type FIOField = "fio_apikey" | "prun_username";
	const KNOWN_ERRORS = [
		"fio_required",
		"fio_invalid_key",
		"fio_username_mismatch",
	];
	const fioErrors: Ref<Partial<Record<FIOField, string>>> = ref({});
	const fioConnected: Ref<boolean> = ref(false);
	// until the first refresh replaces it with the real status
	const showConnected = computed(
		() => fioConnected.value && userStore.fioStatus === "syncing"
	);

	const fioStatusText = computed(() =>
		t(`profile.change_profile.fio_status.${userStore.fioStatus}`, {
			time: relativeFromDate(
				userStore.profile?.fio_last_refreshed_at
					? new Date(userStore.profile.fio_last_refreshed_at)
					: undefined
			),
		})
	);

	function errorText(code: string): string {
		return t(
			`profile.change_profile.fio_errors.${KNOWN_ERRORS.includes(code) ? code : "unknown"}`
		);
	}

	watch(
		() => userStore.profile,
		(newProfile) =>
			Object.assign(localFIO, {
				fio_apikey: newProfile?.fio_apikey ?? null,
				prun_username: newProfile?.prun_username ?? null,
			})
	);

	onMounted(() => userStore.performGetProfile());

	async function patchProfile(): Promise<void> {
		if (isUpdating.value) return;

		const fioApiKey = localFIO.fio_apikey?.replace(/ /g, "") ?? null;

		// detect if user has fio enabled
		const userHasFIO: boolean = !!(fioApiKey && localFIO.prun_username);
		const userHadFIO: boolean = !!(
			userStore.profile?.fio_apikey && userStore.profile?.prun_username
		);

		const fioChanged: boolean =
			fioApiKey !== (userStore.profile?.fio_apikey ?? null) ||
			(localFIO.prun_username ?? null) !==
				(userStore.profile?.prun_username ?? null);

		isUpdating.value = true;
		fioErrors.value = {};
		fioConnected.value = false;
		isThrottled.value = false;

		try {
			await useQuery("PatchUserProfile", {
				fio_apikey: fioApiKey,
				prun_username: localFIO.prun_username ?? null,
				email: userStore.profile?.email ?? null,
			}).execute();

			if (userHasFIO && !userHadFIO) trackEvent("account:fio_link");
			fioConnected.value = userHasFIO && fioChanged;
		} catch (err) {
			reportError(err);
			const data = isApiError(err) ? err.responseData : undefined;
			isThrottled.value = isApiError(err) && err.status === 429;
			// DRF field errors: { field: [code] }
			for (const field of ["fio_apikey", "prun_username"] as const) {
				const messages =
					data && typeof data === "object"
						? (data as Record<string, unknown>)[field]
						: undefined;
				if (Array.isArray(messages) && typeof messages[0] === "string")
					fioErrors.value[field] = messages[0];
			}
			const reason =
				fioErrors.value.fio_apikey ?? fioErrors.value.prun_username;
			if (reason) trackEvent("account:fio_link_failed", { reason });
			else if (!isThrottled.value)
				toast(t("common.ui.save_failed"), { type: "error" });
		} finally {
			isUpdating.value = false;
		}
	}
</script>

<template>
	<div
		class="text-sm"
		:class="{
			'text-positive': showConnected || userStore.fioStatus === 'ok',
			'text-negative':
				!showConnected &&
				['invalid_credentials', 'error'].includes(userStore.fioStatus),
		}"
		role="status"
		data-testid="fio-status">
		{{
			showConnected
				? t("profile.change_profile.fio_connected")
				: fioStatusText
		}}
	</div>
	<PForm class="!grid-cols-[10rem_minmax(0,1fr)]">
		<PFormItem :label="t('profile.change_profile.form.prun_username')">
			<PInput
				v-model:value="localFIO.prun_username"
				autocomplete="off"
				class="w-full max-w-sm" />
			<template v-if="fioErrors.prun_username" #info>
				<span class="text-negative" role="alert">
					{{ errorText(fioErrors.prun_username) }}
				</span>
			</template>
		</PFormItem>
		<PFormItem :label="t('profile.change_profile.form.fio_apikey')">
			<PInput
				v-model:value="localFIO.fio_apikey"
				type="password"
				autocomplete="off"
				class="w-full max-w-sm" />
			<template v-if="fioErrors.fio_apikey" #info>
				<span class="text-negative" role="alert">
					{{ errorText(fioErrors.fio_apikey) }}
				</span>
			</template>
		</PFormItem>
	</PForm>
	<div v-if="isThrottled" class="text-sm text-negative" role="alert">
		{{ $t("profile.change_profile.throttled") }}
	</div>
	<PButton
		class="self-start"
		:loading="isUpdating"
		:disabled="isUpdating"
		:type="wasSaved ? 'secondary' : 'primary'"
		@click="patchProfile">
		{{ $t("profile.buttons.save") }}
	</PButton>
	<details class="group" :open="userStore.fioStatus === 'none'">
		<summary class="cursor-pointer text-link hover:underline w-fit">
			{{ $t("profile.fio_information.guide") }}
		</summary>
		<FIOInformation class="pt-3" />
	</details>
</template>
