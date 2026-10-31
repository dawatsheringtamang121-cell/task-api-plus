// frontend/app.js — Task Board (talks to the Task API with fetch; same origin as the server)
const API = '/tasks';
const EMPTY_TEXT = 'No tasks to show. Add one above to get started.';

const el = {
  form: document.getElementById('task-form'),
  title: document.getElementById('title'),
  priority: document.getElementById('priority'),
  due: document.getElementById('due'),
  msg: document.getElementById('form-msg'),
  list: document.getElementById('list'),
  empty: document.getElementById('empty'),
  summary: document.getElementById('summary'),
  today: document.getElementById('today'),
  sort: document.getElementById('sort'),
  search: document.getElementById('search'),
  clear: document.getElementById('clear-done'),
  tabs: document.querySelectorAll('.tab'),
};

let status = '';
let firstLoad = true;
let pendingDelete = null; // { task, timer } while the "Undo" toast is showing

const ICON_CAL = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="3" width="12" height="11" rx="2"/><path d="M2 7h12M5.5 1.5v3M10.5 1.5v3"/></svg>';
const ICON_TRASH = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 5.5h13M8 5.5V4a1 1 0 011-1h2a1 1 0 011 1v1.5M5.5 5.5l.7 10a1.5 1.5 0 001.5 1.4h4.6a1.5 1.5 0 001.5-1.4l.7-10M8.5 9v4.5M11.5 9v4.5"/></svg>';

// ---------- helpers ----------
async function request(url, options = {}) {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options });
  if (res.status === 204) return null;
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) { /* not JSON */ }
  if (!res.ok) throw new Error((data && data.error) || `Request failed (${res.status})`);
  if (data === null) throw new Error(`Empty response from ${options.method || 'GET'} ${url}`);
  return data;
}

function showError(text) {
  el.msg.textContent = text;
  el.msg.className = 'msg ' + (text ? 'error' : '');
}

function daysUntil(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((new Date(y, m - 1, d) - today) / 86400000);
}

function shortDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function dueInfo(t) {
  const date = String(t.due_date).slice(0, 10);
  if (t.completed) return { text: `Was due ${shortDate(date)}`, cls: '' };
  const n = daysUntil(date);
  if (n < 0) return { text: `Overdue by ${-n} day${n === -1 ? '' : 's'}`, cls: 'overdue' };
  if (n === 0) return { text: 'Due today', cls: 'today' };
  if (n === 1) return { text: 'Due tomorrow', cls: '' };
  if (n <= 6) return { text: `Due in ${n} days`, cls: '' };
  return { text: `Due ${shortDate(date)}`, cls: '' };
}

// ---------- toast (used for "Task deleted. Undo") ----------
const toast = document.createElement('div');
toast.id = 'toast';
toast.setAttribute('role', 'status');
toast.setAttribute('aria-live', 'polite');
toast.hidden = true;
document.body.append(toast);

function showToast(message, actionLabel, onAction) {
  toast.replaceChildren();
  const text = document.createElement('span');
  text.textContent = message;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = actionLabel;
  btn.addEventListener('click', onAction);
  toast.append(text, btn);
  toast.hidden = false;
}

function hideToast() { toast.hidden = true; }

// ---------- rendering ----------
function startEdit(titleEl, t) {
  const input = document.createElement('input');
  input.className = 'edit-input';
  input.value = t.title;
  input.maxLength = 255;
  input.setAttribute('aria-label', 'Edit task title');
  let finished = false;

  const finish = async (save) => {
    if (finished) return;
    finished = true;
    const value = input.value.trim();
    if (save && value && value !== t.title) await patch(t.id, { title: value });
    else load();
  };
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); finish(true); }
    else if (e.key === 'Escape') finish(false);
  });
  input.addEventListener('blur', () => finish(true));

  titleEl.replaceWith(input);
  input.focus();
  input.select();
}

function render(tasks) {
  el.list.replaceChildren();
  const visible = tasks.filter((t) => !pendingDelete || t.id !== pendingDelete.task.id);
  el.empty.classList.remove('loading');
  el.empty.textContent = EMPTY_TEXT;
  el.empty.hidden = visible.length > 0;

  visible.forEach((t) => {
    const li = document.createElement('li');
    li.className = `item ${t.priority}${t.completed ? ' done' : ''}`;

    const box = document.createElement('input');
    box.type = 'checkbox';
    box.className = 'check';
    box.checked = !!t.completed;
    box.setAttribute('aria-label', `Mark "${t.title}" as ${t.completed ? 'pending' : 'done'}`);
    box.addEventListener('change', () => patch(t.id, { completed: box.checked }));

    const body = document.createElement('div');
    const title = document.createElement('div');
    title.className = 'title editable';
    title.textContent = t.title; // textContent keeps user input from injecting HTML
    title.tabIndex = 0;
    title.title = 'Double-click (or press Enter) to edit';
    title.addEventListener('dblclick', () => startEdit(title, t));
    title.addEventListener('keydown', (e) => { if (e.key === 'Enter') startEdit(title, t); });

    const meta = document.createElement('div');
    meta.className = 'meta';
    const prio = document.createElement('span');
    prio.className = 'prio';
    prio.textContent = `${t.priority.charAt(0).toUpperCase()}${t.priority.slice(1)} priority`;
    meta.append(prio);

    if (t.due_date) {
      const info = dueInfo(t);
      const due = document.createElement('span');
      due.className = `due ${info.cls}`;
      due.insertAdjacentHTML('afterbegin', ICON_CAL);
      due.append(info.text);
      meta.append(due);
    }
    body.append(title, meta);

    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'del';
    del.setAttribute('aria-label', `Delete "${t.title}"`);
    del.title = 'Delete task';
    del.insertAdjacentHTML('afterbegin', ICON_TRASH);
    del.addEventListener('click', () => remove(t));

    li.append(box, body, del);
    el.list.append(li);
  });
}

function renderTabCounts(counts) {
  el.tabs.forEach((tab) => {
    if (!tab.dataset.label) tab.dataset.label = tab.textContent.trim();
    const n = counts[tab.dataset.status];
    const label = document.createTextNode(tab.dataset.label);
    const badge = document.createElement('span');
    badge.className = 'count';
    badge.textContent = n;
    tab.replaceChildren(label, badge);
  });
}

// ---------- API calls ----------
async function load() {
  if (firstLoad) {
    el.empty.classList.add('loading');
    el.empty.textContent = 'Loading tasks…';
    el.empty.hidden = false;
  }
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (el.search.value.trim()) params.set('search', el.search.value.trim());
  params.set('sort', el.sort.value);
  try {
    render(await request(`${API}?${params}`));
    showError('');
  } catch (err) {
    el.empty.classList.remove('loading');
    el.empty.textContent = 'Could not load tasks.';
    showError(err.message);
  }
  firstLoad = false;
}

async function loadStats() {
  try {
    const s = await request(`${API}/stats`);
    const done = Number(s.done) || 0;
    const pending = Number(s.pending) || 0;
    const overdue = Number(s.overdue) || 0;
    const total = done + pending;

    const top = document.createElement('div');
    top.className = 'progress-top';
    const headline = document.createElement('strong');
    headline.textContent = total ? `${done} of ${total} tasks done` : 'No tasks yet';
    const note = document.createElement('span');
    note.className = 'progress-note' + (overdue ? ' alert' : '');
    note.textContent = overdue ? `${overdue} overdue` : `${pending} left to do`;
    top.append(headline, note);

    const track = document.createElement('div');
    track.className = 'track';
    const fill = document.createElement('div');
    fill.className = 'fill';
    fill.style.width = total ? `${Math.round((done / total) * 100)}%` : '0%';
    track.append(fill);

    el.summary.replaceChildren(top, track);
    renderTabCounts({ '': total, pending, overdue, done });
  } catch (err) { /* optional */ }
}

const refresh = () => Promise.all([load(), loadStats()]);

async function patch(id, fields) {
  try {
    await request(`${API}/${id}`, { method: 'PATCH', body: JSON.stringify(fields) });
  } catch (err) { showError(err.message); }
  refresh();
}

// Delete with undo: hide the task now, really delete after 5 seconds unless "Undo" is clicked
async function commitDelete() {
  if (!pendingDelete) return;
  const { task, timer } = pendingDelete;
  clearTimeout(timer);
  pendingDelete = null;
  hideToast();
  try {
    await request(`${API}/${task.id}`, { method: 'DELETE' });
  } catch (err) { showError(err.message); }
  refresh();
}

async function remove(t) {
  await commitDelete(); // finish any earlier pending delete first
  pendingDelete = { task: t, timer: setTimeout(commitDelete, 5000) };
  showToast('Task deleted.', 'Undo', () => {
    clearTimeout(pendingDelete.timer);
    pendingDelete = null;
    hideToast();
    load();
  });
  load();
}

// If the page is closed during the 5-second window, still finish the delete
window.addEventListener('pagehide', () => {
  if (pendingDelete) fetch(`${API}/${pendingDelete.task.id}`, { method: 'DELETE', keepalive: true });
});

// ---------- events ----------
el.form.addEventListener('submit', async (e) => {
  e.preventDefault();
  showError('');
  try {
    await request(API, {
      method: 'POST',
      body: JSON.stringify({
        title: el.title.value,
        priority: el.priority.value,
        due_date: el.due.value || null,
      }),
    });
    el.form.reset();
    el.priority.value = 'medium';
    el.title.focus();
    refresh();
  } catch (err) { showError(err.message); }
});

el.tabs.forEach((tab) => tab.addEventListener('click', () => {
  el.tabs.forEach((t) => t.classList.remove('active'));
  tab.classList.add('active');
  status = tab.dataset.status;
  load();
}));

el.sort.addEventListener('change', load);
el.search.addEventListener('input', load);

el.clear.addEventListener('click', async () => {
  if (!confirm('Delete all completed tasks?')) return;
  try {
    await request(`${API}/completed`, { method: 'DELETE' });
    refresh();
  } catch (err) { showError(err.message); }
});

el.today.textContent = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
refresh();