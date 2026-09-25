import { clerkMiddleware } from '@clerk/nextjs/server';

// Makes the Clerk session available to routes; each route checks auth itself
// (/api/player/ensure-profile returns 401 when signed out).
export default clerkMiddleware();

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
