import * as THREE from 'three'
import {
  VRM,
  VRMExpressionPresetName,
  VRMLoaderPlugin,
  VRMUtils,
} from '@pixiv/three-vrm'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { VRMAnimation } from '../../lib/VRMAnimation/VRMAnimation'
import { VRMLookAtSmootherLoaderPlugin } from '@/lib/VRMLookAtSmootherLoaderPlugin/VRMLookAtSmootherLoaderPlugin'
import { LipSync } from '../lipSync/lipSync'
import { EmoteController } from '../emoteController/emoteController'
import { Talk } from '../messages/messages'
import { loadVRMAnimation } from '@/lib/VRMAnimation/loadVRMAnimation'
import { buildUrl } from '@/utils/buildUrl'
import { EmotionType } from '../messages/messages'
import settingsStore from '../stores/settings'

/**
 * 3Dキャラクターを管理するクラス
 */
export class Model {
  public vrm?: VRM | null
  public mixer?: THREE.AnimationMixer
  public emoteController?: EmoteController

  private _lookAtTargetParent: THREE.Object3D
  private _lipSync?: LipSync
  private _motionCache: Map<string, VRMAnimation>
  private _idleAction?: THREE.AnimationAction
  private _currentMotionAction?: THREE.AnimationAction
  private _onMotionFinished: (event: THREE.Event) => void

  constructor(lookAtTargetParent: THREE.Object3D) {
    this._lookAtTargetParent = lookAtTargetParent
    this._lipSync = new LipSync(new AudioContext(), { forceStart: true })
    this._motionCache = new Map()
    this._onMotionFinished = (event: THREE.Event) => {
      const finishedAction = (event as any).action as
        | THREE.AnimationAction
        | undefined
      if (!finishedAction || finishedAction !== this._currentMotionAction) {
        return
      }
      this._currentMotionAction = undefined
      this._playIdleAction()
    }
  }

  public async loadVRM(url: string): Promise<void> {
    const loader = new GLTFLoader()
    loader.register(
      (parser) =>
        new VRMLoaderPlugin(parser, {
          lookAtPlugin: new VRMLookAtSmootherLoaderPlugin(parser),
        })
    )

    const gltf = await loader.loadAsync(url)

    const vrm = (this.vrm = gltf.userData.vrm)
    vrm.scene.name = 'VRMRoot'

    VRMUtils.rotateVRM0(vrm)
    this.mixer = new THREE.AnimationMixer(vrm.scene)

    this.emoteController = new EmoteController(vrm, this._lookAtTargetParent)
  }

  public unLoadVrm() {
    if (this.vrm) {
      VRMUtils.deepDispose(this.vrm.scene)
      this.vrm = null
    }
    this.mixer?.stopAllAction()
    this._idleAction = undefined
    this._currentMotionAction = undefined
    this._motionCache.clear()
  }

  /**
   * VRMアニメーションを読み込む
   *
   * https://github.com/vrm-c/vrm-specification/blob/master/specification/VRMC_vrm_animation-1.0/README.ja.md
   */
  public async loadAnimation(vrmAnimation: VRMAnimation): Promise<void> {
    const { vrm, mixer } = this
    if (vrm == null || mixer == null) {
      throw new Error('You have to load VRM first')
    }

    const action = this.createAction(vrmAnimation, { loop: true })
    this._idleAction = action
    action.play()
  }

  /**
   * 音声を再生し、リップシンクを行う
   */
  public async speak(
    buffer: ArrayBuffer,
    talk: Talk,
    isNeedDecode: boolean = true
  ) {
    this.emoteController?.playEmotion(talk.emotion)
    this.playEmotionMotion(talk.emotion).catch((error) =>
      console.error('Failed to play emotion motion:', error)
    )
    await new Promise((resolve) => {
      this._lipSync?.playFromArrayBuffer(
        buffer,
        () => {
          resolve(true)
        },
        isNeedDecode
      )
    })
  }

  /**
   * 現在の音声再生を停止
   */
  public stopSpeaking() {
    this._lipSync?.stopCurrentPlayback()
    this.stopEmotionMotion()
  }

  /**
   * 感情表現を再生する
   */
  public async playEmotion(preset: VRMExpressionPresetName) {
    this.emoteController?.playEmotion(preset)
  }

  public update(delta: number): void {
    if (this._lipSync) {
      const { volume } = this._lipSync.update()
      this.emoteController?.lipSync('aa', volume)
    }

    this.emoteController?.update(delta)
    this.mixer?.update(delta)
    this.vrm?.update(delta)
  }

  public async setIdleMotion(path: string) {
    if (!path) return
    const normalizedPath = this.normalizeMotionPath(path)
    const animation = await this.loadMotion(normalizedPath)
    if (!animation || !this.mixer) return

    if (this._idleAction) {
      this._idleAction.stop()
    }
    this._idleAction = this.createAction(animation, { loop: true })

    // すぐに再生中のモーションがない場合のみ再生
    if (!this._currentMotionAction) {
      this._playIdleAction()
    }
  }

  public async playEmotionMotion(emotion: EmotionType) {
    const ss = settingsStore.getState()
    const pathByEmotion: Record<EmotionType, string> = {
      neutral: ss.vrmNeutralMotion,
      happy: ss.vrmHappyMotion,
      angry: ss.vrmAngryMotion,
      sad: ss.vrmSadMotion,
      relaxed: ss.vrmRelaxedMotion,
      surprised: ss.vrmSurprisedMotion,
    }
    const motionPath = pathByEmotion[emotion]
    if (!motionPath) return

    const normalizedPath = this.normalizeMotionPath(motionPath)
    const animation = await this.loadMotion(normalizedPath)
    if (!animation || !this.mixer) return

    this._idleAction?.stop()
    this._currentMotionAction?.stop()
    this._currentMotionAction = this.createAction(animation, { loop: false })
    this.mixer.removeEventListener('finished', this._onMotionFinished)
    this.mixer.addEventListener('finished', this._onMotionFinished)
    this._currentMotionAction.play()
  }

  private stopEmotionMotion() {
    this._currentMotionAction?.stop()
    this._currentMotionAction = undefined
    this._playIdleAction()
  }

  private _playIdleAction() {
    if (!this._idleAction) return
    this._idleAction.reset()
    this._idleAction.play()
  }

  private normalizeMotionPath(path: string) {
    return path.startsWith('/') ? path : `/${path}`
  }

  private async loadMotion(path: string): Promise<VRMAnimation | null> {
    if (this._motionCache.has(path)) {
      return this._motionCache.get(path) || null
    }

    try {
      const motion = await loadVRMAnimation(buildUrl(path))
      if (motion) {
        this._motionCache.set(path, motion)
      }
      return motion
    } catch (error) {
      console.error(`Failed to load motion at ${path}:`, error)
      return null
    }
  }

  private createAction(
    vrmAnimation: VRMAnimation,
    options: { loop: boolean }
  ): THREE.AnimationAction {
    const { vrm, mixer } = this
    if (!vrm || !mixer) {
      throw new Error('You have to load VRM first')
    }
    const clip = vrmAnimation.createAnimationClip(vrm)
    const action = mixer.clipAction(clip)
    if (options.loop) {
      action.setLoop(THREE.LoopRepeat, Infinity)
      action.clampWhenFinished = false
    } else {
      action.setLoop(THREE.LoopOnce, 1)
      action.clampWhenFinished = true
    }
    action.reset()
    return action
  }
}
