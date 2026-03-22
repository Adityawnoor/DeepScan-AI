"use client"

import * as React from "react"
import { Upload, Camera, X, Image as ImageIcon, Music, Video, Loader2, Zap, ClipboardPaste, Link as LinkIcon, Database } from "lucide-react"
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

      if (!type) {
        throw new Error("URL does not point to a supported media type.")
      }

      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result as string)
        setMediaType(type)
        setIsLoadingUrl(false)
        setUrlInput("")
      }
      reader.readAsDataURL(blob)
    } catch (err: any) {
      console.error("URL Load error:", err)
      toast({
        variant: "destructive",
        title: "URL Error",
        description: "Could not load media from this URL. It may be restricted by CORS or the link is invalid.",
      })
      setIsLoadingUrl(false)
    }
  }

  React.useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (preview || isWebcamOpen || isAnalyzing) return

      const items = e.clipboardData?.items
      if (!items) return

      const files: File[] = []
      for (let i = 0; i < items.length; i++) {
        if (items[i].kind === 'file') {
          const file = items[i].getAsFile()
          if (file) files.push(file)
        }
      }

      if (files.length > 0) {
        handleFiles(files)
      }
    }

    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [preview, isWebcamOpen, isAnalyzing])

  const openWebcam = async () => {
    setIsWebcamOpen(true)
    setPreview(null)
    setMediaType(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (err) {
      console.error("Webcam error:", err)
      setIsWebcamOpen(false)
      toast({
        variant: "destructive",
        title: "Webcam Error",
        description: "Could not access camera. Please check permissions.",
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
    if (preview) {
      onUpload(preview)
    }
  }

  return (
    <Card className="p-8 overflow-hidden border-dashed border-2 bg-card/40 backdrop-blur-xl rounded-[3rem] shadow-2xl relative perspective-1000 preserve-3d">
      {!preview && !isWebcamOpen ? (
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <div
            className={cn(
              "flex flex-col items-center justify-center w-full flex-1 border-4 border-dashed rounded-[2.5rem] transition-all cursor-pointer group mb-6 relative overflow-hidden preserve-3d",
              dragActive ? "border-primary bg-primary/5 scale-[1.02]" : "border-muted-foreground/10 hover:border-primary/40 hover:bg-primary/5"
            )}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept="image/*,audio/*,video/*"
              onChange={handleInputChange}
            />
            <div className="flex gap-4 mb-6 translate-z-10">
              <div className="p-4 bg-primary/10 rounded-[1.5rem] group-hover:scale-110 transition-transform duration-500 shadow-lg rotate-x-12">
                <ImageIcon className="w-6 h-6 text-primary" />
              </div>
              <div className="p-4 bg-primary/10 rounded-[1.5rem] group-hover:scale-110 transition-transform duration-500 delay-75 shadow-lg rotate-y-12">
                <Music className="w-6 h-6 text-primary" />
              </div>
              <div className="p-4 bg-primary/10 rounded-[1.5rem] group-hover:scale-110 transition-transform duration-500 delay-150 shadow-lg -rotate-x-12">
                <Video className="w-6 h-6 text-primary" />
              </div>
            </div>
            <h3 className="font-headline font-black text-2xl mb-2 text-center uppercase tracking-tighter translate-z-10">Deploy Evidence</h3>
            <p className="text-muted-foreground text-xs mb-6 px-4 text-center max-w-[320px] font-bold uppercase tracking-widest opacity-60 translate-z-10">
              Drag & drop or <span className="text-primary font-black">Ctrl + V</span> to analyze
            </p>
            <div className="flex flex-wrap justify-center gap-4 translate-z-10">
              <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); openWebcam(); }} className="rounded-2xl border-primary/30 h-11 px-6 font-black uppercase tracking-widest hover:bg-primary/10 backdrop-blur-md transition-all shadow-md">
                <Camera className="w-4 h-4 mr-2" />
                Live Capture
              </Button>
            </div>
          </div>

          <div className="w-full max-w-sm flex gap-3 translate-z-10">
            <div className="relative flex-1">
              <LinkIcon className="absolute left-4 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Paste remote URL..."
                className="pl-12 h-11 rounded-2xl bg-muted/30 border-none shadow-inner"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleUrlUpload()}
              />
            </div>
            <Button size="sm" onClick={handleUrlUpload} disabled={!urlInput || isLoadingUrl} className="rounded-2xl h-11 px-6 font-black uppercase tracking-widest shadow-lg">
              {isLoadingUrl ? <Loader2 className="w-4 h-4 animate-spin" /> : "Load"}
            </Button>
          </div>
        </div>
      ) : isWebcamOpen ? (
        <div className="flex flex-col items-center gap-6">
          <div className="relative w-full aspect-video bg-black rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-primary/20 preserve-3d">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            <div className="absolute inset-0 border-[20px] border-primary/5 pointer-events-none" />
          </div>
          <div className="flex gap-4">
            <Button onClick={captureWebcam} className="rounded-2xl h-14 px-10 font-black uppercase tracking-widest shadow-xl hover:scale-105 transition-all">Capture DNA</Button>
            <Button variant="outline" onClick={closeWebcam} className="rounded-2xl h-14 px-10 font-black uppercase tracking-widest hover:bg-destructive/10">Abort</Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-8 animate-in zoom-in-95 duration-500 perspective-1000">
          <div className="relative w-full max-w-lg aspect-square rounded-[3rem] overflow-hidden bg-black shadow-[0_40px_80px_rgba(0,0,0,0.4)] flex items-center justify-center border-8 border-primary/10 transition-all duration-700 hover:rotate-y-3 hover:rotate-x-3 preserve-3d">
            {isAnalyzing && <div className="scan-line-3d" />}
            
            {mediaType === 'image' && (
              <img src={preview!} alt="Preview" className="w-full h-full object-contain transition-all duration-1000" />
            )}
            {mediaType === 'video' && (
              <video src={preview!} controls className="w-full h-full object-contain" />
            )}
            {mediaType === 'audio' && (
              <div className="flex flex-col items-center gap-6 p-12 w-full">
                <div className="p-12 rounded-full bg-primary/10 animate-neural-pulse">
                  <Music className="w-24 h-24 text-primary" />
                </div>
                <audio src={preview!} controls className="w-full shadow-2xl" />
              </div>
            )}
            
            <button
              onClick={clearPreview}
              className="absolute top-6 right-6 p-3 bg-black/60 text-white rounded-full hover:bg-primary transition-all backdrop-blur-xl z-50 border border-white/20 shadow-2xl"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="flex gap-4">
            <Button 
              size="lg" 
              className="px-14 h-16 rounded-[2rem] font-black uppercase tracking-[0.2em] shadow-[0_20px_40px_rgba(0,123,255,0.4)] bg-primary hover:bg-primary/90 hover:scale-[1.05] active:scale-[0.98] transition-all"
              onClick={handleStartAnalysis}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                  Mapping Neural DNA...
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5 mr-3" />
                  Run Forensic Scan
                </>
              )}
            </Button>
            <Button variant="outline" size="lg" onClick={clearPreview} disabled={isAnalyzing} className="h-16 rounded-[2rem] font-black uppercase tracking-widest px-10 border-2 hover:bg-primary/10">
              New Case
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}