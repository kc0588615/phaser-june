import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { db, ecoRunSessions, speciesTable } from '@/db';
import { getPlayerIdFromClerk } from '@/lib/authHelpers';
import { readFieldPlatePortrait } from '@/lib/fieldPlatePortraits.server';
import { encodeFieldPlateScan } from '@/lib/fieldPlateScan.server';
import { getRecord, isUuid, parsePrivateCase, parseV3EvidenceApplications } from '@/lib/runCaseState';

const PNG_HEADERS = { 'Content-Type': 'image/png', 'Cache-Control': 'private, no-store' } as const;

export async function GET(_request: NextRequest, { params }: { params: Promise<{ runId: string }> }) {
  try {
    const playerId = await getPlayerIdFromClerk();
    if (!playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { runId } = await params;
    if (!isUuid(runId)) return NextResponse.json({ error: 'Invalid runId' }, { status: 400 });
    const [session] = await db.select({
      playerId: ecoRunSessions.playerId,
      runStatus: ecoRunSessions.runStatus,
      metadata: ecoRunSessions.metadata,
    }).from(ecoRunSessions).where(eq(ecoRunSessions.id, runId)).limit(1);
    if (!session) return NextResponse.json({ error: 'Run not found' }, { status: 404 });
    if (session.playerId !== playerId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const metadata = getRecord(session.metadata);
    const privateCase = parsePrivateCase(metadata.casePrivate);
    if (!privateCase) return NextResponse.json({ reason: 'legacy_run' }, { status: 409 });

    if (session.runStatus === 'completed') {
      const [species] = await db.select({ iucnId: speciesTable.iucnId })
        .from(speciesTable).where(eq(speciesTable.id, privateCase.answerId)).limit(1);
      const portrait = species ? await readFieldPlatePortrait(species.iucnId) : null;
      if (!portrait) return NextResponse.json({ error: 'Field plate unavailable' }, { status: 404 });
      return pngResponse(portrait);
    }
    if (!['active', 'deduction', 'abandoned'].includes(session.runStatus)) {
      return NextResponse.json({ reason: 'unsupported_run_status' }, { status: 409 });
    }
    const families = parseV3EvidenceApplications(metadata.evidenceApplications).map(application => application.family);
    return pngResponse(encodeFieldPlateScan(privateCase.caseSeed, families));
  } catch (error) {
    console.error('[API GET /api/runs/[runId]/field-plate] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch field plate' }, { status: 500 });
  }
}

function pngResponse(png: Buffer): Response {
  return new Response(new Uint8Array(png), {
    headers: { ...PNG_HEADERS, 'Content-Length': String(png.byteLength) },
  });
}
