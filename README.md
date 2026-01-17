# Reading Challenge SPA

A simple single-page application for tracking yearly reading challenge statistics. Designed to work offline when saved to an iPhone home screen.

## Features

- Track multiple yearly reading challenges
- Set a reading target and track completed reads
- Visual progress bar showing percentage complete
- Increment/decrement buttons for quick updates
- Data persists locally using localStorage
- Challenges sorted by year (newest first)
- Settings panel with reset data option

## Usage

### Adding a Challenge

1. Enter a year (1900-2100)
2. Set your reading target
3. Optionally set an initial completed count
4. Tap "Add Challenge"

### Tracking Progress

- Use the **+** button to increment completed reads
- Use the **−** button to decrement completed reads
- Use the **×** button to delete a challenge

### Settings

Tap the gear icon in the header to access settings:
- **Reset All Data** - Clears all stored challenges (with confirmation)

## Installation on iPhone

1. Open `index.html` in Safari (host it or access via file URL)
2. Tap the Share button
3. Select "Add to Home Screen"
4. The app runs in standalone mode without browser UI

## Technical Details

- Single HTML file with embedded CSS and JavaScript
- No external dependencies or build process required
- Uses localStorage for data persistence
- iOS web app meta tags for home screen support
- Safe area insets for notched devices

## To Do

- [x] Hide the new challenge section by default
- [x] Implement export and import of data
- [x] Show excess books when goal exceeds target
- [x] Add statistics for each year
- [x] Allow editing an existing challenge
- [x] Introduce a 'locked' concept for challenges
- [x] Lock challenges for previous years by default when loading the page
- [ ] Work on colour scheme 