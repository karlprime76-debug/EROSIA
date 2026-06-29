import { describe, it, expect } from 'vitest'

// ── DayNightCycle ──────────────────────────────
import { getPhase, computeDayNightState, advanceTime } from './environment/DayNightCycle'

describe('DayNightCycle', () => {
  it('returns correct phase for each time range', () => {
    expect(getPhase(0)).toBe('night')
    expect(getPhase(4)).toBe('night')
    expect(getPhase(5)).toBe('dawn')
    expect(getPhase(6)).toBe('dawn')
    expect(getPhase(7)).toBe('morning')
    expect(getPhase(11)).toBe('morning')
    expect(getPhase(12)).toBe('noon')
    expect(getPhase(16)).toBe('noon')
    expect(getPhase(17)).toBe('dusk')
    expect(getPhase(18)).toBe('dusk')
    expect(getPhase(19)).toBe('night')
    expect(getPhase(23)).toBe('night')
  })

  it('computeDayNightState returns all fields', () => {
    const state = computeDayNightState(12)
    expect(state.phase).toBe('noon')
    expect(state.timeOfDay).toBe(12)
    expect(state.sunAltitude).toBeGreaterThan(0)
    expect(state.ambientIntensity).toBe(1.0)
    expect(state.directionalIntensity).toBe(1.2)
    expect(state.hemisphereColor).toBe('#FFFFFF')
    expect(state.fogColor).toBe('#F0F4F8')
    expect(state.fogDensity).toBe(0.002)
  })

  it('night state has low light', () => {
    const state = computeDayNightState(0)
    expect(state.phase).toBe('night')
    expect(state.ambientIntensity).toBe(0.1)
    expect(state.directionalIntensity).toBe(0.05)
    expect(state.hemisphereColor).toBe('#0A0A2E')
    expect(state.sunAltitude).toBe(0)
  })

  it('advanceTime wraps around 24h', () => {
    const state = computeDayNightState(22)
    const next = advanceTime(state, 4)
    expect(next.timeOfDay).toBe(2)
    expect(next.phase).toBe('night')
  })

  it('advanceTime transitions phases correctly', () => {
    const state = computeDayNightState(6)
    expect(state.phase).toBe('dawn')
    const next = advanceTime(state, 2)
    expect(next.phase).toBe('morning')
  })
})

// ── WeatherSystem ──────────────────────────────
import { createWeatherState, transitionWeather, randomWeather } from './environment/WeatherSystem'

describe('WeatherSystem', () => {
  it('creates clear weather by default', () => {
    const state = createWeatherState()
    expect(state.current).toBe('clear')
    expect(state.intensity).toBe(1)
    expect(state.rainIntensity).toBe(0)
    expect(state.cloudCoverage).toBe(0.1)
  })

  it('creates specified weather', () => {
    const state = createWeatherState('light-rain')
    expect(state.current).toBe('light-rain')
    expect(state.rainIntensity).toBe(0.4)
    expect(state.cloudCoverage).toBe(0.9)
  })

  it('fog has high fog density', () => {
    const state = createWeatherState('fog')
    expect(state.fogDensity).toBe(0.08)
    expect(state.windSpeed).toBe(2)
  })

  it('windy has high wind speed', () => {
    const state = createWeatherState('windy')
    expect(state.windSpeed).toBe(8)
  })

  it('transitionWeather switches to target', () => {
    const clear = createWeatherState('clear')
    const rainy = transitionWeather(clear, 'light-rain')
    expect(rainy.current).toBe('light-rain')
    expect(rainy.rainIntensity).toBe(0.4)
    expect(rainy.transitionProgress).toBe(0)
  })

  it('randomWeather returns a valid type', () => {
    const result = randomWeather()
    expect(['clear', 'cloudy', 'light-rain', 'fog', 'windy']).toContain(result)
  })

  it('randomWeather excludes current when provided', () => {
    for (let i = 0; i < 50; i++) {
      const result = randomWeather('clear')
      expect(result).not.toBe('clear')
    }
  })
})

// ── AnimationController ────────────────────────
import { canTransition, getCrossfadeDuration, ANIMATION_TRANSITIONS, ANIMATION_SPEEDS, ANIMATION_LOOPS } from './avatar/AnimationController'

describe('AnimationController', () => {
  it('can transition from idle to all valid animations', () => {
    expect(canTransition('idle', 'walking')).toBe(true)
    expect(canTransition('idle', 'standing')).toBe(true)
    expect(canTransition('idle', 'waving')).toBe(true)
    expect(canTransition('idle', 'sitting')).toBe(true)
  })

  it('cannot transition from idle to running directly', () => {
    expect(canTransition('idle', 'running')).toBe(false)
  })

  it('same animation is always valid', () => {
    expect(canTransition('dancing', 'dancing')).toBe(true)
  })

  it('every animation has a transition entry', () => {
    const all = ['idle', 'standing', 'walking', 'running', 'sitting', 'waving', 'dancing', 'turning', 'floating']
    for (const anim of all) {
      expect(ANIMATION_TRANSITIONS[anim as keyof typeof ANIMATION_TRANSITIONS]).toBeDefined()
      expect(ANIMATION_SPEEDS[anim as keyof typeof ANIMATION_SPEEDS]).toBeDefined()
      expect(ANIMATION_LOOPS[anim as keyof typeof ANIMATION_LOOPS]).toBeDefined()
    }
  })

  it('returns crossfade duration 0 for same animation', () => {
    expect(getCrossfadeDuration('walking', 'walking')).toBe(0)
  })

  it('returns crossfade from idle', () => {
    expect(getCrossfadeDuration('idle', 'walking')).toBe(0.2)
  })

  it('returns crossfade to idle', () => {
    expect(getCrossfadeDuration('running', 'idle')).toBe(0.3)
  })
})

// ── AvatarSystem ───────────────────────────────
import { createInitialState, createDefaultPreset, computeMovement, setAnimation, setPosition, snapRotation } from './avatar/AvatarSystem'

describe('AvatarSystem', () => {
  it('creates initial state with defaults', () => {
    const state = createInitialState()
    expect(state.position).toEqual({ x: 0, y: 0, z: 0 })
    expect(state.rotation).toBe(0)
    expect(state.animation).toBe('idle')
    expect(state.isMoving).toBe(false)
  })

  it('creates initial state with zone', () => {
    const state = createInitialState('beach-club')
    expect(state.zoneId).toBe('beach-club')
  })

  it('createDefaultPreset returns static preset', () => {
    const preset = createDefaultPreset()
    expect(preset.id).toBe('default')
    expect(preset.skinTone).toBe('#F5D0B0')
    expect(preset.accessories).toEqual([])
  })

  it('computeMovement moves forward', () => {
    const state = createInitialState()
    const result = computeMovement(state, { forward: true, backward: false, left: false, right: false, run: false }, 1)
    expect(result.position.z).toBe(-4)
    expect(result.position.x).toBe(0)
    expect(result.isMoving).toBe(true)
    expect(result.animation).toBe('walking')
  })

  it('computeMovement runs when run is pressed', () => {
    const state = createInitialState()
    const result = computeMovement(state, { forward: true, backward: false, left: false, right: false, run: true }, 1)
    expect(result.position.z).toBe(-8)
    expect(result.animation).toBe('running')
  })

  it('computeMovement moves backward slower', () => {
    const state = createInitialState()
    const result = computeMovement(state, { forward: false, backward: true, left: false, right: false, run: false }, 1)
    expect(result.position.z).toBe(2)
  })

  it('computeMovement moves diagonally', () => {
    const state = createInitialState()
    const result = computeMovement(state, { forward: true, backward: false, left: true, right: false, run: false }, 1)
    expect(result.position.x).toBeLessThan(0)
    expect(result.position.z).toBeLessThan(0)
    expect(result.isMoving).toBe(true)
  })

  it('computeMovement stays idle with no input', () => {
    const state = createInitialState()
    const result = computeMovement(state, { forward: false, backward: false, left: false, right: false, run: false }, 1)
    expect(result.animation).toBe('idle')
    expect(result.isMoving).toBe(false)
    expect(result.position).toEqual(state.position)
  })

  it('setAnimation changes animation', () => {
    const state = createInitialState()
    const result = setAnimation(state, 'dancing')
    expect(result.animation).toBe('dancing')
    expect(result.isMoving).toBe(false)
    expect(result.speed).toBe(0)
  })

  it('setPosition moves avatar', () => {
    const state = createInitialState()
    const result = setPosition(state, { x: 10, y: 0, z: -5 })
    expect(result.position).toEqual({ x: 10, y: 0, z: -5 })
    expect(result.animation).toBe('idle')
  })

  it('snapRotation sets rotation', () => {
    const state = createInitialState()
    const result = snapRotation(state, Math.PI)
    expect(result.rotation).toBe(Math.PI)
  })
})

// ── CameraController ───────────────────────────
import { createCameraState, switchMode, rotateCamera, zoomCamera, lookAt, createCinematicShot, computeCameraPosition } from './camera/CameraController'

describe('CameraController', () => {
  it('creates third-person camera by default', () => {
    const cam = createCameraState('third-person')
    expect(cam.mode).toBe('third-person')
    expect(cam.distance).toBe(6)
    expect(cam.azimuth).toBe(0.3)
    expect(cam.elevation).toBe(0.4)
  })

  it('creates free camera', () => {
    const cam = createCameraState('free')
    expect(cam.mode).toBe('free')
    expect(cam.distance).toBe(0)
    expect(cam.fov).toBe(60)
  })

  it('switchMode toggles between modes', () => {
    const cam = createCameraState('third-person')
    const free = switchMode(cam, 'free')
    expect(free.mode).toBe('free')
    expect(free.distance).toBe(0)
    expect(free.fov).toBe(60)
  })

  it('rotateCamera updates azimuth and clamps elevation', () => {
    const cam = createCameraState('third-person')
    const rotated = rotateCamera(cam, 0.5, 0.3)
    expect(rotated.azimuth).toBeCloseTo(0.8)
    expect(rotated.elevation).toBeCloseTo(0.7)
  })

  it('rotateCamera clamps elevation to [-1, 1]', () => {
    const cam = createCameraState('third-person', { x: 0, y: 1, z: 0 })
    const rotated = rotateCamera(cam, 0, 2)
    expect(rotated.elevation).toBe(1)
  })

  it('zoomCamera changes distance within bounds', () => {
    const cam = createCameraState('third-person')
    const zoomed = zoomCamera(cam, 5)
    expect(zoomed.distance).toBeGreaterThan(6)
    const zoomedIn = zoomCamera(cam, -3)
    expect(zoomedIn.distance).toBeLessThan(6)
  })

  it('zoomCamera does nothing in free mode', () => {
    const cam = createCameraState('free')
    const zoomed = zoomCamera(cam, 5)
    expect(zoomed.distance).toBe(0)
  })

  it('lookAt changes target', () => {
    const cam = createCameraState('third-person')
    const result = lookAt(cam, { x: 5, y: 2, z: -3 })
    expect(result.target).toEqual({ x: 5, y: 2, z: -3 })
  })

  it('createCinematicShot returns shot config', () => {
    const shot = createCinematicShot({ x: 0, y: 2, z: 5 }, { x: 0, y: 0, z: 0 })
    expect(shot.duration).toBe(2)
    expect(shot.easing).toBe('smooth')
  })

  it('computeCameraPosition returns position behind target based on angles', () => {
    const cam = createCameraState('third-person', { x: 0, y: 1, z: 0 })
    const result = computeCameraPosition(cam)
    expect(result.target).toEqual({ x: 0, y: 1, z: 0 })
    expect(typeof result.position.x).toBe('number')
    expect(typeof result.position.y).toBe('number')
    expect(typeof result.position.z).toBe('number')
  })
})

// ── PhysicsController ──────────────────────────
import { checkCollision, resolveCollision, getDefaultPhysicsConfig } from './physics/PhysicsController'
import type { Collider } from './types'

describe('PhysicsController', () => {
  const sphereCollider: Collider = { id: 'ball', type: 'sphere', position: { x: 0, y: 0, z: 0 }, radius: 2 }
  const boxCollider: Collider = { id: 'wall', type: 'box', position: { x: 10, y: 0, z: 5 }, size: { x: 4, y: 3, z: 2 } }

  it('getDefaultPhysicsConfig returns config', () => {
    const config = getDefaultPhysicsConfig()
    expect(config.gravity).toBe(-9.81)
    expect(config.collisionRadius).toBe(0.5)
  })

  it('detects sphere collision', () => {
    const pos = { x: 1, y: 0, z: 0 }
    const result = checkCollision(pos, [sphereCollider], 0.5)
    expect(result).not.toBeNull()
    expect(result!.id).toBe('ball')
  })

  it('returns null when no sphere collision', () => {
    const pos = { x: 10, y: 0, z: 10 }
    const result = checkCollision(pos, [sphereCollider], 0.5)
    expect(result).toBeNull()
  })

  it('detects box collision', () => {
    const pos = { x: 10, y: 0, z: 5 }
    const result = checkCollision(pos, [boxCollider], 0.5)
    expect(result).not.toBeNull()
    expect(result!.id).toBe('wall')
  })

  it('returns null when no box collision', () => {
    const pos = { x: 100, y: 0, z: 100 }
    const result = checkCollision(pos, [boxCollider], 0.5)
    expect(result).toBeNull()
  })

  it('resolves sphere collision by pushing out', () => {
    const pos = { x: 1, y: 0, z: 0 }
    const resolved = resolveCollision(pos, sphereCollider, 0.5)
    const dx = resolved.x - sphereCollider.position.x
    const dz = resolved.z - sphereCollider.position.z
    const dist = Math.sqrt(dx * dx + dz * dz)
    expect(dist).toBeGreaterThanOrEqual(2.5 - 0.001)
  })

  it('resolves box collision by clamping', () => {
    const pos = { x: 20, y: 0, z: 5 }
    const resolved = resolveCollision(pos, boxCollider, 0.5)
    expect(resolved.x).toBeLessThanOrEqual(12.5)
    expect(resolved.x).toBeGreaterThanOrEqual(7.5)
  })
})

// ── PresenceManager ────────────────────────────
import { createPresencePayload, interpolatePosition, isPresenceStale, computeDistance } from './networking/PresenceManager'

describe('PresenceManager', () => {
  it('creates presence payload from avatar state', () => {
    const state = createInitialState('beach-club')
    const preset = createDefaultPreset()
    const payload = createPresencePayload('user-1', state, preset)
    expect(payload.userId).toBe('user-1')
    expect(payload.zoneId).toBe('beach-club')
    expect(payload.preset.id).toBe('default')
    expect(typeof payload.lastUpdate).toBe('number')
  })

  it('interpolates position linearly', () => {
    const from = { x: 0, y: 0, z: 0 }
    const to = { x: 10, y: 5, z: -10 }
    const mid = interpolatePosition(from, to, 0.5)
    expect(mid.x).toBe(5)
    expect(mid.y).toBe(2.5)
    expect(mid.z).toBe(-5)
  })

  it('interpolates at 0 returns from', () => {
    expect(interpolatePosition({ x: 1, y: 2, z: 3 }, { x: 10, y: 20, z: 30 }, 0))
      .toEqual({ x: 1, y: 2, z: 3 })
  })

  it('interpolates at 1 returns to', () => {
    expect(interpolatePosition({ x: 1, y: 2, z: 3 }, { x: 10, y: 20, z: 30 }, 1))
      .toEqual({ x: 10, y: 20, z: 30 })
  })

  it('isPresenceStale detects stale data', () => {
    const state = createInitialState()
    const preset = createDefaultPreset()
    const payload = createPresencePayload('user-1', state, preset)
    payload.lastUpdate = Date.now() - 20000
    expect(isPresenceStale(payload, 10000)).toBe(true)
  })

  it('isPresenceStale returns false for fresh data', () => {
    const state = createInitialState()
    const preset = createDefaultPreset()
    const payload = createPresencePayload('user-1', state, preset)
    expect(isPresenceStale(payload, 10000)).toBe(false)
  })

  it('computeDistance returns correct 3D distance', () => {
    const dist = computeDistance({ x: 0, y: 0, z: 0 }, { x: 3, y: 4, z: 0 })
    expect(dist).toBe(5)
  })

  it('computeDistance returns 0 for same point', () => {
    expect(computeDistance({ x: 1, y: 2, z: 3 }, { x: 1, y: 2, z: 3 })).toBe(0)
  })
})

// ── NPCManager ─────────────────────────────────
import { generateNPCs, getNPCsByZone, getNPCById } from './npc/NPCManager'

describe('NPCManager', () => {
  it('generates 14 NPCs', () => {
    const npcs = generateNPCs()
    expect(npcs).toHaveLength(14)
  })

  it('each NPC has required fields', () => {
    for (const npc of generateNPCs()) {
      expect(npc.id).toBeTruthy()
      expect(npc.name).toBeTruthy()
      expect(npc.zoneId).toBeTruthy()
      expect(typeof npc.rotation).toBe('number')
      expect(['idle', 'walking', 'sitting', 'dancing', 'standing']).toContain(npc.animation)
    }
  })

  it('getNPCsByZone filters by zone', () => {
    const beachNPCs = getNPCsByZone('beach-club')
    expect(beachNPCs.length).toBeGreaterThan(0)
    for (const npc of beachNPCs) {
      expect(npc.zoneId).toBe('beach-club')
    }
  })

  it('getNPCById finds NPC', () => {
    const npc = getNPCById('npc-1')
    expect(npc).not.toBeUndefined()
    expect(npc!.name).toBe('Diego')
  })

  it('getNPCById returns undefined for missing', () => {
    expect(getNPCById('nonexistent')).toBeUndefined()
  })
})

// ── World Zone Registry ────────────────────────
import { getZone, getAllZones, findZoneAt, isInZone, getZoneConnections } from './world/zones'

describe('ZoneRegistry', () => {
  it('returns 7 zones', () => {
    expect(getAllZones()).toHaveLength(7)
  })

  it('each zone has required properties', () => {
    for (const zone of getAllZones()) {
      expect(zone.id).toBeTruthy()
      expect(zone.name).toBeTruthy()
      expect(zone.center).toBeDefined()
      expect(zone.radius).toBeGreaterThan(0)
      expect(zone.teleporters).toBeDefined()
      expect(zone.interactions).toBeDefined()
      expect(zone.spawnPoint).toBeDefined()
    }
  })

  it('getZone returns zone by id', () => {
    const zone = getZone('beach-club')
    expect(zone).not.toBeUndefined()
    expect(zone!.name).toBe('Beach Club')
  })

  it('getZone returns undefined for unknown id', () => {
    expect(getZone('unknown' as any)).toBeUndefined()
  })

  it('isInZone detects position inside zone', () => {
    const zone = getZone('beach-club')!
    const pos = { x: zone.center.x, z: zone.center.z }
    expect(isInZone(pos, 'beach-club')).toBe(true)
  })

  it('isInZone detects position outside zone', () => {
    expect(isInZone({ x: 9999, z: 9999 }, 'beach-club')).toBe(false)
  })

  it('findZoneAt matches correct zone', () => {
    const zone = getZone('beach-club')!
    const pos = { x: zone.center.x, z: zone.center.z }
    expect(findZoneAt(pos)).toBe('beach-club')
  })

  it('findZoneAt returns null for nowhere', () => {
    expect(findZoneAt({ x: 9999, z: 9999 })).toBeNull()
  })

  it('getZoneConnections returns unique target zones', () => {
    const connections = getZoneConnections('beach-club')
    expect(connections.length).toBeGreaterThan(0)
    for (const target of connections) {
      expect(getZone(target)).toBeDefined()
    }
  })
})

// ── Teleporters ────────────────────────────────
import { getAllTeleporters, getTeleportersForZone, findTeleporterAt, teleport } from './world/teleporters'

describe('Teleporters', () => {
  it('all zones have teleporters', () => {
    const all = getAllTeleporters()
    expect(all.length).toBeGreaterThanOrEqual(7)
  })

  it('getTeleportersForZone returns zone teleporters', () => {
    const tps = getTeleportersForZone('beach-club')
    expect(tps.length).toBeGreaterThan(0)
  })

  it('findTeleporterAt finds closest teleporter', () => {
    const tps = getTeleportersForZone('beach-club')
    if (tps.length > 0) {
      const tp = tps[0]
      const found = findTeleporterAt(tp.position, 'beach-club')
      expect(found).not.toBeNull()
      expect(found!.id).toBe(tp.id)
    }
  })

  it('teleport returns target zone and position', () => {
    const result = teleport('beach-club', getTeleportersForZone('beach-club')[0]?.id ?? '')
    if (result) {
      expect(result.targetZone).toBeTruthy()
      expect(result.targetPosition).toBeDefined()
    }
  })

  it('teleport returns null for unknown teleporter', () => {
    expect(teleport('beach-club', 'nonexistent')).toBeNull()
  })
})

// ── AssetStreamer ──────────────────────────────
import { createAssetManifest, createAssetQueue, getVisibleAssets } from './streaming/AssetStreamer'

describe('AssetStreamer', () => {
  it('creates asset manifest', () => {
    const manifest = createAssetManifest('test-1', '/models/test.glb', 'model', 1024)
    expect(manifest.id).toBe('test-1')
    expect(manifest.url).toBe('/models/test.glb')
    expect(manifest.type).toBe('model')
    expect(manifest.size).toBe(1024)
  })

  it('creates asset queue from manifests', () => {
    const manifests = [createAssetManifest('a', '/a.glb', 'model', 100), createAssetManifest('b', '/b.webp', 'texture', 200)]
    const queue = createAssetQueue(manifests)
    expect(queue.length).toBe(2)
    expect(queue[0].manifest.id).toBe('a')
    expect(typeof queue[0].priority).toBe('number')
  })

  it('getVisibleAssets returns manifests for zones', () => {
    const assets = getVisibleAssets(['beach-club'], { distance: 0, detail: 'high', polygonScale: 1, textureQuality: 1 })
    expect(assets.length).toBe(3)
    for (const asset of assets) {
      expect(asset.url).toContain('beach-club')
    }
  })
})
