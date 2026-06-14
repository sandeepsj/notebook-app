import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { fetchCoverUrl } from '@/services/drive'

interface Props {
  coverId: string
  alt: string
}

/** Loads a notebook cover image from Drive and renders it as the book cover. */
export function CoverImage({ coverId, alt }: Props) {
  const { auth } = useAuth()
  const token = auth?.accessToken
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    let objectUrl: string | null = null
    let active = true
    fetchCoverUrl(token, coverId).then((u) => {
      if (!active) {
        if (u) URL.revokeObjectURL(u)
        return
      }
      objectUrl = u
      setUrl(u)
    })
    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [token, coverId])

  if (!url) return <span className="book-cover-loading" aria-hidden="true" />
  return <img className="book-cover-img" src={url} alt={alt} />
}
