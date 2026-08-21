# Reading Challenge SPA

A simple single-page application for tracking yearly reading challenge statistics. Designed to work offline when saved to an iPhone home screen.

## Features

- Track multiple yearly reading challenges
- Set a reading target and track completed reads
- Visual progress bar showing percentage complete (turns green when target met)
- Increment/decrement buttons for quick updates
- Edit existing challenges
- Lock/unlock challenges (past years auto-lock once, and a manual unlock sticks)
- Locked challenges are protected from editing, counting, and deletion
- Expandable statistics for current year challenge
- Export and import data as JSON
- Data persists locally using localStorage
- Challenges sorted by year (newest first)
- Light and dark themes, following the system setting until you choose one
- Settings panel with reset data option
- Keyboard accessible, with labelled controls for screen readers

## Usage

### Adding a Challenge

1. Enter a year (1900-2100)
2. Set your reading target
3. Optionally set an initial completed count
4. Tap "Add Challenge"

### Tracking Progress

- Use the **+** button to increment completed reads
- Use the **−** button to decrement completed reads
- Use the **pencil** button to edit a challenge
- Use the **lock** button to lock/unlock a challenge
- Use the **×** button to delete a challenge (disabled while locked)
- Tap a challenge card to expand and view statistics (current year only)

### Settings

Tap the gear icon in the header to access settings:
- **Theme** - Switch between dark and light
- **Export Data** - Download challenges as a JSON file
- **Import Data** - Restore challenges from a JSON file. Files are validated:
  malformed entries, out-of-range years, and duplicate years are rejected and
  leave your existing data untouched
- **Reset All Data** - Clears all stored challenges (with confirmation)

## Installation on iPhone

The service worker (which enables offline use and home screen behaviour) requires the app to be served over HTTPS — it won't activate when opened as a local file. You need to host `index.html` somewhere publicly accessible first.

Simple free options:
- **GitHub Pages** — push the file to a repo and enable Pages in the repository settings
- **Netlify Drop** — drag and drop the file at [app.netlify.com/drop](https://app.netlify.com/drop)
- Any other static web host

Once hosted, open the URL in Safari on your iPhone, then:

1. Tap the Share button (box with arrow)
2. Select "Add to Home Screen"
3. The app installs and runs in standalone mode without browser UI

## Tests

The test suite extracts the inline script from `index.html` and runs it against a
stubbed DOM, so it exercises the shipped code directly. No dependencies and no
build step — just Node:

```
node tests/app.test.js
```

## Technical Details

- Single HTML file with embedded CSS and JavaScript
- No external dependencies or build process required
- Uses localStorage for data persistence
- iOS web app meta tags for home screen support
- Safe area insets for notched devices
