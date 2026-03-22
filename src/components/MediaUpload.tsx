"use client"

import * as React from "react"
import { Upload, Camera, X, Image as ImageIcon, Music, Video, Loader2, Zap, Link as LinkIcon } from "lucide-react"
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

  return (
    <Card className="p-8 border-dashed border-2 bg-card/40 backdrop-blur-xl rounded-[2rem] shadow-xl">
      {!preview && !isWebcamOpen ? (
        <div className="flex flex-col items-center justify-center min-h-[350px]">
          <div
            className={cn(
              "flex flex-col items-center justify-center w-full flex-1 border-4 border-dashed rounded-[1.5rem] transition-all cursor-pointer group mb-6",
              dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/10 hover:border-primary/40 hover:bg-primary/5"
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
            <div className="flex gap-4 mb-4">
              <ImageIcon className="w-6 h-6 text-muted-foreground group-hover:text-primary" />
              <Music className="w-6 h-6 text-muted-foreground group-hover:text-primary" />
              <Video className="w-6 h-6 text-muted-foreground group-hover:text-primary" />
            </div>
            <h3 className="font-black text-xl mb-1 uppercase tracking-tighter">Deploy Evidence</h3>
            <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest opacity-60">
              Drag & drop or <span className="text-primary font-black">Browse</span>
            </p>
            <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); openWebcam(); }} className="mt-6 rounded-xl border-primary/20 h-10 px-6 font-black uppercase tracking-widest hover:bg-primary/5">
              <Camera className="w-4 h-4 mr-2" />
              Live Capture
            </Button>
          </div>

          <div className="w-full max-w-sm flex gap-2">
            <div className="relative flex-1">
              <LinkIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Paste remote URL..."
                className="pl-10 h-10 rounded-xl bg-muted/30 border-none"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleUrlUpload()}
              />
            </div>
            <Button size="sm" onClick={handleUrlUpload} disabled={!urlInput || isLoadingUrl} className="rounded-xl h-10 px-6 font-black uppercase tracking-widest">
              {isLoadingUrl ? <Loader2 className="w-4 h-4 animate-spin" /> : "Load"}
            </Button>
          </div>
        </div>
      ) : isWebcamOpen ? (
        <div className="flex flex-col items-center gap-6">
          <div className="relative w-full aspect-video bg-black rounded-[1.5rem] overflow-hidden shadow-2xl border-2 border-primary/20">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
          </div>
          <div className="flex gap-4">
            <Button onClick={captureWebcam} className="rounded-xl h-12 px-8 font-black uppercase tracking-widest">Capture DNA</Button>
            <Button variant="outline" onClick={closeWebcam} className="rounded-xl h-12 px-8 font-black uppercase tracking-widest">Cancel</Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-8">
          <div className="relative w-full max-w-lg aspect-square rounded-[2rem] overflow-hidden bg-black shadow-2xl flex items-center justify-center border-4 border-primary/10">
            {mediaType === 'image' && <img src={preview!} alt="Preview" className="w-full h-full object-contain" />}
            {mediaType === 'video' && <video src={preview!} controls className="w-full h-full object-contain" />}
            {mediaType === 'audio' && (
              <div className="flex flex-col items-center gap-6 p-12 w-full">
                <Music className="w-20 h-20 text-primary opacity-50" />
                <audio src={preview!} controls className="w-full" />
              </div>
            )}
            <button
              onClick={clearPreview}
              className="absolute top-4 right-4 p-2 bg-black/60 text-white rounded-full hover:bg-destructive transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex gap-4">
            <Button 
              size="lg" 
              className="px-10 h-14 rounded-2xl font-black uppercase tracking-widest shadow-lg bg-primary hover:bg-primary/90"
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
            <Button variant="outline" size="lg" onClick={clearPreview} disabled={isAnalyzing} className="h-14 rounded-2xl font-black uppercase tracking-widest px-8 border-2">
              New Case
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}