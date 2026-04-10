import {
	ComparableValue,
	ComparisonTarget,
	Detector,
	DetectorConfig,
	MarketEvent,
	RuleGroup,
	TriggerContext,
} from "@/features/market_live/cxDetectors.types";
import { CXDataPoint } from "@/features/market_live/cxExchange.types";

const getTargetValue = (
	target: ComparisonTarget,
	oldVal: number | string | undefined
) => {
	if (target.type === "static") return target.value;
	if (oldVal === undefined || oldVal === null) return null;

	if (target.type === "previous") return oldVal;
	if (target.type === "previous_pct" && typeof oldVal === "number") {
		return oldVal * (1 + target.offset / 100);
	}
	return null;
};

const evaluateCondition = (
	condition: Detector,
	oldData: CXDataPoint | undefined | null,
	newData: CXDataPoint
): TriggerContext | null => {
	const field = condition.field as keyof CXDataPoint;
	const newVal = newData[field] as ComparableValue | undefined;

	if (newVal === undefined || newVal === null) return null;

	const oldVal = oldData?.[field] as ComparableValue | undefined;

	const targetVal = getTargetValue(condition.target, oldVal);

	if (targetVal === null) return null;

	let isTriggered = false;

	if (typeof newVal === "number" && typeof targetVal === "number") {
		if (condition.operator === "gt") isTriggered = newVal > targetVal;
		else if (condition.operator === "lt") isTriggered = newVal < targetVal;
		else if (condition.operator === "eq")
			isTriggered = newVal === targetVal;
		else if (condition.operator === "neq")
			isTriggered = newVal !== targetVal;
	}

	if (typeof newVal === "string" && typeof targetVal === "string") {
		if (condition.operator === "eq") isTriggered = newVal === targetVal;
		if (condition.operator === "matches")
			isTriggered = newVal.toLowerCase() === targetVal.toLowerCase();
	}

	if (!isTriggered) return null;

	return {
		field: field as string,
		operator: condition.operator,
		currentValue: newVal,
		targetValue:
			(condition.target.type === "static"
				? condition.target.value
				: oldVal) ?? "N/A",
		comparisonType: condition.target.type,
		thresholdReached: targetVal,
	};
};

const evaluateGroup = (
	group: RuleGroup,
	oldData: CXDataPoint | undefined,
	newData: CXDataPoint
): TriggerContext[] | null => {
	if (group.operator === "AND") {
		const results: TriggerContext[] = [];
		for (const child of group.conditions) {
			const res =
				"operator" in child && "conditions" in child
					? evaluateGroup(child, oldData, newData)
					: evaluateCondition(child as Detector, oldData, newData);

			if (!res) return null; // AND -> one fails, all fail
			Array.isArray(res) ? results.push(...res) : results.push(res);
		}
		return results;
	} else {
		// OR logic
		for (const child of group.conditions) {
			const res =
				"operator" in child && "conditions" in child
					? evaluateGroup(child, oldData, newData)
					: evaluateCondition(child as Detector, oldData, newData);

			if (res) return Array.isArray(res) ? res : [res];
		}
		return null;
	}
};

export const processUserDetectors = (
	configs: DetectorConfig[],
	oldData: CXDataPoint | undefined,
	newData: CXDataPoint
): MarketEvent[] => {
	const triggeredEvents: MarketEvent[] = [];

	const generateDescription = (triggers: TriggerContext[]) => {
		return triggers
			.map((t) => `${t.field} ${t.operator} ${t.thresholdReached}`)
			.join(" AND ");
	};

	configs.forEach((config) => {
		if (!config.enabled) return;

		// Run the recursive engine
		const triggerDetails = evaluateGroup(config.logic, oldData, newData);

		if (triggerDetails) {
			triggeredEvents.push({
				id: crypto.randomUUID(),
				ticker: `${newData.material_ticker}.${newData.exchange_code}`,
				severity: config.severity,
				message: generateDescription(triggerDetails),
				timestamp: new Date(),
				metadata: {
					configId: config.id,
					name: config.name,
					triggers: triggerDetails,
					data: newData,
					prevData: oldData,
				},
			});
		}
	});

	return triggeredEvents;
};
