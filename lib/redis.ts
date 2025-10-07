import { Redis as Upstash } from '@upstash/redis';
import IORedis from 'ioredis';
import type { FullState } from './types';

const useUpstash = !!process.env.UPSTASH_REDIS_REST_URL;

// Publisher + KV store (works in Edge/Serverless)
export const r = useUpstash
  ? Upstash.fromEnv()
  : new Upstash({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });

// Subscriber for SSE (Node runtime only). For AWS ElastiCache, set REDIS_URL.
export function makeSubscriber() {
  if (process.env.REDIS_URL)
    return new IORedis(process.env.REDIS_URL!, {
      tls: process.env.REDIS_TLS ? {} : undefined,
    });
  if (!process.env.UPSTASH_REDIS_URL)
    throw new Error('Missing UPSTASH_REDIS_URL or REDIS_URL for subscriber');
  return new IORedis(process.env.UPSTASH_REDIS_URL);
}

const STATE_KEY = (roomId: string) => `room:${roomId}:state`;
const PUB_CH = (roomId: string) => `room:${roomId}:public`;
const PRIV_CH = (roomId: string, pid: string) =>
  `room:${roomId}:private:${pid}`;

export async function loadState(roomId: string): Promise<FullState | null> {
  const s = await r.get<string>(STATE_KEY(roomId));
  return s ? (JSON.parse(s) as FullState) : null;
}
export async function saveState(roomId: string, S: FullState) {
  await r.set(STATE_KEY(roomId), JSON.stringify(S));
}
export async function publishPublic(roomId: string, payload: string) {
  await r.publish(PUB_CH(roomId), payload);
}
export async function publishPrivate(
  roomId: string,
  playerId: string,
  payload: string
) {
  await r.publish(PRIV_CH(roomId, playerId), payload);
}

export const channels = { STATE_KEY, PUB_CH, PRIV_CH };
