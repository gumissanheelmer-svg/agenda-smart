import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Building2, CheckCircle, Clock, DollarSign, TrendingUp, Ban } from "lucide-react";
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
  approved: "hsl(142, 60%, 45%)",
  pending: "hsl(43, 60%, 50%)",
  blocked: "hsl(0, 55%, 50%)",
  rejected: "hsl(0, 50%, 45%)",
  inactive: "hsl(220, 10%, 50%)",
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
    { name: "Ativadas", value: stats.approved, color: COLORS.approved },
    { name: "Ativação Pendente", value: stats.pending, color: COLORS.pending },
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
      title: "Ativadas",
      value: stats.approved,
      icon: CheckCircle,
      gradient: "from-green-500/20 to-green-500/5",
      iconColor: "text-green-500",
    },
    {
      title: "Ativação Pendente",
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
      className="space-y-8"
    >
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <motion.div key={stat.title} variants={item}>
            <Card className="relative overflow-hidden border-border/30 bg-card/50 backdrop-blur-sm">
              <CardContent className="relative p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground/80 mb-1.5">{stat.title}</p>
                    <p className="text-xl font-semibold tracking-tight">{stat.value}</p>
                  </div>
                  <stat.icon className={`h-7 w-7 ${stat.iconColor} opacity-60`} />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Area Chart - Growth */}
        <motion.div variants={item}>
          <Card className="border-border/30 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-medium text-foreground/90">Crescimento Mensal</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyData}>
                    <defs>
                      <linearGradient id="colorEmpresas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} vertical={false} />
                    <XAxis 
                      dataKey="month" 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      width={35}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        color: "hsl(var(--foreground))",
                        fontSize: "12px",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="empresas"
                      stroke="hsl(var(--primary))"
                      strokeWidth={1.5}
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
          <Card className="border-border/30 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-medium text-foreground/90">Distribuição por Status</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="h-[300px] flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={95}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        color: "hsl(var(--foreground))",
                        fontSize: "12px",
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={40}
                      iconType="circle"
                      iconSize={8}
                      formatter={(value) => (
                        <span style={{ color: "hsl(var(--muted-foreground))", fontSize: "11px" }}>{value}</span>
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
        <Card className="border-border/30 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-medium text-foreground/90">Vendas e Lucro por Mês</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <defs>
                    <linearGradient id="colorVendas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(200, 60%, 55%)" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="hsl(200, 60%, 45%)" stopOpacity={0.7} />
                    </linearGradient>
                    <linearGradient id="colorLucro" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(142, 50%, 50%)" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="hsl(142, 50%, 40%)" stopOpacity={0.7} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} vertical={false} />
                  <XAxis 
                    dataKey="month" 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    width={45}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--foreground))",
                      fontSize: "12px",
                    }}
                    formatter={(value: number) => [`${value.toLocaleString("pt-BR")} MT`]}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => (
                      <span style={{ color: "hsl(var(--muted-foreground))", fontSize: "11px" }}>{value}</span>
                    )}
                  />
                  <Bar
                    dataKey="vendas"
                    fill="url(#colorVendas)"
                    radius={[6, 6, 0, 0]}
                    name="Vendas"
                  />
                  <Bar
                    dataKey="lucro"
                    fill="url(#colorLucro)"
                    radius={[6, 6, 0, 0]}
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
