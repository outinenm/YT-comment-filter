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
    chrome.storage.local.get("comments_with_labels", (data) =>
      console.log("datatatatat", data)
    );
  });

  // HIDE
  hideComments(comments_with_labels);
};

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
  
    // const options = {
    //   childList: true,
    //   // subtree: true,
    // },
  
    
    const obs = (muts) => {
      console.log("MUTATION HAPPENED");
      console.log(muts);
      
      for (const m of muts) {
        for (const n of m.addedNodes) {
          console.log(n.id);
          console.log(n);
          if (n.id === "sections") {
            const node = n.querySelector("#contents");
            console.log("Da shit:", node);
            console.log(node.childNodes)
            const testObs = (muts) => {
              console.log(muts)
            }
            
            // MAKE OBSERVER THAT CALLS FILTER FUNCTION
            
            const o2 = new MutationObserver(testObs);
            o2.observe(node, { childList: true });
          }
        }
      }
    };
  
    const observer = new MutationObserver(obs);
    observer.observe(commentsEl, { childList: true });
  };

testScript();