/**
 Canvas Quiz Compiler - Content Script
 Manages the UI injection and data scraping logic.
 */

// --- STATE MANAGEMENT ---

// Helper to check the current recording state from storage
async function getCompilerState() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['isCompiling', 'currentSessionKey'], (res) => {
            resolve({
                isCompiling: res.isCompiling || false,
                currentSessionKey: res.currentSessionKey || null
            });
        });
    });
}

// --- UI INJECTION ---

async function injectRecordButton() {
    // Prevent duplicate buttons
    if (document.getElementById('canvas-compiler-btn')) return;

    // Target the Canvas quiz button bar
    const actionButtons = document.querySelector('.quiz-header, .header-bar-right, #quiz-controls, .header-bar-action-buttons');
    
    if (actionButtons) {
        const state = await getCompilerState();
        const compileBtn = document.createElement('button');
        compileBtn.id = 'canvas-compiler-btn';
        
        // Restore visual state from storage
        if (state.isCompiling) {
            compileBtn.innerHTML = '⏳ Compiling... (Click to Stop)';
            compileBtn.style.backgroundColor = '#ff9800'; 
            updateLiveIndicator(true); 
        } else {
            compileBtn.innerHTML = '🔴 Start Compiling';
            compileBtn.style.backgroundColor = ''; 
        }

        compileBtn.className = 'btn btn-primary'; 
        compileBtn.style.marginLeft = '10px';

        compileBtn.onclick = async (e) => {
            e.preventDefault();
            const currentState = await getCompilerState();

            if (!currentState.isCompiling) {
                // START SESSION
               const newKey = `${getPageTitle().replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;
            chrome.storage.local.set({ 
            isCompiling: true, 
            currentSessionKey: newKey 
                }, () => {
                    compileBtn.innerHTML = '⏳ Compiling... (Click to Save)';
                    compileBtn.style.backgroundColor = '#ff9800';
                    scrapeAndSave(); 
                });
            } else {
                // END SESSION
                chrome.storage.local.set({ 
                    isCompiling: false, 
                    currentSessionKey: null 
                }, () => {
                    compileBtn.innerHTML = '✅ Compiled!';
                    compileBtn.style.backgroundColor = '#4caf50'; 
                    updateLiveIndicator(false);
                    setTimeout(() => {
                        compileBtn.innerHTML = '🔴 Start Compiling';
                        compileBtn.style.backgroundColor = ''; 
                    }, 3000);
                });
            }
        };

        actionButtons.appendChild(compileBtn);
    }
}

function updateLiveIndicator(visible, count = 0) {
    let indicator = document.getElementById('compiler-live-status');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'compiler-live-status';
        indicator.style.cssText = `
            position: fixed; bottom: 20px; right: 20px; 
            padding: 10px 20px; background: #333; color: white; 
            border-radius: 50px; z-index: 9999; font-weight: bold;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3); pointer-events: none;
        `;
        document.body.appendChild(indicator);
    }
    indicator.style.display = visible ? 'block' : 'none';
    if (visible) indicator.innerHTML = `📡 Recording: ${count} Questions Saved`;
}

// --- SCRAPING LOGIC ---
function scrapeAndSave() {
    chrome.storage.local.get(['isCompiling', 'currentSessionKey', 'compiledQuizzes'], (res) => {
        if (!res.isCompiling || !res.currentSessionKey) return;

        let allQuizzes = res.compiledQuizzes || {};
        let currentQuizData = allQuizzes[res.currentSessionKey] || {
            quizTitle: getPageTitle(),
            course: document.title.split('-')[0].trim(),
            timestamp: Date.now(),
            questions: []
        };

        // 1. Create a Map of existing questions to prevent duplicates
        const questionsMap = new Map();
        currentQuizData.questions.forEach(q => {
            if (q.questionText) questionsMap.set(q.questionText, q);
        });

        // 2. Find currently visible questions
        const questionNodes = document.querySelectorAll('.question');
        
        // FIX: If we are on a blank loading screen, don't update anything!
        if (questionNodes.length === 0) {
            updateLiveIndicator(true, questionsMap.size);
            return; 
        }

        let addedNew = false;
        questionNodes.forEach((node) => {
            const textNode = node.querySelector('.question_text');
            if (!textNode || textNode.innerText.trim() === "") return;

            const questionText = textNode.innerText.trim();
            let userAnswer = "No answer";

            // Scrape the answer text logic
            const selectedRadio = node.querySelector('input:checked');
            if (selectedRadio) {
                let label = node.querySelector(`label[for="${selectedRadio.id}"]`) || selectedRadio.closest('label');
                if (!label || label.innerText.trim() === "") {
                    const row = selectedRadio.closest('.answer, .answer_label, .rc-Option');
                    userAnswer = row ? row.innerText.trim() : "Choice selected";
                } else {
                    userAnswer = label.innerText.trim();
                }
                userAnswer = userAnswer.replace(/^[a-z]\)\s*/i, '').replace(/\s+/g, ' ').trim();
            }

            const textInput = node.querySelector('input[type="text"], textarea');
            if (textInput && textInput.value.trim() !== "") {
                userAnswer = textInput.value.trim();
            }

            // 3. Only update if the answer actually changed or it's a new question
            if (!questionsMap.has(questionText) || questionsMap.get(questionText).userAnswer !== userAnswer) {
                questionsMap.set(questionText, {
                    questionText: questionText,
                    userAnswer: userAnswer
                });
                addedNew = true;
            }
        });

        // 4. Only save to storage if we actually found something new to avoid "tripling"
        if (addedNew) {
            const finalQuestions = Array.from(questionsMap.values()).map((q, idx) => ({
                ...q,
                questionNumber: idx + 1 // Re-index correctly
            }));

            currentQuizData.questions = finalQuestions;
            allQuizzes[res.currentSessionKey] = currentQuizData;

            chrome.storage.local.set({ compiledQuizzes: allQuizzes }, () => {
                updateLiveIndicator(true, finalQuestions.length);
            });
        } else {
            // Just update the indicator with the current count
            updateLiveIndicator(true, questionsMap.size);
        }
    });
}
// --- HELPERS & INITIALIZATION ---

function getPageTitle() {
    const titleNode = document.querySelector('.quiz-title, #quiz_title, h1');
    return titleNode ? titleNode.innerText.trim() : "Untitled Quiz";
}

// Listen for Alt+R command
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "compile_quiz_data") {
        scrapeAndSave();
        sendResponse({ status: "compiled" });
    }
});

// Detect answer changes for live overwriting
document.addEventListener('change', () => {
    chrome.storage.local.get('isCompiling', (res) => {
        if (res.isCompiling) scrapeAndSave();
    });
});

// --- INITIALIZATION AND LISTENERS ---

let debounceTimer;


const compilerObserver = new MutationObserver(() => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        injectRecordButton();
        // Check if we should auto-scrape after a page change
        chrome.storage.local.get('isCompiling', (res) => {
            if (res.isCompiling) scrapeAndSave();
        });
    }, 500); // 500ms delay to let Canvas finish loading questions
});

compilerObserver.observe(document.body, { childList: true, subtree: true });


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "compile_quiz_data") {
        scrapeAndSave();
        sendResponse({ status: "compiled" });
    }
});
injectRecordButton();
