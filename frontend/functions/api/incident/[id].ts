// Cloudflare Pages Function to get incident details by ID
// Proxies to the backend Worker

const WORKER_URL = 'https://cf-ai-incident-response.zaineel-s-mithani.workers.dev';

export const onRequestGet: PagesFunction = async (context) => {
  try {
    const incidentId = context.params.id as string;

    if (!incidentId) {
      return new Response(
        JSON.stringify({ error: 'Incident ID required' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    const response = await fetch(`${WORKER_URL}/api/incident/${incidentId}`, {
      method: 'GET',
    });

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
};
