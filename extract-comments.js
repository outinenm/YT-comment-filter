// Remove
let changeColor = document.getElementById("changeColor");

chrome.storage.sync.get("color", ({ color }) => {
  changeColor.style.backgroundColor = color;
});

changeColor.addEventListener("click", async () => {
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: extractYoutubeComments,
  });
});

const extractYoutubeComments = () => {
  const commentsContainer = document.querySelector("#comments");
  const contents = commentsContainer.querySelector("#contents");
  const commentRenderers = contents.querySelectorAll("#comment");
  const commentEntries = Array.from(commentRenderers, (item) => {
    const mainWrapper = item.querySelector("#body > #main");
    const author = mainWrapper
      .querySelector("#author-text > span")
      .textContent.trim();
    const commentText = mainWrapper
      .querySelector("#content > #content-text")
      .textContent.trim();
    console.log(author);
    console.log(commentText);
    console.log(item);

    return { content: { author, commentText }, element: item };
  });
  
  console.log(commentEntries);

  chrome.storage.sync.get("commentCache", ({ commentCache }) => {
    chrome.storage.sync.set({ commentCache: [...commentCache, commentEntries] });
  });

};