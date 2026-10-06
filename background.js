const stateKey = 'compilerState';

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(stateKey, ({ [stateKey]: state }) => {
    if (!state) chrome.storage.local.set({ [stateKey]: { isCompiling: false, sessionId: null } });
  });
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'OPEN_PANEL' && sender.tab?.windowId) {
    chrome.sidePanel.open({ windowId: sender.tab.windowId }).then(() => sendResponse({ ok: true }));
    return true;
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'run_compiler') return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  chrome.tabs.sendMessage(tab.id, { type: 'CAPTURE_VISIBLE' }).catch(() => {});
});
