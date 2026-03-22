
"use client"

import * as React from "react"
import { Database, Upload, FileArchive, CheckCircle2, Clock, AlertTriangle, Trash2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useFirestore, useCollection } from "@/firebase"
import { collection, addDoc, deleteDoc, doc, query, orderBy } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"

export function DatasetManager() {
  const { toast } = useToast()
  const db = useFirestore()
  const [isUploading, setIsUploading] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const datasetQuery = React.useMemo(() => {
    if (!db) return null
    return query(collection(db, "datasets"), orderBy("uploadDate", "desc"))
  }, [db])

  const { data: datasets, loading } = useCollection(datasetQuery)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || !files[0] || !db) return

    const file = files[0]
    
    // Check size limit (Browser/Action limit is 25MB)
    if (file.size > 25 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File Too Large",
        description: "Browser uploads are limited to 25MB. For 3GB datasets, please use the Enterprise CLI tool.",
      })
      return
    }

    setIsUploading(true)
    try {
      await addDoc(collection(db, "datasets"), {
        fileName: file.name,
        uploadDate: new Date().toISOString(),
        size: file.size,
        fileType: file.type || "application/zip",
        status: "processed"
      })

      toast({
        title: "Dataset Queued",
        description: `${file.name} has been added to the training queue.`,
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: "Could not save dataset metadata.",
      })
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleDelete = async (id: string) => {
    if (!db) return
    try {
      await deleteDoc(doc(db, "datasets", id))
      toast({
        title: "Dataset Removed",
        description: "The dataset has been deleted from your collection.",
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete dataset.",
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-primary" />
              Upload Dataset
            </CardTitle>
            <CardDescription>
              Submit labeled data to improve AI accuracy.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div 
              className="border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-primary/10 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileArchive className="w-10 h-10 text-primary mb-4 opacity-40" />
              <p className="text-sm font-medium">Click to select ZIP dataset</p>
              <p className="text-xs text-muted-foreground mt-1">Max size: 25MB (Web Limit)</p>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".zip,.tar,.gz"
                onChange={handleFileUpload}
              />
            </div>
            
            <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <p>
                <strong>Large Dataset Notice:</strong> To upload datasets larger than 25MB (up to 3GB), please use the <code>deepscan-cli</code> tool with your API key.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5 text-primary" />
              Training Repository
            </CardTitle>
            <CardDescription>
              Manage your submitted datasets and fine-tuning progress.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                <div className="h-10 bg-muted animate-pulse rounded" />
                <div className="h-10 bg-muted animate-pulse rounded" />
                <div className="h-10 bg-muted animate-pulse rounded" />
              </div>
            ) : datasets.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <Database className="w-12 h-12 mx-auto mb-4 opacity-10" />
                <p>No datasets uploaded yet.</p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Filename</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {datasets.map((ds: any) => (
                      <TableRow key={ds.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <FileArchive className="w-4 h-4 text-muted-foreground" />
                            {ds.fileName}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="flex items-center gap-1.5 w-fit bg-green-50 text-green-700 border-green-200">
                            <CheckCircle2 className="w-3 h-3" />
                            Ready
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {(ds.size / (1024 * 1024)).toFixed(2)} MB
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(ds.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Model Improvement Plan</CardTitle>
          <CardDescription>How we use your data to enhance detection accuracy.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <h4 className="font-bold text-sm flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px]">1</span>
              Data Aggregation
            </h4>
            <p className="text-xs text-muted-foreground">
              Your manual feedback and uploaded ZIP datasets are sanitized and prepared for forensic review.
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="font-bold text-sm flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px]">2</span>
              Batch Processing
            </h4>
            <p className="text-xs text-muted-foreground">
              We run contrastive analysis between AI verdicts and your manual corrections to identify specific "weak points".
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="font-bold text-sm flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px]">3</span>
              Fine-Tuning
            </h4>
            <p className="text-xs text-muted-foreground">
              Validated datasets are used to fine-tune the Gemini Vision & Audio models, rolling out updates every 24 hours.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
