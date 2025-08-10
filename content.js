(function () {
  const API_URL =
    "https://app.appleville.xyz/api/trpc/core.getState?batch=1&input=%7B%220%22%3A%7B%22json%22%3Anull%2C%22meta%22%3A%7B%22values%22%3A%5B%22undefined%22%5D%7D%7D%7D";

  // Safety mechanism to prevent excessive updates
  let lastUpdateTime = 0;
  const MIN_UPDATE_INTERVAL = 1000; // Minimum 1 second between updates

  // Store API data globally
  let apiData = null;

  // Track which timers have already notified to prevent multiple beeps
  let notifiedTimers = new Set();

  function formatKeyName(key) {
    if (!key) return "";
    return key
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  function playNotificationSound() {
    try {
      // Create a simple beep sound using Web Audio API
      const audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(800, audioContext.currentTime); // 800Hz beep
      oscillator.type = "sine";

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime); // Volume
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioContext.currentTime + 0.5
      );

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);

      console.log("🔔 Timer notification sound played!");
    } catch (error) {
      console.error("Error playing notification sound:", error);
      // Fallback: try to play a simple beep using HTML5 audio
      try {
        const audio = new Audio(
          "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT"
        );
        audio.volume = 0.3;
        audio.play();
      } catch (fallbackError) {
        console.error("Fallback audio also failed:", fallbackError);
      }
    }
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

  function getTimerColors(timeRemaining, isBooster) {
    if (!timeRemaining) return { background: "", border: "", text: "" };

    // Parse time to get total minutes
    const [hours, minutes] = timeRemaining.split(":").map(Number);
    const totalMinutes = hours * 60 + minutes;

    if (isBooster) {
      if (totalMinutes < 30) {
        // Darker yellow/amber for urgent booster timers
        return {
          background: "rgba(255, 152, 0, 0.9)", // Dark orange
          border: "#ff9800",
          text: "#000",
        };
      } else {
        // Normal yellow for booster timers
        return {
          background: "rgba(255, 193, 7, 0.9)", // Yellow/amber
          border: "#ffc107",
          text: "#000",
        };
      }
    } else {
      if (totalMinutes < 30) {
        // Darker green for urgent seed timers
        return {
          background: "rgba(27, 94, 32, 0.9)", // Dark green
          border: "#1b5e20",
          text: "#fff",
        };
      } else {
        // Normal green for seed timers
        return {
          background: "rgba(76, 175, 80, 0.9)", // Green
          border: "#4caf50",
          text: "#fff",
        };
      }
    }
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
            const timerKey = `modifier-${index}-${plot.modifier.key}`;

            if (modifierTime) {
              modifierLabel.textContent = `${formatKeyName(
                plot.modifier.key
              )}\n${modifierTime}`;

              // Update colors based on time remaining
              const colors = getTimerColors(modifierTime, true);
              modifierLabel.style.background = colors.background;
              modifierLabel.style.color = colors.text;
              modifierLabel.style.border = `1px solid ${colors.border}`;

              // Remove from notified set if timer is active again
              notifiedTimers.delete(timerKey);
            } else {
              // Timer expired - check if we should notify
              if (!notifiedTimers.has(timerKey)) {
                playNotificationSound();
                notifiedTimers.add(timerKey);
                console.log(
                  `🔔 Booster timer expired: ${formatKeyName(
                    plot.modifier.key
                  )} on plot ${index + 1}`
                );
              }
              modifierLabel.remove(); // Remove if expired
            }
          }

          // Update seed label
          const seedLabel = labelsContainer.querySelector(".seed-label");
          if (seedLabel && plot.seed?.endsAt && plot.seed?.key) {
            const seedTime = calculateTimeRemaining(plot.seed.endsAt);
            const timerKey = `seed-${index}-${plot.seed.key}`;

            if (seedTime) {
              seedLabel.textContent = `${formatKeyName(
                plot.seed.key
              )}\n${seedTime}`;

              // Update colors based on time remaining
              const colors = getTimerColors(seedTime, false);
              seedLabel.style.background = colors.background;
              seedLabel.style.color = colors.text;
              seedLabel.style.border = `1px solid ${colors.border}`;

              // Remove from notified set if timer is active again
              notifiedTimers.delete(timerKey);
            } else {
              // Timer expired - check if we should notify
              if (!notifiedTimers.has(timerKey)) {
                playNotificationSound();
                notifiedTimers.add(timerKey);
                console.log(
                  `🔔 Seed timer expired: ${formatKeyName(
                    plot.seed.key
                  )} on plot ${index + 1}`
                );
              }
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
            const colors = getTimerColors(modifierTime, true);
            const modifierLabel = document.createElement("div");
            modifierLabel.className = "time-label modifier-label";
            modifierLabel.textContent = `${formatKeyName(
              modifierKey
            )}\n${modifierTime}`;
            modifierLabel.style.padding = "4px 6px";
            modifierLabel.style.background = colors.background;
            modifierLabel.style.color = colors.text;
            modifierLabel.style.borderRadius = "3px";
            modifierLabel.style.border = `1px solid ${colors.border}`;
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
            const colors = getTimerColors(seedTime, false);
            const seedLabel = document.createElement("div");
            seedLabel.className = "time-label seed-label";
            seedLabel.textContent = `${formatKeyName(seedKey)}\n${seedTime}`;
            seedLabel.style.padding = "4px 6px";
            seedLabel.style.background = colors.background;
            seedLabel.style.color = colors.text;
            seedLabel.style.borderRadius = "3px";
            seedLabel.style.border = `1px solid ${colors.border}`;
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
        // Reset notification tracking when new data is loaded
        notifiedTimers.clear();
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

  // Refresh API data every 1 minute
  setInterval(fetchAPI, 60000);

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
