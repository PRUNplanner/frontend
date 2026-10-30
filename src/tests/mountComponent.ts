import {
	type Component,
	defineComponent,
	Fragment,
	h,
	nextTick,
	shallowReactive,
	Suspense,
} from "vue";
import {
	type DOMWrapper,
	enableAutoUnmount,
	flushPromises,
	mount,
	RouterLinkStub,
	type VueWrapper,
} from "@vue/test-utils";
import { createPinia, type Pinia } from "pinia";
import { createI18n } from "vue-i18n";
import { PConfirmHost } from "@/ui";
import { usePlanningStore } from "@/stores/planningStore";
import { cxFixture } from "@/tests/features/cx/cx.fixtures";
import { afterEach } from "vitest";

// unmount after each test, teleported layers (modals, drawers) live in document.body
enableAutoUnmount(afterEach);

/**
 * Mounts a (possibly async-setup) component inside Suspense, with a real
 * i18n instance without messages, so `t(key)` and `$t(key)` render the key.
 *
 * Pass listeners as props (`"onUpdate:value": fn`), or read them via
 * `component.emitted()`. `withDialog` renders PConfirmHost next to it
 * for components calling useConfirm(). `messages` (en_US) lets `<i18n-t>` render
 * its slots, which a key-only i18n drops. `attach` mounts it into the
 * document, for focus checks. `setup` runs in the root's setup, to
 * provide() what the component injects.
 */
export async function mountComponent(
	component: Component,
	props: Record<string, unknown> = {},
	options: {
		pinia?: Pinia;
		withDialog?: boolean;
		messages?: Record<string, unknown>;
		attach?: boolean;
		// runs in the root's setup, e.g. to provide() for the component
		setup?: () => void;
	} = {}
) {
	const i18n = createI18n({
		legacy: false,
		locale: "en_US",
		// untyped like the app i18n (lib/i18n), vue-i18n types messages recursively
		messages: { en_US: options.messages ?? {} } as never,
		missingWarn: false,
		fallbackWarn: false,
	});

	// reactive, so setProps re-renders the component with new props
	const state = shallowReactive({ ...props });
	const content = () =>
		h(Suspense, null, { default: () => h(component, { ...state }) });

	const wrapper = mount(
		defineComponent({
			setup: () => void options.setup?.(),
			render: () =>
				options.withDialog
					? h(Fragment, [content(), h(PConfirmHost)])
					: content(),
		}),
		{
			attachTo: options.attach ? document.body : undefined,
			global: {
				plugins: [options.pinia ?? createPinia(), i18n],
				stubs: { RouterLink: RouterLinkStub },
			},
		}
	);
	await flushPromises();

	async function setProps(next: Record<string, unknown>) {
		Object.assign(state, next);
		await flushPromises();
	}

	return { wrapper, component: wrapper.findComponent(component), setProps };
}

/**
 * Body rows of a PDataTable as column key → text; expanded detail rows
 * and the summary row are left out
 */
export function tableRows(wrapper: DOMWrapper<Element> | VueWrapper) {
	return wrapper
		.findAll("tbody tr[data-row-key]")
		.map((tr) =>
			Object.fromEntries(
				tr
					.findAll("td[data-col-key]")
					.map((td) => [
						td.attributes("data-col-key")!,
						td.text().trim(),
					])
			)
		);
}

/** A Pinia whose planning store holds one exchange preference without rules */
export function piniaWithCX(uuid: string, name: string): Pinia {
	const pinia = createPinia();
	usePlanningStore(pinia).setCXs([cxFixture({ uuid, name })]);
	return pinia;
}

/** Hovers `el` and returns the text of the tooltip it opens */
export async function hoverTooltip(el: DOMWrapper<Element> | VueWrapper) {
	await el.trigger("mouseenter");
	await nextTick();
	return [...document.body.querySelectorAll("[role=tooltip]")].at(-1)!
		.textContent;
}

/**
 * Runs a composable in a mounted component's setup, so its lifecycle
 * hooks, inject() and i18n work; unmount the wrapper to dispose it
 */
export async function mountComposable<T>(
	use: () => T,
	options: Parameters<typeof mountComponent>[2] = {}
) {
	let result: T | undefined;
	const { wrapper } = await mountComponent(
		defineComponent({
			setup() {
				result = use();
				return () => null;
			},
		}),
		{},
		options
	);
	return { result: result as T, wrapper };
}
