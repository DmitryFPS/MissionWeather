export type VerdictStatus = 'GO' | 'CAUTION' | 'NO_GO';

export interface VerdictReason {
  parameter: string;
  value: number | string;
  limit: string;
  segmentIndex?: number;
  hourOffset?: number;
}

export interface Verdict {
  status: VerdictStatus;
  reasons: VerdictReason[];
  confidence: 'high' | 'medium' | 'low';
  sourceSpread?: Record<string, { min: number; max: number; avg: number }>;
}
