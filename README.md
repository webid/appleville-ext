# Appleville Timer Labels Extension

A Chrome extension that adds real-time countdown timers to your Appleville farming plots, showing both Booster and Seed completion times with formatted item names.

## Features

- **Real-time countdown timers** for both Boosters and Seeds on each plot
- **Color-coded labels**: Yellow for Boosters, Green for Seeds
- **Formatted item names** (e.g., "quantum-fertilizer" → "Quantum Fertilizer")
- **Seconds precision** for accurate timing
- **Automatic updates** every second
- **API integration** with Appleville's game data
- **Clean, non-intrusive design** positioned below each plot

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
   - **Format**: Item name on top, countdown time below (HH:MM:SS)

4. **Real-time Updates**
   - Timers update every second automatically
   - API data refreshes every 5 minutes
   - Expired timers automatically disappear

## Example Display

```
[Plot Button]
┌─────────────────┐
│ Quantum Fertilizer │  (Yellow background)
│ 08:35:50        │
└─────────────────┘
┌─────────────────┐
│ Royal Apple     │  (Green background)
│ 02:52:04        │
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
