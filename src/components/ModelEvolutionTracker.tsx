
"use client"

import * as React from "react"
import { 
  Line, LineChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, 
  Tooltip, Legend, Area, AreaChart, Bar, BarChart
} from "recharts"
import { 
  TrendingUp, Activity, Cpu, BrainCircuit, 
  History, Fingerprint, Zap, AlertTriangle, Search, Info,
  LineChart as LineChartIcon, BarChart3, Microscope
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { useFirestore, useCollection } from "@/firebase"
import { collection, query, orderBy, limit } from "firebase/firestore"
import { cn } from "@/lib/utils"

export function ModelEvolutionTracker() {
  const db = useFirestore()
  const scansQuery = React.useMemo(() => db ? query(collection(db, "scans"), orderBy("timestamp", "asc")) : null, [db])
  const { data: scans } = useCollection(scansQuery)

  const evolutionData = React.useMemo(() => {
    if (scans.length === 0) return []
    
    // Group scans by date (day)
    const days: Record<string, any> = {}
    
    scans.forEach(scan => {
      const date = new Date(scan.timestamp).toLocaleDateString()
      if (!days[date]) {
        days[date] = { 
          date, 
          gan: 0, 
          diffusion: 0, 
          vocoder: 0, 
          other: 0, 
          avgConfidence: 0, 
          count: 0 
        }
      }
      
      const family = (scan.neuralAncestry?.modelFamily || "").toLowerCase()
      if (family.includes('gan')) days[date].gan++
      else if (family.includes('diffusion')) days[date].diffusion++
      else if (family.includes('vocoder') || family.includes('neural')) days[date].vocoder++
      else days[date].other++
      
      days[date].avgConfidence += scan.aiConfidence || 0
      days[date].count++
    })

    return Object.values(days).map(day => ({
      ...day,
      avgConfidence: Math.round(day.avgConfidence / day.count)
    }))
  }, [scans])

  const modelStats = React.useMemo(() => {
    const stats: Record<string, { count: number, avgConfidence: number, latestConfidence: number }> = {}
    
    scans.forEach(scan => {
      const model = scan.neuralAncestry?.likelyModel || "Unknown"
      if (!stats[model]) stats[model] = { count: 0, avgConfidence: 0, latestConfidence: 0 }
      stats[model].count++
      stats[model].avgConfidence += scan.aiConfidence || 0
      stats[model].latestConfidence = scan.aiConfidence || 0
    })

    return Object.entries(stats).map(([name, s]) => ({
      name,
      count: s.count,
      avgConfidence: Math.round(s.avgConfidence / s.count),
      latestConfidence: s.latestConfidence,
      risk: s.latestConfidence < 80 ? 'High Evasion' : 'Controlled'
    })).sort((a, b) => b.count - a.count)
  }, [scans])

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-primary/5 border-primary/20 shadow-none rounded-2xl volumetric-shadow spatial-lift">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Cpu className="w-4 h-4 text-primary" />
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Active Model Profiles</p>
            </div>
            <p className="text-3xl font-black text-foreground">{modelStats.length}</p>
            <p className="text-[9px] font-bold text-primary uppercase mt-1">Neural Ancestry Map Active</p>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20 shadow-none rounded-2xl volumetric-shadow spatial-lift">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-primary" />
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Global Evasion Risk</p>
            </div>
            <p className="text-3xl font-black text-destructive">
              {modelStats.filter(s => s.latestConfidence < 85).length > 0 ? "HIGH" : "LOW"}
            </p>
            <p className="text-[9px] font-bold text-muted-foreground uppercase mt-1">Based on detection bypass trends</p>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20 shadow-none rounded-2xl volumetric-shadow spatial-lift">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Dominant Threat</p>
            </div>
            <p className="text-xl font-black text-foreground truncate uppercase">{modelStats[0]?.name || "N/A"}</p>
            <p className="text-[9px] font-bold text-primary uppercase mt-1">{modelStats[0]?.count || 0} Detections In Cycle</p>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20 shadow-none rounded-2xl volumetric-shadow spatial-lift">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Microscope className="w-4 h-4 text-primary" />
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Intelligence Latency</p>
            </div>
            <p className="text-3xl font-black text-foreground">0.8ms</p>
            <p className="text-[9px] font-bold text-muted-foreground uppercase mt-1">Real-time signature matching</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          <Card className="border border-border shadow-none rounded-2xl volumetric-shadow overflow-hidden">
            <CardHeader className="bg-muted/30 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-black uppercase tracking-tighter flex items-center gap-2">
                  <LineChartIcon className="w-5 h-5 text-primary" />
                  Neural Evolution Analytics
                </CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest">Signature distribution & evasion trends</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pt-10">
              <div className="h-[350px] w-full">
                <ChartContainer config={{ 
                  gan: { label: "GAN Models", color: "hsl(var(--primary))" },
                  diffusion: { label: "Diffusion Models", color: "hsl(var(--chart-2))" },
                  vocoder: { label: "Vocoders", color: "hsl(var(--destructive))" },
                  avgConfidence: { label: "Avg Confidence", color: "hsl(var(--muted-foreground))" }
                }}>
                  <AreaChart data={evolutionData}>
                    <defs>
                      <linearGradient id="colorGan" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-gan)" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="var(--color-gan)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                    <XAxis dataKey="date" hide />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9 }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area type="monotone" dataKey="gan" stroke="var(--color-gan)" fillOpacity={1} fill="url(#colorGan)" strokeWidth={3} />
                    <Area type="monotone" dataKey="diffusion" stroke="var(--color-diffusion)" fillOpacity={0} strokeWidth={3} />
                    <Area type="monotone" dataKey="vocoder" stroke="var(--color-vocoder)" fillOpacity={0} strokeWidth={3} strokeDasharray="5 5" />
                    <Line type="monotone" dataKey="avgConfidence" stroke="var(--color-avgConfidence)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <Card className="border border-border shadow-none rounded-2xl h-full volumetric-shadow">
            <CardHeader className="bg-muted/30 border-b">
              <CardTitle className="text-lg font-black uppercase tracking-tighter text-primary flex items-center gap-2">
                <BrainCircuit className="w-5 h-5" /> Signature Registry
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 no-scrollbar">
                {modelStats.map((stat, i) => (
                  <div key={i} className="p-4 rounded-xl border bg-card hover:border-primary/30 transition-all group">
                    <div className="flex justify-between items-start mb-3">
                       <div className="space-y-1">
                         <p className="text-[12px] font-black uppercase tracking-tighter text-foreground group-hover:text-primary transition-colors">{stat.name}</p>
                         <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">{stat.count} Forensic Cases</p>
                       </div>
                       <Badge variant={stat.latestConfidence < 85 ? "destructive" : "outline"} className="text-[8px] px-2 h-4 rounded-md">
                         {stat.risk}
                       </Badge>
                    </div>
                    <div className="space-y-2">
                       <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                         <span>Detection Confidence</span>
                         <span>{stat.latestConfidence}%</span>
                       </div>
                       <Progress value={stat.latestConfidence} className={cn("h-1.5", stat.latestConfidence < 85 ? "[&>div]:bg-destructive" : "[&>div]:bg-primary")} />
                    </div>
                  </div>
                ))}
                {modelStats.length === 0 && (
                  <div className="p-10 text-center border-2 border-dashed rounded-xl opacity-30">
                    <Search className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-[10px] font-black uppercase tracking-widest">No Signatures Logged</p>
                  </div>
                )}
              </div>

              <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 flex items-start gap-3">
                <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p className="text-[10px] font-medium leading-relaxed text-muted-foreground">
                  The **Neural Arms Race** tracker identifies models that are becoming harder for AI to detect, allowing you to prioritize training datasets for those specific signatures.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
