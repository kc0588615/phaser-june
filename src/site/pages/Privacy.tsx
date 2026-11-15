import { CONTACT_EMAIL } from '../config';
import LegalArticle from '../LegalArticle';

export default function Privacy() {
  return (
    <LegalArticle title="Privacy Policy" updated="November 15, 2026">
      <p>
        Critter Connect is a free game about real animals. It has no accounts, and we never ask who you are. This page
        explains what stays on your device and what other services see.
      </p>

      <h2>What stays on your device</h2>
      <ul>
        <li>We don&apos;t ask for your name or email.</li>
        <li>
          Your Field Journal and a few settings (like whether you&apos;ve seen the how-to-play screen) are saved in your
          browser only. Clearing your browser data removes them.
        </li>
        <li>The rounds you play aren&apos;t sent to us. Nothing about how you play is kept in our database.</li>
      </ul>

      <h2>Results saved until early October 2026</h2>
      <p>
        The game used to have optional accounts. Until early October 2026, the results of rounds played with an account
        were saved in our database. Rounds played without one were saved too, with nothing that says who played them.
        Those results are being deleted, and no new ones are kept.
      </p>

      <h2>What we don&apos;t do</h2>
      <ul>
        <li>No ads, no tracking cookies, no analytics services.</li>
        <li>We don&apos;t sell or share your information. It is only used to run the game.</li>
      </ul>

      <h2>Other services</h2>
      <p>
        Animal photos load from Wikimedia Commons, which sees your IP address, like any website you visit. Everything
        else, maps included, comes from Critter Connect itself.
      </p>

      <h2>Players under 13</h2>
      <p>
        The game never asks anyone for a name, an email or anything else about themselves, so no one gives any to play.
        A parent with questions can email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>

      <h2>Deleting your data</h2>
      <p>
        Your Field Journal is in your browser: clearing your browser&apos;s data for play.critterconnect.org deletes it.
        If you played with an account while results were saved, until early October 2026, and want them deleted now,
        email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> from the address you used for it.
      </p>

      <h2>Changes</h2>
      <p>If this policy changes, we will update the date at the top of this page.</p>
    </LegalArticle>
  );
}
