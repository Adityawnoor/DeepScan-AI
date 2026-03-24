
"use client"

import * as React from "react"
import { 
  ShieldCheck, Info, Music, Video, ThumbsUp, ThumbsDown, 
  FileJson, Download, ShieldAlert,
  Dna, HeartPulse, Target,
  Map as MapIcon, Gavel,
  ShieldX, Copy, Activity, Cpu, Layers, MessageSquare,
  Database
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
    
    toast({ title: "Intelligence Captured", description: "Audit logged to Neural Cloud." })
  }

  const promoteToDataset = () => {
    if (!db) return
    if (feedbackSubmitted === null) {
      toast({ variant: "destructive", title: "Audit Required", description: "Verify the result before promoting." })
      return
    }

    const datasetId = crypto.randomUUID()
    const datasetRef = doc(db, "datasets", datasetId)
    const datasetData = {
      fileName: `Audit_${scanId.substring(0, 8)}`,
      uploadDate: new Date().toISOString(),
      label: feedbackSubmitted ? (isFake ? "fake" : "real") : (isFake ? "real" : "fake"),
      notes: userComment || `Promoted from Case ${scanId}`,
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
    toast({ title: "Dataset Improved", description: "Case synced to Research Intelligence Base." })
  }

  const mapData = [
    { x: 0, y: 0, name: "Authentic Human", type: "real" },
    { x: result.neuralAncestry?.latentCoordinates?.x || 0, y: result.neuralAncestry?.latentCoordinates?.y || 0, name: "Subject Asset", type: "subject" },
    { x: 80, y: 70, name: "Stable Diffusion Cluster", type: "cluster" },
    { x: -70, y: 85, name: "Midjourney Cluster", type: "cluster" },
    { x: 20, y: -90, name: "Flux.1 Cluster", type: "cluster" },
  ]

  const takedownTemplate = `
Subject: URGENT: Forensic Deepfake Takedown Request - Case ID: ${scanId.substring(0, 8)}

To the Safety Team,

I am requesting the immediate removal of non-consensual synthetic content.
FORENSIC EVIDENCE:
- Case ID: ${scanId}
- Status: VERIFIED SYNTHETIC
- AI Confidence: ${confidence}%
- Identified Neural DNA: ${result.neuralAncestry?.likelyModel || "Advanced AI"}

Content violates safety policies regarding synthetic identity manipulation.
`

  const exportEvidence = async () => {
    if (!vaultHandle) {
      toast({ 
        variant: "destructive", 
        title: "Vault Unlinked", 
        description: "Select a PC folder in the Database tab for physical evidence storage." 
      })
      return
    }

    try {
      const fileName = `Forensic_Report_${scanId.substring(0, 8)}.json`
      const fileHandle = await vaultHandle.getFileHandle(fileName, { create: true })
      const writable = await (fileHandle as any).createWritable()
      
      const evidence = {
        scanId,
        timestamp: new Date().toISOString(),
        verdict: isFake ? "SYNTHETIC" : "AUTHENTIC",
        confidence,
        neuralDNA: result.neuralAncestry,
        biometrics: result.biometricVitals,
        artifacts: result.noiseArtifacts,
        humanVerification: feedbackSubmitted,
        userComment
      }

      await writable.write(JSON.stringify(evidence, null, 2))
      await writable.close()
      
      toast({ title: "Evidence Exported", description: `Saved as ${fileName} to your PC vault.` })
    } catch (e: any) {
      toast({ variant: "destructive", title: "Export Failed", description: e.message })
    }
  }

  const copyTakedown = () => {
    navigator.clipboard.writeText(takedownTemplate)
    toast({ title: "Copied", description: "Takedown notice copied." })
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
                  SINGULARITY REPORT
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

            <Tabs defaultValue="biometrics" className="w-full">
              <TabsList className="grid grid-cols-5 bg-muted/50 p-1 rounded-xl h-11 border">
                <TabsTrigger value="biometrics" className="text-[9px] font-black uppercase tracking-tighter gap-1 data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg">
                  <HeartPulse className="w-3.5 h-3.5" /> Vital
                </TabsTrigger>
                <TabsTrigger value="ancestry" className="text-[9px] font-black uppercase tracking-tighter gap-1 data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg">
                  <Dna className="w-3.5 h-3.5" /> DNA
                </TabsTrigger>
                <TabsTrigger value="origin" className="text-[9px] font-black uppercase tracking-tighter gap-1 data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg">
                  <MapIcon className="w-3.5 h-3.5" /> Origin
                </TabsTrigger>
                <TabsTrigger value="feedback" className="text-[9px] font-black uppercase tracking-tighter gap-1 data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg">
                  <ShieldCheck className="w-3.5 h-3.5" /> Audit
                </TabsTrigger>
                <TabsTrigger value="actions" className="text-[9px] font-black uppercase tracking-tighter gap-1 data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg">
                  <Gavel className="w-3.5 h-3.5" /> Action
                </TabsTrigger>
              </TabsList>

              <TabsContent value="biometrics" className="pt-6 space-y-4 animate-in fade-in zoom-in-95">
                <div className="grid grid-cols-2 gap-4">
                  <div className={cn(
                    "p-4 rounded-xl border flex flex-col items-center justify-center text-center gap-2 transition-all hover-glow cursor-default",
                    result.biometricVitals?.pulseDetected ? "bg-green-500/10 border-green-500/20" : "bg-destructive/10 border-destructive/20"
                  )}>
                    <HeartPulse className={cn("w-8 h-8", result.biometricVitals?.pulseDetected ? "text-green-500 animate-pulse" : "text-destructive")} />
                    <div className="space-y-1">
                      <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">rPPG Pulse</span>
                      <p className="text-xs font-black">{result.biometricVitals?.pulseDetected ? "DETECTED" : "ABSENT"}</p>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex flex-col items-center justify-center text-center gap-2 hover-glow transition-all">
                    <Activity className="w-8 h-8 text-primary" />
                    <div className="space-y-1">
                      <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Vital Flow</span>
                      <p className="text-xs font-black">{result.biometricVitals?.biometricConsistency || 0}% Match</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-muted/30 border border-dashed text-[10px] font-medium leading-relaxed italic text-muted-foreground">
                  <Info className="w-3.5 h-3.5 inline mr-1 text-primary" />
                  {result.biometricVitals?.notes || "Biometric analysis completed."}
                </div>
              </TabsContent>

              <TabsContent value="ancestry" className="pt-6 space-y-4 animate-in fade-in zoom-in-95">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 space-y-1 hover:bg-primary/10 transition-colors">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Model Family</span>
                    <p className="text-sm font-black text-primary">{result.neuralAncestry?.modelFamily || "Unknown"}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 space-y-1 hover:bg-primary/10 transition-colors">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Likely Source</span>
                    <p className="text-sm font-black text-primary">{result.neuralAncestry?.likelyModel || "Hybrid"}</p>
                  </div>
                </div>
                <div className="p-4 rounded-xl border-2 border-dashed border-primary/10 bg-muted/10">
                   <p className="text-xs font-medium leading-relaxed text-foreground/80">
                    {result.explanation}
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="origin" className="pt-6 space-y-4 animate-in fade-in zoom-in-95">
                 <div className="h-[200px] w-full bg-muted/20 rounded-xl border relative overflow-hidden hover-glow transition-all">
                    <ResponsiveContainer width="100%" height="100%">
                       <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                          <XAxis type="number" dataKey="x" hide domain={[-100, 100]} />
                          <YAxis type="number" dataKey="y" hide domain={[-100, 100]} />
                          <ReferenceLine x={0} stroke="rgba(0,0,0,0.1)" strokeDasharray="3 3" />
                          <ReferenceLine y={0} stroke="rgba(0,0,0,0.1)" strokeDasharray="3 3" />
                          <Scatter name="Clusters" data={mapData}>
                             {mapData.map((entry, index) => (
                               <Cell 
                                 key={`cell-${index}`} 
                                 fill={entry.type === 'subject' ? 'hsl(var(--primary))' : entry.type === 'real' ? '#22c55e' : 'rgba(0,0,0,0.2)'} 
                               />
                             ))}
                          </Scatter>
                       </ScatterChart>
                    </ResponsiveContainer>
                 </div>
                 <p className="text-[9px] text-center font-bold text-muted-foreground uppercase tracking-widest">
                   Latent Origin Map: Subject coordinate identified.
                 </p>
              </TabsContent>

              <TabsContent value="feedback" className="pt-6 space-y-4 animate-in fade-in zoom-in-95">
                <div className="p-6 rounded-xl bg-muted/30 border border-dashed space-y-6">
                  <div className="space-y-2 text-center">
                    <h4 className="text-xs font-black uppercase tracking-widest">Neural Cloud Training</h4>
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">Audit this case to improve accuracy</p>
                  </div>
                  
                  {feedbackSubmitted === null ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5" /> Forensic Notes
                        </Label>
                        <Textarea 
                          placeholder="e.g., Micro-latencies in the lip movement found..."
                          className="text-xs bg-background/50 rounded-xl min-h-[80px]"
                          value={userComment}
                          onChange={(e) => setUserComment(e.target.value)}
                        />
                      </div>
                      <div className="flex gap-4 justify-center">
                        <Button 
                          variant="outline" 
                          className="h-12 flex-1 rounded-xl border-green-500/30 text-green-600 hover:bg-green-500/10 font-black uppercase tracking-widest hover-glow transition-all"
                          onClick={() => handleFeedback(true)}
                        >
                          <ThumbsUp className="w-4 h-4 mr-2" /> Correct
                        </Button>
                        <Button 
                          variant="outline" 
                          className="h-12 flex-1 rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10 font-black uppercase tracking-widest hover-glow transition-all"
                          onClick={() => handleFeedback(false)}
                        >
                          <ThumbsDown className="w-4 h-4 mr-2" /> Incorrect
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-4">
                      <div className="p-4 bg-primary/10 border border-primary/20 text-[10px] font-black text-primary uppercase tracking-widest text-center rounded-xl">
                        Audit Logged: Synced to Neural Base.
                      </div>
                      {!isPromoted && (
                        <Button 
                          className="w-full h-12 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/20 rounded-xl font-black uppercase tracking-widest text-[10px] gap-2"
                          onClick={promoteToDataset}
                        >
                          <Database className="w-4 h-4" /> Promote to Cloud Research Base
                        </Button>
                      )}
                      {isPromoted && (
                        <div className="p-3 border border-dashed border-primary/30 rounded-xl text-[9px] font-black text-primary text-center uppercase tracking-widest">
                          Research Intelligence Improved ✓
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="actions" className="pt-6 space-y-4 animate-in fade-in zoom-in-95">
                <div className="space-y-4">
                  <Button 
                    variant="outline" 
                    className={cn(
                      "w-full h-12 font-black uppercase tracking-widest border rounded-xl transition-all duration-300", 
                      showSpectralMode ? "bg-primary text-white hover-glow" : "hover:bg-primary/5"
                    )}
                    onClick={() => setShowSpectralMode(!showSpectralMode)}
                  >
                    <Layers className="w-4 h-4 mr-2" /> Spectral View
                  </Button>
                  {isFake && (
                    <>
                      <Button className="w-full h-12 bg-destructive hover:bg-destructive/90 font-black uppercase tracking-widest rounded-xl hover-glow transition-all animate-pulse-ring relative overflow-visible" onClick={() => setShowTakedown(!showTakedown)}>
                        <ShieldX className="w-4 h-4 mr-2" /> Takedown Pilot
                      </Button>
                      {showTakedown && (
                        <div className="p-4 rounded-xl bg-muted font-mono text-[9px] whitespace-pre-wrap leading-relaxed relative group border animate-in slide-in-from-top-2">
                          <Button size="icon" variant="ghost" className="absolute top-2 right-2 h-8 w-8 hover:bg-primary/20" onClick={copyTakedown}>
                            <Copy className="w-4 h-4" />
                          </Button>
                          {takedownTemplate}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>

          <CardFooter className="border-t p-6 bg-muted/5 gap-3">
            <Button className="flex-1 h-12 font-black uppercase tracking-widest rounded-xl hover-glow transition-all" onClick={exportEvidence}>
              <FileJson className="w-4 h-4 mr-2" /> Export to PC Vault
            </Button>
            <Button variant="outline" className="h-12 w-12 rounded-xl hover:bg-primary/10 hover:text-primary transition-colors" onClick={() => window.print()}>
              <Download className="w-5 h-5" />
            </Button>
          </CardFooter>
        </Card>

        <Card className="relative overflow-hidden border border-border shadow-none bg-black flex flex-col items-center justify-center p-0 rounded-2xl min-h-[500px] volumetric-shadow">
          {showSpectralMode && (
            <div className="absolute inset-0 z-20 pointer-events-none bg-primary/20 mix-blend-difference animate-pulse" />
          )}

          <div className="relative flex items-center justify-center p-4 w-full h-full">
            {mediaType === 'image' && (
              <div className="relative group">
                <img 
                  src={mediaUrl} 
                  className={cn("max-w-full h-auto object-contain transition-all duration-700 rounded-xl", showSpectralMode && "grayscale invert contrast-150")} 
                />
              </div>
            )}
            {mediaType === 'video' && <video src={mediaUrl} controls className="max-w-full h-auto shadow-2xl rounded-xl" />}
            {mediaType === 'audio' && (
              <div className="flex flex-col items-center gap-8 p-12">
                <div className="p-8 bg-primary/10 rounded-full hover-glow transition-all duration-500">
                  <Music className="w-24 h-24 text-primary animate-pulse" />
                </div>
                <audio src={mediaUrl} controls className="w-80 shadow-xl" />
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
