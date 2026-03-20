'use client'

import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    google: any
    initGoogleMapsPlaces?: () => void
  }
}

// Carica lo script una sola volta anche se ci sono più istanze
let scriptState: 'idle' | 'loading' | 'ready' = 'idle'
const queue: (() => void)[] = []

function loadScript(apiKey: string): Promise<void> {
  return new Promise(resolve => {
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
    s.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGoogleMapsPlaces&loading=async`
    s.async = true
    s.defer = true
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
  const acRef   = useRef<any>(null) // eslint-disable-line @typescript-eslint/no-explicit-any
  const apiKey  = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''

  useEffect(() => {
    if (!apiKey || !inputRef.current) return

    loadScript(apiKey).then(() => {
      if (!inputRef.current || acRef.current) return
      acRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
        types: ['geocode'],
        fields: ['formatted_address', 'name'],
      })
      acRef.current.addListener('place_changed', () => {
        const place = acRef.current!.getPlace()
        onChange(place.formatted_address ?? place.name ?? '')
      })
    })

    return () => {
      if (acRef.current) {
        window.google?.maps?.event?.clearInstanceListeners(acRef.current)
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
