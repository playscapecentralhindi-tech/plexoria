export default function MediaDetailSkeleton() {
  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Backdrop skeleton */}
      <div className="relative w-full h-[55vh] md:h-[65vh] bg-[#111118] animate-shimmer overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/60 to-transparent" />
        {/* Content skeleton overlaid */}
        <div className="absolute bottom-10 left-4 md:left-12 flex gap-5 items-end">
          <div className="hidden md:block w-36 aspect-[2/3] rounded-xl bg-white/5 animate-pulse" />
          <div className="flex flex-col gap-3">
            <div className="h-3 w-24 rounded bg-white/5 animate-pulse" />
            <div className="h-9 w-72 rounded-lg bg-white/8 animate-pulse" />
            <div className="h-9 w-56 rounded-lg bg-white/5 animate-pulse" />
            <div className="h-4 w-80 rounded bg-white/5 animate-pulse" />
            <div className="h-4 w-64 rounded bg-white/5 animate-pulse" />
            <div className="flex gap-3 mt-2">
              <div className="h-11 w-36 rounded-xl bg-white/10 animate-pulse" />
              <div className="h-11 w-28 rounded-xl bg-white/5 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
      {/* Player area skeleton */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 -mt-8 space-y-6">
        <div className="w-full aspect-video rounded-2xl bg-[#111118] animate-pulse" />
        {/* Cast row skeleton */}
        <div className="flex gap-4 overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="shrink-0 flex flex-col items-center gap-2">
              <div className="w-16 h-16 rounded-full bg-white/5 animate-pulse" />
              <div className="h-3 w-14 rounded bg-white/5 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
