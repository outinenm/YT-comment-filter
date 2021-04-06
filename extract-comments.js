const runFiltering = async () => {
  const apiCall = (item) => {
    // Insert fetch to backend here
    // const response = fetch('http...')
    const apiUrl = "http://localhost:5000/detect";
    
    const request = fetch(apiUrl, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(item)
    })
    .then((response) => {
      return response.json
    });

    // Pass data, not response back to caller
    return Promise.resolve(request);
  };

  const extractYoutubeComments = () => {
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
    console.log("EXTRACTING COMMENTS");

    return new Promise((resolve, reject) => {
      try {
        const commentsContainer = document.querySelector("#comments");
        const contents = commentsContainer.querySelector("#contents");
        // const commentRenderers = contents.querySelectorAll("#comment");
        const commentRenderers = contents.querySelectorAll(
          "ytd-comment-thread-renderer"
        );
        const commentEntries = Array.from(commentRenderers, (renderer) => {
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
                  element: element
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
        });
        resolve(commentEntries);
      } catch (err) {
        reject(err);
      }
    });
  };

  const getLabelsForComments = (comments) => {
    console.log("FETCHING LABELS");

    return Promise.all(
      comments.map((item) => {
        const dataForAPI = { content: item.data.content };
        const response = apiCall(dataForAPI)
          .then((data) => {
            var test = Math.round(Math.random()) //FOR TESTING PURPOSES, randomizes spam/ham labels
            if (test == 1) {
              return { ...item, ...data };
            } else {
              return { ...item, label: "spam"}
            }
            //return { ...item, ...data };   //Original line of code
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

  const hideComments = (comments) => {
    console.log("HIDING COMMENTS");

    for (const [index, object] of Object.entries(comments)) {
      if (object.label == "spam") {

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
          hiddenComment.innerHTML = object.data.content;
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
        object.element.prepend(coverNode);
        object.element.style.position = "relative";

        //If we want to hide comments completely
        //object.element.style.display = 'none';
        console.log(object.element)
      }
    }

    // Do some hiding business here
  };

  const comments = await extractYoutubeComments();
  //console.log(comments);

  // GET LABELS FROM API
  const comments_with_labels = await getLabelsForComments(comments)
  
  //console.log(comments_with_labels);

  chrome.storage.local.set({ comments_with_labels }, (_) => {
    chrome.storage.local.get('comments_with_labels', (data) => console.log('datatatatat', data))
  })

  // HIDE
  hideComments(comments_with_labels);
};

let button = document.getElementById("filterComments");

button.addEventListener("click", async () => {
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: runFiltering,
  });
});
