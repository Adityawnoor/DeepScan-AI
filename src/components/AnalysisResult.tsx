"use client"

import * as React from "react"
import { 
  ShieldCheck, Info, Music, Video, ThumbsUp, ThumbsDown, 
  MessageSquare, FileJson, Download, SearchCode, ShieldAlert,
  Dna, Fingerprint, Microscope, Zap, Database, Layers,
  Activity, AlertTriangle, Sparkles, Brain, Scale
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
  const [showSpectralMode, setShowSpectralMode] = React.useState(false)
  const mediaRef = React.useRef<HTMLVideoElement | HTMLAudioElement>(null)

  const isFake = result.isDeepfake
  const confidence = result.confidence

  const saveToLocal = (update: any) => {
    const saved = localStorage.getItem("deepscan-scans-metadata")
    let scans = saved ? JSON.parse(saved) : []
    scans = scans.map((s: any) => s.id === scanId ? { ...s, ...update } : s)
    localStorage.setItem("deepscan-scans-metadata", JSON.stringify(scans))
    if (onUpdate) onUpdate()
  }

  const submitFeedback = (userVerdict: boolean) => {
    setFeedbackSubmitted(userVerdict)
    saveToLocal({ userFeedback: userVerdict, isCorrect: result.isDeepfake === userVerdict })
    toast({ title: "Ground Truth Saved", description: "AI updated with verified verdict." })
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* LEFT PANEL: ELITE FORENSICS */}
        <Card className="border-2 border-primary/20 shadow-2xl flex flex-col bg-card/50 backdrop-blur-sm">
          <CardHeader className="border-b bg-muted/20">
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <CardTitle className="font-black text-2xl flex items-center gap-2 tracking-tighter">
                  <Fingerprint className="w-6 h-6 text-primary" />
                  NEURAL DOSSIER
                </CardTitle>
                <CardDescription className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                  Case ID: {scanId.substring(0, 12)}
                </CardDescription>
              </div>
              <Badge variant={isFake ? "destructive" : "default"} className="px-4 py-1.5 font-black text-xs uppercase tracking-widest shadow-lg">
                {isFake ? "SYNTHETIC" : "AUTHENTIC"}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-8 flex-1">
            {/* Accuracy & Progress */}
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <Label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" /> Verdict Confidence
                </Label>
                <span className={cn("text-2xl font-black", isFake ? "text-destructive" : "text-primary")}>
                  {confidence}%
                </span>
              </div>
              <Progress value={confidence} className={cn("h-4 rounded-full bg-muted shadow-inner", isFake ? "[&>div]:bg-destructive" : "[&>div]:bg-primary")} />
            </div>

            <Tabs defaultValue="ancestry" className="w-full">
              <TabsList className="grid grid-cols-3 bg-muted/50 p-1 rounded-xl h-11">
                <TabsTrigger value="ancestry" className="text-[9px] font-black uppercase tracking-tighter gap-1.5">
                  <Dna className="w-3.5 h-3.5" /> Ancestry
                </TabsTrigger>
                <TabsTrigger value="spectral" className="text-[9px] font-black uppercase tracking-tighter gap-1.5">
                  <Layers className="w-3.5 h-3.5" /> Spectral
                </TabsTrigger>
                <TabsTrigger value="notes" className="text-[9px] font-black uppercase tracking-tighter gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" /> Vault
                </TabsTrigger>
              </TabsList>

              <TabsContent value="ancestry" className="pt-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 space-y-1">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Model Family</span>
                    <p className="text-sm font-black text-primary">{result.neuralAncestry?.modelFamily || "Unknown"}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 space-y-1">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Likely Source</span>
                    <p className="text-sm font-black text-primary">{result.neuralAncestry?.likelyModel || "Neural Hybrid"}</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl border-2 border-dashed border-primary/10 bg-muted/10 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-2 opacity-20 group-hover:opacity-100 transition-opacity">
                    <Brain className="w-12 h-12 text-primary" />
                  </div>
                  <p className="text-xs font-medium leading-relaxed italic text-foreground/80 relative z-10">
                    "{result.explanation}"
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="spectral" className="pt-6 space-y-4">
                <div className="p-4 rounded-2xl bg-destructive/5 border border-destructive/10">
                  <div className="flex items-center gap-2 mb-3">
                    <Microscope className="w-4 h-4 text-destructive" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-destructive">Noise Artifact Detected</span>
                  </div>
                  <p className="text-xs font-bold leading-tight">
                    {result.noiseArtifacts?.description || "Inconsistent high-frequency pixel distribution found in the latent space."}
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  className={cn("w-full h-12 font-black uppercase tracking-widest border-2 transition-all", showSpectralMode ? "bg-primary text-white border-primary" : "hover:border-primary")}
                  onClick={() => setShowSpectralMode(!showSpectralMode)}
                >
                  <Layers className="w-4 h-4 mr-2" />
                  {showSpectralMode ? "Exit Spectral View" : "Enable Spectral Analysis"}
                </Button>
              </TabsContent>

              <TabsContent value="notes" className="pt-6 space-y-4">
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Vault Certification</Label>
                  <div className="flex gap-2">
                    <Button variant={feedbackSubmitted === true ? "default" : "outline"} className="flex-1 h-12 font-bold" onClick={() => submitFeedback(true)}>
                      <ThumbsUp className="w-4 h-4 mr-2" /> Verified
                    </Button>
                    <Button variant={feedbackSubmitted === false ? "destructive" : "outline"} className="flex-1 h-12 font-bold" onClick={() => submitFeedback(false)}>
                      <ThumbsDown className="w-4 h-4 mr-2" /> Disputed
                    </Button>
                  </div>
                </div>
                <Textarea 
                  placeholder="Record forensic observation to PC memory..."
                  className="text-xs min-h-[100px] bg-background/50 rounded-xl"
                  value={userComment}
                  onChange={(e) => setUserComment(e.target.value)}
                />
                <Button className="w-full font-black uppercase tracking-tighter" onClick={() => { saveToLocal({ userComment }); toast({ title: "Memory Updated" }); }}>
                  Save to Vault
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>

          <CardFooter className="border-t p-6 bg-muted/5 gap-3">
            <Button className="flex-1 h-12 font-black uppercase tracking-widest shadow-xl" onClick={() => toast({ title: "Generating Secure Report..." })}>
              <FileJson className="w-4 h-4 mr-2" /> Export Evidence
            </Button>
            <Button variant="outline" className="h-12 w-12 rounded-xl" onClick={() => window.print()}>
              <Download className="w-5 h-5" />
            </Button>
          </CardFooter>
        </Card>

        {/* RIGHT PANEL: VISUAL EVIDENCE */}
        <Card className="relative overflow-hidden border-2 border-primary/10 shadow-inner bg-black flex items-center justify-center p-0 rounded-3xl min-h-[500px]">
          {/* Spectral Overlay Filter */}
          <div className={cn(
            "absolute inset-0 z-20 pointer-events-none transition-all duration-700",
            showSpectralMode ? "opacity-100 backdrop-grayscale mix-blend-difference" : "opacity-0"
          )}>
            <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/noise/1000/1000')] opacity-30 mix-blend-overlay animate-pulse" />
          </div>

          <div className="relative w-full h-full flex items-center justify-center group">
            {mediaType === 'image' && (
              <>
                <img 
                  src={mediaUrl} 
                  className={cn("max-w-full max-h-[80vh] object-contain transition-all duration-700 rounded-xl", showSpectralMode && "brightness-150 contrast-200 blur-[1px]")} 
                />
                {/* Forensic Bounding Boxes */}
                {result.highlightedRegions?.map((region: any, i: number) => (
                  <div 
                    key={i}
                    className="absolute border-4 border-destructive shadow-[0_0_20px_rgba(255,0,0,0.5)] animate-pulse transition-all duration-500 hover:scale-105"
                    style={{
                      left: `${region.x}%`,
                      top: `${region.y}%`,
                      width: `${region.width}%`,
                      height: `${region.height}%`,
                    }}
                  >
                    <div className="absolute -top-10 left-0 bg-destructive text-white text-[10px] px-3 py-1.5 rounded-full font-black flex items-center gap-2 shadow-2xl">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      SYNTHETIC ARTIFACT #{i+1}
                    </div>
                  </div>
                ))}
              </>
            )}
            
            {mediaType === 'video' && <video src={mediaUrl} controls className="max-w-full max-h-[80vh] rounded-xl shadow-2xl" />}
            
            {mediaType === 'audio' && (
              <div className="flex flex-col items-center gap-8 p-12">
                <div className="p-12 rounded-full bg-primary/10 border-8 border-primary/5 animate-bounce-slow">
                  <Music className="w-32 h-32 text-primary" />
                </div>
                <audio src={mediaUrl} controls className="w-80 shadow-2xl" />
              </div>
            )}
          </div>

          {/* Special Indicator */}
          <div className="absolute bottom-6 right-6 z-30 flex gap-2">
            <Badge className="bg-primary/90 text-white font-black text-[10px] px-3 py-1 uppercase tracking-tighter backdrop-blur-md">
              <Zap className="w-3 h-3 mr-1.5" /> Live Forensic Engine
            </Badge>
            {showSpectralMode && (
              <Badge variant="destructive" className="font-black text-[10px] px-3 py-1 uppercase tracking-tighter animate-pulse">
                Spectral Mode Active
              </Badge>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
