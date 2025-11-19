'use client'

import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import gameStore from '@/features/stores/game'

export const GamePanel = () => {
  const { t } = useTranslation()
  const games = gameStore((s) => s.games)
  const selectedGameId = gameStore((s) => s.selectedGameId)

  const selectedGame = useMemo(
    () => games.find((game) => game.id === selectedGameId),
    [games, selectedGameId]
  )

  return (
    <div className="flex h-full min-h-[320px] flex-col bg-[#050505]/90 text-white">
      <div className="border-b border-white/10 p-4">
        <p className="text-xs uppercase tracking-wide text-white/60">
          {t('SelectedGame')}
        </p>
        <h2 className="text-xl font-semibold">
          {selectedGame ? selectedGame.name : t('GamePanelPlaceholder')}
        </h2>
        {selectedGame?.description && (
          <p className="mt-2 text-sm text-white/70">
            {selectedGame.description}
          </p>
        )}
      </div>
      <div className="relative flex-1 overflow-hidden">
        {selectedGame ? (
          selectedGame.displayUrl ? (
            <iframe
              src={selectedGame.displayUrl}
              title={selectedGame.name}
              className="h-full w-full border-0 bg-black"
              allow="fullscreen"
            />
          ) : (
            <div className="flex h-full items-center justify-center px-6 text-center text-sm text-white/60">
              {t('GamePanelNoUrl')}
            </div>
          )
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-white/60">
            {t('GamePanelNoSelection')}
          </div>
        )}
      </div>
      {selectedGame?.displayUrl && (
        <div className="border-t border-white/10 p-4 text-right">
          <a
            href={selectedGame.displayUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-white/80 underline-offset-4 hover:text-white hover:underline"
          >
            {t('GamePanelLaunch')}
          </a>
        </div>
      )}
    </div>
  )
}

export default GamePanel
