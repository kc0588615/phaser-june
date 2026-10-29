import ClassLink from '../ClassLink';
import { PLAY_URL } from '../config';
import type { PageProps } from '../render';
import { FRAME, H1, H2, H3, LINK, MEASURE } from '../roles';
import Screenshot, { LEAD_IMAGE } from '../Screenshot';
import Section from '../Section';

// Phone shots (390x844) cropped to one ratio, as on `/`; the position picks the part the section talks about.
const CROP = 'aspect-[3/4] object-cover';
const LIST = 'flex list-disc flex-col gap-xs pl-l';
// Text beside a phone shot from 48rem; the shot first on a phone would push the words a screen down, so it follows them.
const SPLIT = 'grid gap-xl md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] md:items-start';

// plan 051 §6: the only coming-soon items, each a row starting "Not available yet:".
const COMING = [
  'a printable teacher guide with a round walkthrough and debrief activities.',
  'a standards map showing which NGSS practices each activity maps onto.',
  'class results from a class link, per animal, with no student names.',
];

// plan 051 §4 row 8: plain, visible Q&A (not collapsed), answered only from §5's claims.
const FAQ: Array<{ q: string; a: string }> = [
  { q: 'Is it free?', a: 'Yes. No ads, and nothing to install.' },
  { q: 'Do students need accounts?', a: 'No. The game plays fully without one. Signing in is optional; it keeps a player\'s Field Journal on more than one device.' },
  { q: 'What grades is it for?', a: 'Grades 6–12.' },
  { q: 'How long is a round?', a: 'About 5–10 minutes.' },
  { q: 'What devices does it run on?', a: 'Phones and computers, in a browser.' },
  { q: 'Can the whole class get the same animals?', a: 'Yes. Share a class link from this page: everyone who opens it gets the same animals and the same boards.' },
  { q: 'Can I see my students\' results?', a: 'Not yet. Class results are on the list under Coming later.' },
  { q: 'Is the information accurate?', a: 'Every fact comes from a ranked source, the IUCN Red List first, and each round-end card lists its sources. Traits are simplified into categories, and "no record" doesn\'t mean "no".' },
  { q: 'Does it work offline?', a: 'No. It needs an internet connection.' },
];

/** `/teachers/` (plan 051 §4, elaya layout B): what a class does with the game, answered doubt by doubt. */
export default function Teachers({ shots, animals, classLinkScript }: PageProps) {
  const { gridMarked, fieldGuide, witnessNote, roundEnd, journal } = shots;
  if (!gridMarked || !fieldGuide || !witnessNote || !roundEnd || !journal) throw new Error('Teachers: a shot is missing from its route');
  return (
    <>
      {/* On a computer (64rem) the shot leads beside the words (Taste focal-point: a picture of at least a
          third of the first screen); narrower, it goes under them, so the headline keeps two lines. From 48rem the crop is
          the evidence grid exactly (the top 750 of the shot's 780x1688 px), ending at the board's edge. */}
      <Section labelledBy="hero" className="grid gap-xl lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-center">
        <div className="flex flex-col items-start gap-m">
          <h1 id="hero" className={H1}>A deduction game for science</h1>
          <p className={MEASURE}>Students compare five look-alike animals, read real field data and rule out the ones the evidence excludes. Free, in a browser, no student accounts; about 5–10 minutes a round.</p>
          <a href={PLAY_URL} className="btn btn-primary">Play a round yourself</a>
        </div>
        <div className={FRAME}>
          <img
            src={gridMarked.src} width={gridMarked.width} height={gridMarked.height} alt={gridMarked.alt} {...LEAD_IMAGE}
            className={`block h-auto w-full rounded-m ${CROP} object-top md:aspect-[780/750]`}
          />
        </div>
      </Section>

      <Section band labelledBy="round" className={SPLIT}>
        <div className="flex flex-col gap-m">
          <h2 id="round" className={H2}>What students do in a round</h2>
          <ul className={`${LIST} ${MEASURE}`}>
            <li>Five look-alike animals sit on the board. One of them is the one the camera saw.</li>
            <li>They have 30 moves. Four yes-or-no questions ask about the camera&apos;s animal; matching 20 of a question&apos;s gems answers it.</li>
            <li>Clearing a question&apos;s gems next to an animal&apos;s card scouts that animal&apos;s own answer.</li>
            <li>The answers never rule anyone out by themselves. Students compare them with each animal&apos;s field guide and rule out the ones that can&apos;t be it, then clear gems next to them to release them.</li>
            <li>Rule out the one the camera saw by mistake, and it escapes: the round is lost and costs a heart. A trail is 5 rounds with 3 hearts.</li>
            <li>The round-end card shows the full record: the family tree, the range map and the sources.</li>
          </ul>
        </div>
        <Screenshot shot={fieldGuide} crop={`${CROP} object-bottom`} />
      </Section>

      <Section labelledBy="practice" className={SPLIT}>
        <div className="flex flex-col gap-m">
          <h2 id="practice" className={H2}>What they practice</h2>
          <ul className={`${LIST} ${MEASURE}`}>
            <li>Elimination: ruling out each animal that several pieces of evidence together exclude.</li>
            <li>Reading a data table: the five animals&apos; answers to four questions.</li>
            <li>Precise wording: &ldquo;mostly&rdquo; isn&apos;t &ldquo;only&rdquo;, and &ldquo;no record&rdquo; isn&apos;t &ldquo;no&rdquo;.</li>
            <li>Evidence from text: matching a witness note to the animals&apos; field guides.</li>
            <li>Comparing close relatives: rounds are built from look-alikes, like the okapi and the hirola.</li>
            <li>Geography and taxonomy: questions about regions within a continent, and a family tree on every round-end card.</li>
          </ul>
          <p className={MEASURE}>These map onto NGSS practices (analyzing and interpreting data, engaging in argument from evidence) and ideas like MS-LS4-2.</p>
          <blockquote className={`${MEASURE} rounded-m bg-neutral-3 px-m py-s`}>
            <p>The game does not claim to teach these on its own; it gives repeated, low-stakes practice with real data.</p>
          </blockquote>
          <p className={MEASURE}>So far tested with simulated players, not yet in a classroom study: one who matches without reasoning finds nothing, and a careful one finds the animal in over 90% of rounds.</p>
        </div>
        <Screenshot shot={witnessNote} crop={`${CROP} object-bottom`} />
      </Section>

      <Section band labelledBy="class" className={SPLIT}>
        <div className="flex flex-col gap-m">
          <h2 id="class" className={H2}>Using it with a class</h2>
          <ol className={`flex list-decimal flex-col gap-s pl-l ${MEASURE}`}>
            <li><strong className="font-heavy">Think aloud in pairs.</strong> One student plays; the other has to agree to every rule-out.</li>
            <li><strong className="font-heavy">Debrief losses.</strong> After an escape, ask which answer or note was misread. The round-end card has everything needed.</li>
            <li><strong className="font-heavy">Share a seed.</strong> A class link gives everyone the same animals, so the class can compare strategies.</li>
            <li><strong className="font-heavy">Extend from the journal.</strong> Students pick an animal they found and research a trait the game simplified.</li>
          </ol>
          <p className={MEASURE}>Sound starts off, and the board plays with a keyboard too.</p>
          <div className={`flex flex-col gap-s ${MEASURE}`}>
            <h3 className={H3}>Make a class link</h3>
            <p>Everyone who opens it starts with the same animals. Each visit to this page makes a new one.</p>
            <ClassLink script={classLinkScript} />
          </div>
        </div>
        <Screenshot shot={roundEnd} crop={`${CROP} object-[50%_40%]`} />
      </Section>

      <Section labelledBy="privacy" className="flex flex-col gap-l">
        <h2 id="privacy" className={H2}>Student privacy</h2>
        <div className="grid gap-l md:grid-cols-2 md:gap-xl">
          <div className="flex flex-col gap-s">
            <h3 className={H3}>Without signing in</h3>
            <ul className={LIST}>
              <li>The game plays fully without an account.</li>
              <li>No name or email is asked for.</li>
              <li>The Field Journal stays in the browser.</li>
              <li>Finished rounds are saved with no link to the player.</li>
            </ul>
          </div>
          <div className="flex flex-col gap-s">
            <h3 className={H3}>With signing in</h3>
            <ul className={LIST}>
              <li>Signing in is optional. Players under 13 should ask a parent or guardian first.</li>
              <li>Sign-in is handled by Clerk, which keeps the email address.</li>
              <li>The game keeps the player&apos;s results, to sync their Field Journal between devices.</li>
              <li>A parent can ask for a child&apos;s account and results to be deleted.</li>
            </ul>
          </div>
        </div>
        <p className={MEASURE}>Either way: no ads, no tracking cookies, no analytics. Animal photos load from Wikimedia Commons. The <a href="/privacy/" className={LINK}>privacy policy</a> has the details.</p>
      </Section>

      <Section band labelledBy="facts" className={SPLIT}>
        <div className="flex flex-col gap-m">
          <h2 id="facts" className={H2}>Where the facts come from</h2>
          <p className={MEASURE}>All {animals.total} animals&apos; facts come from ranked sources: the IUCN Red List and its range maps first, then scientific databases like Animal Diversity Web and AmphibiaWeb, then zoos and wildlife agencies. Every source is on the round-end card.</p>
          <h3 className={H3}>Its limits</h3>
          <ul className={`${LIST} ${MEASURE}`}>
            <li>Traits are simplified into categories, like a diet of plants, meat, insects or a mix. Real animals vary.</li>
            <li>&ldquo;No record&rdquo; doesn&apos;t mean &ldquo;no&rdquo;: an animal may share a trait its record doesn&apos;t mention.</li>
            <li>Pictures simplify: an ant stands for &ldquo;eats mostly bugs&rdquo;. The exact wording is in the text.</li>
            <li>Teachers can&apos;t see students&apos; reasoning yet.</li>
          </ul>
        </div>
        <Screenshot shot={journal} crop={`${CROP} object-top`} />
      </Section>

      <Section labelledBy="later" className="grid gap-m md:grid-cols-2 md:gap-xl">
        <h2 id="later" className={H2}>Coming later: not available yet</h2>
        <ul className={LIST}>
          {COMING.map(item => <li key={item}><strong className="font-heavy">Not available yet:</strong> {item}</li>)}
        </ul>
      </Section>

      <Section band labelledBy="faq" className="flex flex-col gap-l">
        <h2 id="faq" className={H2}>Questions teachers ask</h2>
        <div className="grid gap-l md:grid-cols-2 md:gap-x-xl">
          {FAQ.map(({ q, a }) => (
            <div key={q} className="flex flex-col gap-xs">
              <h3 className={H3}>{q}</h3>
              <p className={MEASURE}>{a}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section labelledBy="start" className="flex flex-col items-start gap-m md:flex-row md:items-center md:justify-between">
        <h2 id="start" className={H2}>Try a round, then share a link</h2>
        <a href={PLAY_URL} className="btn btn-primary">Play a round yourself</a>
      </Section>
    </>
  );
}
