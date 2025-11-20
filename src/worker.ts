import { Env, Message } from './types';
import { IncidentConversation } from './incident-conversation';
import { IncidentResponseWorkflow } from './incident-workflow';
import { generateIncidentReport, generateJSONReport } from './report-generator';

export { IncidentConversation, IncidentResponseWorkflow };

/**
 * Main Worker - Routes requests to appropriate handlers
 */
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Enable CORS for all requests
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Route: Health check
      if (url.pathname === '/health' || url.pathname === '/') {
        return new Response(
          JSON.stringify({
            status: 'healthy',
            service: 'CF AI Incident Response',
            timestamp: Date.now(),
            environment: env.ENVIRONMENT,
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Route: Chat endpoint - interacts with Durable Object
      if (url.pathname === '/api/chat' && request.method === 'POST') {
        return await handleChat(request, env, corsHeaders);
      }

      // Route: Create new incident - triggers workflow
      if (url.pathname === '/api/incident' && request.method === 'POST') {
        return await handleNewIncident(request, env, corsHeaders);
      }

      // Route: Get incident details
      if (url.pathname.startsWith('/api/incident/') && request.method === 'GET') {
        const incidentId = url.pathname.split('/').pop();
        if (!incidentId) {
          return new Response('Incident ID required', { status: 400, headers: corsHeaders });
        }
        return await handleGetIncident(incidentId, env, corsHeaders);
      }

      // Route: List all incidents
      if (url.pathname === '/api/incidents' && request.method === 'GET') {
        return await handleListIncidents(env, corsHeaders);
      }

      // Route: WebSocket for voice interface
      if (url.pathname === '/api/voice') {
        const upgradeHeader = request.headers.get('Upgrade');
        if (upgradeHeader === 'websocket') {
          return await handleWebSocket(request, env);
        }
        return new Response('Expected WebSocket connection', { status: 400, headers: corsHeaders });
      }

      // Route: Generate post-incident report
      if (url.pathname.startsWith('/api/incident/') && url.pathname.endsWith('/report')) {
        const parts = url.pathname.split('/');
        const incidentId = parts[parts.length - 2];
        if (!incidentId) {
          return new Response('Incident ID required', { status: 400, headers: corsHeaders });
        }
        const format = url.searchParams.get('format') || 'markdown';
        return await handleGenerateReport(incidentId, format, env, corsHeaders);
      }

      // 404 for unknown routes
      return new Response('Not Found', { status: 404, headers: corsHeaders });
    } catch (error) {
      console.error('Worker error:', error);
      return new Response(
        JSON.stringify({
          error: 'Internal server error',
          message: error instanceof Error ? error.message : 'Unknown error',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  },
};

/**
 * Handle chat messages - forward to Durable Object
 */
async function handleChat(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  const { message, incidentId } = await request.json() as { message: string; incidentId: string };

  if (!message || !incidentId) {
    return new Response(
      JSON.stringify({ error: 'Message and incidentId are required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Get or create Durable Object for this incident
  const id = env.INCIDENTS.idFromName(incidentId);
  const stub = env.INCIDENTS.get(id);

  // Forward request to Durable Object
  const doRequest = new Request('https://fake-host/message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });

  const response = await stub.fetch(doRequest);
  const data = await response.json();

  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Handle new incident creation - triggers workflow
 */
async function handleNewIncident(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  const { title, description, severity, logs, metrics, affectedSystems } = await request.json() as {
    title?: string;
    description: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    logs?: string;
    metrics?: any;
    affectedSystems?: string[];
  };

  if (!description || !severity) {
    return new Response(
      JSON.stringify({ error: 'Description and severity are required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Generate unique incident ID
  const incidentId = `INC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Initialize Durable Object for this incident
  const id = env.INCIDENTS.idFromName(incidentId);
  const stub = env.INCIDENTS.get(id);

  const initRequest = new Request('https://fake-host/init', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      incidentId,
      title: title || `Incident ${incidentId}`,
      description,
      severity,
      affectedSystems: affectedSystems || [],
      startTime: Date.now(),
    }),
  });

  await stub.fetch(initRequest);

  // Trigger workflow for automated analysis
  // Note: Workflows API may vary - this is a simplified version
  // In production, you would use: await env.INCIDENT_WORKFLOW.create({ params: { ... } })

  return new Response(
    JSON.stringify({
      incidentId,
      status: 'created',
      message: 'Incident created and analysis workflow triggered',
    }),
    {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

/**
 * Get incident details from Durable Object
 */
async function handleGetIncident(incidentId: string, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  const id = env.INCIDENTS.idFromName(incidentId);
  const stub = env.INCIDENTS.get(id);

  const doRequest = new Request('https://fake-host/incident-state', {
    method: 'GET',
  });

  const response = await stub.fetch(doRequest);
  const data = await response.json();

  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * List all incidents
 * Note: This is a simplified version. In production, you'd want to use a separate storage
 * mechanism or index to track all incident IDs
 */
async function handleListIncidents(env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  // For now, return empty array as we don't have a global incident index
  // In production, you'd maintain this in a separate Durable Object or KV namespace
  return new Response(
    JSON.stringify({
      incidents: [],
      message: 'Incident listing requires additional storage setup. Access incidents by ID directly.',
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

/**
 * Generate post-incident report
 */
async function handleGenerateReport(
  incidentId: string,
  format: string,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    // Get incident data from Durable Object
    const id = env.INCIDENTS.idFromName(incidentId);
    const stub = env.INCIDENTS.get(id);

    // Get incident state
    const incidentResponse = await stub.fetch(
      new Request('https://fake-host/incident-state', {
        method: 'GET',
      })
    );
    const incidentData = await incidentResponse.json();

    // Get conversation history
    const historyResponse = await stub.fetch(
      new Request('https://fake-host/history', {
        method: 'GET',
      })
    );
    const { history } = await historyResponse.json();

    // Generate report based on format
    let reportContent: string;
    let contentType: string;
    let filename: string;

    if (format === 'json') {
      reportContent = generateJSONReport(incidentData, history || []);
      contentType = 'application/json';
      filename = `incident-${incidentId}-report.json`;
    } else {
      // Default to markdown
      reportContent = await generateIncidentReport(incidentData, history || [], env);
      contentType = 'text/markdown';
      filename = `incident-${incidentId}-report.md`;
    }

    return new Response(reportContent, {
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: 'Failed to generate report',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Handle WebSocket connections for voice interface
 */
async function handleWebSocket(request: Request, env: Env): Promise<Response> {
  const pair = new WebSocketPair();
  const [client, server] = Object.values(pair);

  // Accept the WebSocket connection
  server.accept();

  // Handle messages
  server.addEventListener('message', async (event: MessageEvent) => {
    try {
      // Handle binary audio data
      if (event.data instanceof ArrayBuffer) {
        server.send(
          JSON.stringify({
            type: 'processing',
            message: 'Processing audio...',
          })
        );

        // Convert ArrayBuffer to Uint8Array for Whisper
        const audioData = new Uint8Array(event.data);

        try {
          // Run Whisper model for speech-to-text
          const transcription = await env.AI.run('@cf/openai/whisper', {
            audio: Array.from(audioData),
          }) as { text: string };

          // Send transcription back
          server.send(
            JSON.stringify({
              type: 'transcription',
              text: transcription.text,
            })
          );

          // Note: The incidentId needs to be sent separately or maintained in session
          // For now, we'll just send the transcription
        } catch (whisperError) {
          server.send(
            JSON.stringify({
              type: 'error',
              message: `Transcription failed: ${whisperError instanceof Error ? whisperError.message : 'Unknown error'}`,
            })
          );
        }

        return;
      }

      // Handle JSON messages
      const data = JSON.parse(event.data as string);

      if (data.type === 'voice') {
        // Voice data as base64 encoded audio
        server.send(
          JSON.stringify({
            type: 'processing',
            message: 'Processing audio...',
          })
        );

        try {
          // Decode base64 audio
          const audioBase64 = data.audio;
          console.log('Received audio data, length:', audioBase64.length);

          // Decode from base64
          const binaryString = atob(audioBase64);
          const audioBuffer = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            audioBuffer[i] = binaryString.charCodeAt(i);
          }

          console.log('Decoded audio buffer size:', audioBuffer.length);

          // Run Whisper model for speech-to-text
          console.log('Calling Whisper model with audio size:', audioBuffer.length);

          // Whisper expects the audio as an Array (not Uint8Array)
          const transcription = await env.AI.run('@cf/openai/whisper', {
            audio: Array.from(audioBuffer),
          }) as any;

          console.log('Whisper raw response:', JSON.stringify(transcription));

          // Extract text from response (format may vary)
          const transcribedText = transcription.text || transcription.transcription || JSON.stringify(transcription);
          console.log('Extracted text:', transcribedText);

          server.send(
            JSON.stringify({
              type: 'transcription',
              text: transcribedText,
            })
          );

          // If incidentId is provided, send to AI for processing
          if (data.incidentId && transcribedText && transcribedText.trim()) {
            console.log('Processing with AI for incident:', data.incidentId);

            const id = env.INCIDENTS.idFromName(data.incidentId);
            const stub = env.INCIDENTS.get(id);

            const doRequest = new Request('https://fake-host/message', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ message: transcribedText }),
            });

            const aiResponse = await stub.fetch(doRequest);
            const responseData = await aiResponse.json();

            console.log('AI response received');

            server.send(
              JSON.stringify({
                type: 'response',
                data: responseData,
              })
            );
          } else {
            console.log('No incidentId provided or empty transcription');
          }
        } catch (whisperError) {
          console.error('Voice processing error:', whisperError);
          server.send(
            JSON.stringify({
              type: 'error',
              message: `Voice processing failed: ${whisperError instanceof Error ? whisperError.message : 'Unknown error'}`,
            })
          );
        }
      } else if (data.type === 'text') {
        // Handle text messages through WebSocket
        const { message, incidentId } = data;

        const id = env.INCIDENTS.idFromName(incidentId);
        const stub = env.INCIDENTS.get(id);

        const doRequest = new Request('https://fake-host/message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message }),
        });

        const response = await stub.fetch(doRequest);
        const responseData = await response.json();

        server.send(
          JSON.stringify({
            type: 'response',
            data: responseData,
          })
        );
      }
    } catch (error) {
      server.send(
        JSON.stringify({
          type: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
        })
      );
    }
  });

  server.addEventListener('close', () => {
    console.log('WebSocket connection closed');
  });

  return new Response(null, {
    status: 101,
    webSocket: client,
  });
}
