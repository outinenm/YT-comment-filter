const contentScript = () => {
  const DEBUG = false;
  const debugPrint = (...values) => {
    if (DEBUG) {
      console.log(...values);
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
          const allFalse = data.content.map((_) => {
            return { label: false };
          });
          return { predictions: allFalse };
        });
    };

    const FEEDBACK_API_URL = "http://localhost:5000/feedback";

    const APIfeedback = (data) => {
      const requestOptions = {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      };

      return fetch(FEEDBACK_API_URL, requestOptions)
        .then((response) => response.json())
        .catch((err) => {
          debugPrint("ERROR", err);
        });
    };

    const getLabelsForComments = (comments) => {
      debugPrint("FETCHING LABELS");

      const commentStrings = comments.map((item) => {
        return item.data.content;
      });
      const contents = { content: commentStrings };

      const response = APICall(contents).then((data) => {
        debugPrint("API RESPONSE", data);
        const predictions = data && data.predictions;
        const zipped = [];
        for (let i = 0; i < comments.length; i++) {
          zipped[i] = { ...comments[i], ...predictions[i] };
        }
        return zipped;
      });
      return response;
    };

    const createFlexContainerWithChildren = (...children) => {
      const node = document.createElement("div");
      node.style.display = "flex";
      // node.style.flexDirection = 'row';
      node.style.justifyContent = "center";
      node.style.alignItems = "stretch";
      children.forEach((el) => {
        node.appendChild(el);
      });
      return node;
    };

    const createFlexContainer = (justify = "center", align = "center") => {
      const node = document.createElement("div");
      node.style.display = "flex";
      node.style.justifyContent = justify;
      node.style.alignItems = align;
      return node;
    };

    const createLabelingCover = (comment) => {
      const coverNode = document.createElement("div");
      const coverNodeStyle = {
        position: "absolute",
        display: "flex",
        zIndex: "1000",
        textAlign: "center",
        justifyContent: "flex-end",
        alignItems: "flex-end",
        backgroundColor: "transparent",
        right: "0",
        bottom: "0",
        width: "50%",
        height: "50%",
      };
      Object.assign(coverNode.style, coverNodeStyle);

      // Correct button
      const spamButton = document.createElement("button");
      spamButton.className = "activeLabelButton";
      const spamButtonStyle = {
        fontWeight: "bold",
        padding: "5px 30px",
        margin: "0 0 0 15px",
        borderRadius: "0px",
        border: "none",
      };
      Object.assign(spamButton.style, spamButtonStyle);
      spamButton.innerHTML = "SPAM";

      // Wrong button
      const hamButton = document.createElement("button");
      hamButton.className = "activeLabelButton";
      const hamButtonStyle = {
        fontWeight: "bold",
        padding: "5px 30px",
        margin: "0 0 0 15px",
        borderRadius: "0px",
        border: "none",
      };
      Object.assign(hamButton.style, hamButtonStyle);
      hamButton.innerHTML = "HAM";

      const container = createFlexContainerWithChildren(hamButton, spamButton);

      const disableButtons = () => {
        spamButton.disabled = true;
        spamButton.className = "disabledLabelButton";
        hamButton.disabled = true;
        hamButton.className = "disabledLabelButton";
      };

      spamButton.addEventListener("click", () => {
        const data = {
          items: [
            {
              content: comment,
              label: false, // default for unknown comment
              ground_truth: true, // true means SPAM
            },
          ],
        };
        void APIfeedback(data);
        spamButton.style.backgroundColor = "red";
        spamButton.style.color = "white";
        disableButtons();
      });

      hamButton.addEventListener("click", () => {
        const data = {
          items: [
            {
              content: comment,
              label: false, // default for unknown comment
              ground_truth: false, // true means SPAM
            },
          ],
        };
        void APIfeedback(data);
        hamButton.style.backgroundColor = "green";
        hamButton.style.color = "white";
        disableButtons();
      });

      coverNode.appendChild(container);
      return coverNode;
    };

    const createHidingCover = (comment, confidence, label = false) => {
      const coverNode = document.createElement("div");
      const coverNodeStyle = {
        position: "absolute",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontSize: "35px",
        zIndex: "1000",
        width: "100%",
        height: "100%",
        textAlign: "center",
        backgroundColor: "coral",
        color: "navy",
      };
      Object.assign(coverNode.style, coverNodeStyle);

      const text = document.createTextNode("SPAM");
      const conf_rounded =
        Math.round((Number(confidence) + Number.EPSILON) * 1000) / 1000;
      const confidenceText = document.createTextNode(
        `Confidence: ${conf_rounded}`
      );

      const showHiddenButton = document.createElement("button");
      showHiddenButton.innerHTML = "Show comment";
      showHiddenButton.className = "activeLabelButton";
      const buttonStyle = {
        fontWeight: "bold",
        padding: "5px 30px",
        margin: "0 0 0 15px",
        borderRadius: "0px",
        border: "none",
      };
      Object.assign(showHiddenButton.style, buttonStyle);

      // BUTTON TO CHANGE

      showHiddenButton.addEventListener("click", () => {
        coverNode.innerHTML = "";
        const coverNodeStyle = {
          justifyContent: "flex-end",
          alignItems: "flex-end",
          backgroundColor: "transparent",
          right: "0",
          bottom: "0",
          width: "50%",
          height: "50%",
        };
        Object.assign(coverNode.style, coverNodeStyle);

        // Correct button
        const spamButton = document.createElement("button");
        spamButton.className = "activeLabelButton";
        const spamButtonStyle = {
          fontWeight: "bold",
          padding: "5px 30px",
          margin: "0 0 0 15px",
          borderRadius: "0px",
          border: "none",
        };
        Object.assign(spamButton.style, spamButtonStyle);
        spamButton.innerHTML = "SPAM";

        // Wrong button
        const hamButton = document.createElement("button");
        hamButton.className = "activeLabelButton";
        const hamButtonStyle = {
          fontWeight: "bold",
          padding: "5px 30px",
          margin: "0 0 0 15px",
          borderRadius: "0px",
          border: "none",
        };
        Object.assign(hamButton.style, hamButtonStyle);
        hamButton.innerHTML = "HAM";

        const container = createFlexContainerWithChildren(
          hamButton,
          spamButton
        );

        const disableButtons = () => {
          hamButton.disabled = true;
          hamButton.className = "disabledLabelButton";
          spamButton.disabled = true;
          spamButton.className = "disabledLabelButton";
        };

        spamButton.addEventListener("click", () => {
          const data = {
            items: [
              {
                content: comment,
                label: true,
                ground_truth: true,
              },
            ],
          };
          void APIfeedback(data);
          // container.innerHTML = "";
          spamButton.style.backgroundColor = "red";
          spamButton.style.color = "white";
          disableButtons();
        });

        hamButton.addEventListener("click", () => {
          const data = {
            items: [
              {
                content: comment,
                label: true,
                ground_truth: false,
              },
            ],
          };
          void APIfeedback(data);
          // container.innerHTML = "";
          hamButton.style.backgroundColor = "green";
          hamButton.style.color = "white";
          disableButtons();
        });

        coverNode.appendChild(container);
      });

      const rowWrapper = createFlexContainer("space-between", "center");
      rowWrapper.style.width = "100%";
      rowWrapper.style.padding = "0 30px 0 30px";
      
      // WRAP TEXT IN CONTAINER
      const textWrapper = createFlexContainer("flex-start", "center");
      
      const spamText = document.createElement("span");
      spamText.style.marginRight = "30px";
      spamText.appendChild(text)

      textWrapper.appendChild(spamText);
      textWrapper.appendChild(confidenceText);

      // WRAP TEXT CONTENT AND BUTTON INTO ROW
      rowWrapper.appendChild(textWrapper);
      rowWrapper.appendChild(showHiddenButton);

      // const container2 = createFlexContainerWithChildren(
      //   text,
      //   showHiddenButton,
      //   confidenceText
      // );

      coverNode.appendChild(rowWrapper);
      return coverNode;
    };

    const hideComments = (comments) => {
      debugPrint("HIDING COMMENTS", comments);

      for (const comment of comments) {
        if (comment.label) {
          comment.element.style.position = "relative";
          const coverNode = createHidingCover(
            comment.data.content,
            comment.confidence,
            comment.label
          );
          comment.element.prepend(coverNode);
        }
      }
    };

    const addLabelingTool = (comments) => {
      debugPrint("ADDING LABELING TOOL", comments);

      for (const comment of comments) {
        comment.element.style.position = "relative";
        const coverNode = createLabelingCover(comment.data.content);
        comment.element.prepend(coverNode);
      }
    };

    let COMMENT_STATE = [];

    const LABELING_MODE_ON = false;

    const processComments = async (commentElements) => {
      const extractedComments = extractCommentData(commentElements);
      if (!LABELING_MODE_ON) {
        const commentsWithLabels = await getLabelsForComments(
          extractedComments
        );
        hideComments(commentsWithLabels);
      } else {
        addLabelingTool(extractedComments);
      }
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

      const css = ".activeLabelButton:hover{ background-color: gray }";
      const style = document.createElement("style");

      if (style.styleSheet) {
        style.styleSheet.cssText = css;
      } else {
        style.appendChild(document.createTextNode(css));
      }

      document.getElementsByTagName("head")[0].appendChild(style);
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
    console.log(...values);
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
