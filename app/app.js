// Leonida Trophy Guide — checklist, tracker, roadmap and spoiler-safe browser for the
// 55 official GTA VI PlayStation 5 trophies. Data lives in data/trophies.json and
// data/roadmap.json; progress is saved in localStorage and can be exported/imported.
// Everything runs offline: the only requests are fetches of this app's own files.
const STORE_KEY = 'leonida-trophy-guide-v1';
const SPOILER_KEY = 'leonida-trophy-guide-spoiler';

const trophyList = document.getElementById('trophyList');
const emptyState = document.getElementById('emptyState');
const searchInput = document.getElementById('search');
const gradeSelect = document.getElementById('grade');
const spoilerBox = document.getElementById('spoiler');
const kindChips = document.getElementById('kindChips');

const KIND_LABELS = {
  story: 'Story', side: 'Side Mission', collectible: 'Collectible',
  activity: 'Activity', crime: 'Crime', misc: 'Misc', meta: 'Milestone',
};
let trophies = [];
let sources = {};
let roadmap = null;
let earned = new Set(loadProgress());
let activeKind = 'all';
let openGuides = new Set();

function loadProgress() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY) ?? '[]');
    return Array.isArray(raw) ? raw.filter((n) => Number.isInteger(n)) : [];
  } catch {
    return [];
  }
}

function saveProgress() {
  localStorage.setItem(STORE_KEY, JSON.stringify([...earned].sort((a, b) => a - b)));
}

function loadSpoilerSetting() {
  return localStorage.getItem(SPOILER_KEY) === 'on';
}

function toggleSpoilerMode() {
  localStorage.setItem(SPOILER_KEY, spoilerBox.checked ? 'on' : 'off');
  renderChecklist();
}

function trophyIsHidden(trophy) {
  return trophy.hidden && spoilerBox.checked && !earned.has(trophy.id);
}

function trophyMatchesFilter(trophy) {
  if (gradeSelect.value !== 'all' && trophy.grade !== gradeSelect.value) return false;
  if (activeKind === 'missable' && !trophy.missable) return false;
  if (activeKind === 'online') return false;
  if (activeKind !== 'all' && activeKind !== 'missable' && trophy.kind !== activeKind) return false;
  const q = searchInput.value.trim().toLowerCase();
  if (q) {
    const hay = `${trophy.name} ${trophy.description} ${trophy.guide}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

function buildSourcesLine(trophy) {
  const wrap = document.createElement('p');
  wrap.className = 'sources';
  wrap.append('Sources: ');
  trophy.sources.forEach((key, i) => {
    if (i > 0) wrap.append(' · ');
    const info = sources[key];
    if (info && info.url) {
      const a = document.createElement('a');
      a.href = info.url;
      a.textContent = info.name;
      a.target = '_blank';
      a.rel = 'noopener';
      wrap.append(a);
    } else {
      wrap.append(info ? info.name : key);
    }
  });
  return wrap;
}

function buildTrophyCard(trophy) {
  const li = document.createElement('li');
  li.className = 'trophy' + (earned.has(trophy.id) ? ' earned' : '');
  li.id = `trophy-${trophy.id}`;
  const hidden = trophyIsHidden(trophy);

  const head = document.createElement('div');
  head.className = 'trophyHead';
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = earned.has(trophy.id);
  box.setAttribute('aria-label', `Mark ${trophy.name} earned`);
  box.addEventListener('change', () => {
    if (box.checked) earned.add(trophy.id);
    else earned.delete(trophy.id);
    saveProgress();
    renderChecklist();
    renderProgressBar();
  });
  head.append(box);

  const main = document.createElement('div');
  main.className = 'trophyMain';
  const name = document.createElement('h3');
  name.className = 'trophyName';
  if (hidden) {
    const span = document.createElement('span');
    span.className = 'hiddenName';
    span.textContent = 'Hidden trophy — earn it to reveal';
    name.append(span);
  } else {
    name.textContent = trophy.name;
  }
  main.append(name);
  if (!hidden) {
    const desc = document.createElement('p');
    desc.className = 'trophyDesc';
    desc.textContent = trophy.description;
    main.append(desc);
  }

  const badges = document.createElement('div');
  badges.className = 'badges';
  const gradeBadge = document.createElement('span');
  gradeBadge.className = `badge ${trophy.grade}`;
  gradeBadge.textContent = trophy.grade;
  badges.append(gradeBadge);
  const kindBadge = document.createElement('span');
  kindBadge.className = 'badge kind';
  kindBadge.textContent = KIND_LABELS[trophy.kind] ?? trophy.kind;
  badges.append(kindBadge);
  if (trophy.missable) {
    const miss = document.createElement('span');
    miss.className = 'badge missable';
    miss.textContent = 'Missable';
    badges.append(miss);
  }
  if (trophy.count) {
    const count = document.createElement('span');
    count.className = 'badge count';
    count.textContent = `${trophy.count} ${trophy.countLabel ?? ''}`.trim();
    badges.append(count);
  }
  main.append(badges);

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'guideToggle';
  const guideBox = document.createElement('div');
  guideBox.className = 'guide';
  guideBox.hidden = !openGuides.has(trophy.id);
  const guideText = document.createElement('p');
  guideText.textContent = trophy.guide;
  guideBox.append(guideText);
  if (Array.isArray(trophy.steps)) {
    const steps = document.createElement('ol');
    for (const step of trophy.steps) {
      const item = document.createElement('li');
      item.textContent = step;
      steps.append(item);
    }
    guideBox.append(steps);
  }
  guideBox.append(buildSourcesLine(trophy));
  toggle.textContent = guideBox.hidden ? 'Show guide + sources' : 'Hide guide';
  toggle.addEventListener('click', () => {
    guideBox.hidden = !guideBox.hidden;
    toggle.textContent = guideBox.hidden ? 'Show guide + sources' : 'Hide guide';
    if (guideBox.hidden) openGuides.delete(trophy.id);
    else openGuides.add(trophy.id);
  });
  main.append(toggle, guideBox);
  head.append(main);
  li.append(head);
  return li;
}

function renderChecklist() {
  trophyList.replaceChildren();
  const shown = trophies.filter(trophyMatchesFilter);
  if (shown.length === 0) {
    emptyState.hidden = false;
    emptyState.textContent = activeKind === 'online'
      ? 'No online trophies — all 55 trophies in GTA VI are offline. Nothing here needs multiplayer.'
      : 'No trophies match these filters. Clear the search or pick another kind.';
  } else {
    emptyState.hidden = true;
    for (const trophy of shown) trophyList.append(buildTrophyCard(trophy));
  }
}

function renderProgressBar() {
  const total = trophies.length || 55;
  const pct = Math.round((earned.size / total) * 100);
  document.getElementById('progressText').textContent = `${earned.size} of ${total} earned`;
  document.getElementById('progressPct').textContent = `${pct}%`;
  document.getElementById('progressFill').style.width = `${pct}%`;
  const byGrade = {};
  for (const trophy of trophies) {
    if (earned.has(trophy.id)) byGrade[trophy.grade] = (byGrade[trophy.grade] ?? 0) + 1;
  }
  const totals = {};
  for (const trophy of trophies) totals[trophy.grade] = (totals[trophy.grade] ?? 0) + 1;
  document.getElementById('progressGrades').textContent =
    ['platinum', 'gold', 'silver', 'bronze']
      .map((g) => `${byGrade[g] ?? 0}/${totals[g] ?? 0} ${g}`)
      .join(' · ');
}

function renderRoadmap() {
  if (!roadmap) return;
  document.getElementById('roadmapTitle').textContent = roadmap.title;
  document.getElementById('roadmapSummary').textContent =
    `${roadmap.summary} Difficulty ${roadmap.difficulty}.`;
  const list = document.getElementById('roadmapList');
  list.replaceChildren();
  for (const stage of roadmap.stages) {
    const li = document.createElement('li');
    li.className = 'stage';
    const h = document.createElement('h3');
    h.textContent = `Stage ${stage.stage}: ${stage.title}`;
    const meta = document.createElement('p');
    meta.className = 'meta';
    meta.textContent = `${stage.time} · ${stage.trophies}`;
    const body = document.createElement('p');
    body.textContent = stage.body;
    li.append(h, meta, body);
    if (stage.warning) {
      const warn = document.createElement('p');
      warn.className = 'warn';
      warn.textContent = stage.warning;
      li.append(warn);
    }
    list.append(li);
  }
}

function showView(view) {
  const checklist = view !== 'roadmap';
  document.getElementById('checklistView').hidden = !checklist;
  document.getElementById('roadmapView').hidden = checklist;
  document.getElementById('controls').hidden = !checklist;
  document.getElementById('missableBanner').hidden = !checklist;
  document.getElementById('viewChecklist').classList.toggle('active', checklist);
  document.getElementById('viewRoadmap').classList.toggle('active', !checklist);
}

function applyFilters() {
  for (const chip of kindChips.querySelectorAll('.chip')) {
    chip.classList.toggle('active', chip.dataset.kind === activeKind);
  }
  renderChecklist();
}

function exportProgress() {
  const payload = {
    app: 'leonida-trophy-guide',
    version: 1,
    exportedAt: new Date().toISOString(),
    earned: [...earned].sort((a, b) => a - b),
    spoiler: spoilerBox.checked,
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'gta6-trophy-progress.json';
  a.click();
  URL.revokeObjectURL(url);
}

async function importProgress(file) {
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const ids = Array.isArray(data) ? data : data.earned;
    if (!Array.isArray(ids)) throw new Error('no earned list');
    const valid = new Set(trophies.map((t) => t.id));
    earned = new Set(ids.filter((n) => Number.isInteger(n) && valid.has(n)));
    if (data && typeof data.spoiler === 'boolean') spoilerBox.checked = data.spoiler;
    saveProgress();
    toggleSpoilerMode();
    renderProgressBar();
  } catch {
    emptyState.hidden = false;
    emptyState.textContent = 'That file is not a valid progress export. Nothing was changed.';
  }
}

function applyUrlState() {
  const params = new URLSearchParams(location.search);
  if (params.get('view') === 'roadmap') showView('roadmap');
  if (params.get('spoiler') === 'on') spoilerBox.checked = true;
  if (params.get('spoiler') === 'off') spoilerBox.checked = false;
  const filter = params.get('filter');
  if (filter && [...kindChips.querySelectorAll('.chip')].some((c) => c.dataset.kind === filter)) {
    activeKind = filter;
  }
  const open = Number(params.get('open'));
  if (Number.isInteger(open) && open > 0) openGuides.add(open);
}

async function initGuide() {
  const data = await (await fetch('data/trophies.json')).json();
  trophies = data.trophies;
  sources = data.sources ?? {};
  roadmap = await (await fetch('data/roadmap.json')).json();
  spoilerBox.checked = loadSpoilerSetting();
  applyUrlState();
  renderRoadmap();
  applyFilters();
  renderProgressBar();
}

document.getElementById('viewChecklist').addEventListener('click', () => showView('checklist'));
document.getElementById('viewRoadmap').addEventListener('click', () => showView('roadmap'));
kindChips.addEventListener('click', (event) => {
  const chip = event.target.closest('.chip');
  if (!chip) return;
  activeKind = chip.dataset.kind;
  applyFilters();
});
searchInput.addEventListener('input', renderChecklist);
gradeSelect.addEventListener('change', renderChecklist);
spoilerBox.addEventListener('change', toggleSpoilerMode);
document.getElementById('export').addEventListener('click', exportProgress);
document.getElementById('import').addEventListener('change', (event) => {
  importProgress(event.target.files[0]);
  event.target.value = '';
});
initGuide();
