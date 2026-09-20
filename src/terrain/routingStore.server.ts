import { randomUUID } from 'node:crypto';
import { createRoutingSession, type RoutingSession } from './routingSession';
import { costaRicaRoutingScenario } from './routingScenario';
import { loadCostaRicaTerrain } from './routingFixture.server';

const sessions = new Map<string, RoutingSession>();
const createIds = new Map<string, string>();
const tails = new Map<string, Promise<unknown>>();

export function routingPrototypeEnabled(): boolean {
  return process.env.ROUTING_PROTOTYPE === '1' || process.env.NODE_ENV !== 'production';
}

export function getRoutingSession(id: string): RoutingSession | undefined {
  return sessions.get(id);
}

export async function withRoutingSession<T>(id: string, fn: (session: RoutingSession | undefined) => Promise<T> | T): Promise<T> {
  const previous = tails.get(id) ?? Promise.resolve();
  let release: () => void = () => {};
  const current = new Promise<void>(resolve => { release = resolve; });
  tails.set(id, previous.then(() => current));
  await previous;
  try {
    return await fn(sessions.get(id));
  } finally {
    release();
    if (tails.get(id) === current) tails.delete(id);
  }
}

export function createCostaRicaRoutingSession(createRequestId?: string, boardSeed = 91): RoutingSession {
  if (createRequestId) {
    const existing = createIds.get(createRequestId);
    if (existing) {
      const session = sessions.get(existing);
      if (session) return session;
    }
  }
  const terrain = loadCostaRicaTerrain();
  const session = createRoutingSession(terrain, costaRicaRoutingScenario(terrain), boardSeed);
  sessions.set(session.id, session);
  if (createRequestId) createIds.set(createRequestId, session.id);
  return session;
}

export function rememberRoutingSession(session: RoutingSession, createRequestId?: string): void {
  sessions.set(session.id, session);
  if (createRequestId) createIds.set(createRequestId, session.id);
}

export function newRoutingRequestId(): string {
  return randomUUID();
}
