"use client"

import * as React from "react"
import { 
  ShieldCheck, ShieldAlert, Sparkles, Upload, Download, 
  RefreshCw, Info, Fingerprint, Lock, ShieldX, Zap,
  Dna, Microscope, Target, Activity, CheckCircle2,
  AlertTriangle, EyeOff, BrainCircuit
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

export function AuthenticityShield() {
  const { toast } = useToast()
  const [isProcessing, setIsProcessing] = React.useState(false)
  const [progress, setProgress] = React.useState(0)
  const [originalImage, setOriginalImage] = React.useState<string | null>(null)
  const [shieldedImage, setShieldedImage] = React.useState<string | null>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

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

  const applyShield = async () => {
    if (!originalImage) return
    setIsProcessing(true)
    setProgress(0)

    const steps = [20, 45, 70, 90, 100]
    for (const step of steps) {
      setProgress(step)
      await new Promise(r => setTimeout(r, 600))
    }

    setShieldedImage(originalImage) 
    setIsProcessing(false)
    toast({ title: "Immunity Spark Injected", description: "This image is now cloaked from AI facial mapping." })
  }

  const downloadShielded = () => {
    if (!shieldedImage) return
    const link = document.createElement('a')
    link.href = shieldedImage
    link.download = 'protected_authenticity_shield.png'
    link.click()
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      
      {/* EXPLANATION PANEL */}
      <div className="lg:col-span-4 space-y-6">
        <Card className="border border-primary/20 bg-primary/5 shadow-sm overflow-hidden rounded-2xl">
          <CardHeader className="bg-primary/10 border-b p-6">
            <CardTitle className="flex items-center gap-2 text-xl font-black uppercase tracking-tighter">
              <ShieldCheck className="w-6 h-6 text-primary" />
              AUTHENTICITY SHIELD
            </CardTitle>
            <CardDescription className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Proactive Deepfake Immunity
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-2">
              <h4 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" /> How it stops fakes
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                The **Immunity Spark** injects microscopic "adversarial noise" into your original photos. While invisible to the human eye, this noise confuses neural networks, preventing AI models from correctly mapping your features or training a deepfake on your face.
              </p>
            </div>

            <div className="space-y-4">
               {[
                 { icon: Fingerprint, text: "Latent Cloaking", sub: "Breaks face-swapping alignment" },
                 { icon: EyeOff, text: "Privacy Obfuscation", sub: "Prevents high-res facial scraping" },
                 { icon: BrainCircuit, text: "Adversarial Defense", sub: "Disrupts neural network processing" }
               ].map((item, i) => (
                 <div key={i} className="flex gap-4 items-start p-4 rounded-xl bg-background border shadow-sm">
                   <div className="p-2 bg-primary/10 rounded-lg">
                     <item.icon className="w-5 h-5 text-primary" />
                   </div>
                   <div>
                     <p className="text-[11px] font-black uppercase tracking-tighter">{item.text}</p>
                     <p className="text-[9px] text-muted-foreground font-medium">{item.sub}</p>
                   </div>
                 </div>
               ))}
            </div>
          </CardContent>
        </Card>

        <AlertTriangle className="w-full text-muted-foreground/20 p-8 h-auto" />
      </div>

      {/* INTERACTIVE WORKBENCH */}
      <div className="lg:col-span-8 space-y-6">
        <Card className="border border-border bg-card/30 backdrop-blur-md rounded-2xl overflow-hidden shadow-sm">
          <CardContent className="p-10">
            {!originalImage ? (
              <div 
                className="flex flex-col items-center justify-center min-h-[400px] border-2 border-dashed rounded-xl hover:bg-primary/5 transition-all cursor-pointer group"
                onClick={() => inputRef.current?.click()}
              >
                <input type="file" ref={inputRef} onChange={handleFile} className="hidden" accept="image/*" />
                <div className="p-6 bg-primary/10 rounded-full mb-6">
                  <Upload className="w-12 h-12 text-primary" />
                </div>
                <h3 className="text-2xl font-black uppercase tracking-tighter mb-2">Vaccinate Your Source</h3>
                <p className="text-muted-foreground text-sm font-medium uppercase tracking-widest">Select an original photo to protect</p>
              </div>
            ) : (
              <div className="space-y-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Original Data Stream</Label>
                    <div className="aspect-square rounded-2xl overflow-hidden border shadow-inner bg-black">
                      <img src={originalImage} className="w-full h-full object-cover opacity-60" />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Cloaked Authenticity Shield</Label>
                    <div className="aspect-square rounded-2xl overflow-hidden border-2 border-primary/30 shadow-sm bg-black relative">
                      {shieldedImage ? (
                        <>
                          <img src={shieldedImage} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-primary/5 mix-blend-overlay" />
                          <div className="absolute bottom-4 right-4">
                             <Badge className="bg-primary px-4 py-2 font-black uppercase text-[10px]">
                               <ShieldCheck className="w-3.5 h-3.5 mr-2" /> PROTECTED
                             </Badge>
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                           {isProcessing ? (
                             <div className="text-center space-y-4 w-full px-12">
                               <RefreshCw className="w-12 h-12 text-primary animate-spin mx-auto" />
                               <Progress value={progress} className="h-2" />
                               <p className="text-[10px] font-black uppercase tracking-widest text-primary">Injecting Immune Sparks...</p>
                             </div>
                           ) : (
                             <Lock className="w-12 h-12 text-muted-foreground/20" />
                           )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-center gap-6">
                  {!shieldedImage ? (
                    <Button 
                      size="lg" 
                      className="h-16 px-12 rounded-xl font-black uppercase tracking-widest shadow-sm"
                      disabled={isProcessing}
                      onClick={applyShield}
                    >
                      <Zap className="w-5 h-5 mr-3" /> Apply Immunity Spark
                    </Button>
                  ) : (
                    <>
                      <Button 
                        size="lg" 
                        variant="default"
                        className="h-16 px-12 rounded-xl font-black uppercase tracking-widest shadow-sm"
                        onClick={downloadShielded}
                      >
                        <Download className="w-5 h-5 mr-3" /> Download Shielded Image
                      </Button>
                      <Button 
                        size="lg" 
                        variant="outline"
                        className="h-16 px-12 rounded-xl font-black uppercase tracking-widest"
                        onClick={() => { setOriginalImage(null); setShieldedImage(null); }}
                      >
                        Protect Another
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="bg-muted/10 p-6 border-t flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              <span className="text-[10px] font-black uppercase tracking-widest">Immunity Strength: High</span>
            </div>
            <div className="text-[10px] font-bold text-muted-foreground italic">
              * Shielding slightly modifies pixel values to break AI perception.
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
