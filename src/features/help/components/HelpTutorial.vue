<script setup lang="ts">
	/**
	 * Help page intro: getting started steps, core concepts and key features
	 *
	 * @author jplacht
	 */
	const steps: { key: string; to?: string }[] = [
		{ key: "l1", to: "/manage" },
		{ key: "l2", to: "/manage" },
		{ key: "l3", to: "/search" },
		{ key: "l4" },
		{ key: "l5" },
	];
	const concepts = ["p1", "p2", "p3"];
	const features = ["p1", "p2", "p3", "p4", "p5"];
</script>

<template>
	<div class="@container flex flex-col gap-12 max-w-5xl">
		<p class="text-lg leading-relaxed text-ink-strong max-w-3xl">
			{{ $t("help.tutorial.intro") }}
		</p>

		<section>
			<h2 class="text-lg font-bold mb-4">
				{{ $t("help.getting_started.title") }}
			</h2>
			<div
				class="grid grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] gap-8 items-start">
				<ol class="flex flex-col gap-5">
					<li
						v-for="(step, i) in steps"
						:key="step.key"
						class="flex gap-3">
						<span
							class="flex items-center justify-center size-7 shrink-0 rounded-full bg-prunplanner/10 text-prunplanner text-sm font-bold tabular-nums"
							aria-hidden="true">
							{{ i + 1 }}
						</span>
						<div class="pt-0.5">
							<i18n-t
								v-if="step.to"
								:keypath="`help.getting_started.${step.key}.title`"
								tag="div"
								class="font-bold text-ink-strong">
								<template #link>
									<RouterLink
										:to="step.to"
										class="text-link-primary hover:underline">
										{{
											$t(
												`help.getting_started.${step.key}.link`
											)
										}}
									</RouterLink>
								</template>
							</i18n-t>
							<div v-else class="font-bold text-ink-strong">
								{{ $t(`help.getting_started.${step.key}.title`) }}
							</div>
							<p class="mt-1 leading-relaxed text-muted-strong">
								{{ $t(`help.getting_started.${step.key}.p`) }}
							</p>
						</div>
					</li>
				</ol>
				<figure class="max-w-xl">
					<img
						src="/images/help/management-screenshot.png"
						:alt="$t('help.getting_started.image_alt')"
						class="w-full rounded-md border border-line shadow-lg" />
					<figcaption class="mt-2 text-xs text-muted">
						{{ $t("help.getting_started.image_label") }}
					</figcaption>
				</figure>
			</div>
		</section>

		<section>
			<h2 class="text-lg font-bold mb-4">
				{{ $t("help.core_concepts.title") }}
			</h2>
			<div class="grid grid-cols-1 @xl:grid-cols-3 gap-3">
				<div
					v-for="c in concepts"
					:key="c"
					class="flex flex-col gap-1.5 p-4 rounded-md border border-line bg-surface">
					<h3 class="font-bold text-ink-strong">
						{{ $t(`help.core_concepts.${c}.title`) }}
					</h3>
					<p class="text-sm leading-relaxed text-muted-strong">
						{{ $t(`help.core_concepts.${c}.p`) }}
					</p>
				</div>
			</div>
		</section>

		<section>
			<h2 class="text-lg font-bold mb-4">
				{{ $t("help.key_features.title") }}
			</h2>
			<div class="grid grid-cols-1 @xl:grid-cols-2 gap-x-10 gap-y-6">
				<div v-for="f in features" :key="f">
					<h3 class="font-bold text-ink-strong mb-1">
						{{ $t(`help.key_features.${f}.title`) }}
					</h3>
					<p class="text-sm leading-relaxed text-muted-strong">
						{{ $t(`help.key_features.${f}.p`) }}
					</p>
				</div>
			</div>
		</section>
	</div>
</template>
