'use client'

import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    google: any
    initGoogleMapsPlaces?: () => void
  }
}

let scriptState: 'idle' | 'loading' | 'ready' = 'idle'
const queue: (() => void)[] = []

function loadScript(apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Già pronto
    if (typeof window !== 'undefined' && window.google?.maps?.places) {
      scriptState = 'ready'
      resolve()
      return
    }
    if (scriptState === 'ready') { resolve(); return }
    queue.push(resolve)
    if (scriptState === 'loading') return

    scriptState = 'loading'

    window.initGoogleMapsPlaces = () => {
      scriptState = 'ready'
      queue.forEach(fn => fn())
      queue.length = 0
    }

    const s = document.createElement('script')
    // Niente loading=async: interferisce con il callback
    s.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGoogleMapsPlaces`
    s.async = true
    s.defer = true
    s.onerror = () => reject(new Error('Google Maps script non caricato'))
    document.head.appendChild(s)
  })
}

export function PlacesInput({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const acRef = useRef<any>(null)
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''

  useEffect(() => {
    if (!apiKey) {
      console.warn('PlacesInput: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY non configurata')
      return
    }
    if (!inputRef.current) return

    loadScript(apiKey)
      .then(() => {
        if (!inputRef.current || acRef.current) return
        acRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
          fields: ['formatted_address', 'name'],
        })
        acRef.current.addListener('place_changed', () => {
          const place = acRef.current.getPlace()
          onChange(place.formatted_address ?? place.name ?? '')
        })
      })
      .catch(err => console.error('PlacesInput:', err))

    return () => {
      if (acRef.current && window.google?.maps?.event) {
        window.google.maps.event.clearInstanceListeners(acRef.current)
        acRef.current = null
      }
    }
  }, [apiKey]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={className}
      autoComplete="off"
    />
  )
}
