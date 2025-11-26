import settingsStore from '../stores/settings'
import { EMOTIONS, EmotionType } from './messages'

type EmotionTagMap = Record<EmotionType, string[]>

const normalizeTags = (tags: string[] | undefined, fallback: string[]) => {
  const normalized = (tags || [])
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0)

  return normalized.length > 0 ? normalized : fallback
}

export const getEmotionTagMap = (): EmotionTagMap => {
  const s = settingsStore.getState()
  const fallback: EmotionTagMap = {
    neutral: ['neutral'],
    happy: ['happy'],
    angry: ['angry'],
    sad: ['sad'],
    relaxed: ['relaxed'],
    surprised: ['surprised'],
  }

  return {
    neutral: normalizeTags(s.emotionTagsNeutral, fallback.neutral),
    happy: normalizeTags(s.emotionTagsHappy, fallback.happy),
    angry: normalizeTags(s.emotionTagsAngry, fallback.angry),
    sad: normalizeTags(s.emotionTagsSad, fallback.sad),
    relaxed: normalizeTags(s.emotionTagsRelaxed, fallback.relaxed),
    surprised: normalizeTags(s.emotionTagsSurprised, fallback.surprised),
  }
}

export const findEmotionByTag = (rawTag: string): EmotionType | null => {
  const tag = rawTag.replace(/^\[|\]$/g, '').trim().toLowerCase()
  if (!tag) return null

  const map = getEmotionTagMap()
  for (const emotion of EMOTIONS) {
    if (map[emotion].some((t) => t.toLowerCase() === tag)) {
      return emotion
    }
  }
  return null
}

export const buildEmotionTagPattern = (): RegExp => {
  const map = getEmotionTagMap()
  const tags = EMOTIONS.flatMap((emotion) => map[emotion])
  if (tags.length === 0) {
    return /\[\]/g
  }
  const escaped = tags.map((tag) =>
    tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  )
  return new RegExp(`\\[(${escaped.join('|')})\\]\\s*`, 'gi')
}
