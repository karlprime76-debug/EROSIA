import type { CameraMode, CameraState, Vec3, CinematicShot } from '../types'

const THIRD_PERSON_DEFAULTS: Partial<CameraState> = {
  distance: 6,
  azimuth: 0.3,
  elevation: 0.4,
  fov: 50,
  smoothSpeed: 4,
}

const FREE_CAMERA_DEFAULTS: Partial<CameraState> = {
  distance: 0,
  azimuth: 0,
  elevation: 0.2,
  fov: 60,
  smoothSpeed: 6,
}

export function createCameraState(mode: CameraMode, target?: Vec3): CameraState {
  const defaults = mode === 'free' ? FREE_CAMERA_DEFAULTS : THIRD_PERSON_DEFAULTS
  return {
    mode,
    target: target ?? { x: 0, y: 1, z: 0 },
    distance: defaults.distance ?? 6,
    azimuth: defaults.azimuth ?? 0.3,
    elevation: defaults.elevation ?? 0.4,
    fov: defaults.fov ?? 50,
    smoothSpeed: defaults.smoothSpeed ?? 4,
  }
}

export function switchMode(state: CameraState, newMode: CameraMode): CameraState {
  const defaults = newMode === 'free' ? FREE_CAMERA_DEFAULTS : THIRD_PERSON_DEFAULTS
  return {
    ...state,
    mode: newMode,
    distance: defaults.distance ?? state.distance,
    fov: defaults.fov ?? state.fov,
    smoothSpeed: defaults.smoothSpeed ?? state.smoothSpeed,
  }
}

export function rotateCamera(state: CameraState, deltaAzimuth: number, deltaElevation: number): CameraState {
  return {
    ...state,
    azimuth: state.azimuth + deltaAzimuth,
    elevation: Math.max(-1, Math.min(1, state.elevation + deltaElevation)),
  }
}

export function zoomCamera(state: CameraState, delta: number): CameraState {
  if (state.mode === 'free') return state
  return {
    ...state,
    distance: Math.max(2, Math.min(20, state.distance + delta * (state.distance * 0.1))),
  }
}

export function lookAt(state: CameraState, target: Vec3): CameraState {
  return { ...state, target }
}

export function createCinematicShot(from: Vec3, to: Vec3, duration = 2): CinematicShot {
  return { from, to, duration, easing: 'smooth' }
}

export function computeCameraPosition(state: CameraState): { position: Vec3; target: Vec3 } {
  const dist = state.distance
  const az = state.azimuth
  const el = state.elevation

  const x = state.target.x + dist * Math.cos(el) * Math.sin(az)
  const y = state.target.y + dist * Math.sin(el)
  const z = state.target.z + dist * Math.cos(el) * Math.cos(az)

  return {
    position: { x, y, z },
    target: state.target,
  }
}
