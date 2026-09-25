import { clerkMiddleware } from '@clerk/nextjs/server';

// Makes the Clerk session available to routes (POST /api/clue-game/solves reads
// it to save a solve under the player's profile).
export default clerkMiddleware();

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
