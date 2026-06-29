import type { Vec3, Collider, PhysicsConfig } from '../types'

const DEFAULT_CONFIG: PhysicsConfig = {
  gravity: -9.81,
  maxVelocity: 20,
  friction: 0.8,
  collisionRadius: 0.5,
}

export function getDefaultPhysicsConfig(): PhysicsConfig {
  return { ...DEFAULT_CONFIG }
}

export function checkCollision(
  position: Vec3,
  colliders: Collider[],
  radius: number,
): Collider | null {
  for (const collider of colliders) {
    if (collider.type === 'sphere' && collider.radius) {
      const dx = position.x - collider.position.x
      const dy = position.y - collider.position.y
      const dz = position.z - collider.position.z
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
      if (dist < radius + collider.radius) return collider
    }

    if (collider.type === 'box' && collider.size) {
      const halfX = collider.size.x / 2
      const halfZ = collider.size.z / 2
      if (
        Math.abs(position.x - collider.position.x) < halfX + radius &&
        Math.abs(position.z - collider.position.z) < halfZ + radius
      ) {
        return collider
      }
    }
  }
  return null
}

export function resolveCollision(position: Vec3, collider: Collider, radius: number): Vec3 {
  if (collider.type === 'sphere' && collider.radius) {
    const dx = position.x - collider.position.x
    const dz = position.z - collider.position.z
    const dist = Math.sqrt(dx * dx + dz * dz)
    const overlap = radius + collider.radius - dist
    if (overlap > 0) {
      const nx = dx / dist
      const nz = dz / dist
      return { x: position.x + nx * overlap, y: position.y, z: position.z + nz * overlap }
    }
  }

  if (collider.type === 'box' && collider.size) {
    const halfX = collider.size.x / 2 + radius
    const halfZ = collider.size.z / 2 + radius
    return {
      x: Math.max(collider.position.x - halfX, Math.min(collider.position.x + halfX, position.x)),
      y: position.y,
      z: Math.max(collider.position.z - halfZ, Math.min(collider.position.z + halfZ, position.z)),
    }
  }

  return position
}
