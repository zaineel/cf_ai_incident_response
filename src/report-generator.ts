import { Env, IncidentData, Message } from './types';

/**
 * Generate a comprehensive post-incident report
 */
export async function generateIncidentReport(
  incidentData: IncidentData,
  conversationHistory: Message[],
  env: Env
): Promise<string> {
  // Generate AI-powered executive summary
  const executiveSummary = await generateExecutiveSummary(incidentData, conversationHistory, env);

  // Format the report in Markdown
  const report = formatMarkdownReport(incidentData, conversationHistory, executiveSummary);

  return report;
}

/**
 * Generate executive summary using AI
 */
async function generateExecutiveSummary(
  incidentData: IncidentData,
  conversationHistory: Message[],
  env: Env
): Promise<string> {
  const duration = incidentData.endTime
    ? incidentData.endTime - incidentData.startTime
    : Date.now() - incidentData.startTime;
  const durationMinutes = Math.floor(duration / 60000);

  const prompt = `Generate a concise executive summary for this incident report:

Incident: ${incidentData.title}
Severity: ${incidentData.severity}
Duration: ${durationMinutes} minutes
Status: ${incidentData.status}
Description: ${incidentData.description}
${incidentData.affectedSystems.length > 0 ? `Affected Systems: ${incidentData.affectedSystems.join(', ')}` : ''}
${incidentData.rootCause ? `Root Cause: ${incidentData.rootCause}` : ''}

Conversation highlights:
${conversationHistory.slice(0, 10).map(m => `${m.role}: ${m.content.substring(0, 200)}`).join('\n')}

Write a 2-3 paragraph executive summary that:
1. Describes what happened and the impact
2. Explains the root cause and resolution
3. Highlights key learnings and next steps

Keep it professional and concise for stakeholders.`;

  const response = await env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
    messages: [
      {
        role: 'system',
        content: 'You are an expert at writing professional incident reports for technical stakeholders.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    max_tokens: 1024,
    temperature: 0.4,
  });

  return typeof response === 'string' ? response : (response as any).response || '';
}

/**
 * Format the report in Markdown
 */
function formatMarkdownReport(
  incidentData: IncidentData,
  conversationHistory: Message[],
  executiveSummary: string
): string {
  const duration = incidentData.endTime
    ? incidentData.endTime - incidentData.startTime
    : Date.now() - incidentData.startTime;
  const durationMinutes = Math.floor(duration / 60000);
  const durationHours = Math.floor(durationMinutes / 60);
  const durationDisplay =
    durationHours > 0 ? `${durationHours}h ${durationMinutes % 60}m` : `${durationMinutes}m`;

  const startDate = new Date(incidentData.startTime);
  const endDate = incidentData.endTime ? new Date(incidentData.endTime) : new Date();

  let report = `# Post-Incident Report

## ${incidentData.title}

**Incident ID:** ${incidentData.incidentId}
**Generated:** ${new Date().toLocaleString()}

---

## Executive Summary

${executiveSummary}

---

## Incident Details

| Field | Value |
|-------|-------|
| **Incident ID** | ${incidentData.incidentId} |
| **Severity** | ${incidentData.severity.toUpperCase()} |
| **Status** | ${incidentData.status} |
| **Start Time** | ${startDate.toLocaleString()} |
| **End Time** | ${incidentData.endTime ? endDate.toLocaleString() : 'Ongoing'} |
| **Duration** | ${durationDisplay} |
| **Affected Systems** | ${incidentData.affectedSystems.length > 0 ? incidentData.affectedSystems.join(', ') : 'None specified'} |

### Description

${incidentData.description}

---

## Timeline

`;

  // Add timeline events
  if (incidentData.timeline && incidentData.timeline.length > 0) {
    incidentData.timeline.forEach((event) => {
      const eventTime = new Date(event.timestamp);
      const timeFromStart = Math.floor((event.timestamp - incidentData.startTime) / 60000);
      report += `### ${eventTime.toLocaleTimeString()} (+${timeFromStart}m)
**Type:** ${event.type}
**Description:** ${event.description}

`;
      if (event.data) {
        report += `\`\`\`json
${JSON.stringify(event.data, null, 2)}
\`\`\`

`;
      }
    });
  } else {
    report += `No timeline events recorded.

`;
  }

  report += `---

## Root Cause Analysis

`;

  if (incidentData.rootCause) {
    report += `${incidentData.rootCause}

`;
  } else {
    report += `Root cause analysis was not completed or documented.

`;
  }

  report += `---

## Remediation

`;

  if (incidentData.remediationSteps && incidentData.remediationSteps.length > 0) {
    report += `The following steps were taken to resolve the incident:

`;
    incidentData.remediationSteps.forEach((step, index) => {
      report += `${index + 1}. ${step}
`;
    });
    report += `
`;
  } else {
    report += `No remediation steps were documented.

`;
  }

  report += `---

## Conversation Log

This section contains the investigation conversation between engineers and the AI assistant.

`;

  if (conversationHistory.length > 0) {
    conversationHistory.forEach((message, index) => {
      const timestamp = message.timestamp ? new Date(message.timestamp).toLocaleTimeString() : '';
      const role = message.role === 'user' ? '👤 Engineer' : '🤖 AI Assistant';

      report += `### ${role}${timestamp ? ` - ${timestamp}` : ''}

${message.content}

`;
    });
  } else {
    report += `No conversation history available.

`;
  }

  report += `---

## Recommendations

Based on this incident, the following recommendations are made:

### Immediate Actions
- Review and implement all remediation steps
- Verify all affected systems are fully operational
- Update runbooks with new learnings

### Short-term Improvements (1-2 weeks)
- Enhance monitoring for early detection
- Implement additional alerting
- Document incident response procedures

### Long-term Improvements (1-3 months)
- Architectural changes to prevent recurrence
- Automated remediation for common issues
- Team training on incident patterns

---

## Metadata

**Report Format:** Markdown
**Generator:** CF AI Incident Response System
**Powered by:** Cloudflare Workers AI (Llama 3.3)

---

*This report was automatically generated by the CF AI Incident Response system. For questions or additional details, please contact the incident response team.*
`;

  return report;
}

/**
 * Generate a JSON version of the report for programmatic use
 */
export function generateJSONReport(
  incidentData: IncidentData,
  conversationHistory: Message[]
): string {
  const duration = incidentData.endTime
    ? incidentData.endTime - incidentData.startTime
    : Date.now() - incidentData.startTime;

  const report = {
    metadata: {
      reportId: `REPORT-${incidentData.incidentId}-${Date.now()}`,
      generatedAt: new Date().toISOString(),
      generator: 'CF AI Incident Response System',
      version: '1.0.0',
    },
    incident: {
      id: incidentData.incidentId,
      title: incidentData.title,
      severity: incidentData.severity,
      status: incidentData.status,
      description: incidentData.description,
      affectedSystems: incidentData.affectedSystems,
      startTime: new Date(incidentData.startTime).toISOString(),
      endTime: incidentData.endTime ? new Date(incidentData.endTime).toISOString() : null,
      durationMs: duration,
      rootCause: incidentData.rootCause || null,
      remediationSteps: incidentData.remediationSteps || [],
    },
    timeline: incidentData.timeline || [],
    conversation: conversationHistory.map((msg) => ({
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp ? new Date(msg.timestamp).toISOString() : null,
    })),
  };

  return JSON.stringify(report, null, 2);
}
