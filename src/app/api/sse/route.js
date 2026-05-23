import { addClient, removeClient } from '@/lib/sse';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial keep-alive
      controller.enqueue(encoder.encode(': connected\n\n'));

      const res = {
        write(data) {
          try {
            controller.enqueue(encoder.encode(data));
          } catch {
            // Client disconnected
          }
        },
        close() {
          try {
            controller.close();
          } catch {
            // ignore
          }
        },
      };

      addClient(res);

      // Handle client disconnect
      request.signal.addEventListener('abort', () => {
        removeClient(res);
        try { controller.close(); } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
