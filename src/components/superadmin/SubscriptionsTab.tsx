import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import { 
  CreditCard, 
  Calendar, 
  Building2,
  Search,
  Plus,
  CheckCircle,
  DollarSign,
  Zap
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

interface Barbershop {
  id: string;
  name: string;
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

type FilterStatus = "all" | "paid" | "pending" | "overdue";

interface SubscriptionsTabProps {
  subscriptions: Subscription[];
  barbershops: Barbershop[];
  onCreateSubscription: (data: {
    barbershop_id: string;
    amount: number;
    due_date: string;
    plan_name: string;
    notes?: string;
  }) => Promise<void>;
  onMarkAsPaid: (id: string, payment_method: string) => Promise<void>;
  selectedBarbershop?: Barbershop | null;
  onClearSelection?: () => void;
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

export function SubscriptionsTab({ 
  subscriptions, 
  barbershops, 
  onCreateSubscription, 
  onMarkAsPaid,
  selectedBarbershop,
  onClearSelection
}: SubscriptionsTabProps) {
  const { toast } = useToast();
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [search, setSearch] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [payDialogOpen, setPayDialogOpen] = useState<{ open: boolean; subscription: Subscription | null }>({ 
    open: false, 
    subscription: null 
  });
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    barbershop_id: "",
    amount: "",
    due_date: "",
    plan_name: "mensal",
    notes: "",
  });
  const [paymentMethod, setPaymentMethod] = useState("");

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Ativada</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Ativação Pendente</Badge>;
      case "overdue":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Bloqueada</Badge>;
      case "cancelled":
        return <Badge className="bg-muted text-muted-foreground">Cancelado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleCreateSubscription = async () => {
    if (!formData.barbershop_id || !formData.amount || !formData.due_date) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await onCreateSubscription({
        barbershop_id: formData.barbershop_id,
        amount: parseFloat(formData.amount),
        due_date: formData.due_date,
        plan_name: formData.plan_name,
        notes: formData.notes || undefined,
      });
      setCreateDialogOpen(false);
      setFormData({
        barbershop_id: "",
        amount: "",
        due_date: "",
        plan_name: "mensal",
        notes: "",
      });
      toast({
        title: "Sucesso",
        description: "Ativação registrada com sucesso",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao registrar ativação",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsPaid = async () => {
    if (!payDialogOpen.subscription || !paymentMethod) {
      toast({
        title: "Erro",
        description: "Selecione o método de pagamento",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await onMarkAsPaid(payDialogOpen.subscription.id, paymentMethod);
      setPayDialogOpen({ open: false, subscription: null });
      setPaymentMethod("");
      toast({
        title: "Sucesso",
        description: "Ativação confirmada com sucesso",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao confirmar ativação",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredSubscriptions = subscriptions.filter((s) => {
    const matchesSearch = 
      s.barbershop_name?.toLowerCase().includes(search.toLowerCase()) ?? false;
    
    const matchesBarbershop = selectedBarbershop 
      ? s.barbershop_id === selectedBarbershop.id 
      : true;
    
    if (!matchesSearch || !matchesBarbershop) return false;
    
    switch (filter) {
      case "paid":
        return s.status === "paid";
      case "pending":
        return s.status === "pending";
      case "overdue":
        return s.status === "overdue";
      default:
        return true;
    }
  });

  const filterButtons: { label: string; value: FilterStatus; count: number }[] = [
    { label: "Todas", value: "all", count: subscriptions.length },
    { label: "Ativadas", value: "paid", count: subscriptions.filter(s => s.status === "paid").length },
    { label: "Pendentes", value: "pending", count: subscriptions.filter(s => s.status === "pending").length },
    { label: "Bloqueadas", value: "overdue", count: subscriptions.filter(s => s.status === "overdue").length },
  ];

  return (
    <div className="space-y-4">
      {/* Header with selected barbershop info */}
      {selectedBarbershop && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-primary" />
              <span>Visualizando ativações de: <strong>{selectedBarbershop.name}</strong></span>
            </div>
            <Button variant="ghost" size="sm" onClick={onClearSelection}>
              Ver todas
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Search, Filters, and Add Button */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por empresa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {filterButtons.map((btn) => (
            <Button
              key={btn.value}
              variant={filter === btn.value ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(btn.value)}
              className="text-xs"
            >
              {btn.label} ({btn.count})
            </Button>
          ))}
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Ativação
        </Button>
      </div>

      {/* List */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid gap-4"
      >
        {filteredSubscriptions.map((subscription) => (
          <motion.div key={subscription.id} variants={item}>
            <Card className="border-border/50 hover:border-primary/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Info */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Zap className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold flex items-center gap-2">
                          {subscription.barbershop_name}
                          {getStatusBadge(subscription.status)}
                        </h3>
                        <p className="text-xs text-muted-foreground capitalize">
                          Plano {subscription.plan_name}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1 text-foreground font-medium">
                        <DollarSign className="h-3 w-3" />
                        {subscription.amount.toLocaleString("pt-BR")} MT
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Vence: {format(new Date(subscription.due_date), "dd MMM yyyy", { locale: ptBR })}
                      </span>
                      {subscription.paid_at && (
                        <span className="flex items-center gap-1 text-green-400">
                          <CheckCircle className="h-3 w-3" />
                          Pago em: {format(new Date(subscription.paid_at), "dd MMM yyyy", { locale: ptBR })}
                        </span>
                      )}
                      {subscription.payment_method && (
                        <span className="text-xs bg-muted px-2 py-0.5 rounded">
                          {subscription.payment_method.toUpperCase()}
                        </span>
                      )}
                    </div>
                    
                    {subscription.notes && (
                      <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                        {subscription.notes}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    {subscription.status !== "paid" && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => setPayDialogOpen({ open: true, subscription })}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Confirmar Ativação
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}

        {filteredSubscriptions.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma ativação encontrada</p>
          </div>
        )}
      </motion.div>

      {/* Create Subscription Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Ativação</DialogTitle>
            <DialogDescription>
              Registre uma nova ativação de acesso vitalício
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Empresa *</Label>
              <Select
                value={formData.barbershop_id}
                onValueChange={(value) => setFormData({ ...formData, barbershop_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma empresa" />
                </SelectTrigger>
                <SelectContent>
                  {barbershops.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor (MT) *</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Data de Vencimento *</Label>
                <Input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tipo de Ativação</Label>
              <Select
                value={formData.plan_name}
                onValueChange={(value) => setFormData({ ...formData, plan_name: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vitalicio">Acesso Vitalício</SelectItem>
                  <SelectItem value="promocional">Promocional</SelectItem>
                  <SelectItem value="parceiro">Parceiro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                placeholder="Observações opcionais..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={handleCreateSubscription} disabled={loading}>
              {loading ? "Registrando..." : "Registrar Ativação"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mark as Paid Dialog */}
      <Dialog 
        open={payDialogOpen.open} 
        onOpenChange={(open) => !open && setPayDialogOpen({ open: false, subscription: null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Ativação</DialogTitle>
            <DialogDescription>
              Confirmar ativação de acesso vitalício para {payDialogOpen.subscription?.barbershop_name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Valor da Ativação</p>
              <p className="text-2xl font-bold">
                {payDialogOpen.subscription?.amount.toLocaleString("pt-BR")} MT
              </p>
            </div>

            <div className="space-y-2">
              <Label>Método de Pagamento *</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o método" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="mpesa">M-Pesa</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="transferencia">Transferência Bancária</SelectItem>
                  <SelectItem value="cartao">Cartão</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => setPayDialogOpen({ open: false, subscription: null })} 
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button onClick={handleMarkAsPaid} disabled={loading}>
              {loading ? "Processando..." : "Confirmar Ativação"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
