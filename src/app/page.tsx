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
import { ShieldCheck, History, Info, Zap, Database, Sparkles, Monitor, HardDrive, DownloadCloud, FileJson, Lock, Folder, ExternalLink, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { useFirestore } from "@/firebase"
import { collection, getDocs } from "firebase/firestore"

export default function DeepScanHome() {
  const { toast } = useToast()
  const db = useFirestore()
  const [isAnalyzing, setIsAnalyzing] = React.useState(false)
  const [currentResult, setCurrentResult] = React.useState<{ id: string, output: any, mediaUrl: string, mediaType: 'image' | 'audio' | 'video' } | null>(null)
  const [history, setHistory] = React.useState<HistoryItem[]>([])
  const [activeTab, setActiveTab] = React.useState("analyze")
  const [isLearning, setIsLearning] = React.useState(false)

  // Private PC Database State
  const [localDatasets, setLocalDatasets] = React.useState<any[]>([])
  const [localScans, setLocalScans] = React.useState<any[]>([])
  const [isMigrating, setIsMigrating] = React.useState(false)
  const [connectedFolderName, setConnectedFolderName] = React.useState<string | null>(null)

  // Initialize from LocalStorage (Secondary backup)
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

  const knowledgeCount = localDatasets.length + localScans.filter(s => s.userComment).length

  const transferFromCloud = async () => {
    if (!db) return
    setIsMigrating(true)
    try {
      toast({ title: "Connecting to Cloud...", description: "Pulling data for local migration." })
      
      const scansSnap = await getDocs(collection(db, "scans"))
      const datasetsSnap = await getDocs(collection(db, "datasets"))

      const cloudScans = scansSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      const cloudDatasets = datasetsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))

      // Merge with local
      const mergedScans = [...cloudScans, ...localScans]
      const mergedDatasets = [...cloudDatasets, ...localDatasets]

      setLocalScans(mergedScans)
      setLocalDatasets(mergedDatasets)
      
      localStorage.setItem("deepscan-scans-metadata", JSON.stringify(mergedScans))
      localStorage.setItem("deepscan-datasets", JSON.stringify(mergedDatasets))

      toast({
        title: "Migration Successful",
        description: `${cloudScans.length + cloudDatasets.length} items moved from Cloud to PC.`,
      })
    } catch (e) {
      console.error(e)
      toast({ variant: "destructive", title: "Migration Failed", description: "Check cloud permissions." })
    } finally {
      setIsMigrating(false)
    }
  }

  const handleClearHistory = () => {
    setHistory([])
    setLocalScans([])
    localStorage.removeItem("deepscan-history")
    localStorage.removeItem("deepscan-scans-metadata")
    toast({
      title: "Private Database Cleared",
      description: "All local forensic records have been removed.",
    })
  }

  const getLearnedKnowledge = async () => {
    setIsLearning(true)
    try {
      let context = "Below are notes from your private PC Knowledge Base:\n"
      localDatasets.slice(0, 15).forEach(ds => {
        if (ds.notes) {
          context += `- Dataset [${ds.label.toUpperCase()}]: ${ds.notes}\n`
        }
      })

      const corrections = localScans.filter(s => s.userComment).slice(0, 10)
      if (corrections.length > 0) {
        context += "\nUser Insights from History:\n"
        corrections.forEach(s => {
          context += `- Observed Artifact: ${s.userComment}\n`
        })
      }

      return context
    } catch (e) {
      console.error("Knowledge retrieval error", e)
      return ""
    } finally {
      await new Promise(r => setTimeout(r, 600))
      setIsLearning(false)
    }
  }

  const runAnalysis = async (dataUri: string) => {
    setIsAnalyzing(true)
    try {
      const learnedContext = await getLearnedKnowledge()
      
      let output: any
      let mediaType: 'image' | 'audio' | 'video' = 'image'

      if (dataUri.startsWith('data:image/')) {
        mediaType = 'image'
        output = await analyzeImageForDeepfake({ imageDataUri: dataUri, learnedContext })
      } else if (dataUri.startsWith('data:audio/')) {
        mediaType = 'audio'
        output = await analyzeAudioForDeepfake({ audioDataUri: dataUri, learnedContext })
      } else if (dataUri.startsWith('data:video/')) {
        mediaType = 'video'
        output = await analyzeVideoForDeepfake({ videoDataUri: dataUri, learnedContext })
      } else {
        throw new Error("Unsupported media type")
      }
      
      const scanId = crypto.randomUUID()
      setCurrentResult({ id: scanId, output, mediaUrl: dataUri, mediaType })
      
      const newScanMetadata = {
        id: scanId,
        timestamp: new Date().toISOString(),
        mediaType,
        aiVerdict: output.isDeepfake,
        aiConfidence: output.confidence,
        explanation: output.explanation,
        mediaUrl: "Stored Locally"
      }

      const updatedScans = [newScanMetadata, ...localScans]
      setLocalScans(updatedScans)
      localStorage.setItem("deepscan-scans-metadata", JSON.stringify(updatedScans))

      const newHistoryItem: HistoryItem = {
        id: scanId,
        timestamp: new Date().toISOString(),
        fileName: "Private_Scan_" + new Date().getTime(),
        isDeepfake: output.isDeepfake,
        confidence: output.confidence,
        type: mediaType
      }
      
      const updatedHistory = [newHistoryItem, ...history]
      setHistory(updatedHistory)
      localStorage.setItem("deepscan-history", JSON.stringify(updatedHistory))

      toast({
        title: "Private Analysis Complete",
        description: output.isDeepfake ? "Potential manipulation detected." : "Media appears authentic.",
      })
    } catch (error: any) {
      console.error("Analysis Error:", error)
      toast({
        variant: "destructive",
        title: "Analysis Failed",
        description: "Verify internet connection for AI processing.",
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-card/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto max-w-7xl px-4 h-16 flex items-center justify-between">
          <DeepScanLogo />
          
          <div className="flex items-center gap-4">
            <div className={cn(
              "hidden sm:flex items-center gap-2 px-3 py-1 rounded-full border transition-all",
              connectedFolderName 
                ? "bg-primary/5 border-primary/10" 
                : "bg-destructive/5 border-destructive/20 animate-pulse"
            )}>
              {connectedFolderName ? <Lock className="w-4 h-4 text-primary" /> : <ShieldCheck className="w-4 h-4 text-destructive" />}
              <span className={cn("text-xs font-bold", connectedFolderName ? "text-primary" : "text-destructive")}>
                {connectedFolderName ? `PC Vault: ${connectedFolderName}` : "Unsecured PC Mode"}
              </span>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-col gap-8">
          
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-8 bg-primary/5 rounded-2xl border border-primary/10 overflow-hidden relative">
            <div className="flex-1 space-y-3 relative z-10">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
                <Sparkles className={cn("w-3.5 h-3.5", isLearning && "animate-spin")} />
                {isLearning ? "Accessing PC Memory..." : "Local Intelligence Active"}
              </div>
              <h1 className="text-3xl md:text-4xl font-headline font-extrabold tracking-tight">
                Forensic <span className="text-primary">Privacy</span> Mode
              </h1>
              <div className="text-muted-foreground text-lg max-w-2xl leading-relaxed">
                <p>Your AI uses <strong>{knowledgeCount} private lessons</strong> stored locally on your hard drive.</p>
                {connectedFolderName ? (
                  <span className="block mt-2 font-semibold text-primary">
                    <Folder className="inline w-4 h-4 mr-1 text-primary" /> 
                    Actively saving to folder: <span className="underline decoration-primary/30">"{connectedFolderName}"</span>
                  </span>
                ) : (
                  <div className="mt-4 p-4 rounded-xl bg-destructive/10 border border-destructive/20 space-y-3">
                    <p className="text-destructive font-bold flex items-center gap-2">
                      <Lock className="w-5 h-5" /> 
                      ACTION REQUIRED: Your Database is Temporary
                    </p>
                    <p className="text-sm text-destructive/80 leading-snug">
                      Data is currently only saved in your browser's temporary cache. To make it permanent and safe on your hard drive, you must link a folder.
                    </p>
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={() => setActiveTab("datasets")}
                      className="font-bold shadow-lg"
                    >
                      Link a PC Folder Now <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-3">
               <Button variant="outline" size="sm" onClick={transferFromCloud} disabled={isMigrating} className="bg-background">
                  {isMigrating ? <Sparkles className="w-4 h-4 mr-2 animate-spin" /> : <DownloadCloud className="w-4 h-4 mr-2" />}
                  Drain Data from Cloud
               </Button>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex items-center justify-between mb-4 border-b pb-1">
              <TabsList className="bg-transparent h-auto p-0 gap-8">
                <TabsTrigger 
                  value="analyze" 
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3 font-bold text-base transition-all"
                >
                  <ShieldCheck className="w-4 h-4 mr-2" />
                  Analyze
                </TabsTrigger>
                <TabsTrigger 
                  value="history" 
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3 font-bold text-base transition-all"
                >
                  <History className="w-4 h-4 mr-2" />
                  PC History
                  {history.length > 0 && (
                    <span className="ml-2 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px]">
                      {history.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger 
                  value="datasets" 
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3 font-bold text-base transition-all"
                >
                  <Database className="w-4 h-4 mr-2" />
                  PC Database
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="analyze" className="mt-6 space-y-12">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className={cn(
                  "transition-all duration-500",
                  currentResult ? "lg:col-span-4" : "lg:col-span-12"
                )}>
                  <MediaUpload onUpload={runAnalysis} isAnalyzing={isAnalyzing} />
                  
                  <div className="mt-6 p-4 rounded-xl bg-muted/50 border flex gap-3 text-sm text-muted-foreground">
                    <HardDrive className="w-5 h-5 text-primary shrink-0" />
                    <div>
                      <p className="font-bold text-primary mb-1">Your Database Location:</p>
                      <div className="space-y-2">
                        {connectedFolderName ? (
                          <p>Your data is synced to: <strong>{connectedFolderName}/deepscan-private-metadata.json</strong>. Open this folder in your computer's file explorer to see the file.</p>
                        ) : (
                          <div className="flex flex-col gap-2">
                             <p>No folder linked. Metadata is currently saved only in your browser's private cache. Link a folder in the "PC Database" tab to save it to your hard drive.</p>
                             <Button variant="link" onClick={() => setActiveTab("datasets")} className="p-0 h-auto text-primary font-bold justify-start">
                               Go to PC Database <ArrowRight className="w-4 h-4 ml-1" />
                             </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {currentResult && (
                  <div className="lg:col-span-8 animate-in fade-in slide-in-from-right-4 duration-500">
                    <AnalysisResult 
                      scanId={currentResult.id}
                      result={currentResult.output} 
                      mediaUrl={currentResult.mediaUrl} 
                      mediaType={currentResult.mediaType}
                      onUpdate={() => {
                        const savedDatasets = localStorage.getItem("deepscan-datasets")
                        const savedScans = localStorage.getItem("deepscan-scans-metadata")
                        if (savedDatasets) setLocalDatasets(JSON.parse(savedDatasets))
                        if (savedScans) setLocalScans(JSON.parse(savedScans))
                      }}
                    />
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="history" className="mt-6">
              <DetectionHistory 
                items={history} 
                onClear={handleClearHistory}
                onSelectItem={(id) => {
                  toast({
                    title: "Accessing PC Storage",
                    description: "Loading private metadata...",
                  })
                }}
              />
            </TabsContent>

            <TabsContent value="datasets" className="mt-6">
              <DatasetManager 
                knowledgeCount={knowledgeCount} 
                onRefresh={(folderName) => {
                   const savedDatasets = localStorage.getItem("deepscan-datasets")
                   if (savedDatasets) setLocalDatasets(JSON.parse(savedDatasets))
                   if (folderName) setConnectedFolderName(folderName)
                }}
              />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <footer className="border-t bg-card mt-auto">
        <div className="container mx-auto max-w-7xl px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 opacity-60">
              <ShieldCheck className="w-5 h-5" />
              <span className="text-sm font-medium">DeepScan Private PC Mode © {new Date().getFullYear()}</span>
            </div>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-primary">How PC Databases Work</a>
              <a href="#" className="hover:text-primary">Privacy Policy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
