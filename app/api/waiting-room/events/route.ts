import { NextRequest } from 'next/server';
import { makeSubscriber } from '@/lib/redis';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const WAITING_ROOM_CHANNEL = 'waiting_room:updates';

export async function GET(req: NextRequest) {
  const subscriber = makeSubscriber();

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Send initial connection message
      controller.enqueue(encoder.encode('data: {"type":"connected"}\n\n'));

      // Subscribe to waiting room updates
      subscriber.subscribe(WAITING_ROOM_CHANNEL, (err, count) => {
        if (err) {
          console.error('Redis subscription error:', err);
          controller.close();
          return;
        }
        console.log(
          `Subscribed to waiting room updates. Subscriber count: ${count}`
        );
      });

      subscriber.on('message', (channel, message) => {
        if (channel === WAITING_ROOM_CHANNEL) {
          try {
            const data = JSON.parse(message);
            controller.enqueue(encoder.encode(`data: ${message}\n\n`));
          } catch (error) {
            console.error('Error parsing waiting room message:', error);
          }
        }
      });

      // Handle client disconnect
      req.signal.addEventListener('abort', () => {
        subscriber.unsubscribe(WAITING_ROOM_CHANNEL);
        subscriber.disconnect();
        controller.close();
      });
    },

    cancel() {
      subscriber.unsubscribe(WAITING_ROOM_CHANNEL);
      subscriber.disconnect();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  });
}
