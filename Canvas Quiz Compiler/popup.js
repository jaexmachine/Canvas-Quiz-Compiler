// Function to display the list of quizzes
function displayQuizzes(quizzes) {
    const listContainer = document.getElementById('quiz-list');
    listContainer.innerHTML = ''; // Clear the 'Loading' message

    if (!quizzes || Object.keys(quizzes).length === 0) {
        listContainer.innerHTML = '<p>No quizzes have been compiled yet. Start a Canvas quiz and press Alt+R to compile!</p>';
        return;
    }

    const quizKeys = Object.keys(quizzes).sort((a, b) => quizzes[b].timestamp - quizzes[a].timestamp);
    
    quizKeys.forEach(key => {
        const quiz = quizzes[key];
        const date = new Date(quiz.timestamp).toLocaleDateString();
        const time = new Date(quiz.timestamp).toLocaleTimeString();

        const item = document.createElement('div');
        item.className = 'quiz-item';
        item.innerHTML = `
            <div class="quiz-info">
                <strong>${quiz.quizTitle}</strong>
                <span class="course-name">(${quiz.course || 'Unknown Course'})</span>
                <span class="date">${date} at ${time}</span>
            </div>
            <div class="quiz-actions">
                <button data-key="${key}" class="view-btn">View</button>
                <button data-key="${key}" class="download-btn">Download</button>
            </div>
        `;
        listContainer.appendChild(item);
    });
    
    // Show the "Download All" button if there are quizzes
    document.getElementById('download-all').style.display = 'block';

    // Attach event listeners for the new buttons
    document.querySelectorAll('.view-btn').forEach(button => {
        button.addEventListener('click', handleView);
    });
    document.querySelectorAll('.download-btn').forEach(button => {
        button.addEventListener('click', handleDownload);
    });
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
    // We will implement a proper view modal next
    alert(`Viewing quiz data for key: ${event.target.dataset.key}`);
}

function handleDownload(event) {
    // We will implement the file download utility next
    alert(`Preparing to download quiz: ${event.target.dataset.key}`);
}

function handleDownloadAll() {
    // We will implement the bulk file download utility next
    alert('Preparing to download all compiled quizzes.');
}

// Start the dashboard
document.addEventListener('DOMContentLoaded', initDashboard);