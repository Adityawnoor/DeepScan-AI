
"use client"

import * as React from "react"
import { Database, Trash2, BarChart3, TrendingUp, Target, BrainCircuit, Pencil, HardDrive, FolderOpen, RefreshCcw, Info, Cloud, FileJson, Lock, Folder, ExternalLink, AlertTriangle, Monitor, ShieldCheck, ArrowRight, FileArchive, Settings2, ScrollText, Eye } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { cn } from "@/lib/utils"

interface DatasetManagerProps {
  knowledgeCount: number
  onRefresh: (folderName?: string, handle?: FileSystemDirectoryHandle) => void
}

export function DatasetManager({ knowledgeCount, onRefresh }: DatasetManagerProps) {
  const { toast } = useToast()
  const [datasetLabel, setDatasetLabel] = React.useState<string>("unlabeled")
  const [datasetNotes, setDatasetNotes] = React.useState<string>("")
  const [editingDataset, setEditingDataset] = React.useState<{ id: string, notes: string } | null>(null)
  const [showBrainViewer, setShowBrainViewer] = React.useState(false)
  
  // PC Repository State
  const [localFolderHandle, setLocalFolderHandle] = React.useState<FileSystemDirectoryHandle | null>(null)
  const [localFiles, setLocalFiles] = React.useState<{ name: string, size: number, lastModified: number }[]>([])
  const [isScanningLocal, setIsScanningLocal] = React.useState(false)
  const [datasets, setDatasets] = React.useState<any[]>([])
  const [scans, setScans] = React.useState<any[]>([])
  const [browserError, setBrowserError] = React.useState<string | null>(null)

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
    } catch (err) {
      console.error("PC Write Error:", err)
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

  const learnedFactsSummary = React.useMemo(() => {
    let summary = ""
    datasets.forEach(ds => { if (ds.notes) summary += `[Dataset ${ds.label}] ${ds.notes}\n` })
    scans.filter(s => s.userFeedback !== undefined).forEach(s => {
      summary += `[Scan ${s.id.substring(0,4)}] Confirmed as ${s.userFeedback ? 'Fake' : 'Real'}. ${s.userComment || ''}\n`
    })
    return summary || "No forensic facts learned yet."
  }, [datasets, scans])

  const handleConnectLocalPC = async () => {
    setBrowserError(null)
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
      localStorage.setItem("deepscan-last-folder", handle.name)
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
        if (meta.scans) {
          setScans(meta.scans)
          localStorage.setItem("deepscan-scans-metadata", JSON.stringify(meta.scans))
        }
        toast({ title: "Private Vault Opened", description: `Linked to: ${handle.name}` })
      } catch (e) {
        syncToPCFile({ datasets: datasets, scans: scans })
      }
      onRefresh(handle.name, handle)
    } catch (err: any) {
      if (err.name === 'SecurityError' || (err.message && err.message.includes('cross origin'))) {
        setBrowserError("BROWSER RESTRICTION: The Folder Picker is blocked in this preview window. Open this app in a full browser tab (e.g. localhost:9002) to link your PC database.")
      }
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
      localPath: fileName
    }
    
    const updated = [newDataset, ...datasets]
    setDatasets(updated)
    localStorage.setItem("deepscan-datasets", JSON.stringify(updated))
    syncToPCFile({ datasets: updated, scans: scans })
    
    setDatasetNotes("")
    onRefresh(localFolderHandle?.name, localFolderHandle!)
    toast({ title: "Dataset Indexed", description: "The AI has 'learned' the notes for this file." })
  }

  const handleDelete = (id: string) => {
    const updated = datasets.filter(ds => ds.id !== id)
    setDatasets(updated)
    localStorage.setItem("deepscan-datasets", JSON.stringify(updated))
    syncToPCFile({ datasets: updated, scans: scans })
    onRefresh(localFolderHandle?.name, localFolderHandle!)
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
    onRefresh(localFolderHandle?.name, localFolderHandle!)
  }

  return (
    <div className="space-y-6">
      {browserError && (
        <Alert variant="destructive" className="bg-destructive/10 border-2 border-destructive">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle className="text-lg font-bold">Security Action Required</AlertTitle>
          <AlertDescription className="space-y-4 pt-2">
            <p className="font-semibold">{browserError}</p>
            <div className="flex gap-4">
               <div className="bg-background/50 p-4 rounded-lg border flex-1">
                 <p className="text-xs font-bold uppercase mb-1">How to Link</p>
                 <p className="text-sm">Open this URL in a NEW tab in Chrome or Edge to access your hard drive.</p>
               </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Accuracy Score</p>
                <p className="text-3xl font-bold tracking-tight text-primary">{currentAccuracy}%</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-xl">
                <Target className="w-6 h-6 text-primary" />
              </div>
            </div>
            <p className="mt-4 text-xs text-muted-foreground font-medium">
              Calculated from {scans.length} verified scans
            </p>
          </CardContent>
        </Card>

        <Card className="bg-secondary/5 border-secondary/20 border-2">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Active PC Folder</p>
                <p className="text-xl font-extrabold text-primary truncate max-w-[150px]">
                  {localFolderHandle ? localFolderHandle.name : "Not Connected"}
                </p>
              </div>
              <div className="p-3 bg-secondary/10 rounded-xl">
                <Folder className="w-6 h-6 text-secondary" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-muted-foreground">
               <FileJson className="w-3 h-3 text-primary" />
               <span>Database: deepscan-private-metadata.json</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/10 flex items-center justify-center p-6 text-center cursor-pointer hover:bg-primary/10 transition-colors" onClick={() => setShowBrainViewer(true)}>
          <div className="space-y-2">
             <BrainCircuit className="w-10 h-10 text-primary mx-auto opacity-40 animate-pulse" />
             <p className="text-sm font-bold text-primary">Intelligence Explorer</p>
             <p className="text-[10px] text-muted-foreground">View {knowledgeCount} private lessons learned.</p>
             <Button variant="link" size="sm" className="h-auto p-0 text-[10px]">Open Explorer <Eye className="w-3 h-3 ml-1" /></Button>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
           <Card>
            <CardHeader>
               <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  Training Progress
                </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] w-full">
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
                    No verified scans yet.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-primary">
                <Settings2 className="w-5 h-5" />
                PC Storage Map: Where is my data?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-card p-4 rounded-xl border-2 border-primary/20 space-y-2">
                  <div className="flex items-center gap-2">
                    <FileJson className="w-5 h-5 text-primary" />
                    <span className="font-bold">The Database (JSON)</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    <strong>File:</strong> <code>deepscan-private-metadata.json</code><br/>
                    <strong>Stores:</strong> Scan history, accuracy, and your personal notes. This is the AI's "brain" and is very small.
                  </p>
                </div>
                <div className="bg-card p-4 rounded-xl border-2 border-secondary/20 space-y-2">
                  <div className="flex items-center gap-2">
                    <FileArchive className="w-5 h-5 text-secondary" />
                    <span className="font-bold">The Datasets (ZIPs)</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    <strong>Files:</strong> Your <code>.zip</code> or <code>.7z</code> files.<br/>
                    <strong>Stores:</strong> The actual heavy media. These stay in your folder; the database only stores their "names" as a reference.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="lg:col-span-4 border-primary/20 border-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-primary" />
              Link PC Vault
            </CardTitle>
            <CardDescription>Grant access to your hard drive folder.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!localFolderHandle ? (
              <div className="space-y-4">
                <Button variant="outline" className="w-full h-24 border-dashed border-primary/50 bg-primary/5" onClick={handleConnectLocalPC}>
                  <div className="flex flex-col items-center gap-1">
                    <FolderOpen className="w-6 h-6 text-primary" />
                    <span className="font-bold text-primary">Pick Your PC Vault</span>
                    <span className="text-[10px] text-muted-foreground">Select a folder on your computer</span>
                  </div>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
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
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Dataset Notes</Label>
                  <Textarea 
                    placeholder="Teach the AI what's in these files..."
                    className="text-xs min-h-[80px]"
                    value={datasetNotes}
                    onChange={(e) => setDatasetNotes(e.target.value)}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10 border border-primary/20 text-[10px] font-mono">
                    <span className="truncate font-bold text-primary">{localFolderHandle.name}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => scanLocalFolder(localFolderHandle)}>
                      <RefreshCcw className={cn("w-3 h-3 text-primary", isScanningLocal && "animate-spin")} />
                    </Button>
                  </div>
                  <div className="max-h-[150px] overflow-y-auto border rounded-lg p-1 bg-muted/20">
                    {localFiles.length === 0 ? (
                      <div className="p-4 text-center text-[10px] text-muted-foreground">No ZIP files found.</div>
                    ) : localFiles.map((file) => (
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
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Database Index</CardTitle>
            {localFolderHandle && (
              <Badge variant="secondary" className="text-[10px] gap-1.5 bg-primary/10 text-primary border-primary/20">
                <FileJson className="w-3 h-3" />
                Synced: {localFolderHandle.name}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>File Name (Reference)</TableHead>
                <TableHead>Label</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {datasets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">No files indexed in your private database.</TableCell>
                </TableRow>
              ) : datasets.map((ds) => (
                <TableRow key={ds.id}>
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span className="flex items-center gap-1.5 font-bold truncate max-w-[300px]"><FileArchive className="w-3.5 h-3.5" /> {ds.fileName}</span>
                      <span className="text-[10px] italic opacity-60 truncate max-w-[300px]">{ds.notes || "No notes."}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">{ds.label.toUpperCase()}</Badge>
                  </TableCell>
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

      {/* AI Brain Knowledge Explorer Dialog */}
      <Dialog open={showBrainViewer} onOpenChange={setShowBrainViewer}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BrainCircuit className="w-5 h-5 text-primary" />
              Private Intelligence Explorer
            </DialogTitle>
            <CardDescription>This is the raw data the AI reads from your PC to "learn" before every scan.</CardDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto bg-muted/30 p-4 rounded-lg border font-mono text-[11px] leading-relaxed whitespace-pre-wrap">
            {learnedFactsSummary}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowBrainViewer(false)}>Close Explorer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingDataset} onOpenChange={() => setEditingDataset(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Update Index Notes</DialogTitle></DialogHeader>
          <Textarea 
            className="min-h-[150px]"
            value={editingDataset?.notes}
            onChange={(e) => setEditingDataset(p => p ? {...p, notes: e.target.value} : null)}
          />
          <DialogFooter>
            <Button onClick={handleUpdateNotes}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
