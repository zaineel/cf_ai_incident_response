import { Env, Message, IncidentData, TimelineEvent, SYSTEM_PROMPT } from './types';

/**
 * Durable Object for managing incident conversations and state
 * Each incident gets its own instance for strongly consistent state management
 */
export class IncidentConversation {
  private state: DurableObjectState;
  private env: Env;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    try {
      // Initialize incident with metadata
      if (url.pathname === '/init' && request.method === 'POST') {
        return await this.initializeIncident(request);
      }

      // Handle chat messages
      if (url.pathname === '/message' && request.method === 'POST') {
        return await this.handleMessage(request);
      }

      // Get conversation history
      if (url.pathname === '/history' && request.method === 'GET') {
        return await this.getHistory();
      }

      // Get incident state
      if (url.pathname === '/incident-state' && request.method === 'GET') {
        return await this.getIncidentState();
      }

      // Update incident status
      if (url.pathname === '/update-status' && request.method === 'POST') {
        return await this.updateStatus(request);
      }

      return new Response('Not Found', { status: 404 });
    } catch (error) {
      console.error('Durable Object error:', error);
      return new Response(
        JSON.stringify({
          error: 'Internal error',
          message: error instanceof Error ? error.message : 'Unknown error',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  /**
   * Initialize a new incident with metadata
   */
  private async initializeIncident(request: Request): Promise<Response> {
    const incidentData = await request.json() as Partial<IncidentData>;

    // Store incident metadata
    await this.state.storage.put('incidentId', incidentData.incidentId);
    await this.state.storage.put('status', incidentData.status || 'investigating');
    await this.state.storage.put('severity', incidentData.severity);
    await this.state.storage.put('title', incidentData.title);
    await this.state.storage.put('description', incidentData.description);
    await this.state.storage.put('affectedSystems', incidentData.affectedSystems || []);
    await this.state.storage.put('startTime', incidentData.startTime || Date.now());

    // Initialize empty conversation history
    await this.state.storage.put('history', []);

    // Initialize timeline
    const timeline: TimelineEvent[] = [
      {
        timestamp: Date.now(),
        type: 'detection',
        description: 'Incident detected and initialized',
        data: incidentData,
      },
    ];
    await this.state.storage.put('timeline', timeline);

    return new Response(
      JSON.stringify({
        success: true,
        incidentId: incidentData.incidentId,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  /**
   * Handle incoming chat messages and generate AI responses
   */
  private async handleMessage(request: Request): Promise<Response> {
    const { message } = await request.json() as { message: string };

    // Get conversation history
    let history = (await this.state.storage.get('history')) as Message[] || [];
    const incidentData = await this.getIncidentDataFromStorage();

    // Add user message to history
    const userMessage: Message = {
      role: 'user',
      content: message,
      timestamp: Date.now(),
    };
    history.push(userMessage);

    // Build context-aware system prompt
    const contextPrompt = this.buildContextPrompt(incidentData);

    // Prepare messages for AI
    const messages: Message[] = [
      { role: 'system', content: contextPrompt },
      ...history,
    ];

    // Call Workers AI with Llama 3.3
    const aiResponse = await this.env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      max_tokens: 2048,
      temperature: 0.5, // Lower temperature for more deterministic incident analysis
    });

    // Extract response text
    const responseText = typeof aiResponse === 'string'
      ? aiResponse
      : (aiResponse as any).response || JSON.stringify(aiResponse);

    // Add assistant response to history
    const assistantMessage: Message = {
      role: 'assistant',
      content: responseText,
      timestamp: Date.now(),
    };
    history.push(assistantMessage);

    // Update history in storage
    await this.state.storage.put('history', history);
    await this.state.storage.put('lastActivity', Date.now());

    // Add to timeline
    await this.addTimelineEvent({
      timestamp: Date.now(),
      type: 'update',
      description: 'AI analysis performed',
      data: { userMessage: message, aiResponse: responseText },
    });

    // Analyze if we should update incident status based on conversation
    await this.analyzeAndUpdateStatus(responseText);

    return new Response(
      JSON.stringify({
        response: responseText,
        history,
        incidentData: await this.getIncidentDataFromStorage(),
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  /**
   * Get conversation history
   */
  private async getHistory(): Promise<Response> {
    const history = (await this.state.storage.get('history')) as Message[] || [];

    return new Response(JSON.stringify({ history }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Get full incident state
   */
  private async getIncidentState(): Promise<Response> {
    const incidentData = await this.getIncidentDataFromStorage();

    return new Response(JSON.stringify(incidentData), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Update incident status
   */
  private async updateStatus(request: Request): Promise<Response> {
    const { status, rootCause, remediationSteps } = await request.json() as {
      status?: string;
      rootCause?: string;
      remediationSteps?: string[];
    };

    if (status) {
      await this.state.storage.put('status', status);
      await this.addTimelineEvent({
        timestamp: Date.now(),
        type: 'update',
        description: `Status changed to: ${status}`,
      });
    }

    if (rootCause) {
      await this.state.storage.put('rootCause', rootCause);
      await this.addTimelineEvent({
        timestamp: Date.now(),
        type: 'analysis',
        description: 'Root cause identified',
        data: { rootCause },
      });
    }

    if (remediationSteps) {
      await this.state.storage.put('remediationSteps', remediationSteps);
      await this.addTimelineEvent({
        timestamp: Date.now(),
        type: 'action',
        description: 'Remediation plan created',
        data: { remediationSteps },
      });
    }

    if (status === 'resolved') {
      await this.state.storage.put('endTime', Date.now());
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  /**
   * Build context-aware system prompt
   */
  private buildContextPrompt(incidentData: IncidentData): string {
    let contextPrompt = SYSTEM_PROMPT;

    contextPrompt += `\n\nCURRENT INCIDENT CONTEXT:`;
    contextPrompt += `\n- Incident ID: ${incidentData.incidentId}`;
    contextPrompt += `\n- Title: ${incidentData.title}`;
    contextPrompt += `\n- Status: ${incidentData.status}`;
    contextPrompt += `\n- Severity: ${incidentData.severity}`;
    contextPrompt += `\n- Description: ${incidentData.description}`;

    if (incidentData.affectedSystems.length > 0) {
      contextPrompt += `\n- Affected Systems: ${incidentData.affectedSystems.join(', ')}`;
    }

    if (incidentData.rootCause) {
      contextPrompt += `\n- Known Root Cause: ${incidentData.rootCause}`;
    }

    if (incidentData.remediationSteps && incidentData.remediationSteps.length > 0) {
      contextPrompt += `\n- Remediation Steps: ${incidentData.remediationSteps.join('; ')}`;
    }

    const duration = Date.now() - incidentData.startTime;
    const durationMinutes = Math.floor(duration / 60000);
    contextPrompt += `\n- Incident Duration: ${durationMinutes} minutes`;

    return contextPrompt;
  }

  /**
   * Get incident data from storage
   */
  private async getIncidentDataFromStorage(): Promise<IncidentData> {
    return {
      incidentId: (await this.state.storage.get('incidentId')) as string || 'unknown',
      status: (await this.state.storage.get('status')) as any || 'investigating',
      severity: (await this.state.storage.get('severity')) as any || 'medium',
      title: (await this.state.storage.get('title')) as string || 'Untitled Incident',
      description: (await this.state.storage.get('description')) as string || '',
      affectedSystems: (await this.state.storage.get('affectedSystems')) as string[] || [],
      startTime: (await this.state.storage.get('startTime')) as number || Date.now(),
      endTime: (await this.state.storage.get('endTime')) as number | undefined,
      rootCause: (await this.state.storage.get('rootCause')) as string | undefined,
      remediationSteps: (await this.state.storage.get('remediationSteps')) as string[] | undefined,
      timeline: (await this.state.storage.get('timeline')) as TimelineEvent[] || [],
    };
  }

  /**
   * Add event to timeline
   */
  private async addTimelineEvent(event: TimelineEvent): Promise<void> {
    const timeline = (await this.state.storage.get('timeline')) as TimelineEvent[] || [];
    timeline.push(event);
    await this.state.storage.put('timeline', timeline);
  }

  /**
   * Analyze AI response and update incident status if needed
   */
  private async analyzeAndUpdateStatus(aiResponse: string): Promise<void> {
    const lowerResponse = aiResponse.toLowerCase();

    // Simple heuristics to update status based on AI response
    const currentStatus = await this.state.storage.get('status') as string;

    if (currentStatus === 'investigating') {
      if (lowerResponse.includes('root cause') || lowerResponse.includes('identified the issue')) {
        await this.state.storage.put('status', 'identified');
        await this.addTimelineEvent({
          timestamp: Date.now(),
          type: 'analysis',
          description: 'Root cause identified by AI',
        });
      }
    }

    if (currentStatus === 'identified' || currentStatus === 'investigating') {
      if (lowerResponse.includes('to fix') || lowerResponse.includes('remediation') || lowerResponse.includes('steps to resolve')) {
        await this.state.storage.put('status', 'mitigating');
        await this.addTimelineEvent({
          timestamp: Date.now(),
          type: 'action',
          description: 'Remediation in progress',
        });
      }
    }
  }
}
