let color = "green";

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({ color });
  console.log("YT comment color set to %cgreen", `color: ${color}`);
});

const testScript = () => {
  // Object.keys(window).forEach((key) => {
  //   console.log(key)
  //   if (/^on/.test(key)) {
  //     window.addEventListener('animationiteration', (event) => {
  //       console.log('The event we want')
  //       // console.log('path',event.path)
  //       console.log('e',event);
  //     });
  //     // window.addEventListener(key.slice(2), (event) => {
  //     //   console.log(event);
  //     // });
  //   }
  // });

  const body = document.querySelector("body");
  console.log(body);
  const commentsEl = body.querySelector("#comments");
  // commentsEl.addEventListener("change", (event) => {
  //   console.log("comment contents", event);
  // });
  console.log(commentsEl);

  const obs = (muts) => {
    console.log("MUTATION HAPPENED");
    console.log('Mutations', muts);

    for (const m of muts) {
      for (const n of m.addedNodes) {
        console.log("Sub node", n.id);
        console.log("Sub node", n);
        if (n.id === "sections") {
          const node = n.querySelector("#contents");
          console.log("Sections node", node);
          console.log("Sections node", node.childNodes);
          const testObs = (muts) => {
            console.log('Mutations on section node', muts);
          };

          // MAKE OBSERVER THAT CALLS FILTER FUNCTION

          const o2 = new MutationObserver(testObs);
          o2.observe(node, { childList: true });
          break;
        }
      }
    }
  };

  const observer = new MutationObserver(obs);
  observer.observe(commentsEl, { childList: true });
};

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  console.log(tabId);
  console.log(changeInfo);
  console.log(tab);
  console.log(tab.url);

  if (changeInfo.status == "complete") {
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
      console.log(tabs);
      let url = tabs[0].url;
      console.log("UUURURURUUR", url);

      if (url && url.includes("youtube.com/watch")) {
        console.log("Add listener for comments", tabs[0].id);

        // UNCOMMENT TO CALL EXTRACTION SCRIPT WHEN HITTING YOUTUBE WATCH PAGE
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          function: testScript,
        });
      }

      // use `url` here inside the callback because it's asynchronous!
    });
  }
});
