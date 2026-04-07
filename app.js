'use strict';

/* ── State ─────────────────────────────────────────────────── */
const state = {
  year:   new Date().getFullYear(),
  month:  new Date().getMonth(),   // 0-indexed
  events: [],
  editingId: null,                 // null = add mode, string = edit mode
};

const STORAGE_KEY = 'calendarEvents';

/* ── LocalStorage helpers ──────────────────────────────────── */
function loadEvents() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveEvents() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.events));
}

/* ── Event CRUD ────────────────────────────────────────────── */
function addEvent(data) {
  state.events.push({ id: crypto.randomUUID(), ...data });
  saveEvents();
}

function updateEvent(id, data) {
  const idx = state.events.findIndex(e => e.id === id);
  if (idx !== -1) {
    state.events[idx] = { id, ...data };
    saveEvents();
  }
}

function deleteEvent(id) {
  state.events = state.events.filter(e => e.id !== id);
  saveEvents();
}

/* ── Calendar rendering ────────────────────────────────────── */
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

function renderCalendar() {
  const { year, month } = state;

  document.getElementById('cal-title').textContent = `${MONTHS[month]} ${year}`;

  const grid = document.getElementById('cal-grid');
  grid.innerHTML = '';

  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev  = new Date(year, month, 0).getDate();

  const today = new Date();
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());

  // How many cells total (always 6 rows × 7 cols = 42)
  const totalCells = 42;

  // Build event lookup: dateStr → [event, ...]
  const eventMap = buildEventMap();

  for (let i = 0; i < totalCells; i++) {
    const cell = document.createElement('div');
    cell.className = 'day-cell';
    cell.setAttribute('role', 'gridcell');

    let dayNum, cellYear, cellMonth;

    if (i < firstDay) {
      // Previous month overflow
      dayNum = daysInPrev - firstDay + i + 1;
      cellMonth = month - 1 < 0 ? 11 : month - 1;
      cellYear  = month - 1 < 0 ? year - 1 : year;
      cell.classList.add('outside');
    } else if (i < firstDay + daysInMonth) {
      dayNum = i - firstDay + 1;
      cellMonth = month;
      cellYear  = year;
    } else {
      // Next month overflow
      dayNum = i - firstDay - daysInMonth + 1;
      cellMonth = month + 1 > 11 ? 0 : month + 1;
      cellYear  = month + 1 > 11 ? year + 1 : year;
      cell.classList.add('outside');
    }

    const dateStr = toDateStr(cellYear, cellMonth, dayNum);

    if (dateStr === todayStr) cell.classList.add('today');

    // Day number
    const numEl = document.createElement('div');
    numEl.className = 'day-num';
    numEl.textContent = dayNum;
    cell.appendChild(numEl);

    // Events for this cell
    const cellEvents = eventMap[dateStr] || [];
    const MAX_VISIBLE = 3;
    cellEvents.slice(0, MAX_VISIBLE).forEach(ev => {
      const chip = createChip(ev);
      cell.appendChild(chip);
    });
    if (cellEvents.length > MAX_VISIBLE) {
      const more = document.createElement('span');
      more.className = 'overflow-label';
      more.textContent = `+${cellEvents.length - MAX_VISIBLE} more`;
      more.addEventListener('click', e => {
        e.stopPropagation();
        openModal(dateStr);
      });
      cell.appendChild(more);
    }

    // Click cell to add event (not on outside cells)
    if (!cell.classList.contains('outside')) {
      cell.addEventListener('click', () => openModal(dateStr));
    }

    grid.appendChild(cell);
  }
}

function createChip(ev) {
  const chip = document.createElement('span');
  chip.className = 'event-chip';
  chip.textContent = ev.start ? `${ev.start} ${ev.title}` : ev.title;
  chip.setAttribute('title', ev.title);
  chip.setAttribute('role', 'button');
  chip.setAttribute('tabindex', '0');
  chip.addEventListener('click', e => {
    e.stopPropagation();
    openModal(ev.date, ev.id);
  });
  chip.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      openModal(ev.date, ev.id);
    }
  });
  return chip;
}

function buildEventMap() {
  const map = {};
  state.events.forEach(ev => {
    if (!map[ev.date]) map[ev.date] = [];
    map[ev.date].push(ev);
    // Sort by start time within each day
    map[ev.date].sort((a, b) => (a.start || '').localeCompare(b.start || ''));
  });
  return map;
}

/* ── Date utility ──────────────────────────────────────────── */
function toDateStr(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/* ── Modal ─────────────────────────────────────────────────── */
const modal      = document.getElementById('event-modal');
const form       = document.getElementById('event-form');
const modalTitle = document.getElementById('modal-title');
const fTitle     = document.getElementById('event-title');
const fDate      = document.getElementById('event-date');
const fStart     = document.getElementById('event-start');
const fEnd       = document.getElementById('event-end');
const fNotes     = document.getElementById('event-notes');
const fId        = document.getElementById('event-id');
const errTitle   = document.getElementById('err-title');
const errDate    = document.getElementById('err-date');
const errTime    = document.getElementById('err-time');
const btnDelete  = document.getElementById('btn-delete');
const btnSave    = document.getElementById('btn-save');

let deleteConfirming = false;

function openModal(dateStr, eventId = null) {
  clearErrors();
  deleteConfirming = false;
  btnDelete.textContent = 'Delete';
  btnDelete.classList.remove('confirming');

  if (eventId) {
    // Edit mode
    const ev = state.events.find(e => e.id === eventId);
    if (!ev) return;
    state.editingId = eventId;
    modalTitle.textContent = 'Edit Event';
    btnSave.textContent = 'Update';
    btnDelete.hidden = false;
    fId.value     = ev.id;
    fTitle.value  = ev.title;
    fDate.value   = ev.date;
    fStart.value  = ev.start  || '';
    fEnd.value    = ev.end    || '';
    fNotes.value  = ev.notes  || '';
  } else {
    // Add mode
    state.editingId = null;
    modalTitle.textContent = 'Add Event';
    btnSave.textContent = 'Save';
    btnDelete.hidden = true;
    fId.value    = '';
    fTitle.value = '';
    fDate.value  = dateStr;
    fStart.value = '';
    fEnd.value   = '';
    fNotes.value = '';
  }

  modal.showModal();
  fTitle.focus();
}

function closeModal() {
  modal.close();
  state.editingId = null;
}

/* ── Validation ────────────────────────────────────────────── */
function validate() {
  clearErrors();
  let ok = true;

  if (!fTitle.value.trim()) {
    showError(errTitle, fTitle, 'Title is required.');
    ok = false;
  }

  if (!fDate.value) {
    showError(errDate, fDate, 'Date is required.');
    ok = false;
  }

  if (fStart.value && fEnd.value && fEnd.value <= fStart.value) {
    showError(errTime, fEnd, 'End time must be after start time.');
    ok = false;
  }

  return ok;
}

function showError(errEl, inputEl, msg) {
  errEl.textContent = msg;
  inputEl.classList.add('error');
}

function clearErrors() {
  [errTitle, errDate, errTime].forEach(el => { el.textContent = ''; });
  [fTitle, fDate, fEnd].forEach(el => el.classList.remove('error'));
}

/* ── Form submit ───────────────────────────────────────────── */
form.addEventListener('submit', e => {
  e.preventDefault();
  if (!validate()) return;

  const data = {
    title: fTitle.value.trim(),
    date:  fDate.value,
    start: fStart.value || null,
    end:   fEnd.value   || null,
    notes: fNotes.value.trim() || null,
  };

  if (state.editingId) {
    updateEvent(state.editingId, data);
  } else {
    addEvent(data);
  }

  closeModal();
  renderCalendar();
});

/* ── Delete with confirmation ──────────────────────────────── */
btnDelete.addEventListener('click', () => {
  if (!deleteConfirming) {
    deleteConfirming = true;
    btnDelete.textContent = 'Confirm delete?';
    btnDelete.classList.add('confirming');
    return;
  }
  // Second click — confirmed
  deleteEvent(state.editingId);
  closeModal();
  renderCalendar();
});

/* ── Cancel & backdrop close ───────────────────────────────── */
document.getElementById('btn-cancel').addEventListener('click', closeModal);

modal.addEventListener('click', e => {
  // Close when clicking directly on the <dialog> element (the backdrop)
  if (e.target === modal) closeModal();
});

// Reset confirming state if user moves away
modal.addEventListener('close', () => {
  deleteConfirming = false;
  btnDelete.classList.remove('confirming');
  btnDelete.textContent = 'Delete';
});

/* ── Navigation ────────────────────────────────────────────── */
document.getElementById('btn-prev').addEventListener('click', () => {
  state.month--;
  if (state.month < 0) { state.month = 11; state.year--; }
  renderCalendar();
});

document.getElementById('btn-next').addEventListener('click', () => {
  state.month++;
  if (state.month > 11) { state.month = 0; state.year++; }
  renderCalendar();
});

/* ── Init ──────────────────────────────────────────────────── */
function init() {
  state.events = loadEvents();
  renderCalendar();
}

init();
