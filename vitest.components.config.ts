import baseConfig, { COMPONENT_TESTS } from "./vitest.config";

// `pnpm test:components`, its own CI job on PRs (components.yml); `pnpm test` excludes these
// plain spread on purpose, mergeConfig would concatenate the exclude arrays
export default {
	...baseConfig,
	test: {
		...baseConfig.test,
		include: [`${COMPONENT_TESTS}/*.test.ts`],
		exclude: baseConfig.test!.exclude!.filter((e) => e !== COMPONENT_TESTS),
		coverage: { enabled: false },
	},
};
