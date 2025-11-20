// Cloudflare Pages Function to create new incidents
// Proxies to the backend Worker

const WORKER_URL = 'https://cf-ai-incident-response.zaineel-s-mithani.workers.dev';

export const onRequestPost: PagesFunction = async (context) => {
  try {
    const body = await context.request.json();

    const response = await fetch(`${WORKER_URL}/api/incident`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
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
