const isDev = process.env.NODE_ENV === 'development'

type LogLevel = 'info' | 'warn' | 'error' | 'debug'

const prefix = '[Erosia]'

function log(level: LogLevel, message: string, meta?: unknown) {
  const ts = new Date().toISOString()
  const data = meta !== undefined ? meta : ''

  switch (level) {
    case 'error':
      console.error(`${prefix} [${ts}] ERROR: ${message}`, data)
      break
    case 'warn':
      if (isDev) console.warn(`${prefix} [${ts}] WARN: ${message}`, data)
      break
    case 'debug':
      if (isDev) console.debug(`${prefix} [${ts}] DEBUG: ${message}`, data)
      break
    default:
      if (isDev) console.log(`${prefix} [${ts}] ${message}`, data)
  }
}

export const logger = {
  info: (message: string, meta?: unknown) => log('info', message, meta),
  warn: (message: string, meta?: unknown) => log('warn', message, meta),
  error: (message: string, meta?: unknown) => log('error', message, meta),
  debug: (message: string, meta?: unknown) => log('debug', message, meta),
}
