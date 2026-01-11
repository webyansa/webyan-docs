import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BarChart3,
  FileText,
  ThumbsUp,
  ThumbsDown,
  Search,
  Eye,
  TrendingUp,
  Loader2,
} from 'lucide-react';

interface TopArticle {
  id: string;
  title: string;
  views_count: number;
}

interface TopSearch {
  query: string;
  count: number;
}

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalArticles: 0,
    publishedArticles: 0,
    totalViews: 0,
    helpfulRate: 0,
    totalSearches: 0,
  });
  const [topArticles, setTopArticles] = useState<TopArticle[]>([]);
  const [topSearches, setTopSearches] = useState<TopSearch[]>([]);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      // Fetch article stats
      const { data: articles } = await supabase
        .from('docs_articles')
        .select('id, title, views_count, status');

      const totalArticles = articles?.length || 0;
      const publishedArticles = articles?.filter((a) => a.status === 'published').length || 0;
      const totalViews = articles?.reduce((sum, a) => sum + (a.views_count || 0), 0) || 0;

      // Top viewed articles
      const topViewedArticles = (articles || [])
        .sort((a, b) => (b.views_count || 0) - (a.views_count || 0))
        .slice(0, 5);

      setTopArticles(topViewedArticles);

      // Fetch feedback stats
      const { count: totalFeedback } = await supabase
        .from('docs_feedback')
        .select('*', { count: 'exact', head: true });

      const { count: helpfulFeedback } = await supabase
        .from('docs_feedback')
        .select('*', { count: 'exact', head: true })
        .eq('is_helpful', true);

      const helpfulRate = totalFeedback && totalFeedback > 0
        ? Math.round(((helpfulFeedback || 0) / totalFeedback) * 100)
        : 0;

      // Fetch search stats
      const { count: totalSearches } = await supabase
        .from('docs_search_logs')
        .select('*', { count: 'exact', head: true });

      // Top searches (aggregate by query)
      const { data: searchLogs } = await supabase
        .from('docs_search_logs')
        .select('query')
        .limit(500);

      const searchCounts: { [key: string]: number } = {};
      (searchLogs || []).forEach((log) => {
        const query = log.query.toLowerCase().trim();
        searchCounts[query] = (searchCounts[query] || 0) + 1;
      });

      const topSearchesList = Object.entries(searchCounts)
        .map(([query, count]) => ({ query, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      setTopSearches(topSearchesList);

      setStats({
        totalArticles,
        publishedArticles,
        totalViews,
        helpfulRate,
        totalSearches: totalSearches || 0,
      });
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

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
        <h1 className="text-2xl font-bold">التقارير</h1>
        <p className="text-muted-foreground">
          إحصائيات وتقارير أداء الدليل
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              المقالات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalArticles}</div>
            <p className="text-xs text-muted-foreground">
              {stats.publishedArticles} منشور
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Eye className="h-4 w-4 text-blue-500" />
              المشاهدات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalViews.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">إجمالي المشاهدات</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ThumbsUp className="h-4 w-4 text-green-500" />
              معدل الإفادة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.helpfulRate}%</div>
            <p className="text-xs text-muted-foreground">من التقييمات</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Search className="h-4 w-4 text-purple-500" />
              عمليات البحث
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSearches}</div>
            <p className="text-xs text-muted-foreground">إجمالي البحث</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-orange-500" />
              متوسط المشاهدات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalArticles > 0
                ? Math.round(stats.totalViews / stats.totalArticles)
                : 0}
            </div>
            <p className="text-xs text-muted-foreground">لكل مقال</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Reports */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Articles */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              أكثر المقالات قراءة
            </CardTitle>
            <CardDescription>المقالات الأعلى مشاهدة</CardDescription>
          </CardHeader>
          <CardContent>
            {topArticles.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                لا توجد مقالات بعد
              </p>
            ) : (
              <div className="space-y-4">
                {topArticles.map((article, index) => (
                  <div key={article.id} className="flex items-center gap-4">
                    <Badge variant="outline" className="w-8 h-8 flex items-center justify-center">
                      {index + 1}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{article.title}</p>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Eye className="h-3 w-3" />
                      <span className="text-sm">{article.views_count || 0}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Searches */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-purple-500" />
              أكثر الكلمات بحثاً
            </CardTitle>
            <CardDescription>ما يبحث عنه الزوار</CardDescription>
          </CardHeader>
          <CardContent>
            {topSearches.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                لا توجد عمليات بحث بعد
              </p>
            ) : (
              <div className="space-y-4">
                {topSearches.map((search, index) => (
                  <div key={search.query} className="flex items-center gap-4">
                    <Badge variant="outline" className="w-8 h-8 flex items-center justify-center">
                      {index + 1}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{search.query}</p>
                    </div>
                    <Badge variant="secondary">{search.count} مرة</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
