import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart } from 'recharts';
import { TrendingUp, Award, Target, Activity } from 'lucide-react';

interface MonthlyData {
  month: string;
  tickets: number;
  meetings: number;
  resolved: number;
  completed: number;
}

interface PerformanceChartsProps {
  monthlyData: MonthlyData[];
  ticketStats: {
    total: number;
    resolved: number;
    open: number;
    inProgress: number;
  };
  meetingStats: {
    total: number;
    completed: number;
    pending: number;
    confirmed: number;
  };
  showTickets: boolean;
  showMeetings: boolean;
}

const COLORS = {
  primary: 'hsl(var(--primary))',
  blue: '#3B82F6',
  emerald: '#10B981',
  amber: '#F59E0B',
  rose: '#F43F5E',
  violet: '#8B5CF6',
  slate: '#64748B',
};

const TICKET_COLORS = [COLORS.emerald, COLORS.blue, COLORS.amber];
const MEETING_COLORS = [COLORS.emerald, COLORS.amber, COLORS.blue];

export function PerformanceCharts({
  monthlyData,
  ticketStats,
  meetingStats,
  showTickets,
  showMeetings,
}: PerformanceChartsProps) {
  const ticketPieData = useMemo(() => [
    { name: 'تم الحل', value: ticketStats.resolved, color: COLORS.emerald },
    { name: 'مفتوحة', value: ticketStats.open, color: COLORS.blue },
    { name: 'قيد المعالجة', value: ticketStats.inProgress, color: COLORS.amber },
  ].filter(d => d.value > 0), [ticketStats]);

  const meetingPieData = useMemo(() => [
    { name: 'منتهية', value: meetingStats.completed, color: COLORS.emerald },
    { name: 'قيد الانتظار', value: meetingStats.pending, color: COLORS.amber },
    { name: 'مؤكدة', value: meetingStats.confirmed, color: COLORS.blue },
  ].filter(d => d.value > 0), [meetingStats]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background/95 backdrop-blur border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-sm mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm flex items-center gap-2" style={{ color: entry.color }}>
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const PieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-background/95 backdrop-blur border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium" style={{ color: data.payload.color }}>
            {data.name}: {data.value}
          </p>
        </div>
      );
    }
    return null;
  };

  if (!showTickets && !showMeetings) return null;

  return (
    <div className="space-y-6">
      {/* Monthly Performance Chart */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-2 bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">الأداء الشهري</CardTitle>
              <CardDescription>تطور أدائك خلال الأشهر الماضية</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTickets" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.blue} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={COLORS.blue} stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorMeetings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.emerald} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={COLORS.emerald} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="month" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                />
                <Tooltip content={<CustomTooltip />} />
                {showTickets && (
                  <>
                    <Area
                      type="monotone"
                      dataKey="resolved"
                      stroke={COLORS.blue}
                      strokeWidth={2}
                      fill="url(#colorTickets)"
                      name="تذاكر منجزة"
                    />
                  </>
                )}
                {showMeetings && (
                  <>
                    <Area
                      type="monotone"
                      dataKey="completed"
                      stroke={COLORS.emerald}
                      strokeWidth={2}
                      fill="url(#colorMeetings)"
                      name="اجتماعات منتهية"
                    />
                  </>
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-6 mt-4">
            {showTickets && (
              <div className="flex items-center gap-2 text-sm">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS.blue }} />
                <span className="text-muted-foreground">تذاكر منجزة</span>
              </div>
            )}
            {showMeetings && (
              <div className="flex items-center gap-2 text-sm">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS.emerald }} />
                <span className="text-muted-foreground">اجتماعات منتهية</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Distribution Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Ticket Distribution */}
        {showTickets && ticketStats.total > 0 && (
          <Card className="overflow-hidden">
            <CardHeader className="pb-2 bg-gradient-to-r from-blue-500/5 to-transparent">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Target className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-base">توزيع التذاكر</CardTitle>
                  <CardDescription>حالة التذاكر الموجهة إليك</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={ticketPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {ticketPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-4 mt-2">
                {ticketPieData.map((entry, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-muted-foreground">{entry.name}: {entry.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Meeting Distribution */}
        {showMeetings && meetingStats.total > 0 && (
          <Card className="overflow-hidden">
            <CardHeader className="pb-2 bg-gradient-to-r from-emerald-500/5 to-transparent">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <Activity className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <CardTitle className="text-base">توزيع الاجتماعات</CardTitle>
                  <CardDescription>حالة الاجتماعات المجدولة</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={meetingPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {meetingPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-4 mt-2">
                {meetingPieData.map((entry, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-muted-foreground">{entry.name}: {entry.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Activity Bar Chart */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-2 bg-gradient-to-r from-violet-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-violet-100 flex items-center justify-center">
              <Award className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <CardTitle className="text-base">إجمالي الأنشطة</CardTitle>
              <CardDescription>مقارنة بين المهام المستلمة والمنجزة</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <XAxis 
                  dataKey="month" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                />
                <Tooltip content={<CustomTooltip />} />
                {showTickets && (
                  <Bar 
                    dataKey="tickets" 
                    fill={COLORS.blue} 
                    name="التذاكر"
                    radius={[4, 4, 0, 0]}
                  />
                )}
                {showMeetings && (
                  <Bar 
                    dataKey="meetings" 
                    fill={COLORS.emerald} 
                    name="الاجتماعات"
                    radius={[4, 4, 0, 0]}
                  />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
