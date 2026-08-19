import Image from 'next/image';
import type { EvidenceFamily } from '@/expedition/evidenceFamilies';

export function FieldPlate({ runId, selectedFamilies }: {
  runId: string;
  selectedFamilies: readonly EvidenceFamily[];
}) {
  const recovered = Math.min(3, selectedFamilies.length);
  const alt = `Field plate scan, ${recovered} of 3 signals recovered.`;
  const revision = selectedFamilies.join('-') || 'blank';

  return (
    <figure className="m-0 w-[84px] shrink-0 rounded-lg border border-cyan-100/15 bg-[#071115] p-1.5 shadow-inner" aria-label={alt}>
      <div className="relative mx-auto grid size-16 place-items-center overflow-hidden rounded-md border border-white/10 bg-[radial-gradient(circle_at_center,rgba(34,211,238,.09),transparent_70%)]">
        <Image
          key={revision}
          src={`/api/runs/${runId}/field-plate?scan=${encodeURIComponent(revision)}`}
          alt={alt}
          width={64}
          height={64}
          unoptimized
          className="size-16 object-contain [image-rendering:pixelated]"
          draggable={false}
        />
        <span className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(255,255,255,.035)_0_1px,transparent_1px_3px)]" aria-hidden="true" />
      </div>
      <figcaption className="mt-1.5 text-center font-mono text-[7px] font-semibold uppercase leading-tight tracking-[.12em] text-cyan-100/65">
        Field plate · {recovered}/3
      </figcaption>
    </figure>
  );
}
