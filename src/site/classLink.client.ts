// The class link maker on /teachers/ (plan 051 §4 row 4), bundled inline by scripts/site.mjs: a fresh random seed
// per page load, so a class gets its own round, and Copy. Without JS, ClassLink's fixed example link stays.
import { classLinkUrl } from './config';

const field = document.getElementById('class-link') as HTMLInputElement;
const copy = document.getElementById('class-link-copy') as HTMLButtonElement;
const status = document.getElementById('class-link-status') as HTMLElement;

// The game replays seeds 1…4294967295 (useAnimalSession.ts urlSeed); 0 isn't one, so draw again.
const draw = new Uint32Array(1);
do crypto.getRandomValues(draw); while (draw[0] === 0);
field.value = classLinkUrl(draw[0]);
copy.hidden = false;

copy.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(field.value);
    status.textContent = 'Copied';
  } catch {
    field.select();
    status.textContent = 'Couldn\'t copy. The link is selected: copy it from the field.';
  }
});
