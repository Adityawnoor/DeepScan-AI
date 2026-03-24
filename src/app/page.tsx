
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { 
  ShieldCheck, History, Database, Zap, 
  Microscope as MicroscopeIcon,
  Brain, Activity, Shield, Sparkles, Clock,
  Network, Loader2, LogOut, ShieldCheck as ShieldIcon,
  Cpu, Fingerprint, Layers, CheckCircle2
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useFirestore, useCollection } from "@/firebase"
import { collection, doc, setDoc, query, orderBy, limit } from "firebase/firestore"
import { errorEmitter } from "@/firebase/error-emitter"
import { FirestorePermissionError } from "@/firebase/errors"

export default function DeepScanHome() {
  const { toast } = useToast()
  const db = useFirestore()
  const [isAnalyzing, setIsAnalyzing] = React.useState(false)
  const [currentResult, setCurrentResult] = React.useState<{ id: string, output: any, mediaUrl: string, mediaType: 'image' | 'audio' | 'video' } | null>(null)
  const [activeTab, setActiveTab] = React.useState("analyze")
  
  // Vault handles are stored in IndexedDB to persist across sessions and environments
  const [localFolderHandle, setLocalFolderHandle] = React.useState<FileSystemDirectoryHandle | null>(null)
  const [vaultPermissionStatus, setVaultPermissionStatus] = React.useState<'granted' | 'denied' | 'prompt' >('prompt')

  // Global Intelligence Queries
  const scansQuery = React.useMemo(() => db ? query(collection(db, "scans"), orderBy("timestamp", "desc"), limit(100)) : null, [db])
  const datasetsQuery = React.useMemo(() => db ? query(collection(db, "datasets"), orderBy("uploadDate", "desc")) : null, [db])
  
  const { data: scans } = useCollection(scansQuery)
  const { data: datasets } = useCollection(datasetsQuery)

  const workstationRef = React.useRef<HTMLDivElement>(null)

  // Load vault handle from local memory (IndexedDB)
  const loadVaultFromMemory = React.useCallback(async () => {
    try {
      const dbRequest = indexedDB.open("DeepScanVaultDB", 1)
      dbRequest.onupgradeneeded = () => {
        if (!dbRequest.result.objectStoreNames.contains("vaultStore")) {
          dbRequest.result.createObjectStore("vaultStore")
        }
      }
      dbRequest.onsuccess = () => {
        const idb = dbRequest.result
        const transaction = idb.transaction("vaultStore", "readonly")
        const store = transaction.objectStore("vaultStore")
        const getRequest = store.get("localFolderHandle")
        getRequest.onsuccess = async () => {
          if (getRequest.result) {
            const handle = getRequest.result as FileSystemDirectoryHandle
            setLocalFolderHandle(handle)
            const permission = await handle.queryPermission({ mode: 'readwrite' })
            setVaultPermissionStatus(permission)
          }
        }
      }
    } catch (e) {
      console.warn("Vault handle could not be retrieved from IndexedDB.", e)
    }
  }, [])

  React.useEffect(() => {
    loadVaultFromMemory()
  }, [loadVaultFromMemory])

  const knowledgeCount = React.useMemo(() => {
    const datasetCount = datasets.length
    const verifiedScanCount = scans.filter(s => s.userFeedback !== undefined).length
    return datasetCount + verifiedScanCount
  }, [datasets, scans])

  const handleVaultPermissionRequest = async () => {
    if (!localFolderHandle) return
    try {
      const status = await localFolderHandle.requestPermission({ mode: 'readwrite' })
      setVaultPermissionStatus(status)
      if (status === 'granted') {
        toast({ title: "Vault Re-verified", description: "PC Database is now active and writable." })
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Permission Denied", description: "Could not activate physical vault." })
    }
  }

  // BUILD THE GLOBAL INTELLIGENCE CONTEXT FOR THE AI
  const runAnalysisWithRetry = async (dataUri: string, retryCount = 0): Promise<any> => {
    // Collect all learned context from previous training (Firestore)
    let context = `NEURAL SINGULARITY DIRECTIVE (MANDATORY GROUND TRUTH):\n`
    
    // Add verified audits
    const verifiedScans = scans.filter(s => s.userFeedback !== undefined)
    if (verifiedScans.length > 0) {
      context += `### AUDITED CASE HISTORY (PRIORITIZE THESE):\n`
      verifiedScans.slice(0, 20).forEach(s => {
        const truth = s.userFeedback ? 'SYNTHETIC/FAKE' : 'AUTHENTIC/REAL'
        context += `- CASE [${s.id.substring(0,8)}]: MANUALLY VERIFIED AS ${truth}. `
        if (s.userComment) context += `EXPERT AUDIT NOTES: "${s.userComment}"\n`
        else context += `\n`
      })
    }
    
    // Add dataset intelligence
    if (datasets.length > 0) {
      context += `### RESEARCH DATASET INTELLIGENCE:\n`
      datasets.slice(0, 15).forEach(d => {
        context += `- SAMPLE [${d.fileName || 'Research Asset'}]: VERIFIED AS ${d.label?.toUpperCase()}. `
        if (d.notes) context += `FORENSIC SIGNATURE: "${d.notes}"\n`
        else context += `\n`
      })
    }

    context += `\nCRITICAL COMMAND: If the current sample shows ANY artifacts mentioned in "EXPERT AUDIT NOTES" or "FORENSIC SIGNATURES", you MUST flag it as a Deepfake regardless of internal neural training.`

    try {
      if (dataUri.startsWith('data:image/')) {
        return await analyzeImageForDeepfake({ imageDataUri: dataUri, learnedContext: context })
      } else if (dataUri.startsWith('data:audio/')) {
        return await analyzeAudioForDeepfake({ audioDataUri: dataUri, learnedContext: context })
      } else if (dataUri.startsWith('data:video/')) {
        return await analyzeVideoForDeepfake({ videoDataUri: dataUri, learnedContext: context })
      }
    } catch (error: any) {
      // Handle AI Quota/Rate limits gracefully
      const isQuotaError = error.message?.includes('429') || 
                           error.message?.includes('RESOURCE_EXHAUSTED') ||
                           error.message?.includes('quota');
      
      if (isQuotaError && retryCount < 5) {
        const waitTime = 15000;
        toast({ 
          title: "Neural Engine Cooling Down", 
          description: `AI Quota reached. Retrying automatically in 15s (Attempt ${retryCount + 1}/5)...` 
        })
        await new Promise(resolve => setTimeout(resolve, waitTime))
        return runAnalysisWithRetry(dataUri, retryCount + 1)
      }
      throw error
    }
  }

  const runAnalysis = async (dataUri: string) => {
    if (!db) return
    setIsAnalyzing(true)
    try {
      const output = await runAnalysisWithRetry(dataUri)
      
      let mediaType: 'image' | 'audio' | 'video' = 'image'
      if (dataUri.startsWith('data:audio/')) mediaType = 'audio'
      else if (dataUri.startsWith('data:video/')) mediaType = 'video'

      const scanId = crypto.randomUUID()
      setCurrentResult({ id: scanId, output, mediaUrl: dataUri, mediaType })
      
      // Save metadata to Global Cloud Memory (Firestore)
      const scanRef = doc(db, "scans", scanId)
      const scanData = {
        timestamp: new Date().toISOString(),
        mediaType,
        aiVerdict: output.isDeepfake,
        aiConfidence: output.confidence,
        explanation: output.explanation,
        mediaUrl: "Stored in Private Vault",
        neuralAncestry: output.neuralAncestry || null,
        biometricVitals: output.biometricVitals || null,
        noiseArtifacts: output.noiseArtifacts || null
      }

      setDoc(scanRef, scanData).catch(async (err) => {
        const permissionError = new FirestorePermissionError({
          path: scanRef.path,
          operation: 'create',
          requestResourceData: scanData
        })
        errorEmitter.emit('permission-error', permissionError)
      })

      toast({ title: "Analysis Complete", description: "Intelligence synced to Cloud Research Base." })
    } catch (e: any) {
      console.error(e)
      toast({ 
        variant: "destructive", 
        title: "Scan Failed", 
        description: e.message || "The neural engine encountered an error." 
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const disconnectVault = async () => {
    const dbRequest = indexedDB.open("DeepScanVaultDB", 1)
    dbRequest.onsuccess = () => {
      const idb = dbRequest.result
      const transaction = idb.transaction("vaultStore", "readwrite")
      const store = transaction.objectStore("vaultStore")
      store.delete("localFolderHandle")
      transaction.oncomplete = () => {
        setLocalFolderHandle(null)
        setVaultPermissionStatus('prompt')
        toast({ title: "Vault Disconnected", description: "Local PC database unlinked." })
      }
    }
  }

  const historyItems = React.useMemo(() => scans.map(s => ({
    id: s.id,
    timestamp: s.timestamp,
    fileName: "Case_" + s.id.substring(0, 6),
    isDeepfake: s.aiVerdict,
    confidence: s.aiConfidence,
    type: s.mediaType
  } as HistoryItem)), [scans])

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden perspective-1000">
      <div className="perspective-grid" />
      
      <header className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-50 preserve-3d">
        <div className="container mx-auto max-w-7xl px-4 h-16 flex items-center justify-between">
          <DeepScanLogo />
          
          <div className="flex items-center gap-8">
            <div className="hidden lg:flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80">
                  NEURAL CLOUD: <span className="text-foreground">SYNCED</span>
                </span>
              </div>
              <div className="flex items-center gap-2 group">
                <Network className={cn("w-3.5 h-3.5 transition-colors", localFolderHandle ? "text-primary" : "text-muted-foreground/50")} />
                <div className="flex flex-col">
                   <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80">
                    PC VAULT: <span className={cn("text-foreground", !localFolderHandle && "text-destructive/70")}>{localFolderHandle ? localFolderHandle.name.toUpperCase() : "UNLINKED"}</span>
                  </span>
                  {localFolderHandle && vaultPermissionStatus !== 'granted' && (
                    <button onClick={handleVaultPermissionRequest} className="text-[8px] font-bold text-primary uppercase text-left animate-pulse hover:underline">
                      Permission Required
                    </button>
                  )}
                </div>
                {localFolderHandle && (
                  <button onClick={disconnectVault} className="opacity-0 group-hover:opacity-100 transition-opacity ml-2 text-destructive hover:scale-110" title="Disconnect Vault">
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto max-w-7xl px-4 py-12 z-10 preserve-3d">
        <div className="flex flex-col gap-12">
          
          {/* HERO SECTION */}
          <section className="preserve-3d">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-12 p-10 bg-white/50 dark:bg-card/50 backdrop-blur-sm border border-border volumetric-shadow relative overflow-hidden group hover:border-primary/30 transition-all duration-500 rounded-2xl spatial-lift preserve-3d">
              <div className="flex-1 space-y-6 preserve-3d">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider border border-primary/20 rounded-full">
                  <Activity className="w-3.5 h-3.5" />
                  ADVANCED NEURAL FORENSICS
                </div>
                <h1 className="text-3xl md:text-5xl font-black tracking-tighter leading-[1.1] text-foreground uppercase transform translate-z-10">
                  STOP THE <span className="text-primary italic">AI GHOST.</span>
                </h1>
                <p className="text-muted-foreground text-sm max-w-xl leading-relaxed font-medium transform translate-z-5">
                  DeepScan elite mode detects microscopic <span className="font-bold text-foreground">Spectral Noise Artifacts</span> and identifies the exact <span className="font-bold text-foreground">Neural DNA</span> of the generative model used.
                </p>
                <div className="flex gap-4 pt-4 preserve-3d">
                  <div className="flex items-center gap-2 px-4 py-2 border border-primary/10 bg-primary/5 text-primary text-[10px] font-black uppercase tracking-widest rounded-xl spatial-lift">
                    <Zap className="w-3 h-3" />
                    {knowledgeCount} LESSONS LEARNED
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 border border-primary/10 bg-primary/5 text-primary text-[10px] font-black uppercase tracking-widest rounded-xl spatial-lift">
                    <Activity className="w-3 h-3" />
                    LATENT SPACE AUDIT ACTIVE
                  </div>
                </div>
              </div>

              <div className="w-full lg:w-auto flex flex-col gap-4 preserve-3d">
                <Button 
                  variant="default" 
                  size="lg" 
                  className="h-16 px-10 rounded-2xl font-black uppercase tracking-widest volumetric-shadow bg-primary hover:bg-primary/90 text-white gap-3 transition-all duration-300 hover:scale-[1.05] active:scale-95 animate-pulse-ring relative overflow-visible transform translate-z-20"
                  onClick={() => workstationRef.current?.scrollIntoView({ behavior: "smooth" })}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <MicroscopeIcon className="w-5 h-5" />}
                  {isAnalyzing ? "ANALYZING..." : "BEGIN INVESTIGATION"}
                </Button>
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="h-16 px-10 rounded-2xl font-black uppercase tracking-widest border-2 gap-3 transition-all duration-300 hover:scale-[1.05] active:scale-95 transform translate-z-15"
                  onClick={() => setActiveTab("protect")}
                >
                  <Sparkles className="w-5 h-5 text-primary" />
                  VACCINATE IDENTITY
                </Button>
              </div>
            </div>
          </section>

          <div ref={workstationRef} className="space-y-8 preserve-3d">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="bg-transparent h-auto p-0 mb-8 border-b rounded-none gap-8 preserve-3d">
                <TabsTrigger 
                  value="analyze" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary font-bold uppercase text-[10px] tracking-widest px-0 pb-4 h-auto gap-2 transition-all duration-300 hover:text-primary/80"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  ANALYZE
                </TabsTrigger>
                <TabsTrigger 
                  value="protect" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary font-bold uppercase text-[10px] tracking-widest px-0 pb-4 h-auto gap-2 transition-all duration-300 hover:text-primary/80"
                >
                  <ShieldIcon className="w-3.5 h-3.5" />
                  PROTECT
                </TabsTrigger>
                <TabsTrigger 
                  value="history" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary font-bold uppercase text-[10px] tracking-widest px-0 pb-4 h-auto gap-2 transition-all duration-300 hover:text-primary/80"
                >
                  <Clock className="w-3.5 h-3.5" />
                  HISTORY
                </TabsTrigger>
                <TabsTrigger 
                  value="datasets" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary font-bold uppercase text-[10px] tracking-widest px-0 pb-4 h-auto gap-2 transition-all duration-300 hover:text-primary/80"
                >
                  <Database className="w-3.5 h-3.5" />
                  DATASETS
                </TabsTrigger>
              </TabsList>

              <TabsContent value="analyze" className="mt-0 focus-visible:ring-0 preserve-3d">
                <div className="space-y-12 preserve-3d">
                  <div className={cn(
                    "grid grid-cols-1 gap-8",
                    currentResult ? "lg:grid-cols-[450px_1fr]" : "grid-cols-1"
                  )}>
                    <div className="space-y-8 preserve-3d">
                      <div className="spatial-lift preserve-3d">
                        <MediaUpload onUpload={runAnalysis} isAnalyzing={isAnalyzing} />
                      </div>
                    </div>

                    {currentResult && (
                      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 spatial-lift preserve-3d">
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

                  {/* FORENSIC CAPABILITIES SECTION */}
                  <div className="py-12 border rounded-2xl bg-primary/5 p-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                    <div className="flex flex-col gap-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Cpu className="w-5 h-5 text-primary" />
                        </div>
                        <h3 className="text-lg font-black uppercase tracking-tighter">Forensic Capabilities</h3>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                          "GENERATIVE MODEL FINGERPRINTING",
                          "HIGH-FREQUENCY NOISE FLOOR ANALYSIS",
                          "TEMPORAL CONSISTENCY CHECKS",
                          "METADATA CHAIN-OF-CUSTODY"
                        ].map((item, i) => (
                          <div key={i} className="flex items-center gap-3 p-4 bg-white/50 dark:bg-card/50 rounded-xl border border-border shadow-sm">
                            <CheckCircle2 className="w-4 h-4 text-primary" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-foreground/80">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {!currentResult && historyItems.length > 0 && (
                    <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300 preserve-3d">
                      <div className="flex items-center gap-3 mb-6">
                        <History className="w-5 h-5 text-primary" />
                        <h2 className="text-xl font-black uppercase tracking-tighter">Recent Investigative History</h2>
                      </div>
                      <DetectionHistory 
                        items={historyItems.slice(0, 5)} 
                        onClear={() => {}} 
                        onSelectItem={(id) => {
                          const scan = scans.find(s => s.id === id)
                          if (scan) {
                            setCurrentResult({
                              id: scan.id,
                              output: {
                                isDeepfake: scan.aiVerdict,
                                confidence: scan.aiConfidence,
                                explanation: scan.explanation,
                                neuralAncestry: scan.neuralAncestry,
                                biometricVitals: scan.biometricVitals,
                                scale: scan.noiseArtifacts
                              },
                              mediaUrl: scan.mediaUrl || "", 
                              mediaType: scan.mediaType
                            })
                          }
                        }} 
                      />
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="protect" className="mt-0 focus-visible:ring-0 spatial-lift">
                <AuthenticityShield vaultHandle={localFolderHandle} />
              </TabsContent>

              <TabsContent value="history" className="mt-0 spatial-lift">
                <DetectionHistory 
                  items={historyItems} 
                  onClear={() => {}} 
                  onSelectItem={(id) => {
                    const scan = scans.find(s => s.id === id)
                    if (scan) {
                      setActiveTab("analyze")
                      setCurrentResult({
                        id: scan.id,
                        output: {
                          isDeepfake: scan.aiVerdict,
                          confidence: scan.aiConfidence,
                          explanation: scan.explanation,
                          neuralAncestry: scan.neuralAncestry,
                          biometricVitals: scan.biometricVitals,
                          noiseArtifacts: scan.noiseArtifacts
                        },
                        mediaUrl: scan.mediaUrl || "",
                        mediaType: scan.mediaType
                      })
                    }
                  }} 
                />
              </TabsContent>

              <TabsContent value="datasets" className="mt-0 spatial-lift">
                <DatasetManager 
                  knowledgeCount={knowledgeCount} 
                  vaultHandle={localFolderHandle}
                  vaultPermissionStatus={vaultPermissionStatus}
                  onVaultChange={(name, handle) => {
                    if (handle) {
                      setLocalFolderHandle(handle);
                      setVaultPermissionStatus('granted');
                    } else {
                      setLocalFolderHandle(null);
                      setVaultPermissionStatus('prompt');
                    }
                  }} 
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>

      <footer className="border-t py-12 mt-auto bg-background/50 backdrop-blur-sm z-10 preserve-3d">
        <div className="container mx-auto max-w-7xl px-4 flex flex-col md:flex-row items-center justify-between gap-8">
          <DeepScanLogo />
          <div className="flex gap-8 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            <a href="#" className="hover:text-primary transition-colors uppercase">Forensic Standards</a>
            <a href="#" className="hover:text-primary transition-colors uppercase">Privacy</a>
            <a href="#" className="hover:text-primary transition-colors uppercase">Immune Protocol</a>
          </div>
          <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-30">
            V3.1.0 FORENSIC ENGINE
          </div>
        </div>
      </footer>
    </div>
  )
}
