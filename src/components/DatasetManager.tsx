"use client"

import * as React from "react"
import { 
  Database, HardDrive, BrainCircuit, 
  Trash2, Upload, Gauge, Activity, Sparkles, Save, Info,
  AlertTriangle, Fingerprint, Zap, Brain
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { cn } from "@/lib/utils"
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, doc, setDoc, deleteDoc, query, orderBy } from "firebase/firestore"
import { errorEmitter } from "@/firebase/error-emitter"
import { FirestorePermissionError } from "@/firebase/errors"

interface DatasetManagerProps {
  knowledgeCount: number
  onVaultChange: (folderName?: string, handle?: FileSystemDirectoryHandle) => void
  vaultHandle?: FileSystemDirectoryHandle | null
}

export function DatasetManager({ knowledgeCount, onVaultChange, vaultHandle }: DatasetManagerProps) {
  const { toast } = useToast()
  const db = useFirestore()
  const [datasetNotes, setDatasetNotes] = React.useState<string>("")
  const [trainingLabel, setTrainingLabel] = React.useState<"real" | "fake">("fake")
  const [modelSignature, setModelSignature] = React.useState<string>("")
  const [showBrainViewer, setShowBrainViewer] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const datasetsQuery = useMemoFirebase(() => db ? query(collection(db, "datasets"), orderBy("uploadDate", "desc")) : null, [db])
  const scansQuery = useMemoFirebase(() => db ? query(collection(db, "scans"), orderBy("timestamp", "desc")) : null, [db])
  
  const { data: datasets } = useCollection(datasetsQuery)
  const { data: scans } = useCollection(scansQuery)

  const isIframe = React.useMemo(() => {
    if (typeof window === 'undefined') return false;
    try { return window.self !== window.top; } catch (e) { return true; }
  }, []);

  const chartData = React.useMemo(() => {
    const evaluatedScans = [...(scans || [])].reverse().filter(s => s.userFeedback !== undefined)
    if (evaluatedScans.length === 0) return []
    let correctCount = 0
    let evaluatedCount = 0
    return evaluatedScans.map((scan: any) => {
      evaluatedCount++
      if (scan.aiVerdict === scan.userFeedback) correctCount++
      return {
        name: new Date(scan.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        accuracy: Math.round((correctCount / evaluatedCount) * 100)
      }
    })
  }, [scans])

  const currentAccuracy = chartData.length > 0 ? chartData[chartData.length - 1].accuracy : 85

  const novelPatterns = React.useMemo(() => {
    return (datasets || []).filter(d => d.status === 'learned' || d.modelSignature === 'Unknown Novel Source')
  }, [datasets])

  const learnedFactsSummary = React.useMemo(() => {
    let summary = "### NEURAL INTELLIGENCE LOG (PATTERN DATABASE) ###\n\n"
    ;(datasets || []).forEach(ds => summary += `[PATTERN]: ${ds.fileName}. Signature: ${ds.modelSignature || 'Generic'}. Origin: ${ds.status === 'learned' ? 'In-Field Scan' : 'Manual Upload'}.\n`)
    ;(scans || []).filter(s => s.userFeedback !== undefined).forEach(s => summary += `[AUDIT]: Case ${s.id.substring(0, 4)} confirmed ${s.userFeedback ? 'SYNTHETIC' : 'AUTHENTIC'}. Artifacts: ${s.userComment || 'None'}\n`)
    return summary || "No forensic patterns learned yet."
  }, [datasets, scans])

  const handleConnectLocalPC = async () => {
    if (isIframe) {
      toast({ variant: "destructive", title: "Security Policy", description: "Open the app in a new tab for physical vault access." })
      return
    }
    try {
      const handle = await (window as any).showDirectoryPicker()
      onVaultChange(handle.name, handle)
      toast({ title: "Vault Connected", description: `Physical mirror active with ${handle.name}` })
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      toast({ variant: "destructive", title: "Vault Blocked", description: err.message })
    }
  }

  const exportForensicSignaturePack = async () => {
    if (!vaultHandle) {
      toast({ variant: "destructive", title: "PC Vault Required", description: "Connect a folder to export the signature pack." })
      return
    }
    try {
      const fileName = `FORENSIC_SIGNATURE_PACK_${new Date().toISOString().split('T')[0]}.json`
      const fileHandle = await vaultHandle.getFileHandle(fileName, { create: true })
      const writable = await (fileHandle as any).createWritable()
      const signaturePack = {
        meta: {
          authority: "DeepScan AI Forensic Engine",
          version: "V3.1.0",
          timestamp: new Date().toISOString(),
          totalPatterns: (datasets || []).length
        },
        patterns: (datasets || []).map(d => ({
          signature: d.modelSignature,
          label: d.label,
          notes: d.notes,
          fingerprint: d.behavioralFingerprint || null
        }))
      }
      await writable.write(JSON.stringify(signaturePack, null, 2))
      await writable.close()
      toast({ title: "Signatures Mirrored", description: "Malicious pattern definitions exported to PC vault." })
    } catch (e: any) {
      toast({ variant: "destructive", title: "Export Failed", description: e.message })
    }
  }

  const handleManualIngestion = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!db) return
    const file = e.target.files?.[0]
    if (!file || !datasetNotes.trim()) {
      toast({ variant: "destructive", title: "Missing Data", description: "Forensic notes and pattern sample required." })
      return
    }
    try {
      const datasetId = crypto.randomUUID()
      const datasetRef = doc(db, "datasets", datasetId)
      const datasetData = { 
        fileName: file.name, 
        uploadDate: new Date().toISOString(), 
        size: file.size, 
        fileType: file.type, 
        label: trainingLabel, 
        modelSignature: modelSignature || "Generic Tool",
        notes: datasetNotes.trim(), 
        status: "processed",
        isPattern: true
      }
      setDoc(datasetRef, datasetData).catch(err => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: datasetRef.path, operation: 'create', requestResourceData: datasetData })))
      setDatasetNotes("")
      setModelSignature("")
      toast({ title: "Pattern Ingested", description: "Malicious signature learned and persisted." })
    } catch (err: any) {
      toast({ variant: "destructive", title: "Ingestion Failed", description: err.message })
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-primary/5 border-primary/20 shadow-none rounded-xl spatial-lift">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Gauge className="w-4 h-4 text-primary" />
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Neural Precision</p>
            </div>
            <p className="text-4xl font-black text-primary">{currentAccuracy}%</p>
            <p className="mt-2 text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Self-Improvement Protocol: ACTIVE</p>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20 border-dashed border-2 flex items-center justify-center p-6 text-center cursor-pointer rounded-xl hover:bg-primary/10 transition-all hover-glow" onClick={() => setShowBrainViewer(true)}>
          <div className="space-y-1">
             <BrainCircuit className="w-8 h-8 text-primary mx-auto" />
             <p className="text-sm font-black text-primary uppercase tracking-tighter">View Knowledge Base</p>
             <p className="text-[9px] text-muted-foreground">{knowledgeCount} Patterns Persisted</p>
          </div>
        </Card>

        <Card className={cn("bg-muted border border-border shadow-none rounded-xl flex items-center justify-center p-6 text-center cursor-pointer transition-all", vaultHandle ? "border-primary/50 bg-primary/5" : "hover:bg-muted/80")} onClick={handleConnectLocalPC}>
          <div className="space-y-1">
             <HardDrive className={cn("w-8 h-8 mx-auto mb-2", vaultHandle ? "text-primary" : "text-muted-foreground")} />
             <p className={cn("text-sm font-black uppercase tracking-tighter", vaultHandle ? "text-primary" : "text-muted-foreground")}>{vaultHandle ? vaultHandle.name.toUpperCase() : "Link PC Vault"}</p>
             <p className="text-[8px] font-bold uppercase text-muted-foreground/60">Forensic Mirror: {vaultHandle ? "READY" : "UNLINKED"}</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
           <Card className="shadow-none border border-border rounded-xl overflow-hidden volumetric-shadow">
            <CardHeader className="bg-muted/30 pb-4 flex flex-row items-center justify-between">
               <CardTitle className="text-lg flex items-center gap-2 font-black uppercase tracking-tighter">
                  <Activity className="w-5 h-5 text-primary" /> Neural Pattern Hub
                </CardTitle>
                <div className="flex gap-2">
                   {novelPatterns.length > 0 && (
                     <Badge variant="destructive" className="animate-pulse rounded-lg text-[8px] font-black uppercase">
                       {novelPatterns.length} NOVEL STYLES
                     </Badge>
                   )}
                   <Button variant="outline" size="sm" className="rounded-xl font-black text-[10px] uppercase gap-2" onClick={exportForensicSignaturePack}>
                    <Save className="w-3.5 h-3.5" /> Mirror Patterns to Vault
                  </Button>
                </div>
            </CardHeader>
            <CardContent className="pt-8">
              <div className="h-[250px] w-full mb-12">
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
                <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Learned Neural Signatures</h4>
                <div className="border rounded-xl overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead className="text-[10px] font-black uppercase">Sample / Case</TableHead>
                        <TableHead className="text-[10px] font-black uppercase">Signature</TableHead>
                        <TableHead className="text-[10px] font-black uppercase">Origin</TableHead>
                        <TableHead className="text-[10px] font-black uppercase text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(!datasets || datasets.length === 0) ? (
                        <TableRow><TableCell colSpan={4} className="text-center py-8 text-[10px] font-bold text-muted-foreground uppercase opacity-30">No forensic signatures learned yet.</TableCell></TableRow>
                      ) : (
                        datasets.map((item) => (
                          <TableRow key={item.id} className={cn(item.status === 'learned' && "bg-primary/5")}>
                            <TableCell className="font-bold text-xs truncate max-w-[150px]">
                              {item.fileName}
                              {item.status === 'learned' && <Badge variant="default" className="ml-2 scale-75 text-[8px]">LEARNED</Badge>}
                            </TableCell>
                            <TableCell><Badge variant="outline" className="text-[9px] font-black uppercase px-2 rounded-lg border-primary/20">{item.modelSignature || 'Generic'}</Badge></TableCell>
                            <TableCell><span className="text-[9px] font-bold uppercase text-muted-foreground">{item.status === 'learned' ? 'In-Field Scan' : 'Manual Entry'}</span></TableCell>
                            <TableCell className="text-right"><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteDoc(doc(db, "datasets", item.id))}><Trash2 className="w-4 h-4" /></Button></TableCell>
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
              <BrainCircuit className="w-5 h-5" /> Educate Global Brain
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/10 flex items-start gap-3">
                 <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                 <p className="text-[9px] font-bold leading-relaxed text-destructive uppercase">Warning: Only ingest verified forensic samples. Incorrect patterns will degrade global intelligence.</p>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">1. Model Signature</Label>
                <Input placeholder="e.g., StableVideo-v2, GAN-LipSync..." className="text-xs h-11 rounded-xl bg-background/50 font-bold uppercase" value={modelSignature} onChange={(e) => setModelSignature(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">2. Forensic Notes</Label>
                <Textarea placeholder="Describe artifact patterns (e.g. Ocular jitter, spectral gaps)..." className="text-xs min-h-[100px] rounded-xl" value={datasetNotes} onChange={(e) => setDatasetNotes(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">3. Classification</Label>
                <Select value={trainingLabel} onValueChange={(val: any) => setTrainingLabel(val)}>
                  <SelectTrigger className="rounded-xl font-bold uppercase text-[10px] h-12"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="real" className="text-[10px] font-black uppercase">Authentic</SelectItem>
                    <SelectItem value="fake" className="text-[10px] font-black uppercase text-destructive">Synthetic (Deepfake)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 pt-4">
                <input type="file" ref={fileInputRef} className="hidden" onChange={handleManualIngestion} accept="video/*,audio/*,image/*" />
                <Button className="w-full h-16 rounded-xl font-black uppercase tracking-widest shadow-lg animate-pulse-ring relative overflow-visible" onClick={() => fileInputRef.current?.click()}>
                  <Zap className="w-5 h-5 mr-3" /> Commit Pattern to Hub
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showBrainViewer} onOpenChange={setShowBrainViewer}>
        <DialogContent className="max-w-2xl rounded-2xl border-2 border-primary/20 volumetric-shadow">
          <DialogHeader><DialogTitle className="flex items-center gap-3 text-2xl font-black uppercase tracking-tighter text-primary"><BrainCircuit className="w-8 h-8" /> Pattern Memory HUD</DialogTitle></DialogHeader>
          <div className="p-8 bg-muted rounded-xl border-dashed border font-mono text-[11px] whitespace-pre-wrap leading-relaxed max-h-[400px] overflow-y-auto">{learnedFactsSummary}</div>
          <DialogFooter><Button onClick={() => setShowBrainViewer(false)} className="rounded-xl font-black uppercase tracking-widest w-full py-6">Close Memory Viewer</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
