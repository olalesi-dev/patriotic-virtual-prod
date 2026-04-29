export interface ConsultationServiceDefinition {
  name: string;
  amount: number;
  interval?: 'day' | 'week' | 'month' | 'year';
}

export const CONSULTATION_CATALOG: Record<string, ConsultationServiceDefinition> = {
  general_visit: { name: 'General Visit', amount: 7900 },
  weight_loss: { name: 'GLP-1 & Weight Loss', amount: 12900 },
  erectile_dysfunction: { name: 'Erectile Dysfunction', amount: 7900 },
  premature_ejaculation: { name: 'Premature Ejaculation', amount: 7900 },
  ai_imaging: { name: 'AI-Powered Imaging Analysis', amount: 9900 },
  report_interpretation: { name: 'Report Interpretation', amount: 14900 },
  standard_imaging: { name: 'Standard Imaging Review', amount: 24900 },
  imaging_video: { name: 'Imaging + Video Consult', amount: 44900 },
  diagnostic_single: { name: 'Single Study Read', amount: 7500 },
  diagnostic_second: { name: 'Diagnostic Second Opinion', amount: 25000 },
  ai_assistant: { name: 'Care Navigation Support', amount: 2900, interval: 'month' },
  digital_platform: { name: 'Digital Health Platform', amount: 1900, interval: 'month' },
  membership_elite: { name: 'All Access — Elite', amount: 19900, interval: 'month' },
  membership_plus: { name: 'All Access — Plus', amount: 14900, interval: 'month' },
  membership_core: { name: 'All Access — Core', amount: 9900, interval: 'month' },
  telehealth_premium: { name: 'Telehealth Premium', amount: 9900, interval: 'month' },
  telehealth_standard: { name: 'Telehealth Standard', amount: 5900, interval: 'month' },
  telehealth_basic: { name: 'Telehealth Basic', amount: 2900, interval: 'month' },
};
