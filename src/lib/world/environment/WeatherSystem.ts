import type { WeatherType, WeatherState } from '../types'

export function createWeatherState(weather?: WeatherType): WeatherState {
  const resolved = weather ?? 'clear'
  return {
    current: resolved,
    intensity: 1,
    transitionProgress: 0,
    cloudCoverage: resolved === 'clear' ? 0.1 : resolved === 'cloudy' ? 0.7 : resolved === 'light-rain' ? 0.9 : 0.3,
    windSpeed: resolved === 'windy' ? 8 : resolved === 'clear' ? 1 : resolved === 'light-rain' ? 4 : 2,
    rainIntensity: resolved === 'light-rain' ? 0.4 : 0,
    fogDensity: resolved === 'fog' ? 0.08 : resolved === 'clear' ? 0.002 : 0.01,
  }
}

export function transitionWeather(state: WeatherState, target: WeatherType): WeatherState {
  return {
    ...state,
    current: target,
    transitionProgress: 0,
    cloudCoverage: target === 'clear' ? 0.1 : target === 'cloudy' ? 0.7 : 0.9,
    windSpeed: target === 'windy' ? 8 : 2,
    rainIntensity: target === 'light-rain' ? 0.4 : 0,
    fogDensity: target === 'fog' ? 0.08 : 0.01,
  }
}

export function randomWeather(current?: WeatherType): WeatherType {
  const types: WeatherType[] = ['clear', 'cloudy', 'light-rain', 'fog', 'windy']
  const filtered = current ? types.filter(t => t !== current) : types
  return filtered[Math.floor(Math.random() * filtered.length)]
}
