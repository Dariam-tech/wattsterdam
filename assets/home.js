/*
 * Homepage calculator.
 *
 * Change from 2027 = min(import, export) x (rate - feed-in payment)
 *                  + export x (fee 2027 - fee 2026)
 * Same model as assets/calc2027.js (the detailed calculator).
 *
 * QUICK ESTIMATE (no bill needed):
 *  - yearly use by household size (Nibud/CBS via ANWB): 1,640 / 2,550 / 3,080 / 3,600 / 3,980 kWh
 *  - each panel makes about 350 kWh a year (400 Wp x 0.88, ANWB)
 *  - about 30% of solar power is used directly, at most half of the household's use
 *  - import = use - direct; export = made - direct
 *
 * BATTERY EXAMPLE: delivered = min(slider, import, export x 0.9);
 *  saving = delivered x rate - (delivered / 0.9) x (payment - fee 2027).
 */
(function () {
  'use strict';
  var ENERGY_TAX_2027_EXCL = 0.0880, VAT = 1.21, ROUND_TRIP = 0.9;
  var USE = { 1: 1640, 2: 2550, 3: 3080, 4: 3600, 5: 3980 };
  var PER_PANEL = 350, DIRECT_SHARE = 0.3;
  var DEFAULTS = { rate: 0.26, feeNow: 0.11, feeNext: 0.055 };

  var $ = function (id) { return document.getElementById(id); };
  var state = { mode: 'quick', solar: 'yes', panels: 10, people: 2, payEdited: false };
  var last = null, toastTimer;

  function eur(n) { return '€' + Math.round(Math.abs(n)).toLocaleString('en-GB'); }
  function signed(n) { var r = Math.round(n); return (r > 0 ? '+' : r < 0 ? '−' : '') + eur(n); }
  function num(id) { return Number($(id).value); }
  function legalMinimum(rate) { return 0.5 * Math.max(rate / VAT - ENERGY_TAX_2027_EXCL, 0); }

  function quickVolumes() {
    var use = USE[state.people], made = state.panels * PER_PANEL;
    var direct = Math.min(made * DIRECT_SHARE, use * 0.5);
    return { imp: use - direct, exp: made - direct, made: made };
  }

  function valid(ids) {
    return ids.every(function (id) {
      var el = $(id), v = Number(el.value);
      var ok = el.value.trim() !== '' && isFinite(v) && v >= 0 && v <= Number(el.max || 100000);
      el.setAttribute('aria-invalid', String(!ok));
      return ok;
    });
  }

  function setText(id, t) { $(id).textContent = t; }

  function render() {
    if (!state.payEdited) $('feedPay').value = legalMinimum(num('rate')).toFixed(3);
    var ids = ['rate', 'feedPay', 'feeNow', 'feeNext'].concat(state.mode === 'bill' ? ['importKwh', 'exportKwh'] : []);
    var good = valid(ids);
    $('error').classList.toggle('show', !good);
    if (!good) { setText('resultYear', '—'); setText('mobileResult', '—'); setText('resultMonth', 'Check the highlighted fields.'); return; }

    var rate = num('rate'), pay = state.payEdited ? num('feedPay') : legalMinimum(rate), now = num('feeNow'), next = num('feeNext');
    var solar = state.mode === 'bill' ? 'yes' : state.solar;
    $('breakdown').hidden = solar !== 'yes';
    $('resultYear').parentNode.classList.toggle('is-text', solar !== 'yes');
    $('resultUnit').hidden = solar !== 'yes';

    if (solar === 'no') {
      setText('resultType', 'Quick estimate');
      setText('headline', 'Without solar panels, 2027 brings');
      setText('resultYear', 'Small changes');
      setText('resultMonth', 'Your grid operator’s yearly charge is set to rise by about €75 to €105.');
      setText('resultNote', 'The new rules for solar power don’t affect you. Energy tax on electricity drops slightly in 2027.');
      last = null; renderBattery(0, 0, rate, pay, next); return;
    }
    if (solar === 'thinking') {
      setText('resultType', 'Quick estimate');
      setText('headline', 'Thinking about solar panels?');
      setText('resultYear', 'Still worth it');
      setText('resultMonth', 'for most homes, but they pay back more slowly than before.');
      setText('resultNote', 'From 2027 panels earn their money mainly through power you use yourself. Pick “Yes” to see what panels would mean for your bill.');
      last = null; renderBattery(0, 0, rate, pay, next); return;
    }

    var v = state.mode === 'bill' ? { imp: num('importKwh'), exp: num('exportKwh') } : quickVolumes();
    var lost = Math.min(v.imp, v.exp) * Math.max(rate - pay, 0);
    var fee = v.exp * (next - now);
    var total = lost + fee;
    var shown = state.mode === 'quick' ? Math.round(total / 10) * 10 : Math.round(total);
    last = { imp: v.imp, exp: v.exp, rate: rate, pay: pay, now: now, next: next, lost: lost, fee: fee, total: shown };

    setText('resultType', state.mode === 'quick' ? 'Quick estimate' : 'Your bill');
    setText('headline', shown >= 0 ? 'From 2027 you will probably pay' : 'From 2027 you will probably pay less');
    setText('resultYear', Math.abs(shown) < 5 ? 'About the same' : signed(shown));
    $('resultUnit').hidden = Math.abs(shown) < 5;
    $('resultYear').parentNode.classList.toggle('is-text', Math.abs(shown) < 5);
    setText('mobileResult', signed(shown));
    setText('resultMonth', Math.abs(shown) < 5 ? 'Lower fees for power you send back cancel out the change.'
      : 'That’s about ' + eur(shown / 12) + (shown > 0 ? ' more' : ' less') + ' each month.');
    var who = state.mode === 'quick'
      ? 'Estimate for ' + state.panels + ' panels and ' + (state.people === 5 ? '5 or more people' : state.people + (state.people === 1 ? ' person' : ' people')) + '.'
      : 'Based on ' + Math.round(v.imp).toLocaleString('en-GB') + ' kWh taken and ' + Math.round(v.exp).toLocaleString('en-GB') + ' kWh sent back.';
    $('resultNote').innerHTML = '';
    $('resultNote').appendChild(document.createTextNode(who + ' This is the change for 2027, '));
    var strong = document.createElement('strong'); strong.style.color = '#d7ecdc'; strong.textContent = 'not your full energy bill';
    $('resultNote').appendChild(strong); $('resultNote').appendChild(document.createTextNode('.'));

    setText('lostAmount', signed(lost));
    setText('feeLabel', fee <= 0 ? 'Lower fees for power you send back' : 'Higher fees for power you send back');
    setText('feeAmount', signed(fee));
    setText('totalSmall', signed(shown));
    var max = Math.max(Math.abs(lost), Math.abs(fee), 1);
    $('lostBar').style.width = (Math.abs(lost) / max * 100) + '%';
    $('feeBar').style.width = (Math.abs(fee) / max * 100) + '%';
    $('feeBar').className = 'fill ' + (fee <= 0 ? 'savings' : 'positive');
    renderBattery(v.imp, v.exp, rate, pay, next);
  }

  function renderBattery(imp, exp, rate, pay, next) {
    var shift = num('batteryShift');
    setText('batteryShiftOut', Math.round(shift).toLocaleString('en-GB') + ' kWh');
    if (exp <= 0) {
      setText('batterySaving', '€0');
      setText('batteryDesc', 'A home battery only saves money if you have solar panels to charge it.');
      setText('payback', 'Not reached');
      return;
    }
    var delivered = Math.min(shift, imp, exp * ROUND_TRIP);
    var saving = Math.max(0, delivered * rate - (delivered / ROUND_TRIP) * (pay - next));
    setText('batterySaving', eur(saving));
    setText('batteryDesc', delivered < shift
      ? 'Your home can only use about ' + Math.round(delivered).toLocaleString('en-GB') + ' kWh of stored power a year, so that is what we count.'
      : 'At the prices above, if the battery replaces power you’d otherwise buy from the grid.');
    setText('payback', saving < 1 ? 'Not reached' : Math.ceil(3300 / saving) + '–' + Math.ceil(7000 / saving) + ' years');
  }

  function press(selector, attr, value) {
    document.querySelectorAll(selector).forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute(attr) === String(value))); });
  }

  function setMode(mode) {
    state.mode = mode;
    $('tabQuick').setAttribute('aria-selected', String(mode === 'quick'));
    $('tabBill').setAttribute('aria-selected', String(mode === 'bill'));
    $('paneQuick').hidden = mode !== 'quick';
    $('paneBill').hidden = mode !== 'bill';
    render();
  }

  function toast(text) {
    var el = $('toast'); el.textContent = text; el.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { el.classList.remove('show'); }, 2900);
  }

  function summary() {
    if (!last) return 'Wattsterdam: from 2027 my solar panels change my energy bill. Check yours at https://www.wattsterdam.nl/';
    return 'My energy bill from 2027 (Wattsterdam)\n'
      + 'Change per year: ' + signed(last.total) + ' (about ' + eur(last.total / 12) + ' a month)\n'
      + 'Taken from the grid: ' + Math.round(last.imp) + ' kWh a year; sent back: ' + Math.round(last.exp) + ' kWh a year\n'
      + 'Prices: €' + last.rate + '/kWh; payment for power sent back €' + last.pay + '/kWh; fee today €' + last.now + ', in 2027 €' + last.next + '\n'
      + 'Not a full energy bill. Check yours at https://www.wattsterdam.nl/';
  }

  document.addEventListener('DOMContentLoaded', function () {
    $('tabQuick').addEventListener('click', function () { setMode('quick'); });
    $('tabBill').addEventListener('click', function () { setMode('bill'); });
    document.querySelectorAll('[data-solar]').forEach(function (b) {
      b.addEventListener('click', function () {
        state.solar = b.getAttribute('data-solar'); press('[data-solar]', 'data-solar', state.solar);
        $('qPanelsBlock').hidden = state.solar !== 'yes';
        setText('qPeopleNum', state.solar === 'yes' ? '3' : '2');
        render();
      });
    });
    document.querySelectorAll('[data-people]').forEach(function (b) {
      b.addEventListener('click', function () { state.people = Number(b.getAttribute('data-people')); press('[data-people]', 'data-people', state.people); render(); });
    });
    $('panelsMinus').addEventListener('click', function () { state.panels = Math.max(state.panels - 1, 1); setText('panels', state.panels); render(); });
    $('panelsPlus').addEventListener('click', function () { state.panels = Math.min(state.panels + 1, 40); setText('panels', state.panels); render(); });
    ['importKwh', 'exportKwh', 'rate', 'feeNow', 'feeNext'].forEach(function (id) { $(id).addEventListener('input', render); });
    $('feedPay').addEventListener('input', function () { state.payEdited = $('feedPay').value !== ''; render(); });
    $('resetRates').addEventListener('click', function () {
      Object.keys(DEFAULTS).forEach(function (k) { $(k).value = DEFAULTS[k]; });
      state.payEdited = false; render(); toast('Back to typical prices');
    });
    $('batteryShift').addEventListener('input', render);
    $('shareBtn').addEventListener('click', function () {
      var t = summary();
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(t).then(function () { toast('Copied. Paste it anywhere.'); }, function () { toast('Could not copy, sorry.'); });
      } else { toast('Copying isn’t available in this browser.'); }
    });
    render();
  });
})();
