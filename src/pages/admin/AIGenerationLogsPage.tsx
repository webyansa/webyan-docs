import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, ChevronDown, ChevronUp, FileText, CheckCircle2, XCircle, Search as SearchIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface LogEntry {
  id: string;
  created_at: string;
  user_id: string | null;
  module: string;
  platform: string | null;
  tone: string | null;
  content_type: string | null;
  request_payload: any;
  response_payload: any;
  used_file_search: boolean;
  model_used: string | null;
  mode_used: string | null;
  latency_ms: number | null;
  status: string;
  error_message: string | null;
}

export default function AIGenerationLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('ai_generation_logs' as any)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (!error && data) {
      setLogs(data as any as LogEntry[]);
    }
    setLoading(false);
  };

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-7 w-7 text-primary" />
            سجل توليد AI
          </h1>
          <p className="text-muted-foreground mt-1">سجل تدقيق لجميع عمليات توليد المحتوى بالذكاء الاصطناعي</p>
        </div>
        <Button variant="outline" onClick={fetchLogs} disabled={loading} className="gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <SearchIcon className="h-4 w-4" />}
          تحديث
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">لا توجد سجلات بعد</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>المنصة</TableHead>
                  <TableHead>النبرة</TableHead>
                  <TableHead>النموذج</TableHead>
                  <TableHead>الوضع</TableHead>
                  <TableHead>File Search</TableHead>
                  <TableHead>الزمن</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <Collapsible key={log.id} open={expandedRow === log.id} onOpenChange={(open) => setExpandedRow(open ? log.id : null)} asChild>
                    <>
                      <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => setExpandedRow(expandedRow === log.id ? null : log.id)}>
                        <TableCell className="text-sm">{format(new Date(log.created_at), 'dd/MM/yyyy HH:mm', { locale: ar })}</TableCell>
                        <TableCell><Badge variant="outline">{log.platform || '—'}</Badge></TableCell>
                        <TableCell className="text-sm">{log.tone || '—'}</TableCell>
                        <TableCell className="text-sm font-mono">{log.model_used || '—'}</TableCell>
                        <TableCell>
                          <Badge variant={log.mode_used === 'assistants' ? 'default' : 'secondary'} className="text-xs">
                            {log.mode_used === 'assistants' ? 'Assistants' : 'Responses'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {log.used_file_search ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-muted-foreground" />
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{log.latency_ms ? `${(log.latency_ms / 1000).toFixed(1)}s` : '—'}</TableCell>
                        <TableCell>
                          <Badge variant={log.status === 'success' ? 'default' : 'destructive'} className="text-xs">
                            {log.status === 'success' ? 'نجاح' : 'فشل'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              {expandedRow === log.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                          </CollapsibleTrigger>
                        </TableCell>
                      </TableRow>
                      <CollapsibleContent asChild>
                        <TableRow>
                          <TableCell colSpan={9} className="bg-muted/30">
                            <div className="grid grid-cols-2 gap-4 p-4">
                              <div>
                                <h4 className="font-semibold text-sm mb-2">Request Payload</h4>
                                <ScrollArea className="h-[200px]">
                                  <pre className="text-xs bg-background p-3 rounded-md overflow-auto" dir="ltr">
                                    {JSON.stringify(log.request_payload, null, 2)}
                                  </pre>
                                </ScrollArea>
                              </div>
                              <div>
                                <h4 className="font-semibold text-sm mb-2">Response Payload</h4>
                                <ScrollArea className="h-[200px]">
                                  <pre className="text-xs bg-background p-3 rounded-md overflow-auto" dir="ltr">
                                    {JSON.stringify(log.response_payload, null, 2)}
                                  </pre>
                                </ScrollArea>
                              </div>
                              {log.error_message && (
                                <div className="col-span-2">
                                  <h4 className="font-semibold text-sm mb-1 text-destructive">رسالة الخطأ</h4>
                                  <p className="text-sm text-destructive">{log.error_message}</p>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      </CollapsibleContent>
                    </>
                  </Collapsible>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
