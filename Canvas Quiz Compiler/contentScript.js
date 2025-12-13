// Function to extract the Quiz Title from the page
function getQuizTitle() {
    // Canvas typically puts the title in the main heading of the page
    const titleElement = document.querySelector('.quiz-title, h1.header-title, h2.title');
    // If we can't find a good title element, we can sometimes look in the breadcrumbs
    if (titleElement) {
        return titleElement.textContent.trim();
    }
    // Fallback: Check if the main h1 of the page contains the course name
    const h1Title = document.querySelector('h1.page-title');
    if (h1Title) {
        return h1Title.textContent.trim();
    }
    return 'Unnamed Quiz';
}

// Function to scrape a question and its selected answer
function scrapeQuestionData() {
    const quizTitle = getQuizTitle();
    const compiledData = [];
    
    // Select all question containers. '.question' or 'div[id^="question_"]' are common
    const questionContainers = document.querySelectorAll('.question, div[id^="question_"]');
    
    if (questionContainers.length === 0) {
        console.warn("Canvas Quiz Compiler: Could not find any question containers. Are you sure you are on a quiz page?");
        return;
    }
    
    questionContainers.forEach((container, index) => {
        let questionText = `Question ${index + 1}`;
        let selectedAnswer = 'No answer recorded';
        
        // 1. Get the Question Text
        // Look for common question text containers
        const textElement = container.querySelector('.question_text, .question_content, .question_holder');
        if (textElement) {
            // Use innerHTML to preserve formatting like lists, bolding, etc.
            questionText = textElement.innerHTML.trim();
        }
        
        // 2. Get the User's Selected Answer 
        // --- Multiple Choice / True-False (checked radio/checkbox) ---
        const checkedInput = container.querySelector('input:checked');
        if (checkedInput) {
            // The answer is often the text right next to the input, inside a label
            const label = checkedInput.closest('label');
            if (label) {
                 // Clean up the label text to get just the answer
                selectedAnswer = label.textContent.trim().replace(/\s+/g, ' '); 
            } else {
                selectedAnswer = checkedInput.value;
            }
        } 
        
        // --- Fill-in-the-Blank / Essay (text input/textarea) ---
        const textarea = container.querySelector('textarea, input[type="text"]');
        if (textarea && textarea.value.trim() !== "") {
            // Label the answer type
            selectedAnswer = `[TEXT/ESSAY]: ${textarea.value.trim()}`;
        }
        
        // Add the data for this question
        compiledData.push({
            questionNumber: index + 1,
            questionText: questionText,
            userAnswer: selectedAnswer
        });
    });

    // The data object to be saved
    const quizData = {
        quizTitle: quizTitle,
        course: document.title.split('-')[0].trim(), // Attempt to get course name from document title
        timestamp: Date.now(),
        questions: compiledData
    };

    // --- Save Data to Chrome Storage ---
    // Use the quizTitle and timestamp to create a unique key
    const uniqueKey = `${quizTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${quizData.timestamp}`;

    chrome.storage.local.get('compiledQuizzes', (result) => {
        // Get existing object or initialize a new one if it's the first save
        let allQuizzes = result.compiledQuizzes || {}; 

        // Add the new quiz data under the unique key
        allQuizzes[uniqueKey] = quizData;

        // Save the updated object back to storage
        chrome.storage.local.set({ compiledQuizzes: allQuizzes }, () => {
            if (chrome.runtime.lastError) {
                console.error("Error saving quiz data:", chrome.runtime.lastError);
            } else {
                console.log(`[Canvas Quiz Compiler] Successfully compiled and saved quiz: ${quizTitle} (Key: ${uniqueKey})`);
                // You could add a visual indicator here that the save was successful!
            }
        });
    });
}

// --- INITIALIZATION AND LISTENERS ---

// 1. Run the scrape once when the page loads (to capture initial state)
scrapeQuestionData();

// 2. Listen for a keypress to manually trigger compilation (useful for debugging)
document.addEventListener('keydown', (event) => {
    if (event.altKey && event.key === 'r') { // Press Alt+R to trigger a scrape
        console.log("[Canvas Quiz Compiler] Alt+R pressed. Attempting to scrape quiz data...");
        scrapeQuestionData();
    }
});

console.log("[Canvas Quiz Compiler] Content Script Loaded. Press Alt+R to manually compile data.");