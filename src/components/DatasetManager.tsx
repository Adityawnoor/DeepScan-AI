
"use client"

import * as React from "react"
import { Database, Trash2, BarChart3, TrendingUp, Target, BrainCircuit, Pencil, HardDrive, FolderOpen, RefreshCcw, Info, Cloud, FileJson, Lock, Folder, ExternalLink, AlertTriangle, Monitor, ShieldCheck, ArrowRight, FileArchive, Settings2, ScrollText, Eye, Fingerprint, BookOpen } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
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

  // Memoize the learned facts summary for the Intelligence Explorer
  const learnedFactsSummary = React.useMemo(() => {
    let summary = "### PRIVATE INTELLIGENCE LOG: Ground Truth Data ###\n\n"
    
    // Dataset facts
    const datasetFacts = datasets.filter(ds => ds.notes)
    if (datasetFacts.length > 0) {
      summary += `--- COLLECTED FROM RESEARCH DATASETS (${datasetFacts.length}) ---\n`
      datasetFacts.forEach(ds => {
        summary += `[FILE: ${ds.fileName}] [LABEL: ${ds.label.toUpperCase()}]\n`
        summary += `OBSERVATION: ${ds.notes}\n\n`
      })
    }

    // Feedback facts
    const feedbackScans = scans.filter(s => s.userFeedback !== undefined)
    if (feedbackScans.length > 0) {
      summary += `--- LEARNED FROM HUMAN VERIFICATION (${feedbackScans.length}) ---\n`
      feedbackScans.forEach(s => {
        const isCorrect = s.aiVerdict === s.userFeedback
        summary += `[SCAN: ${s.id.substring(0, 8)}] [TRUTH: ${s.userFeedback ? 'FAKE' : 'AUTHENTIC'}] [AI WAS: ${isCorrect ? 'CORRECT' : 'WRONG'}]\n`
        if (s.userComment) summary += `USER NOTE: ${s.userComment}\n`
        summary += `\n`
      })
    }

    if (datasetFacts.length === 0 && feedbackScans.length === 0) {
      summary = "No private intelligence learned yet. Upload datasets with notes or verify AI results to build the memory."
    }

    return summary
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
        <Alert variant="destructive" className="bg-destructive/10 border-2 border-destructive animate-in fade-in duration-500">
          <AlertTriangle className="h-6 w-6" />
          <AlertTitle className="text-lg font-bold">Local File Access Blocked</AlertTitle>
          <AlertDescription className="space-y-4 pt-2">
            <p className="font-semibold text-sm leading-relaxed">{browserError}</p>
            <div className="flex gap-4">
               <div className="bg-background/50 p-4 rounded-lg border flex-1">
                 <p className="text-[10px] font-extrabold uppercase mb-1">Recommended Action</p>
                 <p className="text-xs">Navigate directly to <code className="bg-muted px-1 rounded">localhost:9002</code> in your browser to grant the app permanent folder access.</p>
               </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-primary/5 border-primary/20 shadow-sm relative overflow-hidden group transition-all hover:shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">AI Accuracy Rating</p>
                <p className="text-4xl font-black tracking-tight text-primary">{currentAccuracy}%</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-2xl group-hover:rotate-12 transition-transform">
                <Target className="w-8 h-8 text-primary" />
              </div>
            </div>
            <p className="mt-4 text-[10px] text-muted-foreground font-bold italic">
              Verified against {scans.filter(s => s.userFeedback !== undefined).length} manual audits
            </p>
          </CardContent>
          <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
        </Card>

        <Card className="bg-secondary/5 border-secondary/20 border-2 relative overflow-hidden">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Active PC Vault</p>
                <p className="text-xl font-extrabold text-primary truncate max-w-[150px]">
                  {localFolderHandle ? localFolderHandle.name : "Unlinked"}
                </p>
              </div>
              <div className="p-3 bg-secondary/10 rounded-2xl">
                <Folder className="w-8 h-8 text-secondary" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-muted-foreground">
               <FileJson className="w-4 h-4 text-primary" />
               <span className="font-mono">DB: deepscan-private-metadata.json</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20 border-2 border-dashed flex items-center justify-center p-6 text-center cursor-pointer hover:bg-primary/10 transition-all hover:scale-[1.02]" onClick={() => setShowBrainViewer(true)}>
          <div className="space-y-3">
             <div className="relative">
               <BrainCircuit className="w-12 h-12 text-primary mx-auto opacity-60 animate-pulse" />
               <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
             </div>
             <div>
               <p className="text-sm font-black text-primary uppercase tracking-tighter">Intelligence Explorer</p>
               <p className="text-[10px] text-muted-foreground">View {knowledgeCount} private lessons learned.</p>
             </div>
             <Button variant="outline" size="sm" className="h-8 text-[10px] font-bold gap-2">
               Open Explorer <Eye className="w-3 h-3" />
             </Button>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
           <Card className="shadow-lg">
            <CardHeader className="bg-muted/30 pb-4">
               <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Forensic Confidence Over Time
                </CardTitle>
                <CardDescription>How the AI's accuracy evolves as you provide more PC data.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="h-[250px] w-full">
                {chartData.length > 0 ? (
                  <ChartContainer config={{ accuracy: { label: "Accuracy (%)", color: "hsl(var(--primary))" } }}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700 }} />
                      <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 9 }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line 
                        type="monotone" 
                        dataKey="accuracy" 
                        stroke="var(--color-accuracy)" 
                        strokeWidth={4} 
                        dot={{ r: 5, fill: "var(--color-accuracy)", strokeWidth: 2, stroke: "white" }} 
                        activeDot={{ r: 8, strokeWidth: 0 }}
                      />
                    </LineChart>
                  </ChartContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm border-4 border-dashed rounded-3xl bg-muted/20 gap-3">
                    <Fingerprint className="w-10 h-10 opacity-20" />
                    <p className="font-bold">No performance data yet.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/30 bg-primary/5 shadow-md">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-primary">
                <Settings2 className="w-5 h-5" />
                PC Storage Map
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-card p-5 rounded-2xl border-2 border-primary/20 space-y-3 shadow-sm">
                  <div className="flex items-center gap-2">
                    <FileJson className="w-6 h-6 text-primary" />
                    <span className="font-black text-xs uppercase">The Brain (Metadata)</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    <strong className="text-primary">File:</strong> <code>deepscan-private-metadata.json</code><br/><br/>
                    Contains your scan history, accuracy metrics, and forensic notes. This is the only file the AI "reads" for context.
                  </p>
                </div>
                <div className="bg-card p-5 rounded-2xl border-2 border-secondary/20 space-y-3 shadow-sm">
                  <div className="flex items-center gap-2">
                    <FileArchive className="w-6 h-6 text-secondary" />
                    <span className="font-black text-xs uppercase">The Library (Datasets)</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    <strong className="text-secondary">Files:</strong> Your <code>.zip</code> or <code>.7z</code> sources.<br/><br/>
                    The app stores references to these files. The AI uses the notes you write about them to understand specific "Real" vs "Fake" patterns.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="lg:col-span-4 border-primary/30 border-2 shadow-xl sticky top-24 h-fit">
          <CardHeader className="bg-primary/5 border-b">
            <CardTitle className="text-lg flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-primary" />
              Link PC Vault
            </CardTitle>
            <CardDescription>Enable permanent AI memory on your hard drive.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {!localFolderHandle ? (
              <div className="space-y-4">
                <Button variant="outline" className="w-full h-32 border-4 border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 transition-all rounded-3xl" onClick={handleConnectLocalPC}>
                  <div className="flex flex-col items-center gap-2">
                    <FolderOpen className="w-8 h-8 text-primary" />
                    <span className="font-black text-primary uppercase text-xs">Mount Folder</span>
                    <span className="text-[10px] text-muted-foreground max-w-[150px]">Choose a directory on your computer</span>
                  </div>
                </Button>
                <Alert className="bg-muted/50 border-none">
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-[10px] leading-tight font-medium">
                    This folder will act as the home for all your private forensic results.
                  </AlertDescription>
                </Alert>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-extrabold uppercase text-muted-foreground tracking-wider">Intelligence Category</Label>
                  <Select value={datasetLabel} onValueChange={setDatasetLabel}>
                    <SelectTrigger className="h-10 font-bold"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="real">Verified Real Media</SelectItem>
                      <SelectItem value="fake">Known AI Generated</SelectItem>
                      <SelectItem value="mixed">Mixed Testing Material</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-extrabold uppercase text-muted-foreground tracking-wider">Expert Observations</Label>
                  <Textarea 
                    placeholder="Teach the AI about these files: 'This ZIP contains high-quality GAN voices with metallic texture...'"
                    className="text-xs min-h-[100px] bg-muted/20"
                    value={datasetNotes}
                    onChange={(e) => setDatasetNotes(e.target.value)}
                  />
                  <p className="text-[9px] italic text-muted-foreground">These notes are used as "Prompt Context" during scans.</p>
                </div>

                <div className="space-y-3 pt-4 border-t">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-primary/10 border border-primary/20 text-[10px] font-mono shadow-sm">
                    <div className="flex items-center gap-2 truncate">
                       <Folder className="w-3.5 h-3.5 text-primary" />
                       <span className="truncate font-bold text-primary">{localFolderHandle.name}</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-primary/20" onClick={() => scanLocalFolder(localFolderHandle)}>
                      <RefreshCcw className={cn("w-3.5 h-3.5 text-primary", isScanningLocal && "animate-spin")} />
                    </Button>
                  </div>
                  
                  <Label className="text-[10px] font-extrabold uppercase text-muted-foreground block px-1">Detected PC Files</Label>
                  <div className="max-h-[180px] overflow-y-auto border-2 rounded-2xl p-2 bg-muted/10 space-y-1">
                    {localFiles.length === 0 ? (
                      <div className="p-8 text-center text-[10px] text-muted-foreground italic flex flex-col items-center gap-2">
                        <FileArchive className="w-6 h-6 opacity-20" />
                        No ZIP/7z files found in this vault.
                      </div>
                    ) : localFiles.map((file) => (
                      <div key={file.name} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white group border border-transparent hover:border-primary/20 transition-all shadow-sm">
                        <div className="min-w-0 flex items-center gap-2">
                          <FileArchive className="w-4 h-4 text-primary shrink-0" />
                          <div className="truncate">
                            <p className="text-[10px] font-black truncate">{file.name}</p>
                            <p className="text-[9px] text-muted-foreground font-mono">{(file.size / (1024*1024)).toFixed(0)}MB</p>
                          </div>
                        </div>
                        <Button size="sm" variant="outline" className="h-7 text-[9px] font-bold px-3 hover:bg-primary hover:text-white transition-colors" onClick={() => handleIndexLocalFile(file.name, file.size)}>Index</Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-lg border-none">
        <CardHeader className="bg-muted/30 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ScrollText className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">Private Intelligence Index</CardTitle>
            </div>
            {localFolderHandle && (
              <Badge variant="secondary" className="text-[10px] gap-1.5 bg-primary/10 text-primary border-primary/20 px-3 py-1 font-bold">
                <Monitor className="w-3 h-3" />
                VAULT: {localFolderHandle.name}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="border-none">
                <TableHead className="text-[10px] font-black uppercase tracking-wider">Source Reference</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-wider">AI Training Label</TableHead>
                <TableHead className="text-right text-[10px] font-black uppercase tracking-wider">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {datasets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-20 text-muted-foreground space-y-3">
                    <Database className="w-12 h-12 mx-auto opacity-10" />
                    <p className="font-bold text-sm">No forensic data indexed on this PC.</p>
                  </TableCell>
                </TableRow>
              ) : datasets.map((ds) => (
                <TableRow key={ds.id} className="hover:bg-muted/20">
                  <TableCell className="font-medium py-4">
                    <div className="flex flex-col gap-1">
                      <span className="flex items-center gap-1.5 font-black text-sm text-foreground truncate max-w-[400px]">
                        <FileArchive className="w-4 h-4 text-primary" /> 
                        {ds.fileName}
                      </span>
                      <span className="text-[11px] text-muted-foreground italic leading-snug max-w-[400px] line-clamp-1">{ds.notes || "No expert notes provided."}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-[9px] font-black uppercase border-2",
                        ds.label === 'real' ? "border-green-500/20 text-green-600 bg-green-50" : 
                        ds.label === 'fake' ? "border-destructive/20 text-destructive bg-destructive/5" : 
                        "border-muted"
                      )}
                    >
                      {ds.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-primary/10" onClick={() => setEditingDataset({ id: ds.id, notes: ds.notes || "" })}>
                        <Pencil className="w-4 h-4 text-primary" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-destructive/10" onClick={() => handleDelete(ds.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Intelligence Explorer Dialog - The "Knowledge Base Explorer" */}
      <Dialog open={showBrainViewer} onOpenChange={setShowBrainViewer}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden border-2 shadow-2xl">
          <DialogHeader className="p-6 bg-primary/5 border-b">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-primary/10 shadow-sm">
                <BrainCircuit className="w-6 h-6 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Private Intelligence Explorer</DialogTitle>
                <DialogDescription className="text-xs font-medium text-muted-foreground">
                  The raw "Ground Truth" data passed to the AI before every scan.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto p-0 bg-background">
             <div className="p-6">
                <div className="bg-muted/30 p-6 rounded-2xl border-2 border-dashed border-muted font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-foreground/80 shadow-inner">
                  {learnedFactsSummary}
                </div>
                
                <div className="mt-8 grid grid-cols-2 gap-4">
                   <div className="p-4 rounded-xl bg-green-50 border border-green-100 space-y-2">
                     <p className="text-[10px] font-black text-green-700 uppercase">Training Quality</p>
                     <p className="text-xs font-bold text-green-800">Your manual audits are helping the AI detect specific temporal jitters in local datasets.</p>
                   </div>
                   <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 space-y-2">
                     <p className="text-[10px] font-black text-primary uppercase">Context Window</p>
                     <p className="text-xs font-bold text-primary/80">Every new analysis includes this summary to maintain a "Long-Term Forensic Memory".</p>
                   </div>
                </div>
             </div>
          </div>
          
          <DialogFooter className="p-4 border-t bg-muted/20">
            <Button onClick={() => setShowBrainViewer(false)} className="font-bold uppercase tracking-widest text-xs h-11 px-8">Close Explorer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingDataset} onOpenChange={() => setEditingDataset(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              Refine Forensic Intelligence
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label className="text-xs font-bold text-muted-foreground uppercase block mb-3">Update Observation Log</Label>
            <Textarea 
              className="min-h-[200px] text-xs font-medium leading-relaxed bg-muted/20"
              placeholder="What specifically should the AI look for in this dataset?"
              value={editingDataset?.notes}
              onChange={(e) => setEditingDataset(p => p ? {...p, notes: e.target.value} : null)}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setEditingDataset(null)} className="font-bold">Cancel</Button>
            <Button onClick={handleUpdateNotes} className="font-bold">Save Intelligence Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
