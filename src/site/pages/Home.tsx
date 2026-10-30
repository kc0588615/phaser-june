import { PLAY_URL } from '../config';
import type { PageProps } from '../render';
import { FRAME, H1, H2, H3, MEASURE, NOTE } from '../roles';
import Screenshot, { LEAD_IMAGE } from '../Screenshot';
import Section from '../Section';

// Phone shots (390x844) are cropped to one ratio; the position picks the part each step talks about.
const CROP = 'aspect-[3/4] object-cover';
const TOP = `${CROP} object-top`;

/** "50 mammals, 15 amphibians and 11 reptiles". */
function listClasses({ classes }: PageProps['animals']): string {
  const parts = classes.map(({ name, count }) => `${count} ${name}`);
  return parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}` : parts.join('');
}

/** The front page `/` (plan 051 §4, elaya layout A): what the game is in one screen, then how a round goes. */
export default function Home({ shots, animals }: PageProps) {
  const { heroBoard, boardPhone, globe, fieldGuide, globeFound, journal, roundEnd } = shots;
  if (!heroBoard || !boardPhone || !globe || !fieldGuide || !globeFound || !journal || !roundEnd) throw new Error('Home: a shot is missing from its route');
  return (
    <>
      <Section labelledBy="hero" className="flex flex-col gap-xl">
        <div className="grid gap-m md:grid-cols-2 md:items-end md:gap-xl">
          <h1 id="hero" className={H1}>Find the animal caught on camera</h1>
          <div className="flex flex-col items-start gap-m">
            <p className={MEASURE}>A free game about real animals for grades 6–12. Match gems to answer yes-or-no questions, then rule out the look-alikes until one is left.</p>
            <div className="flex flex-wrap items-center gap-x-m gap-y-xs">
              <a href={PLAY_URL} className="btn btn-primary">Start playing</a>
              <p className={NOTE}>Free. No account, no ads.</p>
            </div>
          </div>
        </div>
        {/* Phone: the board as a phone shows it, cropped square to the board; from 48rem the round on a computer. */}
        <picture className={`block ${FRAME}`}>
          <source media="(max-width: 47.999rem)" srcSet={boardPhone.src} width={boardPhone.width} height={boardPhone.height} />
          <img
            src={heroBoard.src} width={heroBoard.width} height={heroBoard.height} alt={heroBoard.alt} {...LEAD_IMAGE}
            className="block h-auto w-full rounded-m aspect-square object-cover object-[50%_84%] md:aspect-auto md:object-center"
          />
        </picture>
      </Section>

      <Section band labelledBy="round" className="flex flex-col gap-xl">
        <h2 id="round" className={H2}>How a round works</h2>
        <ol className="grid gap-xl md:grid-cols-3">
          <li className="flex flex-col gap-s">
            <h3 className={H3}>Pick a continent</h3>
            <p>You get five look-alike animals from there. One of them was caught on camera.</p>
            <Screenshot shot={globe} crop={TOP} />
          </li>
          <li className="flex flex-col gap-s">
            <h3 className={H3}>Match gems to answer questions</h3>
            <p>Each yes-or-no question fills with 20 matching gems. You have 30 moves a round.</p>
            <Screenshot shot={boardPhone} crop={`${CROP} object-[50%_70%]`} />
          </li>
          <li className="flex flex-col gap-s">
            <h3 className={H3}>Rule out the look-alikes</h3>
            <p>Check each animal&apos;s field guide against the answers. Rule out the wrong one and it escapes.</p>
            <Screenshot shot={fieldGuide} crop={`${CROP} object-bottom`} />
          </li>
        </ol>
      </Section>

      <Section labelledBy="journal" className="grid gap-xl md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:items-center">
        <div className="flex flex-col gap-m">
          <h2 id="journal" className={H2}>Every find goes in your journal</h2>
          <p className={MEASURE}>Finds glow on the globe, and the Field Journal keeps each one&apos;s range map and facts. A trail is 5 rounds and 3 hearts.</p>
        </div>
        <div className="grid grid-cols-2 gap-m">
          <Screenshot shot={globeFound} crop={TOP} />
          <Screenshot shot={journal} crop={TOP} />
        </div>
      </Section>

      <Section band labelledBy="animals" className="grid gap-xl md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] md:items-center">
        <Screenshot shot={roundEnd} crop={`${CROP} object-[50%_40%]`} />
        <div className="flex flex-col gap-m md:order-first">
          <h2 id="animals" className={H2}>{animals.total} real animals, all sourced</h2>
          <p className={MEASURE}>Facts from the IUCN Red List, Animal Diversity Web and other ranked sources. Photos from Wikimedia Commons, credited on every card.</p>
          <p className={MEASURE}>So far {listClasses(animals)}.</p>
        </div>
      </Section>

      <Section labelledBy="teachers" className="grid gap-m md:grid-cols-2 md:gap-xl">
        <h2 id="teachers" className={H2}>Teaching grades 6–12?</h2>
        <div className="flex flex-col items-start gap-m">
          <p className={MEASURE}>Students compare look-alikes, read real field data and rule out what the evidence excludes. No student accounts. About 5–10 minutes a round.</p>
          <a href="/teachers/" className="btn btn-secondary">See how a class uses it</a>
        </div>
      </Section>

      <Section band labelledBy="start" className="flex flex-col items-start gap-m md:flex-row md:items-center md:justify-between">
        <h2 id="start" className={H2}>Ready? Pick a continent.</h2>
        <a href={PLAY_URL} className="btn btn-primary">Start playing</a>
      </Section>
    </>
  );
}
