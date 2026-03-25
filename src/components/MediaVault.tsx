"use client"

import * as React from "react"
import { 
  ShieldCheck, Globe, Search, Download, 
  ExternalLink, FileCheck, History, Zap,
  CheckCircle2, AlertCircle, FileText, 
  Share2, Trash2, Microscope
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy, deleteDoc, doc } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

export function MediaVault({ onReverify }: { onReverify: (id: string) => void }) {
  const { toast } = useToast()
  const db = useFirestore()
  const [searchTerm, setSearchTerm] = React.useState("")

  const ledgerQuery = useMemoFirebase(() => 
    db ? query(collection(db, "ledger"), orderBy("timestamp", "desc")) : null, 
  [db])
  
  const { data: entries } = useCollection(ledgerQuery)

  const filteredEntries = React.useMemo(() => 
    (entries || []).filter(e => 
      e.hash.toLowerCase().includes(searchTerm.toLowerCase()) || 
      e.txId?.toLowerCase().includes(searchTerm.toLowerCase())
    ),
  [entries, searchTerm])

  const deleteEntry = (hash: string) => {
    if (!db) return
    deleteDoc(doc(db, "ledger", hash))
    toast({ title: "Removed from Vault", description: "Notarization record removed from local view." })
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 px-2">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-primary" />
            AUTHORIZED MEDIA VAULT
          </h2>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Immutable Forensic Record of Authentic Media
          </p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search Hash or TX ID..."
            className="pl-10 h-11 rounded-xl bg-background border shadow-none font-bold uppercase text-[10px] tracking-widest"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-3xl bg-muted/20 opacity-40">
            <FileText className="w-16 h-16 mb-4 text-muted-foreground" />
            <p className="text-sm font-black uppercase tracking-widest">No Authorized Originals Notarized</p>
            <p className="text-[10px] font-bold uppercase mt-2 text-muted-foreground">Analyze and Notarize content to secure it here.</p>
          </div>
        ) : (
          filteredEntries.map((entry) => (
            <Card key={entry.hash} className={cn(
              "border shadow-none rounded-2xl transition-all duration-300 group volumetric-shadow overflow-hidden",
              entry.status === 'authentic' ? "border-green-500/20 bg-green-500/5" : "border-destructive/20 bg-destructive/5"
            )}>
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row gap-8 items-start lg:items-center">
                  <div className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-inner",
                    entry.status === 'authentic' ? "bg-green-500/10 text-green-600" : "bg-destructive/10 text-destructive"
                  )}>
                    <ShieldCheck className="w-7 h-7" />
                  </div>
                  
                  <div className="flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <Badge variant={entry.status === 'authentic' ? "default" : "destructive"} className="text-[9px] font-black uppercase tracking-widest px-3 rounded-lg bg-opacity-80">
                        {entry.status === 'authentic' ? "VERIFIED AUTHENTIC" : "SYNTHETIC ASSET"}
                      </Badge>
                      <span className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5" /> NEURAL LEDGER NOTARIZED
                      </span>
                      <span className="text-[9px] font-bold text-muted-foreground/50 ml-auto">
                        {new Date(entry.timestamp).toLocaleString()}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                       <div className="space-y-1">
                          <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Content Hash (SHA-256)</p>
                          <p className="text-[11px] font-mono font-bold text-foreground break-all">{entry.hash}</p>
                       </div>
                       <div className="space-y-1">
                          <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Blockchain TX ID</p>
                          <p className="text-[11px] font-mono font-bold text-primary break-all">{entry.txId || "PENDING_CONSENSUS"}</p>
                       </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                    <Button variant="outline" size="sm" className="rounded-xl text-[10px] font-black uppercase gap-2 h-10 px-4" onClick={() => onReverify(entry.forensicCaseId)}>
                      <Microscope className="w-3.5 h-3.5" /> RE-SCAN
                    </Button>
                    <Button variant="ghost" size="icon" className="h-10 w-10 text-destructive" onClick={() => deleteEntry(entry.hash)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <div className="p-6 rounded-3xl bg-primary/5 border border-primary/10 flex items-start gap-4">
        <AlertCircle className="w-6 h-6 text-primary shrink-0 mt-1" />
        <div className="space-y-1">
          <p className="text-xs font-black uppercase tracking-tighter text-foreground">FUTURE VERIFICATION PROTOCOL</p>
          <p className="text-[10px] font-medium leading-relaxed text-muted-foreground">
            Every entry in the **Authorized Vault** is tied to a global cryptographic fingerprint. This ensures that even if a file is shared across multiple platforms, its origin can be traced back to this immutable forensic record.
          </p>
        </div>
      </div>
    </div>
  )
}
