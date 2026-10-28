/*
 * 2027 saldering calculator — shared by the homepage and /tools/solar-battery/.
 * Inputs are only what the yearly bill shows, measured at the meter:
 *   import = levering (taken from the grid), export = teruglevering (fed back).
 * Nothing is assumed about what happens behind the meter.
 *
 * RULES (ACM ConsuWijzer, "Salderen en terugleveren")
 *  - Until 31 Dec 2026, export is netted against import over the year:
 *    netted = min(import, export), each netted kWh worth the full all-in rate.
 *  - From 1 Jan 2027 netting stops: every exported kWh earns the feed-in
 *    payment, every imported kWh is paid in full.
 *  - Until 2030 the feed-in payment is at least 50% of the supply price
 *    excluding energy tax and VAT.
 *  - Suppliers may charge feed-in costs (terugleverkosten) per exported kWh.
 *
 * Extra cost from the end of saldering = min(import, export) x (rate - feed-in).
 * Feed-in costs are charged on all export in both years, so they cancel out
 * of that difference; they do change what export earns and a battery's value.
 *
 * BATTERY: simulated hour by hour on the MFFBAS E1B AMI profiles (A = import,
 * I = feed-in), scaled to the bill's yearly import and export. The battery
 * section stays hidden until /assets/profile-e1b-ami.json is present.
 */
(function () {
  // Belastingplan 2027, fiscale sleuteltabel: 8.80 cent per kWh excl. VAT.
  var ENERGY_TAX_2027_EXCL = 0.0880;
  var VAT = 1.21;
  // Typical manufacturer round-trip efficiency for a home battery.
  var ROUND_TRIP = 0.9;

  var profile = null;

  function legalMinimumFeedIn(allInRate) {
    return 0.5 * Math.max(allInRate / VAT - ENERGY_TAX_2027_EXCL, 0);
  }

  function simulateBattery(imp, exp, capacity) {
    if (!profile || capacity <= 0) return { charged: 0, delivered: 0 };
    var A = profile.A, I = profile.I, n = A.length;
    var soc = 0, charged = 0, delivered = 0;
    for (var t = 0; t < n; t++) {
      var c = Math.min(exp * I[t] / profile.sumI, capacity - soc);
      soc += c; charged += c;
      var d = Math.min(imp * A[t] / profile.sumA, soc * ROUND_TRIP);
      soc -= d / ROUND_TRIP; delivered += d;
    }
    return { charged: charged, delivered: delivered };
  }

  function $(id) { return document.getElementById(id); }
  function eur(x) { return (x < 0 ? '−€' : '€') + Math.abs(Math.round(x)).toLocaleString('en-US'); }
  function num(x) { return Math.round(x).toLocaleString('en-US'); }
  function readNumber(id, fallback) {
    var el = $(id);
    if (!el || el.value === '') return fallback;
    var v = parseFloat(String(el.value).replace(',', '.'));
    return isNaN(v) ? fallback : v;
  }
  function setText(id, text) { if ($(id)) $(id).textContent = text; }

  var feedinEdited = false;

  function update() {
    var rate = readNumber('rate', 0.26);
    var minFeedIn = legalMinimumFeedIn(rate);
    if ($('feedin') && !feedinEdited) $('feedin').value = minFeedIn.toFixed(3);
    var feedin = feedinEdited ? readNumber('feedin', minFeedIn) : minFeedIn;
    var fees = readNumber('tlk', 0);
    var capacity = readNumber('battery', 10);
    setText('feedin-min', '€' + minFeedIn.toFixed(3));

    var imp = Math.max(readNumber('bill-import', 2200), 0);
    var exp = Math.max(readNumber('bill-export', 2700), 0);
    var netted = Math.min(imp, exp);
    var extra = netted * Math.max(rate - feedin, 0);

    setText('extra', '+' + eur(extra));
    setText('explain', 'Today ' + num(netted) + ' kWh of what you feed back is netted against what you take from the grid, worth your full rate of €'
      + rate.toFixed(2) + ' per kWh. From 2027 it earns the feed-in payment of about €' + feedin.toFixed(2) + ' instead.');
    setText('export-earn', eur(exp * (feedin - fees)) + ' a year');
    setText('export-earn-note', num(exp) + ' kWh × (€' + feedin.toFixed(3) + ' feed-in payment − €' + fees.toFixed(3) + ' feed-in costs)');

    var section = document.querySelectorAll('[data-needs-profile]');
    for (var s = 0; s < section.length; s++) section[s].hidden = !profile;
    if (profile) {
      var b = simulateBattery(imp, exp, capacity);
      var value = b.delivered * rate - b.charged * (feedin - fees);
      var withBattery = extra - value;
      setText('no-battery', '+' + eur(extra) + '/yr');
      setText('battery-label', capacity > 0 ? 'With a ' + capacity + ' kWh battery' : 'No battery selected');
      setText('with-battery', (withBattery < 0 ? '' : '+') + eur(withBattery) + '/yr');
      if ($('bar-battery')) $('bar-battery').style.width = (extra > 0 ? Math.max(Math.min(Math.round(withBattery / extra * 100), 100), 0) : 0) + '%';
      setText('saving', eur(value) + ' a year');
      setText('shifted', num(b.delivered));
    }
    if (window.showPartner) window.showPartner('battery');
  }

  function loadProfile() {
    if (!window.fetch) return;
    fetch('/assets/profile-e1b-ami.json').then(function (r) { return r.ok ? r.json() : null; }).then(function (p) {
      if (!p || !p.A || !p.I) return;
      setProfile(p);
      update();
    }).catch(function () {});
  }
  function setProfile(p) {
    var a = 0, b = 0;
    for (var t = 0; t < p.A.length; t++) { a += p.A[t]; b += p.I[t]; }
    p.sumA = a; p.sumI = b; profile = p;
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (!$('extra')) return;
    ['bill-import', 'bill-export', 'battery', 'rate', 'feedin', 'tlk'].forEach(function (id) {
      var el = $(id);
      if (!el) return;
      el.addEventListener('input', function () { if (id === 'feedin') feedinEdited = el.value !== ''; update(); });
      el.addEventListener('change', update);
    });
    update();
    loadProfile();
  });

  window.Wattsterdam2027 = { legalMinimumFeedIn: legalMinimumFeedIn, simulateBattery: simulateBattery, setProfile: setProfile };
})();
