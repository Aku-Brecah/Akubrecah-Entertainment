"use client"

import React, { useState, useEffect } from "react"
import {
  Star,
  ShieldCheck,
  ExternalLink,
  MapPin,
  RefreshCw
} from "lucide-react"
import { Button } from "@/components/ui/button"

export interface GoogleReviewItem {
  author_name: string
  author_url?: string
  profile_photo_url?: string
  rating: number
  relative_time_description: string
  text: string
  time?: number
}

interface GoogleReviewsPayload {
  success: boolean
  businessName: string
  rating: number
  totalReviews: number
  googleMapsUrl: string
  googleWriteReviewUrl: string
  reviews: GoogleReviewItem[]
  source: string
}

function GoogleIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
        fill="#4285F4"
      />
      <path
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
        fill="#34A853"
      />
      <path
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.94 0 12s.45 3.84 1.25 5.42l4.03-3.15z"
        fill="#FBBC05"
      />
      <path
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
        fill="#EA4335"
      />
    </svg>
  )
}

export function ReviewSection() {
  const [data, setData] = useState<GoogleReviewsPayload | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchGoogleReviews = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/google-reviews")
      if (res.ok) {
        const payload: GoogleReviewsPayload = await res.json()
        setData(payload)
      }
    } catch (err) {
      console.error("Failed to fetch Google reviews:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGoogleReviews()
  }, [])

  const hasVerifiedReviews = (data?.totalReviews || data?.reviews?.length || 0) > 0
  if (!hasVerifiedReviews) {
    return null
  }
  const rating = hasVerifiedReviews && typeof data?.rating === "number" ? data.rating : null
  const totalCount = data?.totalReviews || (data?.reviews?.length || 0)
  const writeReviewUrl =
    data?.googleWriteReviewUrl ||
    "https://www.google.com/maps/search/?api=1&query=Akubrecah+Entertainment+Nairobi"
  const mapsUrl =
    data?.googleMapsUrl ||
    "https://www.google.com/maps/search/?api=1&query=Akubrecah+Entertainment+Nairobi"

  return (
    <section id="reviews-section" className="space-y-8 scroll-mt-24">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 p-8 rounded-[2.5rem] bg-white border border-stone-100 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)]">
        <div className="space-y-2.5">
          <div className="inline-flex items-center gap-2 text-xs font-medium text-[#292524]">
            <GoogleIcon className="w-4 h-4" />
            <span>Google verified notes</span>
            <span className="text-stone-300">·</span>
            <span className="text-[#78716C] text-[11px] inline-flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#FFB7B2]" /> Live business profile
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-medium text-[#292524] tracking-[-0.025em]">
            Community notes &amp; Google ratings
          </h2>

          <p className="text-xs sm:text-sm text-[#78716C] max-w-2xl leading-relaxed">
            Authenticated feedback syndicated directly from our official Google Business Profile.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-4 text-xs">
            {rating !== null ? (
              <>
                <div className="flex items-center gap-2 font-medium text-xl text-[#292524]">
                  <span>{rating.toFixed(1)}</span>
                  <div className="flex text-[#FFB7B2]">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${
                          star <= Math.round(rating)
                            ? "fill-[#FFB7B2] text-[#FFB7B2]"
                            : "text-stone-200"
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <div className="text-[#78716C]">
                  Based on <strong className="text-[#292524] font-medium">{totalCount} verified</strong> ratings
                </div>
              </>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Button asChild size="lg" className="h-11 px-6 rounded-full bg-[#FFB7B2] text-[#292524] font-medium text-xs">
            <a href={writeReviewUrl} target="_blank" rel="noopener noreferrer">
              <GoogleIcon className="w-4 h-4" />
              <span>Write a note on Google</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </Button>

          <Button asChild variant="outline" size="lg" className="h-11 px-5 rounded-full border-stone-200 font-medium text-xs">
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
              <MapPin className="w-3.5 h-3.5 text-[#FFB7B2]" />
              <span>Google Maps</span>
            </a>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="p-10 text-center text-xs text-[#78716C] bg-white rounded-[2rem] border border-stone-100 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] flex flex-col items-center gap-2.5">
          <RefreshCw className="w-4 h-4 text-[#FFB7B2] animate-spin" />
          <span>Synchronizing live notes from Google Business Profile...</span>
        </div>
      ) : data?.reviews && data.reviews.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {data.reviews.map((rev, idx) => (
            <div
              key={idx}
              className={`p-8 rounded-[2rem] bg-white border border-stone-100 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] flex flex-col justify-between space-y-6 transition-transform duration-500 hover:rotate-0 ${
                idx % 2 === 0 ? "rotate-1" : "-rotate-1"
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-stone-400">
                    {rev.relative_time_description}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#78716C]">
                    <GoogleIcon className="w-3 h-3" />
                    Verified note
                  </span>
                </div>

                <p className="text-base text-[#292524] leading-relaxed">
                  &ldquo;{rev.text}&rdquo;
                </p>
              </div>

              {/* Signature style: 32px horizontal line followed by 'Reenie Beanie' cursive text in 24px stone-500 */}
              <div className="pt-2 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="w-[32px] h-px bg-stone-400 inline-block shrink-0" />
                  <span className="font-cursive text-[24px] text-stone-500 leading-none">
                    {rev.author_name}
                  </span>
                </div>

                {rev.author_url && (
                  <a
                    href={rev.author_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-stone-400 hover:text-[#292524] p-1.5 rounded-full transition-colors shrink-0"
                    title="View review on Google Maps"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  )
}
