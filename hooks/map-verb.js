import { mapToolToVerb } from './verb-map.js'
process.stdout.write(mapToolToVerb(process.argv[2] ?? ''))
