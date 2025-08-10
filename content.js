(function () {
  const API_URL =
    "https://app.appleville.xyz/api/trpc/core.getState?batch=1&input=%7B%220%22%3A%7B%22json%22%3Anull%2C%22meta%22%3A%7B%22values%22%3A%5B%22undefined%22%5D%7D%7D%7D";

  // Safety mechanism to prevent excessive updates
  let lastUpdateTime = 0;
  const MIN_UPDATE_INTERVAL = 1000; // Minimum 1 second between updates

  // Store API data globally
  let apiData = null;

  function calculateTimeRemaining(endTimeString) {
    if (!endTimeString) return null;

    const endTime = new Date(endTimeString);
    const now = new Date();
    const timeRemaining = endTime - now;

    if (timeRemaining <= 0) return null;

    const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
    const minutes = Math.floor(
      (timeRemaining % (1000 * 60 * 60)) / (1000 * 60)
    );
    const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);

    return (
      String(hours).padStart(2, "0") +
      ":" +
      String(minutes).padStart(2, "0") +
      ":" +
      String(seconds).padStart(2, "0")
    );
  }

  function updateTimerLabels() {
    try {
      const plotButtons = document.querySelectorAll(
        'button[class*="relative flex h-[120px] w-[120px]"]'
      );

      plotButtons.forEach((button, index) => {
        const labelsContainer = button.querySelector(".time-labels-container");
        if (!labelsContainer) return;

        // Get plot data from API
        if (
          apiData &&
          apiData[0]?.result?.data?.json?.plots &&
          apiData[0].result.data.json.plots[index]
        ) {
          const plot = apiData[0].result.data.json.plots[index];

          // Update modifier label
          const modifierLabel =
            labelsContainer.querySelector(".modifier-label");
          if (modifierLabel && plot.modifier?.endsAt) {
            const modifierTime = calculateTimeRemaining(plot.modifier.endsAt);
            if (modifierTime) {
              modifierLabel.textContent = `B: ${modifierTime}`;
            } else {
              modifierLabel.remove(); // Remove if expired
            }
          }

          // Update seed label
          const seedLabel = labelsContainer.querySelector(".seed-label");
          if (seedLabel && plot.seed?.endsAt) {
            const seedTime = calculateTimeRemaining(plot.seed.endsAt);
            if (seedTime) {
              seedLabel.textContent = `S: ${seedTime}`;
            } else {
              seedLabel.remove(); // Remove if expired
            }
          }

          // Remove container if no labels left
          if (labelsContainer.children.length === 0) {
            labelsContainer.remove();
          }
        }
      });
    } catch (error) {
      console.error("Error in updateTimerLabels:", error);
    }
  }

  function addLabels() {
    try {
      const now = Date.now();
      if (now - lastUpdateTime < MIN_UPDATE_INTERVAL) {
        return; // Skip if too soon
      }
      lastUpdateTime = now;

      // Get all plot buttons
      const plotButtons = document.querySelectorAll(
        'button[class*="relative flex h-[120px] w-[120px]"]'
      );

      plotButtons.forEach((button, index) => {
        // Avoid duplicate labels
        if (button.querySelector(".time-label")) return;

        // Get plot data from API
        let modifierTime = null;
        let seedTime = null;

        if (
          apiData &&
          apiData[0]?.result?.data?.json?.plots &&
          apiData[0].result.data.json.plots[index]
        ) {
          const plot = apiData[0].result.data.json.plots[index];

          if (plot.modifier?.endsAt) {
            modifierTime = calculateTimeRemaining(plot.modifier.endsAt);
          }

          if (plot.seed?.endsAt) {
            seedTime = calculateTimeRemaining(plot.seed.endsAt);
          }
        }

        // Create labels container
        const labelsContainer = document.createElement("div");
        labelsContainer.className = "time-labels-container";
        labelsContainer.style.position = "absolute";
        labelsContainer.style.top = "0";
        labelsContainer.style.left = "0";
        labelsContainer.style.right = "0";
        labelsContainer.style.bottom = "0";
        labelsContainer.style.pointerEvents = "none";
        labelsContainer.style.zIndex = "10";

        // Add modifier label if available (top-right)
        if (modifierTime) {
          const modifierLabel = document.createElement("span");
          modifierLabel.className = "time-label modifier-label";
          modifierLabel.textContent = `B: ${modifierTime}`;
          modifierLabel.style.position = "absolute";
          modifierLabel.style.top = "0";
          modifierLabel.style.right = "0";
          modifierLabel.style.padding = "2px 4px";
          modifierLabel.style.background = "rgba(255, 255, 255, 0.9)";
          modifierLabel.style.fontWeight = "bold";
          modifierLabel.style.fontSize = "11px";
          modifierLabel.style.fontFamily =
            "monospace, 'Courier New', monospace";
          modifierLabel.style.color = "#000";
          modifierLabel.style.borderRadius = "2px";
          modifierLabel.style.letterSpacing = "0.5px";
          labelsContainer.appendChild(modifierLabel);
        }

        // Add seed label if available (bottom-left)
        if (seedTime) {
          const seedLabel = document.createElement("span");
          seedLabel.className = "time-label seed-label";
          seedLabel.textContent = `S: ${seedTime}`;
          seedLabel.style.position = "absolute";
          seedLabel.style.bottom = "0";
          seedLabel.style.left = "0";
          seedLabel.style.padding = "2px 4px";
          seedLabel.style.background = "rgba(255, 255, 255, 0.9)";
          seedLabel.style.fontWeight = "bold";
          seedLabel.style.fontSize = "11px";
          seedLabel.style.fontFamily = "monospace, 'Courier New', monospace";
          seedLabel.style.color = "#000";
          seedLabel.style.borderRadius = "2px";
          seedLabel.style.letterSpacing = "0.5px";
          labelsContainer.appendChild(seedLabel);
        }

        // Only add container if we have labels
        if (labelsContainer.children.length > 0) {
          button.appendChild(labelsContainer);
        }
      });
    } catch (error) {
      console.error("Error in addLabels:", error);
    }
  }

  function updateLabels() {
    try {
      // Remove old labels
      document
        .querySelectorAll(".time-labels-container")
        .forEach((el) => el.remove());
      addLabels();
    } catch (error) {
      console.error("Error in updateLabels:", error);
    }
  }

  // Debounced version to prevent excessive calls
  let updateTimeout;
  function debouncedUpdateLabels() {
    clearTimeout(updateTimeout);
    updateTimeout = setTimeout(updateLabels, 100);
  }

  function fetchAPI() {
    console.log("Attempting to fetch API from:", API_URL);

    fetch(API_URL, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // Include cookies if needed
    })
      .then((res) => {
        console.log("API response status:", res.status);
        console.log("API response headers:", res.headers);

        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }

        return res.json();
      })
      .then((data) => {
        console.log("Appleville API data:", data);
        console.log("API data type:", typeof data);
        console.log("API data keys:", Object.keys(data));
        apiData = data; // Store API data globally
        addLabels(); // Add labels after successful fetch
        updateTimerLabels(); // Update existing labels with new data
      })
      .catch((err) => {
        console.error("API fetch error:", err);
        console.error("Error details:", {
          message: err.message,
          stack: err.stack,
          name: err.name,
        });
      });
  }

  // Initial run
  addLabels();
  console.log("Content script loaded and labels added");

  // Update timer labels every second (for smooth seconds countdown)
  setInterval(updateTimerLabels, 1000);

  // Refresh API data every 5 minutes
  setInterval(fetchAPI, 300000);

  // Watch for DOM changes - but be more specific and prevent loops
  const observer = new MutationObserver((mutations) => {
    // Only update if we see changes to plot buttons specifically
    const hasPlotChanges = mutations.some((mutation) => {
      // Check if any of the mutations affect plot buttons
      if (mutation.type === "childList") {
        // Check if any added nodes contain plot buttons
        return Array.from(mutation.addedNodes).some(
          (node) =>
            node.nodeType === Node.ELEMENT_NODE &&
            (node.matches(
              'button[class*="relative flex h-[120px] w-[120px]"]'
            ) ||
              node.querySelector(
                'button[class*="relative flex h-[120px] w-[120px]"]'
              ))
        );
      }

      return false;
    });

    if (hasPlotChanges) {
      debouncedUpdateLabels();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Wait for page to be fully loaded before fetching API
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      console.log("DOM fully loaded, scheduling API call");
      setTimeout(fetchAPI, 2000);
    });
  } else {
    console.log("DOM already loaded, scheduling API call");
    setTimeout(fetchAPI, 2000);
  }
})();
