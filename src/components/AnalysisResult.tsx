
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
import { doc, updateDoc } from "firebase/firestore"
import { useFirestore, errorEmitter, FirestorePermissionError } from "@/firebase"
import { useToast } from "@/hooks/use-toast"

interface AnalysisResultProps {
  scanId: string
  result: any
  mediaUrl: string
  mediaType: 'image' | 'audio' | 'video'
}

export function AnalysisResult({ scanId, result, mediaUrl, mediaType }: AnalysisResultProps) {
  const { toast } = useToast()
  const db = useFirestore()
  const [dimensions, setDimensions] = React.useState({ width: 0, height: 0 })
  const [feedbackSubmitted, setFeedbackSubmitted] = React.useState<boolean | null>(null)
  const [userComment, setUserComment] = React.useState("")
  const [isSavingComment, setIsSavingComment] = React.useState(false)

  // Reset feedback state whenever the scan ID changes
  React.useEffect(() => {
    setFeedbackSubmitted(null)
    setUserComment("")
  }, [scanId])

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { clientWidth, clientHeight } = e.currentTarget
    setDimensions({ width: clientWidth, height: clientHeight })
  }

  const submitFeedback = (userVerdict: boolean) => {
    if (!db) return
    
    setFeedbackSubmitted(userVerdict)
    const scanRef = doc(db, "scans", scanId)
    const isCorrect = userVerdict === result.isDeepfake
    const updateData = {
      userFeedback: userVerdict,
      isCorrect: isCorrect
    }

    updateDoc(scanRef, updateData)
      .then(() => {
        toast({
          title: "Verdict Saved",
          description: isCorrect ? "Thank you! AI correctly identified this." : "Correction received. This helps us improve.",
        })
      })
      .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: scanRef.path,
          operation: 'update',
          requestResourceData: updateData,
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  }

  const handleSaveComment = () => {
    if (!db || !userComment.trim()) return
    
    setIsSavingComment(true)
    const scanRef = doc(db, "scans", scanId)
    const updateData = { userComment: userComment.trim() }

    updateDoc(scanRef, updateData)
      .then(() => {
        toast({
          title: "Feedback Updated",
          description: "Your detailed notes have been saved.",
        })
      })
      .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: scanRef.path,
          operation: 'update',
          requestResourceData: updateData,
        });
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => {
        setIsSavingComment(false)
      });
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
                Analysis Results
              </CardTitle>
              <Badge 
                variant={isFake ? "destructive" : "default"} 
                className={cn("text-sm px-3 py-1", !isFake && "bg-green-500 hover:bg-green-600")}
              >
                {isFake ? "LIKELY MANIPULATED" : "LIKELY AUTHENTIC"}
              </Badge>
            </div>
            <CardDescription>Comprehensive AI verification summary</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 flex-1">
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-medium">
                <span>Confidence Score</span>
                <span className={isFake ? "text-destructive" : "text-green-600"}>{confidence}%</span>
              </div>
              <Progress value={confidence} className={cn("h-2", isFake ? "bg-destructive/20" : "bg-green-100")} />
            </div>

            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <div className="flex gap-3">
                {isFake ? (
                  <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                )}
                <div>
                  <h4 className="font-semibold text-sm mb-1">AI Explanation</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {result.explanation}
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t space-y-4">
              <div>
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 block">
                  Verify Result Accuracy
                </Label>
                {feedbackSubmitted === null ? (
                  <div className="flex gap-3">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 hover:bg-green-50 hover:text-green-600 hover:border-green-200"
                      onClick={() => submitFeedback(result.isDeepfake)}
                    >
                      <ThumbsUp className="w-4 h-4 mr-2" />
                      Correct
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                      onClick={() => submitFeedback(!result.isDeepfake)}
                    >
                      <ThumbsDown className="w-4 h-4 mr-2" />
                      Incorrect
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/10">
                    <span className="text-sm font-medium text-primary flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      Verdict Submitted
                    </span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 text-[10px] uppercase font-bold"
                      onClick={() => setFeedbackSubmitted(null)}
                    >
                      Change
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="user-comment" className="text-sm font-semibold flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Additional Notes
                </Label>
                <Textarea 
                  id="user-comment"
                  placeholder="Tell us what you noticed (e.g., 'Eyes look weird', 'Audio jitter')..."
                  className="min-h-[80px] text-sm resize-none"
                  value={userComment}
                  onChange={(e) => setUserComment(e.target.value)}
                />
                <Button 
                  size="sm" 
                  className="w-full" 
                  onClick={handleSaveComment}
                  disabled={!userComment.trim() || isSavingComment}
                >
                  {isSavingComment ? "Saving..." : (
                    <>
                      <Send className="w-3.5 h-3.5 mr-2" />
                      Save Detailed Feedback
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden relative flex flex-col items-center justify-center p-4 bg-muted/30 min-h-[400px]">
          <div className="relative rounded-lg overflow-hidden border bg-white flex items-center justify-center max-w-full max-h-full">
            {mediaType === 'image' && (
              <div className="relative inline-block leading-none">
                <img 
                  src={mediaUrl} 
                  alt="Analyzed Media" 
                  className="max-w-full max-h-[60vh] object-contain block"
                  onLoad={handleImageLoad}
                />
                {dimensions.width > 0 && result.highlightedRegions?.map((region: any, idx: number) => (
                  <div
                    key={idx}
                    className="absolute border-2 border-red-500 bg-red-500/10 pointer-events-none group"
                    style={{
                      left: `${(region.x / 100) * dimensions.width}px`,
                      top: `${(region.y / 100) * dimensions.height}px`,
                      width: `${(region.width / 100) * dimensions.width}px`,
                      height: `${(region.height / 100) * dimensions.height}px`,
                    }}
                  >
                    <div className="hidden group-hover:block absolute -top-8 left-0 bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap z-10">
                      {region.reason}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {mediaType === 'video' && (
              <video src={mediaUrl} controls className="max-w-full max-h-[60vh] object-contain" />
            )}
            {mediaType === 'audio' && (
              <div className="p-8 w-full flex flex-col items-center gap-4">
                <Music className="w-16 h-16 text-primary opacity-20" />
                <audio src={mediaUrl} controls className="w-full" />
              </div>
            )}
          </div>
          <p className="mt-3 text-xs text-muted-foreground flex items-center gap-1.5">
            <Info className="w-3 h-3" />
            {mediaType === 'image' ? 'Hover highlighted regions for details.' : 'Review timestamps for anomalies.'}
          </p>
        </Card>
      </div>

      {(result.suspiciousSegments || result.suspiciousTimestamps || result.highlightedRegions) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Detected Irregularities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Image Regions */}
              {result.highlightedRegions?.map((region: any, idx: number) => (
                <div key={idx} className="flex gap-4 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-destructive/10 text-destructive font-bold text-xs shrink-0">
                    {idx + 1}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{region.reason}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Spatial Anomaly</p>
                  </div>
                </div>
              ))}
              {/* Audio Segments */}
              {result.suspiciousSegments?.map((segment: any, idx: number) => (
                <div key={idx} className="flex gap-4 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-destructive/10 text-destructive font-bold text-xs shrink-0">
                    <Clock className="w-3 h-3" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{segment.reason}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {segment.startTime}s - {segment.endTime}s
                    </p>
                  </div>
                </div>
              ))}
              {/* Video Timestamps */}
              {result.suspiciousTimestamps?.map((ts: any, idx: number) => (
                <div key={idx} className="flex gap-4 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-destructive/10 text-destructive font-bold text-xs shrink-0">
                    <Clock className="w-3 h-3" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{ts.description}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Timestamp: {ts.timestamp}s</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
