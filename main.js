/* ════════════════════════════════════════
   ONI Tools — main.js
   ONI fan tool — not affiliated with Klei Entertainment
════════════════════════════════════════ */
(function () {
  'use strict';

  // ════════════════════════════════════════
  //  CONSTANTS
  // ════════════════════════════════════════
  const PKG_PER_ON    = 20;    // kg produced per 1 second of on-time (fixed game mechanic)
  const PLATE_KG      = 800;   // kg of cooling per ice tempshift plate
  const CYCLE_SECONDS = 600;   // 1 game cycle = 600 seconds

  const VOLCANOES = [
    { name: 'Gold',        color: '#e8c020' },
    { name: 'Copper',      color: '#d4784a' },
    { name: 'Iron',        color: '#a8a0a0' },
    { name: 'Cobalt',      color: '#4878d8' },
    { name: 'Aluminium',   color: '#c0d8e8' },
    { name: 'Niobium',     color: '#d0a8e0' },
    { name: 'Tungsten',    color: '#c8b890' },
    { name: 'Magma',       color: '#e85030' },
    { name: 'Minor Magma', color: '#c84828' },
  ];

  // ════════════════════════════════════════
  //  STATE
  // ════════════════════════════════════════
  let _steamTotal  = 0;
  let _basePlates  = 0;
  let _plateOffset = 0;
  let _lockDim     = false;
  let _rateInKg    = true;    // eruption rate unit: kg/s or g/s
  let _isOverride  = true;    // override mode: directly input avg output
  let _detailOpen  = false;   // eruption params collapsible state

  // ════════════════════════════════════════
  //  DOM HELPERS
  // ════════════════════════════════════════
  function el(id)         { return document.getElementById(id); }
  function getN(id)       { return parseFloat(el(id).value) || 0; }
  function setN(id, v)    { el(id).value = v; }
  function setText(id, v) { el(id).textContent = v; }

  // ════════════════════════════════════════
  //  STEPPER INPUTS
  // ════════════════════════════════════════
  function stepInput(inputId, delta) {
    const input = el(inputId);
    let v = parseFloat(input.value) || 0;
    v += delta;
    const min = parseFloat(input.min);
    if (!isNaN(min)) v = Math.max(min, v);
    input.value = Math.round(v * 10) / 10;
    input.dispatchEvent(new Event('input'));
  }

  function stepDim(which, delta) {
    stepInput('dim-' + which, delta);
    onDimChange();
  }

  // ════════════════════════════════════════
  //  VOLCANO SELECTOR
  // ════════════════════════════════════════
  function selectVol(btn) {
    document.querySelectorAll('.vol-btn').forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-checked', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-checked', 'true');
    updateVolDisplay(btn.dataset.vol);
  }

  function updateVolDisplay(name) {
    const volcano = VOLCANOES.find(v => v.name === name);
    const cardImg  = el('vol-card-img');
    const cardName = el('vol-card-name');

    if (volcano) {
      const imgSrc = 'assets/images/' + volcano.name.toLowerCase().replace(/ /g, '_') + '_volcano.png';
      cardImg.src  = imgSrc;
      cardImg.alt  = volcano.name;
      cardImg.style.display = '';
      cardImg.onerror = function () { cardImg.style.display = 'none'; };
      cardName.textContent = volcano.name + ' Volcano';
    } else {
      cardImg.style.display = 'none';
      cardImg.src  = '';
      cardName.textContent = '—';
    }
  }

  // ════════════════════════════════════════
  //  OVERRIDE TOGGLE + DETAIL COLLAPSIBLE
  // ════════════════════════════════════════
  function applyOverrideVisuals() {
    const btn = el('override-btn');
    btn.setAttribute('aria-pressed', _isOverride.toString());
    btn.classList.toggle('active', _isOverride);

    el('avg-output-val').style.display     = _isOverride ? 'none' : '';
    el('avg-override-wrap').style.display   = _isOverride ? '' : 'none';

    // Show collapsible eruption params only when override is OFF
    el('override-detail').style.display = _isOverride ? 'none' : '';
  }

  function toggleOverride() {
    _isOverride = !_isOverride;
    // Auto-open eruption params when switching to calculated mode
    if (!_isOverride && !_detailOpen) {
      _detailOpen = true;
      el('detail-body').style.display = '';
      el('detail-toggle').setAttribute('aria-expanded', 'true');
      el('detail-toggle').querySelector('.detail-toggle-icon').textContent = '\u25BC';
    }
    applyOverrideVisuals();
    recalc();
  }

  function toggleDetail() {
    _detailOpen = !_detailOpen;
    el('detail-body').style.display = _detailOpen ? '' : 'none';
    el('detail-toggle').setAttribute('aria-expanded', _detailOpen.toString());
    el('detail-toggle').querySelector('.detail-toggle-icon').textContent = _detailOpen ? '\u25BC' : '\u25B6';
  }

  // ════════════════════════════════════════
  //  RATE UNIT TOGGLE (kg/s ↔ g/s)
  // ════════════════════════════════════════
  function getRateGrams() {
    const raw = getN('rate');
    return _rateInKg ? raw * 1000 : raw;
  }

  function toggleRateUnit() {
    const raw = getN('rate');
    _rateInKg = !_rateInKg;
    const label = _rateInKg ? 'kg/s' : 'g/s';
    el('rate-unit-btn').textContent = label;
    el('rate-unit-tag').textContent = label;
    el('rate').value = _rateInKg ? (raw / 1000).toPrecision(6).replace(/\.?0+$/, '') : (raw * 1000);
    el('rate').step  = _rateInKg ? '0.1' : '1';
    el('rate').min   = _rateInKg ? '0.001' : '0.1';
    recalc();
  }

  // ════════════════════════════════════════
  //  AVG OUTPUT — calculated or overridden
  // ════════════════════════════════════════
  function calcAvgOutput() {
    const rate        = getRateGrams();
    const eruptTime   = getN('erupt-time');
    const eruptPeriod = getN('erupt-period');
    if (eruptPeriod <= 0) return 0;
    const eruptRatio  = Math.min(eruptTime / eruptPeriod, 1);
    return rate * eruptRatio;
  }

  function getEffectiveRate() {
    if (_isOverride) {
      return getN('avg-override');
    }
    return calcAvgOutput();
  }

  // ════════════════════════════════════════
  //  DIMENSION / TILE SYNC
  // ════════════════════════════════════════
  function onDimChange() {
    if (_lockDim) return;
    _lockDim = true;
    const w = getN('dim-w') || 1;
    const h = getN('dim-h') || 1;
    setN('tiles', w * h);
    _lockDim = false;
    recalc();
  }

  function onTilesChange() {
    if (_lockDim) return;
    _lockDim = true;
    const t = getN('tiles') || 1;
    const w = getN('dim-w') || 1;
    setN('dim-h', Math.round(t / w));
    _lockDim = false;
    recalc();
  }

  // ════════════════════════════════════════
  //  MAIN RECALC
  // ════════════════════════════════════════
  function recalc() {
    const avg = getEffectiveRate(); // g/s

    if (!_isOverride) {
      setText('avg-output-val', avg.toFixed(2) + ' g/s');
    }
    setText('vol-card-rate', avg.toFixed(2) + ' g/s avg');

    calcTimer(avg);
    calcSteam();
  }

  function calcTimer(rateGs) {
    const onTime = 1;
    const pkg    = onTime * PKG_PER_ON;

    if (rateGs <= 0) return;

    const pkgG     = pkg * 1000;                // grams
    const exact    = (pkgG / rateGs) - onTime;
    const offTime  = Math.round(exact);
    const cycle    = offTime + onTime;
    const produced = (rateGs * cycle) / 1000;    // kg per timer cycle
    const eff      = (produced / pkg) * 100;
    const overflow = produced > pkg * 1.01;

    // Throughput per game cycle (600s)
    const thruCycle = (rateGs * CYCLE_SECONDS) / 1000; // kg per game cycle

    setText('r-off',  offTime);
    setText('r-on',   onTime);

    setText('r-thru-cycle', thruCycle.toFixed(1) + ' kg');
    setText('r-eff-pct',    eff.toFixed(1) + '%');
    el('r-eff-bar').style.width = Math.min(eff, 100) + '%';
    el('r-warn').classList.toggle('show', overflow);

    // Update tooltip with current values
    const timerMain = document.querySelector('.timer-main');
    if (timerMain) {
      timerMain.title =
        'Formula: OFF = round((pkg_g \u00f7 rate) \u2212 on_time)\n' +
        'OFF = round((' + pkgG + 'g \u00f7 ' + rateGs.toFixed(2) + ') \u2212 ' + onTime + ') = ' + exact.toFixed(4) + ' \u2192 ' + offTime + 's\n' +
        'Package size: ' + pkg + ' kg (fixed game mechanic)\n' +
        'Cycle: ' + cycle + 's | Per cycle: ' + produced.toFixed(3) + ' kg';
    }
  }

  function calcSteam() {
    const tiles  = getN('tiles');
    const kgTile = getN('kg-tile');
    if (tiles <= 0 || kgTile <= 0) return;

    _steamTotal  = tiles * kgTile;
    _basePlates  = Math.ceil(_steamTotal / PLATE_KG);
    _plateOffset = 0;
    renderSteam();
  }

  function adjPlates(delta) {
    _plateOffset += delta;
    renderSteam();
  }

  function renderSteam() {
    const plates   = _basePlates + _plateOffset;
    const platesKg = plates * PLATE_KG;
    const exact    = _steamTotal / PLATE_KG;
    const diff     = platesKg - _steamTotal;
    const sign     = diff >= 0 ? '+' : '';

    setText('sc-tiles-echo', getN('tiles'));
    setText('sc-kgt-echo',   getN('kg-tile'));
    setText('sc-total',      _steamTotal.toLocaleString());
    setText('sc-plates',     plates);
    setText('sc-exact',      `(${exact.toFixed(2)} exact)`);

    setText('pc-plates-kg',  platesKg.toLocaleString() + ' kg');
    setText('pc-plates-sum', `${plates} \u00d7 800 kg`);

    const diffTxt = diff !== 0 ? `${sign}${diff.toLocaleString()} kg` : 'exact';
    const diffSub = diff > 0  ? 'surplus over target'
                  : diff < 0  ? 'short of target'
                  :              'perfect match';
    setText('pc-delta-val', diffTxt);
    setText('pc-delta-sub', diffSub);
    el('pc-delta').classList.toggle('active-cell', diff === 0);
  }

  // ════════════════════════════════════════
  //  TAB SWITCHING
  // ════════════════════════════════════════
  function wireTabBar() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-selected', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
      });
    });
  }

  // ════════════════════════════════════════
  //  EVENT WIRING
  // ════════════════════════════════════════
  function wireEvents() {
    document.querySelectorAll('.vol-btn').forEach(btn =>
      btn.addEventListener('click', () => selectVol(btn))
    );

    document.querySelectorAll('.step-btn[data-target]').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.target;
        const delta  = parseFloat(btn.dataset.delta);
        if (target.startsWith('dim-')) {
          stepDim(target.slice(4), delta);
        } else {
          stepInput(target, delta);
        }
      });
    });

    document.querySelectorAll('.plate-nudge-btn').forEach(btn =>
      btn.addEventListener('click', () => adjPlates(parseFloat(btn.dataset.delta)))
    );

    el('rate-unit-btn').addEventListener('click', toggleRateUnit);
    el('override-btn').addEventListener('click', toggleOverride);
    el('detail-toggle').addEventListener('click', toggleDetail);

    ['rate', 'erupt-time', 'erupt-period', 'kg-tile']
      .forEach(id => el(id).addEventListener('input', recalc));

    el('avg-override').addEventListener('input', recalc);

    el('dim-w').addEventListener('input', onDimChange);
    el('dim-h').addEventListener('input', onDimChange);
    el('tiles').addEventListener('input', onTilesChange);

    document.querySelectorAll('.step-input').forEach(input =>
      input.addEventListener('focus', () => input.select())
    );

    document.querySelectorAll('.vol-icon-wrap img').forEach(img => {
      img.addEventListener('error', () => {
        img.style.display = 'none';
        const svg = img.nextElementSibling;
        if (svg) svg.style.display = 'block';
      });
    });

    const tempshiftIcon = el('tempshift-icon');
    if (tempshiftIcon) {
      tempshiftIcon.addEventListener('error', () => {
        tempshiftIcon.style.display = 'none';
      });
    }

    wireTabBar();
  }

  // ════════════════════════════════════════
  //  INIT
  // ════════════════════════════════════════
  function init() {
    wireEvents();

    const defaultBtn = document.querySelector('.vol-btn[data-vol="Gold"]');
    if (defaultBtn) {
      defaultBtn.classList.add('active');
      defaultBtn.setAttribute('aria-checked', 'true');
      updateVolDisplay('Gold');
    }

    // Apply initial override visual state
    applyOverrideVisuals();

    recalc();
  }

  document.addEventListener('DOMContentLoaded', init);

})();
