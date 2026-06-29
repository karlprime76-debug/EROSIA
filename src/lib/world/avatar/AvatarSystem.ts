import type { AvatarState, AvatarPreset, AvatarAnimation, Vec3, ZoneId } from '../types'

const DEFAULT_PRESET: AvatarPreset = {
  id: 'default',
  skinTone: '#F5D0B0',
  hairStyle: 'short',
  hairColor: '#2C1810',
  outfit: 'casual',
  outfitColor: '#D92D4A',
  accessories: [],
}

const WALK_SPEED = 4
const RUN_SPEED = 8

export function createInitialState(zoneId?: ZoneId): AvatarState {
  return {
    position: { x: 0, y: 0, z: 0 },
    rotation: 0,
    animation: 'idle',
    zoneId: zoneId ?? null,
    isMoving: false,
    speed: 0,
  }
}

export function createDefaultPreset(): AvatarPreset {
  return { ...DEFAULT_PRESET }
}

export function computeMovement(
  state: AvatarState,
  input: { forward: boolean; backward: boolean; left: boolean; right: boolean; run: boolean },
  delta: number,
): AvatarState {
  let moveX = 0
  let moveZ = 0
  let speed = 0
  let anim: AvatarAnimation = 'idle'
  let rotation = state.rotation

  if (input.forward) { moveZ -= 1; speed = input.run ? RUN_SPEED : WALK_SPEED }
  if (input.backward) { moveZ += 1; speed = WALK_SPEED * 0.5 }
  if (input.left) { moveX -= 1 }
  if (input.right) { moveX += 1 }

  const isMoving = moveX !== 0 || moveZ !== 0

  if (isMoving) {
    const angle = Math.atan2(moveX, moveZ)
    rotation = angle
    anim = input.run ? 'running' : 'walking'
  }

  return {
    ...state,
    position: {
      x: state.position.x + moveX * speed * delta,
      y: 0,
      z: state.position.z + moveZ * speed * delta,
    },
    rotation,
    animation: anim,
    isMoving,
    speed,
  }
}

export function setAnimation(state: AvatarState, animation: AvatarAnimation): AvatarState {
  return { ...state, animation, isMoving: false, speed: 0 }
}

export function setPosition(state: AvatarState, position: Vec3): AvatarState {
  return { ...state, position, isMoving: false, speed: 0, animation: 'idle' }
}

export function snapRotation(state: AvatarState, targetRotation: number): AvatarState {
  return { ...state, rotation: targetRotation }
}
