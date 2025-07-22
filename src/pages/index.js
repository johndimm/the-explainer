import { useState, useCallback, useRef, useEffect } from 'react';
import Head from "next/head";
import styles from '@/styles/Home.module.css';

export default function Home() {
  const [debugTime, setDebugTime] = useState('loading...');

  useEffect(() => {
    setDebugTime(new Date().toLocaleTimeString());
  }, []);

  return (
    <>
      <Head>
        <title>The Explainer - Understand Difficult Texts</title>
        <meta name="description" content="A progressive app to help you understand difficult texts line by line" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      {/* MINIMAL DEBUG */}
      <div style={{ 
        position: 'fixed', 
        top: '0px', 
        left: '0px', 
        right: '0px', 
        background: 'green', 
        color: 'white', 
        padding: '20px', 
        fontSize: '16px', 
        zIndex: 10000,
        textAlign: 'center'
      }}>
        MINIMAL PAGE LOADED!<br />
        Time: {debugTime}<br />
        UserAgent: {typeof window !== 'undefined' ? navigator.userAgent.substring(0, 50) : 'server'}...
      </div>
      
      <div className={styles.page}>
        <div className={styles.container}>
          <h1>Main App</h1>
          <p>If you see this, the main page is working!</p>
        </div>
      </div>
    </>
  );
}
