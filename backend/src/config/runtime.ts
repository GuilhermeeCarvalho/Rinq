import { env } from './env.js'

let activeSeason = env.activeSeason

export function getActiveSeason() { return activeSeason }
export function setActiveSeason(s: typeof activeSeason) { activeSeason = s }
