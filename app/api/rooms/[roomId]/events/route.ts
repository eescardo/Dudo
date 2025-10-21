import { NextRequest } from 'next/server';
import { makeSubscriber, channels, loadState } from '@/lib/redis';
import { safeId } from '@/lib/id';

export const runtime = 'nodejs'; // TCP needed for ioredis subscribe
export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const roomId = safeId(params.roomId);
    const { searchParams } = new URL(req.url);
    const playerId = safeId(searchParams.get('playerId') || '');
    if (!playerId) return new Response('playerId required', { status: 400 });

    const encoder = new TextEncoder();

    // Add error handling for Redis connection
    let sub;
    try {
      sub = makeSubscriber();
      await sub.subscribe(
        channels.PUB_CH(roomId),
        channels.PRIV_CH(roomId, playerId)
      );
    } catch (redisError) {
      console.error('Redis connection error:', redisError);
      return new Response(
        JSON.stringify({
          error: 'Redis connection failed',
          details:
            redisError instanceof Error ? redisError.message : 'Unknown error',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const stream = new ReadableStream<Uint8Array>({
      start: async (controller) => {
        try {
          // send initial snapshot
          const S = await loadState(roomId);
          if (S)
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: 'state', state: { ...S, secret: undefined } })}\n\n`
              )
            );
        } catch (loadError) {
          console.error('Error loading initial state:', loadError);
          // Continue without initial state - don't crash the stream
        }

        const onMessage = (channel: string, message: string) => {
          controller.enqueue(encoder.encode(`data: ${message}\n\n`));
        };
        sub.on('message', onMessage);

        const t = setInterval(
          () => controller.enqueue(encoder.encode(`: ping\n\n`)),
          15000
        );
        const close = () => {
          clearInterval(t);
          sub.off('message', onMessage);
          sub.disconnect();
          controller.close();
        };
        req.signal.addEventListener('abort', close);
      },
      cancel() {
        try {
          sub.disconnect();
        } catch {}
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'Content-Encoding': 'none',
      },
    });
  } catch (error) {
    console.error('Unexpected error in events endpoint:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
