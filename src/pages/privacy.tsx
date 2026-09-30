import LegalPage, { CONTACT_EMAIL } from '@/components/LegalPage';

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="September 26, 2026">
      <p>
        Critter Connect is a free game about real animals. You can play without an account. This page explains what we
        keep if you do sign in, and what stays on your own device.
      </p>

      <h2>If you play without signing in</h2>
      <ul>
        <li>We don&apos;t ask for your name or email.</li>
        <li>
          Your Field Journal and a few settings (like whether you&apos;ve seen the how-to-play screen) are saved in your
          browser only. Clearing your browser data removes them.
        </li>
        <li>Finished rounds are saved without any link to you, so we can see which puzzles are too easy or too hard.</li>
      </ul>

      <h2>If you sign in</h2>
      <ul>
        <li>
          Sign-in is handled by <a href="https://clerk.com/legal/privacy">Clerk</a>. Clerk keeps your email address, and
          your name and profile picture if you sign in with Google. We never see your password.
        </li>
        <li>
          Our database keeps an account ID from Clerk and your game results: which animal, which place, whether you found it,
          moves, the questions you asked, points, and when you played. We use this to sync your Field Journal between devices.
        </li>
      </ul>

      <h2>What we don&apos;t do</h2>
      <ul>
        <li>No ads, no tracking cookies, no analytics services.</li>
        <li>We don&apos;t sell or share your information. It is only used to run the game.</li>
      </ul>

      <h2>Other services</h2>
      <p>
        Animal photos load from Wikimedia Commons, and maps from our map servers. Those services see your IP address, like
        any website you visit.
      </p>

      <h2>Players under 13</h2>
      <p>
        The game works fully without an account. If you are under 13, please ask a parent or guardian before signing in. A
        parent can ask us to see or delete a child&apos;s account and game results at any time.
      </p>

      <h2>Deleting your data</h2>
      <p>
        Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> from the address you signed in with, and we will
        delete your account and game results.
      </p>

      <h2>Changes</h2>
      <p>If this policy changes, we will update the date at the top of this page.</p>
    </LegalPage>
  );
}
