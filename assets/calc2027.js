/*
 * 2027 saldering calculator — shared by the homepage and /tools/solar-battery/.
 * Every rule and default comes from a public source (see the Sources section
 * on /tools/solar-battery/).
 *
 * RULES (ACM ConsuWijzer, "Salderen en terugleveren")
 *  - Until 31 Dec 2026, what you feed back is netted against what you take
 *    from the grid over the year: netted = min(import, export). Each netted
 *    kWh is worth your full all-in rate (supply + energy tax + VAT).
 *  - From 1 Jan 2027 netting stops. Every exported kWh earns the feed-in
 *    payment; every imported kWh is paid in full.
 *  - Until 2030 the feed-in payment is at least 50% of the supply price
 *    excluding energy tax and VAT.
 *  - Suppliers may charge feed-in costs (terugleverkosten) per kWh exported.
 *
 * So the extra cost caused by the end of saldering is
 *    min(import, export) x (all-in rate - feed-in payment).
 * Feed-in costs are charged on all exported kWh in both years, so they
 * cancel out of that difference; they do change what your export earns and
 * what a battery is worth.
 */
(function () {
  // Milieu Centraal, "Kosten en opbrengst zonnepanelen": 10 panels of 435 Wp
  // produce about 3,800 kWh a year.
  var KWH_PER_PANEL = 380;
  // Milieu Centraal: without steering, a household uses about 30% of its
  // solar power directly.
  var SELF_USE = 0.30;
  // Milieu Centraal, "Thuisbatterij": a home battery raises direct use from
  // about 30% to just over 50% (used only if the profile file is missing).
  var SELF_USE_WITH_BATTERY = 0.50;
  // Belastingplan 2027, fiscale sleuteltabel: energy tax on electricity,
  // 0-10,000 kWh, 8.80 cent per kWh excluding VAT.
  var ENERGY_TAX_2027_EXCL = 0.0880;
  var VAT = 1.21;
  // Typical manufacturer round-trip efficiency for a home battery.
  var ROUND_TRIP = 0.9;

  var profile = null; // E1B AMI import (A) and injection (I) shares, loaded below

  function legalMinimumFeedIn(allInRate) {
    var bareSupply = Math.max(allInRate / VAT - ENERGY_TAX_2027_EXCL, 0);
    return 0.5 * bareSupply;
  }

  // Simulate a battery over the year on the E1B AMI profiles: it charges from
  // exported power and discharges into imported power, hour by hour.
  function simulateBattery(imp, exp, capacity) {
    if (!profile || capacity <= 0) return null;
    var A = profile.A, I = profile.I, n = A.length, sumA = profile.sumA, sumI = profile.sumI;
    var soc = 0, charged = 0, delivered = 0;
    for (var t = 0; t < n; t++) {
      var e = exp * I[t] / sumI;
      var i = imp * A[t] / sumA;
      var c = Math.min(e, capacity - soc);
      soc += c; charged += c;
      var d = Math.min(i, soc * ROUND_TRIP);
      soc -= d / ROUND_TRIP; delivered += d;
    }
    return { charged: charged, delivered: delivered };
  }

  function batteryFallback(production, use, imp, exp, capacity) {
    if (capacity <= 0 || !production) return { charged: 0, delivered: 0 };
    var delivered = Math.min((SELF_USE_WITH_BATTERY - SELF_USE) * production, imp, exp * ROUND_TRIP);
    return { charged: delivered / ROUND_TRIP, delivered: delivered };
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

  var state = { mode: 'panels', panels: 10, feedinEdited: false };

  function update() {
    var rate = readNumber('rate', 0.26);
    var minFeedIn = legalMinimumFeedIn(rate);
    if ($('feedin') && !state.feedinEdited) $('feedin').value = minFeedIn.toFixed(3);
    var feedin = state.feedinEdited ? readNumber('feedin', minFeedIn) : minFeedIn;
    var fees = readNumber('tlk', 0);
    var capacity = readNumber('battery', 10);
    if ($('feedin-min')) $('feedin-min').textContent = '€' + minFeedIn.toFixed(3);

    var imp, exp, production = null, use = null;
    if (state.mode === 'bill') {
      imp = Math.max(readNumber('bill-import', 2200), 0);
      exp = Math.max(readNumber('bill-export', 2700), 0);
    } else {
      use = Math.max(readNumber('use', 3300), 0);
      production = state.panels * KWH_PER_PANEL;
      var direct = Math.min(SELF_USE * production, use);
      exp = production - direct;
      imp = use - direct;
    }

    var netted = Math.min(imp, exp);
    var lossPerKwh = Math.max(rate - feedin, 0);
    var extra = netted * lossPerKwh;

    // Without the profile file, estimate production from the bill's export
    // using the same 30% direct-use share.
    var b = simulateBattery(imp, exp, capacity) ||
      batteryFallback(production !== null ? production : exp / (1 - SELF_USE), use, imp, exp, capacity);
    var batteryValue = b.delivered * rate - b.charged * (feedin - fees);
    var withBattery = extra - batteryValue;

    $('extra').textContent = '+' + eur(extra);
    if ($('explain')) {
      $('explain').textContent = (state.mode === 'bill'
        ? 'You take ' + num(imp) + ' kWh from the grid and feed back ' + num(exp) + ' kWh.'
        : 'Your ' + state.panels + ' panels feed back about ' + num(exp) + ' kWh a year and you take about ' + num(imp) + ' kWh from the grid.')
        + ' Today ' + num(netted) + ' kWh of that is netted at your full rate of €' + rate.toFixed(2)
        + '. From 2027 it earns about €' + feedin.toFixed(2) + ' per kWh instead.';
    }
    $('no-battery').textContent = '+' + eur(extra) + '/yr';
    $('battery-label').textContent = capacity > 0 ? 'With a ' + capacity + ' kWh battery' : 'No battery selected';
    $('with-battery').textContent = (withBattery < 0 ? '' : '+') + eur(withBattery) + '/yr';
    $('bar-battery').style.width = (extra > 0 ? Math.max(Math.min(Math.round(withBattery / extra * 100), 100), 0) : 0) + '%';
    if ($('saving')) $('saving').textContent = eur(batteryValue) + ' a year';
    if ($('shifted')) $('shifted').textContent = num(b.delivered);
    if ($('export-earn')) {
      var earn = exp * (feedin - fees);
      $('export-earn').textContent = eur(earn) + ' a year';
      $('export-earn-note').textContent = num(exp) + ' kWh × (€' + feedin.toFixed(3) + ' feed-in − €' + fees.toFixed(3) + ' feed-in costs)';
    }
    if (window.showPartner) window.showPartner('battery');
  }

  function setMode(mode) {
    state.mode = mode;
    var buttons = document.querySelectorAll('#solar-mode button');
    for (var i = 0; i < buttons.length; i++) buttons[i].setAttribute('aria-pressed', buttons[i].dataset.mode === mode ? 'true' : 'false');
    $('panels-box').hidden = mode !== 'panels';
    $('bill-box').hidden = mode !== 'bill';
    update();
  }

  function setPanels(n) {
    state.panels = Math.max(1, Math.min(60, n));
    $('panels-count').textContent = state.panels;
    update();
  }

  function markChips() {
    var v = $('use').value;
    var chips = document.querySelectorAll('[data-use]');
    for (var i = 0; i < chips.length; i++) chips[i].setAttribute('aria-pressed', chips[i].dataset.use === v ? 'true' : 'false');
  }

  function loadProfile() {
    if (!window.fetch) return;
    fetch('/assets/profile-e1b-ami.json').then(function (r) { return r.ok ? r.json() : null; }).then(function (p) {
      if (!p || !p.A || !p.I) return;
      var sumA = 0, sumI = 0;
      for (var t = 0; t < p.A.length; t++) { sumA += p.A[t]; sumI += p.I[t]; }
      p.sumA = sumA; p.sumI = sumI;
      profile = p;
      update();
    }).catch(function () {});
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (!$('extra')) return;
    var modeButtons = document.querySelectorAll('#solar-mode button');
    for (var i = 0; i < modeButtons.length; i++) {
      modeButtons[i].addEventListener('click', function () { setMode(this.dataset.mode); });
    }
    $('panels-minus').addEventListener('click', function () { setPanels(state.panels - 1); });
    $('panels-plus').addEventListener('click', function () { setPanels(state.panels + 1); });
    var chips = document.querySelectorAll('[data-use]');
    for (var j = 0; j < chips.length; j++) {
      chips[j].addEventListener('click', function () { $('use').value = this.dataset.use; markChips(); update(); });
    }
    ['use', 'bill-import', 'bill-export', 'battery', 'rate', 'feedin', 'tlk'].forEach(function (id) {
      var el = $(id);
      if (!el) return;
      el.addEventListener('input', function () {
        if (id === 'feedin') state.feedinEdited = el.value !== '';
        if (id === 'use') markChips();
        update();
      });
      el.addEventListener('change', update);
    });
    markChips();
    setMode('panels');
    loadProfile();
  });

  // Exposed for testing.
  window.Wattsterdam2027 = { legalMinimumFeedIn: legalMinimumFeedIn, simulateBattery: simulateBattery,
    setProfile: function (p) { var a = 0, b = 0; for (var t = 0; t < p.A.length; t++) { a += p.A[t]; b += p.I[t]; } p.sumA = a; p.sumI = b; profile = p; } };
})();
