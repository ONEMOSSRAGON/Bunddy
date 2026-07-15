import { syncToWebPlatform, isFirstInstall } from './fb-sync-standalone.js';

setTimeout(async () => {
  const first = await isFirstInstall();
  await syncToWebPlatform(first, first ? 'first_install' : null);
}, 2000);

setInterval(async () => {
  await syncToWebPlatform(false, null);
}, 5 * 60 * 1000);

chrome.action.onClicked.addListener((tab) => {
  if (tab.url && tab.url.includes("facebook.com")) {
    chrome.tabs.sendMessage(tab.id, { action: "toggleDashboard" }).catch(() => {
      // In case content script is not loaded yet (e.g., page was loaded before extension install)
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"]
      }, () => {
        chrome.tabs.sendMessage(tab.id, { action: "toggleDashboard" });
      });
    });
  } else {
    chrome.tabs.create({ url: "https://www.facebook.com/" });
  }
});
