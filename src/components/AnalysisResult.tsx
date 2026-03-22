"use client"

import * as React from "react"
import { AlertCircle, CheckCircle2, Info } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { type AnalyzeImageForDeepfakeOutput } from "@/ai/flows/analyze-image-for-deepfake"
import { cn } from "@/lib/utils"

interface AnalysisResultProps {
  result: AnalyzeImageForDeepfakeOutput
  imageUrl: string
}

export function AnalysisResult({ result, imageUrl }: AnalysisResultProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = React.useState({ width: 0, height: 0 })

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight, clientWidth, clientHeight } = e.currentTarget
    setDimensions({ width: clientWidth, height: clientHeight })
  }

  const isFake = result.isDeepfake
  const confidence = result.confidence

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="overflow-hidden border-2 border-primary/20">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <CardTitle className="font-headline text-xl">Analysis Overview</CardTitle>
              <Badge 
                variant={isFake ? "destructive" : "default"} 
                className={cn("text-sm px-3 py-1", !isFake && "bg-green-500 hover:bg-green-600")}
              >
                {isFake ? "LIKELY MANIPULATED" : "LIKELY AUTHENTIC"}
              </Badge>
            </div>
            <CardDescription>Visual summary of the AI findings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-medium">
                <span>Confidence Score</span>
                <span className={isFake ? "text-destructive" : "text-green-600"}>{confidence}%</span>
              </div>
              <Progress value={confidence} className={cn("h-2", isFake ? "bg-destructive/20" : "bg-green-100")} />
            </div>

            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <div className="flex gap-3">
                {isFake ? (
                  <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                )}
                <div>
                  <h4 className="font-semibold text-sm mb-1">Explanation</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {result.explanation}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden relative flex flex-col items-center justify-center p-4 bg-muted/30">
          <div className="relative w-full max-h-[400px] flex items-center justify-center rounded-lg overflow-hidden border bg-white" ref={containerRef}>
            <img 
              src={imageUrl} 
              alt="Analyzed Media" 
              className="max-w-full max-h-full object-contain"
              onLoad={handleImageLoad}
            />
            {/* Highlights Overlay */}
            {result.highlightedRegions?.map((region, idx) => (
              <div
                key={idx}
                className="absolute border-2 border-red-500 bg-red-500/10 pointer-events-none group"
                style={{
                  left: `${(region.x / 100) * dimensions.width}px`,
                  top: `${(region.y / 100) * dimensions.height}px`,
                  width: `${(region.width / 100) * dimensions.width}px`,
                  height: `${(region.height / 100) * dimensions.height}px`,
                }}
              >
                <div className="hidden group-hover:block absolute -top-8 left-0 bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap z-10">
                  {region.reason}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground flex items-center gap-1.5">
            <Info className="w-3 h-3" />
            Highlighted regions indicate areas of suspicious visual patterns.
          </p>
        </Card>
      </div>

      {result.highlightedRegions && result.highlightedRegions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Detailed Irregularities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {result.highlightedRegions.map((region, idx) => (
                <div key={idx} className="flex gap-4 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-destructive/10 text-destructive font-bold text-xs shrink-0">
                    {idx + 1}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{region.reason}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Coordinates: {region.x}x, {region.y}y | Area: {region.width}w x {region.height}h
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}