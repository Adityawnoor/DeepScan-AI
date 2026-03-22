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
  ShieldCheck, History, Database, Sparkles, Folder, 
  ArrowRight, RefreshCw, Fingerprint, Microscope, Zap,
  Dna, Network, Activity, Brain, ShieldAlert, ShieldX,
  FileText, Gavel, LifeBuoy, Box, Layers, Cpu, Target,
  Microscope as MicroscopeIcon
} from "lucide-react"
import { cn } from "@/lib/utils"

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
    <div className="min-h-screen bg-background flex flex-col selection:bg-primary selection:text-white perspective-2000">
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
                <span>Vault: {connectedFolderName || "Scanning..."}</span>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto max-w-7xl px-4 py-12">
        <div className="flex flex-col gap-12">
          
          {/* HERO FORENSIC STATUS WITH NESTED 3D ANIMATION */}
          <section className="relative group perspective-2000">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-purple-500/20 rounded-[2rem] blur-2xl opacity-50 transition duration-1000 group-hover:opacity-70" />
            <div className="relative flex flex-col md:flex-row items-center justify-between gap-8 p-10 bg-card/40 border-2 border-primary/10 rounded-[2rem] backdrop-blur-3xl overflow-hidden min-h-[450px] hover-tilt-card preserve-3d">
              
              {/* 3D NEURAL CORE - NESTED LAYERS */}
              <div className="absolute right-[-80px] top-[-20px] opacity-30 pointer-events-none hidden lg:block scale-110">
                <div className="perspective-2000 w-[450px] h-[450px]">
                  <div className="preserve-3d animate-rotate-3d w-full h-full relative">
                    {/* Outer Cube */}
                    <div className="cube-face cube-face-front" />
                    <div className="cube-face cube-face-back" />
                    <div className="cube-face cube-face-left" />
                    <div className="cube-face cube-face-right" />
                    <div className="cube-face cube-face-top" />
                    <div className="cube-face cube-face-bottom" />
                    
                    {/* Inner Core Cube */}
                    <div className="inner-cube-face inner-face-front" />
                    <div className="inner-cube-face inner-face-back" />
                    <div className="inner-cube-face inner-face-left" />
                    <div className="inner-cube-face inner-face-right" />
                    <div className="inner-cube-face inner-face-top" />
                    <div className="inner-cube-face inner-face-bottom" />
                  </div>
                </div>
              </div>

              <div className="flex-1 space-y-6 relative z-10 preserve-3d">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest border border-primary/20 shadow-[0_0_15px_rgba(var(--primary),0.3)]">
                  <ShieldCheck className="w-4 h-4" />
                  IMMUNE RESPONSE PROTOCOL
                </div>
                <h1 className="text-4xl md:text-7xl font-black tracking-tighter leading-none [transform:translateZ(40px)]">
                  STOP THE <span className="text-primary italic">AI GHOST.</span>
                </h1>
                <p className="text-muted-foreground text-lg max-w-xl leading-relaxed font-medium [transform:translateZ(20px)]">
                  Detect, <span className="text-foreground font-bold underline decoration-primary/30">Neutralize</span>, and <span className="text-foreground font-bold underline decoration-primary/30">Prevent</span> AI-manipulated content using adversarial vaccination and automated legal response.
                </p>
                
                <div className="flex flex-wrap gap-4 pt-4 [transform:translateZ(30px)]">
                  <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-muted/50 border backdrop-blur-sm">
                    <ShieldAlert className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold uppercase tracking-tighter">Immunity Active</span>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-muted/50 border backdrop-blur-sm">
                    <Gavel className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold uppercase tracking-tighter">Legal Autopilot</span>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col gap-3 w-full md:w-auto relative z-10 preserve-3d [transform:translateZ(50px)]">
                <Button 
                  variant="default" 
                  size="lg" 
                  className="h-16 px-8 rounded-2xl font-black uppercase tracking-widest shadow-2xl hover:scale-[1.05] transition-all bg-primary hover:bg-primary/90"
                  onClick={handleBeginInvestigation}
                >
                  <MicroscopeIcon className="w-5 h-5 mr-3" />
                  Detect deepfakes
                </Button>
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="h-16 px-8 rounded-2xl font-black uppercase tracking-widest border-2 border-primary/20 hover:bg-primary/5 transition-all backdrop-blur-md"
                  onClick={() => setActiveTab("protect")}
                >
                  <ShieldCheck className="w-5 h-5 mr-3 text-primary" />
                  Vaccinate Photos
                </Button>
              </div>
            </div>
          </section>

          {/* MAIN WORKSTATION */}
          <div ref={workstationRef} className="animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="bg-transparent border-b rounded-none w-full justify-start h-auto p-0 mb-8 gap-8 overflow-x-auto no-scrollbar">
                {["analyze", "protect", "history", "datasets"].map((tab) => (
                  <TabsTrigger 
                    key={tab}
                    value={tab} 
                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-4 font-black uppercase text-xs tracking-[0.2em] transition-all opacity-50 data-[state=active]:opacity-100"
                  >
                    {tab === "analyze" && <Zap className="w-3.5 h-3.5 mr-2" />}
                    {tab === "protect" && <ShieldCheck className="w-3.5 h-3.5 mr-2" />}
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
                      <Card className="bg-muted/30 border-2 border-dashed p-6 rounded-[2rem] space-y-4 hover:border-primary/40 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/10 rounded-xl">
                            <Brain className="w-5 h-5 text-primary" />
                          </div>
                          <h4 className="font-black uppercase text-xs tracking-widest">Singularity Engine</h4>
                        </div>
                        <ul className="space-y-3">
                          {[
                            "Biometric Pulse (rPPG) Extraction",
                            "Neural Origin Traceback Mapping",
                            "Spectral Noise Floor Fingerprinting",
                            "Adversarial Takedown Generation"
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

      <footer className="border-t py-12 bg-card/30 mt-auto">
        <div className="container mx-auto max-w-7xl px-4 flex flex-col md:flex-row items-center justify-between gap-8">
          <DeepScanLogo />
          <div className="flex gap-12 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            <a href="#" className="hover:text-primary transition-colors">Forensic Standards</a>
            <a href="#" className="hover:text-primary transition-colors">Privacy manifest</a>
            <a href="#" className="hover:text-primary transition-colors">Immune Protocol</a>
          </div>
          <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-40">
            V2.5.0 Elite Forensic Engine
          </div>
        </div>
      </footer>
    </div>
  )
}
