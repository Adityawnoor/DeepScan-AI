"use client"

import * as React from "react"
import { 
  ShieldCheck, Music, ThumbsUp, ThumbsDown, 
  FileJson, Download, 
  Target,
  Gavel,
  ShieldX, Activity, Globe,
  Waves, Zap, Eye, Move, Clock, CheckCircle2, AlertTriangle, ChevronRight, XCircle, AlertCircle, Scan, Cpu, Fingerprint, Search, History, Frame, Printer, ShieldAlert,
  ShieldQuestion, Share2, AlertOctagon, Info, FileWarning, Lock
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
  const [activeHighlight, setActiveHighlight] = React.useState<number | null>(null)
  const [isNotarizing, setIsNotarizing] = React.useState(false)
  const [ledgerStatus, setLedgerStatus] = React.useState<'authentic' | 'synthetic' | 'unverified' | null>(null)
  const [isGeneratingLegal, setIsGeneratingLegal] = React.useState(false)

  const isFake = result.isDeepfake
  const confidence = result.confidence
  const fakeCategory = result.fakeCategory || (isFake ? "Synthetic" : "Authentic")

  const calculateMediaHash = React.useCallback(async (dataUri: string) => {
    try {
      if (!dataUri || dataUri === "Protected in Vault") return null;
      const response = await fetch(dataUri)
      const buffer = await response.arrayBuffer()
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    } catch (e) {
      return null
    }
  }, [])

  const checkLedger = React.useCallback(async () => {
    if (!db) return
    const hash = await calculateMediaHash(mediaUrl)
    if (!hash) return
    const ledgerRef = doc(db, "ledger", hash)
    const ledgerSnap = await getDoc(ledgerRef)
    if (ledgerSnap.exists()) {
      setLedgerStatus(ledgerSnap.data().status)
    }
  }, [db, mediaUrl, calculateMediaHash])

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

  const exportEvidence = async () => {
    setIsGeneratingLegal(true)
    try {
      const hash = await calculateMediaHash(mediaUrl)
      const evidence = {
        meta: {
          reportType: "LEGAL_FORENSIC_EXHIBIT",
          version: "V3.1.0",
          authority: "DeepScan AI Forensic Singularity Engine",
          timestamp: new Date().toISOString(),
          caseId: scanId
        },
        evidence: {
          mediaHash: hash || "NOTARIZED_UPON_INGESTION",
          mediaType: mediaType.toUpperCase(),
          verdict: isFake ? "SYNTHETIC" : "AUTHENTIC",
          confidenceScore: `${confidence}%`,
          manipulationCategory: fakeCategory
        },
        forensics: {
          neuralAncestry: result.neuralAncestry,
          behavioralBiometrics: result.behavioralBiometrics,
          temporalStability: result.temporalStability,
          crossModalSync: result.crossModalSync,
          originProvenance: result.sourceOrigin,
          timeline: result.suspiciousSegments
        },
        audit: {
          humanVerifier: feedbackSubmitted === null ? "PENDING" : (feedbackSubmitted ? "VERIFIED" : "DISPUTED"),
          verifierComments: userComment || "No manual observations provided."
        },
        ledger: {
          status: ledgerStatus || "UNVERIFIED",
          txId: result.blockchainTxId || "PENDING_LEDGER_COMMIT"
        }
      }

      if (vaultHandle) {
        const fileName = `FORENSIC_EXHIBIT_${scanId.substring(0, 8)}.json`
        const fileHandle = await vaultHandle.getFileHandle(fileName, { create: true })
        const writable = await (fileHandle as any).createWritable()
        await writable.write(JSON.stringify(evidence, null, 2))
        await writable.close()
        toast({ title: "Evidence Exported", description: `Legal exhibit saved to your PC vault.` })
      } else {
        await navigator.clipboard.writeText(JSON.stringify(evidence, null, 2))
        toast({ title: "JSON LD Copied", description: "Evidence metadata copied for legal intake." })
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Export Failed", description: e.message })
    } finally {
      setIsGeneratingLegal(false)
    }
  }

  const advisoryActions = React.useMemo(() => {
    if (isFake) {
      return [
        { icon: AlertOctagon, title: "QUARANTINE PROTOCOL", desc: "Do not share or redistribute this content. It contains high-confidence synthetic artifacts.", variant: "destructive" },
        { icon: FileWarning, title: "REPORT TO PLATFORM", desc: "Use the report function on X, Meta, or YT. Flag as 'Misleading AI Generated Content'.", variant: "warning" },
        { icon: Lock, title: "NOTARIZE AS FAKE", desc: "Sync this hash to the Neural Ledger to prevent its future use as an 'original'.", variant: "primary" },
        { icon: Search, title: "TRACE PROVENANCE", desc: "Use the Provenance tab to identify the original un-manipulated source material.", variant: "outline" }
      ]
    }
    return [
      { icon: ShieldCheck, title: "AUTHORITATIVE TAG", desc: "This media shows high biometric consistency. It is safe for archival.", variant: "success" },
      { icon: Zap, title: "LEDGER NOTARIZATION", desc: "Notarize this original now to prevent future deepfake versions from gaining credibility.", variant: "primary" },
      { icon: History, title: "VAULT MIRRORING", desc: "Mirror this authentic version to your physical PC vault for long-term provenance.", variant: "outline" },
      { icon: Globe, title: "NEURAL DNA SYNC", desc: "If this is your face, sync it with your Identity Vault to protect against future breaches.", variant: "outline" }
    ]
  }, [isFake])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        <Card className="border border-border shadow-none flex flex-col bg-card rounded-2xl overflow-hidden volumetric-shadow group hover:border-primary/30 transition-all duration-300 print:border-none print:shadow-none">
          <CardHeader className="border-b bg-muted/20 p-6 relative">
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <CardTitle className="font-black text-2xl flex items-center gap-2 tracking-tighter text-foreground uppercase">
                  <Target className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
                  FORENSIC EXHIBIT A
                </CardTitle>
                <div className="flex flex-wrap gap-2">
                  <CardDescription className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground flex items-center gap-2">
                    Case: {scanId.substring(0, 16).toUpperCase()}
                    {ledgerStatus === 'authentic' && <Badge variant="default" className="bg-green-600 text-[8px] h-4">LEDGER VERIFIED</Badge>}
                  </CardDescription>
                  <Badge variant="outline" className="border-primary/30 text-primary text-[9px] font-black uppercase px-2 h-5">
                    {fakeCategory}
                  </Badge>
                </div>
              </div>
              <Badge variant={isFake ? "destructive" : "default"} className="px-4 py-1.5 font-black text-xs uppercase tracking-widest rounded-xl hover-glow transition-all">
                {isFake ? "SYNTHETIC" : "AUTHENTIC"}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-8 flex-1 print:p-0">
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <Label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" /> Detection Confidence
                </Label>
                <span className={cn("text-2xl font-black", isFake ? "text-destructive" : "text-primary")}>
                  {confidence}%
                </span>
              </div>
              <Progress value={confidence} className={cn("h-4 rounded-xl bg-muted", isFake ? "[&>div]:bg-destructive" : "[&>div]:bg-primary")} />
            </div>

            <Tabs defaultValue="advisory" className="w-full">
              <TabsList className="grid grid-cols-6 bg-muted/50 p-1 rounded-xl h-11 border print:hidden overflow-x-auto no-scrollbar">
                <TabsTrigger value="advisory" className="text-[8px] font-black uppercase tracking-tighter gap-1 data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg px-2">
                  <ShieldQuestion className="w-3 h-3" /> Advisory
                </TabsTrigger>
                <TabsTrigger value="provenance" className="text-[8px] font-black uppercase tracking-tighter gap-1 data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg px-2">
                  <Search className="w-3 h-3" /> Origin
                </TabsTrigger>
                <TabsTrigger value="timeline" className="text-[8px] font-black uppercase tracking-tighter gap-1 data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg px-2">
                  <Clock className="w-3 h-3" /> Timeline
                </TabsTrigger>
                <TabsTrigger value="biometrics" className="text-[8px] font-black uppercase tracking-tighter gap-1 data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg px-2">
                  <Activity className="w-3 h-3" /> Behavior
                </TabsTrigger>
                <TabsTrigger value="ancestry" className="text-[8px] font-black uppercase tracking-tighter gap-1 data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg px-2">
                  <Fingerprint className="w-3 h-3" /> DNA
                </TabsTrigger>
                <TabsTrigger value="legal" className="text-[8px] font-black uppercase tracking-tighter gap-1 data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg px-2">
                  <Gavel className="w-3 h-3" /> Evidence
                </TabsTrigger>
              </TabsList>

              <TabsContent value="advisory" className="pt-6 space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex items-center gap-3">
                     <Info className="w-5 h-5 text-primary" />
                     <p className="text-[10px] font-black uppercase tracking-widest text-primary">AI Advisory Protocol Active</p>
                  </div>
                  {advisoryActions.map((action, i) => (
                    <div key={i} className={cn(
                      "p-4 rounded-xl border flex gap-4 transition-all hover:scale-[1.02]",
                      action.variant === 'destructive' ? "bg-destructive/5 border-destructive/20" : 
                      action.variant === 'warning' ? "bg-orange-500/5 border-orange-500/20" :
                      action.variant === 'success' ? "bg-green-500/5 border-green-500/20" :
                      "bg-primary/5 border-primary/10"
                    )}>
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                        action.variant === 'destructive' ? "bg-destructive/10 text-destructive" :
                        action.variant === 'warning' ? "bg-orange-500/10 text-orange-600" :
                        action.variant === 'success' ? "bg-green-500/10 text-green-600" :
                        "bg-primary/10 text-primary"
                      )}>
                        <action.icon className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-[11px] font-black uppercase tracking-tighter text-foreground">{action.title}</p>
                        <p className="text-[10px] font-medium leading-relaxed text-muted-foreground">{action.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="provenance" className="pt-6 space-y-4">
                <div className="p-6 rounded-xl bg-primary/5 border border-primary/20 space-y-4 relative overflow-hidden">
                  <div className="absolute right-4 top-4 opacity-10"><Globe className="w-12 h-12" /></div>
                  <div className="flex items-center gap-2 mb-2">
                    <History className="w-4 h-4 text-primary" />
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-primary">Media Provenance Trace</h3>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-[9px] font-bold text-muted-foreground uppercase mb-1">Source origin match</p>
                      <p className="text-[13px] font-black text-foreground uppercase tracking-tight">
                        {result.sourceOrigin || "NO PUBLIC ARCHIVE MATCH"}
                      </p>
                    </div>
                    <div className="p-4 bg-background/50 rounded-xl border border-dashed">
                      <p className="text-[9px] font-bold text-muted-foreground uppercase mb-2">Forensic Context</p>
                      <p className="text-[11px] leading-relaxed font-medium italic">
                        {result.originalContext || "No identifying metadata or reverse-search matches found in Global Sentinel Database."}
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="timeline" className="pt-6 space-y-4">
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin print:max-h-none">
                  {result.suspiciousSegments?.length > 0 ? (
                    result.suspiciousSegments.map((segment: any, i: number) => (
                      <div key={i} className={cn(
                        "p-4 border rounded-xl flex items-center justify-between transition-all group relative overflow-hidden",
                        segment.isSynthetic ? "bg-destructive/5 border-destructive/20" : "bg-green-500/5 border-green-500/20"
                      )}>
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center shadow-sm",
                            segment.isSynthetic ? "bg-destructive/10 text-destructive" : "bg-green-500/10 text-green-600"
                          )}>
                            {segment.isSynthetic ? <ShieldAlert className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-[12px] font-black uppercase tracking-tighter text-foreground flex items-center gap-1.5">
                              <span className="text-muted-foreground/50">[{segment.startTime.toFixed(2)}s - {segment.endTime.toFixed(2)}s]</span>
                              <span className={cn("ml-2", segment.isSynthetic ? "text-destructive" : "text-green-600")}>
                                {segment.isSynthetic ? "SYNTHETIC" : "AUTHENTIC"}
                              </span>
                            </p>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase leading-tight">{segment.description}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 border rounded-xl bg-muted/10 border-dashed text-center space-y-3">
                       <Scan className="w-6 h-6 text-primary mx-auto" />
                       <p className="text-xs font-medium text-foreground/80 leading-relaxed px-4">{result.explanation}</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="biometrics" className="pt-6 space-y-6">
                <div className="space-y-6">
                  {result.behavioralBiometrics ? (
                    <div className="grid grid-cols-1 gap-4">
                      <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                        <div className="flex justify-between items-center mb-2">
                          <Label className="text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-2">
                            <Eye className="w-3 h-3" /> Ocular Sync
                          </Label>
                          <span className="text-xs font-black">{result.behavioralBiometrics.blinkConsistency}%</span>
                        </div>
                        <Progress value={result.behavioralBiometrics.blinkConsistency} className="h-1.5" />
                      </div>
                      
                      <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                        <div className="flex justify-between items-center mb-2">
                          <Label className="text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-2">
                            <Frame className="w-3 h-3" /> Temporal Synergy
                          </Label>
                          <span className="text-xs font-black">{result.behavioralBiometrics.temporalStability || 0}%</span>
                        </div>
                        <Progress value={result.behavioralBiometrics.temporalStability || 0} className="h-1.5" />
                      </div>

                      <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                        <div className="flex justify-between items-center mb-2">
                          <Label className="text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-2">
                            <Move className="w-3 h-3" /> Kinematic Fluidity
                          </Label>
                          <span className="text-xs font-black">{result.behavioralBiometrics.headMovementFluidity}%</span>
                        </div>
                        <Progress value={result.behavioralBiometrics.headMovementFluidity} className="h-1.5" />
                      </div>

                      <div className="p-4 bg-muted/30 rounded-xl border border-dashed">
                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground block mb-1">Forensic Behavioral Notes</span>
                        <p className="text-[11px] font-medium leading-relaxed italic">{result.behavioralBiometrics.notes}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-muted/20 rounded-xl border border-dashed">
                       <Activity className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                       <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Biometrics unavailable for this modaility.</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="ancestry" className="pt-6 space-y-4">
                <div className="p-6 rounded-xl bg-muted/30 border border-dashed space-y-6">
                  {result.neuralAncestry && (
                    <div className="space-y-4 p-4 bg-background border rounded-xl shadow-inner">
                      <div className="flex items-center gap-2 mb-2">
                        <Cpu className="w-4 h-4 text-primary" />
                        <h4 className="text-[11px] font-black uppercase tracking-widest">Neural DNA Traceback</h4>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-[8px] font-bold text-muted-foreground uppercase">Generative Family</p>
                          <p className="text-[10px] font-black text-foreground uppercase">{result.neuralAncestry.modelFamily}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[8px] font-bold text-muted-foreground uppercase">Suspected Model</p>
                          <p className="text-[10px] font-black text-primary uppercase">{result.neuralAncestry.likelyModel}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  <Button 
                    onClick={notarizeOnBlockchain} 
                    disabled={isNotarizing || !!ledgerStatus}
                    className="w-full h-12 bg-primary/20 text-primary border border-primary/20 rounded-xl font-black uppercase text-[10px] tracking-widest"
                  >
                    {isNotarizing ? "NOTARIZING..." : ledgerStatus ? "IMMUTABLE LEDGER SYNCED" : "NOTARIZE ON NEURAL LEDGER"}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="legal" className="pt-6 space-y-4">
                <div className="p-6 rounded-xl bg-muted/30 border border-dashed space-y-6">
                   <div className="flex items-center gap-3 p-4 bg-background border rounded-xl">
                      <Gavel className="w-6 h-6 text-primary" />
                      <div>
                         <p className="text-[11px] font-black uppercase tracking-tighter">Legal Intake Certificate</p>
                         <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest">Compliant with IEEE 7011 Standards</p>
                      </div>
                   </div>
                  <Textarea 
                    placeholder="Enter manual forensic observations for legal exhibit..."
                    className="text-xs bg-background/50 rounded-xl min-h-[100px]"
                    value={userComment}
                    onChange={(e) => setUserComment(e.target.value)}
                  />
                  <div className="flex gap-4">
                    <Button variant="outline" className="flex-1 font-black uppercase text-[10px]" onClick={() => handleFeedback(true)}>
                       Verify Verdict
                    </Button>
                    <Button variant="outline" className="flex-1 font-black uppercase text-[10px] text-destructive" onClick={() => handleFeedback(false)}>
                       Dispute Verdict
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>

          <CardFooter className="border-t p-6 bg-muted/5 gap-3 print:hidden">
            <Button 
              className="flex-1 h-12 font-black uppercase tracking-widest rounded-xl volumetric-shadow" 
              onClick={exportEvidence}
              disabled={isGeneratingLegal}
            >
              {isGeneratingLegal ? <Activity className="w-4 h-4 mr-2 animate-spin" /> : <FileJson className="w-4 h-4 mr-2" />}
              Generate Evidence Case
            </Button>
            <Button variant="outline" className="h-12 w-12 rounded-xl" onClick={() => window.print()}>
              <Printer className="w-5 h-5" />
            </Button>
          </CardFooter>
        </Card>

        <Card className="relative overflow-hidden border border-border shadow-none bg-black flex flex-col items-center justify-center p-0 rounded-2xl min-h-[500px] volumetric-shadow group print:hidden">
          <div className="relative flex items-center justify-center p-4 w-full h-full">
            {mediaType === 'image' && (
              <div className="relative w-full h-full flex items-center justify-center">
                <img src={mediaUrl} className="max-w-full h-auto object-contain rounded-xl" />
                {result.highlightedRegions?.map((region: any, i: number) => (
                  <div
                    key={i}
                    className={cn(
                      "absolute border-2 border-destructive transition-all duration-300 rounded-sm z-30",
                      activeHighlight === i ? "bg-destructive/30 border-white shadow-[0_0_15px_rgba(255,255,255,0.8)]" : "bg-destructive/10"
                    )}
                    style={{ left: `${region.x}%`, top: `${region.y}%`, width: `${region.width}%`, height: `${region.height}%` }}
                    onMouseEnter={() => setActiveHighlight(i)}
                    onMouseLeave={() => setActiveHighlight(null)}
                  />
                ))}
              </div>
            )}
            {mediaType === 'video' && <video src={mediaUrl} controls className="max-w-full h-auto rounded-xl" />}
            {mediaType === 'audio' && (
              <div className="flex flex-col items-center gap-8 p-12">
                <Music className="w-24 h-24 text-primary animate-pulse" />
                <audio src={mediaUrl} controls className="w-80 shadow-2xl" />
              </div>
            )}
          </div>
          {result.sourceOrigin && (
            <div className="absolute bottom-6 left-6 right-6 p-4 bg-black/80 backdrop-blur-md border border-primary/30 rounded-xl z-40 animate-in fade-in slide-in-from-bottom-4">
              <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1 flex items-center gap-2">
                <Search className="w-3 h-3" /> Provenance Origin Identified
              </p>
              <p className="text-xs font-bold text-white uppercase">{result.sourceOrigin}</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}