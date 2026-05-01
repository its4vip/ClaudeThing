import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  createStateMap,
  updateSlot,
  getActiveSlots,
  getCurrentDisplay,
} from '../state.js'

afterEach(() => vi.useRealTimers())

describe('createStateMap', () => {
  it('returns all null slots', () => {
    expect(createStateMap()).toEqual({ code: null, chat: null, cowork: null })
  })
})

describe('updateSlot', () => {
  it('sets a verb on the named slot', () => {
    const state = updateSlot(createStateMap(), 'code', 'Reading')
    expect(state.code?.verb).toBe('Reading')
    expect(state.code?.updatedAt).toBeCloseTo(Date.now(), -2)
  })

  it('clears a slot when verb is null', () => {
    let state = updateSlot(createStateMap(), 'chat', 'Thinking')
    state = updateSlot(state, 'chat', null)
    expect(state.chat).toBeNull()
  })

  it('does not mutate other slots', () => {
    const state = updateSlot(createStateMap(), 'code', 'Running')
    const next = updateSlot(state, 'chat', 'Thinking')
    expect(next.code?.verb).toBe('Running')
    expect(next.chat?.verb).toBe('Thinking')
  })
})

describe('getActiveSlots', () => {
  it('returns empty array when all slots null', () => {
    expect(getActiveSlots(createStateMap())).toEqual([])
  })

  it('returns active slots with source and verb', () => {
    const state = updateSlot(createStateMap(), 'code', 'Reading')
    const active = getActiveSlots(state)
    expect(active).toHaveLength(1)
    expect(active[0]).toEqual({ source: 'code', verb: 'Reading' })
  })

  it('excludes slots expired beyond 5s', () => {
    vi.useFakeTimers()
    const state = updateSlot(createStateMap(), 'code', 'Reading')
    vi.advanceTimersByTime(5001)
    expect(getActiveSlots(state)).toHaveLength(0)
  })

  it('includes slots updated within 5s', () => {
    vi.useFakeTimers()
    const state = updateSlot(createStateMap(), 'code', 'Reading')
    vi.advanceTimersByTime(4999)
    expect(getActiveSlots(state)).toHaveLength(1)
  })

  it('returns multiple active slots in declaration order (code, chat, cowork)', () => {
    let state = createStateMap()
    state = updateSlot(state, 'chat', 'Thinking')
    state = updateSlot(state, 'code', 'Running')
    const active = getActiveSlots(state)
    expect(active[0].source).toBe('code')
    expect(active[1].source).toBe('chat')
  })
})

describe('getCurrentDisplay', () => {
  it('returns null when no active slots', () => {
    expect(getCurrentDisplay(createStateMap(), 0)).toBeNull()
  })

  it('returns the only active slot at any rotation index', () => {
    const state = updateSlot(createStateMap(), 'chat', 'Thinking')
    expect(getCurrentDisplay(state, 0)).toEqual({
      verb: 'Thinking', source: 'chat', activeCount: 1, rotationPosition: 0,
    })
    expect(getCurrentDisplay(state, 7)).toEqual({
      verb: 'Thinking', source: 'chat', activeCount: 1, rotationPosition: 0,
    })
  })

  it('rotates through active slots by index modulo activeCount', () => {
    let state = createStateMap()
    state = updateSlot(state, 'code', 'Running')
    state = updateSlot(state, 'chat', 'Thinking')
    expect(getCurrentDisplay(state, 0)?.source).toBe('code')
    expect(getCurrentDisplay(state, 1)?.source).toBe('chat')
    expect(getCurrentDisplay(state, 2)?.source).toBe('code') // wraps
  })

  it('includes activeCount and rotationPosition in output', () => {
    let state = createStateMap()
    state = updateSlot(state, 'code', 'Running')
    state = updateSlot(state, 'chat', 'Thinking')
    const display = getCurrentDisplay(state, 1)
    expect(display?.activeCount).toBe(2)
    expect(display?.rotationPosition).toBe(1)
  })
})
