let color = "green";

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({ color });
  console.log("YT comment color set to %cgreen", `color: ${color}`);
});

const testScript = () => {
  const startFiltering = (commentsEl) => {
    const extractCommentData = (commentRenderers) => {
      const getCommentData = (item) => {
        const mainWrapper = item.querySelector("#body > #main");
        const author = mainWrapper
          .querySelector("#author-text > span")
          .textContent.trim();
        const commentText = mainWrapper
          .querySelector("#content > #content-text")
          .textContent.trim();

        return { author: author, content: commentText };
      };

      const entryMapper = (renderer) => {
        // GET main comment in thread
        const comment = renderer.querySelector("#comment");
        const commentData = comment ? getCommentData(comment) : null;

        // GET replies
        const repliesWrapper = renderer.querySelector("#loaded-replies");
        let replies = null;

        if (repliesWrapper) {
          const replyElements = repliesWrapper.querySelectorAll(
            "ytd-comment-renderer"
          );
          replies =
            replyElements &&
            Array.from(replyElements, (element) => {
              const replyData = element ? getCommentData(element) : {};
              return {
                data: { ...replyData },
                element: element,
              };
            });
        }

        // DEBUG
        // console.log(author);
        // console.log(commentText);
        // console.log(item);

        return {
          data: {
            ...commentData,
            replies: replies,
          },
          element: renderer,
        };
      };

      const commentEntries = Array.from(commentRenderers, entryMapper);
      return commentEntries;
    };

    const API_URL = "http://localhost:5000/detect";

    const apiCall = (item) => {
      // Insert fetch to backend here
      // const response = fetch('http...')

      //console.log('ITEM:', item)

      return fetch(API_URL, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(item),
      }).then((response) => {
        return response.json()
      }).catch(err => {
        console.log('ERROR RESPONSE:', err)
        return { label: [false] }
      });

      // Pass data, not response back to caller
      return Promise.resolve({ label: "ham" });
    };

    const testMarkAll = false;

    const getLabelsForComments = (comments) => {
      console.log("FETCHING LABELS");

      return Promise.all(
        comments.map((item) => {
          const dataForAPI = { content: [item.data.content] };
          const response = apiCall(dataForAPI)
            .then((data) => {
              //FOR TESTING PURPOSES, randomizes spam/ham labels
              // var test = Math.round(Math.random());
              // if (test == 1 && !testMarkAll) {
              //   return { ...item, ...data };
              // } else {
              //   return { ...item, label: "spam" };
              // }
              const singletonLabel = { label: data.label[0] }
              return { ...item, ...singletonLabel };
            })
            .catch((err) => {
              console.log("LABEL DATA ERROR", err);
              return { ...item, label: "unknown" };
            });
          return response;
        })
      ).catch((err) => {
        console.log("Ooooh dammmmm", err);
      });
    };

    const createCoverNode = () => {
      const nodeStyleLarge = {
        position: "absolute",
        left: 0,
        top: 0,
        fontSize: "50px",
        zIndex: "1000",
        width: "100%",
        height: "100%",
        textAlign: "center",
        backgroundColor: "red",
        color: "navy",
      };

      const nodeStyleSmall = {
        position: "absolute",
        left: "50%",
        top: 0,
        fontSize: "18px",
        zIndex: "1000",
        width: "100px",
        height: "25px",
        textAlign: "center",
        backgroundColor: "red",
        color: "navy",
      };

      const setStyle = (node, newStyle) => {
        Object.assign(node.style, newStyle);
      }

      const toggleCover = (event) => {
        if (event.target.innerText === "SPAM") {
          setStyle(event.target, nodeStyleSmall);
          event.target.innerText = "Maximize";
        } else {
          setStyle(event.target, nodeStyleLarge);
          event.target.innerText = "SPAM";
        }
      }
      const coverNode = document.createElement("div");
      setStyle(coverNode, nodeStyleLarge);
      
      const text = document.createTextNode("SPAM");
      coverNode.appendChild(text);

      coverNode.addEventListener("click", toggleCover);
      return coverNode;
    }

    const hideComments = (comments) => {
      console.log("HIDING COMMENTS");

      for (const [index, object] of Object.entries(comments)) {
        if (object.label) {
          const coverNode = createCoverNode();
          object.element.prepend(coverNode);

          object.element.style.position = "relative";

          //If we want to hide comments completely
          //object.element.style.display = 'none';
        }
      }
    };

    let comments = [];

    const parseNewComment = async (mutations) => {
      // console.log("Mutations on section node", mutations);

      for (const mutation of mutations) {
        const nodes = Array.from(mutation.addedNodes);
        comments.push(...nodes);
      }

      if (comments.length > 5) {
        const commentBatch = [...comments];
        comments = [];
        const extractedComments = extractCommentData(commentBatch);

        // GET LABELS FROM API
        const comments_with_labels = await getLabelsForComments(
          extractedComments
        );

        // HIDE
        hideComments(comments_with_labels);
      }
    };

    const attachObservers = (commentsEl) => {
      const obs = (muts) => {
        // console.log("MUTATION HAPPENED");
        // console.log("Mutations", muts);

        for (const m of muts) {
          for (const n of m.addedNodes) {
            if (n.id === "sections") {
              const node = n.querySelector("#contents");

              console.log("ATTACHING WAIT OBSERVER");
              
              const o2 = new MutationObserver(parseNewComment);
              o2.observe(node, { childList: true });
              break;
            }
          }
        }
      };

      const contents = commentsEl.querySelector("#contents");

      if (contents) {
        const commentRenderers = contents.querySelectorAll(
          "ytd-comment-thread-renderer"
        );
        if (commentRenderers && commentRenderers.length > 0) {
          console.log("WE ALREADY HAVE COMMENTS");
          (async () => {
            const extractedComments = extractCommentData(
              Array.from(commentRenderers)
            );
            // GET LABELS FROM API
            const comments_with_labels = await getLabelsForComments(
              extractedComments
            );

            // HIDE
            hideComments(comments_with_labels);
          })();
        }
        console.log("ATTACHING TO COMMENT CONTENTS WITHOUT WAITING");
        const o3 = new MutationObserver(parseNewComment);
        o3.observe(contents, { childList: true });
      }

      const observer = new MutationObserver(obs);
      observer.observe(commentsEl, { childList: true });
    };

    console.log("BEFORE ATTACH", commentsEl);
    attachObservers(commentsEl);
  };

  const body = document.querySelector("body");

  const commentFetchInterval = setInterval(
    (() => {
      const commentsEl = body.querySelector("#comments");

      if (commentsEl) {
        console.log("ON EXISTANCE IN SET INTERVAL", commentsEl);
        startFiltering(commentsEl);
        clearInterval(commentFetchInterval);
      }
    }).bind(this),
    1000
  );
};

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  console.log(tabId);
  console.log(changeInfo);
  console.log(tab);
  console.log(tab.url);

  if (changeInfo.status == "complete") {
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
      let url = tabs[0].url;

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
