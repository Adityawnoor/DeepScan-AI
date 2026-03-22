"use client"

import { ShieldCheck } from "lucide-react"

export function DeepScanLogo() {
  return (
    <div className="flex items-center gap-2 select-none">
      <div className="bg-primary p-1.5 rounded-lg shadow-sm">
        <ShieldCheck className="w-6 h-6 text-primary-foreground" />
      </div>
      <span className="font-headline font-bold text-xl tracking-tight text-foreground">
        DeepScan<span className="text-primary">AI</span>
      </span>
    </div>
  )
}