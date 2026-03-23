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
  ShieldAlert, Brain, Activity, Cpu, Layers,
  Sparkles, Clock, Shield
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

  const handleVaccinateIdentity = () => {
    setActiveTab("protect")
    workstationRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto max-w-7xl px-4 h-16 flex items-center justify-between">
          <DeepScanLogo />
          <div className="flex items-center gap-6">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto max-w-7xl px-4 py-12">
        <div className="flex flex-col gap-12">
          
          <section className="relative">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-12 p-12 bg-white dark:bg-card border border-primary/10 rounded-[2.5rem] shadow-xl">
              <div className="flex-1 space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider border border-primary/20">
                  <Brain className="w-3.5 h-3.5" />
                  ADVANCED NEURAL FORENSICS
                </div>
                <h1 className="text-3xl md:text-5xl font-black tracking-tighter leading-[1.1] text-[#1a1a1a] dark:text-white uppercase">
                  STOP THE <span className="text-primary italic">AI GHOST.</span>
                </h1>
                <p className="text-muted-foreground text-sm max-w-xl leading-relaxed font-medium">
                  DeepScan elite mode detects microscopic <span className="font-bold text-foreground">Spectral Noise Artifacts</span> and identifies the exact <span className="font-bold text-foreground">Neural DNA</span> of the generative model used.
                </p>
                <div className="flex gap-4 pt-4">
                  <div className="flex items-center gap-2 px-4 py-2 rounded-lg border border-primary/10 bg-primary/5 text-primary text-[10px] font-black uppercase tracking-widest">
                    <Zap className="w-3 h-3" />
                    {knowledgeCount} LESSONS LEARNED
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 rounded-lg border border-primary/10 bg-primary/5 text-primary text-[10px] font-black uppercase tracking-widest">
                    <Activity className="w-3 h-3" />
                    LATENT SPACE AUDIT ACTIVE
                  </div>
                </div>
              </div>

              <div className="w-full lg:w-auto flex flex-col gap-4">
                <Button 
                  variant="default" 
                  size="lg" 
                  className="h-16 px-10 rounded-2xl font-black uppercase tracking-widest shadow-xl bg-primary hover:bg-primary/90 text-white gap-3"
                  onClick={handleBeginInvestigation}
                >
                  <MicroscopeIcon className="w-5 h-5" />
                  BEGIN INVESTIGATION
                </Button>
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="h-16 px-10 rounded-2xl font-black uppercase tracking-widest border-2 border-primary/20 hover:border-primary text-primary gap-3 bg-white/50 backdrop-blur-sm"
                  onClick={handleVaccinateIdentity}
                >
                  <Zap className="w-5 h-5" />
                  VACCINATE IDENTITY
                </Button>
              </div>
            </div>
          </section>

          <div ref={workstationRef} className="space-y-8">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="bg-transparent h-auto p-0 mb-8 border-b rounded-none gap-8">
                <TabsTrigger 
                  value="analyze" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary font-bold uppercase text-[10px] tracking-widest px-0 pb-4 h-auto gap-2"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  ANALYZE
                </TabsTrigger>
                <TabsTrigger 
                  value="protect" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary font-bold uppercase text-[10px] tracking-widest px-0 pb-4 h-auto gap-2"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  PROTECT
                </TabsTrigger>
                <TabsTrigger 
                  value="history" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary font-bold uppercase text-[10px] tracking-widest px-0 pb-4 h-auto gap-2"
                >
                  <Clock className="w-3.5 h-3.5" />
                  HISTORY
                </TabsTrigger>
                <TabsTrigger 
                  value="datasets" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary font-bold uppercase text-[10px] tracking-widest px-0 pb-4 h-auto gap-2"
                >
                  <Database className="w-3.5 h-3.5" />
                  DATASETS
                </TabsTrigger>
              </TabsList>

              <TabsContent value="analyze" className="mt-0 focus-visible:ring-0">
                <div className="space-y-8">
                  <div className={cn(
                    "grid grid-cols-1 gap-8",
                    currentResult ? "lg:grid-cols-[450px_1fr]" : "grid-cols-1"
                  )}>
                    <div className="space-y-8">
                      <MediaUpload onUpload={runAnalysis} isAnalyzing={isAnalyzing} />
                      
                      <Card className="bg-primary/5 border border-dashed border-primary/20 p-8 rounded-[2rem] space-y-6">
                        <div className="flex items-center gap-4">
                          <div className="p-2.5 bg-primary/20 rounded-xl">
                            <Shield className="w-5 h-5 text-primary" />
                          </div>
                          <h4 className="font-black uppercase text-xs tracking-widest text-foreground">FORENSIC CAPABILITIES</h4>
                        </div>
                        <ul className="space-y-4">
                          {[
                            "GENERATIVE MODEL FINGERPRINTING",
                            "HIGH-FREQUENCY NOISE FLOOR ANALYSIS",
                            "TEMPORAL CONSISTENCY CHECKS",
                            "METADATA CHAIN-OF-CUSTODY"
                          ].map(item => (
                            <li key={item} className="flex items-center gap-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
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
                <DatasetManager 
                  knowledgeCount={knowledgeCount} 
                  onRefresh={(name, handle) => {
                    if (name) setConnectedFolderName(name);
                    if (handle) setLocalFolderHandle(handle);
                  }} 
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>

      <footer className="border-t py-12 mt-auto">
        <div className="container mx-auto max-w-7xl px-4 flex flex-col md:flex-row items-center justify-between gap-8">
          <DeepScanLogo />
          <div className="flex gap-8 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            <a href="#" className="hover:text-primary transition-colors">Forensic Standards</a>
            <a href="#" className="hover:text-primary transition-colors">Privacy</a>
            <a href="#" className="hover:text-primary transition-colors">Immune Protocol</a>
          </div>
          <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-30">
            V3.1.0 FORENSIC ENGINE
          </div>
        </div>
      </footer>
    </div>
  )
}
