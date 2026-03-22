
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
import { useToast } from "@/hooks/use-toast"
import { ShieldCheck, History, Info, Zap, Database } from "lucide-react"
import { cn } from "@/lib/utils"
import { doc, setDoc } from "firebase/firestore"
import { useFirestore, errorEmitter, FirestorePermissionError } from "@/firebase"

export default function DeepScanHome() {
  const { toast } = useToast()
  const db = useFirestore()
  const [isAnalyzing, setIsAnalyzing] = React.useState(false)
  const [currentResult, setCurrentResult] = React.useState<{ id: string, output: any, mediaUrl: string, mediaType: 'image' | 'audio' | 'video' } | null>(null)
  const [history, setHistory] = React.useState<HistoryItem[]>([])
  const [activeTab, setActiveTab] = React.useState("analyze")

  React.useEffect(() => {
    const saved = localStorage.getItem("deepscan-history")
    if (saved) {
      try {
        setHistory(JSON.parse(saved))
      } catch (e) {
        console.error("Failed to load history")
      }
    }
  }, [])

  const handleClearHistory = () => {
    setHistory([])
    localStorage.removeItem("deepscan-history")
    toast({
      title: "History Cleared",
      description: "Your session history has been removed.",
    })
  }

  const runAnalysis = async (dataUri: string) => {
    setIsAnalyzing(true)
    try {
      let output: any
      let mediaType: 'image' | 'audio' | 'video' = 'image'

      if (dataUri.startsWith('data:image/')) {
        mediaType = 'image'
        output = await analyzeImageForDeepfake({ imageDataUri: dataUri })
      } else if (dataUri.startsWith('data:audio/')) {
        mediaType = 'audio'
        output = await analyzeAudioForDeepfake({ audioDataUri: dataUri })
      } else if (dataUri.startsWith('data:video/')) {
        mediaType = 'video'
        output = await analyzeVideoForDeepfake({ videoDataUri: dataUri })
      } else {
        throw new Error("Unsupported media type")
      }
      
      const scanId = crypto.randomUUID()
      setCurrentResult({ id: scanId, output, mediaUrl: dataUri, mediaType })
      
      if (db) {
        const scanRef = doc(db, "scans", scanId);
        const scanData = {
          timestamp: new Date().toISOString(),
          mediaType,
          aiVerdict: output.isDeepfake,
          aiConfidence: output.confidence,
          explanation: output.explanation,
          mediaUrl: dataUri.length < 100000 ? dataUri : "Omitted (Too Large)"
        };

        setDoc(scanRef, scanData)
          .catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({
              path: scanRef.path,
              operation: 'create',
              requestResourceData: scanData,
            });
            errorEmitter.emit('permission-error', permissionError);
          });
      }

      const newHistoryItem: HistoryItem = {
        id: scanId,
        timestamp: new Date().toISOString(),
        fileName: "DeepScan_" + mediaType.toUpperCase() + "_" + new Date().getTime(),
        isDeepfake: output.isDeepfake,
        confidence: output.confidence,
        type: mediaType
      }
      
      const updatedHistory = [newHistoryItem, ...history]
      setHistory(updatedHistory)
      localStorage.setItem("deepscan-history", JSON.stringify(updatedHistory))

      toast({
        title: "Analysis Complete",
        description: output.isDeepfake ? "Potential manipulation detected." : "Media appears to be authentic.",
      })
    } catch (error: any) {
      const errorMessage = String(error?.message || error || "")
      const isQuotaError = 
        errorMessage.includes("429") || 
        errorMessage.includes("quota") || 
        errorMessage.includes("RESOURCE_EXHAUSTED") ||
        errorMessage.includes("Too Many Requests")
      
      if (isQuotaError) {
        toast({
          variant: "destructive",
          title: "Service Busy",
          description: "The AI service has reached its temporary limit. Please try again in about 30-60 seconds.",
        })
      } else {
        console.error("Analysis Error:", error)
        toast({
          variant: "destructive",
          title: "Analysis Failed",
          description: "There was an error processing the media. Please try again.",
        })
      }
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
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium mr-6">
              <a href="#" className="text-primary hover:text-primary/80">Detection</a>
              <a href="#" className="text-muted-foreground hover:text-primary">Enterprise</a>
              <a href="#" className="text-muted-foreground hover:text-primary">API</a>
            </nav>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-col gap-8">
          
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-8 bg-primary/5 rounded-2xl border border-primary/10 overflow-hidden relative">
            <div className="flex-1 space-y-3 relative z-10">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
                <Zap className="w-3.5 h-3.5" />
                Multi-Modal Detection
              </div>
              <h1 className="text-3xl md:text-4xl font-headline font-extrabold tracking-tight">
                Detect <span className="text-primary">Deepfakes</span> across all Media
              </h1>
              <p className="text-muted-foreground text-lg max-w-2xl leading-relaxed">
                Advanced neural analysis for Images, Audio, and Video. Verify authenticity with industry-leading precision.
              </p>
            </div>
            <div className="hidden lg:block absolute -right-20 -top-20 opacity-10 rotate-12 scale-150">
               <ShieldCheck className="w-64 h-64 text-primary" />
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
                  History
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
                  Datasets
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
                    <Info className="w-5 h-5 text-primary shrink-0" />
                    <p>
                      Files are processed securely. We support JPG, PNG, MP3, MP4, and WAV formats up to 2.5GB.
                    </p>
                  </div>
                </div>

                {currentResult && (
                  <div className="lg:col-span-8 animate-in fade-in slide-in-from-right-4 duration-500">
                    <AnalysisResult 
                      scanId={currentResult.id}
                      result={currentResult.output} 
                      mediaUrl={currentResult.mediaUrl} 
                      mediaType={currentResult.mediaType}
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
                    title: "Historical View",
                    description: "Loading analysis metadata...",
                  })
                }}
              />
            </TabsContent>

            <TabsContent value="datasets" className="mt-6">
              <DatasetManager />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <footer className="border-t bg-card mt-auto">
        <div className="container mx-auto max-w-7xl px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 opacity-60">
              <ShieldCheck className="w-5 h-5" />
              <span className="text-sm font-medium">DeepScan AI © {new Date().getFullYear()}</span>
            </div>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-primary">Terms</a>
              <a href="#" className="hover:text-primary">Privacy</a>
              <a href="#" className="hover:text-primary">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
