<script setup lang="ts"></script>

<template>
	<div class="flex flex-col gap-3 text-sm">
		<i18n-t keypath="profile.fio_information.help.p1" tag="p">
			<template #link>
				<a
					href="https://fio.fnar.net/"
					target="_blank"
					class="text-link underline">
					{{ $t("profile.fio_information.links.browser_extension") }}
				</a>
			</template>
		</i18n-t>

		<ol class="pl-6 list-decimal flex flex-col gap-1">
			<i18n-t keypath="profile.fio_information.help.steps.1" tag="li">
				<template #link>
					<a
						href="https://fio.fnar.net/"
						target="_blank"
						class="text-link underline">
						{{ $t("profile.fio_information.links.fio_extension") }}
					</a>
				</template>
			</i18n-t>

			<li>{{ $t("profile.fio_information.help.steps.2") }}</li>

			<i18n-t keypath="profile.fio_information.help.steps.3" tag="li">
				<template #link>
					<a
						href="https://fio.fnar.net/settings"
						target="_blank"
						class="text-link underline">
						{{ $t("profile.fio_information.links.settings_short") }}
					</a>
				</template>
			</i18n-t>

			<li>{{ $t("profile.fio_information.help.steps.4") }}</li>
			<li>{{ $t("profile.fio_information.help.steps.5") }}</li>
		</ol>

		<i18n-t
			keypath="profile.fio_information.help.refined_prun"
			tag="p"
			class="text-muted">
			<template #link>
				<a
					href="https://github.com/refined-prun/refined-prun"
					target="_blank"
					class="text-link underline">
					{{ $t("profile.fio_information.links.refined_prun") }}
				</a>
			</template>
		</i18n-t>
	</div>
</template>
