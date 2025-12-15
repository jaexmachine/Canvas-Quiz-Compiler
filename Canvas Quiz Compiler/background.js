// Listener for the Alt+R (or Option+R) command
chrome.commands.onCommand.addListener((command) => {
    if (command === "run_compiler") {
        console.log("Command received: run_compiler");
        
        // Find the active tab
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length === 0) return;
            
            const activeTab = tabs[0];
            // UPDATED: Now includes /assignments/ in the match
            const canvasUrlRegex = /^https:\/\/[^\/]+\.instructure\.com\/courses\/.*(\/quizzes\/|\/assignments\/).*/;

            // 1. Check if the active tab is a valid Canvas Quiz/Assignment page
            if (canvasUrlRegex.test(activeTab.url)) {
                // 2. Send a message to the content script in that tab
                chrome.tabs.sendMessage(activeTab.id, { action: "compile_quiz_data" }, (response) => {
                    if (chrome.runtime.lastError) {
                        // This handles the case where the content script hasn't loaded yet
                        console.warn("Could not send message. Content script might not be fully loaded on this page.", chrome.runtime.lastError.message);
                        // You could try injecting the script here, but we'll stick to messaging for now.
                    } else if (response && response.status === "compiled") {
                        console.log("Content script confirmed compilation.");
                    }
                });
            } else {
                console.log("Not on a valid Canvas quiz page. Cannot compile.");
            }
        });
    }
});