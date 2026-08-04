import { cn } from "@workspace/ui/lib/utils"

import { VOLUME_BAR_COUNT } from "@/hooks/use-gesture-synth"

type VolumeMeterProps = {
  litBars: number
  filterPercent: number
}

export function VolumeMeter({ litBars, filterPercent }: VolumeMeterProps) {
  return (
    <div className="pointer-events-none absolute top-4 right-4 z-5 flex flex-col items-end gap-2.5">
      <div className="flex flex-col gap-1 border-2 border-(--synth-border)/60 bg-black/40 p-1.5 shadow-[3px_3px_0_rgba(0,0,0,0.5)]">
        {Array.from({ length: VOLUME_BAR_COUNT }, (_, i) => (
          <div
            key={i}
            className={cn(
              "h-2.5 w-24",
              i >= VOLUME_BAR_COUNT - litBars
                ? "bg-(--synth-text)"
                : "bg-(--synth-dim)"
            )}
          />
        ))}
      </div>
      <div className="font-pixel text-right text-sm text-(--synth-text)">
        FILTER {filterPercent > 0 ? "+" : ""}
        {filterPercent}%
      </div>
    </div>
  )
}
