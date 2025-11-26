import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import settingsStore, { SettingsState } from '@/features/stores/settings'

type MotionField = {
  key:
    | 'vrmIdleMotion'
    | 'vrmNeutralMotion'
    | 'vrmHappyMotion'
    | 'vrmSadMotion'
    | 'vrmAngryMotion'
    | 'vrmRelaxedMotion'
    | 'vrmSurprisedMotion'
  labelKey: string
}

const motionFields: MotionField[] = [
  { key: 'vrmIdleMotion', labelKey: 'Motion.Idle' },
  { key: 'vrmNeutralMotion', labelKey: 'Motion.Neutral' },
  { key: 'vrmHappyMotion', labelKey: 'Motion.Happy' },
  { key: 'vrmSadMotion', labelKey: 'Motion.Sad' },
  { key: 'vrmAngryMotion', labelKey: 'Motion.Angry' },
  { key: 'vrmRelaxedMotion', labelKey: 'Motion.Relaxed' },
  { key: 'vrmSurprisedMotion', labelKey: 'Motion.Surprised' },
]

const normalizePath = (path: string) => {
  if (!path) return ''
  return path.startsWith('/') ? path : `/${path}`
}

const Motion = () => {
  const { t } = useTranslation()
  const store = settingsStore()
  const [motions, setMotions] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchMotions = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch('/api/get-motion-list')
      if (!response.ok) throw new Error('Failed to fetch motion list')
      const data: string[] = await response.json()
      setMotions(data)
    } catch (err) {
      console.error(err)
      setError(t('Motion.LoadError'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchMotions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleChange = (
    key: MotionField['key'],
    value: SettingsState[MotionField['key']]
  ) => {
    settingsStore.setState({ [key]: normalizePath(value) })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">{t('MotionSettings')}</h2>
          <p className="text-sm text-gray-700 whitespace-pre-line">
            {t('Motion.SettingsInfo')}
          </p>
        </div>
        <button
          className="px-3 py-2 bg-primary text-white rounded-lg hover:opacity-90 text-sm"
          onClick={fetchMotions}
          disabled={isLoading}
        >
          {isLoading ? t('Motion.Loading') : t('Motion.RefreshList')}
        </button>
      </div>

      {error && <div className="text-red-600 text-sm">{error}</div>}
      {!isLoading && motions.length === 0 && (
        <div className="text-sm text-gray-700 bg-white rounded-lg px-3 py-2">
          {t('Motion.EmptyList')}
        </div>
      )}

      <div className="grid gap-4">
        {motionFields.map((field) => {
          const currentValue = normalizePath(store[field.key])
          const hasCustomValue =
            currentValue &&
            !motions.some((motion) => normalizePath(motion) === currentValue)

          return (
            <div key={field.key} className="space-y-2">
              <label className="font-bold block">{t(field.labelKey)}</label>
              <select
                className="w-full px-3 py-2 rounded-lg bg-white hover:bg-white-hover text-sm"
                value={currentValue}
                onChange={(e) => handleChange(field.key, e.target.value)}
              >
                <option value="">{t('Motion.None')}</option>
                {hasCustomValue && (
                  <option value={currentValue}>
                    {t('Motion.CustomValue', { path: currentValue })}
                  </option>
                )}
                {motions.map((motion) => {
                  const normalizedMotion = normalizePath(motion)
                  return (
                    <option key={motion} value={normalizedMotion}>
                      {normalizedMotion}
                    </option>
                  )
                })}
              </select>
              <input
                type="text"
                className="w-full px-3 py-2 rounded-lg bg-white text-sm border border-gray-200"
                value={currentValue}
                onChange={(e) => handleChange(field.key, e.target.value)}
                placeholder={t('Motion.InputPlaceholder') || '/motions/happy.vrma'}
              />
              <p className="text-xs text-gray-600">
                {t('Motion.PathHelp')}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default Motion
