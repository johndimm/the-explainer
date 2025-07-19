import "@/styles/globals.css";
import { SessionProvider } from "next-auth/react";
import { useEffect } from "react";
import { register } from "@/lib/sw-register";

export default function App({ Component, pageProps }) {
  useEffect(() => {
    // Add global error handling for PWA
    const handleError = (event) => {
      console.error('Global error caught:', event.error);
      // Prevent app crashes in PWA context
      event.preventDefault();
    };

    const handleUnhandledRejection = (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      // Prevent app crashes in PWA context
      event.preventDefault();
    };

    // Register error handlers
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // Register service worker for PWA functionality
    try {
      register();
    } catch (error) {
      console.error('Failed to register service worker:', error);
    }

    // Cleanup
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return (
    <SessionProvider session={pageProps.session}>
      <Component {...pageProps} />
    </SessionProvider>
  );
}
