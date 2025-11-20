// Cloudflare Pages Function to create new incidents

interface Env {
  INCIDENTS: DurableObjectNamespace;
  INCIDENT_WORKFLOW: Workflow;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const {
      title,
      description,
      severity,
      logs,
      metrics,
      affectedSystems,
    } = await context.request.json() as {
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
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Generate unique incident ID
    const incidentId = `INC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Initialize Durable Object for this incident
    const id = context.env.INCIDENTS.idFromName(incidentId);
    const stub = context.env.INCIDENTS.get(id);

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

    return new Response(
      JSON.stringify({
        incidentId,
        status: 'created',
        message: 'Incident created and analysis workflow triggered',
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
