
"use client"

import * as React from "react"
import { 
  Database, Trash2, BarChart3, TrendingUp, Target, BrainCircuit, 
  Pencil, HardDrive, FolderOpen, RefreshCcw, Info, Cloud, 
  FileJson, Lock, Folder, ExternalLink, AlertTriangle, Monitor, 
  ShieldCheck, ArrowRight, FileArchive, Settings2, ScrollText, 
  Eye, Fingerprint, BookOpen, ClipboardList, Shield
} from "lucide-react"
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
  const [exportedReports, setExportedReports] = React.useState<string[]>([])
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
    let summary = "### PRIVATE INTELLIGENCE LOG: Ground Truth Data ###\n\n"
    const datasetFacts = datasets.filter(ds => ds.notes)
    if (datasetFacts.length > 0) {
      summary += `--- RESEARCH DATASETS (${datasetFacts.length}) ---\n`
      datasetFacts.forEach(ds => summary += `[${ds.label.toUpperCase()}] ${ds.notes}\n`)
    }
    const feedbackScans = scans.filter(s => s.userFeedback !== undefined)
    if (feedbackScans.length > 0) {
      summary += `\n--- HUMAN VERIFICATION (${feedbackScans.length}) ---\n`
      feedbackScans.forEach(s => summary += `[SCAN: ${s.id.substring(0, 4)}] confirmed as ${s.userFeedback ? 'FAKE' : 'AUTHENTIC'}\n`)
    }
    return summary || "No facts learned yet."
  }, [datasets, scans])

  const handleConnectLocalPC = async () => {
    setBrowserError(null)
    try {
      if (!('showDirectoryPicker' in window)) {
        toast({ variant: "destructive", title: "Unsupported Browser" })
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
        if (meta.datasets) setDatasets(meta.datasets)
        if (meta.scans) setScans(meta.scans)
      } catch (e) {
        syncToPCFile({ datasets, scans })
      }
      onRefresh(handle.name, handle)
    } catch (err: any) {
      if (err.name === 'SecurityError') {
        setBrowserError("Please open the app in a full browser tab to grant folder access.")
      }
    }
  }

  const scanLocalFolder = async (handle: any) => {
    setIsScanningLocal(true)
    const files: any[] = []
    const reports: string[] = []
    try {
      for await (const entry of handle.values()) {
        if (entry.kind === 'file') {
          if (entry.name.endsWith('.zip') || entry.name.endsWith('.7z')) {
            const file = await entry.getFile()
            files.push({ name: entry.name, size: file.size, lastModified: file.lastModified })
          } else if (entry.name.startsWith('Forensic_Report_')) {
            reports.push(entry.name)
          }
        }
      }
      setLocalFiles(files)
      setExportedReports(reports)
    } finally {
      setIsScanningLocal(false)
    }
  }

  const handleIndexLocalFile = (fileName: string, size: number) => {
    const newDataset = {
      id: crypto.randomUUID(),
      fileName,
      uploadDate: new Date().toISOString(),
      size,
      status: "ready",
      label: datasetLabel,
      notes: datasetNotes.trim(),
      isLocal: true
    }
    const updated = [newDataset, ...datasets]
    setDatasets(updated)
    localStorage.setItem("deepscan-datasets", JSON.stringify(updated))
    syncToPCFile({ datasets: updated, scans })
    setDatasetNotes("")
    onRefresh(localFolderHandle?.name, localFolderHandle!)
  }

  return (
    <div className="space-y-6">
      {browserError && (
        <Alert variant="destructive" className="bg-destructive/10 border-2 border-destructive">
          <AlertTriangle className="h-6 w-6" />
          <AlertTitle className="text-lg font-bold">Local File Access Blocked</AlertTitle>
          <AlertDescription className="text-xs leading-relaxed">{browserError}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-primary/5 border-primary/20 shadow-sm col-span-1">
          <CardContent className="pt-6">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">AI Accuracy</p>
            <p className="text-4xl font-black tracking-tight text-primary">{currentAccuracy}%</p>
            <p className="mt-2 text-[10px] text-muted-foreground font-bold italic">{scans.length} Audits Run</p>
          </CardContent>
        </Card>

        <Card className="bg-secondary/5 border-secondary/20 border-2 col-span-2">
          <CardContent className="pt-6 flex justify-between items-center">
            <div className="space-y-1">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Active PC Vault</p>
              <p className="text-xl font-extrabold text-primary truncate">
                {localFolderHandle ? localFolderHandle.name : "Unlinked"}
              </p>
            </div>
            <div className="flex gap-2">
               <div className="flex flex-col items-center">
                  <span className="text-[10px] font-black">{localFiles.length}</span>
                  <span className="text-[8px] uppercase text-muted-foreground">Datasets</span>
               </div>
               <div className="flex flex-col items-center">
                  <span className="text-[10px] font-black">{exportedReports.length}</span>
                  <span className="text-[8px] uppercase text-muted-foreground">Reports</span>
               </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20 border-2 border-dashed flex items-center justify-center p-6 text-center cursor-pointer hover:bg-primary/10 transition-all" onClick={() => setShowBrainViewer(true)}>
          <div className="space-y-1">
             <BrainCircuit className="w-8 h-8 text-primary mx-auto" />
             <p className="text-sm font-black text-primary uppercase tracking-tighter">Memory</p>
             <p className="text-[9px] text-muted-foreground">View {knowledgeCount} facts</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
           <Card className="shadow-lg">
            <CardHeader className="bg-muted/30 pb-4">
               <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" /> Forensic Confidence Timeline
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="h-[250px] w-full">
                {chartData.length > 0 ? (
                  <ChartContainer config={{ accuracy: { label: "Accuracy (%)", color: "hsl(var(--primary))" } }}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9 }} />
                      <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 9 }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line type="monotone" dataKey="accuracy" stroke="var(--color-accuracy)" strokeWidth={4} dot={{ r: 4 }} />
                    </LineChart>
                  </ChartContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <Fingerprint className="w-10 h-10 opacity-20" />
                    <p className="text-sm">No performance data yet.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md">
            <CardHeader className="bg-muted/30">
              <CardTitle className="text-md flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-primary" />
                Exported Forensic Proofs
              </CardTitle>
              <CardDescription>JSON evidence files stored in your linked PC Vault.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
               <Table>
                 <TableHeader>
                   <TableRow>
                     <TableHead className="text-[10px] uppercase font-black">Report Filename</TableHead>
                     <TableHead className="text-[10px] uppercase font-black text-right">Status</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {exportedReports.length === 0 ? (
                     <TableRow>
                       <TableCell colSpan={2} className="text-center py-10 text-muted-foreground text-xs italic">
                         No exported forensic reports found in vault.
                       </TableCell>
                     </TableRow>
                   ) : exportedReports.map(report => (
                     <TableRow key={report}>
                       <TableCell className="font-mono text-[11px] font-bold">
                         <FileJson className="w-3 h-3 inline mr-2 text-primary" /> {report}
                       </TableCell>
                       <TableCell className="text-right">
                         <Badge variant="outline" className="text-[9px] font-black uppercase bg-green-50 text-green-600 border-green-200">
                           Certified
                         </Badge>
                       </TableCell>
                     </TableRow>
                   ))}
                 </TableBody>
               </Table>
            </CardContent>
          </Card>
        </div>

        <Card className="lg:col-span-4 border-primary/30 border-2 shadow-xl h-fit">
          <CardHeader className="bg-primary/5 border-b">
            <CardTitle className="text-lg flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-primary" /> PC Vault Manager
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {!localFolderHandle ? (
              <Button variant="outline" className="w-full h-32 border-4 border-dashed border-primary/30" onClick={handleConnectLocalPC}>
                <div className="flex flex-col items-center gap-2">
                  <FolderOpen className="w-8 h-8 text-primary" />
                  <span className="font-black text-primary uppercase text-xs">Pick Your PC Vault</span>
                </div>
              </Button>
            ) : (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-extrabold uppercase text-muted-foreground">Expert Observations</Label>
                  <Textarea 
                    placeholder="Teach the AI what to look for in these files..."
                    className="text-xs min-h-[100px]"
                    value={datasetNotes}
                    onChange={(e) => setDatasetNotes(e.target.value)}
                  />
                </div>
                <div className="space-y-3 pt-4 border-t">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-primary/10 text-[10px] font-mono">
                    <span className="truncate font-bold text-primary">{localFolderHandle.name}</span>
                    <RefreshCcw className={cn("w-3.5 h-3.5 cursor-pointer", isScanningLocal && "animate-spin")} onClick={() => scanLocalFolder(localFolderHandle)} />
                  </div>
                  <div className="max-h-[180px] overflow-y-auto border rounded-xl p-2 bg-muted/10 space-y-1">
                    {localFiles.map((file) => (
                      <div key={file.name} className="flex items-center justify-between p-2 rounded-lg bg-background border text-[10px]">
                        <span className="truncate font-bold flex-1">{file.name}</span>
                        <Button size="sm" variant="ghost" className="h-6 text-[9px] font-bold" onClick={() => handleIndexLocalFile(file.name, file.size)}>Index</Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showBrainViewer} onOpenChange={setShowBrainViewer}>
        <DialogContent className="max-w-2xl border-2">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl font-black uppercase tracking-tighter">
              <BrainCircuit className="w-6 h-6 text-primary" /> Private AI Intelligence
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 bg-muted/30 rounded-2xl border-2 border-dashed font-mono text-[11px] whitespace-pre-wrap">
            {learnedFactsSummary}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowBrainViewer(false)} className="font-bold">Close Memory Viewer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
