/*
 * Partner (affiliate) links — the ONLY place to edit them.
 *
 * Paste the tracking URL you get from Daisycon / TradeTracker / a direct
 * installer programme into `url`. While `url` is empty the block stays
 * hidden, so the site never shows a dead button.
 */
var WATTSTERDAM_PARTNERS = {
  battery: {
    url: '',  // e.g. quote-comparison for home batteries
    title: 'Thinking about a battery before 2027?',
    text: 'Get free, no-obligation quotes from certified Dutch installers and compare real prices for your home.',
    cta: 'Compare battery quotes →'
  },
  installer: {
    url: '',  // e.g. electrician / load-balancer / heat-pump installer quotes
    title: 'Need a load balancer or a heavier connection?',
    text: 'A certified installer can check your groepenkast and quote the fix. Free quotes, no obligation.',
    cta: 'Get installer quotes →'
  }
};

/* Show or hide a partner block. `visible` lets a tool hide it when the
   result doesn't call for it. Blocks without a URL are never shown. */
function showPartner(key, visible) {
  var el = document.querySelector('[data-partner="' + key + '"]');
  var cfg = WATTSTERDAM_PARTNERS[key];
  if (!el || !cfg) return;
  if (!cfg.url || visible === false) { el.hidden = true; return; }
  if (!el.dataset.ready) {
    el.querySelector('.partner-title').textContent = cfg.title;
    el.querySelector('.partner-text').textContent = cfg.text;
    var a = el.querySelector('a');
    a.textContent = cfg.cta;
    a.href = cfg.url;
    a.addEventListener('click', function () {
      if (window.va) window.va('event', { name: 'partner_click', data: { partner: key, page: location.pathname } });
    });
    el.dataset.ready = '1';
  }
  el.hidden = false;
}
