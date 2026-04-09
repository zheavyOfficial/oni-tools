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

  const VOLCANOES = [
    { name: 'Gold',      color: '#e8c020' },
    { name: 'Copper',    color: '#d4784a' },
    { name: 'Iron',      color: '#a8a0a0' },
    { name: 'Cobalt',    color: '#4878d8' },
    { name: 'Aluminium', color: '#c0d8e8' },
    { name: 'Niobium',   color: '#d0a8e0' },
    { name: 'Tungsten',  color: '#c8b890' },
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
  //  VOLCANO BUTTONS (label only — no rate change)
  // ════════════════════════════════════════
  function selectVol(btn) {
    document.querySelectorAll('.vol-btn').forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-checked', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-checked', 'true');

    const volName = btn.dataset.vol;
    updateVolDisplay(volName);
  }

  function updateVolDisplay(name) {
    const volcano = VOLCANOES.find(v => v.name === name);
    const cardImg  = el('vol-card-img');
    const cardName = el('vol-card-name');

    if (volcano) {
      const imgSrc = 'assets/images/' + volcano.name.toLowerCase() + '_volcano.png';
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
  //  RATE INPUT
  // ════════════════════════════════════════
  function onRateChange() {
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
    const onTime = 1;

    const pkg = onTime * PKG_PER_ON;

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

    setText('vol-card-rate', rate + ' g/s');
    setText('r-f1',    `(${pkgG}g ÷ ${rate})`);
    setText('r-f-on',  onTime);
    setText('r-f-on2', onTime);
    setText('r-f2',    exact.toFixed(4));
    setText('r-f3',    offTime);
  }

  function calcSteam() {
    const tiles  = getN('tiles');
    const kgTile = 50;
    if (tiles <= 0) return;

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
    // Volcano selector buttons (label only — does NOT change rate)
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

    // Default to Gold Volcano
    const defaultBtn = document.querySelector('.vol-btn[data-vol="Gold"]');
    if (defaultBtn) {
      defaultBtn.classList.add('active');
      defaultBtn.setAttribute('aria-checked', 'true');
      updateVolDisplay('Gold');
    }

    recalc();
  }

  document.addEventListener('DOMContentLoaded', init);

})();
