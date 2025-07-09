import React, { useEffect } from 'react';
import Head from 'next/head';

interface SimpleLayoutProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export default function SimpleLayout({ title, description, children }: SimpleLayoutProps) {
  useEffect(() => {
    // Enable scrolling for this page
    document.documentElement.style.overflow = 'auto';
    document.body.style.overflow = 'auto';
    document.body.style.height = 'auto';
    
    // Cleanup function to restore original styles when component unmounts
    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      document.body.style.height = '';
    };
  }, []);

  return (
    <>
      <Head>
        <title>{title} - Match 3 Game</title>
        <meta name="description" content={description || `${title} page for Match 3 Game`} />
        <link rel="icon" href="/favicon.png" />
      </Head>

      <main className="min-h-screen bg-background text-foreground">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-4xl font-bold text-center mb-8 text-primary">
            {title}
          </h1>
          
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </>
  );
}