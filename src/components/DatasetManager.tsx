
"use client"

import * as React from "react"
import { 
  Database, HardDrive, FolderOpen, RefreshCcw, BrainCircuit, 
  FileJson, FileArchive, Activity, Gauge, AlertCircle, Info
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
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
  const [datasetNotes, setDatasetNotes] = React.useState<string>("")
  const [showBrainViewer, setShowBrainViewer] = React.useState(false)
  const [localFiles, setLocalFiles] = React.useState<{ name: string, size: number }[]>([])
  const [exportedReports, setExportedReports] = React.useState<string[]>([])
  const [datasets, setDatasets] = React.useState<any[]>([])
  const [scans, setScans] = React.useState<any[]>([])

  React.useEffect(() => {
    const savedDatasets = localStorage.getItem("deepscan-datasets")
    const savedScans = localStorage.getItem("deepscan-scans-metadata")
    if (savedDatasets) setDatasets(JSON.parse(savedDatasets))
    if (savedScans) setScans(JSON.parse(savedScans))
  }, [])

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
    datasets.filter(ds => ds.notes).forEach(ds => summary += `[DATASET] ${ds.notes}\n`)
    scans.filter(s => s.userFeedback !== undefined).forEach(s => summary += `[AUDIT: ${s.id.substring(0, 4)}] Verified as ${s.userFeedback ? 'FAKE' : 'REAL'}\n`)
    return summary || "No forensic facts learned yet."
  }, [datasets, scans])

  const handleConnectLocalPC = async () => {
    try {
      const handle = await (window as any).showDirectoryPicker()
      onRefresh(handle.name, handle)
      toast({ title: "Vault Connected", description: `Linked to ${handle.name}` })
    } catch (err: any) {
      toast({ variant: "destructive", title: "Access Denied" })
    }
  }

  const handleAddKnowledge = () => {
    if (!datasetNotes.trim()) return
    const newDataset = {
      id: crypto.randomUUID(),
      uploadDate: new Date().toISOString(),
      label: "research",
      notes: datasetNotes.trim(),
    }
    const updated = [newDataset, ...datasets]
    setDatasets(updated)
    localStorage.setItem("deepscan-datasets", JSON.stringify(updated))
    setDatasetNotes("")
    onRefresh()
    toast({ title: "Knowledge Synthesized", description: "AI intelligence base updated." })
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-primary/5 border-primary/20 shadow-none rounded-none">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Gauge className="w-4 h-4 text-primary" />
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Forensic Accuracy</p>
            </div>
            <p className="text-4xl font-black text-primary">{currentAccuracy}%</p>
            <p className="mt-2 text-[10px] text-muted-foreground font-bold">{scans.filter(s => s.userFeedback !== undefined).length} Audited Cases</p>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20 border-dashed border-2 flex items-center justify-center p-6 text-center cursor-pointer rounded-none hover:bg-primary/10 transition-all" onClick={() => setShowBrainViewer(true)}>
          <div className="space-y-1">
             <BrainCircuit className="w-8 h-8 text-primary mx-auto" />
             <p className="text-sm font-black text-primary uppercase tracking-tighter">Neural Memory</p>
             <p className="text-[9px] text-muted-foreground">Explore {knowledgeCount} Forensic Facts</p>
          </div>
        </Card>

        <Card className="bg-muted border border-border shadow-none rounded-none flex items-center justify-center p-6 text-center cursor-pointer" onClick={handleConnectLocalPC}>
          <div className="space-y-1">
             <FolderOpen className="w-8 h-8 text-muted-foreground mx-auto" />
             <p className="text-sm font-black text-muted-foreground uppercase tracking-tighter">Link PC Vault</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
           <Card className="shadow-none border border-border rounded-none overflow-hidden">
            <CardHeader className="bg-muted/30 pb-4">
               <CardTitle className="text-lg flex items-center gap-2">
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
                        <div className="h-2 w-full bg-muted rounded-none overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${item.accuracy}%` }} />
                        </div>
                      </div>
                    ))}
                    {chartData.length === 0 && (
                      <div className="p-4 rounded-none border border-dashed text-center space-y-2">
                        <AlertCircle className="w-6 h-6 mx-auto text-muted-foreground opacity-30" />
                        <p className="text-[10px] text-muted-foreground">Perform an audit to populate data.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="lg:col-span-4 border border-border shadow-none rounded-none h-fit">
          <CardHeader className="bg-muted/30 border-b">
            <CardTitle className="text-lg flex items-center gap-2">
              <Database className="w-5 h-5 text-primary" /> Teach the Engine
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">New Expert Observation</Label>
              <Textarea 
                placeholder="Describe specific artifacts for the AI to learn..."
                className="text-xs min-h-[120px] rounded-none"
                value={datasetNotes}
                onChange={(e) => setDatasetNotes(e.target.value)}
              />
            </div>
            <Button className="w-full h-12 rounded-none font-black uppercase tracking-widest" onClick={handleAddKnowledge}>
              Update Intelligence
            </Button>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showBrainViewer} onOpenChange={setShowBrainViewer}>
        <DialogContent className="max-w-2xl rounded-none border-2 border-primary/20">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-2xl font-black uppercase tracking-tighter text-primary">
              <BrainCircuit className="w-8 h-8" /> Private Intelligence Log
            </DialogTitle>
          </DialogHeader>
          <div className="p-8 bg-muted rounded-none border-dashed border font-mono text-[11px] whitespace-pre-wrap leading-relaxed max-h-[400px] overflow-y-auto">
            {learnedFactsSummary}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowBrainViewer(false)} className="rounded-none font-black uppercase tracking-widest w-full py-6">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
