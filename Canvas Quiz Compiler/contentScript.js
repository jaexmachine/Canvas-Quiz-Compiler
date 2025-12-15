// Function to extract the Page Title (Quiz or Assignment)
function getPageTitle() {
    // Look for the main title element, common to both quizzes and assignments
    const titleElement = document.querySelector('.quiz-title, .assignment-title, h1.header-title, h2.title, h1.page-title');
    if (titleElement) {
        return titleElement.textContent.trim();
    }
    // Fallback to the document title, stripping any Canvas-related suffix
    return document.title.split('-')[0].trim() || 'Unnamed Page';
}
            
// Function to scrape a question and its selected answer
function scrapeQuestionData() {
    const pageTitle = getPageTitle(); 
    const compiledData = [];
    
    // --- Scrape Inputs (for Assignments and Text Quizzes) ---
    // Look for main content area to focus the search
    const contentArea = document.querySelector('#content, .ic-Layout-content, .assignment-content');
    
    if (contentArea) {
        // Find all interactive input elements (text, textarea, or checked radio/checkbox)
        // :not([disabled]) ensures we are only looking at active inputs
        const inputs = contentArea.querySelectorAll('input[type="text"]:not([disabled]), textarea:not([disabled]), input:checked');
        
        if (inputs.length > 0) {
            inputs.forEach((input, index) => {
                let identifier = `Input ${index + 1}`;
                let value = input.value.trim() || 'No answer recorded';
                
                if (input.type === 'radio' || input.type === 'checkbox') {
                    // It's a choice input, try to get the label text
                    const label = input.closest('label');
                    // Clean up the label text to get just the answer
                    value = label ? label.textContent.trim().replace(/\s+/g, ' ') : input.value; 
                }
                
                // Try to find a nearby label or prompt to use as the identifier
                // Search up a few levels to find context from a parent container
                const container = input.closest('.question, .form-field, div') || contentArea;
                const nearbyLabel = container.querySelector('label, p, h3, .question_text');
                if (nearbyLabel) {
                    // Use a concise version of the nearby text as the identifier
                    identifier = nearbyLabel.textContent.trim().substring(0, 100).replace(/\s+/g, ' ') + '...'; 
                }
                
                compiledData.push({
                    questionNumber: index + 1,
                    questionText: identifier, // Use the identifier as 'question text'
                    userAnswer: value
                });
            });
        }
    }
    
    if (compiledData.length === 0) {
        console.warn(`Canvas Compiler: Could not find any input fields in the main content for ${pageTitle}.`);
    }

    // --- Data Object to be Saved ---
    const quizData = { 
        quizTitle: pageTitle,
        course: document.title.split('-')[0].trim(), 
        timestamp: Date.now(),
        // Fallback logic: if no specific inputs were found, save a snippet of the main content
        questions: compiledData.length > 0 ? compiledData : [{
            questionNumber: 1, 
            questionText: "Full Page Content", 
            userAnswer: contentArea ? contentArea.innerText.substring(0, 500) + "..." : "No compile data found. Try manually copying."
        }] 
    };

    // --- Save Data to Chrome Storage ---
    // Use pageTitle and timestamp to create a unique key
    const uniqueKey = `${pageTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${quizData.timestamp}`; 

    chrome.storage.local.get('compiledQuizzes', (result) => {
        // Get existing object or initialize a new one
        let allQuizzes = result.compiledQuizzes || {}; 

        // Add the new quiz data under the unique key
        allQuizzes[uniqueKey] = quizData;

        // Save the updated object back to storage
        chrome.storage.local.set({ compiledQuizzes: allQuizzes }, () => {
            if (chrome.runtime.lastError) {
                console.error("Error saving data:", chrome.runtime.lastError);
            } else {
                console.log(`[Canvas Quiz Compiler] Successfully compiled and saved: ${pageTitle} (Key: ${uniqueKey})`);
            }
        });
    });
}


// --- INITIALIZATION AND LISTENERS ---

// Listen for a message from the background script (triggered by the Alt+R command)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "compile_quiz_data") {
        console.log("[Canvas Quiz Compiler] Command received from background script. Compiling data...");
        scrapeQuestionData();
        sendResponse({ status: "compiled" });
    }
});

console.log("[Canvas Quiz Compiler] Content Script Loaded. Press Alt+R (Option+R) to compile data.");