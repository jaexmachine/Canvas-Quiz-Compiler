(() => {
  const hostId = 'canvas-quiz-compiler-host';
  const stateKey = 'compilerState';

  const storage = {
    get: (keys) => new Promise(resolve => chrome.storage.local.get(keys, resolve)),
    set: (value) => new Promise(resolve => chrome.storage.local.set(value, resolve))
  };

  const clean = (value) => (value || '').replace(/\s+/g, ' ').trim();
  const normalize = (value) => clean(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ');
  const title = () => clean(document.querySelector('.quiz-title, #quiz_title, h1')?.innerText) || document.title.split('|')[0].trim() || 'Untitled quiz';
  const answerText = (node, input) => {
    const label = input.id ? node.querySelector(`label[for="${CSS.escape(input.id)}"]`) : input.closest('label');
    return clean(label?.innerText || input.closest('.answer, .answer_label, .rc-Option')?.innerText || input.value || 'Selected');
  };

  const choiceContext = (element, questionNode) => {
    const parts = [];
    let current = element;
    while (current && current !== questionNode) {
      parts.push(`${current.className || ''} ${current.getAttribute?.('aria-label') || ''} ${current.getAttribute?.('title') || ''}`);
      current = current.parentElement;
    }
    parts.push(...[...element.querySelectorAll('*')].map(child => `${child.className || ''} ${child.getAttribute?.('aria-label') || ''} ${child.getAttribute?.('title') || ''}`));
    return parts.join(' ').toLowerCase();
  };

  function readChoices(node) {
    const selector = '.answer, .answer_label, .answer_row, [role="option"], label, button';
    const seen = new Set();
    return [...node.querySelectorAll(selector)].filter(element => {
      if (element.querySelector(selector)) return false;
      const text = clean(element.innerText);
      if (!text || text.length > 300) return false;
      if (element.matches('button') && /^(next|previous|back|submit|save|continue|close)$/i.test(text)) return false;
      const normalized = normalize(text);
      if (seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    }).map(element => {
      const context = choiceContext(element, node);
      const correct = /\b(correct|correct_answer|answer_correct|right_answer|correct-answer)\b/.test(context) && !/\b(incorrect|wrong|error)\b/.test(context);
      const selected = Boolean(element.querySelector('input:checked')) || /\b(selected|user_answer|answer_selected|incorrect|wrong)\b/.test(context) || element.matches('button');
      return { text: clean(element.innerText), correct, selected };
    });
  }

  function readQuestions() {
    return [...document.querySelectorAll('.question')].map((node, index) => {
      const questionText = clean(node.querySelector('.question_text, [data-testid="question-text"]')?.innerText);
      if (!questionText) return null;
      const choices = readChoices(node);
      const selectedInputs = [...node.querySelectorAll('input:checked')];
      const fields = [...node.querySelectorAll('.answers input[type="text"], .answers textarea, .question_input input, .question_input textarea')];
      let answers = selectedInputs.map(input => answerText(node, input));
      if (!answers.length) answers = choices.filter(choice => choice.selected).map(choice => choice.text);
      let answer = answers.join('; ');
      let type = selectedInputs.some(input => input.type === 'checkbox') ? 'multiple_select' : selectedInputs.length ? 'multiple_choice' : 'short_answer';
      const values = fields.map(field => clean(field.value)).filter(Boolean);
      if (values.length) answer = values.join('; ');
      if (!answer) answer = 'No answer';
      return { id: normalize(questionText), questionText, userAnswer: answer, choices, questionType: type, questionNumber: index + 1 };
    }).filter(Boolean);
  }

  function previousQuestion(compiledQuizzes, questionText, currentId) {
    return Object.entries(compiledQuizzes)
      .filter(([id]) => id !== currentId)
      .sort(([, a], [, b]) => b.timestamp - a.timestamp)
      .flatMap(([, quiz]) => quiz.questions || [])
      .find(question => normalize(question.questionText) === normalize(questionText));
  }

  async function capture() {
    const { [stateKey]: state, compiledQuizzes = {} } = await storage.get([stateKey, 'compiledQuizzes']);
    if (!state?.isCompiling || !state.sessionId) return;
    const questions = readQuestions();
    if (!questions.length) return;
    const baseTitle = state.baseTitle || title();
    const attempt = state.attempt || 1;
    const existing = compiledQuizzes[state.sessionId] || {
      quizTitle: attempt > 1 ? `${baseTitle} — Attempt ${attempt}` : baseTitle,
      baseTitle,
      attempt,
      course: clean(document.title.split('-')[0]),
      timestamp: Date.now(),
      questions: []
    };
    const byId = new Map(existing.questions.map(question => [question.id || normalize(question.questionText), question]));
    questions.forEach(question => {
      const previous = previousQuestion(compiledQuizzes, question.questionText, state.sessionId);
      const current = byId.get(question.id);
      if (current && current.userAnswer === question.userAnswer) return;
      byId.set(question.id, {
        ...current,
        ...question,
        duplicateQuestion: Boolean(previous),
        answerChanged: Boolean(previous && previous.userAnswer !== question.userAnswer),
        previousAnswer: previous?.userAnswer || null
      });
    });
    existing.questions = [...byId.values()].map((question, index) => ({ ...question, questionNumber: index + 1 }));
    compiledQuizzes[state.sessionId] = existing;
    await storage.set({ compiledQuizzes });
    updateIndicator(existing.questions.length);
    checkForCompletion();
  }

  function quizFinished() {
    const pageText = clean(document.body?.innerText).toLowerCase();
    const terminalSelectors = '.quiz-submission, .quiz-submission-page, .submission-details, [data-testid="quiz-submission"], .quiz-results';
    return Boolean(document.querySelector(terminalSelectors)) || /quiz (has been )?submitted|submission (complete|successful)|you have completed this quiz/.test(pageText);
  }

  async function stopRecording() {
    const { [stateKey]: state } = await storage.get(stateKey);
    if (!state?.isCompiling) return;
    await storage.set({ [stateKey]: { isCompiling: false, sessionId: null, baseTitle: null, attempt: null } });
    if (shadow) {
      const button = shadow.querySelector('[data-toggle]');
      button.textContent = 'Recording saved';
      button.dataset.on = 'false';
    }
  }

  function checkForCompletion() {
    if (quizFinished()) stopRecording();
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
    else {
      const { compiledQuizzes = {} } = await storage.get('compiledQuizzes');
      const baseTitle = title();
      const attempts = Object.values(compiledQuizzes)
        .filter(quiz => (quiz.baseTitle || quiz.quizTitle?.replace(/ — Attempt \d+$/, '')) === baseTitle)
        .map(quiz => Number(quiz.attempt) || 1);
      const attempt = attempts.length ? Math.max(...attempts) + 1 : 1;
      await storage.set({ [stateKey]: { isCompiling: true, sessionId: `${Date.now()}-${crypto.randomUUID()}`, baseTitle, attempt } });
    }
    await refresh(); capture();
  }

  document.addEventListener('change', () => capture(), true);
  document.addEventListener('click', event => {
    const submit = event.target.closest?.('#submit_quiz, #quiz_submit, button[type="submit"], input[type="submit"]');
    if (submit) setTimeout(checkForCompletion, 1500);
  }, true);
  chrome.runtime.onMessage.addListener(message => { if (message?.type === 'CAPTURE_VISIBLE') capture(); });
  chrome.storage.onChanged.addListener(changes => { if (changes[stateKey]) refresh(); });
  const observer = new MutationObserver(() => { clearTimeout(observer.timer); observer.timer = setTimeout(() => { mount(); capture(); }, 400); });
  if (document.body) observer.observe(document.body, { childList: true, subtree: true });
  mount();
  setTimeout(checkForCompletion, 1000);
})();
