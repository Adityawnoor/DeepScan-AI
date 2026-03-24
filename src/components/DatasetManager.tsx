
"use client"

import * as React from "react"
import { 
  Database, HardDrive, FolderOpen, RefreshCcw, BrainCircuit, 
  FileJson, FileArchive, Activity, Gauge, AlertCircle, Info,
  Upload, CheckCircle2, XCircle, Trash2, FileVideo, FileAudio, FileImage,
  Download, ExternalLink, ShieldAlert, Settings2, LogOut, Sparkles
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
import { useFirestore, useCollection } from "@/firebase"
import { collection, doc, setDoc, deleteDoc, query, orderBy } from "firebase/firestore"
import { errorEmitter } from "@/firebase/error-emitter"
import { FirestorePermissionError } from "@/firebase/errors"

interface DatasetManagerProps {
  knowledgeCount: number
  onVaultChange: (folderName?: string, handle?: FileSystemDirectoryHandle) => void
  vaultHandle?: FileSystemDirectoryHandle | null
  vaultPermissionStatus?: 'granted' | 'denied' | 'prompt'
}

export function DatasetManager({ knowledgeCount, onVaultChange, vaultHandle, vaultPermissionStatus }: DatasetManagerProps) {
  const { toast } = useToast()
  const db = useFirestore()
  const [datasetNotes, setDatasetNotes] = React.useState<string>("")
  const [trainingLabel, setTrainingLabel] = React.useState<"real" | "fake">("fake")
  const [showBrainViewer, setShowBrainViewer] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const datasetsQuery = React.useMemo(() => db ? query(collection(db, "datasets"), orderBy("uploadDate", "desc")) : null, [db])
  const scansQuery = React.useMemo(() => db ? query(collection(db, "scans"), orderBy("timestamp", "desc")) : null, [db])
  
  const { data: datasets } = useCollection(datasetsQuery)
  const { data: scans } = useCollection(scansQuery)

  const isIframe = React.useMemo(() => {
    if (typeof window === 'undefined') return false;
    try {
      return window.self !== window.top;
    } catch (e) {
      return true;
    }
  }, []);

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
    const evaluatedScans = [...scans].reverse().filter(s => s.userFeedback !== undefined)
    if (evaluatedScans.length === 0) return []
    
    let correctCount = 0
    let evaluatedCount = 0
    return evaluatedScans.map((scan: any) => {
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
    let summary = "### NEURAL INTELLIGENCE LOG ###\n\n"
    datasets.filter(ds => ds.notes).forEach(ds => summary += `[DATASET: ${ds.fileName || 'Observation'}] Verified as: ${ds.label?.toUpperCase()}. Notes: ${ds.notes}\n`)
    scans.filter(s => s.userFeedback !== undefined).forEach(s => summary += `[AUDIT: ${s.id.substring(0, 4)}] Verified as ${s.userFeedback ? 'FAKE' : 'REAL'}. Artifacts: ${s.userComment || 'None'}\n`)
    return summary || "No forensic facts learned yet."
  }, [datasets, scans])

  const handleConnectLocalPC = async () => {
    if (isIframe) {
      toast({ 
        variant: "destructive", 
        title: "Security Policy Check", 
        description: "Folder access requires the app to be opened in a new tab." 
      })
      return
    }

    try {
      const handle = await (window as any).showDirectoryPicker()
      const dbRequest = indexedDB.open("DeepScanVaultDB", 1)
      dbRequest.onsuccess = () => {
        const idb = dbRequest.result
        const transaction = idb.transaction("vaultStore", "readwrite")
        const store = transaction.objectStore("vaultStore")
        store.put(handle, "localFolderHandle")
      }
      onVaultChange(handle.name, handle)
      toast({ title: "Vault Connected", description: `Dual-sync active with ${handle.name}` })
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      toast({ variant: "destructive", title: "Vault Access Blocked", description: err.message })
    }
  }

  const handleTrainingFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!db) return
    const file = e.target.files?.[0]
    if (!file) return

    if (!datasetNotes.trim()) {
      toast({ variant: "destructive", title: "Audit Notes Required", description: "Describe the artifacts for the Neural Engine." })
      return
    }

    try {
      // Dual-Write: Physical PC Vault
      if (vaultHandle && vaultPermissionStatus === 'granted') {
        const fileHandle = await vaultHandle.getFileHandle(`TRAINING_${file.name}`, { create: true })
        const writable = await (fileHandle as any).createWritable()
        await writable.write(file)
        await writable.close()
      }

      // Dual-Write: Cloud Brain (Firestore)
      const datasetId = crypto.randomUUID()
      const datasetRef = doc(db, "datasets", datasetId)
      const datasetData = {
        fileName: file.name,
        uploadDate: new Date().toISOString(),
        size: file.size,
        fileType: file.type,
        label: trainingLabel,
        notes: datasetNotes.trim(),
        status: "processed"
      }

      setDoc(datasetRef, datasetData).catch(async (err) => {
        const permissionError = new FirestorePermissionError({
          path: datasetRef.path,
          operation: 'create',
          requestResourceData: datasetData
        })
        errorEmitter.emit('permission-error', permissionError)
      })

      setDatasetNotes("")
      toast({ title: "Intelligence Ingested", description: `Neural Engine updated with ${trainingLabel.toUpperCase()} Ground Truth.` })
    } catch (err: any) {
      toast({ variant: "destructive", title: "Training Failed", description: err.message })
    }
  }

  const removeDatasetItem = (id: string) => {
    if (!db) return
    const datasetRef = doc(db, "datasets", id)
    deleteDoc(datasetRef).catch(async (err) => {
      const permissionError = new FirestorePermissionError({
        path: datasetRef.path,
        operation: 'delete'
      })
      errorEmitter.emit('permission-error', permissionError)
    })
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-primary/5 border-primary/20 shadow-none rounded-xl spatial-lift">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Gauge className="w-4 h-4 text-primary" />
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Neural Accuracy</p>
            </div>
            <p className="text-4xl font-black text-primary">{currentAccuracy}%</p>
            <p className="mt-2 text-[10px] text-muted-foreground font-bold">{scans.filter(s => s.userFeedback !== undefined).length} Expert Audits Performed</p>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20 border-dashed border-2 flex items-center justify-center p-6 text-center cursor-pointer rounded-xl hover:bg-primary/10 transition-all hover-glow" onClick={() => setShowBrainViewer(true)}>
          <div className="space-y-1">
             <BrainCircuit className="w-8 h-8 text-primary mx-auto" />
             <p className="text-sm font-black text-primary uppercase tracking-tighter">Neural Intelligence</p>
             <p className="text-[9px] text-muted-foreground">Monitor {knowledgeCount} Forensic Facts</p>
          </div>
        </Card>

        <Card className={cn(
          "bg-muted border border-border shadow-none rounded-xl flex items-center justify-center p-6 text-center cursor-pointer transition-all",
          vaultHandle ? "border-primary/50 bg-primary/5" : "hover:bg-muted/80"
        )} onClick={handleConnectLocalPC}>
          <div className="space-y-1">
             <FolderOpen className={cn("w-8 h-8 mx-auto mb-2", vaultHandle ? "text-primary" : "text-muted-foreground")} />
             <p className={cn("text-sm font-black uppercase tracking-tighter", vaultHandle ? "text-primary" : "text-muted-foreground")}>
               {vaultHandle ? vaultHandle.name.toUpperCase() : "Link PC Vault"}
             </p>
             <p className="text-[8px] font-bold uppercase text-muted-foreground/60">Persistent Physical Storage</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
           <Card className="shadow-none border border-border rounded-xl overflow-hidden volumetric-shadow">
            <CardHeader className="bg-muted/30 pb-4">
               <CardTitle className="text-lg flex items-center gap-2 font-black uppercase tracking-tighter">
                  <Activity className="w-5 h-5 text-primary" /> Forensic Intelligence Audit
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
                  <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Training Impact by Media</Label>
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
                <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Verified Training Samples (Dual-Sync)</h4>
                <div className="border rounded-xl overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead className="text-[10px] font-black">Sample</TableHead>
                        <TableHead className="text-[10px] font-black">Truth Label</TableHead>
                        <TableHead className="text-[10px] font-black">Expert Observations</TableHead>
                        <TableHead className="text-[10px] font-black text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {datasets.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-30">
                            Ingest samples to train the engine
                          </TableCell>
                        </TableRow>
                      ) : (
                        datasets.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-bold text-xs truncate max-w-[150px]">{item.fileName || "Audit Entry"}</TableCell>
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
            <CardTitle className="text-lg flex items-center gap-2 font-black uppercase tracking-tighter text-primary">
              <BrainCircuit className="w-5 h-5" /> Neural Education
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">1. Forensic Observation</Label>
                <Textarea 
                  placeholder="Identify specific artifacts the AI missed (e.g., metallic vocal resonances, skin pulse mismatches)..."
                  className="text-xs min-h-[140px] rounded-xl"
                  value={datasetNotes}
                  onChange={(e) => setDatasetNotes(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">2. Ground Truth Class</Label>
                <Select value={trainingLabel} onValueChange={(val: any) => setTrainingLabel(val)}>
                  <SelectTrigger className="rounded-xl font-bold uppercase text-[10px] h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="real" className="text-[10px] font-black uppercase">Verified Authentic</SelectItem>
                    <SelectItem value="fake" className="text-[10px] font-black uppercase text-destructive">Verified Synthetic</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 pt-4">
                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">3. Ingest Training Sample</Label>
                <input type="file" ref={fileInputRef} className="hidden" onChange={handleTrainingFileUpload} accept="video/*,audio/*,image/*" />
                <Button 
                  className="w-full h-16 rounded-xl font-black uppercase tracking-widest shadow-lg animate-pulse-ring relative overflow-visible"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-5 h-5 mr-3" /> Sync to Intelligence base
                </Button>
                <p className="text-[8px] text-center text-muted-foreground font-bold uppercase tracking-widest pt-3">
                  Training persists across Studio and Localhost via Cloud Sync.
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
              <BrainCircuit className="w-8 h-8" /> Neural Intelligence Log
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
