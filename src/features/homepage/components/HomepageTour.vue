<script setup lang="ts">
	import {
		computed,
		onBeforeUnmount,
		onMounted,
		ref,
		useTemplateRef,
		watch,
	} from "vue";

	// Composables
	import { trackEvent } from "@/lib/analytics/useAnalytics";

	// Components
	import HomepageTourViewport from "@/features/homepage/components/HomepageTourViewport.vue";

	// Types & Interfaces
	import type {
		HomepageTourName,
		IHomepageTourStep,
	} from "@/features/homepage/homepageTour.types";

	const {
		name,
		image,
		alt,
		steps,
		interval = 5000,
		layout,
		reverse = false,
		eager = false,
	} = defineProps<{
		name: HomepageTourName;
		/** file name in public/images/homepage, a 2880 × 1800 webp */
		image: string;
		alt: string;
		steps: IHomepageTourStep[];
		interval?: number;
		/** strip: steps as a row under the image; list: steps beside it */
		layout: "strip" | "list";
		/** list layout: the image left of the steps */
		reverse?: boolean;
		/** the hero image: loaded first, in two sizes */
		eager?: boolean;
	}>();

	const root = useTemplateRef<HTMLElement>("root");

	const index = ref(0);
	// Pause / Play; off from the start with reduced motion
	const playing = ref(true);
	const onScreen = ref(false);
	const tabVisible = ref(true);
	const running = computed(
		() => playing.value && onScreen.value && tabVisible.value
	);
	const active = computed(() => steps[index.value]);

	// a new run restarts the step's progress bar (its key)
	const run = ref(0);
	let timer: ReturnType<typeof setTimeout> | undefined;

	function schedule(): void {
		clearTimeout(timer);
		if (!running.value) return;
		run.value++;
		timer = setTimeout(() => {
			index.value = (index.value + 1) % steps.length;
			schedule();
		}, interval);
	}

	watch(running, schedule);

	function pick(i: number): void {
		index.value = i;
		trackEvent("landing:tour_step", { tour: name, step: steps[i].key });
		schedule();
	}

	function toggle(): void {
		playing.value = !playing.value;
	}

	// the image of a tour below the hero loads once the tour comes near:
	// native lazy loading starts it with the page (within 1250 px or more),
	// where it competes with the landing page's first paint
	const near = ref(eager);
	let nearObserver: IntersectionObserver | undefined;

	let observer: IntersectionObserver | undefined;
	const onVisibility = () => (tabVisible.value = !document.hidden);

	onMounted(() => {
		if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches)
			playing.value = false;

		document.addEventListener("visibilitychange", onVisibility);
		onVisibility();

		if (typeof IntersectionObserver === "undefined") {
			near.value = true;
			onScreen.value = true;
		} else {
			if (!near.value) {
				nearObserver = new IntersectionObserver(
					([entry]) => {
						if (!entry.isIntersecting) return;
						near.value = true;
						nearObserver?.disconnect();
					},
					{ rootMargin: "400px 0px" }
				);
				nearObserver.observe(root.value!);
			}
			observer = new IntersectionObserver(([entry]) => {
				onScreen.value = entry.isIntersecting;
			});
			observer.observe(root.value!);
		}
	});

	onBeforeUnmount(() => {
		clearTimeout(timer);
		observer?.disconnect();
		nearObserver?.disconnect();
		document.removeEventListener("visibilitychange", onVisibility);
	});

	const src = `/images/homepage/${image}.webp`;
	// the hero: lazy too, so the prerendered page fetches nothing where
	// index.html hides it; on "/" index.html preloads it (same srcset, sizes)
	const imageAttrs: Record<string, string> = eager
		? {
				loading: "lazy",
				fetchpriority: "high",
				srcset: `/images/homepage/${image}-640.webp 640w, /images/homepage/${image}-1280.webp 1280w, ${src} 2880w`,
				sizes: "(min-width: 1240px) 1180px, 100vw",
			}
		: { loading: "lazy" };

	const num = (i: number) => String(i + 1).padStart(2, "0");
	const stepText = (key: string, part: "title" | "text") =>
		`homepage.tour.${name}.${key}.${part}`;
</script>

<template>
	<figure
		v-if="layout === 'strip'"
		ref="root"
		class="m-0 w-full border border-white/18 rounded-[14px] bg-[#0a1010] overflow-hidden shadow-[0_40px_120px_-40px_rgba(192,226,24,0.22),0_0_0_6px_rgba(255,255,255,0.03)] text-left">
		<slot name="header" />
		<HomepageTourViewport
			:step="active"
			:src="near ? src : undefined"
			:image-attrs="imageAttrs"
			:alt="alt" />
		<figcaption class="border-t border-white/10">
			<div
				role="group"
				:aria-label="$t(`homepage.tour.${name}.label`)"
				class="flex flex-wrap gap-px bg-white/10">
				<button
					v-for="(step, i) in steps"
					:key="step.key"
					type="button"
					:aria-pressed="i === index"
					class="relative overflow-hidden flex-[1_1_150px] min-h-14 px-4 py-3 flex items-center gap-3 text-left cursor-pointer"
					:class="i === index ? 'bg-[#141c0c]' : 'bg-[#0a1010]'"
					@click="pick(i)">
					<span
						class="font-mono text-[13px] font-bold"
						:class="i === index ? 'text-prunplanner' : 'text-white/62'">
						{{ num(i) }}
					</span>
					<span
						class="text-base font-bold"
						:class="i === index ? 'text-white' : 'text-white/78'">
						{{ $t(stepText(step.key, "title")) }}
					</span>
					<span
						v-if="i === index && running"
						:key="run"
						aria-hidden="true"
						class="absolute left-0 bottom-0 h-0.5 bg-prunplanner animate-tour-progress"
						:style="{ animationDuration: `${interval}ms` }" />
				</button>
			</div>
			<div
				class="flex flex-wrap items-center justify-between gap-x-5 gap-y-2 py-3 pr-3 pl-5 border-t border-white/10">
				<span
					class="flex-[1_1_320px] text-base text-white/78"
					aria-live="polite">
					{{ $t(stepText(active.key, "text")) }}
				</span>
				<button
					type="button"
					class="min-h-11 px-3.5 inline-flex items-center gap-2 rounded-lg border border-white/10 font-mono text-[12.5px] text-white/78 cursor-pointer hover:border-white/28"
					@click="toggle">
					<svg
						aria-hidden="true"
						width="14"
						height="14"
						viewBox="0 0 24 24"
						fill="currentColor">
						<path
							v-if="playing"
							d="M5 4h5v16H5zM14 4h5v16h-5z" />
						<path v-else d="M7 4l13 8-13 8z" />
					</svg>
					{{ $t(playing ? "homepage.tour.pause" : "homepage.tour.play") }}
				</button>
			</div>
		</figcaption>
	</figure>

	<article
		v-else
		ref="root"
		class="flex flex-wrap border border-white/10 rounded-2xl bg-[#0a1010] overflow-hidden transition-colors hover:border-white/28">
		<div
			class="flex-[1_1_340px] p-8 sm:pl-10 sm:pt-10 flex flex-col gap-4"
			:class="{ 'order-2': reverse }">
			<slot />
			<div
				role="group"
				:aria-label="$t(`homepage.tour.${name}.label`)"
				class="mt-1.5 flex flex-col gap-1">
				<button
					v-for="(step, i) in steps"
					:key="step.key"
					type="button"
					:aria-pressed="i === index"
					class="relative overflow-hidden flex gap-3.5 px-3.5 py-3 rounded-[10px] text-left cursor-pointer"
					:class="
						i === index
							? 'bg-prunplanner/8'
							: 'bg-transparent hover:bg-white/5'
					"
					@click="pick(i)">
					<span
						class="pt-0.75 font-mono text-[13px] font-bold"
						:class="i === index ? 'text-prunplanner' : 'text-white/62'">
						{{ num(i) }}
					</span>
					<span class="flex flex-col gap-0.5">
						<span
							class="text-[17px] font-bold"
							:class="i === index ? 'text-white' : 'text-white/78'">
							{{ $t(stepText(step.key, "title")) }}
						</span>
						<span
							v-if="i === index"
							class="text-[15px] text-white/78">
							{{ $t(stepText(step.key, "text")) }}
						</span>
					</span>
					<span
						v-if="i === index && running"
						:key="run"
						aria-hidden="true"
						class="absolute left-0 bottom-0 h-0.5 bg-prunplanner animate-tour-progress"
						:style="{ animationDuration: `${interval}ms` }" />
				</button>
			</div>
			<slot name="after" />
		</div>
		<div
			class="flex-[2_1_520px] min-w-0 p-4 sm:p-7 flex flex-col justify-center gap-3">
			<HomepageTourViewport
				:step="active"
				:src="near ? src : undefined"
				:image-attrs="imageAttrs"
				:alt="alt"
				class="border border-white/16 rounded-[10px]" />
			<div
				class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 font-mono text-[12.5px] text-white/62">
				<span>
					{{
						$t("homepage.tour.step_of", {
							step: index + 1,
							total: steps.length,
						})
					}}
				</span>
				<button
					type="button"
					class="min-h-11 px-3.5 inline-flex items-center gap-2 rounded-lg border border-white/10 text-white/78 cursor-pointer hover:border-white/28"
					@click="toggle">
					<svg
						aria-hidden="true"
						width="14"
						height="14"
						viewBox="0 0 24 24"
						fill="currentColor">
						<path
							v-if="playing"
							d="M5 4h5v16H5zM14 4h5v16h-5z" />
						<path v-else d="M7 4l13 8-13 8z" />
					</svg>
					{{ $t(playing ? "homepage.tour.pause" : "homepage.tour.play") }}
				</button>
			</div>
		</div>
	</article>
</template>
