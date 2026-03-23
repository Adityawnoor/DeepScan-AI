"use client"

import { ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"

export function DeepScanLogo() {
  return (
    <div className="flex items-center gap-2 select-none group cursor-pointer">
      <div className={cn(
        "bg-primary p-1.5 rounded-lg shadow-sm transition-all duration-300",
        "group-hover:scale-110 group-active:scale-95 hover-glow"
      )}>
        <ShieldCheck className="w-6 h-6 text-primary-foreground" />
      </div>
      <span className="font-headline font-bold text-xl tracking-tight text-foreground">
        DeepScan<span className="text-primary">AI</span>
      </span>
    </div>
  )
}
