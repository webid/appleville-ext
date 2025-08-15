(function () {
  const API_URL =
    "https://app.appleville.xyz/api/trpc/core.getState?batch=1&input=%7B%220%22%3A%7B%22json%22%3Anull%2C%22meta%22%3A%7B%22values%22%3A%5B%22undefined%22%5D%7D%7D%7D";

  const LEADERBOARD_API_URL =
    "https://app.appleville.xyz/api/trpc/stats.getLeaderboard?batch=20";

  // Telegram Bot Configuration
  // You need to replace these with your actual bot token and chat ID
  const TELEGRAM_BOT_TOKEN = "YOUR_BOT_TOKEN_HERE"; // Replace with your bot token
  const TELEGRAM_CHAT_ID = "YOUR_CHAT_ID_HERE"; // Replace with your chat ID
  
  // Set to true to enable Telegram notifications
  const ENABLE_TELEGRAM_NOTIFICATIONS = false; // Set to true when you have your bot set up

  // Safety mechanism to prevent excessive updates
  let lastUpdateTime = 0;
  const MIN_UPDATE_INTERVAL = 1000; // Minimum 1 second between updates

  // Store API data globally
  let apiData = null;
  let leaderboardData = null;

  // Track which timers have already notified to prevent multiple beeps
  let notifiedTimers = new Set();
  
  // Track which timers have already sent Telegram notifications
  let telegramNotifiedTimers = new Set();

  // Map of wallet addresses to player names
  const addressToNameMap = {
    "0x9a12a221350c7cf93be8eff22822e4a32f2d1675": "opeculiar",
    "0x4b02c462...3a7c7b98d2": "RubisC0",
  };

  // Telegram notification functions
  async function sendTelegramNotification(message) {
    const botToken = window.TELEGRAM_BOT_TOKEN || TELEGRAM_BOT_TOKEN;
    const chatId = window.TELEGRAM_CHAT_ID || TELEGRAM_CHAT_ID;
    const isEnabled = window.ENABLE_TELEGRAM_NOTIFICATIONS !== undefined ? 
      window.ENABLE_TELEGRAM_NOTIFICATIONS : ENABLE_TELEGRAM_NOTIFICATIONS;
    
    if (!isEnabled || !botToken || !chatId) {
      console.log('❌ Cannot send notification - missing configuration');
      return;
    }

    console.log('📤 Sending Telegram notification...');
    console.log('Message:', message);

    try {
      const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
      console.log('API URL:', url);
      
      const requestBody = {
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
      };
      console.log('Request body:', requestBody);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.log('Error response:', errorText);
        throw new Error(`Telegram API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('API response:', result);
      
      if (!result.ok) {
        throw new Error(`Telegram API error: ${result.description}`);
      }
      
      console.log('✅ Telegram notification sent successfully!');
    } catch (error) {
      console.error('❌ Failed to send Telegram notification:', error);
      console.error('Full error details:', error.message);
    }
  }

  function formatTimerExpiredMessage(plotIndex, timerType, timerKey) {
    const plotNumber = plotIndex + 1;
    const timerName = formatKeyName(timerKey);
    
    if (timerType === 'modifier') {
      return `🚨 <b>Booster Expired!</b>\n\nPlot ${plotNumber}: ${timerName} has finished.\n\nTime to check your plots!`;
    } else {
      return `🌱 <b>Seed Expired!</b>\n\nPlot ${plotNumber}: ${timerName} has finished.\n\nTime to plant new seeds!`;
    }
  }

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

  function getDisplayName(address, originalDisplayText) {
    // Check if we have a custom name mapping for the full address
    if (addressToNameMap[address]) {
      return addressToNameMap[address];
    }

    // Also check if we have a mapping for the shortened address format
    const shortAddress = shortenWalletAddress(address);
    if (addressToNameMap[shortAddress]) {
      return addressToNameMap[shortAddress];
    }

    // Check if the original display text itself has a mapping
    if (addressToNameMap[originalDisplayText]) {
      return addressToNameMap[originalDisplayText];
    }

    // Otherwise return the original display text (don't modify it)
    return originalDisplayText;
  }

  function findPlayerByShortAddress(shortAddress, players) {
    if (!shortAddress || !players) {
      return null;
    }

    const foundPlayer = players.find((player) => {
      // Check if the shortAddress matches a custom name for the full address
      if (addressToNameMap[player.walletAddress] === shortAddress) {
        return true;
      }

      // Check if the shortAddress matches a custom name for the shortened address
      const playerShort = shortenWalletAddress(player.walletAddress);
      if (addressToNameMap[playerShort] === shortAddress) {
        return true;
      }

      // Check if the displayed shortAddress has a mapping (for cases like RubisC0)
      if (addressToNameMap[shortAddress]) {
        return playerShort === shortAddress;
      }

      // Otherwise check if it matches the shortened address format
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

          // Always clean up AP info first for all entries
          const existingApInfo = addressContainer.querySelector(".ap-info");
          if (existingApInfo) {
            existingApInfo.remove();
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
            const displayName = getDisplayName(
              player.walletAddress,
              currentDisplayText
            );

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
        background: linear-gradient(135deg, #8B4513 0%, #654321 100%);
        border-radius: 8px;
        padding: 8px 12px;
        margin: 8px 0 20px 0;
        color: white;
        font-family: inherit;
        box-shadow: 0 2px 8px rgba(139, 69, 19, 0.3);
        border: 1px solid rgba(255, 255, 255, 0.1);
        width: 100%;
        box-sizing: border-box;
        backdrop-filter: blur(8px);
      `;

      // Create header
      // const header = document.createElement("div");
      // header.style.cssText = `
      //   font-size: 12px;
      //   font-weight: 600;
      //   margin-bottom: 6px;
      //   text-align: center;
      //   opacity: 0.9;
      //   letter-spacing: 0.5px;
      // `;
      // header.textContent = "🏆 Your Rankings";
      // rankInfoContainer.appendChild(header);

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
        font-size: 8px;
        opacity: 0.8;
        margin-bottom: 2px;
        line-height: 1;
        font-weight: 500;
      `;
      currentApLabel.textContent = "Current AP";

      const currentApInfo = document.createElement("div");
      currentApInfo.style.cssText = `
        font-size: 12px;
        font-weight: 700;
        line-height: 1;
      `;
      const currentRankText = currentAp.currentUserRank
        ? `#${currentAp.currentUserRank}`
        : "N/A";
      const currentApText = formatAP(currentAp.currentUserValue || 0);
      currentApInfo.textContent = `${currentRankText} - ${currentApText}`;

      currentApStats.appendChild(currentApLabel);
      currentApStats.appendChild(currentApInfo);

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
        font-size: 8px;
        opacity: 0.8;
        margin-bottom: 2px;
        line-height: 1;
        font-weight: 500;
      `;
      totalApLabel.textContent = "Total AP";

      const totalApInfo = document.createElement("div");
      totalApInfo.style.cssText = `
        font-size: 12px;
        font-weight: 700;
        line-height: 1;
      `;
      const totalRankText = totalApEarned.currentUserRank
        ? `#${totalApEarned.currentUserRank}`
        : "N/A";
      const totalApText = formatAP(totalApEarned.currentUserValue || 0);
      totalApInfo.textContent = `${totalRankText} - ${totalApText}`;

      totalApStats.appendChild(totalApLabel);
      totalApStats.appendChild(totalApInfo);

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

  // Track if audio context has been initialized after user gesture
  let audioContextInitialized = false;
  let audioContext = null;

  function initializeAudioContext() {
    if (!audioContextInitialized) {
      try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        audioContextInitialized = true;
      } catch (error) {
        // Audio context not supported
      }
    }
  }

  function playNotificationSound() {
    try {
      // Only try to play sound if audio context is initialized
      if (!audioContextInitialized || !audioContext) {
        return; // Silent fail if audio not ready
      }

      // Resume audio context if it's suspended
      if (audioContext.state === "suspended") {
        audioContext.resume();
      }

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
      // Silent error handling - don't spam console with audio errors
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
        // Urgent booster - warm red-orange
        return {
          background: "rgba(168, 85, 47, 0.95)", // Warm brown-red
          border: "#8B4513",
          text: "#FFF8DC",
        };
      } else {
        // Normal booster - warm tan/beige
        return {
          background: "rgba(205, 164, 113, 0.95)", // Warm tan
          border: "#A0522D",
          text: "#2F1B14",
        };
      }
    } else {
      if (totalMinutes < 30) {
        // Urgent seed - deep forest green
        return {
          background: "rgba(85, 107, 47, 0.95)", // Dark olive green
          border: "#556B2F",
          text: "#F0F8E8",
        };
      } else {
        // Normal seed - sage green
        return {
          background: "rgba(143, 158, 97, 0.95)", // Sage green
          border: "#8FBC8F",
          text: "#2F4F2F",
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
        const plotWrapper =
          button.parentElement?.querySelector(`.plot-wrapper-${index}`) ||
          button.closest(`.plot-wrapper-${index}`);
        const topLabel = plotWrapper?.querySelector(`.plot-top-label-${index}`);
        const bottomLabel = plotWrapper?.querySelector(
          `.plot-bottom-label-${index}`
        );

        // Get plot data from API
        if (
          apiData &&
          apiData[0]?.result?.data?.json?.plots &&
          apiData[0].result.data.json.plots[index]
        ) {
          const plot = apiData[0].result.data.json.plots[index];

          // Update modifier label (top label)
          if (topLabel && plot.modifier?.endsAt && plot.modifier?.key) {
            const modifierTime = calculateTimeRemaining(plot.modifier.endsAt);
            const timerKey = `modifier-${index}-${plot.modifier.key}`;

            if (modifierTime) {
              topLabel.innerHTML = `
                <div style="font-size: 8px; line-height: 1; margin-bottom: 1px; opacity: 0.9;">${formatKeyName(
                  plot.modifier.key
                )}</div>
                <div style="font-size: 12px; line-height: 1; font-weight: bold;">${modifierTime}</div>
              `;

              // Update colors based on time remaining
              const colors = getTimerColors(modifierTime, true);
              topLabel.style.background = colors.background;
              topLabel.style.color = colors.text;
              topLabel.style.border = `1px solid ${colors.border}`;

              // Remove from notified set if timer is active again
              notifiedTimers.delete(timerKey);
              telegramNotifiedTimers.delete(timerKey);
            } else {
              // Timer expired - check if we should notify
              if (!notifiedTimers.has(timerKey)) {
                playNotificationSound();
                notifiedTimers.add(timerKey);
              }
              
              // Send Telegram notification if not already sent
              if (!telegramNotifiedTimers.has(timerKey)) {
                const message = formatTimerExpiredMessage(index, 'modifier', plot.modifier.key);
                sendTelegramNotification(message);
                telegramNotifiedTimers.add(timerKey);
              }
              
              topLabel.remove(); // Remove if expired
            }
          }

          // Update seed label (bottom label)
          if (bottomLabel && plot.seed?.endsAt && plot.seed?.key) {
            const seedTime = calculateTimeRemaining(plot.seed.endsAt);
            const timerKey = `seed-${index}-${plot.seed.key}`;

            if (seedTime) {
              bottomLabel.innerHTML = `
                <div style="font-size: 8px; line-height: 1; margin-bottom: 1px; opacity: 0.9;">${formatKeyName(
                  plot.seed.key
                )}</div>
                <div style="font-size: 12px; line-height: 1; font-weight: bold;">${seedTime}</div>
              `;

              // Update colors based on time remaining
              const colors = getTimerColors(seedTime, false);
              bottomLabel.style.background = colors.background;
              bottomLabel.style.color = colors.text;
              bottomLabel.style.border = `1px solid ${colors.border}`;

              // Remove from notified set if timer is active again
              notifiedTimers.delete(timerKey);
              telegramNotifiedTimers.delete(timerKey);
            } else {
              // Timer expired - check if we should notify
              if (!notifiedTimers.has(timerKey)) {
                playNotificationSound();
                notifiedTimers.add(timerKey);
              }
              
              // Send Telegram notification if not already sent
              if (!telegramNotifiedTimers.has(timerKey)) {
                const message = formatTimerExpiredMessage(index, 'seed', plot.seed.key);
                sendTelegramNotification(message);
                telegramNotifiedTimers.add(timerKey);
              }
              
              bottomLabel.remove(); // Remove if expired
            }
          }
        }
      });
    } catch (error) {
      console.error("Error in updateTimerLabels:", error);
    }
  }

  // Helper function to get or create plot wrapper
  function getOrCreatePlotWrapper(button, index) {
    // First check if button is already in a wrapper
    let plotWrapper = button.closest(`.plot-wrapper-${index}`);
    if (plotWrapper) {
      return plotWrapper;
    }

    // Check if wrapper exists in parent
    plotWrapper = button.parentElement?.querySelector(`.plot-wrapper-${index}`);
    if (plotWrapper) {
      return plotWrapper;
    }

    // Create new wrapper
    plotWrapper = document.createElement("div");
    plotWrapper.className = `plot-wrapper-${index}`;
    plotWrapper.style.cssText = `
      position: relative;
      display: inline-block;
      margin-bottom: 40px;
    `;

    // Wrap the button safely
    const parent = button.parentElement;
    if (parent) {
      parent.insertBefore(plotWrapper, button);
      plotWrapper.appendChild(button);
    }

    return plotWrapper;
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
        // Remove any existing labels for this plot
        const plotWrapper =
          button.parentElement?.querySelector(`.plot-wrapper-${index}`) ||
          button.closest(`.plot-wrapper-${index}`);
        const existingTopLabel = plotWrapper?.querySelector(
          `.plot-top-label-${index}`
        );
        const existingBottomLabel = plotWrapper?.querySelector(
          `.plot-bottom-label-${index}`
        );
        if (existingTopLabel) {
          existingTopLabel.remove();
        }
        if (existingBottomLabel) {
          existingBottomLabel.remove();
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

        // Create booster timer above the plot if available
        if (modifierTime && modifierKey) {
          const colors = getTimerColors(modifierTime, true);
          const modifierLabel = document.createElement("div");
          modifierLabel.className = `time-label modifier-label plot-top-label-${index}`;
          modifierLabel.innerHTML = `
            <div style="font-size: 8px; line-height: 1; margin-bottom: 1px; opacity: 0.9;">${formatKeyName(
              modifierKey
            )}</div>
            <div style="font-size: 12px; line-height: 1; font-weight: bold;">${modifierTime}</div>
          `;
          modifierLabel.style.cssText = `
            padding: 4px 6px;
            background: ${colors.background};
            color: ${colors.text};
            border-radius: 4px;
            border: 2px solid ${colors.border};
            text-align: center;
            letter-spacing: 0.3px;
            font-size: 14px;
            line-height: 1.2;
            font-family: monospace, 'Courier New', monospace;
            font-weight: bold;
            position: absolute;
            top: -25px;
            left: 0;
            right: 0;
            margin: 0 auto;
            width: fit-content;
            min-width: 70px;
            z-index: 2;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          `;

          // Get or create wrapper for this plot
          const plotWrapper = getOrCreatePlotWrapper(button, index);

          // Insert timer into the plot wrapper
          plotWrapper.appendChild(modifierLabel);
        }

        // Create seed timer below the plot if available
        if (seedTime && seedKey) {
          const colors = getTimerColors(seedTime, false);
          const seedLabel = document.createElement("div");
          seedLabel.className = `time-label seed-label plot-bottom-label-${index}`;
          seedLabel.innerHTML = `
            <div style="font-size: 8px; line-height: 1; margin-bottom: 1px; opacity: 0.9;">${formatKeyName(
              seedKey
            )}</div>
            <div style="font-size: 12px; line-height: 1; font-weight: bold;">${seedTime}</div>
          `;
          seedLabel.style.cssText = `
            padding: 4px 6px;
            background: ${colors.background};
            color: ${colors.text};
            border-radius: 4px;
            border: 2px solid ${colors.border};
            text-align: center;
            letter-spacing: 0.3px;
            font-size: 14px;
            line-height: 1.2;
            font-family: monospace, 'Courier New', monospace;
            font-weight: bold;
            position: absolute;
            bottom: -25px;
            left: 0;
            right: 0;
            margin: 0 auto;
            width: fit-content;
            min-width: 70px;
            z-index: 2;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          `;

          // Get or create wrapper for this plot
          const plotWrapper = getOrCreatePlotWrapper(button, index);

          // Insert timer into the plot wrapper
          plotWrapper.appendChild(seedLabel);
        }
      });
    } catch (error) {
      console.error("Error in addLabels:", error);
    }
  }

  function updateLabels() {
    try {
      // Remove old labels only (keep wrappers)
      document
        .querySelectorAll(
          '[class^="plot-labels-"], [class*="plot-top-label-"], [class*="plot-bottom-label-"]'
        )
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

  // Initialize audio context on first user interaction
  function handleFirstUserInteraction() {
    initializeAudioContext();
    // Remove listeners after first interaction
    document.removeEventListener("click", handleFirstUserInteraction);
    document.removeEventListener("keydown", handleFirstUserInteraction);
    document.removeEventListener("touchstart", handleFirstUserInteraction);
  }

  // Add listeners for user interaction to enable audio
  document.addEventListener("click", handleFirstUserInteraction);
  document.addEventListener("keydown", handleFirstUserInteraction);
  document.addEventListener("touchstart", handleFirstUserInteraction);

  // Initial run
  addLabels();

  // Initial leaderboard enhancement if data is available
  if (leaderboardData) {
    enhanceLeaderboardDisplay();
    createPlayerRankInfo();
  }

  // Load saved Telegram settings and create settings button
  loadSavedSettings();
  createSettingsButton();

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
  window.createSettingsPanel = createSettingsPanel;
  window.createSettingsButton = createSettingsButton;

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

  // Helper function to test Telegram notifications
  window.testTelegramNotification = function() {
    console.log('=== Testing Telegram Bot ===');
    
    const botToken = window.TELEGRAM_BOT_TOKEN || TELEGRAM_BOT_TOKEN;
    const chatId = window.TELEGRAM_CHAT_ID || TELEGRAM_CHAT_ID;
    const isEnabled = window.ENABLE_TELEGRAM_NOTIFICATIONS !== undefined ? 
      window.ENABLE_TELEGRAM_NOTIFICATIONS : ENABLE_TELEGRAM_NOTIFICATIONS;
    
    console.log('Bot Token:', botToken ? `${botToken.substring(0, 10)}...` : 'NOT SET');
    console.log('Chat ID:', chatId || 'NOT SET');
    console.log('Notifications Enabled:', isEnabled);
    
    if (!isEnabled) {
      console.log('❌ Telegram notifications are disabled. Enable them in the settings panel.');
      return;
    }
    
    if (!botToken || botToken === "YOUR_BOT_TOKEN_HERE") {
      console.log('❌ Bot token not configured. Please enter your bot token in the settings panel.');
      return;
    }
    
    if (!chatId || chatId === "YOUR_CHAT_ID_HERE") {
      console.log('❌ Chat ID not configured. Please enter your chat ID in the settings panel.');
      return;
    }
    
    console.log('✅ Configuration looks good, sending test message...');
    
    const testMessage = `🧪 <b>Test Notification</b>\n\nThis is a test message from your Appleville Extension.\n\nIf you receive this, your Telegram bot is working correctly!`;
    sendTelegramNotification(testMessage);
    console.log('📤 Test Telegram notification sent! Check your Telegram app.');
  };

  // Helper function to verify bot token and chat ID
  window.verifyTelegramConfig = async function() {
    console.log('=== Verifying Telegram Configuration ===');
    
    const botToken = window.TELEGRAM_BOT_TOKEN || TELEGRAM_BOT_TOKEN;
    const chatId = window.TELEGRAM_CHAT_ID || TELEGRAM_CHAT_ID;
    
    if (!botToken || botToken === "YOUR_BOT_TOKEN_HERE") {
      console.log('❌ Bot token not configured');
      return false;
    }
    
    if (!chatId || chatId === "YOUR_CHAT_ID_HERE") {
      console.log('❌ Chat ID not configured');
      return false;
    }
    
    console.log('🔍 Testing bot token...');
    
    try {
      // Test 1: Check if bot token is valid
      const getMeUrl = `https://api.telegram.org/bot${botToken}/getMe`;
      console.log('Testing bot token with:', getMeUrl);
      
      const getMeResponse = await fetch(getMeUrl);
      const getMeResult = await getMeResponse.json();
      
      if (!getMeResult.ok) {
        console.log('❌ Invalid bot token:', getMeResult.description);
        return false;
      }
      
      console.log('✅ Bot token is valid!');
      console.log('Bot info:', getMeResult.result);
      
      // Test 2: Check if chat ID is accessible
      console.log('🔍 Testing chat ID...');
      const getChatUrl = `https://api.telegram.org/bot${botToken}/getChat?chat_id=${chatId}`;
      console.log('Testing chat ID with:', getChatUrl);
      
      const getChatResponse = await fetch(getChatUrl);
      const getChatResult = await getChatResponse.json();
      
      if (!getChatResult.ok) {
        console.log('❌ Chat ID error:', getChatResult.description);
        console.log('💡 Make sure you have started a conversation with your bot');
        return false;
      }
      
      console.log('✅ Chat ID is valid!');
      console.log('Chat info:', getChatResult.result);
      
      console.log('🎉 All tests passed! Your configuration is correct.');
      return true;
      
    } catch (error) {
      console.error('❌ Error during verification:', error);
      return false;
    }
  };

  // Helper function to configure Telegram bot
  window.configureTelegramBot = function(botToken, chatId) {
    if (botToken && chatId) {
      // Update the constants (this will only work for the current session)
      window.TELEGRAM_BOT_TOKEN = botToken;
      window.TELEGRAM_CHAT_ID = chatId;
      window.ENABLE_TELEGRAM_NOTIFICATIONS = true;
      console.log('Telegram bot configured successfully!');
      console.log('Note: This configuration will reset when you refresh the page.');
      console.log('To make it permanent, update the constants in the code.');
    } else {
      console.log('Please provide both bot token and chat ID');
    }
  };

  // Create settings panel UI
  function createSettingsPanel() {
    // Remove existing settings panel if present
    const existingPanel = document.querySelector('.telegram-settings-panel');
    if (existingPanel) {
      existingPanel.remove();
    }

    const settingsPanel = document.createElement('div');
    settingsPanel.className = 'telegram-settings-panel';
    settingsPanel.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #8B4513 0%, #654321 100%);
      border-radius: 12px;
      padding: 16px;
      color: white;
      font-family: inherit;
      box-shadow: 0 4px 20px rgba(139, 69, 19, 0.4);
      border: 2px solid rgba(255, 255, 255, 0.2);
      backdrop-filter: blur(10px);
      width: 300px;
      z-index: 10000;
      max-height: 80vh;
      overflow-y: auto;
    `;

    // Header
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.2);
    `;

    const title = document.createElement('h3');
    title.textContent = '🔔 Notification Settings';
    title.style.cssText = `
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: #FFF8DC;
    `;

    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '✕';
    closeBtn.style.cssText = `
      background: rgba(255, 255, 255, 0.2);
      border: none;
      color: white;
      border-radius: 50%;
      width: 24px;
      height: 24px;
      cursor: pointer;
      font-size: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s;
    `;
    closeBtn.onmouseover = () => closeBtn.style.background = 'rgba(255, 255, 255, 0.3)';
    closeBtn.onmouseout = () => closeBtn.style.background = 'rgba(255, 255, 255, 0.2)';
    closeBtn.onclick = () => settingsPanel.remove();

    header.appendChild(title);
    header.appendChild(closeBtn);
    settingsPanel.appendChild(header);

    // Telegram Bot Token Input
    const tokenSection = document.createElement('div');
    tokenSection.style.cssText = 'margin-bottom: 16px;';

    const tokenLabel = document.createElement('label');
    tokenLabel.textContent = 'Bot Token:';
    tokenLabel.style.cssText = `
      display: block;
      margin-bottom: 6px;
      font-size: 12px;
      font-weight: 500;
      color: #FFF8DC;
    `;

    const tokenInput = document.createElement('input');
    tokenInput.type = 'password';
    tokenInput.placeholder = 'Enter your bot token';
    tokenInput.value = window.TELEGRAM_BOT_TOKEN || TELEGRAM_BOT_TOKEN;
    tokenInput.style.cssText = `
      width: 100%;
      padding: 8px 12px;
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.1);
      color: white;
      font-size: 12px;
      box-sizing: border-box;
    `;
    tokenInput.onfocus = () => tokenInput.style.borderColor = 'rgba(255, 255, 255, 0.6)';
    tokenInput.onblur = () => tokenInput.style.borderColor = 'rgba(255, 255, 255, 0.3)';

    tokenSection.appendChild(tokenLabel);
    tokenSection.appendChild(tokenInput);
    settingsPanel.appendChild(tokenSection);

    // Chat ID Input
    const chatIdSection = document.createElement('div');
    chatIdSection.style.cssText = 'margin-bottom: 16px;';

    const chatIdLabel = document.createElement('label');
    chatIdLabel.textContent = 'Chat ID:';
    chatIdLabel.style.cssText = `
      display: block;
      margin-bottom: 6px;
      font-size: 12px;
      font-weight: 500;
      color: #FFF8DC;
    `;

    const chatIdInput = document.createElement('input');
    chatIdInput.type = 'text';
    chatIdInput.placeholder = 'Enter your chat ID';
    chatIdInput.value = window.TELEGRAM_CHAT_ID || TELEGRAM_CHAT_ID;
    chatIdInput.style.cssText = `
      width: 100%;
      padding: 8px 12px;
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.1);
      color: white;
      font-size: 12px;
      box-sizing: border-box;
    `;
    chatIdInput.onfocus = () => chatIdInput.style.borderColor = 'rgba(255, 255, 255, 0.6)';
    chatIdInput.onblur = () => chatIdInput.style.borderColor = 'rgba(255, 255, 255, 0.3)';

    chatIdSection.appendChild(chatIdLabel);
    chatIdSection.appendChild(chatIdInput);
    settingsPanel.appendChild(chatIdSection);

    // Toggle Switch
    const toggleSection = document.createElement('div');
    toggleSection.style.cssText = 'margin-bottom: 16px;';

    const toggleLabel = document.createElement('label');
    toggleLabel.textContent = 'Enable Telegram Notifications:';
    toggleLabel.style.cssText = `
      display: block;
      margin-bottom: 8px;
      font-size: 12px;
      font-weight: 500;
      color: #FFF8DC;
    `;

    const toggleContainer = document.createElement('div');
    toggleContainer.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
    `;

    const toggleSwitch = document.createElement('input');
    toggleSwitch.type = 'checkbox';
    toggleSwitch.checked = window.ENABLE_TELEGRAM_NOTIFICATIONS !== undefined ? 
      window.ENABLE_TELEGRAM_NOTIFICATIONS : ENABLE_TELEGRAM_NOTIFICATIONS;
    toggleSwitch.style.cssText = `
      width: 40px;
      height: 20px;
      appearance: none;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 10px;
      position: relative;
      cursor: pointer;
      transition: background 0.3s;
    `;

    // Custom toggle switch styling
    toggleSwitch.onchange = function() {
      if (this.checked) {
        this.style.background = '#4CAF50';
      } else {
        this.style.background = 'rgba(255, 255, 255, 0.2)';
      }
    };

    // Apply initial state
    if (toggleSwitch.checked) {
      toggleSwitch.style.background = '#4CAF50';
    }

    const toggleText = document.createElement('span');
    toggleText.textContent = toggleSwitch.checked ? 'ON' : 'OFF';
    toggleText.style.cssText = `
      font-size: 12px;
      font-weight: 600;
      color: ${toggleSwitch.checked ? '#4CAF50' : '#ccc'};
    `;

    toggleSwitch.onchange = function() {
      if (this.checked) {
        this.style.background = '#4CAF50';
        toggleText.textContent = 'ON';
        toggleText.style.color = '#4CAF50';
      } else {
        this.style.background = 'rgba(255, 255, 255, 0.2)';
        toggleText.textContent = 'OFF';
        toggleText.style.color = '#ccc';
      }
    };

    toggleContainer.appendChild(toggleSwitch);
    toggleContainer.appendChild(toggleText);
    toggleSection.appendChild(toggleLabel);
    toggleSection.appendChild(toggleContainer);
    settingsPanel.appendChild(toggleSection);

    // Buttons
    const buttonSection = document.createElement('div');
    buttonSection.style.cssText = `
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
    `;

    const testBtn = document.createElement('button');
    testBtn.textContent = 'Test Bot';
    testBtn.style.cssText = `
      flex: 1;
      padding: 8px 12px;
      background: #4CAF50;
      border: none;
      border-radius: 6px;
      color: white;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    `;
    testBtn.onmouseover = () => testBtn.style.background = '#45a049';
    testBtn.onmouseout = () => testBtn.style.background = '#4CAF50';
    testBtn.onclick = () => {
      const token = tokenInput.value.trim();
      const chatId = chatIdInput.value.trim();
      if (token && chatId) {
        window.TELEGRAM_BOT_TOKEN = token;
        window.TELEGRAM_CHAT_ID = chatId;
        window.ENABLE_TELEGRAM_NOTIFICATIONS = true;
        testTelegramNotification();
      } else {
        alert('Please enter both bot token and chat ID');
      }
    };

    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save Settings';
    saveBtn.style.cssText = `
      flex: 1;
      padding: 8px 12px;
      background: #2196F3;
      border: none;
      border-radius: 6px;
      color: white;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    `;
    saveBtn.onmouseover = () => saveBtn.style.background = '#1976D2';
    saveBtn.onmouseout = () => saveBtn.style.background = '#2196F3';
    saveBtn.onclick = () => {
      const token = tokenInput.value.trim();
      const chatId = chatIdInput.value.trim();
      const enabled = toggleSwitch.checked;
      
      if (token && chatId) {
        window.TELEGRAM_BOT_TOKEN = token;
        window.TELEGRAM_CHAT_ID = chatId;
        window.ENABLE_TELEGRAM_NOTIFICATIONS = enabled;
        
        // Save to localStorage for persistence
        try {
          localStorage.setItem('telegramBotToken', token);
          localStorage.setItem('telegramChatId', chatId);
          localStorage.setItem('telegramNotificationsEnabled', enabled);
        } catch (e) {
          console.log('Could not save to localStorage');
        }
        
        alert('Settings saved successfully!');
      } else {
        alert('Please enter both bot token and chat ID');
      }
    };

    buttonSection.appendChild(testBtn);
    buttonSection.appendChild(saveBtn);
    settingsPanel.appendChild(buttonSection);

    // Help text
    const helpText = document.createElement('div');
    helpText.style.cssText = `
      font-size: 10px;
      color: rgba(255, 255, 255, 0.7);
      line-height: 1.4;
      border-top: 1px solid rgba(255, 255, 255, 0.2);
      padding-top: 12px;
    `;
    helpText.innerHTML = `
      <strong>How to set up:</strong><br>
      1. Create a bot with @BotFather<br>
      2. Get your bot token<br>
      3. Send a message to your bot<br>
      4. Get your chat ID from the API<br>
      5. Save and test!
    `;
    settingsPanel.appendChild(helpText);

    // Add to page
    document.body.appendChild(settingsPanel);

    return settingsPanel;
  }

  // Load saved settings from localStorage
  function loadSavedSettings() {
    try {
      const savedToken = localStorage.getItem('telegramBotToken');
      const savedChatId = localStorage.getItem('telegramChatId');
      const savedEnabled = localStorage.getItem('telegramNotificationsEnabled');
      
      if (savedToken && savedChatId) {
        window.TELEGRAM_BOT_TOKEN = savedToken;
        window.TELEGRAM_CHAT_ID = savedChatId;
        window.ENABLE_TELEGRAM_NOTIFICATIONS = savedEnabled === 'true';
        
        // Update the constants for the current session
        if (window.ENABLE_TELEGRAM_NOTIFICATIONS) {
          console.log('Telegram notifications loaded from saved settings');
        }
      }
    } catch (e) {
      console.log('Could not load saved settings');
    }
  }

  // Create settings button
  function createSettingsButton() {
    // Remove existing button if present
    const existingBtn = document.querySelector('.telegram-settings-btn');
    if (existingBtn) {
      existingBtn.remove();
    }

    const settingsBtn = document.createElement('button');
    settingsBtn.className = 'telegram-settings-btn';
    settingsBtn.innerHTML = '🔔';
    settingsBtn.title = 'Telegram Notification Settings';
    settingsBtn.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: 50px;
      height: 50px;
      background: linear-gradient(135deg, #8B4513 0%, #654321 100%);
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      color: white;
      font-size: 20px;
      cursor: pointer;
      z-index: 9999;
      box-shadow: 0 4px 15px rgba(139, 69, 19, 0.4);
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    settingsBtn.onmouseover = () => {
      settingsBtn.style.transform = 'scale(1.1)';
      settingsBtn.style.boxShadow = '0 6px 20px rgba(139, 69, 19, 0.6)';
    };

    settingsBtn.onmouseout = () => {
      settingsBtn.style.transform = 'scale(1)';
      settingsBtn.style.boxShadow = '0 4px 15px rgba(139, 69, 19, 0.4)';
    };

    settingsBtn.onclick = () => {
      createSettingsPanel();
    };

    document.body.appendChild(settingsBtn);
  }

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

      // Load saved Telegram settings and create settings button
      setTimeout(() => {
        loadSavedSettings();
        createSettingsButton();
      }, 1000);

      // Add click listener for leaderboard tab
      setTimeout(() => {
        const leaderboardTab =
          document.querySelector('[aria-labelledby*="leaderboard"]') ||
          document.querySelector('button[class*="leaderboard"]') ||
          Array.from(document.querySelectorAll('[data-state="inactive"]')).find(
            (el) => {
              const h1 = el.querySelector("h1");
              return h1 && h1.textContent.toLowerCase().includes("leaderboard");
            }
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

    // Load saved Telegram settings and create settings button
    setTimeout(() => {
      loadSavedSettings();
      createSettingsButton();
    }, 1000);

    // Add click listener for leaderboard tab
    setTimeout(() => {
      const leaderboardTab =
        document.querySelector('[aria-labelledby*="leaderboard"]') ||
        document.querySelector('button[class*="leaderboard"]') ||
        Array.from(document.querySelectorAll('[data-state="inactive"]')).find(
          (el) => {
            const h1 = el.querySelector("h1");
            return h1 && h1.textContent.toLowerCase().includes("leaderboard");
          }
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
