import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface RegisteredGame {
  id: string
  name: string
  endpoint: string
  displayUrl: string
  description: string
}

interface GameStoreState {
  games: RegisteredGame[]
  selectedGameId: string | null
  upsertGame: (game: Omit<RegisteredGame, 'id'> & { id?: string }) => string
  removeGame: (gameId: string) => void
  selectGame: (gameId: string) => void
}

const generateId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).slice(2)
}

const gameStore = create<GameStoreState>()(
  persist(
    (set, get) => ({
      games: [],
      selectedGameId: null,
      upsertGame: (gameInput) => {
        const id = gameInput.id ?? generateId()
        const nextGame: RegisteredGame = {
          id,
          name: gameInput.name,
          endpoint: gameInput.endpoint,
          displayUrl: gameInput.displayUrl,
          description: gameInput.description ?? '',
        }

        set((state) => {
          const existingIndex = state.games.findIndex((g) => g.id === id)
          let nextGames: RegisteredGame[] = []
          if (existingIndex >= 0) {
            nextGames = state.games.map((g, idx) =>
              idx === existingIndex ? nextGame : g
            )
          } else {
            nextGames = [...state.games, nextGame]
          }

          const shouldSelectNewlyAdded =
            state.selectedGameId === null && nextGames.length > 0

          return {
            games: nextGames,
            selectedGameId: shouldSelectNewlyAdded ? id : state.selectedGameId,
          }
        })

        return id
      },
      removeGame: (gameId) =>
        set((state) => {
          const remaining = state.games.filter((g) => g.id !== gameId)
          const selectedStillExists = remaining.some(
            (g) => g.id === state.selectedGameId
          )
          const fallbackId = remaining.length > 0 ? remaining[0].id : null
          return {
            games: remaining,
            selectedGameId: selectedStillExists
              ? state.selectedGameId
              : fallbackId,
          }
        }),
      selectGame: (gameId) => {
        const exists = get().games.some((g) => g.id === gameId)
        if (!exists) return
        set({ selectedGameId: gameId })
      },
    }),
    { name: 'aituber-game-store' }
  )
)

export default gameStore
