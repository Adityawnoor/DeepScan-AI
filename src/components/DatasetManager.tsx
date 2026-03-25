"use client"

import * as React from "react"
import { 
  Database, HardDrive, BrainCircuit, 
  Trash2, Upload, Gauge, Activity, Sparkles, Save, Info,
  AlertTriangle, Fingerprint, Zap, Brain, Download, Loader2,
  ShieldCheck, Globe, CheckCircle2, ChevronRight, FlaskConical,
  History, ShieldAlert, Search
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
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase"
import { collection, doc, setDoc, deleteDoc, query, orderBy, getDocs } from "firebase/firestore"
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
  const { user } = useUser()
  const [datasetNotes, setDatasetNotes] = React.useState<string>("")
  const [trainingLabel, setTrainingLabel] = React.useState<"real" | "fake">("fake")
  const [modelSignature, setModelSignature] = React.useState<string>("")
  const [showBrainViewer, setShowBrainViewer] = React.useState(false)
  const [isSyncing, setIsSyncing] = React.useState(false)
  const [isSeeding, setIsSeeding] = React.useState(false)
  const [syncStep, setSyncStep] = React.useState<string>("")
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const datasetsQuery = useMemoFirebase(() => (db && user) ? query(collection(db, "datasets"), orderBy("uploadDate", "desc")) : null, [db, user])
  const scansQuery = useMemoFirebase(() => (db && user) ? query(collection(db, "users", user.uid, "mediaFiles"), orderBy("timestamp", "desc")) : null, [db, user])
  
  const { data: datasets, isLoading: datasetsLoading } = useCollection(datasetsQuery)
  const { data: scans, isLoading: scansLoading } = useCollection(scansQuery)

  const isIframe = React.useMemo(() => {
    if (typeof window === 'undefined') return false;
    try { return window.self !== window.top; } catch (e) { return true; }
  }, []);

  const chartData = React.useMemo(() => {
    const evaluatedScans = [...(scans || [])].reverse().filter(s => s.userFeedback !== undefined)
    if (evaluatedScans.length === 0) return [{ name: "Start", accuracy: 85 }]
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

  const learnedFactsSummary = React.useMemo(() => {
    let summary = "### NEURAL INTELLIGENCE LOG (PATTERN DATABASE) ###\n\n"
    if ((datasets || []).length === 0 && (scans || []).length === 0) return "Cloud Intelligence Base is currently empty. Start investigations or seed data."
    
    ;(datasets || []).forEach(ds => summary += `[PATTERN]: ${ds.fileName}. Signature: ${ds.modelSignature || 'Generic'}. Origin: ${ds.status === 'learned' ? 'In-Field Scan' : 'Manual Upload'}.\n`)
    ;(scans || []).filter(s => s.userFeedback !== undefined).forEach(s => summary += `[AUDIT]: Case ${s.id.substring(0, 4)} confirmed ${s.userFeedback ? 'SYNTHETIC' : 'AUTHENTIC'}. Artifacts: ${s.userComment || 'None'}\n`)
    return summary
  }, [datasets, scans])

  const handleConnectLocalPC = async () => {
    if (isIframe) {
      toast({ variant: "destructive", title: "PC Vault Restriction", description: "Browser security blocks physical disk access in iframes. Please open DeepScan in a new tab." })
      return
    }
    try {
      const handle = await (window as any).showDirectoryPicker()
      onVaultChange(handle.name, handle)
      toast({ title: "Forensic Vault Linked", description: `Physical mirror active with: ${handle.name.toUpperCase()}` })
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      toast({ variant: "destructive", title: "Vault Connection Error", description: err.message })
    }
  }

  const seedMockForensicData = async () => {
    if (!db || !user) {
       toast({ variant: "destructive", title: "Authentication Required", description: "Wait for cloud session to initialize before seeding." })
       return
    }
    setIsSeeding(true)
    try {
      const patterns = [
        { id: 'p-gan-jitter', title: 'GAN Facial Jitter Signature', model: 'StyleGAN3', desc: 'Identified micro-shifts in ocular alignment during 12fps rendering.' },
        { id: 'p-rvc-vocal', title: 'RVC Vocal Ghosting', model: 'RVC v2', desc: 'Spectral gaps detected in mid-frequency vocal ranges characteristic of voice cloning.' },
        { id: 'p-diffusion-artifacts', title: 'Latent Diffusion Residue', model: 'Stable Diffusion XL', desc: 'High-frequency noise patterns identified in background gradients.' }
      ]

      for (const p of patterns) {
        await setDoc(doc(db, "datasets", p.id), {
          id: p.id,
          fileName: p.title,
          uploadDate: new Date().toISOString(),
          label: "fake",
          modelSignature: p.model,
          notes: p.desc,
          status: "learned",
          isPattern: true
        })
      }

      const alerts = [
        { id: 'a-viral-1', platform: 'X', contentSnippet: 'Viral AI-generated endorsement of unlicensed product.', viralVelocity: 92, forensicRisk: 'critical', originalSource: "Unknown Bot Farm", timestamp: new Date().toISOString(), status: "monitoring" },
        { id: 'a-viral-2', platform: 'YouTube', contentSnippet: 'Deepfake of tech CEO announcing fake airdrop.', viralVelocity: 78, forensicRisk: 'high', originalSource: "Suspected Sora Clone", timestamp: new Date().toISOString(), status: "verified_fake" }
      ]

      for (const a of alerts) {
        await setDoc(doc(db, "alerts", a.id), a)
      }

      const mockScans = [
        { 
          id: crypto.randomUUID(), 
          timestamp: new Date().toISOString(), 
          mediaType: 'image', 
          fileName: "Forensic_Case_Sample_01", 
          aiVerdict: true, 
          aiConfidence: 98, 
          fakeCategory: "Generative",
          explanation: "Inconsistent iris patterns and skin texture anomalies detected.",
          userId: user.uid
        },
        { 
          id: crypto.randomUUID(), 
          timestamp: new Date().toISOString(), 
          mediaType: 'video', 
          fileName: "Forensic_Case_Sample_02", 
          aiVerdict: false, 
          aiConfidence: 99, 
          fakeCategory: "Authentic",
          explanation: "High temporal stability and natural ocular biometrics verified.",
          userId: user.uid
        }
      ]

      for (const s of mockScans) {
        await setDoc(doc(db, "users", user.uid, "mediaFiles", s.id), s)
      }

      toast({ title: "Intelligence Base Seeded", description: "Global patterns and private investigation history committed to the Cloud." })
    } catch (e: any) {
      toast({ variant: "destructive", title: "Seeding Failed", description: e.message })
    } finally {
      setIsSeeding(false)
    }
  }

  const syncCloudToPCVault = async () => {
    if (!vaultHandle) {
      toast({ variant: "destructive", title: "Vault Unlinked", description: "You must connect your PC database folder first." })
      return
    }
    if (!db || !user) {
      toast({ variant: "destructive", title: "Session Error", description: "Forensic cloud session is not active. Check network." })
      return
    }
    
    setIsSyncing(true)
    setSyncStep("Initializing Cloud Extraction...")
    
    try {
      const backup: any = {
        meta: {
          timestamp: new Date().toISOString(),
          authority: "DeepScan AI Forensic Engine",
          userId: user.uid,
          version: "V3.1.0-HYBRID",
          integrityHash: crypto.randomUUID()
        },
        collections: {
          patterns: [],
          sentinelAlerts: [],
          personalScans: [],
          forensicLedger: []
        }
      }

      setSyncStep("Extracting Global Patterns...")
      const dsSnap = await getDocs(collection(db, "datasets"))
      backup.collections.patterns = dsSnap.docs.map(d => ({ id: d.id, ...d.data() }))

      setSyncStep("Extracting Sentinel Alerts...")
      const alSnap = await getDocs(collection(db, "alerts"))
      backup.collections.sentinelAlerts = alSnap.docs.map(d => ({ id: d.id, ...d.data() }))

      setSyncStep("Extracting Forensic Ledger...")
      const ldSnap = await getDocs(collection(db, "ledger"))
      backup.collections.forensicLedger = ldSnap.docs.map(d => ({ id: d.id, ...d.data() }))

      setSyncStep("Extracting Private Investigation Casefiles...")
      const scSnap = await getDocs(collection(db, "users", user.uid, "mediaFiles"))
      backup.collections.personalScans = scSnap.docs.map(d => ({ id: d.id, ...d.data() }))

      const totalRecords = backup.collections.patterns.length + backup.collections.sentinelAlerts.length + backup.collections.personalScans.length
      
      if (totalRecords === 0) {
        throw new Error("No data found in Cloud DB to download. Seed data first.")
      }

      setSyncStep(`Writing ${totalRecords} records to PC disk...`)
      const fileName = `DEEPSCAN_SNAPSHOT_${new Date().toISOString().replace(/:/g, '-')}.json`
      const fileHandle = await vaultHandle.getFileHandle(fileName, { create: true })
      const writable = await (fileHandle as any).createWritable()
      await writable.write(JSON.stringify(backup, null, 2))
      await writable.close()

      toast({ 
        title: "Intelligence Transfer Successful", 
        description: `Cryptographic snapshot (${totalRecords} items) saved to ${vaultHandle.name}.` 
      })
    } catch (e: any) {
      console.error(e)
      toast({ variant: "destructive", title: "Transfer Interrupted", description: e.message || "Failed to package cloud intelligence." })
    } finally {
      setIsSyncing(false)
      setSyncStep("")
    }
  }

  const handleManualIngestion = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!db || !user) return
    const file = e.target.files?.[0]
    if (!file || !datasetNotes.trim()) {
      toast({ variant: "destructive", title: "Missing Data", description: "Forensic notes and pattern sample required." })
      return
    }
    try {
      const datasetId = crypto.randomUUID()
      const datasetRef = doc(db, "datasets", datasetId)
      const datasetData = { 
        id: datasetId,
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
      await setDoc(datasetRef, datasetData)
      setDatasetNotes("")
      setModelSignature("")
      toast({ title: "Pattern Ingested", description: "Malicious signature learned and persisted." })
    } catch (err: any) {
      toast({ variant: "destructive", title: "Ingestion Failed", description: err.message })
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-primary/5 border-primary/20 shadow-none rounded-2xl volumetric-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Gauge className="w-4 h-4 text-primary" />
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Neural Precision</p>
            </div>
            <p className="text-4xl font-black text-primary">{currentAccuracy}%</p>
            <p className="mt-2 text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Self-Improvement Protocol: ACTIVE</p>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20 border-dashed border-2 flex items-center justify-center p-6 text-center cursor-pointer rounded-2xl hover:bg-primary/10 transition-all hover-glow" onClick={() => setShowBrainViewer(true)}>
          <div className="space-y-1">
             <BrainCircuit className="w-8 h-8 text-primary mx-auto" />
             <p className="text-sm font-black text-primary uppercase tracking-tighter">View Knowledge Base</p>
             <p className="text-[9px] text-muted-foreground">{(datasets?.length || 0) + (scans?.length || 0)} Cloud Records</p>
          </div>
        </Card>

        <Card 
          className={cn(
            "bg-muted border shadow-none rounded-2xl flex items-center justify-center p-6 text-center cursor-pointer transition-all duration-500", 
            vaultHandle ? "border-primary/40 bg-primary/5" : "hover:bg-muted/80 border-dashed border-2"
          )} 
          onClick={handleConnectLocalPC}
        >
          <div className="space-y-1">
             <HardDrive className={cn("w-8 h-8 mx-auto mb-2", vaultHandle ? "text-primary animate-pulse" : "text-muted-foreground")} />
             <p className={cn("text-sm font-black uppercase tracking-tighter", vaultHandle ? "text-primary" : "text-muted-foreground")}>
               {vaultHandle ? `VAULT: ${vaultHandle.name.toUpperCase()}` : "Link PC Vault"}
             </p>
             <p className="text-[8px] font-bold uppercase text-muted-foreground/60">
               {vaultHandle ? "PHYSICAL MIRROR ACTIVE" : "LOCAL DB UNLINKED"}
             </p>
          </div>
        </Card>

        <Card className="bg-primary/5 border-primary/20 shadow-none rounded-2xl flex flex-col items-center justify-center p-6 text-center">
            <div className="flex items-center gap-2 mb-2">
              <History className="w-4 h-4 text-primary" />
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">My Scans in Cloud</p>
            </div>
            <p className="text-3xl font-black text-foreground">{scans?.length || 0}</p>
            <p className="text-[8px] font-bold text-primary uppercase mt-1">Private Ledger Data</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
           <Card className="shadow-none border border-border rounded-2xl overflow-hidden volumetric-shadow">
            <CardHeader className="bg-muted/30 pb-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
               <div>
                  <CardTitle className="text-lg flex items-center gap-2 font-black uppercase tracking-tighter">
                    <Activity className="w-5 h-5 text-primary" /> Neural Intelligence Base
                  </CardTitle>
                  <CardDescription className="text-[10px] font-bold uppercase tracking-widest">Syncing Cloud Ledger with Physical Vault</CardDescription>
               </div>
                <div className="flex flex-wrap gap-2">
                   <Button 
                    variant="outline" 
                    size="sm" 
                    className={cn(
                      "rounded-xl font-black text-[10px] uppercase gap-2 h-10 px-6",
                      vaultHandle ? "border-primary text-primary hover:bg-primary/10" : "opacity-50"
                    )} 
                    onClick={syncCloudToPCVault}
                    disabled={isSyncing || !vaultHandle}
                   >
                    {isSyncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                    {isSyncing ? "Transferring..." : "Download Cloud DB to PC"}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="rounded-xl font-black text-[10px] uppercase gap-2 h-10 px-6 hover:bg-primary/10 text-primary border border-primary/20" 
                    onClick={seedMockForensicData}
                    disabled={isSeeding}
                  >
                    {isSeeding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FlaskConical className="w-3.5 h-3.5" />}
                    Seed Cloud with Intelligence
                  </Button>
                </div>
            </CardHeader>
            <CardContent className="pt-8">
              {isSyncing && (
                <div className="mb-8 p-6 bg-primary/5 border border-primary/20 rounded-2xl animate-in fade-in slide-in-from-top-4">
                  <div className="flex items-center gap-4 mb-3">
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                    <span className="text-[11px] font-black uppercase tracking-widest text-primary">{syncStep}</span>
                  </div>
                  <div className="w-full bg-muted h-1 rounded-full overflow-hidden">
                    <div className="bg-primary h-full animate-progress-indeterminate" />
                  </div>
                </div>
              )}

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
                <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" /> Cloud Signature Index
                </h4>
                <div className="border rounded-2xl overflow-hidden min-h-[200px]">
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
                      {datasetsLoading ? (
                        <TableRow><TableCell colSpan={4} className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></TableCell></TableRow>
                      ) : (!datasets || datasets.length === 0) ? (
                        <TableRow><TableCell colSpan={4} className="text-center py-12 text-[10px] font-bold text-muted-foreground uppercase opacity-30">Cloud Intelligence is empty. Use the "Seed" button above.</TableCell></TableRow>
                      ) : (
                        datasets.map((item) => (
                          <TableRow key={item.id} className={cn(item.status === 'learned' && "bg-primary/5")}>
                            <TableCell className="font-bold text-xs truncate max-w-[150px]">
                              {item.fileName}
                              {item.status === 'learned' && <Badge variant="default" className="ml-2 scale-75 text-[8px]">LEARNED</Badge>}
                            </TableCell>
                            <TableCell><Badge variant="outline" className="text-[9px] font-black uppercase px-2 rounded-lg border-primary/20">{item.modelSignature || 'Generic'}</Badge></TableCell>
                            <TableCell><span className="text-[9px] font-bold uppercase text-muted-foreground">{item.status === 'learned' ? 'In-Field Scan' : 'Manual Entry'}</span></TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => deleteDoc(doc(db!, "datasets", item.id))}>
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

        <Card className="lg:col-span-4 border border-border shadow-none rounded-2xl h-fit volumetric-shadow overflow-hidden">
          <CardHeader className="bg-muted/30 border-b">
            <CardTitle className="text-lg flex items-center gap-2 font-black uppercase tracking-tighter text-primary">
              <BrainCircuit className="w-5 h-5" /> Educate Neural Hub
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/10 flex items-start gap-3">
                 <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                 <p className="text-[9px] font-bold leading-relaxed text-destructive uppercase">Note: Only ingest verified samples to maintain Neural Hub integrity.</p>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">1. Model Signature</Label>
                <Input placeholder="e.g., StyleGAN3, Sora, RVC..." className="text-xs h-12 rounded-xl bg-background/50 font-bold uppercase" value={modelSignature} onChange={(e) => setModelSignature(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">2. Forensic Notes</Label>
                <Textarea placeholder="Describe artifact patterns observed..." className="text-xs min-h-[120px] rounded-xl bg-background/50" value={datasetNotes} onChange={(e) => setDatasetNotes(e.target.value)} />
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
                <Button className="w-full h-16 rounded-xl font-black uppercase tracking-widest shadow-lg bg-primary hover:bg-primary/90" onClick={() => fileInputRef.current?.click()}>
                  <Zap className="w-5 h-5 mr-3" /> Commit Pattern to Cloud
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showBrainViewer} onOpenChange={setShowBrainViewer}>
        <DialogContent className="max-w-2xl rounded-3xl border-2 border-primary/20 volumetric-shadow overflow-hidden p-0">
          <DialogHeader className="p-8 pb-0"><DialogTitle className="flex items-center gap-3 text-2xl font-black uppercase tracking-tighter text-primary"><BrainCircuit className="w-8 h-8" /> Neural Memory HUD</DialogTitle></DialogHeader>
          <div className="p-8 pt-4">
             <div className="p-8 bg-muted rounded-2xl border-dashed border font-mono text-[11px] whitespace-pre-wrap leading-relaxed max-h-[400px] overflow-y-auto no-scrollbar">
               {learnedFactsSummary}
             </div>
          </div>
          <DialogFooter className="p-8 pt-0"><Button onClick={() => setShowBrainViewer(false)} className="rounded-2xl font-black uppercase tracking-widest w-full h-14">Close HUD</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
