"use client"

import Link from "next/link"
import { motion } from "motion/react"
import { Home, ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"

export default function NotFound() {
  const router = useRouter()

  return (
    <div className="min-h-[80vh] bg-background text-on-background flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-surface-container-lowest border border-outline-variant rounded-xl p-8 text-center space-y-5">
        <div className="space-y-2">
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-primary">
            HTTP 404 · Not Found
          </span>
          <h1 className="text-2xl font-bold text-on-surface tracking-tight">
            The requested page could not be found
          </h1>
          <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
            The URL may have changed, or the resource is no longer available. Use the links below to return to the portal.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={() => router.back()}
            className="w-full sm:w-auto bg-surface-container-low border border-outline-variant text-on-surface text-xs font-semibold py-2.5 px-5 rounded-lg hover:bg-surface-container transition-colors flex justify-center items-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Go Back</span>
          </button>
          <Link
            href="/"
            className="w-full sm:w-auto bg-primary text-white text-xs font-semibold py-2.5 px-6 rounded-lg hover:bg-primary/90 transition-colors flex justify-center items-center gap-2"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Return Home</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
