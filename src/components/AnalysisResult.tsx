
"use client"

import * as React from "react"
import { 
  AlertCircle, CheckCircle2, Info, Image as ImageIcon, Music, Video, 
  Clock, ThumbsUp, ThumbsDown, MessageSquare, Send, MapPin, 
  PlayCircle, Fingerprint, FileJson, Download, SearchCode, ShieldAlert
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface AnalysisResultProps {
  scanId: string
  result: any
  mediaUrl: string
  mediaType: 'image' | 'audio' | 'video'
  vaultHandle?: FileSystemDirectoryHandle | null
  onUpdate?: () => void
}

export function AnalysisResult({ scanId, result, mediaUrl, mediaType, vaultHandle, onUpdate }: AnalysisResultProps) {
  const { toast } = useToast()
  const [feedbackSubmitted, setFeedbackSubmitted] = React.useState<boolean | null>(null)
  const [userComment, setUserComment] = React.useState("")
  const [metadata, setMetadata] = React.useState<Record<string, string>>({})
  const mediaRef = React.useRef<HTMLVideoElement | HTMLAudioElement>(null)

  React.useEffect(() => {
    setFeedbackSubmitted(null)
    setUserComment("")
    // Simulate metadata extraction (AI Forensics often looks for encoder strings)
    const mockMeta: Record<string, string> = {
      "Format": mediaType.toUpperCase(),
      "Encoding": "Forensic Standard v4",
      "Timestamp": new Date().toISOString(),
      "Artifact Rating": result.isDeepfake ? "High" : "Minimal",
      "Source Consistency": result.confidence > 90 ? "Likely Synthetic" : "Hybrid Elements"
    }
    setMetadata(mockMeta)
  }, [scanId, mediaType, result])

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

  const handleExportProof = async () => {
    if (!vaultHandle) {
      toast({ 
        variant: "destructive", 
        title: "No Vault Connected", 
        description: "You must link a PC folder to export forensic proof files." 
      })
      return
    }

    try {
      const reportData = {
        reportId: scanId,
        date: new Date().toISOString(),
        mediaType,
        verdict: result.isDeepfake ? "DEEPFAKE" : "AUTHENTIC",
        confidence: result.confidence,
        explanation: result.explanation,
        anomalies: result.highlightedRegions || result.suspiciousTimestamps || result.suspiciousSegments || [],
        userNotes: userComment,
        forensicMetadata: metadata
      }

      const fileName = `Forensic_Report_${scanId.substring(0, 8)}.json`
      const fileHandle = await vaultHandle.getFileHandle(fileName, { create: true })
      const writable = await fileHandle.createWritable()
      await writable.write(JSON.stringify(reportData, null, 2))
      await writable.close()

      toast({
        title: "Forensic Proof Exported",
        description: `Saved as ${fileName} in your PC Vault.`,
      })
    } catch (err) {
      console.error("Export failed:", err)
      toast({ variant: "destructive", title: "Export Failed", description: "Check folder permissions." })
    }
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
            <Tabs defaultValue="forensics" className="w-full">
              <TabsList className="grid grid-cols-2 mb-4">
                <TabsTrigger value="forensics" className="text-xs font-bold">Analysis</TabsTrigger>
                <TabsTrigger value="metadata" className="text-xs font-bold">Metadata</TabsTrigger>
              </TabsList>
              
              <TabsContent value="forensics" className="space-y-6">
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
                </div>

                {/* Forensic Evidence List */}
                {((result.highlightedRegions && result.highlightedRegions.length > 0) || 
                  (result.suspiciousTimestamps && result.suspiciousTimestamps.length > 0) ||
                  (result.suspiciousSegments && result.suspiciousSegments.length > 0)) && (
                  <div className="space-y-3">
                    <Label className="text-[10px] font-extrabold uppercase text-muted-foreground tracking-tighter">Detected Anomalies</Label>
                    <div className="space-y-2 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                      {result.highlightedRegions?.map((region: any, i: number) => (
                        <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-destructive/5 border border-destructive/10 text-[11px]">
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
                          <PlayCircle className="w-5 h-5 text-primary shrink-0" />
                          <div>
                            <span className="font-bold text-primary block">TIMESTAMP [{Math.floor(ts.timestamp)}s]</span>
                            <span className="text-muted-foreground truncate block">{ts.description}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="metadata" className="space-y-4">
                 <div className="rounded-xl border bg-muted/20 overflow-hidden">
                   <div className="bg-muted p-2 flex items-center gap-2 border-b">
                     <SearchCode className="w-4 h-4 text-primary" />
                     <span className="text-[10px] font-black uppercase tracking-wider">Media Artifact Inspector</span>
                   </div>
                   <div className="p-4 space-y-3">
                     {Object.entries(metadata).map(([key, val]) => (
                       <div key={key} className="flex justify-between items-center text-[11px] border-b border-muted last:border-0 pb-2">
                         <span className="font-bold text-muted-foreground">{key}</span>
                         <span className="font-mono text-primary">{val}</span>
                       </div>
                     ))}
                   </div>
                 </div>
                 <AlertCircle className="w-4 h-4 text-muted-foreground inline mr-1" />
                 <span className="text-[9px] text-muted-foreground italic">Standard Forensic Metadata extraction successful.</span>
              </TabsContent>
            </Tabs>

            <div className="pt-4 border-t space-y-6 bg-muted/10 -mx-6 px-6 pb-6">
               <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 font-bold text-[10px] uppercase h-10 bg-background" onClick={handleExportProof}>
                    <FileJson className="w-3.5 h-3.5 mr-2" /> Export Proof to Vault
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 font-bold text-[10px] uppercase h-10 bg-background" disabled>
                    <Download className="w-3.5 h-3.5 mr-2" /> Download Evidence
                  </Button>
               </div>

               <div className="space-y-3">
                <Label className="text-[10px] font-extrabold uppercase text-muted-foreground mb-1 block">Help AI Learn (Ground Truth)</Label>
                <div className="flex gap-3">
                  <Button 
                    variant={feedbackSubmitted === true ? "default" : "outline"} 
                    className={cn("flex-1 h-12 gap-2", feedbackSubmitted === true && "bg-primary")}
                    onClick={() => submitFeedback(true)}
                  >
                    <ThumbsUp className="w-4 h-4" /> AI Correct
                  </Button>
                  <Button 
                    variant={feedbackSubmitted === false ? "destructive" : "outline"} 
                    className="flex-1 h-12 gap-2"
                    onClick={() => submitFeedback(false)}
                  >
                    <ThumbsDown className="w-4 h-4" /> AI Wrong
                  </Button>
                </div>
               </div>

               <div className="space-y-2">
                <Label className="text-sm font-bold flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  Forensic Notes
                </Label>
                <Textarea 
                  placeholder="Notes stay in your PC Vault..."
                  className="text-xs min-h-[80px] bg-background"
                  value={userComment}
                  onChange={(e) => setUserComment(e.target.value)}
                />
                <Button size="sm" className="w-full font-bold" onClick={handleSaveComment}>
                  Save to Local Memory
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
                 {result.highlightedRegions?.map((region: any, i: number) => (
                   <div 
                    key={i}
                    className="absolute border-2 border-destructive bg-destructive/20 transition-all duration-300"
                    style={{
                      left: `${region.x}%`,
                      top: `${region.y}%`,
                      width: `${region.width}%`,
                      height: `${region.height}%`,
                    }}
                   >
                     <div className="absolute -top-6 left-0 bg-destructive text-white text-[9px] px-1.5 py-0.5 rounded font-bold whitespace-nowrap flex items-center gap-1">
                       <ShieldAlert className="w-2.5 h-2.5" />
                       EVIDENCE #{i+1}
                     </div>
                   </div>
                 ))}
               </div>
             )}
             {mediaType === 'video' && (
               <video ref={mediaRef as any} src={mediaUrl} controls className="max-w-full max-h-full" />
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
        </Card>
      </div>
    </div>
  )
}
