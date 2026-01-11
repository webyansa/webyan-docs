import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertTriangle, CheckCircle, Clock, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'sonner';

interface IssueReport {
  id: string;
  issue_type: string;
  description: string;
  reporter_email: string | null;
  status: string;
  created_at: string;
  article: {
    title: string;
    slug: string;
  } | null;
}

export default function IssuesPage() {
  const [issues, setIssues] = useState<IssueReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetchIssues();
  }, []);

  const fetchIssues = async () => {
    try {
      const { data, error } = await supabase
        .from('docs_issue_reports')
        .select(`
          id,
          issue_type,
          description,
          reporter_email,
          status,
          created_at,
          article:docs_articles(title, slug)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setIssues((data as unknown as IssueReport[]) || []);
    } catch (error) {
      console.error('Error fetching issues:', error);
      toast.error('حدث خطأ أثناء تحميل البلاغات');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (issueId: string, newStatus: string) => {
    setUpdating(issueId);
    try {
      const updateData: { status: string; resolved_at?: string } = { status: newStatus };
      if (newStatus === 'resolved') {
        updateData.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('docs_issue_reports')
        .update(updateData)
        .eq('id', issueId);

      if (error) throw error;

      setIssues((prev) =>
        prev.map((issue) =>
          issue.id === issueId ? { ...issue, status: newStatus } : issue
        )
      );
      toast.success('تم تحديث حالة البلاغ');
    } catch (error) {
      console.error('Error updating issue:', error);
      toast.error('حدث خطأ أثناء تحديث البلاغ');
    } finally {
      setUpdating(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return (
          <Badge className="bg-orange-100 text-orange-700 gap-1">
            <Clock className="h-3 w-3" />
            مفتوح
          </Badge>
        );
      case 'in_progress':
        return (
          <Badge className="bg-blue-100 text-blue-700 gap-1">
            <AlertTriangle className="h-3 w-3" />
            قيد المعالجة
          </Badge>
        );
      case 'resolved':
        return (
          <Badge className="bg-green-100 text-green-700 gap-1">
            <CheckCircle className="h-3 w-3" />
            تم الحل
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getIssueTypeBadge = (type: string) => {
    switch (type) {
      case 'incorrect_info':
        return <Badge variant="outline">معلومات غير صحيحة</Badge>;
      case 'missing_info':
        return <Badge variant="outline">معلومات ناقصة</Badge>;
      case 'unclear':
        return <Badge variant="outline">غير واضح</Badge>;
      case 'outdated':
        return <Badge variant="outline">قديم</Badge>;
      case 'other':
        return <Badge variant="outline">أخرى</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const openIssues = issues.filter((i) => i.status === 'open').length;
  const inProgressIssues = issues.filter((i) => i.status === 'in_progress').length;
  const resolvedIssues = issues.filter((i) => i.status === 'resolved').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">البلاغات</h1>
        <p className="text-muted-foreground">
          مراجعة بلاغات الزوار عن مشاكل المحتوى
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              مفتوحة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{openIssues}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-blue-500" />
              قيد المعالجة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{inProgressIssues}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              تم الحل
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{resolvedIssues}</div>
          </CardContent>
        </Card>
      </div>

      {/* Issues Table */}
      <Card>
        <CardHeader>
          <CardTitle>جميع البلاغات</CardTitle>
          <CardDescription>{issues.length} بلاغ</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {issues.length === 0 ? (
            <div className="text-center py-12">
              <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">لا توجد بلاغات</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المقال</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead>الوصف</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>تغيير الحالة</TableHead>
                  <TableHead>التاريخ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {issues.map((issue) => (
                  <TableRow key={issue.id}>
                    <TableCell className="font-medium">
                      {issue.article?.title || 'مقال محذوف'}
                    </TableCell>
                    <TableCell>{getIssueTypeBadge(issue.issue_type)}</TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">
                      {issue.description}
                    </TableCell>
                    <TableCell>{getStatusBadge(issue.status)}</TableCell>
                    <TableCell>
                      <Select
                        value={issue.status}
                        onValueChange={(value) => handleStatusChange(issue.id, value)}
                        disabled={updating === issue.id}
                      >
                        <SelectTrigger className="w-32">
                          {updating === issue.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <SelectValue />
                          )}
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">مفتوح</SelectItem>
                          <SelectItem value="in_progress">قيد المعالجة</SelectItem>
                          <SelectItem value="resolved">تم الحل</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(issue.created_at), 'dd MMM yyyy', { locale: ar })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
