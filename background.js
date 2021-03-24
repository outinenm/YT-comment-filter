let color = "green";

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({ color, commentCache: [] });
  console.log('YT comment color set to %cgreen', `color: ${color}`);
});