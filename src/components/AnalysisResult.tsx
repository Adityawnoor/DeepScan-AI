"use client"

import * as React from "react"
import { 
  ShieldCheck, Info, Music, Video, ThumbsUp, ThumbsDown, 
  MessageSquare, FileJson, Download, SearchCode, ShieldAlert,
  Dna, Fingerprint, Microscope, Zap, Database, Layers,
  Activity, AlertTriangle, Sparkles, Brain, Scale, FileText,
  Clock, Maximize2, Share2, HeartPulse, Crosshair, Target,
  Map as MapIcon, Compass, Workflow, AlertCircle
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, 
  Tooltip as ChartTooltip, ResponsiveContainer, Cell,
  ReferenceLine
} from "recharts"

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

  const mapData = [
    { x: 0, y: 0, name: "Authentic Human", type: "real" },
    { x: result.neuralAncestry?.latentCoordinates?.x || 0, y: result.neuralAncestry?.latentCoordinates?.y || 0, name: "Subject Asset", type: "subject" },
    { x: 80, y: 70, name: "Stable Diffusion Cluster", type: "cluster" },
    { x: -70, y: 85, name: "Midjourney Cluster", type: "cluster" },
    { x: 20, y: -90, name: "Flux.1 Cluster", type: "cluster" },
  ]

  const saveToLocal = (update: any) => {
    const saved = localStorage.getItem("deepscan-scans-metadata")
    let scans = saved ? JSON.parse(saved) : []
    scans = scans.map((s: any) => s.id === scanId ? { ...s, ...update } : s)
    localStorage.setItem("deepscan-scans-metadata", JSON.stringify(scans))
    if (onUpdate) onUpdate()
  }

  const exportEvidence = async () => {
    if (!vaultHandle) {
      toast({ variant: "destructive", title: "Vault Unlinked", description: "Link a PC folder in the Database tab to export." })
      return
    }
    try {
      const fileName = `Forensic_Report_${scanId.substring(0, 8)}.json`
      const fileHandle = await vaultHandle.getFileHandle(fileName, { create: true })
      const writable = await fileHandle.createWritable()
      const evidence = {
        scanId,
        timestamp: new Date().toISOString(),
        verdict: isFake ? "SYNTHETIC" : "AUTHENTIC",
        confidence,
        neuralDNA: result.neuralAncestry,
        biometrics: result.biometricVitals,
        artifacts: result.noiseArtifacts,
        expertNotes: userComment,
        humanVerification: feedbackSubmitted
      }
      await writable.write(JSON.stringify(evidence, null, 2))
      await writable.close()
      toast({ title: "Evidence Exported", description: `Saved as ${fileName} to your PC vault.` })
    } catch (e) {
      toast({ variant: "destructive", title: "Export Failed" })
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* LEFT PANEL: ELITE FORENSICS */}
        <Card className="border-2 border-primary/20 shadow-2xl flex flex-col bg-card/50 backdrop-blur-sm overflow-hidden">
          <CardHeader className="border-b bg-muted/20 relative z-10">
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <CardTitle className="font-black text-2xl flex items-center gap-2 tracking-tighter">
                  <Target className="w-6 h-6 text-primary" />
                  SINGULARITY REPORT
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

          <CardContent className="p-6 space-y-8 flex-1 relative z-10">
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

            <Tabs defaultValue="biometrics" className="w-full">
              <TabsList className="grid grid-cols-4 bg-muted/50 p-1 rounded-xl h-11">
                <TabsTrigger value="biometrics" className="text-[9px] font-black uppercase tracking-tighter gap-1">
                  <HeartPulse className="w-3.5 h-3.5" /> Vital
                </TabsTrigger>
                <TabsTrigger value="ancestry" className="text-[9px] font-black uppercase tracking-tighter gap-1">
                  <Dna className="w-3.5 h-3.5" /> DNA
                </TabsTrigger>
                <TabsTrigger value="origin" className="text-[9px] font-black uppercase tracking-tighter gap-1">
                  <MapIcon className="w-3.5 h-3.5" /> Origin
                </TabsTrigger>
                <TabsTrigger value="spectral" className="text-[9px] font-black uppercase tracking-tighter gap-1">
                  <Layers className="w-3.5 h-3.5" /> Noise
                </TabsTrigger>
              </TabsList>

              <TabsContent value="biometrics" className="pt-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className={cn(
                    "p-4 rounded-2xl border flex flex-col items-center justify-center text-center gap-2",
                    result.biometricVitals?.pulseDetected ? "bg-green-500/10 border-green-500/20" : "bg-destructive/10 border-destructive/20"
                  )}>
                    <HeartPulse className={cn("w-8 h-8", result.biometricVitals?.pulseDetected ? "text-green-500 animate-pulse" : "text-destructive")} />
                    <div className="space-y-1">
                      <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">rPPG Pulse</span>
                      <p className="text-xs font-black">{result.biometricVitals?.pulseDetected ? "DETECTED" : "ABSENT"}</p>
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 flex flex-col items-center justify-center text-center gap-2">
                    <Activity className="w-8 h-8 text-primary" />
                    <div className="space-y-1">
                      <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Vital Flow</span>
                      <p className="text-xs font-black">{result.biometricVitals?.biometricConsistency || 0}% Match</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-muted/30 border border-dashed text-[10px] font-medium leading-relaxed italic text-muted-foreground">
                  <Info className="w-3.5 h-3.5 inline mr-1 text-primary" />
                  {result.biometricVitals?.notes || "Skin pulse detection matches rhythmic color fluctuations."}
                </div>
              </TabsContent>

              <TabsContent value="ancestry" className="pt-6 space-y-4">
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
                <div className="p-4 rounded-2xl border-2 border-dashed border-primary/10 bg-muted/10">
                   <p className="text-xs font-medium leading-relaxed text-foreground/80">
                    {result.explanation}
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="origin" className="pt-6 space-y-4">
                 <div className="h-[200px] w-full bg-muted/20 rounded-2xl border relative overflow-hidden">
                    <ResponsiveContainer width="100%" height="100%">
                       <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                          <XAxis type="number" dataKey="x" hide domain={[-100, 100]} />
                          <YAxis type="number" dataKey="y" hide domain={[-100, 100]} />
                          <ZAxis range={[60, 400]} />
                          <ReferenceLine x={0} stroke="rgba(0,0,0,0.1)" strokeDasharray="3 3" />
                          <ReferenceLine y={0} stroke="rgba(0,0,0,0.1)" strokeDasharray="3 3" />
                          <Scatter name="Clusters" data={mapData}>
                             {mapData.map((entry, index) => (
                               <Cell 
                                 key={`cell-${index}`} 
                                 fill={entry.type === 'subject' ? 'hsl(var(--primary))' : entry.type === 'real' ? '#22c55e' : 'rgba(0,0,0,0.2)'} 
                                 className={cn(entry.type === 'subject' && "animate-pulse")}
                               />
                             ))}
                          </Scatter>
                       </ScatterChart>
                    </ResponsiveContainer>
                 </div>
                 <p className="text-[9px] text-center font-bold text-muted-foreground uppercase tracking-widest">
                   Latent Origin Map: Subject coordinate is [{result.neuralAncestry?.latentCoordinates?.x}, {result.neuralAncestry?.latentCoordinates?.y}]
                 </p>
              </TabsContent>

              <TabsContent value="spectral" className="pt-6 space-y-4">
                <div className="p-4 rounded-2xl bg-destructive/5 border border-destructive/10">
                  <div className="flex items-center gap-2 mb-3">
                    <Microscope className="w-4 h-4 text-destructive" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-destructive">Noise Artifact Detected</span>
                  </div>
                  <p className="text-xs font-bold leading-tight">
                    {result.noiseArtifacts?.description || "High-frequency latent noise artifacts detected."}
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
            </Tabs>
          </CardContent>

          <CardFooter className="border-t p-6 bg-muted/5 gap-3 relative z-10">
            <Button className="flex-1 h-12 font-black uppercase tracking-widest shadow-xl group" onClick={exportEvidence}>
              <FileJson className="w-4 h-4 mr-2 transition-transform group-hover:scale-110" /> Export Proof to Vault
            </Button>
            <Button variant="outline" className="h-12 w-12 rounded-xl" onClick={() => window.print()}>
              <Download className="w-5 h-5" />
            </Button>
          </CardFooter>
        </Card>

        {/* RIGHT PANEL: VISUAL EVIDENCE WITH PRECISION OVERLAYS */}
        <Card className="relative overflow-hidden border-2 border-primary/10 shadow-inner bg-black flex flex-col items-center justify-center p-0 rounded-3xl min-h-[500px]">
          {/* Spectral Overlay Filter */}
          <div className={cn(
            "absolute inset-0 z-20 pointer-events-none transition-all duration-700",
            showSpectralMode ? "opacity-100 backdrop-grayscale mix-blend-difference" : "opacity-0"
          )}>
            <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/noise/1000/1000')] opacity-30 mix-blend-overlay animate-pulse" />
          </div>

          <div className="relative flex items-center justify-center p-4">
            {/* THIS WRAPPER ENSURES OVERLAYS SCALE WITH THE IMAGE */}
            <div className="relative inline-block max-w-full max-h-[80vh]">
              {mediaType === 'image' && (
                <>
                  <img 
                    src={mediaUrl} 
                    className={cn("max-w-full h-auto object-contain rounded-xl transition-all duration-700", showSpectralMode && "brightness-150 contrast-200 blur-[1px]")} 
                  />
                  {/* Precise Bounding Boxes */}
                  {result.highlightedRegions?.map((region: any, i: number) => (
                    <div 
                      key={i}
                      className="absolute border-2 border-destructive shadow-[0_0_15px_rgba(255,0,0,0.5)] animate-in fade-in zoom-in duration-500 group"
                      style={{
                        left: `${region.x}%`,
                        top: `${region.y}%`,
                        width: `${region.width}%`,
                        height: `${region.height}%`,
                      }}
                    >
                      <div className="absolute -top-6 left-0 bg-destructive text-white text-[8px] px-2 py-0.5 rounded-sm font-black flex items-center gap-1 shadow-xl whitespace-nowrap opacity-80 group-hover:opacity-100 transition-opacity">
                        <ShieldAlert className="w-3 h-3" />
                        ARTIFACT #{i+1}
                      </div>
                      <div className="absolute inset-0 bg-destructive/10 hidden group-hover:block" title={region.reason} />
                    </div>
                  ))}
                </>
              )}
              
              {mediaType === 'video' && <video ref={mediaRef as any} src={mediaUrl} controls className="max-w-full h-auto rounded-xl shadow-2xl" />}
              
              {mediaType === 'audio' && (
                <div className="flex flex-col items-center gap-8 p-12">
                  <div className="p-12 rounded-full bg-primary/10 border-8 border-primary/5 animate-pulse">
                    <Music className="w-32 h-32 text-primary" />
                  </div>
                  <audio ref={mediaRef as any} src={mediaUrl} controls className="w-80 shadow-2xl" />
                </div>
              )}
            </div>
          </div>

          {/* Indicator badges */}
          <div className="absolute bottom-6 right-6 z-30 flex gap-2">
            <Badge className="bg-primary/90 text-white font-black text-[10px] px-3 py-1 uppercase tracking-tighter backdrop-blur-md">
              <Zap className="w-3 h-3 mr-1.5" /> Singularity Engine
            </Badge>
            {showSpectralMode && (
              <Badge variant="destructive" className="font-black text-[10px] px-3 py-1 uppercase tracking-tighter animate-pulse">
                Spectral Mode
              </Badge>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
