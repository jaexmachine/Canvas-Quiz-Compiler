chrome.commands.onCommand.addListener((command) => {
    if (command === "run_compiler") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs[0]) return;

            // Simple check: Is it an Instructure/Canvas site?
            if (tabs[0].url.includes("instructure.com")) {
                chrome.tabs.sendMessage(tabs[0].id, { action: "compile_quiz_data" }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.error("Content script not ready or frame restricted.");
                    }
                });
            }
        });
    }
});