/* ════════════════════════════════════════
   ONI Tools — main.js
   ONI fan tool — not affiliated with Klei Entertainment
════════════════════════════════════════ */
(function () {
  'use strict';

  // ════════════════════════════════════════
  //  CONSTANTS
  // ════════════════════════════════════════
  const PKG_PER_ON = 20;   // kg produced per 1 second of on-time (fixed game mechanic)
  const PLATE_KG   = 800;  // kg of cooling per ice tempshift plate

  /**
   * Volcano data.
   * rate     = community / datamined average (g/s)
   * wikiRate = wiki-verified average (g/s) — all non-Niobium = 300
   */
  const VOLCANOES = [
    { name: 'Gold',      rate: 233.3,  wikiRate: 300,  color: '#e8c020' },
    { name: 'Copper',    rate: 300,    wikiRate: 300,  color: '#d4784a' },
    { name: 'Iron',      rate: 326.6,  wikiRate: 300,  color: '#a8a0a0' },
    { name: 'Cobalt',    rate: 583.3,  wikiRate: 300,  color: '#4878d8' },
    { name: 'Aluminium', rate: 466.6,  wikiRate: 300,  color: '#c0d8e8' },
    { name: 'Niobium',   rate: 1200,   wikiRate: 1200, color: '#d0a8e0' },
    { name: 'Tungsten',  rate: 380,    wikiRate: 300,  color: '#c8b890' },
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
  //  DYNAMIC PRESETS
  // ════════════════════════════════════════

  /**
   * Builds the preset-row for the currently selected volcano (or generic if none).
   * Always shows:
   *   [Wiki: X g/s]  (teal style — wiki-verified)
   *   [Community: X g/s]  (blue style — only when different from wiki)
   *   [250]  [400]  (generic round-number presets)
   */
  function renderPresets(volcano) {
    const row    = el('preset-row');
    const curVal = getN('rate');
    row.innerHTML = '';

    const presets = [];

    if (volcano) {
      presets.push({ label: `Wiki: ${volcano.wikiRate}`, val: volcano.wikiRate, cls: 'wiki' });
      if (Math.abs(volcano.rate - volcano.wikiRate) >= 0.5) {
        presets.push({ label: `Community: ${volcano.rate}`, val: volcano.rate, cls: 'community' });
      }
    }

    // generic round numbers (skip if already in list)
    [250, 400].forEach(v => {
      if (!presets.some(p => Math.abs(p.val - v) < 0.5)) {
        presets.push({ label: String(v), val: v, cls: '' });
      }
    });

    presets.forEach(p => {
      const btn = document.createElement('button');
      btn.className = 'prs-btn' + (p.cls ? ' ' + p.cls : '');
      btn.textContent = p.label;
      btn.dataset.val = p.val;
      if (Math.abs(p.val - curVal) < 0.15) btn.classList.add('active');
      btn.addEventListener('click', () => setPreset(btn));
      row.appendChild(btn);
    });
  }

  function syncPresetHighlight(rate) {
    document.querySelectorAll('#preset-row .prs-btn').forEach(b =>
      b.classList.toggle('active', Math.abs(parseFloat(b.dataset.val) - rate) < 0.15)
    );
  }

  // ════════════════════════════════════════
  //  VOLCANO BUTTONS
  // ════════════════════════════════════════
  function selectVol(btn) {
    document.querySelectorAll('.vol-btn').forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-checked', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-checked', 'true');

    const rate    = parseFloat(btn.dataset.rate);
    const volcano = VOLCANOES.find(v => Math.abs(v.rate - rate) < 0.15);
    setN('rate', rate);
    renderPresets(volcano);
    syncMatchLabel(rate);
    recalc();
  }

  function syncMatchLabel(rate) {
    const lbl   = el('match-lbl');
    const match = VOLCANOES.find(v => Math.abs(v.rate - rate) < 0.15);
    if (match) {
      const wikiNote = Math.abs(match.rate - match.wikiRate) >= 0.5
        ? ` · wiki avg: ${match.wikiRate} g/s`
        : '';
      lbl.textContent = match.name + ' Volcano' + wikiNote;
      lbl.classList.add('matched');
    } else {
      lbl.textContent = '—';
      lbl.classList.remove('matched');
    }
  }

  function syncVolBtns(rate) {
    document.querySelectorAll('.vol-btn').forEach(b => {
      const matches = Math.abs(parseFloat(b.dataset.rate) - rate) < 0.15;
      b.classList.toggle('active', matches);
      b.setAttribute('aria-checked', matches ? 'true' : 'false');
    });
  }

  // ════════════════════════════════════════
  //  RATE INPUT
  // ════════════════════════════════════════
  function onRateChange() {
    const rate = getN('rate');
    syncPresetHighlight(rate);
    syncMatchLabel(rate);
    syncVolBtns(rate);
    recalc();
  }

  function setPreset(btn) {
    const v = parseFloat(btn.dataset.val);
    setN('rate', v);
    syncPresetHighlight(v);
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
        // Future: show/hide content panels by data-tab value
      });
    });
  }

  // ════════════════════════════════════════
  //  EVENT WIRING
  // ════════════════════════════════════════
  function wireEvents() {
    // Volcano selector buttons
    document.querySelectorAll('.vol-btn').forEach(btn =>
      btn.addEventListener('click', () => selectVol(btn))
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

    // Fallback: hide img, show inline SVG on load error
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

    // Default to Iron volcano
    const ironBtn = document.querySelector('.vol-btn[data-rate="326.6"]');
    if (ironBtn) {
      ironBtn.classList.add('active');
      ironBtn.setAttribute('aria-checked', 'true');
    }
    const ironVol = VOLCANOES.find(v => v.name === 'Iron');
    renderPresets(ironVol);
    syncMatchLabel(326.6);
    recalc();
  }

  document.addEventListener('DOMContentLoaded', init);

})();
