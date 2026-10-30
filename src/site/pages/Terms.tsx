import { CONTACT_EMAIL, OPERATOR } from '../config';
import LegalArticle from '../LegalArticle';

export default function Terms() {
  return (
    <LegalArticle title="Terms of Service" updated="October 29, 2026">
      <p>By playing Critter Connect you agree to these terms. They are short on purpose. Critter Connect is run by {OPERATOR}, the &ldquo;we&rdquo; in these terms.</p>

      <h2>The game</h2>
      <ul>
        <li>Critter Connect is free. It is for learning and fun, and comes as-is, without guarantees.</li>
        <li>We may change the game, reset scores, or take it offline at any time.</li>
        <li>Animal facts come from the sources shown on each reveal card. We work to get them right, but check the source for anything important.</li>
      </ul>

      <h2>Your account</h2>
      <ul>
        <li>An account is optional. If you are under 13, ask a parent or guardian first.</li>
        <li>Please don&apos;t try to break, overload, or cheat the game&apos;s servers. We may close accounts that do.</li>
      </ul>

      <h2>Photos and content</h2>
      <p>
        Animal photos belong to their creators and are used under the licenses credited on each card. Maps use data from
        the IUCN Red List and other credited sources.
      </p>

      <h2>Privacy</h2>
      <p>
        See the <a href="/privacy/">Privacy Policy</a> for what we keep and how to delete it.
      </p>

      <h2>Contact</h2>
      <p>
        Questions: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </p>
    </LegalArticle>
  );
}
