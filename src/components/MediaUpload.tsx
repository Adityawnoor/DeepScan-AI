"use client"

import * as React from "react"
import { Upload, Camera, X, Image as ImageIcon, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface MediaUploadProps {
  onUpload: (dataUri: string) => void
  isAnalyzing: boolean
}

export function MediaUpload({ onUpload, isAnalyzing }: MediaUploadProps) {
  const [dragActive, setDragActive] = React.useState(false)
  const [preview, setPreview] = React.useState<string | null>(null)
  const [isWebcamOpen, setIsWebcamOpen] = React.useState(false)
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

  const handleFiles = (files: FileList | null) => {
    if (files && files[0]) {
      const file = files[0]
      if (!file.type.startsWith('image/')) return
      
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result as string)
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

  const openWebcam = async () => {
    setIsWebcamOpen(true)
    setPreview(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (err) {
      console.error("Webcam error:", err)
      setIsWebcamOpen(false)
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
  }

  const handleStartAnalysis = () => {
    if (preview) {
      onUpload(preview)
    }
  }

  return (
    <Card className="p-6 overflow-hidden border-dashed border-2 bg-card/50">
      {!preview && !isWebcamOpen ? (
        <div
          className={cn(
            "flex flex-col items-center justify-center min-h-[300px] border-2 border-dashed rounded-xl transition-all cursor-pointer",
            dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/20"
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
            accept="image/*"
            onChange={handleInputChange}
          />
          <div className="p-4 bg-primary/10 rounded-full mb-4">
            <Upload className="w-8 h-8 text-primary" />
          </div>
          <h3 className="font-headline font-semibold text-lg mb-1">Upload Media</h3>
          <p className="text-muted-foreground text-sm mb-6 px-4 text-center">
            Drag and drop an image here, or click to browse
          </p>
          <div className="flex gap-3">
            <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); openWebcam(); }}>
              <Camera className="w-4 h-4 mr-2" />
              Use Webcam
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
          <div className="relative w-full max-w-md aspect-square rounded-xl overflow-hidden bg-muted shadow-inner group">
            <img src={preview!} alt="Preview" className="w-full h-full object-contain" />
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
                  <ImageIcon className="w-4 h-4 mr-2" />
                  Run Deepfake Analysis
                </>
              )}
            </Button>
            <Button variant="outline" size="lg" onClick={clearPreview} disabled={isAnalyzing}>
              Change File
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}