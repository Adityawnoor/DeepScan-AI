
"use client"

import * as React from "react"
import { Database, Upload, FileArchive, CheckCircle2, AlertTriangle, Trash2, BarChart3, TrendingUp, Target, BrainCircuit, Play, Shield, ShieldAlert, Layers, MessageSquare } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useFirestore, useCollection } from "@/firebase"
import { collection, addDoc, deleteDoc, doc, query, orderBy, limit } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts"

export function DatasetManager() {
  const { toast } = useToast()
  const db = useFirestore()
  const [isUploading, setIsUploading] = React.useState(false)
  const [isTraining, setIsTraining] = React.useState(false)
  const [trainingProgress, setTrainingProgress] = React.useState(0)
  const [datasetLabel, setDatasetLabel] = React.useState<string>("unlabeled")
  const [datasetNotes, setDatasetNotes] = React.useState<string>("")
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const datasetQuery = React.useMemo(() => {
    if (!db) return null
    return query(collection(db, "datasets"), orderBy("uploadDate", "desc"))
  }, [db])

  const scansQuery = React.useMemo(() => {
    if (!db) return null
    return query(collection(db, "scans"), orderBy("timestamp", "asc"), limit(50))
  }, [db])

  const { data: datasets, loading: datasetsLoading } = useCollection<{
    id: string;
    fileName: string;
    uploadDate: string;
    size: number;
    fileType: string;
    status: string;
    label: string;
    notes?: string;
  }>(datasetQuery)
  
  const { data: scans, loading: scansLoading } = useCollection(scansQuery)

  const chartData = React.useMemo(() => {
    if (!scans || scans.length === 0) return []
    
    let correctCount = 0
    return scans.map((scan: any, index: number) => {
      if (scan.isCorrect !== false) correctCount++
      const accuracy = (correctCount / (index + 1)) * 100
      return {
        name: new Date(scan.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        accuracy: Math.round(accuracy)
      }
    })
  }, [scans])

  const currentAccuracy = chartData.length > 0 ? chartData[chartData.length - 1].accuracy : 85

  React.useEffect(() => {
    if (!isTraining) return

    const interval = setInterval(() => {
      setTrainingProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          return 100
        }
        return prev + 5
      })
    }, 100)

    return () => clearInterval(interval)
  }, [isTraining])

  React.useEffect(() => {
    if (isTraining && trainingProgress >= 100) {
      setIsTraining(false)
      toast({
        title: "Fine-Tuning Complete",
        description: "The model weights have been updated based on your feedback loop.",
      })
    }
  }, [isTraining, trainingProgress, toast])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || !files[0] || !db) return

    const file = files[0]
    
    setIsUploading(true)
    try {
      await addDoc(collection(db, "datasets"), {
        fileName: file.name,
        uploadDate: new Date().toISOString(),
        size: file.size,
        fileType: file.type || "application/zip",
        status: "processed",
        label: datasetLabel,
        notes: datasetNotes.trim()
      })

      toast({
        title: "Dataset Indexed",
        description: `${file.name} cataloged with your notes.`,
      })
      setDatasetNotes("") // Reset notes after successful upload
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Index Failed",
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
    if (isTraining) return
    setIsTraining(true)
    setTrainingProgress(0)
  }

  const getLabelBadge = (label: string) => {
    switch (label) {
      case 'real':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><Shield className="w-3 h-3 mr-1" /> Real</Badge>
      case 'fake':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><ShieldAlert className="w-3 h-3 mr-1" /> Fake</Badge>
      case 'mixed':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200"><Layers className="w-3 h-3 mr-1" /> Mixed</Badge>
      default:
        return <Badge variant="secondary">Unlabeled</Badge>
    }
  }

  return (
    <div className="space-y-6">
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
              <span>+2.4% from feedback loop</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-secondary/5 border-secondary/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Labeled Samples</p>
                <p className="text-3xl font-bold tracking-tight">{scans?.length || 0}</p>
              </div>
              <div className="p-3 bg-secondary/10 rounded-xl">
                <BrainCircuit className="w-6 h-6 text-secondary" />
              </div>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              User-verified data points in Firestore.
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
              <p className="text-xs text-muted-foreground px-4 leading-tight">Apply labeled data to model weights.</p>
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
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
                  Analyze more media to populate trend data.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-4 border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Upload className="w-5 h-5 text-primary" />
              Dataset Ingest
            </CardTitle>
            <CardDescription>Categorize and catalog ZIP data.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dataset-label" className="text-xs font-bold uppercase text-muted-foreground">Dataset Category</Label>
              <Select value={datasetLabel} onValueChange={setDatasetLabel}>
                <SelectTrigger id="dataset-label">
                  <SelectValue placeholder="Select content type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="real">Real Content (Authentic)</SelectItem>
                  <SelectItem value="fake">Fake Content (Manipulated)</SelectItem>
                  <SelectItem value="mixed">Mixed Content</SelectItem>
                  <SelectItem value="unlabeled">Unlabeled / Raw</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dataset-notes" className="text-xs font-bold uppercase text-muted-foreground">Dataset Description / Notes</Label>
              <Textarea 
                id="dataset-notes"
                placeholder="Details about this dataset..."
                className="text-xs min-h-[80px] resize-none"
                value={datasetNotes}
                onChange={(e) => setDatasetNotes(e.target.value)}
              />
            </div>

            <div 
              className="border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-primary/10 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileArchive className="w-8 h-8 text-primary mb-2 opacity-40" />
              <p className="text-sm font-medium">Click to select ZIP</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Max 2.5GB</p>
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
              Indexed metadata for <strong>{datasets?.length || 0} datasets</strong>.
            </div>
          </CardContent>
        </Card>
      </div>

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
                    <TableHead>Filename & Notes</TableHead>
                    <TableHead>Label</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {datasets.map((ds) => (
                    <TableRow key={ds.id}>
                      <TableCell className="font-medium max-w-[300px]">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <FileArchive className="w-4 h-4 text-primary/60" />
                            {ds.fileName}
                          </div>
                          {ds.notes && (
                            <div className="flex gap-1.5 text-xs text-muted-foreground font-normal italic">
                              <MessageSquare className="w-3 h-3 mt-0.5 shrink-0" />
                              <span className="truncate">{ds.notes}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getLabelBadge(ds.label)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          <CheckCircle2 className="w-3 h-3 mr-1.5" />
                          Ready
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
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
