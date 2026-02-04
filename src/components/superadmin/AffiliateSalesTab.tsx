import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { Plus, DollarSign, TrendingUp, Percent, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";

interface Affiliate {
  id: string;
  name: string;
  commission_fixed: number;
  active: boolean;
}

interface Business {
  id: string;
  name: string;
}

interface AffiliateSale {
  id: string;
  affiliate_id: string;
  affiliate_name?: string;
  business_id: string;
  business_name?: string;
  sale_value: number;
  commission_value: number;
  platform_profit: number;
  created_at: string;
}

interface AffiliateSalesTabProps {
  affiliates: Affiliate[];
  businesses: Business[];
  sales: AffiliateSale[];
  stats: {
    totalSales: number;
    totalCommissions: number;
    platformProfit: number;
    salesCount: number;
  };
  monthlyData: Array<{
    month: string;
    vendas: number;
    comissoes: number;
    lucro: number;
  }>;
  affiliatePerformance: Array<{
    name: string;
    sales: number;
  }>;
  onCreateSale: (data: { affiliate_id: string; business_id: string; sale_value: number; commission_value: number }) => Promise<void>;
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export function AffiliateSalesTab({
  affiliates,
  businesses,
  sales,
  stats,
  monthlyData,
  affiliatePerformance,
  onCreateSale,
}: AffiliateSalesTabProps) {
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    affiliate_id: '',
    business_id: '',
    sale_value: 0,
    commission_value: 0,
  });

  const resetForm = () => {
    setFormData({ affiliate_id: '', business_id: '', sale_value: 0, commission_value: 0 });
  };

  const handleAffiliateChange = (affiliateId: string) => {
    const affiliate = affiliates.find(a => a.id === affiliateId);
    setFormData({
      ...formData,
      affiliate_id: affiliateId,
      commission_value: affiliate?.commission_fixed || 0,
    });
  };

  const handleCreate = async () => {
    if (!formData.affiliate_id || !formData.business_id) {
      toast({ title: 'Erro', description: 'Selecione afiliado e negócio', variant: 'destructive' });
      return;
    }
    
    if (formData.sale_value <= 0) {
      toast({ title: 'Erro', description: 'Valor da venda deve ser maior que zero', variant: 'destructive' });
      return;
    }
    
    setIsLoading(true);
    try {
      await onCreateSale(formData);
      toast({ title: 'Sucesso', description: 'Venda registrada com sucesso' });
      setIsCreating(false);
      resetForm();
    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível registrar a venda', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const activeAffiliates = affiliates.filter(a => a.active);

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div variants={item}>
          <Card className="border-border/50 bg-gradient-to-br from-blue-500/20 to-blue-500/5 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-transparent to-background/80" />
            <CardContent className="relative p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Total de Vendas</p>
                  <p className="text-2xl font-bold">{stats.totalSales.toLocaleString('pt-BR')} MT</p>
                </div>
                <DollarSign className="h-8 w-8 text-blue-500 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="border-border/50 bg-gradient-to-br from-orange-500/20 to-orange-500/5 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-transparent to-background/80" />
            <CardContent className="relative p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Total Comissões</p>
                  <p className="text-2xl font-bold">{stats.totalCommissions.toLocaleString('pt-BR')} MT</p>
                </div>
                <Percent className="h-8 w-8 text-orange-500 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="border-border/50 bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-transparent to-background/80" />
            <CardContent className="relative p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">💰 Lucro Agenda Smart</p>
                  <p className="text-2xl font-bold text-emerald-400">{stats.platformProfit.toLocaleString('pt-BR')} MT</p>
                </div>
                <TrendingUp className="h-8 w-8 text-emerald-500 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="border-border/50 bg-gradient-to-br from-purple-500/20 to-purple-500/5 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-transparent to-background/80" />
            <CardContent className="relative p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Negócios Vendidos</p>
                  <p className="text-2xl font-bold">{stats.salesCount}</p>
                </div>
                <Building2 className="h-8 w-8 text-purple-500 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart - Affiliate Performance */}
        <motion.div variants={item}>
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium">Afiliado × Barbearias/Salões Vendidas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={affiliatePerformance} layout="vertical">
                    <defs>
                      <linearGradient id="colorAffSales" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="5%" stopColor="hsl(43, 74%, 49%)" stopOpacity={1} />
                        <stop offset="95%" stopColor="hsl(43, 74%, 49%)" stopOpacity={0.6} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(43, 20%, 18%)" />
                    <XAxis type="number" stroke="hsl(43, 13%, 55%)" fontSize={12} />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      stroke="hsl(43, 13%, 55%)" 
                      fontSize={12}
                      width={100}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(20, 14%, 10%)",
                        border: "1px solid hsl(43, 20%, 18%)",
                        borderRadius: "8px",
                        color: "hsl(43, 31%, 94%)",
                      }}
                    />
                    <Bar
                      dataKey="sales"
                      fill="url(#colorAffSales)"
                      radius={[0, 4, 4, 0]}
                      name="Vendas"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Area Chart - Financial Line */}
        <motion.div variants={item}>
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium">Linha Financeira (Vendas × Comissões × Lucro)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyData}>
                    <defs>
                      <linearGradient id="colorVendas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(210, 100%, 50%)" stopOpacity={0.5} />
                        <stop offset="95%" stopColor="hsl(210, 100%, 50%)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorComissoes" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(30, 100%, 50%)" stopOpacity={0.5} />
                        <stop offset="95%" stopColor="hsl(30, 100%, 50%)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorLucro" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.5} />
                        <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0} />
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
                      formatter={(value: number) => [`${value.toLocaleString('pt-BR')} MT`]}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="vendas"
                      stroke="hsl(210, 100%, 50%)"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorVendas)"
                      name="Vendas"
                    />
                    <Area
                      type="monotone"
                      dataKey="comissoes"
                      stroke="hsl(30, 100%, 50%)"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorComissoes)"
                      name="Comissões"
                    />
                    <Area
                      type="monotone"
                      dataKey="lucro"
                      stroke="hsl(142, 76%, 36%)"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorLucro)"
                      name="Lucro"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Sales Table */}
      <motion.div variants={item}>
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg font-medium">Vendas de Afiliados</CardTitle>
              <CardDescription>Registro de vendas realizadas por afiliados</CardDescription>
            </div>
            
            <Dialog open={isCreating} onOpenChange={setIsCreating}>
              <DialogTrigger asChild>
                <Button onClick={() => { resetForm(); setIsCreating(true); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Registrar Venda
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Registrar Venda</DialogTitle>
                  <DialogDescription>Registre uma nova venda realizada por um afiliado</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="affiliate">Afiliado *</Label>
                    <Select
                      value={formData.affiliate_id}
                      onValueChange={handleAffiliateChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o afiliado" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeAffiliates.map((affiliate) => (
                          <SelectItem key={affiliate.id} value={affiliate.id}>
                            {affiliate.name} (Comissão: {affiliate.commission_fixed.toLocaleString('pt-BR')} MT)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="business">Negócio *</Label>
                    <Select
                      value={formData.business_id}
                      onValueChange={(value) => setFormData({ ...formData, business_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o negócio vendido" />
                      </SelectTrigger>
                      <SelectContent>
                        {businesses.map((business) => (
                          <SelectItem key={business.id} value={business.id}>
                            {business.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sale_value">Valor da Venda (MT) *</Label>
                    <Input
                      id="sale_value"
                      type="number"
                      min="0"
                      step="100"
                      value={formData.sale_value}
                      onChange={(e) => setFormData({ ...formData, sale_value: Number(e.target.value) })}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="commission_value">Comissão (MT)</Label>
                    <Input
                      id="commission_value"
                      type="number"
                      min="0"
                      step="100"
                      value={formData.commission_value}
                      onChange={(e) => setFormData({ ...formData, commission_value: Number(e.target.value) })}
                      placeholder="0"
                    />
                    <p className="text-xs text-muted-foreground">
                      Lucro da plataforma: {(formData.sale_value - formData.commission_value).toLocaleString('pt-BR')} MT
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreating(false)}>Cancelar</Button>
                  <Button onClick={handleCreate} disabled={isLoading}>
                    {isLoading ? 'Registrando...' : 'Registrar Venda'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>

          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Afiliado</TableHead>
                  <TableHead>Negócio</TableHead>
                  <TableHead className="text-right">Valor Venda</TableHead>
                  <TableHead className="text-right">Comissão</TableHead>
                  <TableHead className="text-right">Lucro Plataforma</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Nenhuma venda registrada
                    </TableCell>
                  </TableRow>
                ) : (
                  sales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell>
                        {format(new Date(sale.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="font-medium">{sale.affiliate_name}</TableCell>
                      <TableCell>{sale.business_name}</TableCell>
                      <TableCell className="text-right">{sale.sale_value.toLocaleString('pt-BR')} MT</TableCell>
                      <TableCell className="text-right text-orange-400">{sale.commission_value.toLocaleString('pt-BR')} MT</TableCell>
                      <TableCell className="text-right text-emerald-400 font-medium">
                        {sale.platform_profit.toLocaleString('pt-BR')} MT
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
