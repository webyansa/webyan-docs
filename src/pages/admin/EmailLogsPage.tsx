import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, CheckCircle, XCircle, AlertTriangle, RefreshCw, Search, Filter } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface EmailLog {
  id: string;
  created_at: string;
  recipient_email: string;
  subject: string;
  email_type: string | null;
  method: string;
  status: string;
  error_message: string | null;
  metadata: unknown;
  sent_by: string | null;
}

type DbEmailLog = {
  id: string;
  created_at: string;
  recipient_email: string;
  subject: string;
  email_type: string | null;
  method: string;
  status: string;
  error_message: string | null;
  metadata: unknown;
  sent_by: string | null;
};

const EmailLogsPage = () => {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [methodFilter, setMethodFilter] = useState<string>("all");

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("email_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      if (methodFilter !== "all") {
        query = query.eq("method", methodFilter);
      }

      if (searchQuery) {
        query = query.or(`recipient_email.ilike.%${searchQuery}%,subject.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setLogs((data as DbEmailLog[] || []) as EmailLog[]);
    } catch (error) {
      console.error("Error fetching email logs:", error);
      toast.error("فشل في تحميل سجلات البريد");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [statusFilter, methodFilter]);

  const handleSearch = () => {
    fetchLogs();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle className="h-3 w-3 ml-1" />
            نجاح
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 ml-1" />
            فشل
          </Badge>
        );
      case "fallback":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
            <AlertTriangle className="h-3 w-3 ml-1" />
            احتياطي
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getMethodBadge = (method: string) => {
    switch (method) {
      case "smtp":
        return <Badge variant="outline">SMTP</Badge>;
      case "resend":
        return <Badge variant="secondary">Resend</Badge>;
      default:
        return <Badge variant="secondary">{method}</Badge>;
    }
  };

  const getEmailTypeLabel = (type: string | null) => {
    const types: Record<string, string> = {
      ticket_created: "تذكرة جديدة",
      ticket_reply: "رد على تذكرة",
      ticket_resolved: "حل تذكرة",
      ticket_closed: "إغلاق تذكرة",
      meeting_confirmed: "تأكيد اجتماع",
      meeting_cancelled: "إلغاء اجتماع",
      welcome: "ترحيب",
      password_reset: "استعادة كلمة المرور",
      subscription: "اشتراك",
      general: "عام",
    };
    return types[type || "general"] || type || "عام";
  };

  // Calculate stats
  const stats = {
    total: logs.length,
    success: logs.filter(l => l.status === "success").length,
    failed: logs.filter(l => l.status === "failed").length,
    fallback: logs.filter(l => l.status === "fallback").length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">سجل البريد الإلكتروني</h1>
        <p className="text-muted-foreground">متابعة الرسائل المرسلة وحالتها</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">إجمالي الرسائل</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Mail className="h-8 w-8 text-primary opacity-80" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">نجحت</p>
                <p className="text-2xl font-bold text-green-600">{stats.success}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500 opacity-80" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">فشلت</p>
                <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500 opacity-80" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">احتياطي</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.fallback}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-500 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            تصفية السجلات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="بحث بالبريد أو الموضوع..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pr-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="success">نجاح</SelectItem>
                <SelectItem value="failed">فشل</SelectItem>
                <SelectItem value="fallback">احتياطي</SelectItem>
              </SelectContent>
            </Select>
            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="الطريقة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الطرق</SelectItem>
                <SelectItem value="smtp">SMTP</SelectItem>
                <SelectItem value="resend">Resend</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleSearch} variant="secondary">
              <Search className="h-4 w-4 ml-2" />
              بحث
            </Button>
            <Button onClick={fetchLogs} variant="outline">
              <RefreshCw className="h-4 w-4 ml-2" />
              تحديث
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>سجل الرسائل</CardTitle>
          <CardDescription>آخر 100 رسالة مرسلة</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>لا توجد سجلات بريد إلكتروني</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>المستلم</TableHead>
                    <TableHead>الموضوع</TableHead>
                    <TableHead>النوع</TableHead>
                    <TableHead>الطريقة</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>الخطأ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {format(new Date(log.created_at), "dd MMM yyyy HH:mm", { locale: ar })}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate" title={log.recipient_email}>
                        {log.recipient_email}
                      </TableCell>
                      <TableCell className="max-w-[250px] truncate" title={log.subject}>
                        {log.subject}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {getEmailTypeLabel(log.email_type)}
                        </Badge>
                      </TableCell>
                      <TableCell>{getMethodBadge(log.method)}</TableCell>
                      <TableCell>{getStatusBadge(log.status)}</TableCell>
                      <TableCell className="max-w-[200px]">
                        {log.error_message ? (
                          <span 
                            className="text-xs text-red-600 truncate block" 
                            title={log.error_message}
                          >
                            {log.error_message.length > 50 
                              ? log.error_message.substring(0, 50) + "..." 
                              : log.error_message}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
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
  );
};

export default EmailLogsPage;
