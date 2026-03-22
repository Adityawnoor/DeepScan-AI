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
  Network, Microscope as MicroscopeIcon,
  ShieldAlert, Gavel, Brain, Activity, Cpu, Layers
} from "lucide-react"
import { cn } from "@/lib/utils"

const NeuralCore3D = () => (
  <div className="relative w-80 h-80 perspective-1000 hidden lg:flex items-center justify-center pointer-events-none scale-110">
    <div className="absolute inset-0 preserve-3d animate-rotate-y">
      {/* Outer Rotating Wireframe */}
      <div className="absolute inset-0 border-[3px] border-primary/20 rounded-full animate-rotate-x" />
      <div className="absolute inset-8 border-[2px] border-primary/30 rounded-full rotate-y-45 rotate-x-45" />
      
      {/* Inner Data Rings */}
      <div className="absolute inset-16 border border-primary/40 rounded-full animate-pulse flex items-center justify-center">
        <div className="w-full h-1 bg-primary/20 animate-spin" />
      </div>
      
      {/* Core Energy Field */}
      <div className="absolute inset-24 bg-primary/10 rounded-full blur-3xl animate-neural-pulse" />
      
      {/* Central Identity Shield */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
        <ShieldCheck className="w-20 h-20 text-primary drop-shadow-[0_0_20px_rgba(0,123,255,0.5)] animate-float-3d" />
        <div className="mt-4 px-3 py-1 bg-primary/20 rounded-full border border-primary/30 backdrop-blur-md">
           <span className="text-[8px] font-black tracking-widest text-primary uppercase">Singularity Active</span>
        </div>
      </div>
    </div>
  </div>
)

export default function DeepScanHome() {
  const { toast } = useToast()
  const [isAnalyzing, setIsAnalyzing] = React.useState(false)
  const [currentResult, setCurrentResult] = React.useState<{ id: string, output: any, mediaUrl: string, mediaType: 'image' | 'audio' | 'video' } | null>(null)
  const [history, setHistory] = React.useState<HistoryItem[]>([])
  const [activeTab, setActiveTab] = React.useState("analyze")
  const [localDatasets, setLocalDatasets] = React.useState<any[]>([])
  const [localScans, setLocalScans] = React.useState<any[]>([])
  const [connectedFolderName, setConnectedFolderName] = React.useState<string | null>(null)
  const [localFolderHandle, setLocalFolderHandle] = React.useState<FileSystemDirectoryHandle | null>(null)

  const workstationRef = React.useRef<HTMLDivElement>(null)

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

  const knowledgeCount = React.useMemo(() => {
    const datasetCount = localDatasets.length
    const verifiedScanCount = localScans.filter(s => s.userFeedback !== undefined).length
    return datasetCount + verifiedScanCount
  }, [localDatasets, localScans])

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

  const handleBeginInvestigation = () => {
    setActiveTab("analyze")
    workstationRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  return (
    <div className="min-h-screen bg-background flex flex-col selection:bg-primary selection:text-white">
      <div className="spatial-grid" />
      
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
                <span>Vault: {connectedFolderName || "Scanning..."}</span>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto max-w-7xl px-4 py-12">
        <div className="flex flex-col gap-12">
          
          <section className="relative group perspective-1000">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 to-purple-500/30 rounded-[3rem] blur-3xl opacity-30 transition duration-1000 group-hover:opacity-50" />
            <div className="relative flex flex-col md:flex-row items-center justify-between gap-12 p-12 bg-card/40 border-2 border-primary/10 rounded-[4rem] backdrop-blur-3xl overflow-hidden min-h-[550px] transition-all duration-700 hover:rotate-x-1 hover:rotate-y-1 hover:scale-[1.01] shadow-2xl preserve-3d">
              
              <div className="flex-1 space-y-8 relative z-10 translate-z-10">
                <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-[0.3em] border border-primary/20 animate-holographic">
                  <Cpu className="w-5 h-5" />
                  FORENSIC SINGULARITY ENGINE V3.1
                </div>
                <h1 className="text-5xl md:text-8xl font-black tracking-tighter leading-[0.85]">
                  STOP THE <br />
                  <span className="text-primary italic">AI GHOST.</span>
                </h1>
                <p className="text-muted-foreground text-xl max-w-2xl leading-relaxed font-medium">
                  Deploy the ultimate forensic workstation to detect, <span className="text-foreground font-bold underline decoration-primary/30">Neutralize</span>, and <span className="text-foreground font-bold underline decoration-primary/30">Vaccinate</span> digital identities.
                </p>
                
                <div className="flex flex-wrap gap-6 pt-6">
                  <div className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-muted/50 border-2 border-primary/5 backdrop-blur-sm shadow-inner transition-transform hover:translate-y--1 cursor-default">
                    <ShieldAlert className="w-5 h-5 text-primary" />
                    <span className="text-xs font-black uppercase tracking-widest">Biometric: Pulse Scan</span>
                  </div>
                  <div className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-muted/50 border-2 border-primary/5 backdrop-blur-sm shadow-inner transition-transform hover:translate-y--1 cursor-default">
                    <Layers className="w-5 h-5 text-primary" />
                    <span className="text-xs font-black uppercase tracking-widest">Spectral: Noise Floor</span>
                  </div>
                </div>
              </div>
              
              <div className="relative z-20 flex flex-col items-center gap-8 translate-z-20">
                <NeuralCore3D />
                <div className="flex flex-col gap-4 w-full md:w-auto">
                  <Button 
                    variant="default" 
                    size="lg" 
                    className="h-20 px-12 rounded-[2.5rem] font-black uppercase tracking-[0.2em] shadow-[0_20px_40px_rgba(0,123,255,0.3)] hover:scale-[1.05] active:scale-[0.98] transition-all bg-primary hover:bg-primary/90"
                    onClick={handleBeginInvestigation}
                  >
                    <MicroscopeIcon className="w-6 h-6 mr-4" />
                    Begin Investigation
                  </Button>
                  <Button 
                    variant="outline" 
                    size="lg" 
                    className="h-20 px-12 rounded-[2.5rem] font-black uppercase tracking-[0.2em] border-2 border-primary/20 hover:bg-primary/10 transition-all backdrop-blur-md"
                    onClick={() => setActiveTab("protect")}
                  >
                    <ShieldCheck className="w-6 h-6 mr-4 text-primary" />
                    Vaccinate Identity
                  </Button>
                </div>
              </div>
            </div>
          </section>

          <div ref={workstationRef} className="animate-in fade-in slide-in-from-bottom-12 duration-1000">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="bg-transparent border-b-2 rounded-none w-full justify-start h-auto p-0 mb-12 gap-12 overflow-x-auto no-scrollbar pb-2">
                {["analyze", "protect", "history", "datasets"].map((tab) => (
                  <TabsTrigger 
                    key={tab}
                    value={tab} 
                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-4 data-[state=active]:border-primary rounded-none px-0 pb-6 font-black uppercase text-sm tracking-[0.3em] transition-all opacity-40 data-[state=active]:opacity-100"
                  >
                    {tab === "analyze" && <Zap className="w-4 h-4 mr-3" />}
                    {tab === "protect" && <ShieldCheck className="w-4 h-4 mr-3" />}
                    {tab === "history" && <History className="w-4 h-4 mr-3" />}
                    {tab === "datasets" && <Database className="w-4 h-4 mr-3" />}
                    {tab}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="analyze" className="mt-0 focus-visible:ring-0">
                <div className="space-y-12">
                  <div className={cn(
                    "grid grid-cols-1 gap-12 transition-all duration-1000",
                    currentResult ? "lg:grid-cols-[450px_1fr]" : "grid-cols-1"
                  )}>
                    <div className="space-y-8">
                      <MediaUpload onUpload={runAnalysis} isAnalyzing={isAnalyzing} />
                      <Card className="bg-primary/5 border-2 border-dashed border-primary/20 p-8 rounded-[3rem] space-y-6 shadow-lg transition-transform hover:scale-[1.02]">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-primary/20 rounded-2xl animate-neural-pulse">
                            <Brain className="w-6 h-6 text-primary" />
                          </div>
                          <h4 className="font-black uppercase text-sm tracking-[0.2em]">Forensic Singularity Core</h4>
                        </div>
                        <ul className="space-y-4">
                          {[
                            "Microscopic rPPG Extraction",
                            "Neural Origin Coordinate Mapping",
                            "Spectral High-Pass Fingerprinting",
                            "Immune Protocol Ready"
                          ].map(item => (
                            <li key={item} className="flex items-center gap-3 text-xs font-black uppercase text-muted-foreground">
                              <ShieldCheck className="w-4 h-4 text-primary" />
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

              <TabsContent value="protect" className="mt-0">
                <AuthenticityShield />
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
        </div>
      </main>

      <footer className="border-t py-16 bg-card/30 mt-auto backdrop-blur-md">
        <div className="container mx-auto max-w-7xl px-4 flex flex-col md:flex-row items-center justify-between gap-12">
          <DeepScanLogo />
          <div className="flex gap-16 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
            <a href="#" className="hover:text-primary transition-colors">Forensic Standards</a>
            <a href="#" className="hover:text-primary transition-colors">Privacy manifest</a>
            <a href="#" className="hover:text-primary transition-colors">Immune Protocol</a>
          </div>
          <div className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground opacity-30">
            V3.1.0 FORENSIC SINGULARITY ENGINE
          </div>
        </div>
      </footer>
    </div>
  )
}