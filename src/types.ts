// Type definitions for the incident response system

export interface Env {
  AI: Ai;
  INCIDENTS: DurableObjectNamespace;
  INCIDENT_WORKFLOW: Workflow;
  ENVIRONMENT: string;
}

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp?: number;
}

export interface IncidentData {
  incidentId: string;
  status: 'investigating' | 'identified' | 'mitigating' | 'resolved' | 'monitoring';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedSystems: string[];
  startTime: number;
  endTime?: number;
  rootCause?: string;
  remediationSteps?: string[];
  timeline: TimelineEvent[];
}

export interface TimelineEvent {
  timestamp: number;
  type: 'detection' | 'analysis' | 'action' | 'update' | 'resolution';
  description: string;
  data?: any;
}

export interface ChatRequest {
  message: string;
  incidentId: string;
}

export interface ChatResponse {
  response: string;
  incidentData?: IncidentData;
  history?: Message[];
}

export interface WorkflowParams {
  incidentId: string;
  logs?: string;
  metrics?: any;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
}

export interface AnalysisResult {
  identification: string;
  impact: string;
  rootCause: string;
  remediation: string[];
  prevention: string[];
}

export const SYSTEM_PROMPT = `You are an expert AI incident response assistant specialized in diagnosing and resolving system outages and performance issues.

Your role is to help engineers:
1. IDENTIFY: Quickly determine what failed or is failing
2. IMPACT: Assess what systems and users are affected
3. ROOT CAUSE: Determine why the failure occurred
4. REMEDIATION: Provide clear, actionable steps to fix the issue
5. PREVENTION: Suggest measures to prevent future occurrences

Guidelines:
- Be concise and actionable - engineers need quick answers during incidents
- Prioritize the most likely causes first
- Provide specific commands, configurations, or code changes when possible
- Ask clarifying questions only if absolutely necessary for accurate diagnosis
- Consider common patterns: traffic spikes, deployment issues, resource exhaustion, network problems, dependency failures
- Always think about blast radius and safe rollback options
- Format responses with clear headers and bullet points for easy scanning

Remember: Speed and accuracy are critical during incidents. Every second counts.`;
