"use client"

import * as React from "react"
import { History, FileText, CheckCircle2, XCircle, Search, Trash2, Image as ImageIcon, Music, Video } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"

export interface HistoryItem {
  id: string
  timestamp: string
  fileName: string
  isDeepfake: boolean
  confidence: number
  type: 'image' | 'audio' | 'video'
}

interface DetectionHistoryProps {
  items: HistoryItem[]
  onClear: () => void
  onSelectItem: (id: string) => void
}

export function DetectionHistory({ items, onClear, onSelectItem }: DetectionHistoryProps) {
  const [searchTerm, setSearchTerm] = React.useState("")

  const filteredItems = items.filter(item => 
    item.fileName.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'audio': return <Music className="w-4 h-4 text-primary" />
      case 'video': return <Video className="w-4 h-4 text-primary" />
      default: return <ImageIcon className="w-4 h-4 text-primary" />
    }
  }

  return (
    <Card className="border-none shadow-none bg-transparent">
      <CardHeader className="px-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 font-headline text-2xl">
              <History className="w-6 h-6 text-primary" />
              Recent Scans
            </CardTitle>
            <CardDescription>Multi-modal detection history</CardDescription>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search scans..."
                className="pl-9 h-9 w-full sm:w-[250px]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" size="sm" onClick={onClear} disabled={items.length === 0}>
              <Trash2 className="w-4 h-4 mr-2" />
              Clear
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-0">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-card rounded-xl border border-dashed text-muted-foreground">
            <FileText className="w-12 h-12 mb-4 opacity-20" />
            <p className="font-medium">No detection history yet</p>
            <p className="text-sm">Upload media to see results here</p>
          </div>
        ) : (
          <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="font-semibold">Media Type & Name</TableHead>
                  <TableHead className="font-semibold">Analyzed At</TableHead>
                  <TableHead className="font-semibold">Verdict</TableHead>
                  <TableHead className="font-semibold text-right">Confidence</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow 
                    key={item.id} 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => onSelectItem(item.id)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        {getTypeIcon(item.type)}
                        <span className="truncate max-w-[200px]">{item.fileName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(item.timestamp).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={item.isDeepfake ? "destructive" : "outline"} 
                        className={cn("flex items-center gap-1.5 w-fit", !item.isDeepfake && "text-green-600 border-green-200 bg-green-50")}
                      >
                        {item.isDeepfake ? (
                          <>
                            <XCircle className="w-3 h-3" />
                            Fake
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3 h-3" />
                            Real
                          </>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {item.confidence}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
