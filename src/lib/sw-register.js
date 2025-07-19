export function register() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      const swUrl = '/sw.js';

      // Add timeout to prevent hanging
      const timeout = setTimeout(() => {
        console.warn('Service worker registration timed out');
      }, 10000);

      navigator.serviceWorker
        .register(swUrl)
        .then((registration) => {
          clearTimeout(timeout);
          console.log('Service worker registered successfully');
          
          // onupdatefound will let us know when there's a new service worker
          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker == null) {
              return;
            }
            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  // At this point, the updated precached content has been fetched,
                  // but the previous service worker will still serve the older
                  // content until all client tabs are closed.
                  console.log(
                    'New content is available and will be used when all ' +
                      'tabs for this page are closed. See https://bit.ly/CRA-PWA.'
                  );

                  // Optional: Show a notification to the user
                  if (window.confirm('New version available! Reload to update?')) {
                    window.location.reload();
                  }
                } else {
                  // At this point, everything has been precached.
                  // It's the perfect time to display a
                  // "Content is cached for offline use." message.
                  console.log('Content is cached for offline use.');
                }
              }
            };
          };
        })
        .catch((error) => {
          clearTimeout(timeout);
          console.error('Error during service worker registration:', error);
          // Don't crash the app if service worker fails
        });
    });
  }
}

export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
      })
      .catch((error) => {
        console.error(error.message);
      });
  }
} 