
"use client"

import * as React from "react"
import { AlertCircle, CheckCircle2, Info, Image as ImageIcon, Music, Video, Clock, ThumbsUp, ThumbsDown, MessageSquare, Send } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

interface AnalysisResultProps {
  scanId: string
  result: any
  mediaUrl: string
  mediaType: 'image' | 'audio' | 'video'
  onUpdate?: () => void
}

export function AnalysisResult({ scanId, result, mediaUrl, mediaType, onUpdate }: AnalysisResultProps) {
  const { toast } = useToast()
  const [feedbackSubmitted, setFeedbackSubmitted] = React.useState<boolean | null>(null)
  const [userComment, setUserComment] = React.useState("")

  React.useEffect(() => {
    setFeedbackSubmitted(null)
    setUserComment("")
  }, [scanId])

  const saveToLocal = (update: any) => {
    const saved = localStorage.getItem("deepscan-scans-metadata")
    let scans = saved ? JSON.parse(saved) : []
    
    scans = scans.map((s: any) => {
      if (s.id === scanId) return { ...s, ...update }
      return s
    })

    localStorage.setItem("deepscan-scans-metadata", JSON.stringify(scans))
    if (onUpdate) onUpdate()
  }

  const submitFeedback = (userVerdict: boolean) => {
    setFeedbackSubmitted(userVerdict)
    saveToLocal({ userFeedback: userVerdict })
    toast({ title: "Local Verdict Saved" })
  }

  const handleSaveComment = () => {
    saveToLocal({ userComment: userComment.trim() })
    toast({ title: "Note Added to Local Database" })
    setUserComment("")
  }

  const isFake = result.isDeepfake
  const confidence = result.confidence

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="overflow-hidden border-2 border-primary/20 flex flex-col">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <CardTitle className="font-headline text-xl flex items-center gap-2">
                {mediaType === 'image' && <ImageIcon className="w-5 h-5" />}
                {mediaType === 'audio' && <Music className="w-5 h-5" />}
                {mediaType === 'video' && <Video className="w-5 h-5" />}
                Local Analysis
              </CardTitle>
              <Badge variant={isFake ? "destructive" : "default"}>
                {isFake ? "MANIPULATED" : "AUTHENTIC"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 flex-1">
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-medium">
                <span>Certainty</span>
                <span>{confidence}%</span>
              </div>
              <Progress value={confidence} className="h-2" />
            </div>

            <div className="p-4 rounded-lg bg-muted/50 border">
              <div className="flex gap-3">
                <Info className="w-5 h-5 text-primary shrink-0" />
                <p className="text-sm text-muted-foreground">{result.explanation}</p>
              </div>
            </div>

            <div className="pt-4 border-t space-y-4">
               <div>
                <Label className="text-[10px] font-bold uppercase text-muted-foreground mb-2 block">Accuracy Feedback</Label>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => submitFeedback(true)}>
                    <ThumbsUp className="w-4 h-4 mr-2" /> Correct
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={() => submitFeedback(false)}>
                    <ThumbsDown className="w-4 h-4 mr-2" /> Wrong
                  </Button>
                </div>
               </div>

               <div className="space-y-2">
                <Label className="text-sm font-semibold">Private Notes</Label>
                <Textarea 
                  placeholder="What did the AI miss? (Saved locally)"
                  value={userComment}
                  onChange={(e) => setUserComment(e.target.value)}
                />
                <Button size="sm" className="w-full" onClick={handleSaveComment}>Save to PC Memory</Button>
               </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden flex items-center justify-center p-4 bg-muted/30">
          <div className="relative rounded-lg overflow-hidden border bg-white flex items-center justify-center">
             {mediaType === 'image' && <img src={mediaUrl} className="max-w-full max-h-[60vh] object-contain" />}
             {mediaType === 'video' && <video src={mediaUrl} controls className="max-w-full max-h-[60vh]" />}
             {mediaType === 'audio' && <audio src={mediaUrl} controls className="p-8" />}
          </div>
        </Card>
      </div>
    </div>
  )
}
