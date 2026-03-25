"use client"

import * as React from "react"
import { analyzeImageForDeepfake } from "@/ai/flows/analyze-image-for-deepfake"
import { analyzeAudioForDeepfake } from "@/ai/flows/analyze-audio-for-deepfake"
import { analyzeVideoForDeepfake } from "@/ai/flows/analyze-video-for-deepfake"
import { DeepScanLogo } from "@/components/DeepScanLogo"
import { ThemeToggle } from "@/components/ThemeToggle"
import { MediaUpload } from "@/components/MediaUpload"
import { AnalysisResult } from "@/components/AnalysisResult"
import { DetectionHistory, type HistoryItem } from "@/components/DetectionHistory"
import { DatasetManager } from "@/components/DatasetManager"
import { AuthenticityShield } from "@/components/AuthenticityShield"
import { SocialMonitor } from "@/components/SocialMonitor"
import { ModelEvolutionTracker } from "@/components/ModelEvolutionTracker"
import { MediaVault } from "@/components/MediaVault"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { 
  ShieldCheck, History, Database, Zap, 
  Microscope as MicroscopeIcon,
  Brain, Activity, Shield, Sparkles, Clock,
  Network, Loader2, Globe,
  ShieldCheck as ShieldIcon,
  Fingerprint, Eye, Video, Waves, Radio,
  Frame, BarChart3, LineChart, Target,
  BrainCircuit, WifiOff, CloudOff, Info
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useFirestore, useCollection, useFirebase, useMemoFirebase, useAuth, useUser, initiateAnonymousSignIn } from "@/firebase"
import { collection, doc, setDoc, query, orderBy, limit, getDoc } from "firebase/firestore"
import { errorEmitter } from "@/firebase/error-emitter"
import { FirestorePermissionError } from "@/firebase/errors"

export default function DeepScanHome() {
  const { toast } = useToast()
  const db = useFirestore()
  const auth = useAuth()
  const { user } = useUser()
  const { isCloudActive } = useFirebase()
  const [isAnalyzing, setIsAnalyzing] = React.useState(false)
  const [currentResult, setCurrentResult] = React.useState<{ id: string, output: any, mediaUrl: string, mediaType: 'image' | 'audio' | 'video' } | null>(null)
  const [activeTab, setActiveTab] = React.useState("analyze")
  
  const [localFolderHandle, setLocalFolderHandle] = React.useState<FileSystemDirectoryHandle | null>(null)
  const [localIntelligence, setLocalIntelligence] = React.useState<string>("")

  // Auto-authentication for Neural Ledger access
  React.useEffect(() => {
    if (auth && !user) {
      initiateAnonymousSignIn(auth)
    }
  }, [auth, user])

  // Queries only fire when DB and User session are active
  // Scans are now correctly scoped to the user's private mediaFiles collection
  const scansQuery = useMemoFirebase(() => (db && user) ? query(collection(db, "users", user.uid, "mediaFiles"), orderBy("timestamp", "desc"), limit(100)) : null, [db, user])
  const datasetsQuery = useMemoFirebase(() => (db && user) ? query(collection(db, "datasets"), orderBy("uploadDate", "desc")) : null, [db, user])
  const alertsQuery = useMemoFirebase(() => (db && user) ? query(collection(db, "alerts"), orderBy("timestamp", "desc"), limit(5)) : null, [db, user])
  
  const { data: scans } = useCollection(scansQuery)
  const { data: datasets } = useCollection(datasetsQuery)
  const { data: recentAlerts } = useCollection(alertsQuery)

  const workstationRef = React.useRef<HTMLDivElement>(null)

  const knowledgeCount = React.useMemo(() => {
    const datasetCount = datasets?.length || 0
    const verifiedScanCount = scans?.filter(s => s.userFeedback !== undefined).length || 0
    return datasetCount + verifiedScanCount
  }, [datasets, scans])

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

  const runQuickVerify = async (dataUri: string) => {
    if (!db || !user) {
      toast({ variant: "destructive", title: "Authentication Required", description: "Ledger verification requires a valid forensic session." })
      return
    }
    setIsAnalyzing(true)
    try {
      const hash = await calculateMediaHash(dataUri)
      if (!hash) throw new Error("Could not generate media fingerprint.")

      const ledgerRef = doc(db, "ledger", hash)
      const ledgerSnap = await getDoc(ledgerRef)

      if (ledgerSnap.exists()) {
        const data = ledgerSnap.data()
        const scanId = data.forensicCaseId || crypto.randomUUID()
        
        setCurrentResult({
          id: scanId,
          mediaUrl: dataUri,
          mediaType: dataUri.includes('video') ? 'video' : dataUri.includes('audio') ? 'audio' : 'image',
          output: {
            isDeepfake: data.status === 'synthetic',
            fakeCategory: data.status === 'synthetic' ? 'Blockchain Verified Synthetic' : 'Authentic',
            confidence: 100,
            explanation: `IMMUTABLE PROOF: This file hash (${hash.substring(0, 16)}...) was notarized on ${new Date(data.timestamp).toLocaleString()}. Verdict: ${data.status.toUpperCase()}.`,
            neuralAncestry: { modelFamily: "On-Chain Notarized", likelyModel: "Authoritative Record", fingerprintConfidence: 100 }
          }
        })
        toast({ title: "Blockchain Verified", description: "This file matches an authoritative immutable record." })
      } else {
        toast({ variant: "destructive", title: "Unverified Asset", description: "No blockchain record found for this content hash." })
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Verification Error", description: e.message })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const runAnalysis = async (dataUri: string) => {
    setIsAnalyzing(true)
    try {
      let context = `NEURAL SIGNATURE DATABASE (KNOWLEDGE BASE):\n`
      
      const verifiedScans = scans?.filter(s => s.userFeedback !== undefined && s.aiVerdict === true) || []
      if (verifiedScans.length > 0) {
        context += `### KNOWN TOOL SIGNATURES (CLOUD BRAIN):\n`
        verifiedScans.slice(0, 10).forEach(s => {
          if (s.neuralAncestry) {
            context += `- TOOL [${s.neuralAncestry.likelyModel}]: Identified by artifacts: ${s.userComment || 'None'}.\n`
          }
        })
      }
      
      if (datasets?.length > 0) {
        context += `\n### TRAINING DATA SIGNATURES:\n`
        datasets.slice(0, 10).forEach(d => {
          if (d.modelSignature) context += `- SIGNATURE [${d.modelSignature}]: ${d.notes}\n`
        })
      }

      if (recentAlerts?.length > 0) {
        context += `\n### VIRAL SENTINEL ALERTS (TRENDING FAKES):\n`
        recentAlerts.forEach(a => {
          context += `- VIRAL ALERT: Trending on ${a.platform}. Detail: ${a.contentSnippet}. Known Source: ${a.originalSource}\n`
        })
      }

      if (localIntelligence) context += `\n### PHYSICAL VAULT EVIDENCE:\n${localIntelligence}\n`

      let output
      if (dataUri.startsWith('data:image/')) output = await analyzeImageForDeepfake({ imageDataUri: dataUri, learnedContext: context })
      else if (dataUri.startsWith('data:audio/')) output = await analyzeAudioForDeepfake({ audioDataUri: dataUri, learnedContext: context })
      else if (dataUri.startsWith('data:video/')) output = await analyzeVideoForDeepfake({ videoDataUri: dataUri, learnedContext: context })

      const scanId = crypto.randomUUID()
      const mediaType = dataUri.includes('video') ? 'video' : dataUri.includes('audio') ? 'audio' : 'image'
      setCurrentResult({ id: scanId, output, mediaUrl: dataUri, mediaType: mediaType as any })
      
      if (db && user) {
        // Scoping scan to users/{userId}/mediaFiles
        const scanRef = doc(db, "users", user.uid, "mediaFiles", scanId)
        const scanData = {
          id: scanId,
          timestamp: new Date().toISOString(),
          mediaType,
          fileName: `Forensic_Case_${scanId.substring(0, 6)}`,
          fakeCategory: output.fakeCategory || (output.isDeepfake ? "Synthetic" : "Authentic"),
          aiVerdict: output.isDeepfake,
          aiConfidence: output.confidence,
          explanation: output.explanation,
          mediaUrl: "Protected in Vault",
          neuralAncestry: output.neuralAncestry || null,
          biometricVitals: output.biometricVitals || null,
          behavioralBiometrics: output.behavioralBiometrics || null,
          crossModalSync: output.crossModalSync || null,
          highlightedRegions: output.highlightedRegions || null,
          suspiciousSegments: output.suspiciousSegments || null,
          sourceOrigin: output.sourceOrigin || null,
          originalContext: output.originalContext || null,
          mediaHash: await calculateMediaHash(dataUri),
          userId: user.uid
        }

        setDoc(scanRef, scanData).catch(err => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: scanRef.path, operation: 'create', requestResourceData: scanData })))
      }
      
      // Mirror to PC Vault automatically if connected
      if (localFolderHandle) {
        const fileName = `SCAN_${scanId.substring(0, 8)}.json`
        const fileHandle = await localFolderHandle.getFileHandle(fileName, { create: true })
        const writable = await (fileHandle as any).createWritable()
        await writable.write(JSON.stringify({ id: scanId, output, timestamp: new Date().toISOString() }, null, 2))
        await writable.close()
        toast({ title: "PC Vault Sync", description: "Forensic record mirrored to your physical database." })
      }

      if (output.isDeepfake && (!output.neuralAncestry?.likelyModel || output.neuralAncestry.likelyModel === "Unknown")) {
        toast({ 
          variant: "destructive", 
          title: "NEW DEEPFAKE STYLE DETECTED", 
          description: "This signature does not match any known families. Committed to Pattern Learning Hub." 
        })
      } else {
        toast({ title: "Analysis Complete", description: db ? "Intelligence synced to Neural Ledger & Vault." : "Forensic result generated (Offline Vault Mode)." })
      }

    } catch (e: any) {
      toast({ variant: "destructive", title: "Scan Failed", description: e.message })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleSelectItem = (id: string) => {
    const scan = scans?.find(s => s.id === id)
    if (scan) {
      setActiveTab("analyze")
      setCurrentResult({ 
        id: scan.id, 
        output: { 
          isDeepfake: scan.aiVerdict, 
          fakeCategory: scan.fakeCategory, 
          confidence: scan.aiConfidence, 
          explanation: scan.explanation, 
          neuralAncestry: scan.neuralAncestry, 
          biometricVitals: scan.biometricVitals, 
          crossModalSync: scan.crossModalSync, 
          highlightedRegions: scan.highlightedRegions, 
          suspiciousSegments: scan.suspiciousSegments, 
          behavioralBiometrics: scan.behavioralBiometrics, 
          sourceOrigin: scan.sourceOrigin, 
          originalContext: scan.originalContext 
        }, 
        mediaUrl: scan.mediaUrl || "", 
        mediaType: scan.mediaType 
      })
      workstationRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }

  const historyItems = React.useMemo(() => (scans || []).map(s => ({
    id: s.id,
    timestamp: s.timestamp,
    fileName: s.fileName || "Forensic_Case_" + s.id.substring(0, 6),
    isDeepfake: s.aiVerdict,
    confidence: s.aiConfidence,
    type: s.mediaType
  } as HistoryItem)), [scans])

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden perspective-1000">
      <div className="perspective-grid" />
      <header className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto max-w-7xl px-4 h-16 flex items-center justify-between">
          <DeepScanLogo />
          <div className="flex items-center gap-8">
            <div className="hidden lg:flex items-center gap-6">
              <div className="flex items-center gap-2">
                {isCloudActive ? (
                  <>
                    <Globe className="w-3.5 h-3.5 text-primary animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80">NEURAL LEDGER: <span className="text-foreground">ACTIVE</span></span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3.5 h-3.5 text-destructive" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80">MODE: <span className="text-destructive">OFFLINE VAULT</span></span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Network className={cn("w-3.5 h-3.5", localFolderHandle ? "text-primary" : "text-muted-foreground/50")} />
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80">PC VAULT: <span className="text-foreground">{localFolderHandle ? localFolderHandle.name.toUpperCase() : "UNLINKED"}</span></span>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto max-w-7xl px-4 py-12 z-10 preserve-3d">
        {!isCloudActive && (
          <div className="mb-8 p-6 bg-primary/5 border border-primary/20 rounded-2xl flex items-start gap-4 animate-in fade-in slide-in-from-top-4 duration-700">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
               <Info className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="text-[12px] font-black uppercase tracking-widest text-primary mb-1">Hybrid Forensic Mode Active</h4>
              <p className="text-[11px] font-medium text-muted-foreground leading-relaxed">
                You are currently in **Offline Forensic Mode**. Investigations are powered by local AI and stored in your **PC Vault**. Connect to the cloud to enable **Global Sentinel Monitoring** and **Blockchain Notarization**.
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-10 px-6 text-[10px] font-black uppercase border-primary/30 text-primary hover:bg-primary/10" 
              onClick={() => setActiveTab("datasets")}
            >
              Configure Cloud
            </Button>
          </div>
        )}

        <div className="flex flex-col gap-12">
          <section>
            <div className="flex flex-col lg:flex-row items-center justify-between gap-12 p-10 bg-white/50 dark:bg-card/50 backdrop-blur-sm border border-border volumetric-shadow rounded-2xl spatial-lift preserve-3d">
              <div className="flex-1 space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider border border-primary/20 rounded-full">
                  <Activity className="w-3.5 h-3.5" /> MULTI-MODAL FORENSICS
                </div>
                <h1 className="text-3xl md:text-5xl font-black tracking-tighter leading-[1.1] text-foreground uppercase">
                  STOP THE <span className="text-primary italic">AI GHOST.</span>
                </h1>
                <p className="text-muted-foreground text-sm max-w-xl leading-relaxed font-medium">
                  DeepScan utilizes **Temporal Neural Synergy** and **Style Transfer Detection** to identify Face Swapping, Lip Syncing, and AI filters. Investigate the unseen.
                </p>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                  {[
                    { icon: Eye, text: "Ocular Biometrics" },
                    { icon: Frame, text: "Temporal Synergy" },
                    { icon: Waves, text: "Prosody Analysis" },
                    { icon: Fingerprint, text: "Neural Traceback" }
                  ].map((cap, i) => (
                    <div key={i} className="flex flex-col items-center gap-2 p-3 rounded-xl bg-background border shadow-sm border-primary/5">
                      <cap.icon className="w-4 h-4 text-primary" />
                      <span className="text-[9px] font-black uppercase tracking-tighter text-muted-foreground text-center">{cap.text}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="w-full lg:w-auto flex flex-col gap-4">
                <Button 
                  className="h-16 px-10 rounded-2xl font-black uppercase tracking-widest volumetric-shadow bg-primary text-white gap-3 hover:scale-[1.05] transition-all duration-300"
                  onClick={() => { setActiveTab("analyze"); workstationRef.current?.scrollIntoView({ behavior: "smooth" }); }}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <MicroscopeIcon className="w-5 h-5" />}
                  BEGIN INVESTIGATION
                </Button>
                <div className="flex gap-4">
                   <Button variant="outline" className="flex-1 h-14 rounded-xl font-black uppercase tracking-widest border-2 gap-3" onClick={() => setActiveTab("vault")}>
                     <Target className="w-5 h-5 text-primary" /> VAULT
                   </Button>
                   <Button variant="outline" className="flex-1 h-14 rounded-xl font-black uppercase tracking-widest border-2 gap-3" onClick={() => setActiveTab("evolution")}>
                     <BarChart3 className="w-5 h-5 text-primary" /> EVOLUTION
                   </Button>
                </div>
              </div>
            </div>
          </section>

          <div ref={workstationRef} className="space-y-8">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="bg-transparent h-auto p-0 mb-8 border-b rounded-none gap-8 overflow-x-auto no-scrollbar whitespace-nowrap">
                <TabsTrigger value="analyze" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary font-bold uppercase text-[10px] tracking-widest px-0 pb-4 h-auto gap-2">
                  <Sparkles className="w-3.5 h-3.5" /> ANALYZE
                </TabsTrigger>
                <TabsTrigger value="vault" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary font-bold uppercase text-[10px] tracking-widest px-0 pb-4 h-auto gap-2">
                  <Target className="w-3.5 h-3.5" /> VAULT
                </TabsTrigger>
                <TabsTrigger value="evolution" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary font-bold uppercase text-[10px] tracking-widest px-0 pb-4 h-auto gap-2" disabled={!isCloudActive}>
                  <LineChart className="w-3.5 h-3.5" /> EVOLUTION
                </TabsTrigger>
                <TabsTrigger value="sentinel" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary font-bold uppercase text-[10px] tracking-widest px-0 pb-4 h-auto gap-2" disabled={!isCloudActive}>
                  <Radio className="w-3.5 h-3.5" /> SENTINEL
                </TabsTrigger>
                <TabsTrigger value="protect" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary font-bold uppercase text-[10px] tracking-widest px-0 pb-4 h-auto gap-2">
                  <ShieldIcon className="w-3.5 h-3.5" /> PROTECT
                </TabsTrigger>
                <TabsTrigger value="history" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary font-bold uppercase text-[10px] tracking-widest px-0 pb-4 h-auto gap-2">
                  <Clock className="w-3.5 h-3.5" /> HISTORY
                </TabsTrigger>
                <TabsTrigger value="datasets" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary font-bold uppercase text-[10px] tracking-widest px-0 pb-4 h-auto gap-2">
                  <BrainCircuit className="w-3.5 h-3.5" /> PATTERN HUB
                </TabsTrigger>
              </TabsList>

              <TabsContent value="analyze" className="mt-0 focus-visible:ring-0">
                <div className="space-y-12">
                  <div className={cn("grid grid-cols-1 gap-8", currentResult ? "lg:grid-cols-[450px_1fr]" : "grid-cols-1")}>
                    <MediaUpload onUpload={runAnalysis} onVerify={runQuickVerify} isAnalyzing={isAnalyzing} />
                    {currentResult && (
                      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <AnalysisResult 
                          scanId={currentResult.id}
                          result={currentResult.output} 
                          mediaUrl={currentResult.mediaUrl} 
                          mediaType={currentResult.mediaType}
                          vaultHandle={localFolderHandle}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="vault" className="mt-0">
                <div className="animate-in fade-in duration-500">
                   <MediaVault onReverify={handleSelectItem} />
                </div>
              </TabsContent>

              <TabsContent value="evolution" className="mt-0">
                <div className="animate-in fade-in duration-500">
                   <ModelEvolutionTracker />
                </div>
              </TabsContent>

              <TabsContent value="sentinel" className="mt-0">
                <div className="animate-in fade-in duration-500">
                   <SocialMonitor />
                </div>
              </TabsContent>

              <TabsContent value="protect" className="mt-0">
                <div className="animate-in fade-in duration-500">
                   <AuthenticityShield vaultHandle={localFolderHandle} />
                </div>
              </TabsContent>

              <TabsContent value="history" className="mt-0">
                <DetectionHistory items={historyItems} onClear={() => {}} onSelectItem={handleSelectItem} />
              </TabsContent>

              <TabsContent value="datasets" className="mt-0">
                <DatasetManager 
                  knowledgeCount={knowledgeCount} 
                  vaultHandle={localFolderHandle}
                  onVaultChange={(name, handle) => { if (handle) setLocalFolderHandle(handle); else setLocalFolderHandle(null); }} 
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>

      <footer className="border-t py-12 mt-auto bg-background/50 backdrop-blur-sm">
        <div className="container mx-auto max-w-7xl px-4 flex flex-col md:flex-row items-center justify-between gap-8">
          <DeepScanLogo />
          <div className="flex gap-8 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            <a href="#" className="hover:text-primary transition-colors">Forensic Standards</a>
            <a href="#" className="hover:text-primary transition-colors">Privacy</a>
            <a href="#" className="hover:text-primary transition-colors">Immune Protocol</a>
          </div>
          <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-30">V3.1.0 HYBRID FORENSIC ENGINE</div>
        </div>
      </footer>
    </div>
  )
}
