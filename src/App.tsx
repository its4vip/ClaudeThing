import React, { useEffect, useState } from 'react'
import { DeskThing } from 'deskthing-client'

type Source = 'code' | 'chat' | 'cowork'

interface DisplayState {
  verb: string | null
  source: Source | null
  activeCount: number
  rotationPosition: number
}

const ACCENT: Record<Source, string> = {
  code:   '#58a6ff',
  chat:   '#3fb950',
  cowork: '#f0883e',
}

const SOURCE_LABEL: Record<Source, string> = {
  code:   'Claude Code',
  chat:   'Claude Chat',
  cowork: 'Claude Cowork',
}

const IDLE: DisplayState = { verb: null, source: null, activeCount: 0, rotationPosition: 0 }

const App: React.FC = () => {
  const [display, setDisplay] = useState<DisplayState>(IDLE)

  useEffect(() => {
    const remove = (DeskThing as any).on('status', (data: any) => {
      setDisplay(data.payload ?? IDLE)
    })
    return () => remove()
  }, [])

  const { verb, source, activeCount, rotationPosition } = display
  const accent = source ? ACCENT[source] : '#58a6ff'
  const isActive = !!verb

  return (
    <div className="w-screen h-screen bg-[#0a0a0a] flex flex-col items-center justify-center relative overflow-hidden select-none">

      {isActive && (
        <>
          <div
            className="absolute rounded-full border animate-pulse-ring"
            style={{ width: 340, height: 340, borderColor: `${accent}28` }}
          />
          <div
            className="absolute rounded-full border animate-pulse-ring-delayed"
            style={{ width: 250, height: 250, borderColor: `${accent}45` }}
          />
        </>
      )}

      {!isActive && (
        <div className="flex flex-col items-center gap-4">
          <div className="w-24 h-24 rounded-full bg-[#1a1a2e] border-2 border-[#2a2d4a] flex items-center justify-center">
            <span className="text-[#4a5a8a] text-5xl font-light">✦</span>
          </div>
          <span className="text-[#252830] text-xs tracking-[0.25em] uppercase">idle</span>
        </div>
      )}

      {isActive && (
        <div key={verb} className="flex flex-col items-center gap-3 z-10 animate-verb-in">
          <span
            className="font-bold tracking-tight leading-none text-[#e6edf3]"
            style={{ fontSize: 'clamp(72px, 14vw, 120px)' }}
          >
            {verb}
          </span>

          <div className="flex gap-2">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-2 h-2 rounded-full animate-dot"
                style={{ background: accent, animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>

          {source && (
            <span className="text-[10px] tracking-[0.18em] uppercase text-[#4a5a8a]">
              {SOURCE_LABEL[source]}
            </span>
          )}

          {activeCount > 1 && (
            <div className="flex gap-2 mt-1">
              {Array.from({ length: activeCount }).map((_, i) => (
                <div
                  key={i}
                  className="h-[3px] w-5 rounded-full transition-colors duration-300"
                  style={{ background: i === rotationPosition ? accent : '#252830' }}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default App
