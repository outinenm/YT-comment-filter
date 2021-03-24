let color = "green";

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({ color });
  console.log('YT comment color set to %cgreen', `color: ${color}`);
});