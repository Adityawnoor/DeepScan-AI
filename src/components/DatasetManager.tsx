
"use client"

import * as React from "react"
import { Database, Trash2, BarChart3, TrendingUp, Target, BrainCircuit, Pencil, HardDrive, FolderOpen, RefreshCcw, Info, Cloud, FileJson, Lock } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
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
  const [datasetLabel, setDatasetLabel] = React.useState<string>("unlabeled")
  const [datasetNotes, setDatasetNotes] = React.useState<string>("")
  const [editingDataset, setEditingDataset] = React.useState<{ id: string, notes: string } | null>(null)
  
  // PC Repository State
  const [localFolderHandle, setLocalFolderHandle] = React.useState<any>(null)
  const [localFiles, setLocalFiles] = React.useState<{ name: string, size: number, lastModified: number }[]>([])
  const [isScanningLocal, setIsScanningLocal] = React.useState(false)
  const [datasets, setDatasets] = React.useState<any[]>([])
  const [scans, setScans] = React.useState<any[]>([])

  // Load from Local PC Database (LocalStorage)
  React.useEffect(() => {
    const savedDatasets = localStorage.getItem("deepscan-datasets")
    const savedScans = localStorage.getItem("deepscan-scans-metadata")
    if (savedDatasets) setDatasets(JSON.parse(savedDatasets))
    if (savedScans) setScans(JSON.parse(savedScans))
  }, [])

  const syncToPCFile = async (data: any) => {
    if (!localFolderHandle) return
    try {
      const fileHandle = await localFolderHandle.getFileHandle('deepscan-private-metadata.json', { create: true })
      const writable = await fileHandle.createWritable()
      await writable.write(JSON.stringify(data, null, 2))
      await writable.close()
      toast({ title: "PC Sync Complete", description: "Memory saved to 'deepscan-private-metadata.json' on your hard drive." })
    } catch (err) {
      console.error("PC Write Error:", err)
      toast({ variant: "destructive", title: "PC Sync Failed", description: "Allow file write permissions." })
    }
  }

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
          description: "Use Chrome or Edge for the PC Database feature.",
        })
        return
      }

      const handle = await (window as any).showDirectoryPicker()
      setLocalFolderHandle(handle)
      scanLocalFolder(handle)
      
      try {
        const fileHandle = await handle.getFileHandle('deepscan-private-metadata.json')
        const file = await fileHandle.getFile()
        const content = await file.text()
        const meta = JSON.parse(content)
        if (meta.datasets) {
          setDatasets(meta.datasets)
          localStorage.setItem("deepscan-datasets", JSON.stringify(meta.datasets))
        }
        toast({ title: "Private Vault Opened", description: "Loaded your PC notebook file." })
      } catch (e) {
        toast({ title: "New Vault Created", description: `Memory file 'deepscan-private-metadata.json' created in ${handle.name}.` })
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') console.error(err)
    }
  }

  const scanLocalFolder = async (handle: any) => {
    setIsScanningLocal(true)
    const files: any[] = []
    try {
      for await (const entry of handle.values()) {
        if (entry.kind === 'file' && (entry.name.endsWith('.zip') || entry.name.endsWith('.7z'))) {
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
    syncToPCFile({ datasets: updated, scans: scans })
    
    setDatasetNotes("")
    onRefresh()
    toast({ title: "Item Remembered", description: "The AI now knows about this local file." })
  }

  const handleDelete = (id: string) => {
    const updated = datasets.filter(ds => ds.id !== id)
    setDatasets(updated)
    localStorage.setItem("deepscan-datasets", JSON.stringify(updated))
    syncToPCFile({ datasets: updated, scans: scans })
    onRefresh()
    toast({ title: "Memory Removed" })
  }

  const handleUpdateNotes = () => {
    if (!editingDataset) return
    const updated = datasets.map(ds => 
      ds.id === editingDataset.id ? { ...ds, notes: editingDataset.notes.trim() } : ds
    )
    setDatasets(updated)
    localStorage.setItem("deepscan-datasets", JSON.stringify(updated))
    syncToPCFile({ datasets: updated, scans: scans })
    setEditingDataset(null)
    onRefresh()
    toast({ title: "Notebook Updated" })
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
              <span>Learned from PC History</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-secondary/5 border-secondary/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Private Lessons</p>
                <p className="text-3xl font-bold tracking-tight">{knowledgeCount}</p>
              </div>
              <div className="p-3 bg-secondary/10 rounded-xl">
                <BrainCircuit className="w-6 h-6 text-secondary" />
              </div>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Lessons stored in your private notebook file.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/10 flex items-center justify-center p-6 text-center">
          <div className="space-y-2">
             <Lock className="w-10 h-10 text-primary mx-auto opacity-20" />
             <p className="text-sm font-bold text-primary">100% Private Mode</p>
             <p className="text-xs text-muted-foreground">Your data never leaves this computer.</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-8">
          <CardHeader>
             <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                Performance Over Time
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
                  Run a few scans to see how the AI is learning.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-4 border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-primary" />
              Dataset Ingest
            </CardTitle>
            <CardDescription>Tell the AI about files on your hard drive.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Truth Label</Label>
              <Select value={datasetLabel} onValueChange={setDatasetLabel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="real">Real Media</SelectItem>
                  <SelectItem value="fake">AI Generated</SelectItem>
                  <SelectItem value="mixed">Mixed/Training</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Your Lessons (Notes)</Label>
              <Textarea 
                placeholder="What should the AI remember about these files?"
                className="text-xs min-h-[80px]"
                value={datasetNotes}
                onChange={(e) => setDatasetNotes(e.target.value)}
              />
            </div>

            {!localFolderHandle ? (
              <Button variant="outline" className="w-full h-24 border-dashed" onClick={handleConnectLocalPC}>
                <div className="flex flex-col items-center gap-1">
                  <FolderOpen className="w-6 h-6 opacity-40" />
                  <span>Pick Your PC Vault</span>
                </div>
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-2 rounded bg-muted/50 text-[10px] font-mono">
                  <div className="flex flex-col truncate">
                    <span className="truncate font-bold">Vault: {localFolderHandle.name}</span>
                    <span className="text-[8px] opacity-60">File: deepscan-private-metadata.json</span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => scanLocalFolder(localFolderHandle)}>
                    <RefreshCcw className={cn("w-3 h-3", isScanningLocal && "animate-spin")} />
                  </Button>
                </div>
                <div className="max-h-[150px] overflow-y-auto border rounded-lg p-1 bg-muted/20">
                  {localFiles.length === 0 ? (
                    <div className="p-4 text-center text-[10px] text-muted-foreground">No ZIP files found in this vault.</div>
                  ) : localFiles.map((file) => (
                    <div key={file.name} className="flex items-center justify-between p-1.5 rounded hover:bg-primary/5 group border border-transparent hover:border-primary/10">
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold truncate">{file.name}</p>
                        <p className="text-[9px] text-muted-foreground">{(file.size / (1024*1024)).toFixed(0)}MB</p>
                      </div>
                      <Button size="sm" variant="ghost" className="h-6 text-[9px]" onClick={() => handleIndexLocalFile(file.name, file.size)}>Teach AI</Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">AI Memory Bank</CardTitle>
            {localFolderHandle && (
              <Badge variant="secondary" className="text-[10px] gap-1.5">
                <FileJson className="w-3 h-3" />
                Memory synced to: {localFolderHandle.name}/deepscan-private-metadata.json
              </Badge>
            )}
          </div>
        </CardHeader>
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
              {datasets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No private lessons recorded yet.</TableCell>
                </TableRow>
              ) : datasets.map((ds) => (
                <TableRow key={ds.id}>
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span className="flex items-center gap-1.5"><HardDrive className="w-3.5 h-3.5" /> {ds.fileName}</span>
                      <span className="text-[10px] italic opacity-60 truncate max-w-[200px]">{ds.notes || "No notes provided."}</span>
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
          
          <div className="mt-6 p-4 rounded-xl bg-blue-50 border border-blue-100 flex gap-4 text-sm text-blue-700">
            <Info className="w-6 h-6 shrink-0" />
            <div className="space-y-1">
              <p className="font-bold">Simple Guide: How this works</p>
              <p>Your AI "memory" is stored in a file called <code>deepscan-private-metadata.json</code> inside your vault folder. You don't need to upload your 3GB files; the AI just learns from the notes you write here. If you delete that file, the AI forgets everything!</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!editingDataset} onOpenChange={() => setEditingDataset(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Update Private Notebook</DialogTitle></DialogHeader>
          <Textarea 
            className="min-h-[150px]"
            value={editingDataset?.notes}
            onChange={(e) => setEditingDataset(p => p ? {...p, notes: e.target.value} : null)}
          />
          <DialogFooter>
            <Button onClick={handleUpdateNotes}>Save to Hard Drive</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
