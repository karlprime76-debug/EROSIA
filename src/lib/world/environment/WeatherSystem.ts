import type { WeatherType, WeatherState } from '../types'

export function createWeatherState(weather?: WeatherType): WeatherState {
  return {
    current: weather ?? 'clear',
    intensity: 1,
    transitionProgress: 0,
    cloudCoverage: weather === 'clear' ? 0.1 : weather === 'cloudy' ? 0.7 : weather === 'light-rain' ? 0.9 : 0.3,
    windSpeed: weather === 'windy' ? 8 : weather === 'clear' ? 1 : weather === 'light-rain' ? 4 : 2,
    rainIntensity: weather === 'light-rain' ? 0.4 : 0,
    fogDensity: weather === 'fog' ? 0.08 : weather === 'clear' ? 0.002 : 0.01,
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
