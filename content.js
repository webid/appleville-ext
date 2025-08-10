(function () {
  const API_URL =
    "https://app.appleville.xyz/api/trpc/core.getState?batch=1&input=%7B%220%22%3A%7B%22json%22%3Anull%2C%22meta%22%3A%7B%22values%22%3A%5B%22undefined%22%5D%7D%7D%7D";

  // Safety mechanism to prevent excessive updates
  let lastUpdateTime = 0;
  const MIN_UPDATE_INTERVAL = 1000; // Minimum 1 second between updates

  // Store API data globally
  let apiData = null;

  function formatKeyName(key) {
    if (!key) return "";
    return key
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

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
        const labelsContainer = button.parentElement?.querySelector(
          `.plot-labels-${index}`
        );
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
          if (modifierLabel && plot.modifier?.endsAt && plot.modifier?.key) {
            const modifierTime = calculateTimeRemaining(plot.modifier.endsAt);
            if (modifierTime) {
              modifierLabel.textContent = `${formatKeyName(
                plot.modifier.key
              )}\n${modifierTime}`;
            } else {
              modifierLabel.remove(); // Remove if expired
            }
          }

          // Update seed label
          const seedLabel = labelsContainer.querySelector(".seed-label");
          if (seedLabel && plot.seed?.endsAt && plot.seed?.key) {
            const seedTime = calculateTimeRemaining(plot.seed.endsAt);
            if (seedTime) {
              seedLabel.textContent = `${formatKeyName(
                plot.seed.key
              )}\n${seedTime}`;
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
        // Remove any existing labels below this button
        const existingLabels = button.parentElement?.querySelector(
          `.plot-labels-${index}`
        );
        if (existingLabels) {
          existingLabels.remove();
        }

        // Get plot data from API
        let modifierTime = null;
        let seedTime = null;
        let modifierKey = null;
        let seedKey = null;

        if (
          apiData &&
          apiData[0]?.result?.data?.json?.plots &&
          apiData[0].result.data.json.plots[index]
        ) {
          const plot = apiData[0].result.data.json.plots[index];

          if (plot.modifier?.endsAt) {
            modifierTime = calculateTimeRemaining(plot.modifier.endsAt);
            modifierKey = plot.modifier.key;
          }

          if (plot.seed?.endsAt) {
            seedTime = calculateTimeRemaining(plot.seed.endsAt);
            seedKey = plot.seed.key;
          }
        }

        // Only create labels if we have data
        if (modifierTime || seedTime) {
          // Create labels container below the button
          const labelsContainer = document.createElement("div");
          labelsContainer.className = `plot-labels-${index}`;
          labelsContainer.style.marginTop = "4px";
          labelsContainer.style.display = "flex";
          labelsContainer.style.flexDirection = "column";
          labelsContainer.style.gap = "2px";
          labelsContainer.style.alignItems = "center";
          labelsContainer.style.fontSize = "10px";
          labelsContainer.style.fontFamily =
            "monospace, 'Courier New', monospace";
          labelsContainer.style.fontWeight = "bold";
          labelsContainer.style.width = "120px"; // Match button width

          // Add modifier label if available
          if (modifierTime && modifierKey) {
            const modifierLabel = document.createElement("div");
            modifierLabel.className = "time-label modifier-label";
            modifierLabel.textContent = `${formatKeyName(
              modifierKey
            )}\n${modifierTime}`;
            modifierLabel.style.padding = "4px 6px";
            modifierLabel.style.background = "rgba(255, 193, 7, 0.9)"; // Yellow/amber background for booster
            modifierLabel.style.color = "#000";
            modifierLabel.style.borderRadius = "3px";
            modifierLabel.style.border = "1px solid #ffc107";
            modifierLabel.style.textAlign = "center";
            modifierLabel.style.letterSpacing = "0.3px";
            modifierLabel.style.width = "100%";
            modifierLabel.style.whiteSpace = "pre-line";
            modifierLabel.style.fontSize = "9px";
            modifierLabel.style.lineHeight = "1.2";
            labelsContainer.appendChild(modifierLabel);
          }

          // Add seed label if available
          if (seedTime && seedKey) {
            const seedLabel = document.createElement("div");
            seedLabel.className = "time-label seed-label";
            seedLabel.textContent = `${formatKeyName(seedKey)}\n${seedTime}`;
            seedLabel.style.padding = "4px 6px";
            seedLabel.style.background = "rgba(76, 175, 80, 0.9)"; // Green background for seed
            seedLabel.style.color = "#fff";
            seedLabel.style.borderRadius = "3px";
            seedLabel.style.border = "1px solid #4caf50";
            seedLabel.style.textAlign = "center";
            seedLabel.style.letterSpacing = "0.3px";
            seedLabel.style.width = "100%";
            seedLabel.style.whiteSpace = "pre-line";
            seedLabel.style.fontSize = "9px";
            seedLabel.style.lineHeight = "1.2";
            labelsContainer.appendChild(seedLabel);
          }

          // Insert the labels container after the button in the flex container
          button.parentElement?.insertBefore(
            labelsContainer,
            button.nextSibling
          );
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
        .querySelectorAll('[class^="plot-labels-"]')
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
