# AI Prompts Documentation

This document contains all AI prompts used during the development of the CF AI Incident Response system, as well as the prompts used within the application for incident analysis.

## Table of Contents

1. [Development Prompts](#development-prompts)
2. [System Prompts (In-Application)](#system-prompts-in-application)
3. [Workflow Prompts](#workflow-prompts)
4. [Chat Interface Prompts](#chat-interface-prompts)

---

## Development Prompts

### Initial Project Planning

**Prompt to Claude Code:**
```
I want to build something that can pinpoint the reason for Cloudflare outages in seconds
and help recover the system as quickly as possible. This is for the Cloudflare AI
application assignment.

Requirements:
- Use Llama 3.3 on Workers AI
- Support both text chat and voice interfaces
- Include workflow/coordination using Workflows or Workers
- Implement memory/state management
- Must be prefixed with cf_ai_
- Include README.md and PROMPTS.md
```

**Response:** Claude Code created a comprehensive implementation plan covering:
- System architecture with Workers AI, Durable Objects, Workflows, and Pages
- Component breakdown (backend, frontend, state management)
- Technology stack selection
- Step-by-step implementation approach

### Architecture Design

**Prompt:**
```
Research Cloudflare technologies to build an AI-powered incident response system:
1. Workers AI & Llama 3.3 - API usage and best practices
2. Cloudflare Workflows - orchestration patterns
3. Durable Objects - state persistence
4. Cloudflare Pages - frontend integration
5. Realtime API - voice capabilities
6. Example architecture patterns
```

**Response:** Comprehensive research summary with code examples, API references,
best practices, and architectural patterns for each component.

### Implementation Guidance

**Prompts during development:**

1. **Backend Structure:**
   - "Create TypeScript types for incident data and messages"
   - "Implement main Worker with routing for /api/chat, /api/incident, /api/voice"
   - "Design Durable Object for conversation history and incident state"
   - "Build Workflow for multi-step incident analysis"

2. **Frontend Development:**
   - "Set up React with Vite and TypeScript"
   - "Create incident form component with severity levels"
   - "Build chat interface with message history"
   - "Design dashboard for incident monitoring"
   - "Implement WebSocket connection for voice interface"

3. **Integration:**
   - "Create Pages Functions to proxy API requests to Workers"
   - "Connect React components to backend APIs"
   - "Add CORS headers and error handling"

---

## System Prompts (In-Application)

### Base System Prompt

**Location:** `src/types.ts`

**Prompt:**
```
You are an expert AI incident response assistant specialized in diagnosing and
resolving system outages and performance issues.

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
- Consider common patterns: traffic spikes, deployment issues, resource exhaustion,
  network problems, dependency failures
- Always think about blast radius and safe rollback options
- Format responses with clear headers and bullet points for easy scanning

Remember: Speed and accuracy are critical during incidents. Every second counts.
```

**Purpose:** This prompt shapes the AI's behavior to be:
- Concise and action-oriented
- Structured (following the IDENTIFY → IMPACT → ROOT CAUSE → REMEDIATION → PREVENTION framework)
- Context-aware of common incident patterns
- Safety-conscious (considering rollback and blast radius)

### Context-Enhanced System Prompt

**Location:** `src/incident-conversation.ts` (buildContextPrompt method)

**Dynamic Template:**
```
[BASE SYSTEM PROMPT]

CURRENT INCIDENT CONTEXT:
- Incident ID: {incidentId}
- Title: {title}
- Status: {status}
- Severity: {severity}
- Description: {description}
- Affected Systems: {affectedSystems}
- Known Root Cause: {rootCause} [if identified]
- Remediation Steps: {remediationSteps} [if exists]
- Incident Duration: {durationMinutes} minutes
```

**Purpose:** Injects incident-specific context into every AI interaction, ensuring:
- Responses are relevant to the current incident
- AI maintains awareness of incident state
- Suggestions build on previous analysis
- Duration awareness for escalation decisions

---

## Workflow Prompts

### Step 1: Initial Analysis

**Location:** `src/incident-workflow.ts` (initial-analysis step)

**Prompt Template:**
```
Analyze this incident and provide initial assessment:

Severity: {severity}
Description: {description}
Logs:
{logs}
Metrics:
{metrics}

Provide:
1. What systems are likely affected?
2. What is the immediate impact?
3. What should be the first diagnostic step?
```

**Configuration:**
- Temperature: 0.3 (deterministic for consistent triage)
- Max tokens: 1024
- Model: Llama 3.3 70B

**Purpose:** Rapid triage to determine affected systems and next steps

### Step 2: Root Cause Analysis

**Location:** `src/incident-workflow.ts` (root-cause-analysis step)

**Prompt Template:**
```
Based on this incident information, perform deep root cause analysis:

Severity: {severity}
Description: {description}
Initial Analysis: {initialAnalysis}

Identify:
1. Most likely root cause
2. Contributing factors
3. Why existing monitoring didn't catch this earlier
4. Similar past incidents (if any patterns exist)
```

**Configuration:**
- Temperature: 0.4 (slightly more creative for hypothesis generation)
- Max tokens: 1536
- Model: Llama 3.3 70B

**Purpose:** Deep analysis to identify why the incident occurred

### Step 3: Remediation Plan Generation

**Location:** `src/incident-workflow.ts` (generate-remediation step)

**Prompt Template:**
```
Create a detailed remediation plan for this incident:

Severity: {severity}
Description: {description}
Root Cause: {rootCauseAnalysis}

Provide:
1. Immediate mitigation steps (to stop the bleeding)
2. Short-term fixes (to restore service)
3. Long-term solutions (to prevent recurrence)
4. Rollback plan (if mitigation fails)
5. Success criteria for each step

Format as a numbered checklist with specific commands/actions where possible.
```

**Configuration:**
- Temperature: 0.5 (balanced for actionable yet creative solutions)
- Max tokens: 2048
- Model: Llama 3.3 70B

**Purpose:** Generate comprehensive, actionable remediation steps

### Step 4: Monitoring Recommendations

**Location:** `src/incident-workflow.ts` (monitoring-recommendations step)

**Prompt Template:**
```
Based on this incident, recommend monitoring improvements:

Severity: {severity}
Root Cause: {rootCauseAnalysis}

Provide:
1. New alerts that should be created
2. Existing alerts that should be tuned
3. New metrics to track
4. Dashboard improvements
5. SLO/SLA considerations
```

**Configuration:**
- Temperature: 0.6 (more creative for comprehensive monitoring strategy)
- Max tokens: 1536
- Model: Llama 3.3 70B

**Purpose:** Prevent future incidents through better observability

---

## Chat Interface Prompts

### User-Initiated Queries

The chat interface doesn't use predefined prompts but instead:

1. **Maintains Conversation History:** All user messages and AI responses are stored
2. **Injects Context:** Every request includes the base system prompt + incident context
3. **Preserves State:** Durable Objects ensure context persists across sessions

**Example Conversation Flow:**

```
System Prompt: [Base + Context]

User: "What is the root cause of this incident?"

AI: [Analyzes incident data, logs, and history to provide root cause]

User: "What are the immediate remediation steps?"

AI: [Builds on previous analysis to provide specific steps]

User: "How can we prevent this in the future?"

AI: [Suggests monitoring, architectural, and process improvements]
```

### Quick Prompts

**Suggested prompts shown in the UI:**

1. "What is the root cause of this incident?"
   - **Purpose:** Trigger root cause analysis

2. "What are the immediate remediation steps?"
   - **Purpose:** Get actionable recovery instructions

3. "What systems are affected?"
   - **Purpose:** Understand blast radius

4. "How can we prevent this in the future?"
   - **Purpose:** Get prevention recommendations

---

## Prompt Engineering Principles Applied

### 1. Temperature Selection

| Use Case | Temperature | Reasoning |
|----------|-------------|-----------|
| Initial triage | 0.3 | Need consistent, deterministic assessment |
| Root cause analysis | 0.4 | Slight creativity for hypothesis generation |
| Remediation planning | 0.5 | Balanced - actionable yet creative |
| Monitoring recommendations | 0.6 | More creative for comprehensive strategy |
| General chat | 0.5 | Balanced for helpful responses |

### 2. Structured Output

All prompts use numbered lists and clear sections to ensure:
- Easy parsing (for potential automation)
- Scannable output (for stressed engineers)
- Consistent format (for user experience)

### 3. Context Injection

Every interaction includes:
- Base system prompt (role and guidelines)
- Incident metadata (ID, severity, status)
- Historical context (previous analysis, known root cause)
- Temporal context (incident duration)

### 4. Safety Considerations

Prompts explicitly mention:
- Rollback plans
- Blast radius
- Success criteria
- Safe execution order

---

## Prompt Iteration & Refinement

### Initial Version (Too Generic)

```
You are an AI assistant. Help with incident response.
```

**Problems:**
- Too vague
- No structure
- No safety considerations
- Generic responses

### Current Version (Optimized)

```
You are an expert AI incident response assistant specialized in diagnosing and
resolving system outages and performance issues.

[Structured framework]
[Specific guidelines]
[Safety considerations]
```

**Improvements:**
- Clear role definition
- Structured approach (IDENTIFY → IMPACT → ROOT CAUSE → REMEDIATION → PREVENTION)
- Specific guidelines for conciseness and actionability
- Safety-first mindset

---

## AI-Assisted Development Prompts

### Code Generation

1. **Worker Implementation:**
   ```
   Create a Cloudflare Worker that routes requests to /api/chat, /api/incident,
   and /api/voice, with CORS support and error handling
   ```

2. **Durable Object:**
   ```
   Implement a Durable Object that stores conversation history, maintains incident
   state, and calls Workers AI with context-aware prompts
   ```

3. **React Components:**
   ```
   Build a React chat component with message history, real-time updates,
   and quick prompt buttons
   ```

### Documentation Generation

1. **README:**
   ```
   Write comprehensive README.md including architecture, setup instructions,
   usage guide, API documentation, and troubleshooting
   ```

2. **Code Comments:**
   ```
   Add JSDoc comments explaining the purpose, parameters, and return values
   for each major function
   ```

---

## Conclusion

This document captures all prompts used in:

1. **Development Process:** Planning, architecture, and implementation
2. **Application Runtime:** System prompts, workflows, and user interactions
3. **Documentation:** README and code comments

All prompts follow these principles:
- **Clarity:** Clear purpose and expected output
- **Context:** Sufficient information for accurate responses
- **Conciseness:** Minimal tokens while maintaining quality
- **Safety:** Consideration for rollback and blast radius
- **Structure:** Consistent formatting for easy parsing

---

**Last Updated:** November 19, 2024
**Project:** CF AI Incident Response
**Assignment:** Cloudflare AI Application Development
