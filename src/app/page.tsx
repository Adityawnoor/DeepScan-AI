"use client"

import * as React from "react"
import { analyzeImageForDeepfake, type AnalyzeImageForDeepfakeOutput } from "@/ai/flows/analyze-image-for-deepfake"
import { DeepScanLogo } from "@/components/DeepScanLogo"
import { ThemeToggle } from "@/components/ThemeToggle"
import { MediaUpload } from "@/components/MediaUpload"
import { AnalysisResult } from "@/components/AnalysisResult"
import { DetectionHistory, type HistoryItem } from "@/components/DetectionHistory"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { ShieldCheck, History, Info, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"

export default function DeepScanHome() {
  const { toast } = useToast()
  const [isAnalyzing, setIsAnalyzing] = React.useState(false)
  const [currentResult, setCurrentResult] = React.useState<{ output: AnalyzeImageForDeepfakeOutput, imageUrl: string } | null>(null)
  const [history, setHistory] = React.useState<HistoryItem[]>([])
  const [activeTab, setActiveTab] = React.useState("analyze")

  React.useEffect(() => {
    // Mock loading history from a database
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
      const output = await analyzeImageForDeepfake({ imageDataUri: dataUri })
      
      setCurrentResult({ output, imageUrl: dataUri })
      
      // Add to history
      const newHistoryItem: HistoryItem = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        fileName: "DeepScan_" + new Date().getTime() + ".png",
        isDeepfake: output.isDeepfake,
        confidence: output.confidence
      }
      
      const updatedHistory = [newHistoryItem, ...history]
      setHistory(updatedHistory)
      localStorage.setItem("deepscan-history", JSON.stringify(updatedHistory))

      toast({
        title: "Analysis Complete",
        description: output.isDeepfake ? "Potential manipulation detected." : "Image appears to be authentic.",
      })
    } catch (error) {
      console.error(error)
      toast({
        variant: "destructive",
        title: "Analysis Failed",
        description: "There was an error processing the image. Please try again.",
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
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

      {/* Main Content */}
      <main className="flex-1 container mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-col gap-8">
          
          {/* Welcome Section */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-8 bg-primary/5 rounded-2xl border border-primary/10 overflow-hidden relative">
            <div className="flex-1 space-y-3 relative z-10">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5" />
                Live AI Protection
              </div>
              <h1 className="text-3xl md:text-4xl font-headline font-extrabold tracking-tight">
                Detect Manipulated Media with <span className="text-primary">Extreme Precision</span>
              </h1>
              <p className="text-muted-foreground text-lg max-w-2xl leading-relaxed">
                Our advanced neural networks analyze textures, lighting, and digital artifacts to identify deepfakes in seconds. Upload your media to verify its authenticity.
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
              </TabsList>
            </div>

            <TabsContent value="analyze" className="mt-6 space-y-12">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Upload Section - Takes more space when no results */}
                <div className={cn(
                  "transition-all duration-500",
                  currentResult ? "lg:col-span-4" : "lg:col-span-12"
                )}>
                  <MediaUpload onUpload={runAnalysis} isAnalyzing={isAnalyzing} />
                  
                  <div className="mt-6 p-4 rounded-xl bg-muted/50 border flex gap-3 text-sm text-muted-foreground">
                    <Info className="w-5 h-5 text-primary shrink-0" />
                    <p>
                      Files are processed securely. Your privacy is our priority. 
                      <a href="#" className="ml-1 text-primary inline-flex items-center hover:underline">
                        Privacy Policy <ExternalLink className="w-3 h-3 ml-0.5" />
                      </a>
                    </p>
                  </div>
                </div>

                {/* Results Section */}
                {currentResult && (
                  <div className="lg:col-span-8 animate-in fade-in slide-in-from-right-4 duration-500">
                    <AnalysisResult result={currentResult.output} imageUrl={currentResult.imageUrl} />
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
                    title: "Detail View",
                    description: "Loading historical analysis details...",
                  })
                }}
              />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-card mt-auto">
        <div className="container mx-auto max-w-7xl px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 opacity-60">
              <ShieldCheck className="w-5 h-5" />
              <span className="text-sm font-medium">DeepScan AI © {new Date().getFullYear()}</span>
            </div>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-primary">Terms of Service</a>
              <a href="#" className="hover:text-primary">Privacy Policy</a>
              <a href="#" className="hover:text-primary">Security</a>
              <a href="#" className="hover:text-primary">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
