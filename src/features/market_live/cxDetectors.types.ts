import { CXDataPoint } from "@/features/market_live/cxExchange.types";

export type LogicalOperator = "AND" | "OR";
export type DetectorOperator = "gt" | "lt" | "eq" | "neq" | "matches";
export type Severity = "LOW" | "MEDIUM" | "HIGH";

export type ComparisonTarget =
	| { type: "static"; value: number | string }
	| { type: "previous" }
	| { type: "previous_pct"; offset: number };

export type ComparableValue = string | number;

export type CXDataPointComparableFields = {
	[K in keyof CXDataPoint]: CXDataPoint[K] extends ComparableValue | undefined
		? K
		: never;
}[keyof CXDataPoint];

export interface RuleGroup {
	operator: LogicalOperator;
	conditions: (Detector | RuleGroup)[];
}

export interface Detector {
	field: CXDataPointComparableFields;
	operator: DetectorOperator;
	target: ComparisonTarget;
}

export interface DetectorConfig {
	id: string;
	name: string;
	severity: Severity;
	logic: RuleGroup;
	enabled: boolean;
}

export interface TriggerContext {
	field: string;
	operator: string;
	currentValue: number | string;
	targetValue: number | string;
	comparisonType: "static" | "previous" | "previous_pct";
	thresholdReached: number | string;
}

type NumberOperator = "gt" | "lt" | "eq" | "neq";
type StringOperator = "matches";

export type FieldConfig =
	| { type: "number"; label: string; operators: readonly NumberOperator[] }
	| { type: "string"; label: string; operators: readonly StringOperator[] };

export interface MarketEvent {
	id: string;
	ticker: string;
	severity: Severity;
	message: string;
	timestamp: Date;
	metadata: {
		configId: string;
		name: string;
		triggers: TriggerContext[];
		data: CXDataPoint;
		prevData?: CXDataPoint;
	};
}

export interface MessageHistory {
	timestamp: number;
	tickers: string[];
}
