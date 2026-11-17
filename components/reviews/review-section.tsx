"use client"

import React, { useState, useEffect } from "react"
import { 
  Star, 
  CheckCircle2, 
  ThumbsUp, 
  ShieldCheck, 
  ExternalLink,
  MessageSquare,
  Sparkles,
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

/** Official Google 4-Color G Logo */
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
  const [upvoted, setUpvoted] = useState<Record<string, boolean>>({})

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

  // Authentic Metric Governance: Hide section completely when no verified reviews exist yet
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
    <section id="reviews-section" className="space-y-10 scroll-mt-24">
      {/* ===================== GOOGLE REVIEWS HERO HEADER ===================== */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 p-7 sm:p-10 rounded-3xl bg-surface-container-lowest border border-outline-variant shadow-soft">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container border border-outline-variant text-xs font-bold text-on-surface">
            <GoogleIcon className="w-4 h-4" />
            <span>Google Verified Reviews</span>
            <span className="text-outline-muted">·</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-mono text-[11px] inline-flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Live Google Business
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-black text-on-surface tracking-tight">
            Client Reviews & Google Ratings
          </h2>

          <p className="text-sm text-on-surface-variant max-w-2xl leading-relaxed">
            Real feedback from businesses, institutions, and taxpayers across Kenya. 
            All reviews are authenticated and syndicated directly from our official Google Business Profile.
          </p>

          {/* Rating Summary Bar */}
          <div className="pt-2 flex flex-wrap items-center gap-4 text-xs">
            {rating !== null ? (
              <>
                <div className="flex items-center gap-2 font-black text-2xl text-on-surface">
                  <span>{rating.toFixed(1)}</span>
                  <div className="flex text-amber-400">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${
                          star <= Math.round(rating)
                            ? "fill-amber-400 text-amber-400"
                            : "text-outline-variant"
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <div className="text-on-surface-variant font-medium">
                  Based on <strong className="text-on-surface">{totalCount} verified</strong> ratings
                </div>
              </>
            ) : (
              <div className="text-on-surface-variant font-medium">
                No verified Google reviews yet — <strong className="text-on-surface">be the first to review us</strong>
              </div>
            )}
          </div>
        </div>

        {/* Action Center */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Button
            asChild
            size="lg"
            className="h-12 px-6 rounded-xl bg-primary text-white font-bold text-xs sm:text-sm hover:bg-primary/90 shadow-md shadow-primary/20 flex items-center gap-2 group transition-all"
          >
            <a href={writeReviewUrl} target="_blank" rel="noopener noreferrer">
              <GoogleIcon className="w-4 h-4" />
              <span>Review Us on Google</span>
              <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </a>
          </Button>

          <Button
            asChild
            variant="outline"
            size="lg"
            className="h-12 px-5 rounded-xl border-outline-variant font-bold text-xs sm:text-sm hover:bg-surface-container flex items-center gap-2"
          >
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
              <MapPin className="w-4 h-4 text-primary" />
              <span>View on Google Maps</span>
            </a>
          </Button>
        </div>
      </div>

      {/* ===================== LIVE REVIEWS GRID ===================== */}
      {loading ? (
        <div className="p-12 text-center text-xs text-on-surface-variant bg-surface-container-lowest rounded-3xl border border-outline-variant flex flex-col items-center gap-3">
          <RefreshCw className="w-5 h-5 text-primary animate-spin" />
          <span>Synchronizing live reviews from Google Business Profile...</span>
        </div>
      ) : data?.reviews && data.reviews.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {data.reviews.map((rev, idx) => {
            const hasUpvoted = !!upvoted[idx]
            return (
              <div
                key={idx}
                className="p-6 rounded-3xl bg-surface-container-lowest border border-outline-variant hover:border-primary/40 transition-all duration-300 shadow-soft hover:shadow-lg flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  {/* Google Tag + Rating */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-amber-400">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-3.5 h-3.5 ${
                            s <= rev.rating ? "fill-amber-400 text-amber-400" : "text-outline-variant"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full border border-outline-variant/60">
                      <GoogleIcon className="w-2.5 h-2.5" />
                      Google Review
                    </span>
                  </div>

                  {/* Review Text */}
                  <p className="text-xs text-on-surface leading-relaxed line-clamp-5">
                    &ldquo;{rev.text}&rdquo;
                  </p>
                </div>

                {/* Reviewer Details */}
                <div className="pt-3 border-t border-outline-variant/60 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {rev.profile_photo_url ? (
                      <img
                        src={rev.profile_photo_url}
                        alt={rev.author_name}
                        className="w-8 h-8 rounded-full object-cover shrink-0 border border-outline-variant"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-black text-xs flex items-center justify-center shrink-0">
                        {rev.author_name.charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-on-surface truncate">
                        {rev.author_name}
                      </h4>
                      <p className="text-[10px] text-on-surface-variant">
                        {rev.relative_time_description}
                      </p>
                    </div>
                  </div>

                  {rev.author_url && (
                    <a
                      href={rev.author_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-on-surface-variant hover:text-primary p-1.5 rounded-lg hover:bg-surface-container transition-colors shrink-0"
                      title="View review on Google Maps"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* Empty / Live Business Profile Prompt - No Fake Data */
        <div className="p-8 sm:p-12 rounded-3xl bg-surface-container-lowest border border-outline-variant shadow-soft flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold w-fit">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Official Google Business Profile</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-on-surface tracking-tight">
              Share Your Experience on Google Maps
            </h3>
            <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
              We uphold complete authenticity: our reviews are verified and syndicated live through Google. 
              Have you worked with Akubrecah on KRA compliance, software engineering, or print production? 
              Leave a genuine Google review and help fellow Kenyans discover verified technology.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
            <Button
              asChild
              size="lg"
              className="h-12 px-6 rounded-xl bg-primary text-white font-bold text-xs sm:text-sm hover:bg-primary/90 shadow-md shadow-primary/20 flex items-center gap-2"
            >
              <a href={writeReviewUrl} target="_blank" rel="noopener noreferrer">
                <GoogleIcon className="w-4 h-4" />
                <span>Write a Google Review</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-12 px-5 rounded-xl border-outline-variant font-bold text-xs sm:text-sm hover:bg-surface-container flex items-center gap-2"
            >
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
                <MapPin className="w-4 h-4 text-primary" />
                <span>Open Google Maps</span>
              </a>
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}
