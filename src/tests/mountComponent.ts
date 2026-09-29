import {
	type Component,
	defineComponent,
	h,
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
import { NDialogProvider } from "naive-ui";
import { afterEach } from "vitest";

// unmount after each test, naive-ui teleports (dialogs) live in document.body
enableAutoUnmount(afterEach);

/**
 * Mounts a (possibly async-setup) component inside Suspense, with a real
 * i18n instance without messages, so `t(key)` and `$t(key)` render the key.
 *
 * Pass listeners as props (`"onUpdate:value": fn`), or read them via
 * `component.emitted()`. `withDialog` wraps in NDialogProvider for
 * components calling useDialog().
 */
export async function mountComponent(
	component: Component,
	props: Record<string, unknown> = {},
	options: { pinia?: Pinia; withDialog?: boolean } = {}
) {
	const i18n = createI18n({
		legacy: false,
		locale: "en_US",
		messages: {},
		missingWarn: false,
		fallbackWarn: false,
	});

	// reactive, so setProps re-renders the component with new props
	const state = shallowReactive({ ...props });
	const content = () =>
		h(Suspense, null, { default: () => h(component, { ...state }) });

	const wrapper = mount(
		defineComponent({
			render: () =>
				options.withDialog
					? h(NDialogProvider, null, { default: content })
					: content(),
		}),
		{
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
 * Body rows of a naive-ui data table (XNDataTable) as column key → text,
 * expanded detail rows and the summary row are left out
 */
export function tableRows(wrapper: DOMWrapper<Element> | VueWrapper) {
	return wrapper
		.findAll("tbody tr.n-data-table-tr:not(.n-data-table-tr--summary)")
		// expanded detail rows have no column cells
		.filter((tr) => tr.find("td[data-col-key]").exists())
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
