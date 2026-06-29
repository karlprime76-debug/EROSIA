// ──────────────────────────────────────────────
// Erosia Island — Core Types
// ──────────────────────────────────────────────

export type ZoneId = 'beach-club' | 'rooftop-lounge' | 'coffee-house' | 'night-club' | 'garden' | 'vip-area' | 'sunset-pier'

export interface ZoneDefinition {
  id: ZoneId
  name: string
  description: string
  center: Vec3
  radius: number
  capacity: number
  ambientColor: string
  groundColor: string
  music: string
  objects: string[]
  teleporters: Teleporter[]
  interactions: InteractionPoint[]
  spawnPoint: Vec3
}

export interface Vec3 {
  x: number; y: number; z: number
}

export interface Teleporter {
  id: string
  position: Vec3
  targetZone: ZoneId
  targetPosition: Vec3
  label: string
}

export interface InteractionPoint {
  id: string
  type: 'bench' | 'sofa' | 'bar' | 'pool' | 'bonfire' | 'pier' | 'dancefloor'
  position: Vec3
  rotation: number
  label: string
  animation: AvatarAnimation
  capacity: number
}

// ── Avatar ────────────────────────────────────

export type AvatarAnimation = 'idle' | 'standing' | 'walking' | 'running' | 'sitting' | 'waving' | 'dancing' | 'turning' | 'floating'

export interface AvatarState {
  position: Vec3
  rotation: number
  animation: AvatarAnimation
  zoneId: ZoneId | null
  isMoving: boolean
  speed: number
}

export interface AvatarPreset {
  id: string
  skinTone: string
  hairStyle: string
  hairColor: string
  outfit: string
  outfitColor: string
  accessories: string[]
}

// ── Camera ────────────────────────────────────

export type CameraMode = 'third-person' | 'free' | 'orbit' | 'cinematic'

export interface CameraState {
  mode: CameraMode
  target: Vec3
  distance: number
  azimuth: number
  elevation: number
  fov: number
  smoothSpeed: number
}

export interface CinematicShot {
  from: Vec3
  to: Vec3
  duration: number
  easing: 'linear' | 'ease-in' | 'ease-out' | 'smooth'
}

// ── Environment ───────────────────────────────

export type WeatherType = 'clear' | 'cloudy' | 'light-rain' | 'fog' | 'windy'

export type DayPhase = 'dawn' | 'morning' | 'noon' | 'dusk' | 'night'

export interface DayNightState {
  phase: DayPhase
  timeOfDay: number       // 0-24
  sunAltitude: number     // radians
  sunAzimuth: number
  ambientIntensity: number
  directionalIntensity: number
  hemisphereColor: string
  fogColor: string
  fogDensity: number
}

export interface WeatherState {
  current: WeatherType
  intensity: number        // 0-1
  transitionProgress: number
  cloudCoverage: number
  windSpeed: number
  rainIntensity: number
  fogDensity: number
}

// ── Audio ─────────────────────────────────────

export interface AudioZone {
  id: string
  zoneId: ZoneId
  type: 'ambient' | 'music' | 'sfx'
  url: string
  position: Vec3
  radius: number
  volume: number
  loop: boolean
}

export interface SpatialAudioSource {
  id: string
  url: string
  position: Vec3
  volume: number
  playbackRate: number
  loop: boolean
  spatialBlend: number   // 0=2D, 1=3D
}

// ── Physics ───────────────────────────────────

export interface Collider {
  id: string
  type: 'box' | 'sphere' | 'mesh'
  position: Vec3
  size?: Vec3
  radius?: number
}

export interface PhysicsConfig {
  gravity: number
  maxVelocity: number
  friction: number
  collisionRadius: number
}

// ── Networking ────────────────────────────────

export interface RemoteAvatarData {
  userId: string
  position: Vec3
  rotation: number
  animation: AvatarAnimation
  zoneId: ZoneId | null
  preset: AvatarPreset
  lastUpdate: number
}

// ── LOD ───────────────────────────────────────

export interface LODLevel {
  distance: number
  detail: 'high' | 'medium' | 'low' | 'culled'
  polygonScale: number
  textureQuality: number
}

// ── Streaming ─────────────────────────────────

export interface AssetManifest {
  id: string
  url: string
  type: 'model' | 'texture' | 'audio' | 'animation'
  size: number
  dependencies: string[]
  lodLevels: string[]
}

// ── Mobile ────────────────────────────────────

export interface MobileConfig {
  pixelRatio: number
  shadowMapSize: number
  maxLights: number
  disablePostProcessing: boolean
  disableShadows: boolean
  textureQuality: 'high' | 'medium' | 'low'
}

// ── Performance ───────────────────────────────

export interface PerformanceStats {
  fps: number
  drawCalls: number
  triangles: number
  textures: number
  memory: number
  deviceScale: number
  isMobile: boolean
}
