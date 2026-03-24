
"use client"

import * as React from "react"
import { 
  Database, HardDrive, FolderOpen, RefreshCcw, BrainCircuit, 
  FileJson, FileArchive, Activity, Gauge, AlertCircle, Info,
  Upload, CheckCircle2, XCircle, Trash2, FileVideo, FileAudio, FileImage
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { cn } from "@/lib/utils"

interface DatasetManagerProps {
  knowledgeCount: number
  onRefresh: (folderName?: string, handle?: FileSystemDirectoryHandle) => void
  vaultHandle?: FileSystemDirectoryHandle | null
}

export function DatasetManager({ knowledgeCount, onRefresh, vaultHandle }: DatasetManagerProps) {
  const { toast } = useToast()
  const [datasetNotes, setDatasetNotes] = React.useState<string>("")
  const [trainingLabel, setTrainingLabel] = React.useState<"real" | "fake">("fake")
  const [showBrainViewer, setShowBrainViewer] = React.useState(false)
  const [datasets, setDatasets] = React.useState<any[]>([])
  const [scans, setScans] = React.useState<any[]>([])
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const refreshLocalState = React.useCallback(() => {
    const savedDatasets = localStorage.getItem("deepscan-datasets")
    const savedScans = localStorage.getItem("deepscan-scans-metadata")
    if (savedDatasets) setDatasets(JSON.parse(savedDatasets))
    if (savedScans) setScans(JSON.parse(savedScans))
  }, [])

  React.useEffect(() => {
    refreshLocalState()
  }, [refreshLocalState])

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
    let evaluatedCount = 0
    return scans.filter(s => s.userFeedback !== undefined).map((scan: any) => {
      evaluatedCount++
      if (scan.aiVerdict === scan.userFeedback) correctCount++
      const accuracy = (correctCount / evaluatedCount) * 100
      return {
        name: new Date(scan.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        accuracy: Math.round(accuracy)
      }
    })
  }, [scans])

  const currentAccuracy = chartData.length > 0 ? chartData[chartData.length - 1].accuracy : 85

  const learnedFactsSummary = React.useMemo(() => {
    let summary = "### PRIVATE INTELLIGENCE LOG ###\n\n"
    datasets.filter(ds => ds.notes).forEach(ds => summary += `[DATASET: ${ds.fileName || 'Observation'}] Ground Truth: ${ds.label?.toUpperCase()}. Notes: ${ds.notes}\n`)
    scans.filter(s => s.userFeedback !== undefined).forEach(s => summary += `[AUDIT: ${s.id.substring(0, 4)}] Verified as ${s.userFeedback ? 'FAKE' : 'REAL'}. Artifacts: ${s.userComment || 'None'}\n`)
    return summary || "No forensic facts learned yet."
  }, [datasets, scans])

  async function verifyPermission(fileHandle: FileSystemHandle, readWrite: boolean) {
    const options: any = {}
    if (readWrite) {
      options.mode = 'readwrite'
    }
    if ((await fileHandle.queryPermission(options)) === 'granted') {
      return true
    }
    if ((await fileHandle.requestPermission(options)) === 'granted') {
      return true
    }
    return false
  }

  const handleConnectLocalPC = async () => {
    try {
      const handle = await (window as any).showDirectoryPicker()
      onRefresh(handle.name, handle)
      toast({ title: "Vault Connected", description: `Linked to ${handle.name}` })
    } catch (err: any) {
      toast({ variant: "destructive", title: "Access Denied" })
    }
  }

  const handleTrainingFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!datasetNotes.trim()) {
      toast({ variant: "destructive", title: "Missing Notes", description: "Please describe the forensic artifacts first." })
      return
    }

    try {
      // If vault is linked, try to save the file there
      if (vaultHandle) {
        const hasPermission = await verifyPermission(vaultHandle, true)
        if (hasPermission) {
          const fileHandle = await vaultHandle.getFileHandle(file.name, { create: true })
          const writable = await fileHandle.createWritable()
          await writable.write(file)
          await writable.close()
          toast({ title: "File Saved to PC", description: `"${file.name}" archived in local vault.` })
        }
      }

      const newDataset = {
        id: crypto.randomUUID(),
        fileName: file.name,
        uploadDate: new Date().toISOString(),
        size: file.size,
        fileType: file.type,
        label: trainingLabel,
        notes: datasetNotes.trim(),
        status: "processed"
      }

      const updated = [newDataset, ...datasets]
      setDatasets(updated)
      localStorage.setItem("deepscan-datasets", JSON.stringify(updated))
      setDatasetNotes("")
      onRefresh()
      toast({ title: "Neural Sample Ingested", description: `Knowledge updated with ${trainingLabel.toUpperCase()} ground truth.` })
    } catch (err: any) {
      toast({ variant: "destructive", title: "Upload Failed", description: err.message })
    }
  }

  const removeDatasetItem = (id: string) => {
    const updated = datasets.filter(d => d.id !== id)
    setDatasets(updated)
    localStorage.setItem("deepscan-datasets", JSON.stringify(updated))
    onRefresh()
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-primary/5 border-primary/20 shadow-none rounded-xl spatial-lift">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Gauge className="w-4 h-4 text-primary" />
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Forensic Accuracy</p>
            </div>
            <p className="text-4xl font-black text-primary">{currentAccuracy}%</p>
            <p className="mt-2 text-[10px] text-muted-foreground font-bold">{scans.filter(s => s.userFeedback !== undefined).length} Audited Cases</p>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20 border-dashed border-2 flex items-center justify-center p-6 text-center cursor-pointer rounded-xl hover:bg-primary/10 transition-all hover-glow" onClick={() => setShowBrainViewer(true)}>
          <div className="space-y-1">
             <BrainCircuit className="w-8 h-8 text-primary mx-auto" />
             <p className="text-sm font-black text-primary uppercase tracking-tighter">Neural Memory</p>
             <p className="text-[9px] text-muted-foreground">Explore {knowledgeCount} Forensic Facts</p>
          </div>
        </Card>

        <Card className={cn(
          "bg-muted border border-border shadow-none rounded-xl flex items-center justify-center p-6 text-center cursor-pointer transition-all",
          vaultHandle ? "border-primary/50 bg-primary/5" : "hover:bg-muted/80"
        )} onClick={handleConnectLocalPC}>
          <div className="space-y-1">
             <FolderOpen className={cn("w-8 h-8 mx-auto", vaultHandle ? "text-primary" : "text-muted-foreground")} />
             <p className={cn("text-sm font-black uppercase tracking-tighter", vaultHandle ? "text-primary" : "text-muted-foreground")}>
               {vaultHandle ? vaultHandle.name.toUpperCase() : "Link PC Vault"}
             </p>
             {vaultHandle && <p className="text-[8px] font-bold uppercase text-primary/60">Local Sync Active</p>}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
           <Card className="shadow-none border border-border rounded-xl overflow-hidden volumetric-shadow">
            <CardHeader className="bg-muted/30 pb-4">
               <CardTitle className="text-lg flex items-center gap-2 font-black uppercase tracking-tighter">
                  <Activity className="w-5 h-5 text-primary" /> Forensic Performance Audit
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="h-[250px] w-full">
                  <ChartContainer config={{ accuracy: { label: "Accuracy (%)", color: "hsl(var(--primary))" } }}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                      <XAxis dataKey="name" hide />
                      <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 9 }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line type="monotone" dataKey="accuracy" stroke="var(--color-accuracy)" strokeWidth={4} dot={{ r: 4 }} />
                    </LineChart>
                  </ChartContainer>
                </div>
                
                <div className="space-y-4">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Accuracy by Media</Label>
                  <div className="space-y-3">
                    {auditBreakdown.map(item => (
                      <div key={item.type} className="space-y-1">
                        <div className="flex justify-between text-[11px] font-bold">
                          <span className="text-muted-foreground">{item.type}</span>
                          <span className="text-primary">{item.accuracy}%</span>
                        </div>
                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${item.accuracy}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-12 space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Neural Training Samples</h4>
                <div className="border rounded-xl overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead className="text-[10px] font-black">Sample</TableHead>
                        <TableHead className="text-[10px] font-black">Label</TableHead>
                        <TableHead className="text-[10px] font-black">Observations</TableHead>
                        <TableHead className="text-[10px] font-black text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {datasets.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-30">
                            No research samples in vault
                          </TableCell>
                        </TableRow>
                      ) : (
                        datasets.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-bold text-xs truncate max-w-[150px]">{item.fileName || "Note Entry"}</TableCell>
                            <TableCell>
                              <Badge variant={item.label === 'fake' ? "destructive" : "default"} className="text-[9px] font-black uppercase px-2 rounded-lg">
                                {item.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-[10px] text-muted-foreground line-clamp-1 max-w-[200px]">{item.notes}</TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => removeDatasetItem(item.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="lg:col-span-4 border border-border shadow-none rounded-xl h-fit volumetric-shadow">
          <CardHeader className="bg-muted/30 border-b">
            <CardTitle className="text-lg flex items-center gap-2 font-black uppercase tracking-tighter">
              <BrainCircuit className="w-5 h-5 text-primary" /> Teach the Engine
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">1. Forensic Observations</Label>
                <Textarea 
                  placeholder="Describe specific artifacts (e.g., micro-latencies in lip movements)..."
                  className="text-xs min-h-[120px] rounded-xl"
                  value={datasetNotes}
                  onChange={(e) => setDatasetNotes(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">2. Truth Label</Label>
                <Select value={trainingLabel} onValueChange={(val: any) => setTrainingLabel(val)}>
                  <SelectTrigger className="rounded-xl font-bold uppercase text-[10px] h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="real" className="text-[10px] font-black uppercase">Verified Real</SelectItem>
                    <SelectItem value="fake" className="text-[10px] font-black uppercase text-destructive">Verified Fake</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 pt-4">
                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">3. Upload Sample</Label>
                <input type="file" ref={fileInputRef} className="hidden" onChange={handleTrainingFileUpload} accept="video/*,audio/*,image/*" />
                <Button 
                  className="w-full h-14 rounded-xl font-black uppercase tracking-widest animate-pulse-ring relative overflow-visible"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" /> Upload & Teach
                </Button>
                <p className="text-[8px] text-center text-muted-foreground font-bold uppercase tracking-widest pt-2">
                  Samples will be saved to your private local PC folder.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showBrainViewer} onOpenChange={setShowBrainViewer}>
        <DialogContent className="max-w-2xl rounded-2xl border-2 border-primary/20 volumetric-shadow">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-2xl font-black uppercase tracking-tighter text-primary">
              <BrainCircuit className="w-8 h-8" /> Private Intelligence Log
            </DialogTitle>
          </DialogHeader>
          <div className="p-8 bg-muted rounded-xl border-dashed border font-mono text-[11px] whitespace-pre-wrap leading-relaxed max-h-[400px] overflow-y-auto">
            {learnedFactsSummary}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowBrainViewer(false)} className="rounded-xl font-black uppercase tracking-widest w-full py-6">Close HUD</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
