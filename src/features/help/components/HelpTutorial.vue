<script setup lang="ts"></script>

<template>
	<div class="flex flex-col gap-y-6">
		<section class="bg-white/10 p-3 rounded">
			{{ $t("help.tutorial.intro") }}
		</section>

		<section>
			<div
				class="grid grid-cols-1 xl:grid-cols-[60%_auto] gap-3 gap-x-10">
				<div>
					<h2 class="text-lg font-bold mb-3">
						{{ $t("help.getting_started.title") }}
					</h2>
					<ol class="list-decimal space-y-2 pl-4">
						<li>
							<strong>
								<i18n-t
									keypath="help.getting_started.l1.title"
									tag="span">
									<template #link>
										<router-link
											to="/manage"
											class="text-link-primary">
											{{
												$t(
													"help.getting_started.l1.link"
												)
											}}</router-link
										>
									</template>
								</i18n-t>
							</strong>
							{{ $t("help.getting_started.l1.p") }}
						</li>
						<li>
							<strong>
								<i18n-t
									keypath="help.getting_started.l2.title"
									tag="span">
									<template #link>
										<router-link
											to="/manage"
											class="text-link-primary">
											{{
												$t(
													"help.getting_started.l2.link"
												)
											}}</router-link
										>
									</template>
								</i18n-t>
							</strong>
							{{ $t("help.getting_started.l2.p") }}
						</li>
						<li>
							<strong>
								<i18n-t
									keypath="help.getting_started.l3.title"
									tag="span">
									<template #link>
										<router-link
											to="/search"
											class="text-link-primary">
											{{
												$t(
													"help.getting_started.l3.link"
												)
											}}</router-link
										>
									</template>
								</i18n-t>
							</strong>
							{{ $t("help.getting_started.l3.p") }}
						</li>
						<li>
							<strong>
								{{ $t("help.getting_started.l4.title") }}
							</strong>
							{{ $t("help.getting_started.l4.p") }}
						</li>
						<li>
							<strong>
								{{ $t("help.getting_started.l5.title") }}
							</strong>
							{{ $t("help.getting_started.l5.p") }}
						</li>
					</ol>
				</div>
				<div class="flex flex-col justify-center gap-y-3">
					<div class="text-end">
						<img
							src="/images/help/management-screenshot.png"
							alt="Management Screenshot"
							class="rounded shadow-lg border border-white/10" />
						<span class="text-xs text-white/60">
							{{ $t("help.getting_started.image_label") }}
						</span>
					</div>
				</div>
			</div>
		</section>

		<section>
			<div class="grid grid-cols-1 xl:grid-cols-[30%_auto] gap-3 gap-x-6">
				<div>
					<div class="bg-white/10 rounded p-3">
						<h2 class="text-lg font-bold mb-3">
							{{ $t("help.core_concepts.title") }}
						</h2>
						<div class="space-y-6">
							<div>
								<h3 class="text-lg mb-1">
									{{ $t("help.core_concepts.p1.title") }}
								</h3>
								<p class="text-white/80">
									{{ $t("help.core_concepts.p1.p") }}
								</p>
							</div>
							<div>
								<h3 class="text-lg mb-1">
									{{ $t("help.core_concepts.p2.title") }}
								</h3>
								<p class="text-white/80">
									{{ $t("help.core_concepts.p2.p") }}
								</p>
							</div>
							<div>
								<h3 class="text-lg mb-1">
									{{ $t("help.core_concepts.p3.title") }}
								</h3>
								<p class="text-white/80">
									{{ $t("help.core_concepts.p3.p") }}
								</p>
							</div>
						</div>
					</div>
				</div>
				<div class="p-3">
					<h2 class="text-lg font-bold mb-3">
						{{ $t("help.key_features.title") }}
					</h2>
					<div class="space-y-6">
						<div>
							<h3 class="text-lg">
								{{ $t("help.key_features.p1.title") }}
							</h3>
							<p class="text-white/80">
								{{ $t("help.key_features.p1.p") }}
							</p>
						</div>
						<div>
							<h3 class="text-lg">
								{{ $t("help.key_features.p2.title") }}
							</h3>
							<p class="text-white/80">
								{{ $t("help.key_features.p2.p") }}
							</p>
						</div>
						<div>
							<h3 class="text-lg">
								{{ $t("help.key_features.p3.title") }}
							</h3>
							<p class="text-white/80">
								{{ $t("help.key_features.p3.p") }}
							</p>
						</div>
						<div>
							<h3 class="text-lg">
								{{ $t("help.key_features.p4.title") }}
							</h3>
							<p class="text-white/80">
								{{ $t("help.key_features.p4.p") }}
							</p>
						</div>
						<div>
							<h3 class="text-lg">
								{{ $t("help.key_features.p5.title") }}
							</h3>
							<p class="text-white/80">
								{{ $t("help.key_features.p5.p") }}
							</p>
						</div>
					</div>
				</div>
			</div>
		</section>
	</div>
</template>
