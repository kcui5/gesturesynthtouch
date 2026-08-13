import type { Metadata, Viewport } from "next"
import { Geist, JetBrains_Mono, Silkscreen, VT323 } from "next/font/google"

import "@workspace/ui/globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@workspace/ui/lib/utils";

const SITE_NAME = "Gesture Synth Touch"
const SITE_DESCRIPTION =
  "A gesture synth for the web with TouchDesigner-esque effects. Enable " +
  "your webcam and hold your hands up to start making cool music!"

// No explicit metadataBase: Next.js derives it automatically (the Vercel
// production domain when deployed, localhost in dev).
export const metadata: Metadata = {
  title: SITE_NAME,
  description: SITE_DESCRIPTION,
  keywords: [
    "gesture synth",
    "webcam synthesizer",
    "hand tracking music",
    "browser instrument",
    "web audio",
    "MediaPipe",
    "AI video effect",
  ],
  creator: "Kyle Cui",
  openGraph: {
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: "/",
    siteName: SITE_NAME,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
  },
}

export const viewport: Viewport = {
  themeColor: "#0a1531",
}

const fontSans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
})

const jetbrainsMono = JetBrains_Mono({subsets:['latin'],variable:'--font-mono'})

const silkscreen = Silkscreen({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-pixel",
})

// 5x7-bitmap-style terminal font for the TFT display module, the closest
// web match to the stock Adafruit GFX font on real ST7735 screens.
const vt323 = VT323({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-lcd",
})

// Structured data for search engines: what the app is, that it's free,
// and the projects it builds on.
const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: SITE_NAME,
  description: SITE_DESCRIPTION,
  applicationCategory: "MultimediaApplication",
  operatingSystem: "Any",
  browserRequirements: "Requires a webcam and a modern browser",
  creator: { "@type": "Person", name: "Kyle Cui" },
  isBasedOn: [
    "https://gesture-synth-weld.vercel.app/",
    "https://github.com/sophiamyang/finger-frame-effect-lucy",
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("antialiased", fontSans.variable, "font-mono", jetbrainsMono.variable, silkscreen.variable, vt323.variable)}
    >
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
