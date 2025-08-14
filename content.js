(function () {
  const API_URL =
    "https://app.appleville.xyz/api/trpc/core.getState?batch=1&input=%7B%220%22%3A%7B%22json%22%3Anull%2C%22meta%22%3A%7B%22values%22%3A%5B%22undefined%22%5D%7D%7D%7D";

  const LEADERBOARD_API_URL =
    "https://app.appleville.xyz/api/trpc/stats.getLeaderboard?batch=20";

  // Safety mechanism to prevent excessive updates
  let lastUpdateTime = 0;
  const MIN_UPDATE_INTERVAL = 1000; // Minimum 1 second between updates

  // Store API data globally
  let apiData = null;
  let leaderboardData = null;

  // Track which timers have already notified to prevent multiple beeps
  let notifiedTimers = new Set();

  // Map of wallet addresses to player names
  const addressToNameMap = {
    "0x9a12a221350c7cf93be8eff22822e4a32f2d1675": "opeculiar",
    // Add more mappings here as needed
    // "0xd73acc2272f7524df092502b983001a199cc9d61": "player2",
    // "0x46f18e7a2a4ba26e444d65ed8e9728d73d9faa20": "player3",
  };

  function formatKeyName(key) {
    if (!key) return "";
    return key
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  function formatAP(ap) {
    // Show exact numbers with international formatting (commas for thousands)
    return ap.toLocaleString();
  }

  function shortenWalletAddress(address) {
    if (!address || address.length < 10) return address;
    return (
      address.substring(0, 6) + "..." + address.substring(address.length - 4)
    );
  }

  function getDisplayName(address) {
    // Check if we have a custom name mapping for this address
    if (addressToNameMap[address]) {
      return addressToNameMap[address];
    }
    // Otherwise return the shortened address
    return shortenWalletAddress(address);
  }

  function findPlayerByShortAddress(shortAddress, players) {
    if (!shortAddress || !players) {
      return null;
    }

    const foundPlayer = players.find((player) => {
      // Check if the shortAddress matches a custom name
      if (addressToNameMap[player.walletAddress] === shortAddress) {
        return true;
      }

      // Otherwise check if it matches the shortened address
      const playerShort = shortenWalletAddress(player.walletAddress);
      const cleanPlayerShort = playerShort.replace(/[^\w]/g, "");
      const cleanShortAddress = shortAddress.replace(/[^\w]/g, "");
      return cleanPlayerShort === cleanShortAddress;
    });

    return foundPlayer;
  }

  function enhanceLeaderboardDisplay() {
    try {
      if (!leaderboardData?.result?.data?.json) {
        return;
      }

      const { currentAp, totalApEarned } = leaderboardData.result.data.json;

      // Find leaderboard containers
      const leaderboardContainers = document.querySelectorAll(
        '[data-state="active"]'
      );

      leaderboardContainers.forEach((container) => {
        // Check if this is the leaderboard tab
        const h1 = container.querySelector("h1");
        if (!h1 || !h1.textContent.toLowerCase().includes("leaderboard")) {
          return;
        }

        // Check which tab is active
        const activeTab = container.querySelector(
          'button[class*="bg-white text-blue-600"]'
        );
        const activeTabText = activeTab?.textContent?.toLowerCase();
        const isCurrentApActive = activeTabText?.includes("current ap");
        const isTotalApActive = activeTabText?.includes("total ap");

        // Find player entries in the leaderboard - try multiple selectors
        let playerEntries = container.querySelectorAll(
          'div[class*="flex items-center justify-between"]'
        );

        // If no entries found, try alternative selectors
        if (playerEntries.length === 0) {
          playerEntries = container.querySelectorAll(
            'div[class*="flex"][class*="items-center"][class*="justify-between"]'
          );
        }

        // If still no entries, try looking for any div with rank numbers
        if (playerEntries.length === 0) {
          playerEntries = container.querySelectorAll(
            'div:has(div[class*="bg-blue-500"])'
          );
        }

        playerEntries.forEach((entry, index) => {
          const rankElement = entry.querySelector('div[class*="bg-blue-500"]');
          const addressContainer = entry.querySelector(
            'div[class*="flex items-center gap-3"]'
          );
          const addressElement = addressContainer?.querySelector(
            'div[class*="font-mono"]'
          );

          if (!rankElement || !addressElement) {
            return;
          }

          const rank = parseInt(rankElement.textContent.trim());
          const currentDisplayText = addressElement.textContent.trim();

          // Get the appropriate player data based on active tab
          let player = null;
          if (isCurrentApActive) {
            player = currentAp.topUsers.find((p) => p.rank === rank);
            if (!player) {
              player = findPlayerByShortAddress(
                currentDisplayText,
                currentAp.topUsers
              );
            }
          } else if (isTotalApActive) {
            player = totalApEarned.topUsers?.find((p) => p.rank === rank);
            if (!player) {
              player = findPlayerByShortAddress(
                currentDisplayText,
                totalApEarned.topUsers || []
              );
            }
          }

          if (player) {
            // Replace address with custom name if available
            const displayName = getDisplayName(player.walletAddress);

            // Only update if the display name is different from current text
            if (displayName !== currentDisplayText) {
              // Check if we already replaced it (to avoid infinite loops)
              if (!addressElement.dataset.replaced) {
                addressElement.textContent = displayName;
                addressElement.dataset.replaced = "true";
              }
            }

            // Only add AP info for Current AP tab
            if (isCurrentApActive) {
              // Remove existing AP info if present
              const existingApInfo = addressContainer.querySelector(".ap-info");
              if (existingApInfo) {
                existingApInfo.remove();
              }

              // Create AP info element
              const apInfo = document.createElement("div");
              apInfo.className = "ap-info";
              apInfo.textContent = `${formatAP(player.ap)} AP`;
              apInfo.style.cssText = `
                font-size: 12px;
                color: #666;
                font-weight: bold;
                white-space: nowrap;
                margin-left: auto;
              `;

              // Add AP info to the address container
              addressContainer.appendChild(apInfo);
            }
          }
        });
      });
    } catch (error) {
      // Silent error handling
    }
  }

  function createPlayerRankInfo() {
    try {
      if (!leaderboardData?.result?.data?.json) return;

      const { currentAp, totalApEarned } = leaderboardData.result.data.json;

      // Remove existing player rank info if present
      const existingInfo = document.querySelector(".player-rank-info");
      if (existingInfo) {
        existingInfo.remove();
      }

      // Find the main content area (before plots)
      const mainContent = document.querySelector("main") || document.body;

      // Create player rank info container
      const rankInfoContainer = document.createElement("div");
      rankInfoContainer.className = "player-rank-info";
      rankInfoContainer.style.cssText = `
        background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
        border-radius: 8px;
        padding: 8px 12px;
        margin: 8px 0;
        color: white;
        font-family: inherit;
        box-shadow: 0 2px 8px rgba(59, 130, 246, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.1);
        width: 100%;
        box-sizing: border-box;
        backdrop-filter: blur(8px);
      `;

      // Create header
      const header = document.createElement("div");
      header.style.cssText = `
        font-size: 12px;
        font-weight: 600;
        margin-bottom: 6px;
        text-align: center;
        opacity: 0.9;
        letter-spacing: 0.5px;
      `;
      header.textContent = "🏆 Your Rankings";
      rankInfoContainer.appendChild(header);

      // Create stats grid
      const statsGrid = document.createElement("div");
      statsGrid.style.cssText = `
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 6px;
      `;

      // Current AP stats
      const currentApStats = document.createElement("div");
      currentApStats.style.cssText = `
        background: rgba(255, 255, 255, 0.15);
        border-radius: 6px;
        padding: 6px;
        text-align: center;
        border: 1px solid rgba(255, 255, 255, 0.2);
        backdrop-filter: blur(4px);
      `;

      const currentApLabel = document.createElement("div");
      currentApLabel.style.cssText = `
        font-size: 9px;
        opacity: 0.8;
        margin-bottom: 2px;
        line-height: 1;
        font-weight: 500;
      `;
      currentApLabel.textContent = "Current AP Held";

      const currentApRank = document.createElement("div");
      currentApRank.style.cssText = `
        font-size: 14px;
        font-weight: 700;
        margin-bottom: 2px;
        line-height: 1;
      `;
      currentApRank.textContent = currentAp.currentUserRank
        ? `#${currentAp.currentUserRank}`
        : "N/A";

      const currentApValue = document.createElement("div");
      currentApValue.style.cssText = `
        font-size: 10px;
        opacity: 0.9;
        line-height: 1;
        font-weight: 500;
      `;
      currentApValue.textContent = formatAP(currentAp.currentUserValue || 0);

      currentApStats.appendChild(currentApLabel);
      currentApStats.appendChild(currentApRank);
      currentApStats.appendChild(currentApValue);

      // Total AP Earned stats
      const totalApStats = document.createElement("div");
      totalApStats.style.cssText = `
        background: rgba(255, 255, 255, 0.15);
        border-radius: 6px;
        padding: 6px;
        text-align: center;
        border: 1px solid rgba(255, 255, 255, 0.2);
        backdrop-filter: blur(4px);
      `;

      const totalApLabel = document.createElement("div");
      totalApLabel.style.cssText = `
        font-size: 9px;
        opacity: 0.8;
        margin-bottom: 2px;
        line-height: 1;
        font-weight: 500;
      `;
      totalApLabel.textContent = "Total AP Earned";

      const totalApRank = document.createElement("div");
      totalApRank.style.cssText = `
        font-size: 14px;
        font-weight: 700;
        margin-bottom: 2px;
        line-height: 1;
      `;
      totalApRank.textContent = totalApEarned.currentUserRank
        ? `#${totalApEarned.currentUserRank}`
        : "N/A";

      const totalApValue = document.createElement("div");
      totalApValue.style.cssText = `
        font-size: 10px;
        opacity: 0.9;
        line-height: 1;
        font-weight: 500;
      `;
      totalApValue.textContent = formatAP(totalApEarned.currentUserValue || 0);

      totalApStats.appendChild(totalApLabel);
      totalApStats.appendChild(totalApRank);
      totalApStats.appendChild(totalApValue);

      statsGrid.appendChild(currentApStats);
      statsGrid.appendChild(totalApStats);
      rankInfoContainer.appendChild(statsGrid);

      // Find the plots container and insert the rank info before it
      const plotsContainer =
        document.querySelector('div[class*="grid"]') ||
        document.querySelector('div[class*="flex"]') ||
        document.querySelector("main") ||
        document.body;

      // Look for a container that has plot buttons
      const plotButtons = document.querySelectorAll(
        'button[class*="relative flex h-[120px] w-[120px]"]'
      );
      if (plotButtons.length > 0) {
        // Find the common parent container of all plot buttons
        const firstPlotButton = plotButtons[0];
        const plotsParent = firstPlotButton.closest(
          'div[class*="grid"], div[class*="flex"], main, body'
        );

        if (plotsParent) {
          plotsParent.insertBefore(rankInfoContainer, plotsParent.firstChild);
        } else {
          mainContent.insertBefore(rankInfoContainer, mainContent.firstChild);
        }
      } else {
        mainContent.insertBefore(rankInfoContainer, mainContent.firstChild);
      }
    } catch (error) {
      // Silent error handling
    }
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
    } catch (error) {
      // Fallback: try to play a simple beep using HTML5 audio
      try {
        const audio = new Audio(
          "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT"
        );
        audio.volume = 0.3;
        audio.play();
      } catch (fallbackError) {
        // Silent error handling
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
            modifierLabel.style.padding = "2px 3px";
            modifierLabel.style.background = colors.background;
            modifierLabel.style.color = colors.text;
            modifierLabel.style.borderRadius = "3px";
            modifierLabel.style.border = `1px solid ${colors.border}`;
            modifierLabel.style.textAlign = "center";
            modifierLabel.style.letterSpacing = "0.3px";
            modifierLabel.style.width = "100%";
            modifierLabel.style.whiteSpace = "pre-line";
            modifierLabel.style.fontSize = "12px";
            modifierLabel.style.lineHeight = "1.2";
            labelsContainer.appendChild(modifierLabel);
          }

          // Add seed label if available
          if (seedTime && seedKey) {
            const colors = getTimerColors(seedTime, false);
            const seedLabel = document.createElement("div");
            seedLabel.className = "time-label seed-label";
            seedLabel.textContent = `${formatKeyName(seedKey)}\n${seedTime}`;
            seedLabel.style.padding = "2px 3px";
            seedLabel.style.background = colors.background;
            seedLabel.style.color = colors.text;
            seedLabel.style.borderRadius = "3px";
            seedLabel.style.border = `1px solid ${colors.border}`;
            seedLabel.style.textAlign = "center";
            seedLabel.style.letterSpacing = "0.3px";
            seedLabel.style.width = "100%";
            seedLabel.style.whiteSpace = "pre-line";
            seedLabel.style.fontSize = "12px";
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
    fetch(API_URL, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // Include cookies if needed
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        apiData = data; // Store API data globally
        // Reset notification tracking when new data is loaded
        notifiedTimers.clear();
        addLabels(); // Add labels after successful fetch
        updateTimerLabels(); // Update existing labels with new data
      })
      .catch((err) => {
        // Silent error handling
      });
  }

  function fetchLeaderboardAPI() {
    fetch(LEADERBOARD_API_URL, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // Include cookies if needed
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        leaderboardData = data; // Store leaderboard data globally
        // Enhance leaderboard display and create player rank info
        enhanceLeaderboardDisplay();
        createPlayerRankInfo();
      })
      .catch((err) => {
        // Silent error handling
      });
  }

  // Initial run
  addLabels();

  // Initial leaderboard enhancement if data is available
  if (leaderboardData) {
    enhanceLeaderboardDisplay();
    createPlayerRankInfo();
  }

  // Update timer labels every second (for smooth seconds countdown)
  setInterval(updateTimerLabels, 1000);

  // Update leaderboard display and player rank info every 5 seconds
  setInterval(() => {
    if (leaderboardData) {
      enhanceLeaderboardDisplay();
      createPlayerRankInfo();
    }
  }, 5000);

  // Also update leaderboard display every 2 seconds for more responsive updates
  setInterval(() => {
    if (leaderboardData) {
      // Clear replacement flags to allow re-processing when switching tabs
      document
        .querySelectorAll('div[class*="font-mono"][data-replaced]')
        .forEach((el) => {
          delete el.dataset.replaced;
        });
      enhanceLeaderboardDisplay();
    }
  }, 2000);

  // Make functions globally accessible for manual testing and management
  window.enhanceLeaderboardDisplay = enhanceLeaderboardDisplay;
  window.createPlayerRankInfo = createPlayerRankInfo;

  // Helper function to add new address mappings
  window.addPlayerName = function (address, name) {
    addressToNameMap[address] = name;
    // Clear replacement flags and refresh display
    document
      .querySelectorAll('div[class*="font-mono"][data-replaced]')
      .forEach((el) => {
        delete el.dataset.replaced;
      });
    enhanceLeaderboardDisplay();
  };

  // Refresh API data every 5 seconds
  setInterval(fetchAPI, 5000);
  setInterval(fetchLeaderboardAPI, 5000); // Refresh leaderboard data every 5 seconds

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

    // Check for leaderboard changes
    const hasLeaderboardChanges = mutations.some((mutation) => {
      if (mutation.type === "childList") {
        return Array.from(mutation.addedNodes).some(
          (node) =>
            node.nodeType === Node.ELEMENT_NODE &&
            (node.matches('[data-state="active"]') ||
              node.querySelector('[data-state="active"]'))
        );
      }
      return false;
    });

    if (hasPlotChanges) {
      debouncedUpdateLabels();
    }

    if (hasLeaderboardChanges) {
      // Check if leaderboard tab is now active
      const activeLeaderboard = document.querySelector(
        '[data-state="active"] h1'
      );
      if (
        activeLeaderboard &&
        activeLeaderboard.textContent.toLowerCase().includes("leaderboard")
      ) {
        setTimeout(() => {
          enhanceLeaderboardDisplay();
        }, 100); // Small delay to ensure DOM is fully rendered
      }
    }

    // Also check for any tab state changes
    mutations.forEach((mutation) => {
      if (
        mutation.type === "attributes" &&
        mutation.attributeName === "data-state"
      ) {
        const target = mutation.target;
        if (target.getAttribute("data-state") === "active") {
          const h1 = target.querySelector("h1");
          if (h1 && h1.textContent.toLowerCase().includes("leaderboard")) {
            setTimeout(() => {
              enhanceLeaderboardDisplay();
            }, 100);
          }
        }
      }
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Wait for page to be fully loaded before fetching API
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      setTimeout(fetchAPI, 2000);
      setTimeout(fetchLeaderboardAPI, 2000); // Schedule leaderboard fetch

      // Add click listener for leaderboard tab
      setTimeout(() => {
        const leaderboardTab =
          document.querySelector('[aria-labelledby*="leaderboard"]') ||
          document.querySelector('button[class*="leaderboard"]') ||
          document.querySelector(
            '[data-state="inactive"]:has(h1:contains("Leaderboard"))'
          );

        if (leaderboardTab) {
          leaderboardTab.addEventListener("click", () => {
            setTimeout(() => {
              enhanceLeaderboardDisplay();
            }, 500);
          });
        }
      }, 3000);
    });
  } else {
    setTimeout(fetchAPI, 2000);
    setTimeout(fetchLeaderboardAPI, 2000); // Schedule leaderboard fetch

    // Add click listener for leaderboard tab
    setTimeout(() => {
      const leaderboardTab =
        document.querySelector('[aria-labelledby*="leaderboard"]') ||
        document.querySelector('button[class*="leaderboard"]') ||
        document.querySelector(
          '[data-state="inactive"]:has(h1:contains("Leaderboard"))'
        );

      if (leaderboardTab) {
        leaderboardTab.addEventListener("click", () => {
          setTimeout(() => {
            enhanceLeaderboardDisplay();
          }, 500);
        });
      }
    }, 3000);
  }
})();
