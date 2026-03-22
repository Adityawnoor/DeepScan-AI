
"use client"

import * as React from "react"
import { AlertCircle, CheckCircle2, Info, Image as ImageIcon, Music, Video, Clock, ThumbsUp, ThumbsDown, MessageSquare, Send, MapPin, PlayCircle, Fingerprint } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

interface AnalysisResultProps {
  scanId: string
  result: any
  mediaUrl: string
  mediaType: 'image' | 'audio' | 'video'
  onUpdate?: () => void
}

export function AnalysisResult({ scanId, result, mediaUrl, mediaType, onUpdate }: AnalysisResultProps) {
  const { toast } = useToast()
  const [feedbackSubmitted, setFeedbackSubmitted] = React.useState<boolean | null>(null)
  const [userComment, setUserComment] = React.useState("")
  const mediaRef = React.useRef<HTMLVideoElement | HTMLAudioElement>(null)

  React.useEffect(() => {
    setFeedbackSubmitted(null)
    setUserComment("")
  }, [scanId])

  const saveToLocal = (update: any) => {
    const saved = localStorage.getItem("deepscan-scans-metadata")
    let scans = saved ? JSON.parse(saved) : []
    
    scans = scans.map((s: any) => {
      if (s.id === scanId) return { ...s, ...update }
      return s
    })

    localStorage.setItem("deepscan-scans-metadata", JSON.stringify(scans))
    if (onUpdate) onUpdate()
  }

  const submitFeedback = (userVerdict: boolean) => {
    setFeedbackSubmitted(userVerdict)
    saveToLocal({ userFeedback: userVerdict })
    toast({ title: "Local Verdict Saved" })
  }

  const handleSaveComment = () => {
    saveToLocal({ userComment: userComment.trim() })
    toast({ title: "Note Added to Local Database" })
    setUserComment("")
  }

  const seekTo = (seconds: number) => {
    if (mediaRef.current) {
      mediaRef.current.currentTime = seconds
      mediaRef.current.play()
      
      toast({
        title: "Seeking Timeline",
        description: `Jumping to ${Math.floor(seconds)}s forensic mark.`,
      })
    }
  }

  const isFake = result.isDeepfake
  const confidence = result.confidence

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="overflow-hidden border-2 border-primary/20 flex flex-col shadow-xl">
          <CardHeader className="pb-2 bg-muted/30">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <CardTitle className="font-headline text-xl flex items-center gap-2">
                  <Fingerprint className="w-5 h-5 text-primary" />
                  Forensic Report
                </CardTitle>
                <CardDescription>Multi-layer artifact analysis</CardDescription>
              </div>
              <Badge variant={isFake ? "destructive" : "default"} className="px-3 py-1 font-bold text-xs uppercase tracking-widest">
                {isFake ? "MANIPULATED" : "AUTHENTIC"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 flex-1 pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-bold">
                <span className="text-muted-foreground uppercase text-[10px] tracking-wider">AI Confidence Score</span>
                <span className={cn(isFake ? "text-destructive" : "text-primary")}>{confidence}%</span>
              </div>
              <Progress value={confidence} className={cn("h-2.5", isFake ? "[&>div]:bg-destructive" : "[&>div]:bg-primary")} />
            </div>

            <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 relative overflow-hidden">
              <div className="flex gap-3 relative z-10">
                <Info className="w-5 h-5 text-primary shrink-0" />
                <p className="text-sm leading-relaxed text-foreground/80">{result.explanation}</p>
              </div>
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
            </div>

            {/* Forensic Evidence List - The "Interactive Timeline" and "Evidence Map" */}
            {((result.highlightedRegions && result.highlightedRegions.length > 0) || 
              (result.suspiciousTimestamps && result.suspiciousTimestamps.length > 0) ||
              (result.suspiciousSegments && result.suspiciousSegments.length > 0)) && (
              <div className="space-y-3">
                <Label className="text-[10px] font-extrabold uppercase text-muted-foreground tracking-tighter">Detected Anomalies (Click to Inspect)</Label>
                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                  {result.highlightedRegions?.map((region: any, i: number) => (
                    <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-destructive/5 border border-destructive/10 text-[11px] group transition-all hover:bg-destructive/10">
                      <MapPin className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <span className="font-bold text-destructive uppercase block">Region #{i+1}</span>
                        <span className="text-muted-foreground italic leading-tight">{region.reason}</span>
                      </div>
                    </div>
                  ))}
                  {result.suspiciousTimestamps?.map((ts: any, i: number) => (
                    <button 
                      key={i} 
                      onClick={() => seekTo(ts.timestamp)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10 text-[11px] text-left hover:bg-primary/10 transition-all group"
                    >
                      <PlayCircle className="w-5 h-5 text-primary shrink-0 transition-transform group-hover:scale-110" />
                      <div>
                        <span className="font-bold text-primary block">TIMESTAMP [{Math.floor(ts.timestamp)}s]</span>
                        <span className="text-muted-foreground truncate block">{ts.description}</span>
                      </div>
                    </button>
                  ))}
                  {result.suspiciousSegments?.map((seg: any, i: number) => (
                    <button 
                      key={i} 
                      onClick={() => seekTo(seg.startTime)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10 text-[11px] text-left hover:bg-primary/10 transition-all group"
                    >
                      <PlayCircle className="w-5 h-5 text-primary shrink-0 transition-transform group-hover:scale-110" />
                      <div>
                        <span className="font-bold text-primary block">SEGMENT [{Math.floor(seg.startTime)}s - {Math.floor(seg.endTime)}s]</span>
                        <span className="text-muted-foreground truncate block">{seg.reason}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4 border-t space-y-6 bg-muted/10 -mx-6 px-6 pb-6">
               <div className="space-y-3">
                <Label className="text-[10px] font-extrabold uppercase text-muted-foreground mb-1 block">Help AI Learn (Ground Truth)</Label>
                <div className="flex gap-3">
                  <Button 
                    variant={feedbackSubmitted === true ? "default" : "outline"} 
                    className={cn("flex-1 h-12 gap-2", feedbackSubmitted === true && "bg-primary")}
                    onClick={() => submitFeedback(true)}
                  >
                    <ThumbsUp className="w-4 h-4" /> AI was Correct
                  </Button>
                  <Button 
                    variant={feedbackSubmitted === false ? "destructive" : "outline"} 
                    className="flex-1 h-12 gap-2"
                    onClick={() => submitFeedback(false)}
                  >
                    <ThumbsDown className="w-4 h-4" /> AI was Wrong
                  </Button>
                </div>
               </div>

               <div className="space-y-2">
                <Label className="text-sm font-bold flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  Private Forensic Notes
                </Label>
                <Textarea 
                  placeholder="Describe specific artifacts missed or found. These notes stay on your PC and help the AI 'remember' what to look for next time."
                  className="text-xs min-h-[100px] bg-background"
                  value={userComment}
                  onChange={(e) => setUserComment(e.target.value)}
                />
                <Button size="sm" className="w-full font-bold" onClick={handleSaveComment}>
                  Update Intelligence Base
                </Button>
               </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden flex items-center justify-center p-4 bg-muted/30 relative border-2 shadow-inner">
          <div className="relative rounded-xl overflow-hidden border-4 border-background bg-background flex items-center justify-center shadow-2xl w-full h-full max-h-[80vh]">
             {mediaType === 'image' && (
               <div className="relative w-full h-full flex items-center justify-center">
                 <img src={mediaUrl} className="max-w-full max-h-full object-contain" />
                 
                 {/* AI Highlighted Regions Overlay - The "Forensic Overlay" */}
                 {result.highlightedRegions?.map((region: any, i: number) => (
                   <div 
                    key={i}
                    className="absolute border-2 border-destructive bg-destructive/20 transition-all duration-300 group"
                    style={{
                      left: `${region.x}%`,
                      top: `${region.y}%`,
                      width: `${region.width}%`,
                      height: `${region.height}%`,
                    }}
                   >
                     {/* Pulse effect for visibility */}
                     <div className="absolute inset-0 border-4 border-destructive animate-ping opacity-20" />
                     <div className="absolute -top-6 left-0 bg-destructive text-white text-[9px] px-1.5 py-0.5 rounded font-bold whitespace-nowrap shadow-lg flex items-center gap-1">
                       <MapPin className="w-2.5 h-2.5" />
                       EVIDENCE #{i+1}
                     </div>
                   </div>
                 ))}
               </div>
             )}
             
             {mediaType === 'video' && (
               <div className="w-full h-full flex items-center justify-center">
                 <video 
                   ref={mediaRef as any} 
                   src={mediaUrl} 
                   controls 
                   className="max-w-full max-h-full" 
                 />
               </div>
             )}
             
             {mediaType === 'audio' && (
               <div className="flex flex-col items-center gap-8 p-12 w-full">
                 <div className="p-8 rounded-full bg-primary/10 border-4 border-primary/20 animate-pulse">
                   <Music className="w-24 h-24 text-primary" />
                 </div>
                 <audio ref={mediaRef as any} src={mediaUrl} controls className="w-full shadow-lg rounded-full" />
               </div>
             )}
          </div>
          
          <div className="absolute bottom-6 right-6 flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/80 backdrop-blur-md border text-[10px] font-bold text-muted-foreground uppercase shadow-sm">
            <Info className="w-3 h-3" />
            Inspecting {mediaType} source
          </div>
        </Card>
      </div>
    </div>
  )
}
