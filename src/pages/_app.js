import "@/styles/globals.css";
import { SessionProvider } from "next-auth/react";
import { useEffect } from "react";
import { register } from "@/lib/sw-register";

export default function App({ Component, pageProps }) {
  useEffect(() => {
    // Register service worker for PWA functionality
    register();
  }, []);

  return (
    <SessionProvider session={pageProps.session}>
      <Component {...pageProps} />
    </SessionProvider>
  );
}
