import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  FolderKanban, Search, Filter, Eye, Calendar, Building2, Users
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { projectStatuses, priorities, projectPhases } from '@/lib/operations/projectConfig';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export default function ProjectsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  // Fetch projects
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_implementations')
        .select(`
          *,
          account:client_organizations(id, name),
          implementer:staff_members!crm_implementations_implementer_id_fkey(id, full_name),
          csm:staff_members!crm_implementations_csm_id_fkey(id, full_name),
          project_manager:staff_members!crm_implementations_project_manager_id_fkey(id, full_name),
          project_phases(id, phase_type, status)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Filter projects
  const filteredProjects = projects.filter((project: any) => {
    const matchesSearch = 
      project.project_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.account?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || project.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const getProjectProgress = (project: any) => {
    const phases = project.project_phases || [];
    const completedPhases = phases.filter((p: any) => p.status === 'completed').length;
    return phases.length > 0 ? Math.round((completedPhases / phases.length) * 100) : 0;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">المشاريع</h1>
          <p className="text-muted-foreground">إدارة ومتابعة جميع المشاريع</p>
        </div>
        <Link to="/admin/operations">
          <Button variant="outline">
            <FolderKanban className="h-4 w-4 ml-2" />
            لوحة العمليات
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="البحث في المشاريع..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 ml-2" />
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                {Object.entries(projectStatuses).map(([key, value]) => (
                  <SelectItem key={key} value={key}>
                    {value.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="الأولوية" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأولويات</SelectItem>
                {Object.entries(priorities).map(([key, value]) => (
                  <SelectItem key={key} value={key}>
                    {value.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Projects Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>المشروع</TableHead>
                <TableHead>العميل</TableHead>
                <TableHead>المرحلة</TableHead>
                <TableHead>التقدم</TableHead>
                <TableHead>الفريق</TableHead>
                <TableHead>الأولوية</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead className="w-[100px]">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProjects.map((project: any) => {
                const statusConfig = projectStatuses[project.status as keyof typeof projectStatuses];
                const priorityConfig = priorities[project.priority as keyof typeof priorities];
                const progress = getProjectProgress(project);
                const currentPhase = projectPhases[project.stage as keyof typeof projectPhases];

                return (
                  <TableRow key={project.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{project.project_name}</p>
                        {project.received_date && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(project.received_date), 'PP', { locale: ar })}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span>{project.account?.name || '-'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {currentPhase ? (
                        <Badge variant="outline" className={cn(currentPhase.color)}>
                          {currentPhase.label}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="w-24">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex -space-x-2 space-x-reverse">
                        {project.implementer && (
                          <Avatar className="h-7 w-7 border-2 border-background">
                            <AvatarFallback className="text-xs bg-blue-100">
                              {project.implementer.full_name?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        {project.csm && (
                          <Avatar className="h-7 w-7 border-2 border-background">
                            <AvatarFallback className="text-xs bg-green-100">
                              {project.csm.full_name?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        {project.project_manager && (
                          <Avatar className="h-7 w-7 border-2 border-background">
                            <AvatarFallback className="text-xs bg-purple-100">
                              {project.project_manager.full_name?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        {!project.implementer && !project.csm && !project.project_manager && (
                          <span className="text-muted-foreground text-sm">غير معيّن</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {priorityConfig ? (
                        <Badge variant="outline" className={cn(priorityConfig.color)}>
                          {priorityConfig.label}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn(statusConfig?.color)}>
                        {statusConfig?.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Link to={`/admin/projects/${project.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}

              {filteredProjects.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <p className="text-muted-foreground">لا توجد مشاريع</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
