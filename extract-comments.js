const runFiltering = async () => {
  const apiCall = (item) => {
    // Insert fetch to backend here
    // const response = fetch('http...')

    // Pass data, not response back to caller
    return Promise.resolve({ label: "ham" });
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
            return { ...item, ...data };
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

  const hideComments = () => {
    console.log("HIDING COMMENTS");
    // Do some hiding business here
  };

  const comments = await extractYoutubeComments();
  console.log(comments);

  // GET LABELS FROM API
  const comments_with_labels = await getLabelsForComments(comments);
  console.log(comments_with_labels);

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
