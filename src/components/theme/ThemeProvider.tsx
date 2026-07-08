'use client'

import React, { useEffect } from 'react'
import { ThemeProvider as NextThemeProvider, useTheme } from 'next-themes'

// Function to calculate relative luminance
function getRelativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r / 255, g / 255, b / 255].map(c =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  )
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

// Function to parse colors into RGB
function parseColor(colorStr: string): { r: number; g: number; b: number } | null {
  const clean = colorStr.trim().toLowerCase()
  if (clean.startsWith('#')) {
    const hex = clean.slice(1)
    if (hex.length === 3) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16),
      }
    } else if (hex.length === 6) {
      return {
        r: parseInt(clean.slice(1, 3), 16),
        g: parseInt(clean.slice(3, 5), 16),
        b: parseInt(clean.slice(5, 7), 16),
      }
    }
  } else if (clean.startsWith('rgb')) {
    const match = clean.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
    if (match) {
      return {
        r: parseInt(match[1], 10),
        g: parseInt(match[2], 10),
        b: parseInt(match[3], 10),
      }
    }
  }
  return null
}

function getContrastRatio(color1: string, color2: string): number {
  const c1 = parseColor(color1)
  const c2 = parseColor(color2)
  if (!c1 || !c2) return -1
  const l1 = getRelativeLuminance(c1.r, c1.g, c1.b)
  const l2 = getRelativeLuminance(c2.r, c2.g, c2.b)
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
}

function ContrastValidator() {
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    if (typeof window === 'undefined' || process.env.NODE_ENV !== 'development') return

    const checkContrast = () => {
      const styles = window.getComputedStyle(document.documentElement)
      const pairsToCheck = [
        { text: '--textPrimary', bg: '--bg', label: 'Primary Text on Background', min: 4.5 },
        { text: '--textPrimary', bg: '--card', label: 'Primary Text on Card', min: 4.5 },
        { text: '--textSecondary', bg: '--bg', label: 'Secondary Text on Background', min: 4.5 },
        { text: '--textSecondary', bg: '--card', label: 'Secondary Text on Card', min: 4.5 },
        { text: '--textMuted', bg: '--bg', label: 'Muted Text on Background', min: 3.0 },
        { text: '--textOnPrimary', bg: '--primary', label: 'Text on Primary Button', min: 4.5 },
        { text: '--successVibrant', bg: '--bg', label: 'Success Text on Background', min: 3.0 },
        { text: '--errorVibrant', bg: '--bg', label: 'Error Text on Background', min: 3.0 },
      ]

      console.log(`%c[Theme Contrast Audit] Checking contrast for: ${resolvedTheme}`, 'color: #D92D4A; font-weight: bold;')
      let failures = 0

      pairsToCheck.forEach(({ text, bg, label, min }) => {
        const textVal = styles.getPropertyValue(text).trim()
        const bgVal = styles.getPropertyValue(bg).trim()

        if (!textVal || !bgVal) {
          console.warn(`[Theme Contrast Audit] Missing values: ${text} (${textVal}) or ${bg} (${bgVal})`)
          return
        }

        const ratio = getContrastRatio(textVal, bgVal)
        if (ratio === -1) {
          console.warn(`[Theme Contrast Audit] Could not parse colors: ${text} (${textVal}) or ${bg} (${bgVal})`)
          return
        }

        if (ratio < min) {
          failures++
          console.warn(
            `%c[Theme Contrast Audit] ❌ FAILED ${label}: Ratio is ${ratio.toFixed(2)}:1 (Min required: ${min}:1)\n` +
            `  Text (${text}): ${textVal}\n` +
            `  Background (${bg}): ${bgVal}`,
            'color: #EF4444; font-weight: 500;'
          )
        } else {
          console.log(
            `%c[Theme Contrast Audit] ✅ PASSED ${label}: Ratio is ${ratio.toFixed(2)}:1`,
            'color: #22C55E;'
          )
        }
      })

      if (failures > 0) {
        console.warn(`%c[Theme Contrast Audit] ${failures} contrast violations found in theme "${resolvedTheme}". Please refine theme colors in globals.css.`, 'color: #EAB308; font-weight: bold;')
      } else {
        console.log(`%c[Theme Contrast Audit] All contrast pairs meet WCAG AA requirements!`, 'color: #22C55E; font-weight: bold;')
      }
    }

    const timeout = setTimeout(checkContrast, 300)
    return () => clearTimeout(timeout)
  }, [resolvedTheme])

  return null
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <ContrastValidator />
      {children}
    </NextThemeProvider>
  )
}
