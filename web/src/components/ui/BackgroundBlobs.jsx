/*
 * File:    BackgroundBlobs.jsx
 * Module:  Core UI
 * Owner:   Ravindu
 * Purpose: Large, blurred colour blobs that drift slowly behind every screen,
 *          so the glass cards have soft light behind them.
 * Source:  WEB-01 (floating background blobs).
 */

// Fixed layer of animated blobs behind the page content.
export default function BackgroundBlobs() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -top-[10%] -left-[10%] size-[60vh] animate-clay-float rounded-full bg-violet-500/10 blur-3xl" />
      <div className="absolute top-[20%] -right-[10%] size-[60vh] animate-clay-float-delayed rounded-full bg-pink-500/10 blur-3xl animation-delay-2000" />
      <div className="absolute -bottom-[15%] left-[20%] size-[55vh] animate-clay-float-slow rounded-full bg-sky-500/10 blur-3xl animation-delay-4000" />
      <div className="absolute top-[45%] left-[45%] hidden size-[35vh] animate-clay-float rounded-full bg-emerald-500/10 blur-3xl lg:block" />
    </div>
  )
}
