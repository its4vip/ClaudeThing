const VERB_MAP = {
  Read:      'Reading',
  Write:     'Writing',
  Edit:      'Writing',
  Bash:      'Running',
  WebFetch:  'Fetching',
  WebSearch: 'Searching',
  Agent:     'Thinking',
}

export function mapToolToVerb(toolName) {
  if (toolName.startsWith('Task')) return 'Analyzing'
  return VERB_MAP[toolName] ?? 'Thinking'
}
