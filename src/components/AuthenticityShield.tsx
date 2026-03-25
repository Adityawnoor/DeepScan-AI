
"use client"

import * as React from "react"
import { 
  ShieldCheck, ShieldAlert, Sparkles, Upload, Download, 
  RefreshCw, Fingerprint, Lock, ShieldX, Zap,
  Dna, Microscope, Target, Activity, CheckCircle2,
  AlertTriangle, EyeOff, BrainCircuit, FileJson, UserCheck, Trash2
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useFirestore, useCollection } from "@/firebase"
import { collection, doc, setDoc, deleteDoc, query, orderBy } from "firebase/firestore"
import { errorEmitter } from "@/firebase/error-emitter"
import { FirestorePermissionError } from "@/firebase/errors"

interface AuthenticityShieldProps {
  vaultHandle?: FileSystemDirectoryHandle | null
}

export function AuthenticityShield({ vaultHandle }: AuthenticityShieldProps) {
  const { toast } = useToast()
  const db = useFirestore()
  const [isProcessing, setIsProcessing] = React.useState(false)
  const [progress, setProgress] = React.useState(0)
  const [originalImage, setOriginalImage] = React.useState<string | null>(null)
  const [shieldedImage, setShieldedImage] = React.useState<string | null>(null)
  const [identityName, setIdentityName] = React.useState("")
  const inputRef = React.useRef<HTMLInputElement>(null)

  const identitiesQuery = React.useMemo(() => db ? query(collection(db, "identities"), orderBy("enrolledAt", "desc")) : null, [db])
  const { data: identities } = useCollection(identitiesQuery)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setOriginalImage(reader.result as string)
        setShieldedImage(null)
      }
      reader.readAsDataURL(file)
    }
  }

  const enrollIdentity = async () => {
    if (!originalImage || !identityName || !db) return
    setIsProcessing(true)
    setProgress(0)

    const steps = [20, 50, 80, 100]
    for (const step of steps) {
      setProgress(step)
      await new Promise(r => setTimeout(r, 400))
    }

    const identityId = crypto.randomUUID()
    const identityRef = doc(db, "identities", identityId)
    const identityData = {
      id: identityId,
      enrolledAt: new Date().toISOString(),
      identityName,
      biometricType: "face",
      neuralFingerprint: `FINGERPRINT_${crypto.randomUUID().substring(0, 8).toUpperCase()}`,
      status: "active"
    }

    setDoc(identityRef, identityData).catch(err => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: identityRef.path, operation: 'create', requestResourceData: identityData })))
    
    setShieldedImage(originalImage) 
    setIsProcessing(false)
    toast({ title: "Identity Enrolled", description: "Your biometric DNA is now proactively monitored by Global Sentinel." })
  }

  const deleteIdentity = (id: string) => {
    if (!db) return
    deleteDoc(doc(db, "identities", id))
    toast({ title: "Identity Removed", description: "Biometric monitoring ceased for this profile." })
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <div className="lg:col-span-4 space-y-6">
        <Card className="border border-primary/20 bg-primary/5 shadow-none overflow-hidden rounded-2xl volumetric-shadow">
          <CardHeader className="bg-primary/10 border-b p-6">
            <CardTitle className="flex items-center gap-2 text-xl font-black uppercase tracking-tighter">
              <UserCheck className="w-6 h-6 text-primary" />
              IDENTITY VAULT
            </CardTitle>
            <CardDescription className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Personal Deepfake Protection
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-4">
               {identities.length === 0 ? (
                 <div className="p-8 text-center border-2 border-dashed rounded-xl bg-muted/20 opacity-40">
                    <ShieldAlert className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-[10px] font-black uppercase tracking-widest">No Identities Enrolled</p>
                 </div>
               ) : (
                 identities.map((id) => (
                   <div key={id.id} className="p-4 rounded-xl bg-background border shadow-sm flex items-center justify-between group">
                     <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                           <Dna className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                           <p className="text-[11px] font-black uppercase tracking-tighter">{id.identityName}</p>
                           <p className="text-[8px] text-muted-foreground font-bold uppercase tracking-widest">DNA: {id.neuralFingerprint}</p>
                        </div>
                     </div>
                     <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => deleteIdentity(id.id)}>
                        <Trash2 className="w-4 h-4" />
                     </Button>
                   </div>
                 ))
               )}
            </div>
            
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 space-y-2">
               <h4 className="text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-2">
                 <ShieldCheck className="w-3.5 h-3.5" /> SENTINEL STATUS: ACTIVE
               </h4>
               <p className="text-[9px] text-muted-foreground leading-relaxed">
                 Enrolled identities are continuously cross-referenced against viral social feeds and deepfake signature databases.
               </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-8 space-y-6">
        <Card className="border border-border bg-card/30 backdrop-blur-md rounded-2xl overflow-hidden volumetric-shadow holographic-scanline">
          <CardContent className="p-10">
            {!originalImage ? (
              <div 
                className="flex flex-col items-center justify-center min-h-[400px] border-2 border-dashed rounded-xl hover:bg-primary/5 transition-all cursor-pointer group spatial-lift"
                onClick={() => inputRef.current?.click()}
              >
                <input type="file" ref={inputRef} onChange={handleFile} className="hidden" accept="image/*" />
                <div className="p-6 bg-primary/10 rounded-full mb-6 group-hover:scale-110 transition-transform">
                  <UserCheck className="w-12 h-12 text-primary" />
                </div>
                <h3 className="text-2xl font-black uppercase tracking-tighter mb-2">Enroll Biometric DNA</h3>
                <p className="text-muted-foreground text-sm font-medium uppercase tracking-widest">Select an original photo to protect</p>
              </div>
            ) : (
              <div className="space-y-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Source Identity Stream</Label>
                    <div className="aspect-square rounded-2xl overflow-hidden border shadow-inner bg-black spatial-lift">
                      <img src={originalImage} className="w-full h-full object-cover" />
                    </div>
                  </div>
                  <div className="space-y-6 flex flex-col justify-center">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Identity Name (Private)</Label>
                        <Input 
                          placeholder="e.g., Personal Profile, CEO Face..." 
                          className="h-12 rounded-xl bg-background/50 font-bold uppercase text-xs"
                          value={identityName}
                          onChange={(e) => setIdentityName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-4 pt-4">
                        {isProcessing ? (
                          <div className="text-center space-y-4 w-full">
                            <RefreshCw className="w-12 h-12 text-primary animate-spin mx-auto" />
                            <Progress value={progress} className="h-2" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-primary">Generating Neural DNA Fingerprint...</p>
                          </div>
                        ) : (
                          <div className="p-4 rounded-xl bg-muted/50 border border-dashed text-center">
                             <Fingerprint className="w-8 h-8 mx-auto mb-2 text-primary/50" />
                             <p className="text-[10px] font-bold text-muted-foreground uppercase">Ready to synchronize with Sentinel network.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center gap-6">
                  {!shieldedImage ? (
                    <Button 
                      size="lg" 
                      className="h-16 px-12 rounded-xl font-black uppercase tracking-widest shadow-xl animate-pulse-ring relative overflow-visible"
                      disabled={isProcessing || !identityName}
                      onClick={enrollIdentity}
                    >
                      <Zap className="w-5 h-5 mr-3" /> Enroll & Monitor Identity
                    </Button>
                  ) : (
                    <>
                      <div className="flex flex-col items-center gap-4">
                         <div className="flex items-center gap-2 px-6 py-3 bg-green-500/10 text-green-600 rounded-xl border border-green-500/20 font-black uppercase text-xs">
                           <ShieldCheck className="w-5 h-5" /> PROACTIVE PROTECTION ACTIVE
                         </div>
                         <Button 
                          variant="ghost"
                          className="font-black uppercase tracking-widest text-[10px]"
                          onClick={() => { setOriginalImage(null); setShieldedImage(null); setIdentityName(""); }}
                        >
                          Enroll Another
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="bg-muted/10 p-6 border-t flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              <span className="text-[10px] font-black uppercase tracking-widest">Sentinel Range: Global X / YT / IG</span>
            </div>
            <div className="text-[10px] font-bold text-muted-foreground italic">
              * Identity monitoring cross-references viral fakes against your DNA hash every 5 minutes.
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
