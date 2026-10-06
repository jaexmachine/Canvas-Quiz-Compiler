(() => {
  const hostId = 'canvas-quiz-compiler-host';
  const stateKey = 'compilerState';

  const storage = {
    get: (keys) => new Promise(resolve => chrome.storage.local.get(keys, resolve)),
    set: (value) => new Promise(resolve => chrome.storage.local.set(value, resolve))
  };

  const clean = (value) => (value || '').replace(/\s+/g, ' ').trim();
  const title = () => clean(document.querySelector('.quiz-title, #quiz_title, h1')?.innerText) || document.title.split('|')[0].trim() || 'Untitled quiz';
  const answerText = (node, input) => {
    const label = input.id ? node.querySelector(`label[for="${CSS.escape(input.id)}"]`) : input.closest('label');
    return clean(label?.innerText || input.closest('.answer, .answer_label, .rc-Option')?.innerText || input.value || 'Selected');
  };

  function readQuestions() {
    return [...document.querySelectorAll('.question')].map((node, index) => {
      const questionText = clean(node.querySelector('.question_text, [data-testid="question-text"]')?.innerText);
      if (!questionText) return null;
      const selected = node.querySelector('input:checked');
      const fields = [...node.querySelectorAll('.answers input[type="text"], .answers textarea, .question_input input, .question_input textarea')];
      let answer = selected ? answerText(node, selected) : '';
      let type = selected?.type === 'checkbox' ? 'multiple_select' : selected ? 'multiple_choice' : 'short_answer';
      const values = fields.map(field => clean(field.value)).filter(Boolean);
      if (values.length) answer = values.join('; ');
      if (!answer) answer = 'No answer';
      return { id: `${index}:${questionText.slice(0, 80)}`, questionText, userAnswer: answer, questionType: type, questionNumber: index + 1 };
    }).filter(Boolean);
  }

  async function capture() {
    const { [stateKey]: state, compiledQuizzes = {} } = await storage.get([stateKey, 'compiledQuizzes']);
    if (!state?.isCompiling || !state.sessionId) return;
    const questions = readQuestions();
    if (!questions.length) return;
    const existing = compiledQuizzes[state.sessionId] || { quizTitle: title(), course: clean(document.title.split('-')[0]), timestamp: Date.now(), questions: [] };
    const byId = new Map(existing.questions.map(question => [question.id, question]));
    questions.forEach(question => byId.set(question.id, { ...byId.get(question.id), ...question }));
    existing.questions = [...byId.values()].map((question, index) => ({ ...question, questionNumber: index + 1 }));
    compiledQuizzes[state.sessionId] = existing;
    await storage.set({ compiledQuizzes });
    updateIndicator(existing.questions.length);
  }

  function updateIndicator(count = 0) {
    const indicator = shadow?.querySelector('[data-status]');
    if (indicator) indicator.textContent = `Recording · ${count} saved`;
  }

  let shadow;
  function mount() {
    if (document.getElementById(hostId)) return;
    const host = document.createElement('div'); host.id = hostId;
    shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = `<style>
      :host { all: initial; } .wrap { position: fixed; right: 20px; bottom: 20px; z-index: 2147483647; font: 13px system-ui,sans-serif; color: #f4f4f5; }
      button { border: 1px solid #3f3f46; border-radius: 10px; padding: 9px 13px; background: #18181b; color: #f4f4f5; cursor: pointer; box-shadow: 0 12px 30px #0008; }
      button:hover { background: #27272a; } button[data-on=true] { border-color: #fb7185; } .status { margin-top: 6px; padding: 5px 9px; border-radius: 999px; background: #18181bcc; color: #a1a1aa; text-align: center; }
    </style><div class="wrap"><button data-toggle></button><div class="status" data-status></div></div>`;
    document.documentElement.appendChild(host);
    shadow.querySelector('[data-toggle]').addEventListener('click', toggle);
    refresh();
  }

  async function refresh() {
    const { [stateKey]: state } = await storage.get(stateKey);
    const button = shadow?.querySelector('[data-toggle]'); if (!button) return;
    button.dataset.on = String(Boolean(state?.isCompiling));
    button.textContent = state?.isCompiling ? 'Stop recording' : 'Start recording';
    shadow.querySelector('[data-status]').hidden = !state?.isCompiling;
  }

  async function toggle() {
    const { [stateKey]: state } = await storage.get(stateKey);
    if (state?.isCompiling) await storage.set({ [stateKey]: { isCompiling: false, sessionId: null } });
    else await storage.set({ [stateKey]: { isCompiling: true, sessionId: `${Date.now()}-${crypto.randomUUID()}` } });
    await refresh(); capture();
  }

  document.addEventListener('change', () => capture(), true);
  chrome.runtime.onMessage.addListener(message => { if (message?.type === 'CAPTURE_VISIBLE') capture(); });
  chrome.storage.onChanged.addListener(changes => { if (changes[stateKey]) refresh(); });
  const observer = new MutationObserver(() => { clearTimeout(observer.timer); observer.timer = setTimeout(() => { mount(); capture(); }, 400); });
  if (document.body) observer.observe(document.body, { childList: true, subtree: true });
  mount();
})();
