<script setup lang="ts"></script>

<template>
	<div>
		<h2 class="grow my-auto text-white/80 font-bold text-lg pb-3">
			{{ $t("profile.fio_information.title") }}
		</h2>

		<div class="flex flex-col gap-y-3">
			<i18n-t keypath="profile.fio_information.help.p1" tag="p">
				<template #link>
					<a
						href="https://fio.fnar.net/"
						target="_blank"
						class="text-link-primary underline">
						{{
							$t(
								"profile.fio_information.links.browser_extension"
							)
						}}
					</a>
				</template>
			</i18n-t>

			<p>{{ $t("profile.fio_information.help.p2") }}</p>
			<i18n-t keypath="profile.fio_information.help.p3" tag="p">
				<template #link>
					<a
						href="https://fio.fnar.net/"
						target="_blank"
						class="text-link-primary underline">
						{{ $t("profile.fio_information.links.fio_website") }}
					</a>
				</template>
			</i18n-t>
			<i18n-t keypath="profile.fio_information.help.p4" tag="p">
				<template #link>
					<a
						href="https://fio.fnar.net/settings"
						target="_blank"
						class="text-link-primary underline">
						{{ $t("profile.fio_information.links.fio_settings") }}
					</a>
				</template>
			</i18n-t>
			<p>{{ $t("profile.fio_information.help.p5") }}</p>

			<h2 class="text-white/80 font-bold text-lg">
				{{ $t("profile.fio_information.help.title") }}
			</h2>

			<ul class="pl-6 list-decimal">
				<i18n-t keypath="profile.fio_information.help.steps.1" tag="li">
					<template #link>
						<a
							href="https://fio.fnar.net/"
							target="_blank"
							class="text-link-primary underline">
							{{
								$t(
									"profile.fio_information.links.fio_extension"
								)
							}}
						</a>
					</template>
				</i18n-t>

				<li>{{ $t("profile.fio_information.help.steps.2") }}</li>

				<i18n-t keypath="profile.fio_information.help.steps.3" tag="li">
					<template #link>
						<a
							href="https://fio.fnar.net/settings"
							target="_blank"
							class="text-link-primary underline">
							{{
								$t(
									"profile.fio_information.links.settings_short"
								)
							}}
						</a>
					</template>
				</i18n-t>

				<li>{{ $t("profile.fio_information.help.steps.4") }}</li>
				<li>{{ $t("profile.fio_information.help.steps.5") }}</li>
			</ul>

			<i18n-t keypath="profile.fio_information.help.refined_prun" tag="p">
				<template #link>
					<a
						href="https://github.com/refined-prun/refined-prun"
						target="_blank"
						class="text-link-primary underline">
						{{ $t("profile.fio_information.links.refined_prun") }}
					</a>
				</template>
			</i18n-t>
		</div>
	</div>
</template>
