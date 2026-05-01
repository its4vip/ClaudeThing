# ClaudeThing

## Purpose
A DeskThing app for the Spotify CarThing that mirrors real-time Claude 
activity status across Claude Chat, Claude Cowork, and Claude Code —
displayed as the "spinner verb" currently active on whichever surface 
is running.

## Core Concept: Spinner Verbs
Claude surfaces communicate what they are doing via short present-tense 
action labels paired with a loading spinner. These are the canonical 
status signals for this app:

  Thinking… / Reading… / Writing… / Running… / 
  Fetching… / Searching… / Analyzing…

ClaudeThing captures whichever spinner verb is active and mirrors it 
to the CarThing screen in real time. No spinner = Idle state.

## Status Model
  Idle → [spinner verb appears] → Active(verb) → Idle

## Sources (by surface)
- Claude Code     → parse spinner verb from terminal stdout stream
- Claude Chat     → Chrome extension reads spinner DOM element text
- Claude Cowork   → Chrome extension reads spinner DOM element text

## Stack
- DeskThing SDK (TypeScript + React)
- Chrome extension (content.js) for Chat/Cowork DOM monitoring
- stdout watcher/pipe for Claude Code terminal spinner text
- Local WebSocket or DeskThing message bus as the status hub

## Device
- Spotify CarThing running DeskThing firmware
- Screen: 480 × 800px, touch-enabled
- Connected via USB/ADB, transport managed by DeskThing desktop app

## UI Design Principles
- One dominant verb on screen, large and legible at a glance
- Subtle animation while active (pulse or fade), static when idle
- High contrast — readable in daylight and low light
- No API calls, no Claude API key — purely a local display/mirror app

## Conventions
- Spinner verb is the single source of truth for display state
- All updates pushed via DeskThing's built-in message bus
- Keep components small and focused

## Key References
- DeskThing SDK: https://github.com/ItsRiprod/DeskThing
- DeskThing Wiki: https://carthing.wiki
- CarThing screen: 480 × 800px