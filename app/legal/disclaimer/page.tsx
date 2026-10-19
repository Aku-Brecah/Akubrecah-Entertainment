import type { Metadata } from "next"
import { DisclaimerView } from "@/components/legal/disclaimer-view"

export const metadata: Metadata = {
  title: "Statutory Disclaimer | Akubrecah Technologies",
  description: "Official legal disclaimer regarding independent statutory assistance, public data retrieval, and relationship with the Kenya Revenue Authority.",
  alternates: {
    canonical: "https://akubrecah.com/legal/disclaimer",
  },
  openGraph: {
    title: "Statutory Disclaimer | Akubrecah Technologies",
    description: "Official legal disclaimer regarding independent statutory assistance, public data retrieval, and relationship with the Kenya Revenue Authority.",
    url: "https://akubrecah.com/legal/disclaimer",
    type: "website",
    images: ["/og-image.jpg"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Statutory Disclaimer | Akubrecah Technologies",
    description: "Official legal disclaimer regarding independent statutory assistance, public data retrieval, and relationship with the Kenya Revenue Authority.",
    images: ["/og-image.jpg"],
  },
}

export default function DisclaimerPage() {
  return <DisclaimerView />
}
