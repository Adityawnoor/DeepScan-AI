"use client"

import * as React from "react"
import { Upload, Camera, X, Image as ImageIcon, Music, Video, Loader2, Zap, Link as LinkIcon, Clipboard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

interface MediaUploadProps {
  onUpload: (dataUri: string) => void
  isAnalyzing: boolean
}

export function MediaUpload({ onUpload, isAnalyzing }: MediaUploadProps) {
  const { toast } = useToast()
  const [dragActive, setDragActive] = React.useState(false)
  const [preview, setPreview] = React.useState<string | null>(null)
  const [mediaType, setMediaType] = React.useState<'image' | 'audio' | 'video' | null>(null)
  const [isWebcamOpen, setIsWebcamOpen] = React.useState(false)
  const [urlInput, setUrlInput] = React.useState("")
  const [isLoadingUrl, setIsLoadingUrl] = React.useState(false)
  const videoRef = React.useRef<HTMLVideoElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleFiles = (files: FileList | File[] | null) => {
    if (files && files[0]) {
      const file = files[0]
      let type: 'image' | 'audio' | 'video' | null = null

      if (file.type.startsWith('image/')) type = 'image'
      else if (file.type.startsWith('audio/')) type = 'audio'
      else if (file.type.startsWith('video/')) type = 'video'
      
      if (!type) {
        toast({
          variant: "destructive",
          title: "Unsupported File",
          description: "Please upload an image, audio, or video file.",
        })
        return
      }
      
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result as string)
        setMediaType(type)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    handleFiles(e.dataTransfer.files)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files)
  }

  const handleUrlUpload = async () => {
    if (!urlInput) return
    setIsLoadingUrl(true)
    try {
      const response = await fetch(urlInput)
      if (!response.ok) throw new Error("Failed to fetch")
      
      const blob = await response.blob()
      let type: 'image' | 'audio' | 'video' | null = null

      if (blob.type.startsWith('image/')) type = 'image'
      else if (blob.type.startsWith('audio/')) type = 'audio'
      else if (blob.type.startsWith('video/')) type = 'video'

      if (!type) throw new Error("URL does not point to supported media.")

      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result as string)
        setMediaType(type)
        setIsLoadingUrl(false)
        setUrlInput("")
      }
      reader.readAsDataURL(blob)
    } catch (err) {
      toast({
        variant: "destructive",
        title: "URL Error",
        description: "Could not load media from this URL.",
      })
      setIsLoadingUrl(false)
    }
  }

  const openWebcam = async () => {
    setIsWebcamOpen(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (err) {
      setIsWebcamOpen(false)
      toast({
        variant: "destructive",
        title: "Webcam Error",
        description: "Could not access camera.",
      })
    }
  }

  const captureWebcam = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas")
      canvas.width = videoRef.current.videoWidth
      canvas.height = videoRef.current.videoHeight
      const ctx = canvas.getContext("2d")
      ctx?.drawImage(videoRef.current, 0, 0)
      const dataUri = canvas.toDataURL("image/png")
      setPreview(dataUri)
      setMediaType('image')
      closeWebcam()
    }
  }

  const closeWebcam = () => {
    const stream = videoRef.current?.srcObject as MediaStream
    stream?.getTracks().forEach(track => track.stop())
    setIsWebcamOpen(false)
  }

  const clearPreview = () => {
    setPreview(null)
    setMediaType(null)
  }

  const handleStartAnalysis = () => {
    if (preview) onUpload(preview)
  }

  const handlePaste = async () => {
    try {
      const items = await navigator.clipboard.read()
      for (const item of items) {
        for (const type of item.types) {
          if (type.startsWith('image/') || type.startsWith('audio/') || type.startsWith('video/')) {
            const blob = await item.getType(type)
            const reader = new FileReader()
            reader.onloadend = () => {
              setPreview(reader.result as string)
              setMediaType(type.split('/')[0] as any)
            }
            reader.readAsDataURL(blob)
            return
          }
        }
      }
      toast({ title: "No media found in clipboard" })
    } catch (e) {
      toast({ variant: "destructive", title: "Paste failed", description: "Grant clipboard permissions." })
    }
  }

  return (
    <Card className="p-0 border-dashed border-2 bg-white dark:bg-card/50 rounded-none shadow-sm overflow-hidden volumetric-shadow group hover:border-primary/30 transition-all duration-500">
      {!preview && !isWebcamOpen ? (
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <div
            className={cn(
              "flex flex-col items-center justify-center w-full flex-1 transition-all cursor-pointer group px-8 text-center",
              dragActive ? "bg-primary/5" : "hover:bg-primary/5"
            )}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept="image/*,audio/*,video/*"
              onChange={handleInputChange}
            />
            <div className="flex gap-4 mb-6">
              <div className="p-3 bg-primary/10 rounded-full group-hover:scale-110 transition-transform">
                <ImageIcon className="w-5 h-5 text-primary" />
              </div>
              <div className="p-3 bg-primary/10 rounded-full group-hover:scale-110 transition-transform delay-75">
                <Music className="w-5 h-5 text-primary" />
              </div>
              <div className="p-3 bg-primary/10 rounded-full group-hover:scale-110 transition-transform delay-150">
                <Video className="w-5 h-5 text-primary" />
              </div>
            </div>
            <h3 className="font-black uppercase text-lg mb-2 text-foreground tracking-tighter">Analyze Media</h3>
            <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest mb-8">
              Drag & drop, click to browse, or <button className="text-primary hover:underline underline-offset-4" onClick={(e) => { e.stopPropagation(); handlePaste(); }}>paste directly</button>
            </p>
            
            <div className="flex gap-4">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={(e) => { e.stopPropagation(); openWebcam(); }} 
                className="rounded-none border-primary/20 h-10 px-6 font-black uppercase text-[10px] tracking-widest gap-2 hover-glow transition-all"
              >
                <Camera className="w-4 h-4" />
                Use Webcam
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={(e) => { e.stopPropagation(); handlePaste(); }} 
                className="rounded-none border-primary/20 h-10 px-6 font-black uppercase text-[10px] tracking-widest gap-2 bg-muted/30 hover-glow transition-all"
              >
                <Clipboard className="w-4 h-4" />
                CTRL + V TO PASTE
              </Button>
            </div>
          </div>

          <div className="w-full border-t p-4 bg-muted/5">
            <div className="flex gap-2 max-w-md mx-auto">
              <div className="relative flex-1">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Paste media URL..."
                  className="pl-9 h-10 rounded-none bg-background border shadow-none text-[10px] font-bold uppercase tracking-widest"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleUrlUpload()}
                />
              </div>
              <Button size="sm" onClick={handleUrlUpload} disabled={!urlInput || isLoadingUrl} className="rounded-none h-10 px-6 font-black uppercase tracking-widest bg-primary/60 hover:bg-primary transition-all hover-glow">
                {isLoadingUrl ? <Loader2 className="w-4 h-4 animate-spin" /> : "Load"}
              </Button>
            </div>
          </div>
        </div>
      ) : isWebcamOpen ? (
        <div className="flex flex-col items-center gap-6 p-8">
          <div className="relative w-full aspect-video bg-black rounded-none overflow-hidden shadow-2xl border-2 border-primary/20 hover-glow transition-all duration-500">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            <div className="absolute inset-0 pointer-events-none border border-primary/20 animate-pulse" />
          </div>
          <div className="flex gap-4">
            <Button onClick={captureWebcam} className="rounded-none h-12 px-8 font-black uppercase tracking-widest animate-pulse-ring relative overflow-visible">Capture DNA</Button>
            <Button variant="outline" onClick={closeWebcam} className="rounded-none h-12 px-8 font-black uppercase tracking-widest hover:bg-destructive/10">Cancel</Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-8 p-8">
          <div className="relative w-full max-w-lg aspect-square rounded-none overflow-hidden bg-black shadow-2xl flex items-center justify-center border hover-glow transition-all duration-700">
            {mediaType === 'image' && <img src={preview!} alt="Preview" className="w-full h-full object-contain" />}
            {mediaType === 'video' && <video src={preview!} controls className="w-full h-full object-contain" />}
            {mediaType === 'audio' && (
              <div className="flex flex-col items-center gap-6 p-12 w-full">
                <div className="p-6 bg-primary/10 rounded-full animate-pulse">
                  <Music className="w-20 h-20 text-primary" />
                </div>
                <audio src={preview!} controls className="w-full" />
              </div>
            )}
            <button
              onClick={clearPreview}
              className="absolute top-4 right-4 p-2 bg-black/60 text-white rounded-full hover:bg-destructive transition-all hover:scale-110"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex gap-4">
            <Button 
              size="lg" 
              className="px-10 h-14 rounded-none font-black uppercase tracking-widest shadow-lg bg-primary hover:bg-primary/90 animate-pulse-ring relative overflow-visible"
              onClick={handleStartAnalysis}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-3 animate-spin" />
                  Mapping Neural DNA...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-3" />
                  Run Forensic Scan
                </>
              )}
            </Button>
            <Button variant="outline" size="lg" onClick={clearPreview} disabled={isAnalyzing} className="h-14 rounded-none font-black uppercase tracking-widest px-8 border-2 hover:bg-primary/5">
              New Case
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}
