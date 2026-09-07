/* ============================================
   GOTOOLLY COMPONENT API v2.0
   Vanilla JS component generators
   ============================================ */

const GT = (() => {
  'use strict';

  /* ── Toast ── */
  function toast(message, type = 'info') {
    const existing = document.querySelector('.gt-toast');
    if (existing) existing.remove();

    const el = document.createElement('div');
    el.className = `gt-toast ${type}`;
    el.textContent = message;
    el.setAttribute('role', 'alert');
    document.body.appendChild(el);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => el.classList.add('show'));
    });

    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 200);
    }, type === 'error' ? 5000 : 3500);
  }

  /* ── File Size Formatter ── */
  function formatSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /* ── Upload Zone ── */
  function createUploadZone(config) {
    const { id, accept, label, subtext, buttonText, onFile, onDrop } = config;
    const zone = document.createElement('div');
    zone.className = 'gt-upload-zone';
    zone.innerHTML = `
      <input type="file" id="${id}-input" accept="${accept}" style="display:none" aria-label="Select file">
      <label for="${id}-input" class="gt-upload-area" id="${id}-drop" role="button" tabindex="0">
        <div class="gt-upload-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
        </div>
        <h3>${label}</h3>
        <p class="gt-upload-sub">${subtext}</p>
        <span class="gt-upload-btn">${buttonText}</span>
      </label>
    `;

    const input = zone.querySelector('input');
    const drop = zone.querySelector('.gt-upload-area');

    input.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) onFile(file);
    });

    drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('dragover') });
    drop.addEventListener('dragleave', (e) => { e.preventDefault(); drop.classList.remove('dragover') });
    drop.addEventListener('drop', (e) => {
      e.preventDefault();
      drop.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file) onDrop ? onDrop(file) : onFile(file);
    });

    return zone;
  }

  /* ── File Info Bar ── */
  function createFileInfo(config) {
    const { id, name, size, pages, status } = config;
    const el = document.createElement('div');
    el.className = 'gt-file-info show';
    el.id = id;
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.innerHTML = `
      <div class="gt-file-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
      </div>
      <div class="gt-file-details">
        <div class="gt-file-name" title="${name}">${name}</div>
        <div class="gt-file-meta">
          <span>${formatSize(size)}</span>
          ${pages ? `<span>${pages} page${pages !== 1 ? 's' : ''}</span>` : ''}
        </div>
      </div>
      <span class="gt-file-status ${status === 'ready' ? 'ok' : 'warn'}">${status === 'ready' ? 'Ready' : status}</span>
      <button class="gt-file-remove" aria-label="Remove file" title="Remove file">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    `;
    return el;
  }

  /* ── Preset Grid ── */
  function createPresetGrid(config) {
    const { presets, active, onChange } = config;
    const grid = document.createElement('div');
    grid.className = 'gt-preset-grid';
    grid.setAttribute('role', 'radiogroup');
    grid.setAttribute('aria-label', 'Preset selection');

    presets.forEach((p) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `gt-preset-btn ${p.id === active ? 'active' : ''}`;
      btn.dataset.preset = p.id;
      btn.setAttribute('role', 'radio');
      btn.setAttribute('aria-checked', p.id === active ? 'true' : 'false');
      btn.innerHTML = `
        ${p.icon}
        <span class="gt-preset-name">${p.name}</span>
        <span class="gt-preset-desc">${p.desc}</span>
      `;
      btn.addEventListener('click', () => {
        grid.querySelectorAll('.gt-preset-btn').forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-checked', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-checked', 'true');
        if (onChange) onChange(p.id);
      });
      grid.appendChild(btn);
    });

    return grid;
  }

  /* ── Option Card (checkbox) ── */
  function createOptionCard(config) {
    const { id, label, desc, checked, onChange } = config;
    const row = document.createElement('label');
    row.className = 'gt-option-card';
    row.innerHTML = `
      <input type="checkbox" id="${id}" ${checked ? 'checked' : ''}>
      <div>
        <div class="gt-option-label">${label}</div>
        ${desc ? `<div class="gt-option-desc">${desc}</div>` : ''}
      </div>
    `;
    const input = row.querySelector('input');
    if (onChange) input.addEventListener('change', () => onChange(input.checked));
    return row;
  }

  /* ── Progress Bar ── */
  function createProgress(config) {
    const { id } = config;
    const el = document.createElement('div');
    el.className = 'gt-progress';
    el.id = id;
    el.setAttribute('role', 'progressbar');
    el.setAttribute('aria-valuemin', '0');
    el.setAttribute('aria-valuemax', '100');
    el.setAttribute('aria-valuenow', '0');
    el.innerHTML = `
      <div class="gt-progress-top">
        <div class="gt-progress-spinner"></div>
        <span class="gt-progress-phase">Initializing...</span>
        <span class="gt-progress-pct">0%</span>
      </div>
      <div class="gt-progress-track">
        <div class="gt-progress-fill"></div>
      </div>
      <div class="gt-progress-cancel">
        <button type="button">Cancel</button>
      </div>
    `;
    return el;
  }

  /* ── Stats Card ── */
  function createStats(config) {
    const { stats } = config;
    const grid = document.createElement('div');
    grid.className = 'gt-stats';
    stats.forEach((s) => {
      const box = document.createElement('div');
      box.className = `gt-stat ${s.className || ''}`;
      box.innerHTML = `
        <div class="gt-stat-label">${s.label}</div>
        <div class="gt-stat-value">${s.value || ''}</div>
      `;
      grid.appendChild(box);
    });
    return grid;
  }

  /* ── Result Panel ── */
  function createResultPanel(config) {
    const { icon, heading, sub, stats, actions } = config;
    const el = document.createElement('div');
    el.className = 'gt-results show';

    let statsHTML = '';
    if (stats && stats.length) {
      statsHTML = '<div class="gt-stats">' + stats.map(s =>
        `<div class="gt-stat ${s.className || ''}"><div class="gt-stat-label">${s.label}</div><div class="gt-stat-value">${s.value}</div></div>`
      ).join('') + '</div>';
    }

    let actionsHTML = '';
    if (actions && actions.length) {
      actionsHTML = '<div class="gt-results-actions">' + actions.map(a =>
        `<button class="gt-btn ${a.primary ? 'gt-btn-primary gt-btn-xl' : 'gt-btn-outline gt-btn-xl'}" id="${a.id || ''}">${a.icon || ''}${a.label}</button>`
      ).join('') + '</div>';
    }

    el.innerHTML = `
      <div class="gt-results-icon ${icon.type}">${icon.svg}</div>
      <h3>${heading}</h3>
      <p class="gt-results-sub">${sub}</p>
      ${statsHTML}
      ${actionsHTML}
    `;
    return el;
  }

  /* ── Warning Box ── */
  function createWarningBox(config) {
    const { title, items } = config;
    const el = document.createElement('div');
    el.className = 'gt-warning-box show';
    el.setAttribute('aria-label', 'Tool limitations');
    el.innerHTML = `
      <div class="gt-warning-header">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <h4>${title}</h4>
      </div>
      <ul>${items.map(i => `<li>${i}</li>`).join('')}</ul>
    `;
    return el;
  }

  /* ── Related Tools Grid ── */
  function createRelatedTools(config) {
    const { tools } = config;
    const section = document.createElement('section');
    section.className = 'gt-related content-section';
    section.style.marginTop = '48px';
    section.innerHTML = `
      <div class="gt-section-heading">
        <h2>Related Tools</h2>
        <p>You might also need...</p>
      </div>
      <div class="gt-related-grid">
        ${tools.map(t => `
          <a href="${t.url}" class="gt-related-card">
            <div class="rc-icon">${t.icon}</div>
            <h4>${t.name}</h4>
            <p>${t.desc}</p>
            <span class="rc-link">Use tool <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></span>
          </a>
        `).join('')}
      </div>
    `;
    return section;
  }

  /* ── FAQ Grid ── */
  function createFAQ(config) {
    const { items } = config;
    const section = document.createElement('section');
    section.className = 'gt-faq content-section';
    section.style.marginTop = '48px';
    section.innerHTML = `
      <div class="gt-section-heading">
        <h2>Frequently Asked Questions</h2>
      </div>
      <div class="gt-faq-grid">
        ${items.map(i => `
          <div class="gt-faq-card">
            <h4>${i.q}</h4>
            <p>${i.a}</p>
          </div>
        `).join('')}
      </div>
    `;
    return section;
  }

  /* ── How It Works ── */
  function createHowItWorks(config) {
    const { steps } = config;
    const section = document.createElement('section');
    section.className = 'gt-how content-section';
    section.style.marginTop = '48px';
    section.innerHTML = `
      <div class="gt-section-heading">
        <h2>How It Works</h2>
      </div>
      <div class="gt-steps-grid">
        ${steps.map((s, i) => `
          <div class="gt-step-card">
            <div class="gt-step-num">${i + 1}</div>
            <h4>${s.title}</h4>
            <p>${s.desc}</p>
          </div>
        `).join('')}
      </div>
    `;
    return section;
  }

  /* ── Settings Card ── */
  function createSettingsCard(config) {
    const { title, content, hidden, id } = config;
    const card = document.createElement('div');
    card.className = `gt-settings-card ${hidden ? 'hidden' : ''}`;
    if (id) card.id = id;
    card.innerHTML = `
      <div class="gt-settings-card-header">
        <h3>${title}</h3>
      </div>
      <div class="gt-settings-card-body"></div>
    `;
    const body = card.querySelector('.gt-settings-card-body');
    if (typeof content === 'string') {
      body.innerHTML = content;
    } else if (content instanceof HTMLElement) {
      body.appendChild(content);
    } else if (Array.isArray(content)) {
      content.forEach(c => body.appendChild(c));
    }
    return card;
  }

  /* ── Settings Panel ── */
  function createSettingsPanel(config) {
    const { id, cards } = config;
    const panel = document.createElement('div');
    panel.className = 'gt-settings-panel';
    if (id) panel.id = id;
    cards.forEach(c => panel.appendChild(c));
    return panel;
  }

  /* ── Page Exclusion Grid ── */
  function createPageGrid(config) {
    const { totalPages, excluded, onToggle } = config;
    const grid = document.createElement('div');
    grid.className = 'gt-preset-grid'; // Reuse grid but with 6 cols
    grid.style.gridTemplateColumns = 'repeat(6, 1fr)';
    grid.setAttribute('role', 'group');
    grid.setAttribute('aria-label', 'Page exclusion grid');

    for (let i = 1; i <= totalPages; i++) {
      const chip = document.createElement('div');
      chip.className = 'gt-page-chip';
      chip.dataset.page = i;
      chip.textContent = i;
      chip.setAttribute('role', 'button');
      chip.setAttribute('tabindex', '0');
      chip.setAttribute('aria-pressed', 'false');
      chip.style.cssText = 'display:flex;align-items:center;justify-content:center;padding:8px;border:1px solid var(--gt-border);border-radius:var(--gt-radius-md);font-size:12px;font-weight:600;font-family:var(--gt-font-mono);cursor:pointer;transition:all .2s;background:var(--gt-white)';

      if (excluded && excluded.has(i)) {
        chip.classList.add('excluded');
        chip.style.background = 'var(--gt-error-bg)';
        chip.style.borderColor = '#fca5a5';
        chip.style.color = 'var(--gt-error)';
        chip.style.textDecoration = 'line-through';
        chip.setAttribute('aria-pressed', 'true');
      }

      const toggle = () => onToggle(i, chip);
      chip.addEventListener('click', toggle);
      chip.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
      });

      grid.appendChild(chip);
    }
    return grid;
  }

  /* ── Public API ── */
  return {
    toast,
    formatSize,
    createUploadZone,
    createFileInfo,
    createPresetGrid,
    createOptionCard,
    createProgress,
    createStats,
    createResultPanel,
    createWarningBox,
    createRelatedTools,
    createFAQ,
    createHowItWorks,
    createSettingsCard,
    createSettingsPanel,
    createPageGrid
  };
})();

// Export for module environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GT;
}
