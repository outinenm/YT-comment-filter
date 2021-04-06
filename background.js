let color = "green";

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({ color });
  debugPrint("YT comment color set to %cgreen", `color: ${color}`);
});

const contentScript = () => {
  const DEBUG = false;
  const debugPrint = (...values) => {
    if (DEBUG) {
      debugPrint(...values);
    }
  };
  const startFiltering = (elementForAttach) => {
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

    const APICall = (data) => {
      const requestOptions = {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      };

      return fetch(API_URL, requestOptions)
        .then((response) => response.json())
        .catch((err) => {
          debugPrint("ERROR", err);
          const allFalse = data.map((element) => {
            return false;
          });
          return { label: allFalse };
        });
    };

    const getLabelsForComments = (comments) => {
      debugPrint("FETCHING LABELS");

      const commentStrings = comments.map((item) => {
        return item.data.content;
      });
      const contents = {content: commentStrings};

      const response = APICall(contents).then((data) => {
        const zipped = [];
        for (let i=0; i < comments.length; i++) {
          zipped[i] = {...comments[i], label: data.label[i]};
        }
        return zipped;
      });
      return response;
    };

    // REWRITE WITH CSS AND className setting
    const createCoverNode = (comment) => {
      const coverNode = document.createElement("div");
      const coverNodeStyle = {
        position: "absolute",
        fontSize: "35px",
        zIndex: "1000",
        width: "100%",
        height: "100%",
        textAlign: "center",
        backgroundColor: "#ff4d4d",
        color: "#ffff66",
      }
      Object.assign(coverNode.style, coverNodeStyle);
      const text = document.createTextNode("SPAM");
      coverNode.appendChild(text);

      const showHiddenButton = document.createElement("BUTTON");
      showHiddenButton.innerHTML = "Show hidden comment";
      const buttonStyle = {
        margin: "30px",
        lineHeight: "45px",
        fontWeight: "bold",
        padding: "0 30px",
        background: "lightsalmon",
        border: "1px solid gray",
        borderRadius: "2px"
      }
      Object.assign(showHiddenButton.style, buttonStyle);

      showHiddenButton.addEventListener("click", () => {
        const hiddenComment = document.createElement("SPAN");
        hiddenComment.innerHTML = comment.data.content;
        const commentStyle = {
          fontWeight: "normal",
          color: "white",
          fontSize: "15px",
          display: "block"
        }
        
        Object.assign(hiddenComment.style, commentStyle)
        coverNode.appendChild(hiddenComment);
        showHiddenButton.style.display = "none";
      });

      coverNode.appendChild(showHiddenButton);
      return coverNode;
    };

    const hideComments = (comments) => {
      debugPrint("HIDING COMMENTS", comments);

      for (const comment of comments) {
        if (comment.label) {
          comment.element.style.position = "relative";
          const coverNode = createCoverNode(comment);
          comment.element.prepend(coverNode);
        }
      }
    };

    let COMMENT_STATE = [];

    const processComments = async (commentElements) => {
      const extractedComments = extractCommentData(commentElements);
      const commentsWithLabels = await getLabelsForComments(extractedComments);
      hideComments(commentsWithLabels);
    };

    const parseNewCommentMutations = async (mutations) => {
      // debugPrint("Mutations on section node", mutations);

      for (const mutation of mutations) {
        const nodes = Array.from(mutation.addedNodes);
        COMMENT_STATE.push(...nodes);
      }

      if (COMMENT_STATE.length > 5) {
        const commentBatch = [...COMMENT_STATE];
        COMMENT_STATE = [];
        processComments(commentBatch);
      }
    };

    const attachObservers = (commentSectionParent) => {
      const observeCommentSectionParent = (mutations) => {
        // debugPrint("MUTATION HAPPENED");
        // debugPrint("Mutations", mutations);

        for (const mutationRecord of mutations) {
          for (const addedNode of mutationRecord.addedNodes) {
            if (addedNode.id === "sections") {
              const commentSectionElement = addedNode.querySelector(
                "#contents"
              );

              debugPrint("ATTACHING WAIT OBSERVER");

              const observer = new MutationObserver(parseNewCommentMutations);
              observer.observe(commentSectionElement, { childList: true });
              break;
            }
          }
        }
      };

      // CHECK FOR EXISTENCE OF COMMENT SECTION
      const contentsElement = commentSectionParent.querySelector("#contents");

      if (contentsElement) {
        const commentRenderers = contentsElement.querySelectorAll(
          "ytd-comment-thread-renderer"
        );

        if (commentRenderers && commentRenderers.length > 0) {
          debugPrint("WE ALREADY HAVE COMMENTS");
          const commentBatch = Array.from(commentRenderers);
          processComments(commentBatch);
        }

        debugPrint("ATTACHING TO COMMENT CONTENTS WITHOUT WAITING");
        const observer = new MutationObserver(parseNewCommentMutations);
        observer.observe(contentsElement, { childList: true });
      } else {
        // COMMENT SECTION NOT YET LOADED
        const observer = new MutationObserver(observeCommentSectionParent);
        observer.observe(commentSectionParent, { childList: true });
      }
    };

    // START OF FILTERING SCRIPT

    debugPrint("BEFORE ATTACH", elementForAttach);
    attachObservers(elementForAttach);
  };

  // START OF CONTENT SCRIPT EXECUTION

  const body = document.querySelector("body");

  const commentFetchInterval = setInterval(
    (() => {
      const commentsElement = body.querySelector("#comments");

      if (commentsElement) {
        debugPrint("ON EXISTANCE IN SET INTERVAL", commentsElement);
        startFiltering(commentsElement);
        clearInterval(commentFetchInterval);
      }
    }).bind(this),
    1000
  );
};

const DEBUG = false;
const debugPrint = (...values) => {
  if (DEBUG) {
    debugPrint(...values);
  }
};

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  debugPrint("TAB UPDATE");
  debugPrint("TAB", tabId);
  debugPrint("TAB", changeInfo);
  debugPrint("TAB", tab);
  debugPrint("TAB", tab.url);

  if (changeInfo.status == "complete") {
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
      let url = tabs[0].url;

      if (url && url.includes("youtube.com/watch")) {
        debugPrint("Add listener for comments", tabs[0].id);

        // UNCOMMENT TO CALL EXTRACTION SCRIPT WHEN HITTING YOUTUBE WATCH PAGE
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          function: contentScript,
        });
      }
    });
  }
});
