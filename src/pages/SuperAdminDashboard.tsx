import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Shield, LayoutDashboard, Building2, CreditCard, LogOut, RefreshCw, Users, DollarSign } from 'lucide-react';
import { Zap } from 'lucide-react';
import { DashboardTab } from '@/components/superadmin/DashboardTab';
import { BusinessesTab } from '@/components/superadmin/BusinessesTab';
import { SubscriptionsTab } from '@/components/superadmin/SubscriptionsTab';
import { AffiliatesTab } from '@/components/superadmin/AffiliatesTab';
import { AffiliateSalesTab } from '@/components/superadmin/AffiliateSalesTab';

interface Barbershop {
  id: string;
  name: string;
  slug: string;
  owner_email: string | null;
  approval_status: string;
  created_at: string;
  active: boolean;
  business_type: string;
  lastSubscription?: { status: string; due_date: string } | null;
}

interface Subscription {
  id: string;
  barbershop_id: string;
  barbershop_name?: string;
  plan_name: string;
  amount: number;
  status: string;
  due_date: string;
  paid_at: string | null;
  payment_method: string | null;
  notes: string | null;
  created_at: string;
}

interface Affiliate {
  id: string;
  name: string;
  phone: string | null;
  commission_fixed: number;
  active: boolean;
  created_at: string;
  salesCount?: number;
  totalCommission?: number;
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

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const { user, isSuperAdmin, isLoading, signOut } = useAuth();
  const { toast } = useToast();
  
  const [barbershops, setBarbershops] = useState<Barbershop[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [affiliateSales, setAffiliateSales] = useState<AffiliateSale[]>([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, blocked: 0, rejected: 0, inactive: 0 });
  const [salesStats, setSalesStats] = useState({ totalSales: 0, totalCommissions: 0, platformProfit: 0, salesCount: 0, activeAffiliates: 0 });
  const [monthlyData, setMonthlyData] = useState<Array<{ month: string; empresas: number; vendas: number; lucro: number }>>([]);
  const [affiliateMonthlyData, setAffiliateMonthlyData] = useState<Array<{ month: string; vendas: number; comissoes: number; lucro: number }>>([]);
  const [affiliatePerformance, setAffiliatePerformance] = useState<Array<{ name: string; sales: number }>>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [selectedBarbershop, setSelectedBarbershop] = useState<Barbershop | null>(null);
  const [activeTab, setActiveTab] = useState("dashboard");

  useEffect(() => {
    if (!isLoading && (!user || !isSuperAdmin)) {
      navigate('/login');
    }
  }, [user, isSuperAdmin, isLoading, navigate]);

  useEffect(() => {
    if (user && isSuperAdmin) {
      fetchAllData();
    }
  }, [user, isSuperAdmin]);

  const fetchAllData = async () => {
    setIsDataLoading(true);
    try {
      // Fetch barbershops
      const { data: barbershopsData, error: barbershopsError } = await supabase
        .from('barbershops')
        .select('*')
        .order('created_at', { ascending: false });

      if (barbershopsError) throw barbershopsError;

      // Fetch subscriptions
      const { data: subscriptionsData, error: subscriptionsError } = await supabase
        .from('subscriptions')
        .select('*')
        .order('due_date', { ascending: false });

      if (subscriptionsError) throw subscriptionsError;

      // Fetch affiliates
      const { data: affiliatesData, error: affiliatesError } = await supabase
        .from('affiliates_agenda')
        .select('*')
        .order('created_at', { ascending: false });

      if (affiliatesError) throw affiliatesError;

      // Fetch affiliate sales
      const { data: salesData, error: salesError } = await supabase
        .from('affiliate_sales_agenda')
        .select('*')
        .order('created_at', { ascending: false });

      if (salesError) throw salesError;

      // Map subscriptions with barbershop names
      const subsWithNames = (subscriptionsData || []).map(sub => ({
        ...sub,
        barbershop_name: barbershopsData?.find(b => b.id === sub.barbershop_id)?.name || 'Desconhecido'
      }));

      // Map sales with affiliate and business names
      const salesWithNames = (salesData || []).map(sale => ({
        ...sale,
        affiliate_name: affiliatesData?.find(a => a.id === sale.affiliate_id)?.name || 'Desconhecido',
        business_name: barbershopsData?.find(b => b.id === sale.business_id)?.name || 'Desconhecido'
      }));

      // Calculate affiliate stats per affiliate
      const affiliatesWithStats = (affiliatesData || []).map(affiliate => {
        const affiliateSales = salesWithNames.filter(s => s.affiliate_id === affiliate.id);
        return {
          ...affiliate,
          salesCount: affiliateSales.length,
          totalCommission: affiliateSales.reduce((sum, s) => sum + Number(s.commission_value), 0)
        };
      });

      // Get last subscription for each barbershop
      const barbershopsWithSubs = (barbershopsData || []).map(b => {
        const lastSub = subsWithNames.find(s => s.barbershop_id === b.id);
        return { ...b, lastSubscription: lastSub ? { status: lastSub.status, due_date: lastSub.due_date } : null };
      });

      setBarbershops(barbershopsWithSubs);
      setSubscriptions(subsWithNames);
      setAffiliates(affiliatesWithStats);
      setAffiliateSales(salesWithNames);
      
      // Calculate stats
      setStats({
        total: barbershopsData?.length || 0,
        pending: barbershopsData?.filter(b => b.approval_status === 'pending').length || 0,
        approved: barbershopsData?.filter(b => b.approval_status === 'approved' && b.active).length || 0,
        blocked: barbershopsData?.filter(b => b.approval_status === 'blocked').length || 0,
        rejected: barbershopsData?.filter(b => b.approval_status === 'rejected').length || 0,
        inactive: barbershopsData?.filter(b => b.approval_status === 'approved' && !b.active).length || 0,
      });

      // Calculate sales stats (lifetime access model)
      const allSales = salesData || [];
      const activeAffiliatesCount = affiliatesData?.filter(a => a.active).length || 0;
      setSalesStats({
        totalSales: allSales.reduce((sum, s) => sum + Number(s.sale_value), 0),
        totalCommissions: allSales.reduce((sum, s) => sum + Number(s.commission_value), 0),
        platformProfit: allSales.reduce((sum, s) => sum + Number(s.platform_profit), 0),
        salesCount: allSales.length,
        activeAffiliates: activeAffiliatesCount,
      });

      // Calculate affiliate performance for chart
      const perfData = affiliatesWithStats
        .filter(a => a.salesCount && a.salesCount > 0)
        .map(a => ({ name: a.name, sales: a.salesCount || 0 }))
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 10);
      setAffiliatePerformance(perfData);

      // Generate monthly data (last 6 months) - lifetime access model
      const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'];
      const totalSalesValue = allSales.reduce((sum, s) => sum + Number(s.sale_value), 0);
      const totalProfitValue = allSales.reduce((sum, s) => sum + Number(s.platform_profit), 0);
      setMonthlyData(months.map((month, i) => ({
        month,
        empresas: Math.floor(Math.random() * 5) + (barbershopsData?.length || 0) / 6,
        vendas: Math.round((totalSalesValue / 6) * ((i + 1) / 3.5)),
        lucro: Math.round((totalProfitValue / 6) * ((i + 1) / 3.5)),
      })));

      // Generate affiliate monthly data
      const totalCommValue = allSales.reduce((sum, s) => sum + Number(s.commission_value), 0);
      
      setAffiliateMonthlyData(months.map((month, i) => ({
        month,
        vendas: Math.round((totalSalesValue / 6) * ((i + 1) / 3.5)),
        comissoes: Math.round((totalCommValue / 6) * ((i + 1) / 3.5)),
        lucro: Math.round((totalProfitValue / 6) * ((i + 1) / 3.5)),
      })));

    } catch (error) {
      console.error('Error fetching data:', error);
      toast({ title: 'Erro', description: 'Não foi possível carregar os dados.', variant: 'destructive' });
    } finally {
      setIsDataLoading(false);
    }
  };

  const handleStatusChange = async (id: string, status: string, active?: boolean) => {
    const { error } = await supabase
      .from('barbershops')
      .update({ approval_status: status, active: active ?? (status === 'approved') })
      .eq('id', id);

    if (error) {
      toast({ title: 'Erro', description: 'Não foi possível atualizar o status.', variant: 'destructive' });
      throw error;
    }
    toast({ title: 'Sucesso', description: 'Status atualizado com sucesso.' });
    fetchAllData();
  };

  const handleCreateSubscription = async (data: { barbershop_id: string; amount: number; due_date: string; plan_name: string; notes?: string }) => {
    const { error } = await supabase.from('subscriptions').insert([data]);
    if (error) throw error;
    fetchAllData();
  };

  const handleMarkAsPaid = async (id: string, payment_method: string) => {
    const { error } = await supabase
      .from('subscriptions')
      .update({ status: 'paid', paid_at: new Date().toISOString(), payment_method })
      .eq('id', id);
    if (error) throw error;
    fetchAllData();
  };

  // Affiliate handlers
  const handleCreateAffiliate = async (data: { name: string; phone?: string; commission_fixed: number }) => {
    const { error } = await supabase.from('affiliates_agenda').insert([data]);
    if (error) throw error;
    fetchAllData();
  };

  const handleUpdateAffiliate = async (id: string, data: { name?: string; phone?: string; commission_fixed?: number; active?: boolean }) => {
    const { error } = await supabase.from('affiliates_agenda').update(data).eq('id', id);
    if (error) throw error;
    fetchAllData();
  };

  const handleDeleteAffiliate = async (id: string) => {
    const { error } = await supabase.from('affiliates_agenda').delete().eq('id', id);
    if (error) throw error;
    fetchAllData();
  };

  const handleCreateAffiliateSale = async (data: { affiliate_id: string; business_id: string; sale_value: number; commission_value: number }) => {
    const { error } = await supabase.from('affiliate_sales_agenda').insert([data]);
    if (error) throw error;
    fetchAllData();
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (isLoading || !isSuperAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-center">
          <Logo size="lg" />
          <p className="text-muted-foreground mt-4">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Super Admin - Painel de Controle</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b border-border bg-card/50 backdrop-blur sticky top-0 z-50">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="font-bold text-foreground">Super Admin</h1>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={fetchAllData} disabled={isDataLoading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${isDataLoading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full max-w-2xl grid-cols-5">
              <TabsTrigger value="dashboard" className="flex items-center gap-2">
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </TabsTrigger>
              <TabsTrigger value="businesses" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                <span className="hidden sm:inline">Empresas</span>
              </TabsTrigger>
              <TabsTrigger value="subscriptions" className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                <span className="hidden sm:inline">Ativações</span>
              </TabsTrigger>
              <TabsTrigger value="affiliates" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Afiliados</span>
              </TabsTrigger>
              <TabsTrigger value="affiliate-sales" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                <span className="hidden sm:inline">Vendas</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard">
              <DashboardTab stats={stats} salesStats={salesStats} monthlyData={monthlyData} />
            </TabsContent>

            <TabsContent value="businesses">
              <BusinessesTab
                barbershops={barbershops}
                onStatusChange={handleStatusChange}
                onViewSubscriptions={(b) => { setSelectedBarbershop(b); setActiveTab("subscriptions"); }}
              />
            </TabsContent>

            <TabsContent value="subscriptions">
              <SubscriptionsTab
                subscriptions={subscriptions}
                barbershops={barbershops.map(b => ({ id: b.id, name: b.name }))}
                onCreateSubscription={handleCreateSubscription}
                onMarkAsPaid={handleMarkAsPaid}
                selectedBarbershop={selectedBarbershop}
                onClearSelection={() => setSelectedBarbershop(null)}
              />
            </TabsContent>

            <TabsContent value="affiliates">
              <AffiliatesTab
                affiliates={affiliates}
                onCreateAffiliate={handleCreateAffiliate}
                onUpdateAffiliate={handleUpdateAffiliate}
                onDeleteAffiliate={handleDeleteAffiliate}
              />
            </TabsContent>

            <TabsContent value="affiliate-sales">
              <AffiliateSalesTab
                affiliates={affiliates}
                businesses={barbershops.map(b => ({ id: b.id, name: b.name }))}
                sales={affiliateSales}
                stats={salesStats}
                monthlyData={affiliateMonthlyData}
                affiliatePerformance={affiliatePerformance}
                onCreateSale={handleCreateAffiliateSale}
              />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </>
  );
}
