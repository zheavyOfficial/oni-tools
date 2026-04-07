/* ════════════════════════════════════════
   Metal Volcano Tamer — main.js
   ONI fan tool — not affiliated with Klei Entertainment
════════════════════════════════════════ */
(function () {
  'use strict';

  // ════════════════════════════════════════
  //  CONSTANTS
  // ════════════════════════════════════════
  const PKG_PER_ON = 20;   // kg produced per 1 second of on-time (fixed game mechanic)
  const PLATE_KG   = 800;  // kg of cooling per ice tempshift plate

  /** Volcano data used for name-lookup in the match label. */
  const VOLCANOES = [
    { name: 'Gold',      rate: 233.3  },
    { name: 'Copper',    rate: 300    },
    { name: 'Iron',      rate: 326.6  },
    { name: 'Cobalt',    rate: 583.3  },
    { name: 'Aluminium', rate: 466.6  },
    { name: 'Niobium',   rate: 1200   },
    { name: 'Tungsten',  rate: 380    },
  ];

  // ════════════════════════════════════════
  //  STATE
  // ════════════════════════════════════════
  let _steamTotal  = 0;
  let _basePlates  = 0;
  let _plateOffset = 0;
  let _lockDim     = false;  // prevents recursive dim ↔ tiles sync

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
  //  VOLCANO BUTTONS
  // ════════════════════════════════════════
  function selectVol(btn) {
    document.querySelectorAll('.vol-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const rate = parseFloat(btn.dataset.rate);
    setN('rate', rate);
    syncPresets(rate);
    syncMatchLabel(rate);
    recalc();
  }

  function syncPresets(rate) {
    document.querySelectorAll('.prs-btn').forEach(b =>
      b.classList.toggle('active', parseFloat(b.dataset.val) === rate)
    );
  }

  function syncMatchLabel(rate) {
    const lbl = el('match-lbl');
    const match = VOLCANOES.find(v => Math.abs(v.rate - rate) < 0.15);
    if (match) {
      lbl.textContent = match.name + ' Volcano';
      lbl.classList.add('matched');
    } else {
      lbl.textContent = '—';
      lbl.classList.remove('matched');
    }
  }

  function syncVolBtns(rate) {
    document.querySelectorAll('.vol-btn').forEach(b =>
      b.classList.toggle('active', Math.abs(parseFloat(b.dataset.rate) - rate) < 0.15)
    );
  }

  // ════════════════════════════════════════
  //  RATE INPUT
  // ════════════════════════════════════════
  function onRateChange() {
    const rate = getN('rate');
    syncPresets(rate);
    syncMatchLabel(rate);
    syncVolBtns(rate);
    recalc();
  }

  function setPreset(btn) {
    const v = parseFloat(btn.dataset.val);
    setN('rate', v);
    syncPresets(v);
    syncMatchLabel(v);
    syncVolBtns(v);
    recalc();
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
    calcTimer();
    calcSteam();
  }

  function calcTimer() {
    const rate   = getN('rate');
    const onTime = Math.max(1, Math.round(getN('on-time')));

    // Update package size label
    const pkg = onTime * PKG_PER_ON;
    setText('pkg-lbl', pkg);

    if (rate <= 0) return;

    const pkgG     = pkg * 1000;              // grams
    const exact    = (pkgG / rate) - onTime;
    const offTime  = Math.round(exact);
    const cycle    = offTime + onTime;
    const produced = (rate * cycle) / 1000;   // kg
    const thru     = pkgG / cycle / 1000;     // kg/s
    const eff      = (produced / pkg) * 100;
    const overflow = produced > pkg * 1.01;

    setText('r-off',      offTime);
    setText('r-on',       onTime);
    setText('r-cycle',    cycle);
    setText('r-produced', produced.toFixed(3));
    setText('r-thru',     thru.toFixed(4));
    setText('r-eff-pct',  eff.toFixed(1) + '%');
    el('r-eff-bar').style.width = Math.min(eff, 100) + '%';
    el('r-warn').classList.toggle('show', overflow);

    setText('r-f1',    `(${pkgG}g ÷ ${rate})`);
    setText('r-f-on',  onTime);
    setText('r-f-on2', onTime);
    setText('r-f2',    exact.toFixed(4));
    setText('r-f3',    offTime);
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

    // echo current input values
    setText('sc-tiles-echo', getN('tiles'));
    setText('sc-kgt-echo',   getN('kg-tile'));

    setText('sc-total',   _steamTotal.toLocaleString());
    setText('sc-plates',  plates);
    setText('sc-exact',   `(${exact.toFixed(2)} exact)`);

    setText('pc-plates-kg',  platesKg.toLocaleString() + ' kg');
    setText('pc-plates-sum', `${plates} × 800 kg`);

    const diffTxt = diff !== 0 ? `${sign}${diff.toLocaleString()} kg` : 'exact';
    const diffSub = diff > 0  ? 'surplus over target'
                  : diff < 0  ? 'short of target'
                  :              'perfect match';
    setText('pc-delta-val', diffTxt);
    setText('pc-delta-sub', diffSub);
    el('pc-delta').classList.toggle('active-cell', diff === 0);
  }

  // ════════════════════════════════════════
  //  EVENT WIRING
  // ════════════════════════════════════════
  function wireEvents() {
    // Volcano selector buttons
    document.querySelectorAll('.vol-btn').forEach(btn =>
      btn.addEventListener('click', () => selectVol(btn))
    );

    // Preset rate buttons
    document.querySelectorAll('.prs-btn').forEach(btn =>
      btn.addEventListener('click', () => setPreset(btn))
    );

    // Stepper buttons — read data-target and data-delta attributes
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

    // Plate nudge buttons
    document.querySelectorAll('.plate-nudge-btn').forEach(btn =>
      btn.addEventListener('click', () => adjPlates(parseFloat(btn.dataset.delta)))
    );

    // Input change handlers
    el('rate').addEventListener('input', onRateChange);
    el('on-time').addEventListener('input', recalc);
    el('kg-tile').addEventListener('input', recalc);
    el('dim-w').addEventListener('input', onDimChange);
    el('dim-h').addEventListener('input', onDimChange);
    el('tiles').addEventListener('input', onTilesChange);

    // Select-all on focus for all step inputs
    document.querySelectorAll('.step-input').forEach(input =>
      input.addEventListener('focus', () => input.select())
    );

    // Fallback for volcano icons — hide img, show inline SVG sibling
    document.querySelectorAll('.vol-icon-wrap img').forEach(img => {
      img.addEventListener('error', () => {
        img.style.display = 'none';
        const svg = img.nextElementSibling;
        if (svg) svg.style.display = 'block';
      });
    });

    // Fallback for tempshift plate icon — just hide it, no SVG replacement needed
    const tempshiftIcon = el('tempshift-icon');
    if (tempshiftIcon) {
      tempshiftIcon.addEventListener('error', () => {
        tempshiftIcon.style.display = 'none';
      });
    }
  }

  // ════════════════════════════════════════
  //  INIT
  // ════════════════════════════════════════
  function init() {
    wireEvents();

    // Default to Iron volcano
    const ironBtn = document.querySelector('.vol-btn[data-rate="326.6"]');
    if (ironBtn) ironBtn.classList.add('active');
    syncPresets(326.6);
    syncMatchLabel(326.6);
    recalc();
  }

  document.addEventListener('DOMContentLoaded', init);

})();
