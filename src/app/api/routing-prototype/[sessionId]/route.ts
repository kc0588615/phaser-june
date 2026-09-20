import { NextRequest, NextResponse } from 'next/server';
import { isUuid } from '@/lib/runCaseState';
import { publicRoutingView } from '@/terrain/routing';
import { applyRoutingCommand, parseRoutingCommand } from '@/terrain/routingSession';
import { getRoutingSession, routingPrototypeEnabled, withRoutingSession } from '@/terrain/routingStore.server';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
  try {
    if (!routingPrototypeEnabled()) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const { sessionId } = await params;
    if (!isUuid(sessionId)) return NextResponse.json({ error: 'Invalid session' }, { status: 400 });
    const session = getRoutingSession(sessionId);
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    return NextResponse.json({
      sessionId: session.id,
      boardSeed: session.boardSeed,
      terrain: session.terrain,
      checkpoint: session.checkpoint ?? null,
      view: publicRoutingView(session.state, session.scenario, session.terrain),
    });
  } catch (error) {
    console.error('[routing-prototype] get failed', error);
    return NextResponse.json({ error: 'Failed to load routing prototype' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
  try {
    if (!routingPrototypeEnabled()) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const { sessionId } = await params;
    if (!isUuid(sessionId)) return NextResponse.json({ error: 'Invalid session' }, { status: 400 });
    const command = parseRoutingCommand(await request.json().catch(() => null));
    if (!command) return NextResponse.json({ error: 'Invalid routing command' }, { status: 400 });
    const result = await withRoutingSession(sessionId, session => {
      if (!session) return { missing: true as const };
      return applyRoutingCommand(session, command);
    });
    if ('missing' in result) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    if (!result.ok) return NextResponse.json({ reason: result.reason }, { status: 409 });
    return NextResponse.json({
      ok: true,
      duplicate: result.duplicate,
      sessionId: result.session.id,
      boardSeed: result.session.boardSeed,
      terrain: result.session.terrain,
      checkpoint: result.session.checkpoint ?? null,
      view: result.view,
    });
  } catch (error) {
    console.error('[routing-prototype] command failed', error);
    return NextResponse.json({ error: 'Failed to apply routing command' }, { status: 500 });
  }
}
