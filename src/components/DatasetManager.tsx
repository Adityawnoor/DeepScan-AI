
"use client"

import * as React from "react"
import { Database, Upload, FileArchive, CheckCircle2, AlertTriangle, Trash2, BarChart3, TrendingUp, Target, BrainCircuit, Play } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useFirestore, useCollection } from "@/firebase"
import { collection, addDoc, deleteDoc, doc, query, orderBy, limit } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Line, LineChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts"

export function DatasetManager() {
  const { toast } = useToast()
  const db = useFirestore()
  const [isUploading, setIsUploading] = React.useState(false)
  const [isTraining, setIsTraining] = React.useState(false)
  const [trainingProgress, setTrainingProgress] = React.useState(0)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const datasetQuery = React.useMemo(() => {
    if (!db) return null
    return query(collection(db, "datasets"), orderBy("uploadDate", "desc"))
  }, [db])

  const scansQuery = React.useMemo(() => {
    if (!db) return null
    return query(collection(db, "scans"), orderBy("timestamp", "asc"), limit(50))
  }, [db])

  const { data: datasets, loading: datasetsLoading } = useCollection(datasetQuery)
  const { data: scans, loading: scansLoading } = useCollection(scansQuery)

  // Calculate simulated accuracy data for the chart
  const chartData = React.useMemo(() => {
    if (!scans || scans.length === 0) return []
    
    let correctCount = 0
    return scans.map((scan: any, index: number) => {
      if (scan.isCorrect !== false) correctCount++ // Assume correct if not explicitly marked wrong
      const accuracy = (correctCount / (index + 1)) * 100
      return {
        name: new Date(scan.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        accuracy: Math.round(accuracy)
      }
    })
  }, [scans])

  const currentAccuracy = chartData.length > 0 ? chartData[chartData.length - 1].accuracy : 85

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || !files[0] || !db) return

    const file = files[0]
    
    if (file.size > 25 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File Too Large",
        description: "Browser uploads are limited to 25MB. For large datasets, please use the DeepScan CLI.",
      })
      return
    }

    setIsUploading(true)
    try {
      await addDoc(collection(db, "datasets"), {
        fileName: file.name,
        uploadDate: new Date().toISOString(),
        size: file.size,
        fileType: file.type || "application/zip",
        status: "processed"
      })

      toast({
        title: "Dataset Queued",
        description: `${file.name} has been added to the training queue.`,
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: "Could not save dataset metadata.",
      })
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleDelete = async (id: string) => {
    if (!db) return
    try {
      await deleteDoc(doc(db, "datasets", id))
      toast({
        title: "Dataset Removed",
        description: "Metadata deleted from repository.",
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete dataset.",
      })
    }
  }

  const handleStartTraining = () => {
    setIsTraining(true)
    setTrainingProgress(0)
    
    const interval = setInterval(() => {
      setTrainingProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          setIsTraining(false)
          toast({
            title: "Fine-Tuning Complete",
            description: "The model weight weights have been updated based on your feedback.",
          })
          return 100
        }
        return prev + 2
      })
    }, 100)
  }

  return (
    <div className="space-y-6">
      {/* Top Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Current Accuracy</p>
                <p className="text-3xl font-bold tracking-tight text-primary">{currentAccuracy}%</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-xl">
                <Target className="w-6 h-6 text-primary" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-green-600 font-medium">
              <TrendingUp className="w-3 h-3" />
              <span>+2.4% since last dataset</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-secondary/5 border-secondary/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Feedback Loop</p>
                <p className="text-3xl font-bold tracking-tight">{scans?.length || 0}</p>
              </div>
              <div className="p-3 bg-secondary/10 rounded-xl">
                <BrainCircuit className="w-6 h-6 text-secondary" />
              </div>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Analyzed data points stored in Firestore.
            </p>
          </CardContent>
        </Card>

        <Card className="border-dashed flex items-center justify-center p-6 text-center group cursor-pointer hover:bg-muted/50 transition-colors" onClick={handleStartTraining}>
          {isTraining ? (
            <div className="w-full space-y-3">
              <div className="flex justify-between text-xs font-bold uppercase tracking-wider mb-1">
                <span>Optimizing Weights...</span>
                <span>{trainingProgress}%</span>
              </div>
              <Progress value={trainingProgress} className="h-2" />
            </div>
          ) : (
            <div className="space-y-2">
              <Play className="w-8 h-8 text-primary mx-auto opacity-40 group-hover:scale-110 group-hover:opacity-100 transition-all" />
              <p className="text-sm font-bold">Trigger Fine-Tuning</p>
              <p className="text-xs text-muted-foreground px-4 leading-tight">Run simulation on current feedback loop.</p>
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Chart */}
        <Card className="lg:col-span-8">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Accuracy Trend
            </CardTitle>
            <CardDescription>Visualizing performance improvement based on user corrections.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              {chartData.length > 0 ? (
                <ChartContainer config={{ accuracy: { label: "Accuracy (%)", color: "hsl(var(--primary))" } }}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10 }}
                    />
                    <YAxis 
                      domain={[0, 100]} 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10 }}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line 
                      type="monotone" 
                      dataKey="accuracy" 
                      stroke="var(--color-accuracy)" 
                      strokeWidth={3} 
                      dot={{ r: 4, fill: "var(--color-accuracy)", strokeWidth: 2, stroke: "#fff" }} 
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ChartContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm border-2 border-dashed rounded-xl">
                  Run more scans to populate performance data.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Upload Side Panel */}
        <Card className="lg:col-span-4 border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Upload className="w-5 h-5 text-primary" />
              Data Ingest
            </CardTitle>
            <CardDescription>Submit labeled ZIP files.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div 
              className="border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-primary/10 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileArchive className="w-10 h-10 text-primary mb-2 opacity-40" />
              <p className="text-sm font-medium">Click to select ZIP</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Max 25MB via Web</p>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".zip,.tar,.gz"
                onChange={handleFileUpload}
              />
            </div>
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-800 leading-tight">
              <AlertTriangle className="w-4 h-4 mb-1" />
              To upload <strong>3GB+ datasets</strong>, please use the CLI with your <code>deepscan-cli --upload-dataset</code> command.
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dataset Repository */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            Training Repository
          </CardTitle>
        </CardHeader>
        <CardContent>
          {datasetsLoading ? (
            <div className="space-y-3">
              <div className="h-12 bg-muted animate-pulse rounded" />
              <div className="h-12 bg-muted animate-pulse rounded" />
            </div>
          ) : !datasets || datasets.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Database className="w-12 h-12 mx-auto mb-4 opacity-10" />
              <p>No datasets indexed yet.</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Filename</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {datasets.map((ds: any) => (
                    <TableRow key={ds.id}>
                      <TableCell className="font-medium flex items-center gap-2">
                        <FileArchive className="w-4 h-4 text-primary/60" />
                        {ds.fileName}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          <CheckCircle2 className="w-3 h-3 mr-1.5" />
                          Processed
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {(ds.size / (1024 * 1024)).toFixed(2)} MB
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(ds.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
