
"use client"

import * as React from "react"
import { 
  Globe, Radio, ShieldAlert, Zap, TrendingUp, 
  ExternalLink, Twitter, Youtube, Instagram, 
  AlertTriangle, CheckCircle2, Loader2, RefreshCw,
  Search, Eye, ShieldCheck, Activity, UserX
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import { useFirestore, useCollection } from "@/firebase"
import { collection, doc, setDoc, query, orderBy, limit } from "firebase/firestore"
import { cn } from "@/lib/utils"

export function SocialMonitor() {
  const { toast } = useToast()
  const db = useFirestore()
  const [isScanning, setIsScanning] = React.useState(false)
  
  const alertsQuery = React.useMemo(() => 
    db ? query(collection(db, "alerts"), orderBy("timestamp", "desc"), limit(20)) : null, 
  [db])

  const identitiesQuery = React.useMemo(() => 
    db ? query(collection(db, "identities")) : null, 
  [db])
  
  const { data: alerts } = useCollection(alertsQuery)
  const { data: identities } = useCollection(identitiesQuery)

  const runSentinelScan = async () => {
    if (!db) return
    setIsScanning(true)
    
    await new Promise(r => setTimeout(r, 2500))
    
    const mockAlerts = [
      {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        platform: "X",
        contentSnippet: "Viral video of political figure 'endorsing' new crypto scheme. 50k+ retweets.",
        viralVelocity: 88,
        forensicRisk: "critical",
        originalSource: "Unknown AI Farm",
        status: "monitoring"
      },
      {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        platform: "YouTube",
        contentSnippet: "Suspicious 'live' stream of CEO discussing quarterly losses with audio artifacts.",
        viralVelocity: 45,
        forensicRisk: "high",
        originalSource: "Suspected RVC v2 Clone",
        status: "verified_fake"
      }
    ]

    // Simulate identity theft detection
    if (identities.length > 0) {
      const targetId = identities[0]
      mockAlerts.push({
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        platform: "Instagram",
        contentSnippet: `High-precision deepfake of identity match [${targetId.identityName}] detected in suspicious skincare ad.`,
        viralVelocity: 95,
        forensicRisk: "critical",
        originalSource: "GAN FaceSwap Model",
        status: "identity_theft",
        matchedIdentityId: targetId.id
      } as any)
    }

    try {
      for (const alert of mockAlerts) {
        await setDoc(doc(db, "alerts", alert.id), alert)
      }
      toast({ 
        title: "Sentinel Scan Complete", 
        description: identities.length > 0 ? "Potential identity misuse detected in trending feeds." : "Viral deepfakes identified and synced." 
      })
    } catch (e) {
      console.error(e)
    } finally {
      setIsScanning(false)
    }
  }

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'X': return <Twitter className="w-4 h-4" />
      case 'YouTube': return <Youtube className="w-4 h-4" />
      case 'Instagram': return <Instagram className="w-4 h-4" />
      default: return <Globe className="w-4 h-4" />
    }
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'critical': return 'text-destructive'
      case 'high': return 'text-orange-500'
      case 'medium': return 'text-yellow-500'
      default: return 'text-primary'
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <div className="lg:col-span-4 space-y-6">
        <Card className="border border-primary/20 bg-primary/5 shadow-none rounded-2xl volumetric-shadow overflow-hidden">
          <CardHeader className="bg-primary/10 border-b p-6">
            <CardTitle className="flex items-center gap-2 text-xl font-black uppercase tracking-tighter">
              <Radio className="w-6 h-6 text-primary animate-pulse" />
              GLOBAL SENTINEL
            </CardTitle>
            <CardDescription className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Viral Deepfake Monitoring Bot
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-4">
              <div className="flex justify-between items-end mb-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-primary">Identity Vault Sync</p>
                <span className="text-xl font-black">{identities.length} Profiles</span>
              </div>
              <Progress value={identities.length > 0 ? 100 : 0} className="h-2" />
              <p className="text-[11px] text-muted-foreground leading-relaxed font-medium">
                Sentinel cross-references {identities.length} enrolled identities against viral content every 5 minutes.
              </p>
            </div>

            <Button 
              className="w-full h-14 rounded-xl font-black uppercase tracking-widest gap-3 shadow-lg group relative overflow-hidden"
              onClick={runSentinelScan}
              disabled={isScanning}
            >
              {isScanning ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />}
              {isScanning ? "SCANNING SOCIAL FEEDS..." : "RUN GLOBAL SCAN"}
            </Button>
          </CardContent>
          <CardFooter className="bg-muted/30 p-6 border-t flex flex-col gap-3">
             <div className="flex items-center gap-2 text-[10px] font-black uppercase text-muted-foreground/60">
                <Globe className="w-3.5 h-3.5" /> Network Health: Authoritative
             </div>
          </CardFooter>
        </Card>
      </div>

      <div className="lg:col-span-8 space-y-6">
        <div className="flex items-center justify-between mb-2 px-2">
          <h2 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" /> SENTINEL FEED
          </h2>
          <Badge variant="outline" className="text-[10px] font-black px-3 rounded-lg border-primary/20">
            {alerts.length} ALERTS ACTIVE
          </Badge>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {alerts.length === 0 ? (
            <div className="p-20 text-center border-2 border-dashed rounded-2xl bg-muted/20 opacity-40">
               <ShieldAlert className="w-12 h-12 mx-auto mb-4 text-primary" />
               <p className="text-xs font-black uppercase tracking-widest">No viral deepfakes detected in current cycle.</p>
            </div>
          ) : (
            alerts.map((alert) => (
              <Card key={alert.id} className={cn(
                "border shadow-none rounded-2xl transition-all duration-300 group volumetric-shadow spatial-lift overflow-hidden",
                alert.status === 'identity_theft' ? "border-destructive/50 bg-destructive/5" : "border-border hover:border-primary/40"
              )}>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-inner",
                      alert.status === 'identity_theft' ? "bg-destructive text-white" : "bg-primary/10 text-primary"
                    )}>
                      {alert.status === 'identity_theft' ? <UserX className="w-6 h-6" /> : getPlatformIcon(alert.platform)}
                    </div>
                    
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                         <Badge variant={alert.status === 'identity_theft' ? "destructive" : "outline"} className="text-[9px] font-black uppercase tracking-widest px-2 rounded-lg">
                           {alert.platform}
                         </Badge>
                         <span className={cn("text-[9px] font-black uppercase tracking-widest", alert.status === 'identity_theft' ? "text-destructive" : getRiskColor(alert.forensicRisk))}>
                           {alert.status === 'identity_theft' ? "PERSONAL BREACH ALERT 🚨" : `${alert.forensicRisk.toUpperCase()} RISK ALERT`}
                         </span>
                         <span className="text-[9px] font-bold text-muted-foreground/50 ml-auto">
                           {new Date(alert.timestamp).toLocaleTimeString()}
                         </span>
                      </div>
                      <p className="text-[13px] font-black text-foreground uppercase tracking-tight leading-tight">
                        {alert.contentSnippet}
                      </p>
                      <div className="flex items-center gap-4 pt-2">
                        <div className="flex items-center gap-1.5">
                           <TrendingUp className="w-3.5 h-3.5 text-primary" />
                           <span className="text-[10px] font-black uppercase text-muted-foreground/80">Velocity: {alert.viralVelocity}%</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                           <Search className="w-3.5 h-3.5 text-primary" />
                           <span className="text-[10px] font-black uppercase text-muted-foreground/80">Source: {alert.originalSource}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 w-full md:w-auto mt-4 md:mt-0">
                       <Button size="sm" className={cn(
                         "flex-1 md:flex-none rounded-xl text-[10px] font-black uppercase gap-2 h-10 px-4",
                         alert.status === 'identity_theft' ? "bg-destructive text-white" : "bg-primary/20 text-primary"
                       )}>
                         <Activity className="w-3.5 h-3.5" /> INVESTIGATE
                       </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
