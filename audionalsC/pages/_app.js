import '../styles/globals.css';
import Head from 'next/head';
import { useState, useEffect } from 'react';

function MyApp({ Component, pageProps }) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading time for animation purposes
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <Head>
        <title>Audionals - On-Chain Music Production on Bitcoin</title>
        <meta name="description" content="Audionals is a pioneering protocol that transforms music production, distribution and rights management on the Bitcoin blockchain." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&family=Open+Sans:wght@400;600&family=Roboto+Mono&display=swap" rel="stylesheet" />
      </Head>
      
      {isLoading ? (
        <div className="loading-screen">
          <div className="loading-icon">
            <span className="bitcoin-icon">₿</span>
          </div>
          <p>Loading Audionals...</p>
        </div>
      ) : (
        <Component {...pageProps} />
      )}
    </>
  );
}

export default MyApp;
