'use client'

import { FormEvent, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import gameStore, { RegisteredGame } from '@/features/stores/game'

const emptyForm: Omit<RegisteredGame, 'id'> = {
  name: '',
  endpoint: '',
  displayUrl: '',
  description: '',
}

const Game = () => {
  const { t } = useTranslation()
  const games = gameStore((s) => s.games)
  const selectedGameId = gameStore((s) => s.selectedGameId)
  const upsertGame = gameStore((s) => s.upsertGame)
  const removeGame = gameStore((s) => s.removeGame)
  const selectGame = gameStore((s) => s.selectGame)

  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)

  const isEditing = Boolean(editingId)
  const selectedGame = useMemo(
    () => games.find((game) => game.id === selectedGameId),
    [games, selectedGameId]
  )

  const resetForm = () => {
    setForm(emptyForm)
    setEditingId(null)
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!form.name.trim()) return

    const id = upsertGame({
      ...form,
      id: editingId ?? undefined,
    })

    selectGame(id)
    resetForm()
  }

  const handleEdit = (game: RegisteredGame) => {
    setEditingId(game.id)
    setForm({
      name: game.name,
      endpoint: game.endpoint,
      displayUrl: game.displayUrl,
      description: game.description,
    })
  }

  const handleDelete = (id: string) => {
    removeGame(id)
    if (editingId === id) {
      resetForm()
    }
  }

  return (
    <section className="space-y-10">
      <div>
        <h2 className="text-2xl font-semibold">{t('GameSettings')}</h2>
        <p className="mt-2 text-sm text-text2">
          {t('GameSettingsDescription')}
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <form
          className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
          onSubmit={handleSubmit}
        >
          <h3 className="text-lg font-semibold">
            {isEditing ? t('UpdateGame') : t('AddGame')}
          </h3>
          <div className="space-y-1">
            <label className="text-sm font-medium text-text2">
              {t('GameName')}
            </label>
            <input
              type="text"
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
              value={form.name}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, name: event.target.value }))
              }
              placeholder={t('GameNamePlaceholder') ?? ''}
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-text2">
              {t('GameEndpoint')}
            </label>
            <input
              type="text"
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
              value={form.endpoint}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, endpoint: event.target.value }))
              }
              placeholder={t('GameEndpointPlaceholder') ?? ''}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-text2">
              {t('GameDisplayUrl')}
            </label>
            <input
              type="text"
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
              value={form.displayUrl}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, displayUrl: event.target.value }))
              }
              placeholder={t('GameDisplayUrlPlaceholder') ?? ''}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-text2">
              {t('GameDescription')}
            </label>
            <textarea
              className="min-h-[96px] w-full rounded-lg border border-gray-300 px-3 py-2"
              value={form.description}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  description: event.target.value,
                }))
              }
              placeholder={t('GameDescriptionPlaceholder') ?? ''}
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="rounded-lg bg-primary px-4 py-2 font-semibold text-theme transition hover:bg-primary-hover"
            >
              {isEditing ? t('UpdateGame') : t('AddGame')}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-text2 transition hover:bg-gray-50"
            >
              {t('ResetForm')}
            </button>
          </div>
        </form>

        <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{t('RegisteredGames')}</h3>
            {selectedGame && (
              <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-theme">
                {t('SelectedGame')}
              </span>
            )}
          </div>
          {games.length === 0 ? (
            <p className="text-sm text-text2">{t('NoRegisteredGames')}</p>
          ) : (
            <ul className="space-y-3">
              {games.map((game) => (
                <li
                  key={game.id}
                  className="rounded-xl border border-gray-200 p-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold">{game.name}</p>
                      <p className="text-xs text-text2">
                        {game.endpoint || t('EndpointNotSet')}
                      </p>
                    </div>
                    {selectedGameId === game.id && (
                      <span className="text-xs font-medium text-secondary">
                        {t('SelectedGame')}
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => selectGame(game.id)}
                      className="rounded-lg border border-primary px-3 py-1 text-sm font-medium text-primary transition hover:bg-primary/10"
                    >
                      {t('SelectGame')}
                    </button>
                    <button
                      onClick={() => handleEdit(game)}
                      className="rounded-lg border border-gray-300 px-3 py-1 text-sm text-text2 transition hover:bg-gray-50"
                    >
                      {t('Edit')}
                    </button>
                    <button
                      onClick={() => handleDelete(game.id)}
                      className="rounded-lg border border-red-200 px-3 py-1 text-sm text-red-600 transition hover:bg-red-50"
                    >
                      {t('DeleteGame')}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}

export default Game
