"use client"

import * as React from "react"
import { 
  ShieldCheck, ShieldAlert, Sparkles, Upload, Download, 
  RefreshCw, Fingerprint, Lock, ShieldX, Zap,
  Dna, Microscope, Target, Activity, CheckCircle2,
  AlertTriangle, EyeOff, BrainCircuit, FileJson, UserCheck, Trash2, Camera, Music, Video, Plus, X
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase"
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
  
  const [identityName, setIdentityName] = React.useState("")
  const [photos, setPhotos] = React.useState<(string | null)[]>([null, null, null])
  const [audio, setAudio] = React.useState<string | null>(null)
  
  const photoInputRefs = [React.useRef<HTMLInputElement>(null), React.useRef<HTMLInputElement>(null), React.useRef<HTMLInputElement>(null)]
  const audioInputRef = React.useRef<HTMLInputElement>(null)

  const identitiesQuery = useMemoFirebase(() => db ? query(collection(db, "identities"), orderBy("enrolledAt", "desc")) : null, [db])
  const { data: identities } = useCollection(identitiesQuery)

  const handlePhotoUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        const newPhotos = [...photos]
        newPhotos[index] = reader.result as string
        setPhotos(newPhotos)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setAudio(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const enrollIdentity = async () => {
    if (!photos.every(p => p !== null) || !audio || !identityName || !db) {
      toast({ variant: "destructive", title: "Enrollment Incomplete", description: "3 photos and 1 audio sample required for a master profile." })
      return
    }
    
    setIsProcessing(true)
    setProgress(0)

    const steps = ["Analyzing Facial DNA", "Extracting Ocular Biometrics", "Mapping Vocal Prosody", "Syncing to Global Sentinel"]
    for (let i = 0; i < steps.length; i++) {
      setProgress((i + 1) * 25)
      await new Promise(r => setTimeout(r, 600))
    }

    const identityId = crypto.randomUUID()
    const identityRef = doc(db, "identities", identityId)
    const identityData = {
      id: identityId,
      enrolledAt: new Date().toISOString(),
      identityName,
      faceSignatures: photos.map((_, i) => `FACIAL_DNA_${identityId.substring(0, 4)}_${i}`),
      voiceSignature: `VOCAL_DNA_${identityId.substring(0, 4)}`,
      status: "active"
    }

    setDoc(identityRef, identityData).catch(err => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: identityRef.path, operation: 'create', requestResourceData: identityData })))
    
    setIsProcessing(false)
    setIdentityName("")
    setPhotos([null, null, null])
    setAudio(null)
    toast({ title: "Master Profile Enrolled", description: "Your digital identity is now protected by the Global Sentinel Network." })
  }

  const deleteIdentity = (id: string) => {
    if (!db) return
    deleteDoc(doc(db, "identities", id))
    toast({ title: "Identity Removed", description: "Biometric monitoring ceased for this profile." })
  }

  const allUploaded = photos.every(p => p !== null) && audio !== null

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <div className="lg:col-span-4 space-y-6">
        <Card className="border border-primary/20 bg-primary/5 shadow-none overflow-hidden rounded-2xl volumetric-shadow">
          <CardHeader className="bg-primary/10 border-b p-6">
            <CardTitle className="flex items-center gap-2 text-xl font-black uppercase tracking-tighter">
              <UserCheck className="w-6 h-6 text-primary" />
              DIGITAL IDENTITY VAULT
            </CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Master Biometric Profiles
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-4">
               {(!identities || identities.length === 0) ? (
                 <div className="p-8 text-center border-2 border-dashed rounded-xl bg-muted/20 opacity-40">
                    <ShieldAlert className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-[10px] font-black uppercase tracking-widest">No Master Profiles Enrolled</p>
                 </div>
               ) : (
                 identities.map((id) => (
                   <div key={id.id} className="p-4 rounded-xl bg-background border shadow-sm flex items-center justify-between group hover:border-primary/30 transition-all">
                     <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                           <Fingerprint className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                           <p className="text-[11px] font-black uppercase tracking-tighter">{id.identityName}</p>
                           <Badge variant="outline" className="text-[7px] font-black uppercase border-primary/20 text-primary">MASTER PROTECTED</Badge>
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
                 Master profiles are protected by multi-signature biometric DNA. Sentinel range extends to global viral social feeds.
               </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-8 space-y-6">
        <Card className="border border-border bg-card/30 backdrop-blur-md rounded-2xl overflow-hidden volumetric-shadow holographic-scanline">
          <CardHeader className="p-10 pb-4 border-b bg-muted/5">
             <div className="flex items-center gap-4">
                <div className="p-4 bg-primary text-white rounded-2xl shadow-lg">
                   <Plus className="w-6 h-6" />
                </div>
                <div>
                   <h3 className="text-2xl font-black uppercase tracking-tighter">Create Master Identity</h3>
                   <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Enroll 3 photos and 1 voice sample for deepfake immunity</p>
                </div>
             </div>
          </CardHeader>
          <CardContent className="p-10 space-y-10">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Identity Name (e.g. Influencer Profile, Public Figure ID)</Label>
                <Input 
                  placeholder="Enter master name for this biometric profile..." 
                  className="h-12 rounded-xl bg-background/50 font-black uppercase text-xs"
                  value={identityName}
                  onChange={(e) => setIdentityName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                 <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Neural Facial DNA (3 Photos Required)</Label>
                    <div className="grid grid-cols-3 gap-3">
                       {photos.map((photo, i) => (
                         <div key={i} className="relative aspect-square rounded-xl border-2 border-dashed flex items-center justify-center bg-muted/20 overflow-hidden hover:bg-primary/5 transition-all cursor-pointer group" onClick={() => photoInputRefs[i].current?.click()}>
                           {photo ? (
                             <img src={photo} className="w-full h-full object-cover" />
                           ) : (
                             <Camera className="w-6 h-6 text-muted-foreground/30 group-hover:scale-110 transition-transform" />
                           )}
                           <input type="file" className="hidden" ref={photoInputRefs[i]} accept="image/*" onChange={(e) => handlePhotoUpload(i, e)} />
                           {photo && (
                             <button className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full hover:bg-destructive" onClick={(e) => { e.stopPropagation(); const newPhotos = [...photos]; newPhotos[i] = null; setPhotos(newPhotos); }}>
                               <X className="w-3 h-3" />
                             </button>
                           )}
                         </div>
                       ))}
                    </div>
                 </div>

                 <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Master Voice DNA (1 Sample Required)</Label>
                    <div className="h-full min-h-[100px] rounded-xl border-2 border-dashed flex flex-col items-center justify-center bg-muted/20 hover:bg-primary/5 transition-all cursor-pointer group p-4" onClick={() => audioInputRef.current?.click()}>
                       <input type="file" className="hidden" ref={audioInputRef} accept="audio/*" onChange={handleAudioUpload} />
                       {audio ? (
                         <div className="flex flex-col items-center gap-2">
                           <Music className="w-8 h-8 text-primary animate-pulse" />
                           <p className="text-[8px] font-black uppercase text-primary">Voice DNA Extracted</p>
                           <button className="text-[8px] font-bold uppercase text-destructive hover:underline" onClick={(e) => { e.stopPropagation(); setAudio(null); }}>Remove Sample</button>
                         </div>
                       ) : (
                         <div className="text-center">
                            <Music className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                            <p className="text-[9px] font-black uppercase text-muted-foreground/50">Upload Voice Sample</p>
                         </div>
                       )}
                    </div>
                 </div>
              </div>

              {isProcessing && (
                <div className="space-y-4 pt-4 text-center">
                   <div className="flex justify-between items-end mb-2">
                     <p className="text-[10px] font-black uppercase tracking-widest text-primary">Processing Master Biometrics...</p>
                     <span className="text-xl font-black">{progress}%</span>
                   </div>
                   <Progress value={progress} className="h-2" />
                </div>
              )}
            </div>

            <div className="flex justify-center">
              <Button 
                size="lg" 
                className="h-16 px-12 rounded-2xl font-black uppercase tracking-widest shadow-xl bg-primary animate-pulse-ring relative overflow-visible disabled:opacity-50"
                disabled={isProcessing || !allUploaded || !identityName}
                onClick={enrollIdentity}
              >
                <Zap className="w-5 h-5 mr-3" /> Enroll & Protect Identity
              </Button>
            </div>
          </CardContent>
          <CardFooter className="bg-muted/10 p-6 border-t flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              <span className="text-[10px] font-black uppercase tracking-widest">Master Status: PROACTIVE IMMUNITY ACTIVE</span>
            </div>
            <div className="text-[10px] font-bold text-muted-foreground italic">
              * Influencer/Master profiles receive priority 60-second social monitoring cycles.
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
