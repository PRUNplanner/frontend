import baseConfig, { COMPONENT_TESTS } from "./vitest.config";

// `pnpm test:components` runs the component and view tests that `pnpm test`
// excludes. Plain spread on purpose, mergeConfig would concatenate the
// exclude arrays. The coverage options are inherited, so
// `pnpm test:coverage` can merge this suite's report with the unit one.
export default {
	...baseConfig,
	test: {
		...baseConfig.test,
		include: [`${COMPONENT_TESTS}/*.test.ts`],
		// mounting is slow and v8 coverage slows it further; 5s/10s flake under load
		testTimeout: 15_000,
		hookTimeout: 30_000,
		exclude: baseConfig.test!.exclude!.filter((e) => e !== COMPONENT_TESTS),
	},
};
