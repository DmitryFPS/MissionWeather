export type TthStatus = 'GO' | 'CAUTION' | 'NO_GO' | 'INFO';

export interface TthCheck {
  id: string;
  group: string;
  label: string;
  status: TthStatus;
  value: string;
  limit: string;
  detail?: string;
}

export interface TthAssessment {
  status: TthStatus;
  checks: TthCheck[];
  problemIds: string[];
}
