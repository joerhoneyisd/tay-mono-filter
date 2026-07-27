const CATEGORY_COLORS = {
  'Education': 'var(--cat-education)',
  'Engagement': 'var(--cat-engagement)',
  'Housing': 'var(--cat-housing)',
  'Legal Resources': 'var(--cat-legal)',
  'Medical': 'var(--cat-medical)',
  'Wellness': 'var(--cat-wellness)',
  'Workforce': 'var(--cat-workforce)',
};

const REQUIREMENT_LABELS = {
  foster_care: 'For foster youth',
  justice_involved: 'For justice-involved youth',
  homeless: 'For youth experiencing homelessness',
  low_income: 'Income-eligible programs',
  benefits_enrolled: 'For CalWORKs / GR recipients',
  pregnant_parenting: 'For pregnant or parenting youth',
  lgbtq: 'LGBTQ+ programs',
  hiv_positive: 'For those living with HIV',
  immigration_status: 'Requires eligible immigration status',
  school_enrolled: 'For students currently in school',
};

const REQUIREMENT_DESCRIPTIONS = {
  foster_care: "Only show programs specifically for current or former foster youth (including DCFS involvement).",
  justice_involved: "Only show programs specifically for youth who are currently or have been involved in the justice system — e.g. arrest, probation, parole, juvenile hall, or incarceration.",
  homeless: "Only show programs specifically for youth experiencing homelessness or housing instability.",
  low_income: "Only show programs with income-based eligibility requirements.",
  benefits_enrolled: "Only show programs that require current enrollment in CalWORKs, General Relief, or another public benefits program.",
  pregnant_parenting: "Only show programs specifically for pregnant or parenting youth.",
  lgbtq: "Only show programs specifically for LGBTQ+ youth.",
  hiv_positive: "Only show programs specifically for youth living with HIV.",
  immigration_status: "Only show programs that require U.S. citizenship or documented eligible immigration status.",
  school_enrolled: "Only show programs that require current enrollment in high school or another educational program.",
};

let DATA = [];
let state = {
  search: '',
  categories: new Set(),
  age: null,
  district: '',
  mode: '',
  transportOnly: false,
  medicalOnly: false,
  accessibility: new Set(),
  requirementTraits: new Set(),
};

async function init() {
  bindEvents();
  const grid = document.getElementById('resultsGrid');
  try {
    const res = await fetch('data.json');
    if (!res.ok) throw new Error(`data.json request failed with status ${res.status}`);
    const text = await res.text();
    try {
      DATA = JSON.parse(text);
    } catch (parseErr) {
      throw new Error('data.json did not contain valid JSON (got: "' + text.slice(0, 80) + '...")');
    }
    if (!Array.isArray(DATA) || DATA.length === 0) {
      throw new Error('data.json loaded but contained no program records.');
    }
    buildFilterOptions();
    render();
  } catch (err) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; padding: 32px; border: 1px dashed var(--line); border-radius: var(--radius); background: var(--panel);">
        <strong>Couldn't load program data.</strong>
        <p style="color: var(--ink-soft); font-size: 13.5px; margin-top: 8px;">${err.message}</p>
        <p style="color: var(--ink-soft); font-size: 13.5px;">
          This usually means the page was opened directly as a file (file://) rather than through a local web server, so the browser blocked the request for data.json. Try running <code>python3 -m http.server</code> in this folder and opening <code>http://localhost:8000</code> instead — or check the browser console (F12) for the exact network error.
        </p>
      </div>`;
    document.getElementById('resultCount').textContent = '';
    console.error(err);
  }
}

function buildFilterOptions() {
  const categories = [...new Set(DATA.map(d => d.category))].sort();
  renderChipGroup('categoryChips', categories, state.categories, (val, active) => {
    active ? state.categories.add(val) : state.categories.delete(val);
    render();
  });

  renderChipGroup('modeChips', ['Virtual', 'In-Person'], null, (val) => {
    state.mode = state.mode === val ? '' : val;
    document.querySelectorAll('#modeChips .chip').forEach(c => {
      c.classList.toggle('active', c.dataset.val === state.mode);
    });
    render();
  }, true);

  const access = [...new Set(DATA.flatMap(d => d.accessibility))].sort();
  renderChipGroup('accessChips', access, state.accessibility, (val, active) => {
    active ? state.accessibility.add(val) : state.accessibility.delete(val);
    render();
  }, false, true);

  const reqTags = [...new Set(DATA.flatMap(d => d.requirements.map(r => r.tag)))]
    .filter(t => t !== 'no_requirements');
  renderRequirementChips(reqTags);
}

function renderRequirementChips(tags) {
  const container = document.getElementById('requirementChips');
  container.innerHTML = '';
  tags.forEach(tag => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'req-chip';
    chip.dataset.val = tag;
    chip.innerHTML = `<span>${REQUIREMENT_LABELS[tag] || tag}</span><i class="req-info" title="${(REQUIREMENT_DESCRIPTIONS[tag] || '').replace(/"/g, '&quot;')}">i</i>`;
    chip.addEventListener('click', () => {
      const active = !chip.classList.contains('active');
      chip.classList.toggle('active', active);
      active ? state.requirementTraits.add(tag) : state.requirementTraits.delete(tag);
      render();
    });
    container.appendChild(chip);
  });
}

function renderChipGroup(containerId, values, activeSet, onToggle, singleSelect = false, truncate = false, labelMap = null) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  values.forEach(val => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    chip.dataset.val = val;
    chip.textContent = labelMap ? (labelMap[val] || val) : (truncate && val.length > 28 ? val.slice(0, 26) + '…' : val);
    if (truncate) chip.title = val;
    chip.addEventListener('click', () => {
      if (singleSelect) {
        onToggle(val);
      } else {
        const active = !chip.classList.contains('active');
        chip.classList.toggle('active', active);
        onToggle(val, active);
      }
    });
    container.appendChild(chip);
  });
}

function bindEvents() {
  document.getElementById('searchInput').addEventListener('input', (e) => {
    state.search = e.target.value.trim().toLowerCase();
    render();
  });
  document.getElementById('ageInput').addEventListener('input', (e) => {
    state.age = e.target.value ? parseInt(e.target.value, 10) : null;
    render();
  });
  document.getElementById('clearAge').addEventListener('click', () => {
    document.getElementById('ageInput').value = '';
    state.age = null;
    render();
  });
  document.getElementById('districtSelect').addEventListener('change', (e) => {
    state.district = e.target.value;
    render();
  });
  document.getElementById('transportOnly').addEventListener('change', (e) => {
    state.transportOnly = e.target.checked;
    render();
  });
  document.getElementById('medicalOnly').addEventListener('change', (e) => {
    state.medicalOnly = e.target.checked;
    render();
  });
  document.getElementById('clearFilters').addEventListener('click', resetFilters);
  document.getElementById('filterToggle').addEventListener('click', () => {
    const panel = document.getElementById('filterPanel');
    const open = panel.classList.toggle('open');
    document.getElementById('filterToggle').setAttribute('aria-expanded', open);
  });
  document.querySelectorAll('.collapsible .filter-group-header').forEach(header => {
    header.addEventListener('click', () => {
      header.closest('.collapsible').classList.toggle('open');
    });
  });
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalBackdrop').addEventListener('click', (e) => {
    if (e.target.id === 'modalBackdrop') closeModal();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
}

function resetFilters() {
  state = { search: '', categories: new Set(), age: null, district: '', mode: '',
    transportOnly: false, medicalOnly: false, accessibility: new Set(),
    requirementTraits: new Set() };
  document.getElementById('searchInput').value = '';
  document.getElementById('ageInput').value = '';
  document.getElementById('districtSelect').value = '';
  document.getElementById('transportOnly').checked = false;
  document.getElementById('medicalOnly').checked = false;
  document.querySelectorAll('.chip, .req-chip').forEach(c => c.classList.remove('active'));
  document.querySelectorAll('.collapsible').forEach(s => s.classList.remove('open'));
  render();
}

function programMatches(p) {
  if (state.search) {
    const hay = (p.programName + ' ' + p.taybrief + ' ' + p.briefDescription + ' ' + p.tags.join(' ')).toLowerCase();
    if (!hay.includes(state.search)) return false;
  }
  if (state.categories.size && !state.categories.has(p.category)) return false;
  if (state.age !== null && !p.ageRange.includes(state.age)) return false;
  if (state.district && !p.districts.includes(parseInt(state.district, 10))) return false;
  if (state.mode) {
    const okVirtual = state.mode === 'Virtual' && (p.serviceMode === 'Virtual' || p.serviceMode === 'Both');
    const okInPerson = state.mode === 'In-Person' && (p.serviceMode === 'In-Person' || p.serviceMode === 'Both');
    if (!okVirtual && !okInPerson) return false;
  }
  if (state.transportOnly && !p.transportationAssistance.offered) return false;
  if (state.medicalOnly && !p.acceptedInsurance.includes('Medi-Cal')) return false;
  if (state.requirementTraits.size) {
    const matchesAll = [...state.requirementTraits].every(tag => p.requirements.some(r => r.tag === tag));
    if (!matchesAll) return false;
  }
  if (state.accessibility.size) {
    const has = [...state.accessibility].every(a => p.accessibility.includes(a));
    if (!has) return false;
  }
  return true;
}

function countActiveFilters() {
  let n = 0;
  if (state.search) n++;
  n += state.categories.size;
  if (state.age !== null) n++;
  if (state.district) n++;
  if (state.mode) n++;
  if (state.transportOnly) n++;
  if (state.medicalOnly) n++;
  n += state.accessibility.size;
  n += state.requirementTraits.size;
  return n;
}

function render() {
  const results = DATA.filter(programMatches);
  const grid = document.getElementById('resultsGrid');
  const empty = document.getElementById('emptyState');
  grid.innerHTML = '';
  empty.hidden = results.length > 0;

  document.getElementById('resultCount').textContent = `${results.length} program${results.length === 1 ? '' : 's'}`;

  const badge = document.getElementById('activeFilterBadge');
  const activeCount = countActiveFilters();
  badge.hidden = activeCount === 0;
  badge.textContent = activeCount;

  updateSectionDots();

  results.forEach(p => {
    const card = document.createElement('div');
    card.className = 'card';
    card.style.setProperty('--cat-color', CATEGORY_COLORS[p.category] || 'var(--indigo)');
    card.innerHTML = `
      <div class="card-top">
        <div>
          <div class="card-cat">${p.category}</div>
          <div class="card-dept">${p.department}</div>
        </div>
      </div>
      <h3>${p.programName}</h3>
      <p class="card-desc">${p.taybrief}</p>
      <div class="card-meta">
        <span class="pill">Ages ${Math.min(...p.ageRange)}–${Math.max(...p.ageRange)}</span>
        <span class="pill amber">${p.serviceMode}</span>
        ${p.transportationAssistance.offered ? '<span class="pill green">Transportation</span>' : ''}
      </div>
    `;
    card.addEventListener('click', () => openModal(p));
    grid.appendChild(card);
  });
}

function updateSectionDots() {
  const dotStates = {
    category: state.categories.size > 0,
    age: state.age !== null,
    district: state.district !== '',
    mode: state.mode !== '',
    access: state.transportOnly || state.medicalOnly,
    accessibility: state.accessibility.size > 0,
    requirements: state.requirementTraits.size > 0,
  };
  Object.entries(dotStates).forEach(([key, active]) => {
    const section = document.querySelector(`.collapsible[data-section="${key}"]`);
    if (!section) return;
    const dot = section.querySelector('.active-dot');
    dot.hidden = !active;
  });
}

function openModal(p) {
  const body = document.getElementById('modalBody');
  const reqList = p.requirements.filter(r => r.tag !== 'no_requirements').map(r =>
    `<li>Requires: ${r.label}</li>`
  ).join('') || '<li>No specific eligibility requirements beyond age.</li>';

  const addressList = p.addresses.map(a => `<p>${a.street}, ${a.city}, CA ${a.zip} <span style="color:var(--ink-soft)">(District ${a.district.join(', ')})</span></p>`).join('');
  const phoneList = p.phones.map(ph => `<p>${ph.purpose}: ${ph.number}</p>`).join('');
  const emailList = p.emails.map(em => `<p>${em.purpose}: ${em.address}</p>`).join('');
  const hoursRows = p.hours.map(h => `<tr><td>${h.day}</td><td>${h.closed ? 'Closed' : h.open + ' – ' + h.close}</td></tr>`).join('');

  body.innerHTML = `
    <div class="modal-cat" style="--cat-color:${CATEGORY_COLORS[p.category] || 'var(--indigo)'}">${p.category}</div>
    <h2>${p.programName}</h2>
    <p class="modal-dept">${p.department}</p>

    <div class="modal-section">
      <h4>Overview</h4>
      <p>${p.taybrief}</p>
    </div>

    <div class="modal-section">
      <h4>Who it's for</h4>
      <p>Ages ${Math.min(...p.ageRange)}–${Math.max(...p.ageRange)} · ${p.serviceMode}</p>
      <ul>${reqList}</ul>
    </div>

    <div class="modal-section">
      <h4>How to enroll</h4>
      <p>${p.howToEnroll}</p>
    </div>

    <div class="modal-section">
      <h4>Location${p.addresses.length > 1 ? 's' : ''}</h4>
      ${addressList}
    </div>

    <div class="modal-section">
      <h4>Contact</h4>
      <div class="contact-block">
        ${phoneList}
        ${emailList}
        <p><a href="${p.website}" target="_blank" rel="noopener">${p.website}</a></p>
        <p style="margin-top:8px;">Referral contact: ${p.pointOfContact.name}, ${p.pointOfContact.title}<br>${p.pointOfContact.phone} · ${p.pointOfContact.email}</p>
      </div>
    </div>

    <div class="modal-section">
      <h4>Hours</h4>
      <table class="hours-table">${hoursRows}</table>
    </div>

    <div class="modal-section">
      <h4>Good to know</h4>
      <p><strong>Transportation:</strong> ${p.transportationAssistance.offered ? p.transportationAssistance.details : 'Not typically provided.'}</p>
      <p><strong>Languages:</strong> ${p.languages.join(', ')}</p>
      <p><strong>Accessibility:</strong> ${p.accessibility.join(', ')}</p>
      <p><strong>Required documents:</strong> ${p.requiredDocuments.join(', ')}</p>
      <p><strong>Insurance accepted:</strong> ${p.acceptedInsurance.join(', ')}</p>
    </div>
  `;
  document.getElementById('modalBackdrop').classList.add('open');
}

function closeModal() {
  document.getElementById('modalBackdrop').classList.remove('open');
}

init();
