// LinguistAI - Background Service Worker

// Initialize default storage on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ extensionEnabled: true });
  chrome.storage.local.set({ totalCorrections: 0 });
});

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'incrementCorrections') {
    chrome.storage.local.get(['totalCorrections'], (result) => {
      const newTotal = (result.totalCorrections || 0) + 1;
      chrome.storage.local.set({ totalCorrections: newTotal });
      sendResponse({ success: true, total: newTotal });
    });
    return true; // Keep channel open for async response
  }
  if (request.action === 'getStats') {
    chrome.storage.local.get(['totalCorrections', 'extensionEnabled'], sendResponse);
    return true;
  }
});
