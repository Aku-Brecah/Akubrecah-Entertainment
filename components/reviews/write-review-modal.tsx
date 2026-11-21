"use client"

import React, { useState } from "react"
import { Star, CheckCircle2, MessageSquarePlus } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

export interface UserReview {
  id: string
  name: string
  role: string
  location: string
  category: "GovTech & KRA" | "Cyber Cafe Unlimited" | "Web & Mobile Systems" | "Brand & Creative"
  rating: number
  date: string
  content: string
  verified: boolean
  helpfulCount: number
}

interface WriteReviewModalProps {
  onReviewSubmitted: (newReview: UserReview) => void
}

export function WriteReviewModal({ onReviewSubmitted }: WriteReviewModalProps) {
  const [open, setOpen] = useState(false)
  const [rating, setRating] = useState<number>(5)
  const [hoverRating, setHoverRating] = useState<number>(0)
  const [name, setName] = useState("")
  const [role, setRole] = useState("")
  const [location, setLocation] = useState("Nairobi, Kenya")
  const [category, setCategory] = useState<UserReview["category"]>("GovTech & KRA")
  const [content, setContent] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !content.trim()) return

    setIsSubmitting(true)
    const review: UserReview = {
      id: `rev-${Date.now()}`,
      name: name.trim(),
      role: role.trim() || "Client",
      location: location.trim() || "Kenya",
      category,
      rating,
      date: "Just now",
      content: content.trim(),
      verified: false,
      helpfulCount: 0,
    }

    onReviewSubmitted(review)
    setIsSubmitting(false)
    setSubmitted(true)

    setTimeout(() => {
      setSubmitted(false)
      setOpen(false)
      setName("")
      setRole("")
      setContent("")
      setRating(5)
    }, 1400)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="lg"
          className="h-10 px-5 rounded-lg bg-primary text-white font-semibold text-xs hover:bg-primary/90 flex items-center gap-2"
        >
          <MessageSquarePlus className="w-4 h-4" />
          <span>Write a Review</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md sm:max-w-lg p-6 rounded-xl bg-surface-container-lowest border border-outline-variant shadow-lg">
        <DialogHeader className="space-y-1 text-left">
          <DialogTitle className="text-lg sm:text-xl font-bold text-on-surface tracking-tight">
            Share Your Experience
          </DialogTitle>
          <DialogDescription className="text-xs text-on-surface-variant">
            Provide feedback on our compliance portal or software engineering services.
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-2.5">
            <div className="w-12 h-12 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-on-surface">Draft Feedback Saved Locally</h4>
            <p className="text-xs text-on-surface-variant max-w-xs">
              Your feedback draft has been added to this session preview. To publish a public verified review, please post directly on Google Maps.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {/* Rating Stars Picker */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-on-surface block">
                Overall Satisfaction Rating:
              </label>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 text-amber-400 focus:outline-none"
                    aria-label={`Rate ${star} stars`}
                  >
                    <Star
                      className={`w-6 h-6 transition-colors ${
                        (hoverRating || rating) >= star
                          ? "fill-amber-400 text-amber-400"
                          : "text-outline-variant"
                      }`}
                    />
                  </button>
                ))}
                <span className="text-xs font-mono font-semibold text-on-surface-variant ml-2">
                  {rating}.0 / 5.0
                </span>
              </div>
            </div>

            {/* Service Category */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-on-surface block">
                Service Experienced:
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as UserReview["category"])}
                className="w-full h-11 px-3 rounded-xl bg-surface-container/60 dark:bg-slate-800 border border-outline-variant text-xs text-on-surface font-medium focus:ring-2 focus:ring-primary/40 focus:outline-none"
              >
                <option value="GovTech & KRA">GovTech & KRA Retrieval Portal</option>
                <option value="Cyber Cafe Unlimited">Cyber Cafe Unlimited Monthly Plan</option>
                <option value="Web & Mobile Systems">Web Engineering & Mobile Apps</option>
                <option value="Brand & Creative">Brand Identity, Print & Design</option>
              </select>
            </div>

            {/* Name & Role Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface block">
                  Your Full Name: <span className="text-primary">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Samuel Mutua"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl bg-surface-container/60 dark:bg-slate-800 border border-outline-variant text-xs text-on-surface placeholder:text-on-surface-variant/50 focus:ring-2 focus:ring-primary/40 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface block">
                  Role / Business Name:
                </label>
                <input
                  type="text"
                  placeholder="e.g. Cyber Cafe Owner, Nairobi"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl bg-surface-container/60 dark:bg-slate-800 border border-outline-variant text-xs text-on-surface placeholder:text-on-surface-variant/50 focus:ring-2 focus:ring-primary/40 focus:outline-none"
                />
              </div>
            </div>

            {/* Location */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-on-surface block">
                Town / County:
              </label>
              <input
                type="text"
                placeholder="e.g. Nairobi, Kenya"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full h-11 px-3 rounded-xl bg-surface-container/60 dark:bg-slate-800 border border-outline-variant text-xs text-on-surface placeholder:text-on-surface-variant/50 focus:ring-2 focus:ring-primary/40 focus:outline-none"
              />
            </div>

            {/* Review Content */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-on-surface block">
                Your Review: <span className="text-primary">*</span>
              </label>
              <textarea
                required
                rows={3}
                placeholder="How did the instant retrieval, WhatsApp bot, or software engineering perform for you?"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full p-3 rounded-xl bg-surface-container/60 dark:bg-slate-800 border border-outline-variant text-xs text-on-surface placeholder:text-on-surface-variant/50 focus:ring-2 focus:ring-primary/40 focus:outline-none resize-none"
              />
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOpen(false)}
                className="h-10 px-4 rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting || !name.trim() || !content.trim()}
                className="h-10 px-5 rounded-xl bg-primary text-white font-bold text-xs hover:bg-primary/90 shadow-md shadow-primary/20"
              >
                {isSubmitting ? "Saving..." : "Save Draft Feedback"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
