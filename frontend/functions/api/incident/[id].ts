// Cloudflare Pages Function to get incident details by ID

interface Env {
  INCIDENTS: DurableObjectNamespace;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const incidentId = context.params.id as string;

    if (!incidentId) {
      return new Response(
        JSON.stringify({ error: 'Incident ID required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const id = context.env.INCIDENTS.idFromName(incidentId);
    const stub = context.env.INCIDENTS.get(id);

    const doRequest = new Request('https://fake-host/incident-state', {
      method: 'GET',
    });

    const response = await stub.fetch(doRequest);
    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    });
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
