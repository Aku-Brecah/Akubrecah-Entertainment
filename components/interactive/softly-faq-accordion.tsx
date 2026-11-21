"use client"

import React, { useState } from "react"
import { Plus } from "lucide-react"

export interface SoftlyFaqItem {
  question: string
  answer: string
}

interface SoftlyFaqAccordionProps {
  items: SoftlyFaqItem[]
}

export function SoftlyFaqAccordion({ items }: SoftlyFaqAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <div className="space-y-3.5 w-full">
      {items.map((item, idx) => {
        const isOpen = openIndex === idx
        return (
          <div
            key={item.question}
            className="bg-white rounded-[16px] border border-stone-100 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] overflow-hidden transition-all duration-500 ease-in-out"
          >
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : idx)}
              aria-expanded={isOpen}
              className="w-full p-[24px] text-left flex items-center justify-between gap-4 font-medium text-base sm:text-lg text-[#292524] hover:text-[#78716C] transition-colors cursor-pointer"
            >
              <span>{item.question}</span>
              <span
                className={`w-8 h-8 rounded-full bg-[#FDFCF8] border border-stone-200/80 flex items-center justify-center shrink-0 text-[#292524] transition-transform duration-500 ease-in-out ${
                  isOpen ? "rotate-45 bg-[#FFB7B2]/30 border-[#FFB7B2]" : "rotate-0"
                }`}
              >
                <Plus className="w-4 h-4" />
              </span>
            </button>

            <div
              className={`grid transition-all duration-500 ease-in-out ${
                isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="overflow-hidden">
                <div className="px-[24px] pb-[24px] pt-0 text-sm sm:text-base text-[#78716C] leading-relaxed">
                  {item.answer}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
