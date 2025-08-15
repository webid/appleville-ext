# Appleville Timer Labels Extension

A Chrome extension that adds real-time countdown timers to your Appleville farming plots, showing both Booster and Seed completion times with formatted item names.

## Features

- **Real-time countdown timers** for both Boosters and Seeds on each plot
- **Color-coded labels**: Yellow for Boosters, Green for Seeds
- **Visual urgency indicators**: Darker colors when timers are below 30 minutes
- **Audio notifications**: Beep sound when timers expire
- **Formatted item names** (e.g., "quantum-fertilizer" → "Quantum Fertilizer")
- **Seconds precision** for accurate timing
- **Automatic updates** every second
- **API integration** with Appleville's game data
- **Clean, non-intrusive design** positioned below each plot
- **Telegram notifications**: Get notified on your phone when timers expire

## Telegram Notifications

The extension can send Telegram notifications to your phone when any timer reaches 0, so you never miss when your boosters or seeds finish!

### Setup Instructions

1. **Create a Telegram Bot**
   - Open Telegram and search for `@BotFather`
   - Send `/newbot` command
   - Follow the instructions to create your bot
   - Save the bot token (you'll need this later)

2. **Get Your Chat ID**
   - Send a message to your bot
   - Visit `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
   - Look for the `"chat":{"id":123456789}` in the response
   - Save this chat ID number

3. **Configure the Extension**
   - **Option A: Use the UI (Recommended)**
     - Click the 🔔 button in the top-right corner of the Appleville page
     - Enter your bot token and chat ID
     - Toggle notifications on/off
     - Click "Save Settings"
   
   - **Option B: Edit the code**
     - Open `content.js` in a text editor
     - Find these lines near the top:
       ```javascript
       const TELEGRAM_BOT_TOKEN = "YOUR_BOT_TOKEN_HERE";
       const TELEGRAM_CHAT_ID = "YOUR_CHAT_ID_HERE";
       const ENABLE_TELEGRAM_NOTIFICATIONS = false;
       ```
     - Replace `YOUR_BOT_TOKEN_HERE` with your actual bot token
     - Replace `YOUR_CHAT_ID_HERE` with your actual chat ID
     - Change `ENABLE_TELEGRAM_NOTIFICATIONS` to `true`

4. **Test the Setup**
   - Use the "Test Bot" button in the settings panel, or
   - Open the browser console (F12) and type: `testTelegramNotification()`
   - You should receive a test message on Telegram

### Alternative: Runtime Configuration

You can also configure the bot without editing the code:
1. Open the browser console on the Appleville page
2. Run: `configureTelegramBot("YOUR_BOT_TOKEN", "YOUR_CHAT_ID")`
3. Test with: `testTelegramNotification()`

**Note**: Runtime configuration only works for the current session and will reset when you refresh the page.

### Settings Panel Features

- **🔔 Settings Button**: Always visible in the top-right corner
- **Easy Configuration**: Input fields for bot token and chat ID
- **Toggle Switch**: Turn notifications on/off with a single click
- **Test Function**: Verify your bot setup immediately
- **Auto-save**: Settings are automatically saved to your browser
- **Persistent**: Settings persist between page refreshes
- **Help Text**: Built-in setup instructions

### What You'll Receive

- **Booster Expired**: 🚨 Notification when a booster timer reaches 0
- **Seed Expired**: 🌱 Notification when a seed timer reaches 0
- Each notification includes the plot number and item name
- Notifications are sent only once per expired timer

## Installation

### Method 1: Load as Unpacked Extension (Recommended)

1. **Download the extension files**
   - Download `manifest.json` and `content.js` to a folder on your computer

2. **Open Chrome Extensions**
   - Open Chrome and go to `chrome://extensions/`
   - Or navigate to: Chrome Menu → More Tools → Extensions

3. **Enable Developer Mode**
   - Toggle the "Developer mode" switch in the top-right corner

4. **Load the Extension**
   - Click "Load unpacked"
   - Select the folder containing your `manifest.json` and `content.js` files
   - The extension should now appear in your extensions list

5. **Verify Installation**
   - You should see "Appleville Timer Labels" in your extensions list
   - The extension will be active when you visit `https://app.appleville.xyz`

### Method 2: Manual Installation

1. **Create extension folder**
   ```bash
   mkdir appleville-timer-labels
   cd appleville-timer-labels
   ```

2. **Add the files**
   - Copy `manifest.json` and `content.js` into this folder

3. **Load in Chrome**
   - Follow steps 2-5 from Method 1 above

## Usage

1. **Navigate to Appleville**
   - Go to `https://app.appleville.xyz`
   - Log into your account

2. **View Your Plots**
   - The extension automatically activates when you're on the plots page
   - You'll see countdown timers appear below each plot

3. **Understanding the Labels**
   - **Yellow labels**: Booster timers (e.g., Quantum Fertilizer)
   - **Green labels**: Seed timers (e.g., Royal Apple)
   - **Darker colors**: Indicate timers below 30 minutes (urgent)
   - **Format**: Item name on top, countdown time below (HH:MM:SS)

4. **Real-time Updates**
   - Timers update every second automatically
   - API data refreshes every 1 minute
   - Expired timers automatically disappear
   - Audio beep notification when timers expire

## Example Display

```
[Plot Button]
┌─────────────────┐
│ Quantum Fertilizer │  (Yellow background - normal)
│ 08:35:50        │
└─────────────────┘
┌─────────────────┐
│ Royal Apple     │  (Green background - normal)
│ 02:52:04        │
└─────────────────┘

[Plot Button with Urgent Timer]
┌─────────────────┐
│ Quantum Fertilizer │  (Dark orange background - urgent <30min)
│ 00:25:30        │
└─────────────────┘
┌─────────────────┐
│ Royal Apple     │  (Dark green background - urgent <30min)
│ 00:15:45        │
└─────────────────┘
```

## Troubleshooting

### Extension Not Working?
1. **Check if it's enabled**
   - Go to `chrome://extensions/`
   - Ensure "Appleville Timer Labels" is toggled on

2. **Refresh the page**
   - Hard refresh the Appleville page (Ctrl+F5 or Cmd+Shift+R)

3. **Check console for errors**
   - Open Developer Tools (F12)
   - Look for any error messages in the Console tab

4. **Verify permissions**
   - The extension needs access to `https://app.appleville.xyz`
   - Check that host permissions are granted

### Timers Not Updating?
1. **Check your internet connection**
   - The extension fetches data from Appleville's API
   - Ensure you have a stable connection

2. **Verify you're logged in**
   - The extension requires you to be logged into Appleville
   - API calls include your session cookies

### Labels Not Appearing?
1. **Check plot visibility**
   - Ensure you're on the plots page
   - The extension only works on pages with plot buttons

2. **Wait for API data**
   - The extension waits 2 seconds after page load before fetching data
   - Check the console for "Appleville API data:" messages

### Telegram Notifications Not Working?
1. **Check bot configuration**
   - Verify your bot token and chat ID are correct
   - Ensure `ENABLE_TELEGRAM_NOTIFICATIONS` is set to `true`

2. **Test the bot manually**
   - Open browser console and run: `testTelegramNotification()`
   - Check for any error messages in the console

3. **Verify bot permissions**
   - Make sure your bot can send messages
   - Check that you've started a conversation with your bot

4. **Check internet connection**
   - The extension needs to reach Telegram's API
   - Ensure no firewall is blocking the requests

### Advanced Telegram Troubleshooting

If you're still having issues, try these steps:

1. **Verify your configuration step by step**
   ```javascript
   // In the browser console, run:
   verifyTelegramConfig()
   ```
   This will test your bot token and chat ID separately.

2. **Check common issues:**
   - **Bot token format**: Should look like `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`
   - **Chat ID format**: Should be a number like `123456789` (no quotes needed)
   - **Bot status**: Make sure your bot is not blocked or deleted

3. **Test the Telegram API directly:**
   - Visit: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getMe`
   - You should see: `{"ok":true,"result":{"id":123456789,"is_bot":true,...}}`

4. **Check if you can receive messages:**
   - Send a message to your bot in Telegram
   - Visit: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
   - Look for your chat ID in the response

5. **Console debugging:**
   - Open browser console (F12)
   - Look for any error messages when testing
   - The enhanced logging will show exactly what's happening

6. **Common error messages:**
   - **"Unauthorized"**: Invalid bot token
   - **"Chat not found"**: Invalid chat ID or bot not started
   - **"Forbidden"**: Bot is blocked or can't send messages
   - **"Network error"**: Check your internet connection

## Technical Details

- **API Endpoint**: `https://app.appleville.xyz/api/trpc/core.getState`
- **Update Frequency**: Timer labels update every second, API data every 5 minutes
- **Browser Support**: Chrome/Chromium-based browsers
- **Permissions**: Requires access to Appleville domain and API calls

## Development

### File Structure
```
appleville-timer-labels/
├── manifest.json    # Extension configuration
├── content.js       # Main extension logic
└── README.md        # This file
```

### Global Functions

The extension provides several functions you can call from the browser console:

- **`addPlayerName(address, name)`**: Add a custom name mapping for a wallet address
- **`testTelegramNotification()`**: Send a test Telegram notification
- **`verifyTelegramConfig()`**: Verify your bot token and chat ID configuration
- **`configureTelegramBot(token, chatId)`**: Configure Telegram bot at runtime
- **`enhanceLeaderboardDisplay()`**: Manually refresh leaderboard display
- **`createPlayerRankInfo()`**: Manually refresh player rank info
- **`createSettingsPanel()`**: Open the Telegram settings panel
- **`createSettingsButton()`**: Create the settings button (if it's missing)

### Key Features
- **MutationObserver**: Watches for DOM changes to update labels
- **Debounced updates**: Prevents excessive API calls
- **Error handling**: Graceful fallbacks for API failures
- **Rate limiting**: Prevents performance issues

## Support

If you encounter issues:
1. Check the browser console for error messages
2. Verify the extension is properly installed
3. Ensure you're on the correct Appleville page
4. Try refreshing the page and waiting for the API data to load

## License

This extension is provided as-is for personal use with Appleville.


## Image paths
Seeds
Onion Seeds -> https://app.appleville.xyz/img/crops/onion/pack.png
Royal Apple Seed -> https://app.appleville.xyz/img/crops/royal-apple/pack.png

Boosters
Deadly Mix -> https://app.appleville.xyz/img/modifiers/deadly-mix.png
Fertilizer -> https://app.appleville.xyz/img/modifiers/fertilizer.png
Quantum Fertilizer -> https://app.appleville.xyz/img/modifiers/fertilizer.png