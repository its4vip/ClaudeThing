import { describe, it, expect } from 'vitest'
import { mapToolToVerb } from '../verb-map.js'

describe('mapToolToVerb', () => {
  it.each([
    ['Read',      'Reading'],
    ['Write',     'Writing'],
    ['Edit',      'Writing'],
    ['Bash',      'Running'],
    ['WebFetch',  'Fetching'],
    ['WebSearch', 'Searching'],
    ['Agent',     'Thinking'],
  ])('maps %s → %s', (tool, verb) => {
    expect(mapToolToVerb(tool)).toBe(verb)
  })

  it('maps any Task* tool to Analyzing', () => {
    expect(mapToolToVerb('TaskCreate')).toBe('Analyzing')
    expect(mapToolToVerb('TaskUpdate')).toBe('Analyzing')
    expect(mapToolToVerb('TaskGet')).toBe('Analyzing')
  })

  it('defaults unknown tools to Thinking', () => {
    expect(mapToolToVerb('UnknownTool')).toBe('Thinking')
    expect(mapToolToVerb('')).toBe('Thinking')
  })
})
