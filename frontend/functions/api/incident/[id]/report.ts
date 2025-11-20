// Cloudflare Pages Function to generate post-incident reports
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

    const url = new URL(context.request.url);
    const format = url.searchParams.get('format') || 'markdown';

    const response = await fetch(
      `${WORKER_URL}/api/incident/${incidentId}/report?format=${format}`,
      {
        method: 'GET',
      }
    );

    // Forward the response with all headers (including Content-Disposition for download)
    const headers = new Headers();
    response.headers.forEach((value, key) => {
      headers.set(key, value);
    });
    headers.set('Access-Control-Allow-Origin', '*');

    const body = await response.arrayBuffer();

    return new Response(body, {
      status: response.status,
      headers,
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
