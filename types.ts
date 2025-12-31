
export interface ProjectExample {
  id: string;
  title: string;
  requirements: string;
  budget: string;
  timeline: string;
  successReason?: string;
  attachment?: {
    name: string;
    mimeType: string;
    data: string; // base64
  };
}

export type PlatformType = 'Upwork' | 'Fiverr' | 'Other';

export interface EstimationConfig {
  model: string;
  temperature: number;
  avoidanceGuidelines?: string;
  quotationFormat?: string;
  platform: PlatformType;
  projectScope: string;
  phases: string[];
}

export interface EstimationResult {
  budget: string;
  timeline: string;
  reasoning: string;
  proposal: string;
  breakdown: string[];
  riskFactors: string[];
}

export interface EstimationHistory extends EstimationResult {
  id: string;
  projectName: string;
  timestamp: number;
  config?: EstimationConfig;
  attachment?: {
    name: string;
    mimeType: string;
    data: string; // base64
  };
}
