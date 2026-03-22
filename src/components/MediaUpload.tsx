"use client"

import * as React from "react"
import { Upload, Camera, X, Image as ImageIcon, Music, Video, Loader2, Zap, ClipboardPaste, Link as LinkIcon } from "lucide-react"
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

  // Handle Paste Event for direct image pasting
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
    <Card className="p-6 overflow-hidden border-dashed border-2 bg-card/50">
      {!preview && !isWebcamOpen ? (
        <div className="flex flex-col items-center justify-center min-h-[350px]">
          <div
            className={cn(
              "flex flex-col items-center justify-center w-full flex-1 border-2 border-dashed rounded-xl transition-all cursor-pointer group mb-4",
              dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/20 hover:border-primary/50 hover:bg-primary/5"
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
            <div className="flex gap-2 mb-4">
              <div className="p-3 bg-primary/10 rounded-full group-hover:scale-110 transition-transform">
                <ImageIcon className="w-5 h-5 text-primary" />
              </div>
              <div className="p-3 bg-primary/10 rounded-full group-hover:scale-110 transition-transform">
                <Music className="w-5 h-5 text-primary" />
              </div>
              <div className="p-3 bg-primary/10 rounded-full group-hover:scale-110 transition-transform">
                <Video className="w-5 h-5 text-primary" />
              </div>
            </div>
            <h3 className="font-headline font-semibold text-lg mb-1 text-center">Analyze Media</h3>
            <p className="text-muted-foreground text-sm mb-4 px-4 text-center max-w-[280px]">
              Drag & drop, click to browse, or <span className="text-primary font-medium">paste directly</span>
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); openWebcam(); }}>
                <Camera className="w-4 h-4 mr-2" />
                Use Webcam
              </Button>
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted text-[10px] font-mono uppercase text-muted-foreground border">
                <ClipboardPaste className="w-3 h-3" />
                Ctrl + V to paste
              </div>
            </div>
          </div>

          <div className="w-full max-w-sm flex gap-2">
            <div className="relative flex-1">
              <LinkIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Paste media URL..."
                className="pl-9 h-9"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleUrlUpload()}
              />
            </div>
            <Button size="sm" onClick={handleUrlUpload} disabled={!urlInput || isLoadingUrl}>
              {isLoadingUrl ? <Loader2 className="w-4 h-4 animate-spin" /> : "Load"}
            </Button>
          </div>
        </div>
      ) : isWebcamOpen ? (
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
          </div>
          <div className="flex gap-2">
            <Button onClick={captureWebcam}>Capture Photo</Button>
            <Button variant="outline" onClick={closeWebcam}>Cancel</Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-6">
          <div className="relative w-full max-w-md aspect-square rounded-xl overflow-hidden bg-muted shadow-inner group flex items-center justify-center">
            {mediaType === 'image' && (
              <img src={preview!} alt="Preview" className="w-full h-full object-contain" />
            )}
            {mediaType === 'video' && (
              <video src={preview!} controls className="w-full h-full object-contain" />
            )}
            {mediaType === 'audio' && (
              <div className="flex flex-col items-center gap-4 p-8 w-full">
                <Music className="w-20 h-20 text-primary opacity-20" />
                <audio src={preview!} controls className="w-full" />
              </div>
            )}
            <button
              onClick={clearPreview}
              className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex gap-3">
            <Button 
              size="lg" 
              className="px-12"
              onClick={handleStartAnalysis}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Run Analysis
                </>
              )}
            </Button>
            <Button variant="outline" size="lg" onClick={clearPreview} disabled={isAnalyzing}>
              Change
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}
