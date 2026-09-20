import { NextRequest, NextResponse } from 'next/server';
import { isUuid } from '@/lib/runCaseState';
import { publicRoutingView } from '@/terrain/routing';
import { createCostaRicaRoutingSession, routingPrototypeEnabled } from '@/terrain/routingStore.server';

export async function POST(request: NextRequest) {
  try {
    if (!routingPrototypeEnabled()) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const body = await request.json().catch(() => ({})) as { createRequestId?: unknown; boardSeed?: unknown };
    const createRequestId = body.createRequestId === undefined ? undefined : isUuid(body.createRequestId) ? body.createRequestId : null;
    if (createRequestId === null) return NextResponse.json({ error: 'createRequestId must be a UUID' }, { status: 400 });
    const boardSeed = body.boardSeed === undefined ? 91 : body.boardSeed;
    if (!Number.isInteger(boardSeed) || (boardSeed as number) < 0 || (boardSeed as number) > 0xffff_ffff) {
      return NextResponse.json({ error: 'boardSeed must be a uint32' }, { status: 400 });
    }
    const session = createCostaRicaRoutingSession(createRequestId, boardSeed as number);
    return NextResponse.json({
      sessionId: session.id,
      boardSeed: session.boardSeed,
      terrain: session.terrain,
      checkpoint: session.checkpoint ?? null,
      view: publicRoutingView(session.state, session.scenario, session.terrain),
    });
  } catch (error) {
    console.error('[routing-prototype] create failed', error);
    return NextResponse.json({ error: 'Failed to create routing prototype' }, { status: 500 });
  }
}
