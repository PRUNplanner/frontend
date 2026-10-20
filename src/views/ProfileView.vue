<script setup lang="ts">
	import { useHead } from "@unhead/vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	useHead({
		title: t("profile.view_title"),
	});

	// Components
	import WrapperPlanningDataLoader from "@/features/wrapper/components/WrapperPlanningDataLoader.vue";
	import HelpDrawer from "@/features/help/components/HelpDrawer.vue";
	import ProfileSection from "@/features/profile/components/ProfileSection.vue";
	import FIOConnection from "@/features/profile/components/FIOConnection.vue";
	import ProfileEmail from "@/features/profile/components/ProfileEmail.vue";
	import ChangePassword from "@/features/profile/components/ChangePassword.vue";
	import UserPreferences from "@/features/profile/components/UserPreferences.vue";
	import StorageData from "@/features/profile/components/StorageData.vue";
</script>

<template>
	<WrapperPlanningDataLoader empire-list plan-list load-c-x>
		<template #default>
			<div class="min-h-screen">
				<div
					class="px-6 py-3 border-b border-line flex flex-row flex-wrap gap-x-6 gap-y-2 justify-between">
					<h1 class="text-2xl font-bold">
						{{ $t("profile.title") }}
					</h1>
					<HelpDrawer file-name="profile" />
				</div>

				<ProfileSection
					id="fio"
					class="scroll-mt-4"
					:title="t('profile.sections.fio.title')"
					:description="t('profile.sections.fio.description')">
					<FIOConnection />
				</ProfileSection>
				<ProfileSection
					:title="t('profile.sections.account.title')"
					:description="t('profile.change_profile.form.email_info')">
					<ProfileEmail />
					<ChangePassword />
				</ProfileSection>
				<ProfileSection
					:title="t('profile.preferences.title')"
					:description="t('profile.preferences.description')">
					<UserPreferences />
				</ProfileSection>
				<ProfileSection
					:title="t('profile.storage_data.title')"
					:description="t('profile.storage_data.description')">
					<StorageData />
				</ProfileSection>
			</div>
		</template>
	</WrapperPlanningDataLoader>
</template>
