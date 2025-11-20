// Cloudflare Pages Function for chat API
// This proxies requests to the Workers backend

interface Env {
  INCIDENTS: DurableObjectNamespace;
  AI: Ai;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { message, incidentId } = await context.request.json() as {
      message: string;
      incidentId: string;
    };

    if (!message || !incidentId) {
      return new Response(
        JSON.stringify({ error: 'Message and incidentId are required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Get or create Durable Object for this incident
    const id = context.env.INCIDENTS.idFromName(incidentId);
    const stub = context.env.INCIDENTS.get(id);

    // Forward request to Durable Object
    const doRequest = new Request('https://fake-host/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
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
