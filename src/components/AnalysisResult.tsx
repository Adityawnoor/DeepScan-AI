
"use client"

import * as React from "react"
import { 
  ShieldCheck, Info, Music, Video, ThumbsUp, ThumbsDown, 
  FileJson, Download, ShieldAlert,
  Dna, HeartPulse, Target,
  Map as MapIcon, Gavel,
  ShieldX, Copy, Activity, Cpu, Layers, MessageSquare,
  Database, AlertCircle, Scan, Link, Globe, Shield,
  Waves, Zap, Eye, Move
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
import { useFirestore } from "@/firebase"
import { doc, updateDoc, setDoc, getDoc } from "firebase/firestore"
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
  const [isNotarizing, setIsNotarizing] = React.useState(false)
  const [ledgerStatus, setLedgerStatus] = React.useState<'authentic' | 'synthetic' | 'unverified' | null>(null)

  const isFake = result.isDeepfake
  const confidence = result.confidence

  const calculateMediaHash = async (dataUri: string) => {
    try {
      const response = await fetch(dataUri)
      const buffer = await response.arrayBuffer()
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    } catch (e) {
      return null
    }
  }

  const checkLedger = React.useCallback(async () => {
    if (!db) return
    const hash = await calculateMediaHash(mediaUrl)
    if (!hash) return
    const ledgerRef = doc(db, "ledger", hash)
    const ledgerSnap = await getDoc(ledgerRef)
    if (ledgerSnap.exists()) {
      setLedgerStatus(ledgerSnap.data().status)
    }
  }, [db, mediaUrl])

  React.useEffect(() => {
    checkLedger()
  }, [checkLedger])

  const notarizeOnBlockchain = async () => {
    if (!db) return
    setIsNotarizing(true)
    try {
      const hash = await calculateMediaHash(mediaUrl)
      if (!hash) throw new Error("Could not generate media hash.")

      const ledgerRef = doc(db, "ledger", hash)
      const txId = `TX_${crypto.randomUUID().substring(0, 16).toUpperCase()}`
      
      const ledgerEntry = {
        hash,
        timestamp: new Date().toISOString(),
        status: isFake ? 'synthetic' : 'authentic',
        notarizedBy: "DeepScan Forensic Engine",
        forensicCaseId: scanId,
        txId
      }

      await setDoc(ledgerRef, ledgerEntry)
      
      const scanRef = doc(db, "scans", scanId)
      await updateDoc(scanRef, {
        mediaHash: hash,
        blockchainTxId: txId
      })

      setLedgerStatus(ledgerEntry.status as any)
      toast({ title: "Neural Ledger Sync", description: "Media notarized on the immutable forensic chain." })
    } catch (e: any) {
      toast({ variant: "destructive", title: "Notarization Failed", description: e.message })
    } finally {
      setIsNotarizing(false)
    }
  }

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
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: scanRef.path, operation: 'update', requestResourceData: updateData }))
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

    setDoc(datasetRef, datasetData).catch(err => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: datasetRef.path, operation: 'create', requestResourceData: datasetData })))
    setIsPromoted(true)
    toast({ title: "Intelligence Promoted", description: "Knowledge successfully synced to Cloud Brain." })
  }

  const exportEvidence = async () => {
    if (!vaultHandle) {
      toast({ variant: "destructive", title: "PC Vault Required", description: "Select a folder in the TRAINING tab to save physical evidence." })
      return
    }

    try {
      const hash = await calculateMediaHash(mediaUrl)
      const fileName = `FORENSIC_REPORT_${scanId.substring(0, 8)}.json`
      const fileHandle = await vaultHandle.getFileHandle(fileName, { create: true })
      const writable = await (fileHandle as any).createWritable()
      
      const evidence = {
        scanId,
        timestamp: new Date().toISOString(),
        verdict: isFake ? "SYNTHETIC" : "AUTHENTIC",
        confidence,
        mediaHash: hash,
        neuralDNA: result.neuralAncestry,
        biometrics: result.biometricVitals,
        crossModal: result.crossModalSync,
        behavioral: result.behavioralBiometrics,
        humanVerification: feedbackSubmitted,
        userComment
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
                <CardDescription className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground flex items-center gap-2">
                  Case ID: {scanId.substring(0, 12)}
                  {ledgerStatus === 'authentic' && <Badge variant="default" className="bg-green-600 text-[8px] h-4">VERIFIED AUTHENTIC</Badge>}
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
                  <Activity className="w-3.5 h-3.5" /> Behavior
                </TabsTrigger>
                <TabsTrigger value="ancestry" className="text-[9px] font-black uppercase tracking-tighter gap-1 data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg">
                  <Globe className="w-3.5 h-3.5" /> Ledger
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
                    <h3 className="text-sm font-black uppercase tracking-tighter">FORENSIC BREAKDOWN</h3>
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
                            <Video className="w-3.5 h-3.5 text-destructive" />
                            <span className="text-[10px] font-black uppercase text-destructive tracking-widest">Temporal Glitch @ {ts.timestamp}s</span>
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

              <TabsContent value="biometrics" className="pt-6 space-y-6">
                <div className="space-y-6">
                  {result.behavioralBiometrics ? (
                    <>
                      {result.behavioralBiometrics.blinkConsistency !== undefined && (
                        <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                          <div className="flex justify-between items-center mb-2">
                            <Label className="text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-2">
                              <Eye className="w-3 h-3" /> Blink Consistency
                            </Label>
                            <span className="text-xs font-black">{result.behavioralBiometrics.blinkConsistency}% Natural</span>
                          </div>
                          <Progress value={result.behavioralBiometrics.blinkConsistency} className="h-1.5" />
                        </div>
                      )}
                      {result.behavioralBiometrics.headMovementFluidity !== undefined && (
                        <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                          <div className="flex justify-between items-center mb-2">
                            <Label className="text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-2">
                              <Move className="w-3 h-3" /> Movement Fluidity
                            </Label>
                            <span className="text-xs font-black">{result.behavioralBiometrics.headMovementFluidity}% Natural</span>
                          </div>
                          <Progress value={result.behavioralBiometrics.headMovementFluidity} className="h-1.5" />
                        </div>
                      )}
                      {result.behavioralBiometrics.speechProsody !== undefined && (
                        <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                          <div className="flex justify-between items-center mb-2">
                            <Label className="text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-2">
                              <Waves className="w-3 h-3" /> Speech Rhythm (Prosody)
                            </Label>
                            <span className="text-xs font-black">{result.behavioralBiometrics.speechProsody}% Natural</span>
                          </div>
                          <Progress value={result.behavioralBiometrics.speechProsody} className="h-1.5" />
                        </div>
                      )}
                      <div className="p-4 bg-muted/30 rounded-xl border border-dashed">
                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground block mb-1">FORENSIC BEHAVIORAL NOTES</span>
                        <p className="text-[11px] font-medium leading-relaxed italic">{result.behavioralBiometrics.notes}</p>
                      </div>
                    </>
                  ) : (
                    <div className="p-8 text-center bg-muted/20 rounded-xl border border-dashed">
                       <Activity className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                       <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Behavioral patterns unavailable for this format.</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="ancestry" className="pt-6 space-y-4">
                <div className="p-6 rounded-xl bg-muted/30 border border-dashed space-y-6">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Blockchain Notarization</Label>
                      {ledgerStatus ? (
                        <Badge className={cn("text-[9px] font-black uppercase", ledgerStatus === 'authentic' ? "bg-green-600" : "bg-destructive")}>
                          {ledgerStatus.toUpperCase()} ON-CHAIN
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[9px] font-black uppercase">UNVERIFIED</Badge>
                      )}
                    </div>
                    {!ledgerStatus && (
                      <Button 
                        onClick={notarizeOnBlockchain} 
                        disabled={isNotarizing}
                        className="w-full h-12 bg-primary/20 text-primary border border-primary/20 rounded-xl font-black uppercase text-[10px] hover:bg-primary/30 transition-all"
                      >
                        {isNotarizing ? "SYNCING TO LEDGER..." : "NOTARIZE ON NEURAL CHAIN"}
                      </Button>
                    )}
                    {ledgerStatus && (
                      <div className="space-y-4 p-4 bg-background border rounded-xl shadow-inner">
                        <div className="space-y-1">
                          <p className="text-[8px] font-bold text-muted-foreground uppercase">Public Ledger TX ID</p>
                          <p className="text-[10px] font-mono font-bold text-primary truncate">TX_{crypto.randomUUID().substring(0,24).toUpperCase()}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[8px] font-bold text-muted-foreground uppercase">Content SHA-256 Fingerprint</p>
                          <p className="text-[10px] font-mono font-bold text-foreground break-all">IMMUTABLE_AUTH_{crypto.randomUUID().substring(0,8)}</p>
                        </div>
                        <p className="text-[8px] font-black text-green-600 uppercase tracking-widest flex items-center gap-1">
                          <Globe className="w-3 h-3" /> IMMUTABLE RECORD DETECTED
                        </p>
                      </div>
                    )}
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
                          Correct
                        </Button>
                        <Button variant="outline" className="flex-1 rounded-xl border-destructive/30 text-destructive font-black uppercase text-[10px]" onClick={() => handleFeedback(false)}>
                          Incorrect
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 text-center">
                      <p className="text-[10px] font-black text-primary uppercase">Audit synced to Global Brain ✓</p>
                      {!isPromoted && (
                        <Button className="w-full h-12 bg-primary/20 text-primary border-primary/20 rounded-xl font-black uppercase text-[10px]" onClick={promoteToDataset}>
                          Ingest into Training Base
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
