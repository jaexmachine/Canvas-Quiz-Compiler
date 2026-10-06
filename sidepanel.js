const key = 'compiledQuizzes';
const app = document.getElementById('app');
const get = keys => new Promise(resolve => chrome.storage.local.get(keys, resolve));
const set = value => new Promise(resolve => chrome.storage.local.set(value, resolve));
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[char]));
let quizzes = {}; let query = '';

function shell(content) { app.innerHTML = `<section class="shell">${content}</section>`; }
function render() {
  const records = Object.entries(quizzes).sort(([,a],[,b]) => b.timestamp - a.timestamp).filter(([,q]) => `${q.quizTitle} ${q.course}`.toLowerCase().includes(query.toLowerCase()));
  shell(`<header class="topbar"><div><div class="eyebrow">Canvas companion</div><h1>Quiz Compiler</h1><p class="subtle">Your captured study archive</p></div><button class="icon-btn" id="refresh" title="Refresh">↻</button></header>
    <div class="stats"><div class="stat"><span class="subtle">Quizzes</span><strong>${Object.keys(quizzes).length}</strong></div><div class="stat"><span class="subtle">Questions</span><strong>${Object.values(quizzes).reduce((n,q) => n + (q.questions?.length || 0), 0)}</strong></div></div>
    <div class="toolbar"><input class="search" id="search" placeholder="Search quizzes..." value="${esc(query)}"><button class="primary" id="export-all">Export</button></div>
    <div class="quiz-list">${records.length ? records.map(([id,q]) => card(id,q)).join('') : '<div class="empty">No compiled quizzes yet.<br><span class="subtle">Open a Canvas quiz and start recording.</span></div>'}</div>`);
  document.getElementById('refresh').onclick = load;
  document.getElementById('search').oninput = event => { query = event.target.value; render(); document.getElementById('search').focus(); };
  document.getElementById('export-all').onclick = () => download('Canvas_Quiz_Archive.json', JSON.stringify(quizzes, null, 2), 'application/json');
  app.querySelectorAll('[data-view]').forEach(button => button.onclick = () => view(button.dataset.view));
  app.querySelectorAll('[data-download]').forEach(button => button.onclick = () => downloadQuiz(button.dataset.download));
  app.querySelectorAll('[data-delete]').forEach(button => button.onclick = () => removeQuiz(button.dataset.delete));
}
function card(id,q) { return `<article class="quiz-card"><div class="quiz-head"><div class="quiz-title">${esc(q.quizTitle)}</div><span class="badge">${q.questions?.length || 0} Q</span></div><div class="meta"><span>${esc(q.course || 'Canvas')}</span><span>${new Date(q.timestamp).toLocaleDateString()}</span></div><div class="actions"><button data-view="${esc(id)}">Review</button><button data-download="${esc(id)}">TXT</button><button class="danger" data-delete="${esc(id)}" title="Delete">×</button></div></article>`; }
function view(id) { const q = quizzes[id]; if (!q) return; shell(`<button class="back" id="back">← Back</button><article class="detail-card"><div class="eyebrow">${esc(q.course || 'Canvas')}</div><h2>${esc(q.quizTitle)}</h2><p class="subtle">${q.questions?.length || 0} captured questions · ${new Date(q.timestamp).toLocaleString()}</p><div>${(q.questions || []).map(item => `<div class="question"><p><strong>Q${item.questionNumber}.</strong> ${esc(item.questionText)}</p><p class="answer"><strong>Answer:</strong> ${esc(item.userAnswer)}</p></div>`).join('')}</div></article>`); document.getElementById('back').onclick = render; }
async function removeQuiz(id) { if (!confirm('Delete this compiled quiz?')) return; const next = { ...quizzes }; delete next[id]; quizzes = next; await set({ [key]: quizzes }); render(); }
function text(q) { return [`QUIZ: ${q.quizTitle}`,`COURSE: ${q.course || 'Canvas'}`,`DATE: ${new Date(q.timestamp).toLocaleString()}`,'',...(q.questions || []).flatMap(item => [`Q${item.questionNumber}: ${item.questionText}`,`ANSWER: ${item.userAnswer}`,''])].join('\n'); }
function downloadQuiz(id) { const q = quizzes[id]; if (q) download(`${safeName(q.quizTitle)}.txt`, text(q), 'text/plain'); }
function download(name, content, type) { const url = URL.createObjectURL(new Blob([content], { type })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 500); }
function safeName(value) { return String(value || 'quiz').replace(/[^\w\- ]/g,'').trim().replace(/\s+/g,'_').slice(0,80) || 'quiz'; }
async function load() { const result = await get(key); quizzes = result[key] || {}; render(); }
chrome.storage.onChanged.addListener(changes => { if (changes[key]) load(); });
load();
