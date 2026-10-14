/* Finance App service worker — offline-first app shell cache. */
var CACHE = 'finance-app-v7';
var ASSETS = [
  './', './index.html', './styles.css', './card-designs.js', './app.js', './manifest.webmanifest',
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png',
  './icons/banks/chase.png', './icons/banks/bankofamerica.png', './icons/banks/citi.png',
  './icons/banks/wellsfargo.png', './icons/banks/capitalone.png', './icons/banks/discover.png',
  './icons/banks/amex.png', './icons/banks/usbank.png', './icons/banks/pnc.png',
  './icons/banks/tdbank.png', './icons/banks/visa.png', './icons/banks/mastercard.png',
  './icons/banks/generic.png',
  './icons/cards/chase-freedom.png', './icons/cards/chase-sapphire.png',
  './icons/cards/chase-slate.png', './icons/cards/chase-ink.png',
  './icons/cards/amex-bluecash.png', './icons/cards/amex-gold.png',
  './icons/cards/amex-platinum.png', './icons/cards/amex-green.png',
  './icons/cards/amex-hilton.png', './icons/cards/amex-hilton-surpass.png',
  './icons/cards/amex-hilton-aspire.png', './icons/cards/amex-delta-blue.png',
  './icons/cards/amex-delta-gold.png', './icons/cards/amex-delta-platinum.png',
  './icons/cards/amex-delta-reserve.png',
  './icons/cards/capone-quicksilver.png', './icons/cards/capone-venture.png',
  './icons/cards/capone-venturex.png', './icons/cards/capone-savor.png',
  './icons/cards/citi-doublecash.png', './icons/cards/citi-customcash.png',
  './icons/cards/citi-strata.png', './icons/cards/citi-costco.png',
  './icons/cards/discover-it.png', './icons/cards/discover-miles.png',
  './icons/cards/discover-student.png',
  './icons/cards/bofa-customized.png', './icons/cards/bofa-travel.png',
  './icons/cards/bofa-premium.png', './icons/cards/bofa-unlimited.png',
  './icons/cards/wells-activecash.png', './icons/cards/wells-autograph.png',
  './icons/cards/wells-reflect.png', './icons/cards/wells-bilt.png',
  './icons/cards/chase-amazon.png',
  './icons/cards/chase-southwest.png',
  './icons/cards/chase-united.png',
  './icons/cards/chase-hyatt.png',
  './icons/cards/chase-ihg.png',
  './icons/cards/chase-marriott.png',
  './icons/cards/amex-marriott-brilliant.png',
  './icons/cards/amex-everyday.png',
  './icons/cards/capone-walmart.png',
  './icons/cards/citi-aadvantage.png',
  './icons/cards/discover-secured.png',
  './icons/cards/bofa-alaska.png',
  './icons/cards/wells-attune.png',
  './icons/cards/usbank-altitude-go.png',
  './icons/cards/usbank-altitude-reserve.png',
  './icons/cards/usbank-cashplus.png',
  './icons/cards/usbank-shopper.png',
  './icons/cards/barclays-jetblue.png',
  './icons/cards/barclays-aviator.png',
  './icons/cards/barclays-wyndham.png',
  './icons/cards/synchrony-paypal.png',
  './icons/cards/synchrony-venmo.png',
  './icons/cards/synchrony-amazon.png',
  './icons/cards/navy-flagship.png',
  './icons/cards/navy-more.png',
  './icons/cards/navy-cash.png',
  './icons/cards/pnc-cash.png',
  './icons/cards/pnc-points.png',
  './icons/cards/pnc-core.png',
  './icons/cards/td-doubleup.png',
  './icons/cards/td-cash.png',
  './icons/cards/td-aeroplan.png',
  './icons/cards/citizens-cashback.png',
  './icons/cards/citizens-clear.png',
  './icons/cards/chase-disney-premier.png',
  './icons/cards/chase-disney.png',
  './icons/cards/chase-freedom-unlimited.png',
  './icons/cards/amex-bluecash-preferred.png',
  './icons/cards/bofa-bankamericard.png',
  './icons/cards/bofa-premium-elite.png',
  './icons/cards/citi-strata-premier.png',
  './icons/cards/citi-strata-elite.png',
  './icons/cards/citi-simplicity.png',
  './icons/cards/citi-diamond.png',
  './icons/cards/citi-costco-business.png',
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); })
      .then(function () { return self.skipWaiting(); })
      .catch(function () {})
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  /* Never intercept cross-origin traffic (Google sign-in, Drive API, …) —
     those must always go straight to the network and must never be cached. */
  if (new URL(e.request.url).origin !== self.location.origin) return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(function (hit) {
      if (hit) return hit;
      return fetch(e.request).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        return res;
      }).catch(function () { return caches.match('./index.html'); });
    })
  );
});
