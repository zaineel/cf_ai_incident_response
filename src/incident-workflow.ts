import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from 'cloudflare:workers';
import { Env, WorkflowParams, AnalysisResult } from './types';

/**
 * Workflow for automated incident response and analysis
 * This orchestrates multi-step analysis, remediation, and monitoring
 */
export class IncidentResponseWorkflow extends WorkflowEntrypoint<Env, WorkflowParams> {
  async run(event: WorkflowEvent<WorkflowParams>, step: WorkflowStep) {
    const { incidentId, logs, metrics, severity, description } = event.payload;

    // Step 1: Initial incident detection and triage
    const initialAnalysis = await step.do('initial-analysis', async () => {
      console.log(`[Workflow] Starting analysis for incident ${incidentId}`);

      const prompt = `Analyze this incident and provide initial assessment:

Severity: ${severity}
Description: ${description}
${logs ? `Logs:\n${logs}` : ''}
${metrics ? `Metrics:\n${JSON.stringify(metrics, null, 2)}` : ''}

Provide:
1. What systems are likely affected?
2. What is the immediate impact?
3. What should be the first diagnostic step?`;

      const response = await this.env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
        messages: [
          {
            role: 'system',
            content: 'You are an incident response expert. Provide quick, actionable initial assessment.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 1024,
        temperature: 0.3,
      });

      return typeof response === 'string' ? response : (response as any).response;
    });

    // Update Durable Object with initial analysis
    await step.do('update-initial-analysis', async () => {
      const id = this.env.INCIDENTS.idFromName(incidentId);
      const stub = this.env.INCIDENTS.get(id);

      await stub.fetch(
        new Request('https://fake-host/message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: `Initial automated analysis completed:\n\n${initialAnalysis}`,
          }),
        })
      );
    });

    // Step 2: Deep root cause analysis
    const rootCauseAnalysis = await step.do('root-cause-analysis', async () => {
      console.log(`[Workflow] Performing root cause analysis for ${incidentId}`);

      const prompt = `Based on this incident information, perform deep root cause analysis:

Severity: ${severity}
Description: ${description}
Initial Analysis: ${initialAnalysis}

Identify:
1. Most likely root cause
2. Contributing factors
3. Why existing monitoring didn't catch this earlier
4. Similar past incidents (if any patterns exist)`;

      const response = await this.env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
        messages: [
          {
            role: 'system',
            content:
              'You are a senior SRE performing root cause analysis. Be thorough but concise. Focus on actionable insights.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 1536,
        temperature: 0.4,
      });

      return typeof response === 'string' ? response : (response as any).response;
    });

    // Step 3: Generate remediation plan
    const remediationPlan = await step.do('generate-remediation', async () => {
      console.log(`[Workflow] Generating remediation plan for ${incidentId}`);

      const prompt = `Create a detailed remediation plan for this incident:

Severity: ${severity}
Description: ${description}
Root Cause: ${rootCauseAnalysis}

Provide:
1. Immediate mitigation steps (to stop the bleeding)
2. Short-term fixes (to restore service)
3. Long-term solutions (to prevent recurrence)
4. Rollback plan (if mitigation fails)
5. Success criteria for each step

Format as a numbered checklist with specific commands/actions where possible.`;

      const response = await this.env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
        messages: [
          {
            role: 'system',
            content:
              'You are creating an incident remediation runbook. Be specific, include commands, and consider safety/rollback.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 2048,
        temperature: 0.5,
      });

      return typeof response === 'string' ? response : (response as any).response;
    });

    // Update Durable Object with remediation plan
    await step.do('update-remediation-plan', async () => {
      const id = this.env.INCIDENTS.idFromName(incidentId);
      const stub = this.env.INCIDENTS.get(id);

      // Extract remediation steps (simple parsing)
      const steps = remediationPlan
        .split('\n')
        .filter((line) => /^\d+\./.test(line.trim()))
        .map((line) => line.trim());

      await stub.fetch(
        new Request('https://fake-host/update-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rootCause: rootCauseAnalysis,
            remediationSteps: steps,
          }),
        })
      );
    });

    // Step 4: Generate monitoring recommendations
    const monitoringRecommendations = await step.do('monitoring-recommendations', async () => {
      console.log(`[Workflow] Generating monitoring recommendations for ${incidentId}`);

      const prompt = `Based on this incident, recommend monitoring improvements:

Severity: ${severity}
Root Cause: ${rootCauseAnalysis}

Provide:
1. New alerts that should be created
2. Existing alerts that should be tuned
3. New metrics to track
4. Dashboard improvements
5. SLO/SLA considerations`;

      const response = await this.env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
        messages: [
          {
            role: 'system',
            content: 'You are an observability expert. Recommend practical, actionable monitoring improvements.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 1536,
        temperature: 0.6,
      });

      return typeof response === 'string' ? response : (response as any).response;
    });

    // Step 5: Create post-incident report summary
    const postIncidentSummary = await step.do('post-incident-summary', async () => {
      console.log(`[Workflow] Creating post-incident summary for ${incidentId}`);

      return {
        incidentId,
        severity,
        description,
        initialAnalysis,
        rootCause: rootCauseAnalysis,
        remediation: remediationPlan,
        monitoring: monitoringRecommendations,
        timestamp: Date.now(),
      };
    });

    // Optional: Step 6 - Wait and verify resolution (for critical incidents)
    if (severity === 'critical') {
      await step.sleep('wait-for-mitigation', '5 minutes');

      await step.do('verify-mitigation', async () => {
        console.log(`[Workflow] Verifying mitigation for critical incident ${incidentId}`);

        const id = this.env.INCIDENTS.idFromName(incidentId);
        const stub = this.env.INCIDENTS.get(id);

        await stub.fetch(
          new Request('https://fake-host/message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: `[Automated Check] 5 minutes have passed. Please verify that mitigation steps have been applied and are effective.`,
            }),
          })
        );
      });
    }

    return postIncidentSummary;
  }
}
