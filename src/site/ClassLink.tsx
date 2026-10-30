import { CLASS_LINK_EXAMPLE_SEED, classLinkUrl } from './config';
import { NOTE } from './roles';

/** The class link maker (plan 051 §4 /teachers/ row 4): a read-only cc Field with the link, Copy, and a live line.
 * The page ships a fixed example; `script` (classLink.client.ts, bundled by scripts/site.mjs) swaps in a random seed
 * and shows Copy, which needs JS. */
export default function ClassLink({ script }: { script: string }) {
  return (
    <div className="flex flex-col gap-xs">
      <label htmlFor="class-link" className="text-s font-medium text-neutral-10">Class link</label>
      <div className="flex flex-wrap items-center gap-s">
        <input
          id="class-link" type="text" readOnly defaultValue={classLinkUrl(CLASS_LINK_EXAMPLE_SEED)} spellCheck={false}
          className="min-w-0 flex-1 basis-64 rounded-s bg-neutral-2 px-m py-s text-s text-neutral-8"
        />
        <button id="class-link-copy" type="button" className="btn btn-secondary" hidden>Copy</button>
      </div>
      <p id="class-link-status" aria-live="polite" className={NOTE}></p>
      <script dangerouslySetInnerHTML={{ __html: script }} />
    </div>
  );
}
