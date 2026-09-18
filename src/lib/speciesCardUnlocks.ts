export async function unlockSpeciesCardDiscovery(speciesId: number): Promise<void> {
  if (!Number.isFinite(speciesId) || speciesId <= 0) return;
  await postSpeciesCardUnlock(speciesId, {
    unlockType: 'discover',
    payload: {},
  });
}

async function postSpeciesCardUnlock(speciesId: number, body: { unlockType: string; payload: Record<string, unknown> }) {
  const response = await fetch(`/api/species/cards/${speciesId}/unlock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok && response.status !== 401) {
    console.warn(`[speciesCardUnlocks] Failed to persist ${body.unlockType} unlock for species ${speciesId}: ${response.status}`);
  }

  if (response.ok && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('species-card-progress-updated', { detail: { speciesId } }));
  }
}
