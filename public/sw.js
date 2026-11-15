/* PrintOK PWA: explicitly no private data caches. */
'use strict';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
// No fetch listener: customer review links, artwork, sessions and Neon API always use the network.
