// Function to display the list of quizzes
function displayQuizzes(quizzes) {
    const listContainer = document.getElementById('quiz-list');
    listContainer.innerHTML = ''; 

    if (!quizzes || Object.keys(quizzes).length === 0) {
        listContainer.innerHTML = '<p>No quizzes have been compiled yet.</p>';
        document.getElementById('download-all').style.display = 'none'; // Hide if empty
        return;
    }

    const quizKeys = Object.keys(quizzes).sort((a, b) => quizzes[b].timestamp - quizzes[a].timestamp);
    
    quizKeys.forEach(key => {
        const quiz = quizzes[key];
        const item = document.createElement('div');
        item.className = 'quiz-item';
        item.innerHTML = `
            <div class="quiz-info">
                <strong>${quiz.quizTitle}</strong>
                <span class="date">${new Date(quiz.timestamp).toLocaleDateString()}</span>
            </div>
            <div class="quiz-actions">
                <button data-key="${key}" class="view-btn">View</button>
                <button data-key="${key}" class="download-btn">Get</button>
                <button data-key="${key}" class="delete-btn">🗑️</button>
            </div>
        `;
        listContainer.appendChild(item);
    });
    
    document.getElementById('download-all').style.display = 'block';

    // Re-attach all listeners
    document.querySelectorAll('.view-btn').forEach(btn => btn.addEventListener('click', handleView));
    document.querySelectorAll('.download-btn').forEach(btn => btn.addEventListener('click', handleDownload));
    document.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', handleDelete));
}

// Function to initialize the dashboard
function initDashboard() {
    // Note: The 'storage' permission must be in manifest.json for this to work
    chrome.storage.local.get('compiledQuizzes', (result) => {
        displayQuizzes(result.compiledQuizzes);
    });

    document.getElementById('download-all').addEventListener('click', handleDownloadAll);
}

// Placeholder functions for the next stage
function handleView(event) {
    const key = event.target.dataset.key;
    chrome.storage.local.get('compiledQuizzes', (result) => {
        const quiz = result.compiledQuizzes[key];
        if (!quiz) return;

        // Hide list, show detail
        document.getElementById('main-view').style.display = 'none';
        document.getElementById('detail-view').style.display = 'block';

        // Populate detail
        document.getElementById('detail-title').textContent = quiz.quizTitle;
        const contentDiv = document.getElementById('detail-content');
        contentDiv.innerHTML = quiz.questions.map(q => `
            <div class="question-block" style="margin-bottom: 15px; border-bottom: 1px solid #eee;">
                <p><strong>Q${q.questionNumber}:</strong> ${q.questionText}</p>
                <p style="color: green;"><strong>Answer:</strong> ${q.userAnswer}</p>
            </div>
        `).join('');
    });
}

// Add logic for the Back button
document.getElementById('back-btn').addEventListener('click', () => {
    document.getElementById('main-view').style.display = 'block';
    document.getElementById('detail-view').style.display = 'none';
});

// Helper to format quiz data into a readable string
function formatQuizAsText(quiz) {
    let text = `QUIZ: ${quiz.quizTitle}\n`;
    text += `COURSE: ${quiz.course}\n`;
    text += `DATE: ${new Date(quiz.timestamp).toLocaleString()}\n`;
    text += `------------------------------------------\n\n`;

    quiz.questions.forEach(q => {
        text += `Q${q.questionNumber}: ${q.questionText}\n`;
        text += `ANSWER: ${q.userAnswer}\n\n`;
    });

    return text;
}

// Function to trigger the actual file download
function downloadFile(filename, content) {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url); // Clean up memory
}

function handleDownload(event) {
    const key = event.target.dataset.key;
    chrome.storage.local.get('compiledQuizzes', (result) => {
        const quiz = result.compiledQuizzes[key];
        if (!quiz) return;

        const content = formatQuizAsText(quiz);
        const filename = `${quiz.quizTitle.replace(/\s+/g, '_')}.txt`;
        downloadFile(filename, content);
    });
}

function handleDownloadAll() {
    chrome.storage.local.get('compiledQuizzes', (result) => {
        const quizzes = result.compiledQuizzes;
        if (!quizzes) return;

        let allContent = "=== ALL COMPILED QUIZZES ===\n\n";
        Object.values(quizzes)
            .sort((a, b) => b.timestamp - a.timestamp)
            .forEach(quiz => {
                allContent += formatQuizAsText(quiz) + "\n\n==============================\n\n";
            });

        downloadFile("All_Quizzes_Export.txt", allContent);
    });
}
function handleDelete(event) {
    const key = event.target.dataset.key;
    
    // Safety confirmation
    if (confirm("Are you sure you want to delete this quiz record?")) {
        chrome.storage.local.get('compiledQuizzes', (result) => {
            let allQuizzes = result.compiledQuizzes || {};
            
            // Remove the specific entry
            delete allQuizzes[key];
            
            // Save back to storage and refresh UI
            chrome.storage.local.set({ compiledQuizzes: allQuizzes }, () => {
                displayQuizzes(allQuizzes);
            });
        });
    }
}

// Start the dashboard
document.addEventListener('DOMContentLoaded', initDashboard);