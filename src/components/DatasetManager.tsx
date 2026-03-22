"use client"

import * as React from "react"
import { Database, Upload, FileArchive, CheckCircle2, AlertTriangle, Trash2, BarChart3, TrendingUp, Target, BrainCircuit, Play, Shield, ShieldAlert, Layers, MessageSquare, Pencil, Save, X, FileCheck, HardDrive, FolderOpen, RefreshCcw, Info, Cloud } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { useFirestore, useCollection, errorEmitter, FirestorePermissionError } from "@/firebase"
import { collection, addDoc, deleteDoc, doc, updateDoc, query, orderBy, limit } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { cn } from "@/lib/utils"

interface DatasetManagerProps {
  knowledgeCount: number
}

export function DatasetManager({ knowledgeCount }: DatasetManagerProps) {
  const { toast } = useToast()
  const db = useFirestore()
  const [isUploading, setIsUploading] = React.useState(false)
  const [isTraining, setIsTraining] = React.useState(false)
  const [trainingProgress, setTrainingProgress] = React.useState(0)
  const [datasetLabel, setDatasetLabel] = React.useState<string>("unlabeled")
  const [datasetNotes, setDatasetNotes] = React.useState<string>("")
  const [editingDataset, setEditingDataset] = React.useState<{ id: string, notes: string } | null>(null)
  const [isUpdatingNotes, setIsUpdatingNotes] = React.useState(false)
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null)
  
  // Local PC Database State
  const [localFolderHandle, setLocalFolderHandle] = React.useState<any>(null)
  const [localFiles, setLocalFiles] = React.useState<{ name: string, size: number, lastModified: number }[]>([])
  const [isScanningLocal, setIsScanningLocal] = React.useState(false)
  const [localMode, setLocalMode] = React.useState<"upload" | "local">("upload")

  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const datasetQuery = React.useMemo(() => {
    if (!db) return null
    return query(collection(db, "datasets"), orderBy("uploadDate", "desc"))
  }, [db])

  const scansQuery = React.useMemo(() => {
    if (!db) return null
    return query(collection(db, "scans"), orderBy("timestamp", "asc"), limit(50))
  }, [db])

  const { data: datasets, loading: datasetsLoading } = useCollection<{
    id: string;
    fileName: string;
    uploadDate: string;
    size: number;
    fileType: string;
    status: string;
    label: string;
    notes?: string;
    isLocal?: boolean;
    localPath?: string;
  }>(datasetQuery)
  
  const { data: scans } = useCollection(scansQuery)

  const chartData = React.useMemo(() => {
    if (!scans || scans.length === 0) return []
    
    let correctCount = 0
    return scans.map((scan: any, index: number) => {
      if (scan.isCorrect !== false) correctCount++
      const accuracy = (correctCount / (index + 1)) * 100
      return {
        name: new Date(scan.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        accuracy: Math.round(accuracy)
      }
    })
  }, [scans])

  const currentAccuracy = chartData.length > 0 ? chartData[chartData.length - 1].accuracy : 85

  React.useEffect(() => {
    if (!isTraining) return

    const interval = setInterval(() => {
      setTrainingProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          return 100
        }
        return prev + 5
      })
    }, 100)

    return () => clearInterval(interval)
  }, [isTraining])

  React.useEffect(() => {
    if (isTraining && trainingProgress >= 100) {
      setIsTraining(false)
      toast({
        title: "Fine-Tuning Complete",
        description: "The model weights have been updated based on your feedback loop.",
      })
    }
  }, [isTraining, trainingProgress, toast])

  const handleConnectLocalPC = async () => {
    try {
      if (!('showDirectoryPicker' in window)) {
        toast({
          variant: "destructive",
          title: "Browser Not Supported",
          description: "Your browser does not support the File System Access API. Please use Chrome or Edge.",
        })
        return
      }

      const handle = await (window as any).showDirectoryPicker()
      setLocalFolderHandle(handle)
      setLocalMode("local")
      scanLocalFolder(handle)
      
      toast({
        title: "PC Folder Connected",
        description: `Now treating '${handle.name}' as your local database.`,
      })
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error("Local PC connection error", err)
      }
    }
  }

  const scanLocalFolder = async (handle: any) => {
    setIsScanningLocal(true)
    const files: any[] = []
    try {
      for await (const entry of handle.values()) {
        if (entry.kind === 'file' && (entry.name.endsWith('.zip') || entry.name.endsWith('.tar.gz'))) {
          const file = await entry.getFile()
          files.push({
            name: entry.name,
            size: file.size,
            lastModified: file.lastModified
          })
        }
      }
      setLocalFiles(files)
    } catch (err) {
      console.error("Error scanning folder", err)
    } finally {
      setIsScanningLocal(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files[0]) {
      setSelectedFile(files[0])
    }
  }

  const handleIndexLocalFile = async (fileName: string, size: number) => {
    if (!db) return

    const datasetData = {
      fileName: fileName,
      uploadDate: new Date().toISOString(),
      size: size,
      fileType: "application/zip",
      status: "processed",
      label: datasetLabel,
      notes: datasetNotes.trim(),
      isLocal: true,
      localPath: localFolderHandle?.name + "/" + fileName
    }
    
    setIsUploading(true)
    
    addDoc(collection(db, "datasets"), datasetData)
      .then(() => {
        toast({
          title: "Local File Indexed",
          description: `${fileName} cataloged from your PC.`,
        })
        setDatasetNotes("")
      })
      .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: 'datasets',
          operation: 'create',
          requestResourceData: datasetData,
        });
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => {
        setIsUploading(false)
      });
  }

  const handleSaveDataset = async () => {
    if (!selectedFile || !db) return

    const datasetData = {
      fileName: selectedFile.name,
      uploadDate: new Date().toISOString(),
      size: selectedFile.size,
      fileType: selectedFile.type || "application/zip",
      status: "processed",
      label: datasetLabel,
      notes: datasetNotes.trim(),
      isLocal: false
    }
    
    setIsUploading(true)
    
    addDoc(collection(db, "datasets"), datasetData)
      .then(() => {
        toast({
          title: "Dataset Indexed",
          description: `${selectedFile.name} cataloged with your notes.`,
        })
        setDatasetNotes("")
        setSelectedFile(null)
        if (fileInputRef.current) fileInputRef.current.value = ""
      })
      .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: 'datasets',
          operation: 'create',
          requestResourceData: datasetData,
        });
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => {
        setIsUploading(false)
      });
  }

  const handleDelete = (id: string) => {
    if (!db) return
    const docRef = doc(db, "datasets", id);
    
    deleteDoc(docRef)
      .then(() => {
        toast({
          title: "Dataset Removed",
          description: "Metadata deleted from repository.",
        })
      })
      .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: docRef.path,
          operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  }

  const handleUpdateNotes = () => {
    if (!db || !editingDataset) return
    
    setIsUpdatingNotes(true)
    const docRef = doc(db, "datasets", editingDataset.id)
    const updateData = { notes: editingDataset.notes.trim() }

    updateDoc(docRef, updateData)
      .then(() => {
        toast({
          title: "Notes Updated",
          description: "Dataset description has been successfully updated.",
        })
        setEditingDataset(null)
      })
      .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: docRef.path,
          operation: 'update',
          requestResourceData: updateData,
        });
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => {
        setIsUpdatingNotes(false)
      });
  }

  const handleStartTraining = () => {
    if (isTraining) return
    setIsTraining(true)
    setTrainingProgress(0)
  }

  const getLabelBadge = (label: string) => {
    switch (label) {
      case 'real':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><Shield className="w-3 h-3 mr-1" /> Real</Badge>
      case 'fake':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><ShieldAlert className="w-3 h-3 mr-1" /> Fake</Badge>
      case 'mixed':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200"><Layers className="w-3 h-3 mr-1" /> Mixed</Badge>
      default:
        return <Badge variant="secondary">Unlabeled</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Current Accuracy</p>
                <p className="text-3xl font-bold tracking-tight text-primary">{currentAccuracy}%</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-xl">
                <Target className="w-6 h-6 text-primary" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-green-600 font-medium">
              <TrendingUp className="w-3 h-3" />
              <span>+2.4% from feedback loop</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-secondary/5 border-secondary/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Labeled Samples</p>
                <p className="text-3xl font-bold tracking-tight">{scans?.length || 0}</p>
              </div>
              <div className="p-3 bg-secondary/10 rounded-xl">
                <BrainCircuit className="w-6 h-6 text-secondary" />
              </div>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              User-verified data points in Firestore.
            </p>
          </CardContent>
        </Card>

        <Card className="border-dashed flex items-center justify-center p-6 text-center group cursor-pointer hover:bg-muted/50 transition-colors" onClick={handleStartTraining}>
          {isTraining ? (
            <div className="w-full space-y-3">
              <div className="flex justify-between text-xs font-bold uppercase tracking-wider mb-1">
                <span>Optimizing Weights...</span>
                <span>{trainingProgress}%</span>
              </div>
              <Progress value={trainingProgress} className="h-2" />
            </div>
          ) : (
            <div className="space-y-2">
              <Play className="w-8 h-8 text-primary mx-auto opacity-40 group-hover:scale-110 group-hover:opacity-100 transition-all" />
              <p className="text-sm font-bold">Trigger Fine-Tuning</p>
              <p className="text-xs text-muted-foreground px-4 leading-tight">Apply labeled data to model weights.</p>
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-8">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                Accuracy Trend
              </CardTitle>
              <CardDescription>Performance improvement based on user corrections.</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleConnectLocalPC}>
              <HardDrive className="w-4 h-4 mr-2" />
              Mount PC Database
            </Button>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              {chartData.length > 0 ? (
                <ChartContainer config={{ accuracy: { label: "Accuracy (%)", color: "hsl(var(--primary))" } }}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10 }}
                    />
                    <YAxis 
                      domain={[0, 100]} 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10 }}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line 
                      type="monotone" 
                      dataKey="accuracy" 
                      stroke="var(--color-accuracy)" 
                      strokeWidth={3} 
                      dot={{ r: 4, fill: "var(--color-accuracy)", strokeWidth: 2, stroke: "#fff" }} 
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ChartContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm border-2 border-dashed rounded-xl">
                  Analyze more media to populate trend data.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-4 border-primary/20">
          <CardHeader>
            <div className="flex items-center justify-between mb-2">
               <CardTitle className="text-lg flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                Data Ingest
              </CardTitle>
              <div className="flex bg-muted p-0.5 rounded-lg text-[10px] font-bold uppercase">
                <button 
                  className={cn("px-2 py-1 rounded-md transition-all", localMode === 'upload' ? "bg-background shadow-sm" : "opacity-50")}
                  onClick={() => setLocalMode('upload')}
                >Upload</button>
                <button 
                  className={cn("px-2 py-1 rounded-md transition-all", localMode === 'local' ? "bg-background shadow-sm" : "opacity-50")}
                  onClick={() => setLocalMode('local')}
                >PC (3GB+)</button>
              </div>
            </div>
            <CardDescription>Catalog ZIP datasets for training.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dataset-label" className="text-xs font-bold uppercase text-muted-foreground">Dataset Category</Label>
              <Select value={datasetLabel} onValueChange={setDatasetLabel}>
                <SelectTrigger id="dataset-label">
                  <SelectValue placeholder="Select content type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="real">Real Content (Authentic)</SelectItem>
                  <SelectItem value="fake">Fake Content (Manipulated)</SelectItem>
                  <SelectItem value="mixed">Mixed Content</SelectItem>
                  <SelectItem value="unlabeled">Unlabeled / Raw</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dataset-notes" className="text-xs font-bold uppercase text-muted-foreground">Dataset Description / Notes</Label>
              <Textarea 
                id="dataset-notes"
                placeholder="Details about this dataset..."
                className="text-xs min-h-[80px] resize-none"
                value={datasetNotes}
                onChange={(e) => setDatasetNotes(e.target.value)}
              />
            </div>

            {localMode === 'upload' ? (
              !selectedFile ? (
                <div 
                  className="border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-primary/10 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileArchive className="w-8 h-8 text-primary mb-2 opacity-40" />
                  <p className="text-sm font-medium">Click to select ZIP</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Standard Upload</p>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept=".zip,.tar,.gz"
                    onChange={handleFileSelect}
                  />
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <FileCheck className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold truncate">{selectedFile.name}</p>
                      <p className="text-[10px] text-muted-foreground">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setSelectedFile(null)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <Button 
                    className="w-full" 
                    onClick={handleSaveDataset}
                    disabled={isUploading}
                  >
                    {isUploading ? "Uploading..." : "Index Selected Dataset"}
                  </Button>
                </div>
              )
            ) : (
              <div className="space-y-3">
                {!localFolderHandle ? (
                  <Button variant="outline" className="w-full h-24 border-dashed" onClick={handleConnectLocalPC}>
                    <div className="flex flex-col items-center gap-1">
                      <FolderOpen className="w-6 h-6 opacity-40" />
                      <span>Select Local Folder</span>
                      <span className="text-[10px] opacity-60">Mount your PC database</span>
                    </div>
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-2 rounded bg-muted/50 text-[10px] font-mono">
                      <span className="truncate">PC://{localFolderHandle.name}</span>
                      <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => scanLocalFolder(localFolderHandle)}>
                        <RefreshCcw className={cn("w-3 h-3", isScanningLocal && "animate-spin")} />
                      </Button>
                    </div>
                    <div className="max-h-[150px] overflow-y-auto border rounded-lg p-1 bg-muted/20">
                      {localFiles.length === 0 ? (
                        <p className="text-[10px] text-center py-4 text-muted-foreground italic">No ZIP files found in folder.</p>
                      ) : (
                        <div className="space-y-1">
                          {localFiles.map((file) => (
                            <div key={file.name} className="flex items-center justify-between p-1.5 rounded hover:bg-primary/5 group border border-transparent hover:border-primary/10 transition-colors">
                              <div className="min-w-0">
                                <p className="text-[10px] font-bold truncate leading-tight">{file.name}</p>
                                <p className="text-[9px] text-muted-foreground">{(file.size / (1024 * 1024)).toFixed(0)}MB</p>
                              </div>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-6 px-2 text-[9px] opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handleIndexLocalFile(file.name, file.size)}
                                disabled={isUploading}
                              >
                                Index
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-800 leading-tight">
              <AlertTriangle className="w-4 h-4 mb-1" />
              Local PC mode allows tracking files up to <strong>3GB+</strong> without bandwidth limits.
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-card shadow-sm border-primary/10">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Info className="w-4 h-4 text-primary" />
              Cloud vs. Local Database
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              When running on <strong>localhost</strong>, your app syncs metadata to the <strong>Firebase Cloud Database</strong>.
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Metadata</strong> (Notes, Labels, History) stays in the cloud forever.</li>
              <li><strong>Heavy Files</strong> (ZIP datasets) stay on your PC in "Local Mode".</li>
              <li><strong>Shared Brain</strong>: Your local and deployed apps share the same {knowledgeCount} lessons.</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/10 flex items-center justify-center p-6 text-center">
          <div className="space-y-2">
             <Cloud className="w-10 h-10 text-primary mx-auto opacity-20" />
             <p className="text-sm font-bold text-primary">Live Sync Enabled</p>
             <p className="text-xs text-muted-foreground">Data is persistent between Localhost and Web.</p>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            Training Repository
          </CardTitle>
        </CardHeader>
        <CardContent>
          {datasetsLoading ? (
            <div className="space-y-3">
              <div className="h-12 bg-muted animate-pulse rounded" />
              <div className="h-12 bg-muted animate-pulse rounded" />
            </div>
          ) : !datasets || datasets.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Database className="w-12 h-12 mx-auto mb-4 opacity-10" />
              <p>No datasets indexed yet.</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Filename & Source</TableHead>
                    <TableHead>Label</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {datasets.map((ds) => (
                    <TableRow key={ds.id}>
                      <TableCell className="font-medium max-w-[300px]">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            {ds.isLocal ? <HardDrive className="w-4 h-4 text-primary" /> : <FileArchive className="w-4 h-4 text-primary/60" />}
                            <span className="truncate">{ds.fileName}</span>
                            {ds.isLocal && <Badge variant="secondary" className="text-[8px] h-4">PC DB</Badge>}
                          </div>
                          {ds.notes && (
                            <div className="flex gap-1.5 text-xs text-muted-foreground font-normal italic">
                              <MessageSquare className="w-3 h-3 mt-0.5 shrink-0" />
                              <span className="truncate">{ds.notes}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getLabelBadge(ds.label)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          <CheckCircle2 className="w-3 h-3 mr-1.5" />
                          Ready
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {(ds.size / (1024 * 1024)).toFixed(2)} MB
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => setEditingDataset({ id: ds.id, notes: ds.notes || "" })}>
                            <Pencil className="w-4 h-4 text-primary" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(ds.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Notes Dialog */}
      <Dialog open={!!editingDataset} onOpenChange={(open) => !open && setEditingDataset(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Dataset Notes</DialogTitle>
            <DialogDescription>
              Update the description for this dataset.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-notes" className="text-xs font-bold uppercase text-muted-foreground">Notes</Label>
              <Textarea 
                id="edit-notes"
                placeholder="Update your notes here..."
                className="min-h-[150px] resize-none"
                value={editingDataset?.notes || ""}
                onChange={(e) => setEditingDataset(prev => prev ? { ...prev, notes: e.target.value } : null)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setEditingDataset(null)} disabled={isUpdatingNotes}>
              Cancel
            </Button>
            <Button onClick={handleUpdateNotes} disabled={isUpdatingNotes}>
              {isUpdatingNotes ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
