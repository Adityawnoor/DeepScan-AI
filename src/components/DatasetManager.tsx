
"use client"

import * as React from "react"
import { 
  Database, Trash2, BarChart3, TrendingUp, Target, BrainCircuit, 
  Pencil, HardDrive, FolderOpen, RefreshCcw, Info, Cloud, 
  FileJson, Lock, Folder, ExternalLink, AlertTriangle, Monitor, 
  ShieldCheck, ArrowRight, FileArchive, Settings2, ScrollText, 
  Eye, Fingerprint, BookOpen, ClipboardList, Shield, Gauge, Activity,
  AlertCircle
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Line, LineChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Bar, BarChart } from "recharts"
import { cn } from "@/lib/utils"

interface DatasetManagerProps {
  knowledgeCount: number
  onRefresh: (folderName?: string, handle?: FileSystemDirectoryHandle) => void
}

export function DatasetManager({ knowledgeCount, onRefresh }: DatasetManagerProps) {
  const { toast } = useToast()
  const [datasetLabel, setDatasetLabel] = React.useState<string>("unlabeled")
  const [datasetNotes, setDatasetNotes] = React.useState<string>("")
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

  // Accuracy Audit Logic
  const auditBreakdown = React.useMemo(() => {
    const breakdown = {
      image: { total: 0, correct: 0 },
      audio: { total: 0, correct: 0 },
      video: { total: 0, correct: 0 }
    }
    
    scans.forEach(scan => {
      const type = scan.mediaType as keyof typeof breakdown
      if (breakdown[type] && scan.userFeedback !== undefined) {
        breakdown[type].total++
        if (scan.aiVerdict === scan.userFeedback) breakdown[type].correct++
      }
    })

    return Object.entries(breakdown).map(([type, stats]) => ({
      type: type.toUpperCase(),
      accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
      total: stats.total
    }))
  }, [scans])

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
            <div className="flex items-center gap-2 mb-2">
              <Gauge className="w-4 h-4 text-primary" />
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Global Accuracy</p>
            </div>
            <p className="text-4xl font-black tracking-tight text-primary">{currentAccuracy}%</p>
            <p className="mt-2 text-[10px] text-muted-foreground font-bold italic">{scans.length} Private Audits</p>
          </CardContent>
        </Card>

        <Card className="bg-secondary/5 border-secondary/20 border-2 col-span-2">
          <CardContent className="pt-6 flex justify-between items-center">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Linked PC Vault</p>
              </div>
              <p className="text-xl font-extrabold text-primary truncate max-w-[200px]">
                {localFolderHandle ? localFolderHandle.name : "UNCONNECTED"}
              </p>
            </div>
            <div className="flex gap-4">
               <div className="flex flex-col items-center">
                  <span className="text-lg font-black">{localFiles.length}</span>
                  <span className="text-[8px] uppercase font-bold text-muted-foreground">Sets</span>
               </div>
               <div className="flex flex-col items-center">
                  <span className="text-lg font-black">{exportedReports.length}</span>
                  <span className="text-[8px] uppercase font-bold text-muted-foreground">Reports</span>
               </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20 border-2 border-dashed flex items-center justify-center p-6 text-center cursor-pointer hover:bg-primary/10 transition-all" onClick={() => setShowBrainViewer(true)}>
          <div className="space-y-1">
             <BrainCircuit className="w-8 h-8 text-primary mx-auto" />
             <p className="text-sm font-black text-primary uppercase tracking-tighter">AI Memory</p>
             <p className="text-[9px] text-muted-foreground">Explore {knowledgeCount} Private Facts</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
           <Card className="shadow-xl border-2 border-muted/50 overflow-hidden">
            <CardHeader className="bg-muted/30 pb-4 flex flex-row items-center justify-between space-y-0">
               <div className="space-y-1">
                 <CardTitle className="text-lg flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" /> Forensic Performance Audit
                  </CardTitle>
                  <CardDescription className="text-xs">Historical accuracy breakdown across private sessions</CardDescription>
               </div>
               <Badge variant="outline" className="bg-background">Real-time Data</Badge>
            </CardHeader>
            <CardContent className="pt-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="h-[250px] w-full">
                  <ChartContainer config={{ accuracy: { label: "Accuracy (%)", color: "hsl(var(--primary))" } }}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9 }} />
                      <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 9 }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line type="monotone" dataKey="accuracy" stroke="var(--color-accuracy)" strokeWidth={4} dot={{ r: 4 }} />
                    </LineChart>
                  </ChartContainer>
                </div>
                
                <div className="space-y-4">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Accuracy by Media Type</Label>
                  <div className="space-y-3">
                    {auditBreakdown.map(item => (
                      <div key={item.type} className="space-y-1">
                        <div className="flex justify-between text-[11px] font-bold">
                          <span className="text-muted-foreground">{item.type}</span>
                          <span className="text-primary">{item.accuracy}%</span>
                        </div>
                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all duration-1000" 
                            style={{ width: `${item.accuracy}%` }}
                          />
                        </div>
                        <p className="text-[9px] text-muted-foreground text-right italic">{item.total} audited scans</p>
                      </div>
                    ))}
                    {scans.length === 0 && (
                      <div className="p-4 rounded-xl border border-dashed text-center space-y-2 bg-muted/20">
                        <AlertCircle className="w-6 h-6 mx-auto text-muted-foreground opacity-30" />
                        <p className="text-[10px] text-muted-foreground">Run scans and provide feedback to populate the audit dashboard.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md overflow-hidden">
            <CardHeader className="bg-primary/5 border-b">
              <CardTitle className="text-md flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-primary" />
                Certified PC Evidence Vault
              </CardTitle>
              <CardDescription className="text-xs">Immutable JSON evidence reports exported from your analysis sessions.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
               <Table>
                 <TableHeader className="bg-muted/30">
                   <TableRow>
                     <TableHead className="text-[10px] uppercase font-black tracking-widest">Certification Filename</TableHead>
                     <TableHead className="text-[10px] uppercase font-black text-right tracking-widest">Integrity Status</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {exportedReports.length === 0 ? (
                     <TableRow>
                       <TableCell colSpan={2} className="text-center py-16 text-muted-foreground text-xs italic opacity-60">
                         No certified forensic reports detected in the linked vault.
                       </TableCell>
                     </TableRow>
                   ) : exportedReports.map(report => (
                     <TableRow key={report}>
                       <TableCell className="font-mono text-[11px] font-bold py-4">
                         <div className="flex items-center gap-3">
                           <FileJson className="w-4 h-4 text-primary" />
                           {report}
                         </div>
                       </TableCell>
                       <TableCell className="text-right">
                         <Badge variant="outline" className="text-[9px] font-black uppercase bg-green-500/10 text-green-600 border-green-500/20 px-3">
                           Certified Evidence
                         </Badge>
                       </TableCell>
                     </TableRow>
                   ))}
                 </TableBody>
               </Table>
            </CardContent>
          </Card>
        </div>

        <Card className="lg:col-span-4 border-primary/30 border-2 shadow-2xl h-fit">
          <CardHeader className="bg-primary/5 border-b">
            <CardTitle className="text-lg flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-primary" /> PC Repository Tools
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {!localFolderHandle ? (
              <Button variant="outline" className="w-full h-40 border-4 border-dashed border-primary/20 hover:border-primary/50 transition-all bg-muted/10" onClick={handleConnectLocalPC}>
                <div className="flex flex-col items-center gap-3">
                  <div className="p-3 bg-primary/10 rounded-full">
                    <FolderOpen className="w-10 h-10 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <span className="font-black text-primary uppercase text-xs block">Link Your PC Vault</span>
                    <span className="text-[9px] text-muted-foreground">Required for permanent storage & exports</span>
                  </div>
                </div>
              </Button>
            ) : (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">New Expert Observation</Label>
                  <Textarea 
                    placeholder="Describe specific artifacts or rules for the AI to learn..."
                    className="text-xs min-h-[120px] border-primary/20 shadow-inner"
                    value={datasetNotes}
                    onChange={(e) => setDatasetNotes(e.target.value)}
                  />
                  <p className="text-[9px] text-muted-foreground italic">Notes are automatically synthesized into the AI's prompt during scan.</p>
                </div>
                <div className="space-y-3 pt-4 border-t">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/10 text-[10px] font-mono">
                    <div className="flex items-center gap-2">
                       <Folder className="w-3.5 h-3.5 text-primary" />
                       <span className="truncate font-bold text-primary">{localFolderHandle.name}</span>
                    </div>
                    <RefreshCcw className={cn("w-3.5 h-3.5 cursor-pointer text-primary", isScanningLocal && "animate-spin")} onClick={() => scanLocalFolder(localFolderHandle)} />
                  </div>
                  <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mt-4 block">Available Research Files</Label>
                  <div className="max-h-[220px] overflow-y-auto border rounded-xl p-2 bg-muted/10 space-y-2 custom-scrollbar">
                    {localFiles.length === 0 ? (
                      <p className="text-[10px] text-muted-foreground italic text-center py-4">No ZIP/7z files found in vault.</p>
                    ) : localFiles.map((file) => (
                      <div key={file.name} className="flex items-center justify-between p-3 rounded-lg bg-background border-2 border-transparent hover:border-primary/20 transition-all shadow-sm">
                        <div className="flex items-center gap-2 truncate">
                          <FileArchive className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="truncate font-bold text-[10px]">{file.name}</span>
                        </div>
                        <Button size="sm" variant="ghost" className="h-7 text-[9px] font-black uppercase text-primary hover:bg-primary/5" onClick={() => handleIndexLocalFile(file.name, file.size)}>Teach</Button>
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
        <DialogContent className="max-w-2xl border-4 border-primary/20 shadow-2xl">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="flex items-center gap-3 text-2xl font-black uppercase tracking-tighter text-primary">
              <BrainCircuit className="w-8 h-8" /> Private Intelligence Database
            </DialogTitle>
          </DialogHeader>
          <div className="p-8 bg-muted/20 rounded-2xl border-2 border-dashed font-mono text-[11px] whitespace-pre-wrap leading-relaxed max-h-[400px] overflow-y-auto custom-scrollbar">
            {learnedFactsSummary}
          </div>
          <div className="bg-primary/5 p-4 rounded-xl border flex gap-3 items-center">
             <Info className="w-5 h-5 text-primary shrink-0" />
             <p className="text-[10px] text-muted-foreground italic leading-snug">The text above is the "Raw Intelligence" passed to the AI models. Every scan incorporates these private facts to improve forensic accuracy.</p>
          </div>
          <DialogFooter className="mt-4">
            <Button onClick={() => setShowBrainViewer(false)} className="font-black uppercase tracking-widest w-full py-6 text-sm">Close Database Viewer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
