
"use client"

import * as React from "react"
import { 
  ShieldCheck, Info, Music, Video, ThumbsUp, ThumbsDown, 
  FileJson, Download, ShieldAlert,
  Dna, HeartPulse, Target,
  Map as MapIcon, Gavel,
  ShieldX, Copy, Activity, Cpu, Layers, MessageSquare,
  Database, AlertCircle, Scan
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, 
  ResponsiveContainer, Cell,
  ReferenceLine
} from "recharts"
import { useFirestore } from "@/firebase"
import { doc, updateDoc, setDoc } from "firebase/firestore"
import { errorEmitter } from "@/firebase/error-emitter"
import { FirestorePermissionError } from "@/firebase/errors"

interface AnalysisResultProps {
  scanId: string
  result: any
  mediaUrl: string
  mediaType: 'image' | 'audio' | 'video'
  vaultHandle?: FileSystemDirectoryHandle | null
}

export function AnalysisResult({ scanId, result, mediaUrl, mediaType, vaultHandle }: AnalysisResultProps) {
  const { toast } = useToast()
  const db = useFirestore()
  const [feedbackSubmitted, setFeedbackSubmitted] = React.useState<boolean | null>(null)
  const [userComment, setUserComment] = React.useState("")
  const [showSpectralMode, setShowSpectralMode] = React.useState(false)
  const [showTakedown, setShowTakedown] = React.useState(false)
  const [isPromoted, setIsPromoted] = React.useState(false)
  const [activeHighlight, setActiveHighlight] = React.useState<number | null>(null)

  const isFake = result.isDeepfake
  const confidence = result.confidence

  const handleFeedback = (isCorrect: boolean) => {
    if (!db) return
    setFeedbackSubmitted(isCorrect)
    
    const scanRef = doc(db, "scans", scanId)
    const updateData = {
      userFeedback: isCorrect ? isFake : !isFake,
      isCorrect,
      userComment: userComment.trim()
    }

    updateDoc(scanRef, updateData).catch(async (err) => {
      const permissionError = new FirestorePermissionError({
        path: scanRef.path,
        operation: 'update',
        requestResourceData: updateData
      })
      errorEmitter.emit('permission-error', permissionError)
    })
    
    toast({ title: "Audit Logged", description: "This lesson is now part of the global intelligence base." })
  }

  const promoteToDataset = () => {
    if (!db) return
    if (feedbackSubmitted === null) {
      toast({ variant: "destructive", title: "Audit Required", description: "Verify the result before promoting to Dataset." })
      return
    }

    const datasetId = crypto.randomUUID()
    const datasetRef = doc(db, "datasets", datasetId)
    const datasetData = {
      fileName: `AUDIT_${scanId.substring(0, 8)}`,
      uploadDate: new Date().toISOString(),
      label: feedbackSubmitted ? (isFake ? "fake" : "real") : (isFake ? "real" : "fake"),
      notes: userComment || `Manual audit promotion from Case ${scanId}`,
      status: "processed",
      scanId
    }

    setDoc(datasetRef, datasetData).catch(async (err) => {
      const permissionError = new FirestorePermissionError({
        path: datasetRef.path,
        operation: 'create',
        requestResourceData: datasetData
      })
      errorEmitter.emit('permission-error', permissionError)
    })

    setIsPromoted(true)
    toast({ title: "Intelligence Promoted", description: "Knowledge successfully synced to Cloud Brain." })
  }

  const mapData = [
    { x: 0, y: 0, name: "Authentic Human", type: "real" },
    { x: result.neuralAncestry?.latentCoordinates?.x || 0, y: result.neuralAncestry?.latentCoordinates?.y || 0, name: "Subject", type: "subject" },
    { x: 80, y: 70, name: "SDXL Cluster", type: "cluster" },
    { x: -70, y: 85, name: "MJv6 Cluster", type: "cluster" },
  ]

  const exportEvidence = async () => {
    if (!vaultHandle) {
      toast({ 
        variant: "destructive", 
        title: "PC Vault Required", 
        description: "Select a folder in the TRAINING tab to save physical evidence." 
      })
      return
    }

    try {
      const fileName = `FORENSIC_REPORT_${scanId.substring(0, 8)}.json`
      const fileHandle = await vaultHandle.getFileHandle(fileName, { create: true })
      const writable = await (fileHandle as any).createWritable()
      
      const evidence = {
        scanId,
        timestamp: new Date().toISOString(),
        verdict: isFake ? "SYNTHETIC" : "AUTHENTIC",
        confidence,
        neuralDNA: result.neuralAncestry,
        biometrics: result.biometricVitals,
        humanVerification: feedbackSubmitted,
        userComment,
        explainability: {
          highlightedRegions: result.highlightedRegions,
          suspiciousTimestamps: result.suspiciousTimestamps
        }
      }

      await writable.write(JSON.stringify(evidence, null, 2))
      await writable.close()
      
      toast({ title: "Evidence Exported", description: `Report saved to your PC vault.` })
    } catch (e: any) {
      toast({ variant: "destructive", title: "Export Failed", description: e.message })
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        <Card className="border border-border shadow-none flex flex-col bg-card rounded-2xl overflow-hidden volumetric-shadow group hover:border-primary/30 transition-all duration-300">
          <CardHeader className="border-b bg-muted/20 p-6 relative">
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <CardTitle className="font-black text-2xl flex items-center gap-2 tracking-tighter text-foreground uppercase">
                  <Target className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
                  FORENSIC REPORT
                </CardTitle>
                <CardDescription className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                  Case ID: {scanId.substring(0, 12)}
                </CardDescription>
              </div>
              <Badge variant={isFake ? "destructive" : "default"} className="px-4 py-1.5 font-black text-xs uppercase tracking-widest rounded-xl hover-glow transition-all">
                {isFake ? "SYNTHETIC" : "AUTHENTIC"}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-8 flex-1">
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <Label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" /> Verdict Confidence
                </Label>
                <span className={cn("text-2xl font-black", isFake ? "text-destructive" : "text-primary")}>
                  {confidence}%
                </span>
              </div>
              <Progress value={confidence} className={cn("h-4 rounded-xl bg-muted", isFake ? "[&>div]:bg-destructive" : "[&>div]:bg-primary")} />
            </div>

            <Tabs defaultValue="why" className="w-full">
              <TabsList className="grid grid-cols-5 bg-muted/50 p-1 rounded-xl h-11 border">
                <TabsTrigger value="why" className="text-[9px] font-black uppercase tracking-tighter gap-1 data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg">
                  <Info className="w-3.5 h-3.5" /> Why?
                </TabsTrigger>
                <TabsTrigger value="biometrics" className="text-[9px] font-black uppercase tracking-tighter gap-1 data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg">
                  <HeartPulse className="w-3.5 h-3.5" /> Vital
                </TabsTrigger>
                <TabsTrigger value="ancestry" className="text-[9px] font-black uppercase tracking-tighter gap-1 data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg">
                  <Dna className="w-3.5 h-3.5" /> DNA
                </TabsTrigger>
                <TabsTrigger value="audit" className="text-[9px] font-black uppercase tracking-tighter gap-1 data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg">
                  <ShieldCheck className="w-3.5 h-3.5" /> Audit
                </TabsTrigger>
                <TabsTrigger value="actions" className="text-[9px] font-black uppercase tracking-tighter gap-1 data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg">
                  <Gavel className="w-3.5 h-3.5" /> Action
                </TabsTrigger>
              </TabsList>

              <TabsContent value="why" className="pt-6 space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Scan className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-black uppercase tracking-tighter">EXPLAINABLE AI BREAKDOWN</h3>
                  </div>
                  
                  {isFake ? (
                    <div className="space-y-3">
                      {result.highlightedRegions?.map((region: any, i: number) => (
                        <div 
                          key={i} 
                          className={cn(
                            "p-3 border rounded-xl bg-destructive/5 cursor-pointer transition-all hover:bg-destructive/10",
                            activeHighlight === i ? "border-destructive ring-1 ring-destructive" : "border-destructive/20"
                          )}
                          onMouseEnter={() => setActiveHighlight(i)}
                          onMouseLeave={() => setActiveHighlight(null)}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <AlertCircle className="w-3.5 h-3.5 text-destructive" />
                            <span className="text-[10px] font-black uppercase text-destructive tracking-widest">Anomaly #{i+1}</span>
                          </div>
                          <p className="text-xs font-bold text-foreground/90">{region.reason}</p>
                        </div>
                      ))}
                      
                      {result.suspiciousTimestamps?.map((ts: any, i: number) => (
                        <div key={i} className="p-3 border border-destructive/20 rounded-xl bg-destructive/5">
                           <div className="flex items-center gap-2 mb-1">
                            <AlertCircle className="w-3.5 h-3.5 text-destructive" />
                            <span className="text-[10px] font-black uppercase text-destructive tracking-widest">Time: {ts.timestamp}s</span>
                          </div>
                          <p className="text-xs font-bold text-foreground/90">{ts.description}</p>
                        </div>
                      ))}

                      {(!result.highlightedRegions?.length && !result.suspiciousTimestamps?.length) && (
                        <p className="text-xs font-medium leading-relaxed text-foreground/80 p-4 border rounded-xl bg-muted/10">
                          {result.explanation}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 border border-green-500/20 rounded-xl bg-green-500/5 space-y-2">
                       <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-green-500" />
                        <span className="text-[10px] font-black uppercase text-green-600 tracking-widest">Passed Authenticity Scan</span>
                      </div>
                      <p className="text-xs font-medium text-foreground/80">{result.explanation}</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="biometrics" className="pt-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className={cn(
                    "p-4 rounded-xl border flex flex-col items-center justify-center text-center gap-2 transition-all hover-glow cursor-default",
                    result.biometricVitals?.pulseDetected ? "bg-green-500/10 border-green-500/20" : "bg-destructive/10 border-destructive/20"
                  )}>
                    <HeartPulse className={cn("w-8 h-8", result.biometricVitals?.pulseDetected ? "text-green-500 animate-pulse" : "text-destructive")} />
                    <div className="space-y-1">
                      <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Pulse (rPPG)</span>
                      <p className="text-xs font-black">{result.biometricVitals?.pulseDetected ? "DETECTED" : "ABSENT"}</p>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex flex-col items-center justify-center text-center gap-2 hover-glow transition-all">
                    <Activity className="w-8 h-8 text-primary" />
                    <div className="space-y-1">
                      <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Naturalness</span>
                      <p className="text-xs font-black">{result.biometricVitals?.biometricConsistency || 0}% Score</p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="ancestry" className="pt-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 space-y-1">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Model Family</span>
                    <p className="text-sm font-black text-primary">{result.neuralAncestry?.modelFamily || "Proprietary"}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 space-y-1">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Neural Origin</span>
                    <p className="text-sm font-black text-primary">{result.neuralAncestry?.likelyModel || "Unknown"}</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="audit" className="pt-6 space-y-4">
                <div className="p-6 rounded-xl bg-muted/30 border border-dashed space-y-6">
                  {feedbackSubmitted === null ? (
                    <div className="space-y-4">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5" /> Human Observation
                      </Label>
                      <Textarea 
                        placeholder="Explain the artifacts the AI missed..."
                        className="text-xs bg-background/50 rounded-xl"
                        value={userComment}
                        onChange={(e) => setUserComment(e.target.value)}
                      />
                      <div className="flex gap-4">
                        <Button variant="outline" className="flex-1 rounded-xl border-green-500/30 text-green-600 font-black uppercase text-[10px]" onClick={() => handleFeedback(true)}>
                          <ThumbsUp className="w-4 h-4 mr-2" /> Correct
                        </Button>
                        <Button variant="outline" className="flex-1 rounded-xl border-destructive/30 text-destructive font-black uppercase text-[10px]" onClick={() => handleFeedback(false)}>
                          <ThumbsDown className="w-4 h-4 mr-2" /> Incorrect
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 text-center">
                      <p className="text-[10px] font-black text-primary uppercase">Audit synced to Global Brain ✓</p>
                      {!isPromoted && (
                        <Button className="w-full h-12 bg-primary/20 text-primary border-primary/20 rounded-xl font-black uppercase text-[10px]" onClick={promoteToDataset}>
                          <Database className="w-4 h-4 mr-2" /> Ingest into Training Base
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="actions" className="pt-6 space-y-4">
                <Button variant="outline" className="w-full h-12 font-black uppercase tracking-widest rounded-xl" onClick={() => setShowSpectralMode(!showSpectralMode)}>
                  <Layers className="w-4 h-4 mr-2" /> {showSpectralMode ? "Disable" : "Enable"} Spectral DNA View
                </Button>
                {isFake && (
                  <Button className="w-full h-12 bg-destructive hover:bg-destructive/90 font-black uppercase tracking-widest rounded-xl" onClick={() => setShowTakedown(!showTakedown)}>
                    <ShieldX className="w-4 h-4 mr-2" /> Takedown Notice
                  </Button>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>

          <CardFooter className="border-t p-6 bg-muted/5 gap-3">
            <Button className="flex-1 h-12 font-black uppercase tracking-widest rounded-xl" onClick={exportEvidence}>
              <FileJson className="w-4 h-4 mr-2" /> Export Persistent Backup
            </Button>
            <Button variant="outline" className="h-12 w-12 rounded-xl" onClick={() => window.print()}>
              <Download className="w-5 h-5" />
            </Button>
          </CardFooter>
        </Card>

        <Card className="relative overflow-hidden border border-border shadow-none bg-black flex flex-col items-center justify-center p-0 rounded-2xl min-h-[500px] volumetric-shadow group">
          {showSpectralMode && (
            <div className="absolute inset-0 z-20 pointer-events-none bg-primary/20 mix-blend-difference animate-pulse" />
          )}

          <div className="relative flex items-center justify-center p-4 w-full h-full">
            {mediaType === 'image' && (
              <div className="relative w-full h-full flex items-center justify-center">
                <img src={mediaUrl} className={cn("max-w-full h-auto object-contain rounded-xl", showSpectralMode && "grayscale invert contrast-150")} />
                
                {/* Explainable AI Highlight Overlays */}
                {result.highlightedRegions?.map((region: any, i: number) => (
                  <div
                    key={i}
                    className={cn(
                      "absolute border-2 border-destructive transition-all duration-300 rounded-sm z-30",
                      activeHighlight === i ? "bg-destructive/30 border-white shadow-[0_0_15px_rgba(255,255,255,0.8)] scale-105" : "bg-destructive/10"
                    )}
                    style={{
                      left: `${region.x}%`,
                      top: `${region.y}%`,
                      width: `${region.width}%`,
                      height: `${region.height}%`
                    }}
                    onMouseEnter={() => setActiveHighlight(i)}
                    onMouseLeave={() => setActiveHighlight(null)}
                  >
                    <div className={cn(
                      "absolute -top-6 left-0 px-2 py-0.5 bg-destructive text-white text-[8px] font-black uppercase tracking-widest whitespace-nowrap rounded",
                      activeHighlight === i ? "opacity-100" : "opacity-0"
                    )}>
                      {region.reason}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {mediaType === 'video' && <video src={mediaUrl} controls className="max-w-full h-auto rounded-xl" />}
            {mediaType === 'audio' && (
              <div className="flex flex-col items-center gap-8 p-12">
                <Music className="w-24 h-24 text-primary animate-pulse" />
                <audio src={mediaUrl} controls className="w-80 shadow-xl" />
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
