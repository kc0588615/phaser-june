// The wordmark in the mode's text color (the -light file is the same art with a black wordmark); dark: is [data-theme].
// Shared by the game's globe and the website (src/site), so no Next imports.
export default function Wordmark() {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- static SVG wordmark */}
      <img src="/branding/critterconnect-logo-light.svg" alt="Critter Connect" className="block h-6 w-auto dark:hidden" />
      {/* eslint-disable-next-line @next/next/no-img-element -- static SVG wordmark */}
      <img src="/branding/critterconnect-logo.svg" alt="Critter Connect" className="hidden h-6 w-auto dark:block" />
    </>
  );
}
