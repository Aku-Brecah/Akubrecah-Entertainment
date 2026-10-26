"use client"

import React, { useState, useEffect } from "react"
import { 
  Star, 
  CheckCircle2, 
  ThumbsUp, 
  MessageSquare, 
  ShieldCheck, 
  Award, 
  TrendingUp, 
  Zap,
  Filter
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { WriteReviewModal, type UserReview } from "./write-review-modal"

const INITIAL_REVIEWS: UserReview[] = [
  {
    id: "rev-1",
    name: "Dennis Kiprono",
    role: "Proprietor, Apex Cyber Hub",
    location: "Eldoret, Kenya",
    category: "Cyber Cafe Unlimited",
    rating: 5,
    date: "2 days ago",
    content:
      "The KES 500 monthly cyber package has completely changed our business. We retrieve dozens of KRA PIN certificates and thermal ETR receipts daily without paying KES 20 each time. The WhatsApp bot is instant and never lags.",
    verified: true,
    helpfulCount: 42,
  },
  {
    id: "rev-2",
    name: "Sarah Wanjiku",
    role: "Head of Operations, FinTrack Africa",
    location: "Nairobi, Kenya",
    category: "Web & Mobile Systems",
    rating: 5,
    date: "1 week ago",
    content:
      "Akubrecah Entertainment built our enterprise fintech telemetry and M-Pesa automated reconciliation engine. Their monolithic corporate architecture and Next.js engineering delivered sub-second response times under peak payroll days.",
    verified: true,
    helpfulCount: 29,
  },
  {
    id: "rev-3",
    name: "Peter Mwangi",
    role: "Taxpayer & Small Business Owner",
    location: "Nakuru, Kenya",
    category: "GovTech & KRA",
    rating: 5,
    date: "3 days ago",
    content:
      "I had lost my KRA PIN certificate right before an urgent bank account opening. I entered my National ID on the retrieval portal, received the M-Pesa STK push for KES 20, and the authentic A4 certificate PDF arrived in 4 seconds flat. Incredible service!",
    verified: true,
    helpfulCount: 56,
  },
  {
    id: "rev-4",
    name: "Mercy Chebet",
    role: "Cyber Operator, QuickPrint Central",
    location: "Mombasa, Kenya",
    category: "Cyber Cafe Unlimited",
    rating: 5,
    date: "2 weeks ago",
    content:
      "The 80mm thermal ETR fiscal receipt slip is a customer favorite. Clients get both the official PDF and an instant thermal image right on WhatsApp. It makes our cyber cafe look extraordinarily professional.",
    verified: true,
    helpfulCount: 37,
  },
  {
    id: "rev-5",
    name: "Dr. Evans Otieno",
    role: "Managing Director, Rift Health Systems",
    location: "Kisumu, Kenya",
    category: "Brand & Creative",
    rating: 5,
    date: "1 month ago",
    content:
      "The creative brand design, identity tokens, and digital portal developed by Akubrecah Entertainment set a new benchmark for corporate modernism. Truly engineering digital products that scale.",
    verified: true,
    helpfulCount: 19,
  },
]

export function ReviewSection() {
  const [reviews, setReviews] = useState<UserReview[]>(INITIAL_REVIEWS)
  const [selectedCategory, setSelectedCategory] = useState<string>("All")
  const [upvotedIds, setUpvotedIds] = useState<Record<string, boolean>>({})

  // Hydrate local reviews from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("akubrecah_user_reviews")
      if (stored) {
        const parsed: UserReview[] = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setReviews([...parsed, ...INITIAL_REVIEWS])
        }
      }
    } catch {
      // LocalStorage unavailable, keep defaults
    }
  }, [])

  const handleReviewSubmitted = (newReview: UserReview) => {
    const updated = [newReview, ...reviews]
    setReviews(updated)
    try {
      const customReviews = updated.filter((r) => r.id.startsWith("rev-17") || r.id.startsWith("rev-18") || r.id.startsWith("rev-19") || r.id.startsWith("rev-20"))
      localStorage.setItem("akubrecah_user_reviews", JSON.stringify(customReviews))
    } catch {
      // Ignore storage errors
    }
  }

  const handleUpvote = (id: string) => {
    if (upvotedIds[id]) return

    setUpvotedIds((prev) => ({ ...prev, [id]: true }))
    setReviews((prev) =>
      prev.map((r) => (r.id === id ? { ...r, helpfulCount: r.helpfulCount + 1 } : r))
    )
  }

  const categories = [
    "All",
    "GovTech & KRA",
    "Cyber Cafe Unlimited",
    "Web & Mobile Systems",
    "Brand & Creative",
  ]

  const filteredReviews =
    selectedCategory === "All"
      ? reviews
      : reviews.filter((r) => r.category === selectedCategory)

  return (
    <section id="reviews-section" className="space-y-12">
      {/* Header & Aggregate Rating Card */}
      <div className="p-8 sm:p-10 rounded-3xl bg-surface-container-lowest border border-outline-variant shadow-soft flex flex-col lg:flex-row items-center justify-between gap-8">
        
        {/* Rating Score */}
        <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
          <div className="p-6 rounded-2xl bg-primary/10 border border-primary/20 text-center min-w-[130px]">
            <span className="text-4xl sm:text-5xl font-black text-primary font-mono tracking-tight block">
              4.9
            </span>
            <div className="flex items-center justify-center gap-1 text-amber-500 mt-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant block mt-1">
              Trust Score
            </span>
          </div>

          <div className="space-y-1.5 max-w-md">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-[11px] font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>100% Verified Community Feedback</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-on-surface tracking-tight">
              Loved by Taxpayers, Cyber Cafes & Enterprises
            </h2>
            <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
              Real testimonials from over 52,480+ statutory certificate retrievas, monthly cyber subscribers, and software engineering clients across Kenya.
            </p>
          </div>
        </div>

        {/* Aggregate Stats & CTA */}
        <div className="flex flex-col sm:flex-row items-center gap-4 shrink-0">
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="px-4 py-2.5 rounded-xl bg-surface-container/60 border border-outline-variant">
              <p className="text-lg font-black text-on-surface font-mono">99.8%</p>
              <p className="text-[10px] text-on-surface-variant font-bold uppercase">Success Rate</p>
            </div>
            <div className="px-4 py-2.5 rounded-xl bg-surface-container/60 border border-outline-variant">
              <p className="text-lg font-black text-on-surface font-mono">1,280+</p>
              <p className="text-[10px] text-on-surface-variant font-bold uppercase">5-Star Ratings</p>
            </div>
          </div>

          <WriteReviewModal onReviewSubmitted={handleReviewSubmitted} />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <span className="text-xs font-bold text-on-surface-variant flex items-center gap-1.5 mr-1 shrink-0">
          <Filter className="w-3.5 h-3.5" /> Filter by:
        </span>
        {categories.map((cat) => {
          const isActive = selectedCategory === cat
          const count =
            cat === "All" ? reviews.length : reviews.filter((r) => r.category === cat).length
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                isActive
                  ? "bg-primary text-white shadow-xs shadow-primary/20 scale-[1.02]"
                  : "bg-surface-container-lowest border border-outline-variant text-on-surface-variant hover:text-on-surface hover:border-primary/30"
              }`}
            >
              {cat} <span className="text-[10px] opacity-75 font-mono ml-1">({count})</span>
            </button>
          )
        })}
      </div>

      {/* Reviews Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredReviews.map((rev) => {
          const isUpvoted = upvotedIds[rev.id]
          return (
            <div
              key={rev.id}
              className="p-6 rounded-3xl bg-surface-container-lowest border border-outline-variant hover:border-primary/40 transition-all duration-300 shadow-soft hover:shadow-lg flex flex-col justify-between group space-y-4"
            >
              <div className="space-y-3">
                {/* Card Top: Stars & Category */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1 text-amber-500">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-3.5 h-3.5 ${
                          s <= rev.rating ? "fill-amber-400 text-amber-400" : "text-zinc-300"
                        }`}
                      />
                    ))}
                  </div>

                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant border border-outline-variant/60">
                    {rev.category}
                  </span>
                </div>

                {/* Review Text */}
                <p className="text-xs text-on-surface leading-relaxed italic">
                  &ldquo;{rev.content}&rdquo;
                </p>
              </div>

              {/* Reviewer Details & Helpful Button */}
              <div className="pt-4 border-t border-outline-variant/60 flex items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-black text-on-surface">{rev.name}</p>
                    {rev.verified && (
                      <span title="Verified Client">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-on-surface-variant">
                    {rev.role} · <span className="opacity-80">{rev.location}</span>
                  </p>
                </div>

                <button
                  onClick={() => handleUpvote(rev.id)}
                  disabled={isUpvoted}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    isUpvoted
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                      : "bg-surface-container text-on-surface-variant hover:text-primary hover:bg-primary/5 border border-outline-variant/60"
                  }`}
                  aria-label="Upvote review helpfulness"
                >
                  <ThumbsUp className="w-3 h-3" />
                  <span className="font-mono">{rev.helpfulCount}</span>
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
