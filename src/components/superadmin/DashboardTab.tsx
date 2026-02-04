import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Building2, CheckCircle, Clock, DollarSign, TrendingUp, XCircle, AlertTriangle, Ban } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";

interface Stats {
  total: number;
  pending: number;
  approved: number;
  blocked: number;
  rejected: number;
  inactive: number;
}

interface SalesStats {
  totalSales: number;
  totalCommissions: number;
  platformProfit: number;
  salesCount: number;
  activeAffiliates: number;
}

interface DashboardTabProps {
  stats: Stats;
  salesStats: SalesStats;
  monthlyData: Array<{ month: string; empresas: number; vendas: number; lucro: number }>;
}

const COLORS = {
  approved: "hsl(142, 76%, 36%)",
  pending: "hsl(43, 74%, 49%)",
  blocked: "hsl(0, 72%, 51%)",
  rejected: "hsl(0, 72%, 40%)",
  inactive: "hsl(220, 14%, 45%)",
};

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export function DashboardTab({ stats, salesStats, monthlyData }: DashboardTabProps) {
  const pieData = [
    { name: "Aprovadas", value: stats.approved, color: COLORS.approved },
    { name: "Pendentes", value: stats.pending, color: COLORS.pending },
    { name: "Bloqueadas", value: stats.blocked, color: COLORS.blocked },
    { name: "Rejeitadas", value: stats.rejected, color: COLORS.rejected },
    { name: "Inativas", value: stats.inactive, color: COLORS.inactive },
  ].filter(item => item.value > 0);

  const statCards = [
    {
      title: "Total de Empresas",
      value: stats.total,
      icon: Building2,
      gradient: "from-primary/20 to-primary/5",
      iconColor: "text-primary",
    },
    {
      title: "Ativas",
      value: stats.approved,
      icon: CheckCircle,
      gradient: "from-green-500/20 to-green-500/5",
      iconColor: "text-green-500",
    },
    {
      title: "Pendentes",
      value: stats.pending,
      icon: Clock,
      gradient: "from-yellow-500/20 to-yellow-500/5",
      iconColor: "text-yellow-500",
    },
    {
      title: "Bloqueadas",
      value: stats.blocked,
      icon: Ban,
      gradient: "from-red-500/20 to-red-500/5",
      iconColor: "text-red-500",
    },
    {
      title: "Vendas Vitalícias",
      value: salesStats.salesCount,
      icon: TrendingUp,
      gradient: "from-blue-500/20 to-blue-500/5",
      iconColor: "text-blue-500",
    },
    {
      title: "Total de Vendas",
      value: `${salesStats.totalSales.toLocaleString("pt-BR")} MT`,
      icon: DollarSign,
      gradient: "from-emerald-500/20 to-emerald-500/5",
      iconColor: "text-emerald-500",
    },
    {
      title: "Lucro da Plataforma",
      value: `${salesStats.platformProfit.toLocaleString("pt-BR")} MT`,
      icon: TrendingUp,
      gradient: "from-green-500/20 to-green-500/5",
      iconColor: "text-green-600",
    },
    {
      title: "Afiliados Ativos",
      value: salesStats.activeAffiliates,
      icon: CheckCircle,
      gradient: "from-cyan-500/20 to-cyan-500/5",
      iconColor: "text-cyan-500",
    },
  ];

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <motion.div key={stat.title} variants={item}>
            <Card className={`relative overflow-hidden border-border/50 bg-gradient-to-br ${stat.gradient}`}>
              <div className="absolute inset-0 bg-gradient-to-br from-transparent to-background/80" />
              <CardContent className="relative p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{stat.title}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                  <stat.icon className={`h-8 w-8 ${stat.iconColor} opacity-80`} />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Area Chart - Growth */}
        <motion.div variants={item}>
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium">Crescimento Mensal</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyData}>
                    <defs>
                      <linearGradient id="colorEmpresas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(43, 74%, 49%)" stopOpacity={0.5} />
                        <stop offset="95%" stopColor="hsl(43, 74%, 49%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(43, 20%, 18%)" />
                    <XAxis 
                      dataKey="month" 
                      stroke="hsl(43, 13%, 55%)" 
                      fontSize={12}
                    />
                    <YAxis stroke="hsl(43, 13%, 55%)" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(20, 14%, 10%)",
                        border: "1px solid hsl(43, 20%, 18%)",
                        borderRadius: "8px",
                        color: "hsl(43, 31%, 94%)",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="empresas"
                      stroke="hsl(43, 74%, 49%)"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorEmpresas)"
                      name="Empresas"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Pie Chart - Status Distribution */}
        <motion.div variants={item}>
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium">Distribuição por Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(20, 14%, 10%)",
                        border: "1px solid hsl(43, 20%, 18%)",
                        borderRadius: "8px",
                        color: "hsl(43, 31%, 94%)",
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      formatter={(value) => (
                        <span style={{ color: "hsl(43, 31%, 94%)" }}>{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Bar Chart - Sales & Profit */}
      <motion.div variants={item}>
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Vendas e Lucro por Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <defs>
                    <linearGradient id="colorVendas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(200, 80%, 50%)" stopOpacity={1} />
                      <stop offset="95%" stopColor="hsl(200, 80%, 50%)" stopOpacity={0.6} />
                    </linearGradient>
                    <linearGradient id="colorLucro" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={1} />
                      <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.6} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(43, 20%, 18%)" />
                  <XAxis dataKey="month" stroke="hsl(43, 13%, 55%)" fontSize={12} />
                  <YAxis stroke="hsl(43, 13%, 55%)" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(20, 14%, 10%)",
                      border: "1px solid hsl(43, 20%, 18%)",
                      borderRadius: "8px",
                      color: "hsl(43, 31%, 94%)",
                    }}
                    formatter={(value: number) => [`${value.toLocaleString("pt-BR")} MT`]}
                  />
                  <Legend
                    formatter={(value) => (
                      <span style={{ color: "hsl(43, 31%, 94%)" }}>{value}</span>
                    )}
                  />
                  <Bar
                    dataKey="vendas"
                    fill="url(#colorVendas)"
                    radius={[4, 4, 0, 0]}
                    name="Vendas"
                  />
                  <Bar
                    dataKey="lucro"
                    fill="url(#colorLucro)"
                    radius={[4, 4, 0, 0]}
                    name="Lucro"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
