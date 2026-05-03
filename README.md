# ClaudeThing

A [DeskThing](https://github.com/ItsRiprod/DeskThing) app for the Spotify CarThing that mirrors real-time Claude activity to the device screen — showing whichever spinner verb (Thinking, Reading, Writing…) is currently active across Claude Code, Claude Chat, and Claude Cowork.

![idle state: ✦ logo on dark background → active state: large verb with pulse rings]

## How it works

Claude surfaces show a spinner verb while working. ClaudeThing captures that verb and displays it on the CarThing in real time. No API key required — it's purely a local display mirror.

```
Claude Code (hook) ──HTTP──┐
Claude Chat (extension) ──WS──┤── DeskThing plugin :7891 ──► CarThing screen
Claude Cowork (extension) ──WS──┘
```

Multiple sources rotate every 3 seconds. Each source has its own accent color (blue for Code, green for Chat, orange for Cowork). No activity = idle state.

## Requirements

- [DeskThing desktop app](https://github.com/ItsRiprod/DeskThing) with a CarThing connected
- Chrome (for Chat/Cowork verb detection)
- Claude Code CLI (for Code verb detection via hooks)
- Node.js 18+

## Installation

### 1. DeskThing plugin

1. Download `claudething-v0.1.0.zip` from [Releases](../../releases)
2. Open the DeskThing desktop app → Apps → Add App → Install from zip
3. Select the downloaded zip and enable the app

### 2. Chrome extension

1. Clone this repo (or download the source)
2. Open Chrome → `chrome://extensions`
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked** → select the `extension/` directory
5. The extension will connect automatically when claude.ai is open and the DeskThing plugin is running

### 3. Claude Code hooks

Add the following to `~/.claude/settings.json` (merge with any existing content):

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "",
        "hooks": [{
          "type": "command",
          "command": "/absolute/path/to/ClaudeThing/hooks/send-verb.sh"
        }]
      }
    ],
    "Stop": [
      {
        "matcher": "",
        "hooks": [{
          "type": "command",
          "command": "/absolute/path/to/ClaudeThing/hooks/clear-verb.sh"
        }]
      }
    ]
  }
}
```

Replace `/absolute/path/to/ClaudeThing` with the path to this repo.

## Development

```bash
npm install
npm test          # run unit tests (22 tests)
npm run dev       # Vite dev server at localhost:5173
npm run build     # full build → dist/claudething-v*.zip
```

## Stack

- DeskThing SDK (TypeScript + React 18)
- Vite + esbuild
- Chrome Extension Manifest v3
- Vitest
