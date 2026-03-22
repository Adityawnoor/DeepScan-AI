
"use client"

import * as React from "react"
import { Database, Upload, FileArchive, CheckCircle2, AlertTriangle, Trash2, BarChart3, TrendingUp, Target, BrainCircuit, Play, Shield, ShieldAlert, Layers, MessageSquare, Pencil, Save, X, FileCheck, HardDrive, FolderOpen, RefreshCcw, Info } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { cn } from "@/lib/utils"

interface DatasetManagerProps {
  knowledgeCount: number
  onRefresh: () => void
}

export function DatasetManager({ knowledgeCount, onRefresh }: DatasetManagerProps) {
  const { toast } = useToast()
  const [isUploading, setIsUploading] = React.useState(false)
  const [isTraining, setIsTraining] = React.useState(false)
  const [trainingProgress, setTrainingProgress] = React.useState(0)
  const [datasetLabel, setDatasetLabel] = React.useState<string>("unlabeled")
  const [datasetNotes, setDatasetNotes] = React.useState<string>("")
  const [editingDataset, setEditingDataset] = React.useState<{ id: string, notes: string } | null>(null)
  const [isUpdatingNotes, setIsUpdatingNotes] = React.useState(false)
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null)
  
  // Local PC Repository State
  const [localFolderHandle, setLocalFolderHandle] = React.useState<any>(null)
  const [localFiles, setLocalFiles] = React.useState<{ name: string, size: number, lastModified: number }[]>([])
  const [isScanningLocal, setIsScanningLocal] = React.useState(false)
  const [datasets, setDatasets] = React.useState<any[]>([])
  const [scans, setScans] = React.useState<any[]>([])

  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // Load from LocalStorage
  React.useEffect(() => {
    const savedDatasets = localStorage.getItem("deepscan-datasets")
    const savedScans = localStorage.getItem("deepscan-scans-metadata")
    if (savedDatasets) setDatasets(JSON.parse(savedDatasets))
    if (savedScans) setScans(JSON.parse(savedScans))
  }, [])

  const chartData = React.useMemo(() => {
    if (scans.length === 0) return []
    let correctCount = 0
    return scans.map((scan: any, index: number) => {
      if (scan.aiVerdict === scan.userFeedback) correctCount++
      const accuracy = (correctCount / (index + 1)) * 100
      return {
        name: new Date(scan.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        accuracy: Math.round(accuracy)
      }
    })
  }, [scans])

  const currentAccuracy = chartData.length > 0 ? chartData[chartData.length - 1].accuracy : 85

  const handleConnectLocalPC = async () => {
    try {
      if (!('showDirectoryPicker' in window)) {
        toast({
          variant: "destructive",
          title: "Browser Not Supported",
          description: "Use Chrome or Edge for the Local PC Database feature.",
        })
        return
      }

      const handle = await (window as any).showDirectoryPicker()
      setLocalFolderHandle(handle)
      scanLocalFolder(handle)
      
      toast({
        title: "PC Database Connected",
        description: `Treating '${handle.name}' as your private vault.`,
      })
    } catch (err: any) {
      if (err.name !== 'AbortError') console.error(err)
    }
  }

  const scanLocalFolder = async (handle: any) => {
    setIsScanningLocal(true)
    const files: any[] = []
    try {
      for await (const entry of handle.values()) {
        if (entry.kind === 'file' && entry.name.endsWith('.zip')) {
          const file = await entry.getFile()
          files.push({ name: entry.name, size: file.size, lastModified: file.lastModified })
        }
      }
      setLocalFiles(files)
    } finally {
      setIsScanningLocal(false)
    }
  }

  const handleIndexLocalFile = (fileName: string, size: number) => {
    const newDataset = {
      id: crypto.randomUUID(),
      fileName: fileName,
      uploadDate: new Date().toISOString(),
      size: size,
      fileType: "application/zip",
      status: "ready",
      label: datasetLabel,
      notes: datasetNotes.trim(),
      isLocal: true,
      localPath: localFolderHandle?.name + "/" + fileName
    }
    
    const updated = [newDataset, ...datasets]
    setDatasets(updated)
    localStorage.setItem("deepscan-datasets", JSON.stringify(updated))
    setDatasetNotes("")
    onRefresh()
    toast({ title: "Local File Indexed", description: "Metadata saved to your PC database." })
  }

  const handleDelete = (id: string) => {
    const updated = datasets.filter(ds => ds.id !== id)
    setDatasets(updated)
    localStorage.setItem("deepscan-datasets", JSON.stringify(updated))
    onRefresh()
    toast({ title: "Index Removed", description: "File reference deleted from local database." })
  }

  const handleUpdateNotes = () => {
    if (!editingDataset) return
    const updated = datasets.map(ds => 
      ds.id === editingDataset.id ? { ...ds, notes: editingDataset.notes.trim() } : ds
    )
    setDatasets(updated)
    localStorage.setItem("deepscan-datasets", JSON.stringify(updated))
    setEditingDataset(null)
    onRefresh()
    toast({ title: "Private Notes Updated" })
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Private Accuracy</p>
                <p className="text-3xl font-bold tracking-tight text-primary">{currentAccuracy}%</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-xl">
                <Target className="w-6 h-6 text-primary" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-green-600 font-medium">
              <TrendingUp className="w-3 h-3" />
              <span>Synced with PC History</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-secondary/5 border-secondary/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">PC Labeled Samples</p>
                <p className="text-3xl font-bold tracking-tight">{knowledgeCount}</p>
              </div>
              <div className="p-3 bg-secondary/10 rounded-xl">
                <BrainCircuit className="w-6 h-6 text-secondary" />
              </div>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Lessons stored exclusively on your PC.
            </p>
          </CardContent>
        </Card>

        <Card className="border-dashed flex items-center justify-center p-6 text-center group cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setIsTraining(true)}>
           {isTraining ? (
            <div className="w-full space-y-3">
              <Progress value={trainingProgress} className="h-2" />
              <p className="text-[10px] font-bold uppercase">Optimizing Local Weights...</p>
            </div>
          ) : (
            <div className="space-y-2">
              <Play className="w-8 h-8 text-primary mx-auto opacity-40 group-hover:opacity-100" />
              <p className="text-sm font-bold">Local Training</p>
              <p className="text-xs text-muted-foreground">Train AI on PC data.</p>
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-8">
          <CardHeader>
             <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                Accuracy Trend (Local)
              </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              {chartData.length > 0 ? (
                <ChartContainer config={{ accuracy: { label: "Accuracy (%)", color: "hsl(var(--primary))" } }}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="accuracy" stroke="var(--color-accuracy)" strokeWidth={3} dot={{ r: 4 }} />
                  </LineChart>
                </ChartContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm border-2 border-dashed rounded-xl">
                  Run private scans to see accuracy trends.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-4 border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-primary" />
              PC Database Ingest
            </CardTitle>
            <CardDescription>Catalog ZIPs from your hard drive.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Dataset Label</Label>
              <Select value={datasetLabel} onValueChange={setDatasetLabel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="real">Real Content</SelectItem>
                  <SelectItem value="fake">Fake Content</SelectItem>
                  <SelectItem value="mixed">Mixed Content</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Observations</Label>
              <Textarea 
                placeholder="What should the AI learn from this?"
                className="text-xs min-h-[80px]"
                value={datasetNotes}
                onChange={(e) => setDatasetNotes(e.target.value)}
              />
            </div>

            {!localFolderHandle ? (
              <Button variant="outline" className="w-full h-24 border-dashed" onClick={handleConnectLocalPC}>
                <div className="flex flex-col items-center gap-1">
                  <FolderOpen className="w-6 h-6 opacity-40" />
                  <span>Mount PC Folder</span>
                </div>
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-2 rounded bg-muted/50 text-[10px] font-mono">
                  <span className="truncate">Vault: {localFolderHandle.name}</span>
                  <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => scanLocalFolder(localFolderHandle)}>
                    <RefreshCcw className={cn("w-3 h-3", isScanningLocal && "animate-spin")} />
                  </Button>
                </div>
                <div className="max-h-[150px] overflow-y-auto border rounded-lg p-1 bg-muted/20">
                  {localFiles.map((file) => (
                    <div key={file.name} className="flex items-center justify-between p-1.5 rounded hover:bg-primary/5 group border border-transparent hover:border-primary/10">
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold truncate">{file.name}</p>
                        <p className="text-[9px] text-muted-foreground">{(file.size / (1024*1024)).toFixed(0)}MB</p>
                      </div>
                      <Button size="sm" variant="ghost" className="h-6 text-[9px]" onClick={() => handleIndexLocalFile(file.name, file.size)}>Index</Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Private Training Repository</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Filename</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Size</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {datasets.map((ds) => (
                <TableRow key={ds.id}>
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span className="flex items-center gap-1.5"><HardDrive className="w-3.5 h-3.5" /> {ds.fileName}</span>
                      <span className="text-[10px] italic opacity-60 truncate max-w-[200px]">{ds.notes}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">{ds.label.toUpperCase()}</Badge>
                  </TableCell>
                  <TableCell className="text-xs">{(ds.size / (1024*1024)).toFixed(1)}MB</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingDataset({ id: ds.id, notes: ds.notes || "" })}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(ds.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!editingDataset} onOpenChange={() => setEditingDataset(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit PC Note</DialogTitle></DialogHeader>
          <Textarea 
            className="min-h-[150px]"
            value={editingDataset?.notes}
            onChange={(e) => setEditingDataset(p => p ? {...p, notes: e.target.value} : null)}
          />
          <DialogFooter>
            <Button onClick={handleUpdateNotes}>Save to Local Database</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
