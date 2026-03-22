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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { 
  ShieldCheck, History, Database, Sparkles, Folder, 
  ArrowRight, RefreshCw, Fingerprint, Microscope, Zap,
  Dna, Network, Activity
} from "lucide-react"
import { cn } from "@/lib/utils"

export default function DeepScanHome() {
  const { toast } = useToast()
  const [isAnalyzing, setIsAnalyzing] = React.useState(false)
  const [currentResult, setCurrentResult] = React.useState<{ id: string, output: any, mediaUrl: string, mediaType: 'image' | 'audio' | 'video' } | null>(null)
  const [history, setHistory] = React.useState<HistoryItem[]>([])
  const [activeTab, setActiveTab] = React.useState("analyze")
  const [isLearning, setIsLearning] = React.useState(false)

  const [localDatasets, setLocalDatasets] = React.useState<any[]>([])
  const [localScans, setLocalScans] = React.useState<any[]>([])
  const [connectedFolderName, setConnectedFolderName] = React.useState<string | null>(null)
  const [localFolderHandle, setLocalFolderHandle] = React.useState<FileSystemDirectoryHandle | null>(null)

  React.useEffect(() => {
    const savedHistory = localStorage.getItem("deepscan-history")
    const savedDatasets = localStorage.getItem("deepscan-datasets")
    const savedScans = localStorage.getItem("deepscan-scans-metadata")
    const savedFolderName = localStorage.getItem("deepscan-last-folder")

    if (savedHistory) setHistory(JSON.parse(savedHistory))
    if (savedDatasets) setLocalDatasets(JSON.parse(savedDatasets))
    if (savedScans) setLocalScans(JSON.parse(savedScans))
    if (savedFolderName) setConnectedFolderName(savedFolderName)
  }, [])

  const knowledgeCount = localDatasets.length + localScans.filter(s => s.userFeedback !== undefined).length

  const syncToPCFile = async (data: { datasets: any[], scans: any[] }) => {
    if (!localFolderHandle) return
    try {
      const fileHandle = await localFolderHandle.getFileHandle('deepscan-private-metadata.json', { create: true })
      const writable = await fileHandle.createWritable()
      await writable.write(JSON.stringify(data, null, 2))
      await writable.close()
    } catch (err) {
      console.error("Auto-sync failed:", err)
    }
  }

  const runAnalysis = async (dataUri: string) => {
    setIsAnalyzing(true)
    try {
      let context = `### PRIVATE INTELLIGENCE REPORT ###\n`
      localScans.filter(s => s.userFeedback !== undefined).slice(0, 10).forEach(s => {
        context += `- Record ${s.id.substring(0,8)} verified as ${s.userFeedback ? 'SYNTHETIC' : 'AUTHENTIC'}.\n`
      })

      let output: any
      let mediaType: 'image' | 'audio' | 'video' = 'image'

      if (dataUri.startsWith('data:image/')) {
        mediaType = 'image'
        output = await analyzeImageForDeepfake({ imageDataUri: dataUri, learnedContext: context })
      } else if (dataUri.startsWith('data:audio/')) {
        mediaType = 'audio'
        output = await analyzeAudioForDeepfake({ audioDataUri: dataUri, learnedContext: context })
      } else if (dataUri.startsWith('data:video/')) {
        mediaType = 'video'
        output = await analyzeVideoForDeepfake({ videoDataUri: dataUri, learnedContext: context })
      }

      const scanId = crypto.randomUUID()
      setCurrentResult({ id: scanId, output, mediaUrl: dataUri, mediaType })
      
      const newScanMetadata = {
        id: scanId,
        timestamp: new Date().toISOString(),
        mediaType,
        aiVerdict: output.isDeepfake,
        aiConfidence: output.confidence,
        mediaUrl: "Private Storage"
      }

      const updatedScans = [newScanMetadata, ...localScans]
      setLocalScans(updatedScans)
      localStorage.setItem("deepscan-scans-metadata", JSON.stringify(updatedScans))

      const updatedHistory = [{
        id: scanId,
        timestamp: new Date().toISOString(),
        fileName: "Case_" + scanId.substring(0, 6),
        isDeepfake: output.isDeepfake,
        confidence: output.confidence,
        type: mediaType
      } as HistoryItem, ...history]
      
      setHistory(updatedHistory)
      localStorage.setItem("deepscan-history", JSON.stringify(updatedHistory))
      syncToPCFile({ datasets: localDatasets, scans: updatedScans })

      toast({ title: "Analysis Complete", description: "Neural ancestry identified." })
    } catch (e) {
      console.error(e)
      toast({ variant: "destructive", title: "Scan Failed" })
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col selection:bg-primary selection:text-white">
      {/* ELITE HEADER */}
      <header className="border-b bg-card/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto max-w-7xl px-4 h-16 flex items-center justify-between">
          <DeepScanLogo />
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span>Neural Engine: Online</span>
              </div>
              <div className="flex items-center gap-2">
                <Network className="w-3 h-3 text-primary" />
                <span>Private Vault: {connectedFolderName || "Scanning..."}</span>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto max-w-7xl px-4 py-12">
        <div className="flex flex-col gap-12">
          
          {/* HERO FORENSIC STATUS */}
          <section className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-purple-500/20 rounded-[2rem] blur-2xl opacity-50 transition duration-1000 group-hover:opacity-70" />
            <div className="relative flex flex-col md:flex-row items-center justify-between gap-8 p-10 bg-card/40 border-2 border-primary/10 rounded-[2rem] backdrop-blur-3xl overflow-hidden">
              <div className="flex-1 space-y-6">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest border border-primary/20">
                  <Fingerprint className="w-4 h-4" />
                  ADVANCED NEURAL FORENSICS
                </div>
                <h1 className="text-4xl md:text-6xl font-black tracking-tighter leading-none">
                  IDENTIFY THE <span className="text-primary italic">SYNTHETIC GHOST.</span>
                </h1>
                <p className="text-muted-foreground text-lg max-w-xl leading-relaxed font-medium">
                  DeepScan elite mode detects microscopic <span className="text-foreground font-bold">Spectral Noise Artifacts</span> and identifies the exact <span className="text-foreground font-bold">Neural DNA</span> of the generative model used.
                </p>
                
                <div className="flex flex-wrap gap-4 pt-4">
                  <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-muted/50 border">
                    <Dna className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold uppercase tracking-tighter">{knowledgeCount} Lessons Learned</span>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-muted/50 border">
                    <Activity className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold uppercase tracking-tighter">Latent Space Audit Active</span>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col gap-3 w-full md:w-auto">
                <Button 
                  variant="default" 
                  size="lg" 
                  className="h-16 px-8 rounded-2xl font-black uppercase tracking-widest shadow-2xl hover:scale-[1.02] transition-all"
                  onClick={() => setActiveTab("analyze")}
                >
                  <Microscope className="w-5 h-5 mr-3" />
                  Begin Investigation
                </Button>
                {!connectedFolderName && (
                  <Button variant="outline" className="rounded-2xl border-destructive/20 text-destructive h-12" onClick={() => setActiveTab("datasets")}>
                    Link PC Vault to save DNA records
                  </Button>
                )}
              </div>
            </div>
          </section>

          {/* MAIN WORKSTATION */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-transparent border-b rounded-none w-full justify-start h-auto p-0 mb-8 gap-8">
              {["analyze", "history", "datasets"].map((tab) => (
                <TabsTrigger 
                  key={tab}
                  value={tab} 
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-4 font-black uppercase text-xs tracking-[0.2em] transition-all opacity-50 data-[state=active]:opacity-100"
                >
                  {tab === "analyze" && <Zap className="w-3.5 h-3.5 mr-2" />}
                  {tab === "history" && <History className="w-3.5 h-3.5 mr-2" />}
                  {tab === "datasets" && <Database className="w-3.5 h-3.5 mr-2" />}
                  {tab}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="analyze" className="mt-0 focus-visible:ring-0">
              <div className="space-y-12">
                <div className={cn(
                  "grid grid-cols-1 gap-12 transition-all duration-1000",
                  currentResult ? "lg:grid-cols-[400px_1fr]" : "grid-cols-1"
                )}>
                  <div className="space-y-6">
                    <MediaUpload onUpload={runAnalysis} isAnalyzing={isAnalyzing} />
                    <Card className="bg-muted/30 border-2 border-dashed p-6 rounded-[2rem] space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-xl">
                          <Brain className="w-5 h-5 text-primary" />
                        </div>
                        <h4 className="font-black uppercase text-xs tracking-widest">Forensic Capabilities</h4>
                      </div>
                      <ul className="space-y-3">
                        {[
                          "Generative Model Fingerprinting",
                          "High-Frequency Noise Floor Analysis",
                          "Temporal Consistency Checks",
                          "Metadata Chain-of-Custody"
                        ].map(item => (
                          <li key={item} className="flex items-center gap-2 text-[10px] font-bold uppercase text-muted-foreground">
                            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </Card>
                  </div>

                  {currentResult && (
                    <AnalysisResult 
                      scanId={currentResult.id}
                      result={currentResult.output} 
                      mediaUrl={currentResult.mediaUrl} 
                      mediaType={currentResult.mediaType}
                      vaultHandle={localFolderHandle}
                      onUpdate={() => {
                        const savedScans = localStorage.getItem("deepscan-scans-metadata")
                        if (savedScans) setLocalScans(JSON.parse(savedScans))
                      }}
                    />
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="history" className="mt-0">
              <DetectionHistory items={history} onClear={() => { setHistory([]); localStorage.removeItem("deepscan-history"); }} onSelectItem={() => {}} />
            </TabsContent>

            <TabsContent value="datasets" className="mt-0">
              <DatasetManager knowledgeCount={knowledgeCount} onRefresh={(name, handle) => {
                if (name) setConnectedFolderName(name);
                if (handle) setLocalFolderHandle(handle);
              }} />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <footer className="border-t py-12 bg-card/30">
        <div className="container mx-auto max-w-7xl px-4 flex flex-col md:flex-row items-center justify-between gap-8">
          <DeepScanLogo />
          <div className="flex gap-12 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            <a href="#" className="hover:text-primary transition-colors">Forensic Standards</a>
            <a href="#" className="hover:text-primary transition-colors">Privacy manifest</a>
            <a href="#" className="hover:text-primary transition-colors">PC storage protocol</a>
          </div>
          <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-40">
            V2.5.0 Elite Forensic Engine
          </div>
        </div>
      </footer>
    </div>
  )
}
