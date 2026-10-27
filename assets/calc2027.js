/*
 * 2027 saldering calculator — shared by the homepage and /tools/solar-battery/.
 *
 * Model: solar output 950 kWh per kWp per year, spread over a typical Dutch
 * monthly profile. Each day solar first covers daytime use (35% of daily use);
 * a battery stores what's left, up to 90% of its size, for that evening.
 * Under saldering every exported kWh cancels a kWh bought at the all-in rate;
 * from 2027 it only earns the feed-in rate, so each exported kWh loses
 * (rate - feed-in).
 */
(function () {
  var YIELD_PER_KWP = 950;
  var WP_PER_PANEL = 400;
  var DAYTIME_SHARE = 0.35;
  var USABLE = 0.9;
  var SOLAR = [0.025, 0.045, 0.08, 0.115, 0.135, 0.135, 0.135, 0.115, 0.09, 0.065, 0.035, 0.025];
  var USE = [1.2, 1.15, 1.05, 0.95, 0.9, 0.85, 0.85, 0.85, 0.9, 1.0, 1.1, 1.2];
  var DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  var USE_WEIGHT = 0;
  for (var i = 0; i < 12; i++) USE_WEIGHT += USE[i] * DAYS[i];

  function model(kwp, consumption, batteryKwh) {
    var production = kwp * YIELD_PER_KWP, direct = 0, shifted = 0;
    for (var m = 0; m < 12; m++) {
      var p = production * SOLAR[m] / DAYS[m];
      var c = consumption * USE[m] / USE_WEIGHT;
      var d = Math.min(p, c * DAYTIME_SHARE);
      direct += d * DAYS[m];
      shifted += Math.max(Math.min(batteryKwh * USABLE, p - d, c - d), 0) * DAYS[m];
    }
    return { production: production, exported: production - direct, shifted: shifted };
  }

  // Find the system size whose modelled export matches a known export.
  function kwpFromExport(exported, consumption) {
    var lo = 0, hi = 40;
    for (var k = 0; k < 40; k++) {
      var mid = (lo + hi) / 2;
      if (model(mid, consumption, 0).exported < exported) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  }

  function $(id) { return document.getElementById(id); }
  function eur(x) { return '€' + Math.round(x).toLocaleString('en-US'); }
  function num(x) { return Math.round(x).toLocaleString('en-US'); }

  var state = { mode: 'panels', panels: 10 };

  function readNumber(id, fallback) {
    var el = $(id);
    if (!el) return fallback;
    var v = parseFloat(el.value);
    return isNaN(v) ? fallback : v;
  }

  function update() {
    var consumption = Math.max(readNumber('use', 3300), 0);
    var battery = readNumber('battery', 10);
    var rate = readNumber('rate', 0.28);
    var feedin = readNumber('feedin', 0.07);
    var loss = Math.max(rate - feedin, 0);

    var kwp, exported;
    if (state.mode === 'export') {
      exported = Math.max(readNumber('exported', 0), 0);
      kwp = kwpFromExport(exported, consumption);
    } else {
      kwp = state.panels * WP_PER_PANEL / 1000;
    }
    var r = model(kwp, consumption, battery);
    if (state.mode !== 'export') exported = r.exported;
    var shifted = Math.min(r.shifted, exported);

    var extra = exported * loss;
    var withBattery = (exported - shifted) * loss;
    var saving = extra - withBattery;

    $('extra').textContent = '+' + eur(extra);
    if ($('explain')) {
      $('explain').textContent = state.mode === 'export'
        ? 'You export ' + num(exported) + ' kWh a year. From 2027 each of those earns about €' + feedin.toFixed(2) + ' instead of cancelling a kWh you buy at €' + rate.toFixed(2) + '.'
        : 'Your ' + state.panels + ' panels export about ' + num(exported) + ' kWh a year. From 2027 each of those earns about €' + feedin.toFixed(2) + ' instead of cancelling a kWh you buy at €' + rate.toFixed(2) + '.';
    }
    $('no-battery').textContent = '+' + eur(extra) + '/yr';
    $('battery-label').textContent = battery > 0 ? 'With a ' + battery + ' kWh battery' : 'No battery selected';
    $('with-battery').textContent = '+' + eur(withBattery) + '/yr';
    $('bar-battery').style.width = (extra > 0 ? Math.round(withBattery / extra * 100) : 0) + '%';
    if ($('saving')) $('saving').textContent = eur(saving) + ' a year';
    if ($('shifted')) $('shifted').textContent = num(shifted);
    if (window.showPartner) window.showPartner('battery');
  }

  function setMode(mode) {
    state.mode = mode;
    var buttons = document.querySelectorAll('#solar-mode button');
    for (var i = 0; i < buttons.length; i++) buttons[i].setAttribute('aria-pressed', buttons[i].dataset.mode === mode ? 'true' : 'false');
    $('panels-box').hidden = mode !== 'panels';
    $('export-box').hidden = mode !== 'export';
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
    ['use', 'exported', 'battery', 'rate', 'feedin'].forEach(function (id) {
      var el = $(id);
      if (!el) return;
      el.addEventListener('input', function () { if (id === 'use') markChips(); update(); });
      el.addEventListener('change', update);
    });
    markChips();
    setMode('panels');
  });
})();
