import { defineStore } from "pinia";
import { ref, Ref } from "vue";

// Util
import { inertClone } from "@/util/data";

// Graph
import {
	buildDependencyGraph,
	collectDependents,
	wouldCreateCycleInGraph,
} from "@/features/raukk_sourcing/raukkSourcingGraph";

// Schemas
import {
	RAUKK_SOURCING_EXPORT_VERSION,
	RaukkSourcingExportSchema,
	RaukkSourcingExportType,
} from "@/features/raukk_sourcing/raukkSourcingStore.schemas";

// Types & Interfaces
import {
	IRaukkPlanConfig,
	IRaukkSnapshot,
	IRaukkTickerSource,
	RAUKK_REPAIR_DAY,
} from "@/features/raukk_sourcing/raukkSourcing.types";
import {
	IRaukkEdgeCandidate,
	IRaukkExportPayload,
	IRaukkProducerOption,
	IRaukkSubscription,
	IRaukkSubscriptionEntry,
} from "@/features/raukk_sourcing/raukkSourcingStore.types";

/** Repair day used until a plan configures its own */
const DEFAULT_REPAIR_DAY: RAUKK_REPAIR_DAY = 90;

export const useRaukkSourcingStore = defineStore(
	"prunplanner_raukk_sourcing",
	() => {
		// state
		/** Key: Plan.uuid */
		const configs: Ref<Record<string, IRaukkPlanConfig>> = ref({});
		/** Key: Plan.uuid */
		const snapshots: Ref<Record<string, IRaukkSnapshot>> = ref({});

		/**
		 * Resets all store variables to their initial values
		 * @author raukk
		 */
		function $reset(): void {
			configs.value = {};
			snapshots.value = {};
		}

		// getters

		/**
		 * Gets a plans sourcing configuration. Plans without a stored
		 * configuration get the default one, which is intentionally not
		 * written back to the store.
		 * @author raukk
		 *
		 * @param {string} planUuid Plan Uuid
		 * @returns {IRaukkPlanConfig} Sourcing Configuration
		 */
		function getConfig(planUuid: string): IRaukkPlanConfig {
			const findConfig: IRaukkPlanConfig | undefined =
				configs.value[planUuid];

			if (findConfig) return inertClone(findConfig);

			return { repairDay: DEFAULT_REPAIR_DAY, sources: {} };
		}

		/**
		 * Gets a plans snapshot, if one was computed already
		 * @author raukk
		 *
		 * @param {string} planUuid Plan Uuid
		 * @returns {IRaukkSnapshot | undefined} Snapshot
		 */
		function getSnapshot(planUuid: string): IRaukkSnapshot | undefined {
			const findSnapshot: IRaukkSnapshot | undefined =
				snapshots.value[planUuid];

			return findSnapshot ? inertClone(findSnapshot) : undefined;
		}

		/**
		 * Lists all plans whose snapshot holds the given ticker as an
		 * output. Stale snapshots are included and flagged as such,
		 * their numbers still display in the source dropdown.
		 * @author raukk
		 *
		 * @param {string} ticker Material Ticker
		 * @returns {IRaukkProducerOption[]} Producing Plans
		 */
		function producersOf(ticker: string): IRaukkProducerOption[] {
			return Object.entries(snapshots.value)
				.filter(([, snapshot]) => snapshot.outputs[ticker])
				.map(([planUuid, snapshot]) => {
					const output = snapshot.outputs[ticker];

					return {
						planUuid,
						planName: snapshot.planName,
						planetNaturalId: snapshot.planetNaturalId,
						costPerUnit: output.costPerUnit,
						unitsPerDay: output.unitsPerDay,
						stale: snapshot.stale,
						computedAt: snapshot.computedAt,
					};
				});
		}

		/**
		 * Aggregates all draws other plans hold against one source
		 * plans output ticker. Oversubscription is allowed, the
		 * percentage can therefore exceed 1.
		 * @author raukk
		 *
		 * @param {string} sourcePlanUuid Producing Plan Uuid
		 * @param {string} ticker Material Ticker
		 * @returns {IRaukkSubscription} Subscription Information
		 */
		function subscription(
			sourcePlanUuid: string,
			ticker: string
		): IRaukkSubscription {
			const byPlan: IRaukkSubscriptionEntry[] = [];
			let totalDrawnPerDay: number = 0;

			Object.entries(snapshots.value).forEach(([planUuid, snapshot]) => {
				const amount: number | undefined =
					snapshot.draws[sourcePlanUuid]?.[ticker];

				if (amount === undefined || amount === 0) return;

				totalDrawnPerDay += amount;
				byPlan.push({ planUuid, unitsPerDay: amount });
			});

			const sourceUnitsPerDay: number =
				snapshots.value[sourcePlanUuid]?.outputs[ticker]?.unitsPerDay ??
				0;

			return {
				totalDrawnPerDay,
				byPlan,
				pctOfOutput:
					sourceUnitsPerDay > 0
						? totalDrawnPerDay / sourceUnitsPerDay
						: 0,
			};
		}

		/**
		 * Checks if sourcing a ticker from the given candidate would
		 * close a loop in the stored dependency graph. Backs the source
		 * dropdowns greying out of invalid options.
		 * @author raukk
		 *
		 * @param {string} consumerPlanUuid Consuming Plan Uuid
		 * @param {IRaukkEdgeCandidate} candidate Candidate Source
		 * @returns {boolean} Edge would create a supply loop
		 */
		function wouldCreateCycle(
			consumerPlanUuid: string,
			candidate: IRaukkEdgeCandidate
		): boolean {
			return wouldCreateCycleInGraph(
				configs.value,
				snapshots.value,
				consumerPlanUuid,
				candidate
			);
		}

		// setters

		/**
		 * Marks a plans snapshot and, transitively, all snapshots
		 * depending on it as stale. Values stay in place, they are only
		 * flagged. Used whenever a plan is saved or its sourcing
		 * configuration changes.
		 * @author raukk
		 *
		 * @param {string} planUuid Plan Uuid
		 */
		function markStale(planUuid: string): void {
			const own: IRaukkSnapshot | undefined = snapshots.value[planUuid];
			if (own) own.stale = true;

			cascadeStale(planUuid);
		}

		/**
		 * Marks all snapshots transitively depending on the given plan
		 * as stale, the plan itself stays untouched.
		 * @author raukk
		 *
		 * @param {string} planUuid Plan Uuid
		 */
		function cascadeStale(planUuid: string): void {
			collectDependents(
				buildDependencyGraph(configs.value, snapshots.value),
				planUuid
			).forEach((dependentUuid) => {
				const dependent: IRaukkSnapshot | undefined =
					snapshots.value[dependentUuid];

				if (dependent) dependent.stale = true;
			});
		}

		/**
		 * Ensures a plan has a stored configuration and returns the
		 * reactive, stored instance
		 * @author raukk
		 *
		 * @param {string} planUuid Plan Uuid
		 * @returns {IRaukkPlanConfig} Stored Configuration
		 */
		function ensureConfig(planUuid: string): IRaukkPlanConfig {
			if (!configs.value[planUuid])
				configs.value[planUuid] = {
					repairDay: DEFAULT_REPAIR_DAY,
					sources: {},
				};

			return configs.value[planUuid];
		}

		/**
		 * Sets the source of a single ticker of a plan. Changing the
		 * sourcing configuration marks the plans own snapshot and all
		 * downstream snapshots stale.
		 * @author raukk
		 *
		 * @param {string} planUuid Plan Uuid
		 * @param {string} ticker Material Ticker
		 * @param {IRaukkTickerSource} source Ticker Source
		 */
		function setTickerSource(
			planUuid: string,
			ticker: string,
			source: IRaukkTickerSource
		): void {
			ensureConfig(planUuid).sources[ticker] = inertClone(source);
			markStale(planUuid);
		}

		/**
		 * Removes a tickers source of a plan, it falls back to market
		 * pricing. Marks the plan and all downstream plans stale.
		 * @author raukk
		 *
		 * @param {string} planUuid Plan Uuid
		 * @param {string} ticker Material Ticker
		 */
		function clearTickerSource(planUuid: string, ticker: string): void {
			const findConfig: IRaukkPlanConfig | undefined =
				configs.value[planUuid];

			if (!findConfig || findConfig.sources[ticker] === undefined) return;

			delete findConfig.sources[ticker];
			markStale(planUuid);
		}

		/**
		 * Sets the repair day of a plans cost model. Marks the plan and
		 * all downstream plans stale.
		 * @author raukk
		 *
		 * @param {string} planUuid Plan Uuid
		 * @param {RAUKK_REPAIR_DAY} day Repair Day
		 */
		function setRepairDay(planUuid: string, day: RAUKK_REPAIR_DAY): void {
			ensureConfig(planUuid).repairDay = day;
			markStale(planUuid);
		}

		/**
		 * Stores a freshly computed snapshot of a plan. The snapshot
		 * itself is stored as current, every plan transitively
		 * depending on it is marked stale as its numbers were derived
		 * from the previous values.
		 * @author raukk
		 *
		 * @param {string} planUuid Plan Uuid
		 * @param {IRaukkSnapshot} snapshot Snapshot Data
		 */
		function setSnapshot(planUuid: string, snapshot: IRaukkSnapshot): void {
			snapshots.value[planUuid] = {
				...inertClone(snapshot),
				stale: false,
			};

			// dependents derive from the new draws as well
			cascadeStale(planUuid);
		}

		/**
		 * Removes configuration and snapshot of a plan, e.g. after the
		 * plan itself was deleted, and marks all plans that depended on
		 * it stale.
		 * @author raukk
		 *
		 * @param {string} planUuid Plan Uuid
		 */
		function deletePlanData(planUuid: string): void {
			const dependents: string[] = collectDependents(
				buildDependencyGraph(configs.value, snapshots.value),
				planUuid
			);

			delete configs.value[planUuid];
			delete snapshots.value[planUuid];

			dependents.forEach((dependentUuid) => {
				const dependent: IRaukkSnapshot | undefined =
					snapshots.value[dependentUuid];

				if (dependent) dependent.stale = true;
			});
		}

		// import & export

		/**
		 * Serializes the complete sourcing state, local storage is
		 * fragile and this is the users backup path.
		 * @author raukk
		 *
		 * @returns {string} JSON Payload
		 */
		function exportJSON(): string {
			const payload: IRaukkExportPayload = {
				version: RAUKK_SOURCING_EXPORT_VERSION,
				configs: inertClone(configs.value),
				snapshots: inertClone(snapshots.value),
			};

			return JSON.stringify(payload);
		}

		/**
		 * Replaces the complete sourcing state with a previously
		 * exported payload. The payload is zod validated, invalid input
		 * throws and leaves the current state untouched.
		 * @author raukk
		 *
		 * @param {string} raw JSON Payload
		 */
		function importJSON(raw: string): void {
			let parsed: unknown;

			try {
				parsed = JSON.parse(raw);
			} catch {
				throw new Error(
					"Can't import sourcing data: payload is no valid JSON."
				);
			}

			const validated: RaukkSourcingExportType =
				RaukkSourcingExportSchema.parse(parsed);

			configs.value = validated.configs;
			snapshots.value = validated.snapshots;
		}

		return {
			// state
			configs,
			snapshots,
			// reset
			$reset,
			// getters
			getConfig,
			getSnapshot,
			producersOf,
			subscription,
			wouldCreateCycle,
			// setters
			setTickerSource,
			clearTickerSource,
			setRepairDay,
			setSnapshot,
			markStale,
			deletePlanData,
			// import & export
			exportJSON,
			importJSON,
		};
	},
	{
		persist: {
			pick: ["configs", "snapshots"],
		},
	}
);
