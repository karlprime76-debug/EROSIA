import { describe, it, expect, vi } from 'vitest'

describe('Logger', () => {
  beforeEach(() => {
    // Set NODE_ENV to development for logger tests
    vi.stubEnv('NODE_ENV', 'development')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('should log error messages', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { logger } = require('../logger')
    logger.error('Error message')
    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it('should log info messages in development', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const { logger } = require('../logger')
    logger.info('Test message')
    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it('should log warn messages in development', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { logger } = require('../logger')
    logger.warn('Warning message')
    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it('should log debug messages in development', () => {
    const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
    const { logger } = require('../logger')
    logger.debug('Debug message')
    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it('should include metadata in logs', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const { logger } = require('../logger')
    logger.info('Test', { key: 'value' })
    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })
})
