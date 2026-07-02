import { SignJWT, jwtVerify } from 'jose'

const getSecret = () => new TextEncoder().encode(
  process.env.CUSTOM_AUTH_SECRET ?? 'erosia-custom-auth-fallback-secret-do-not-use-in-prod'
)

export interface CustomAuthPayload {
  sub: string
  email: string
}

export async function signToken(userId: string, email: string): Promise<string> {
  return new SignJWT({ sub: userId, email })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .setIssuedAt()
    .sign(getSecret())
}

export async function verifyToken(token: string): Promise<CustomAuthPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ['HS256'] })
    if (typeof payload.sub !== 'string' || typeof payload.email !== 'string') return null
    return { sub: payload.sub, email: payload.email }
  } catch {
    return null
  }
}
