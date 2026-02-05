import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { motion } from "framer-motion";
import { 
  Building2, 
  Mail, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  Ban, 
  Power, 
  PowerOff,
  Search,
  ExternalLink,
  Zap
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Barbershop {
  id: string;
  name: string;
  slug: string;
  owner_email: string | null;
  approval_status: string;
  created_at: string;
  active: boolean;
  business_type: string;
  lastSubscription?: {
    status: string;
    due_date: string;
  } | null;
}

type FilterStatus = "all" | "pending" | "approved" | "blocked" | "rejected" | "inactive";
type ActionType = "approve" | "reject" | "block" | "unblock" | "deactivate" | "activate";

interface BusinessesTabProps {
  barbershops: Barbershop[];
  onStatusChange: (id: string, status: string, active?: boolean) => Promise<void>;
  onViewSubscriptions: (barbershop: Barbershop) => void;
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

export function BusinessesTab({ barbershops, onStatusChange, onViewSubscriptions }: BusinessesTabProps) {
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [search, setSearch] = useState("");
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    barbershop: Barbershop | null;
    action: ActionType | null;
  }>({ open: false, barbershop: null, action: null });
  const [loading, setLoading] = useState(false);

  const getStatusBadge = (status: string, active: boolean) => {
    if (!active && status === "approved") {
      return <Badge variant="secondary" className="bg-muted text-muted-foreground">Inativa</Badge>;
    }
    switch (status) {
      case "approved":
        return <Badge variant="default" className="bg-green-500/20 text-green-400 border-green-500/30">Ativa</Badge>;
      case "pending":
        return <Badge variant="default" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Pendente</Badge>;
      case "blocked":
        return <Badge variant="default" className="bg-red-500/20 text-red-400 border-red-500/30">Bloqueada</Badge>;
      case "rejected":
        return <Badge variant="default" className="bg-rose-500/20 text-rose-400 border-rose-500/30">Rejeitada</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getSubscriptionBadge = (lastSubscription: Barbershop["lastSubscription"]) => {
    if (!lastSubscription) {
      return null;
    }
    switch (lastSubscription.status) {
      case "paid":
        return <Badge variant="default" className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">Ativada</Badge>;
      case "pending":
        return <Badge variant="default" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">Ativação Pendente</Badge>;
      case "overdue":
        return <Badge variant="default" className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">Bloqueada</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">{lastSubscription.status}</Badge>;
    }
  };

  const getActionText = (action: ActionType) => {
    const texts: Record<ActionType, string> = {
      approve: "aprovar",
      reject: "rejeitar",
      block: "bloquear",
      unblock: "desbloquear",
      deactivate: "desativar",
      activate: "ativar",
    };
    return texts[action];
  };

  const handleAction = async () => {
    if (!confirmDialog.barbershop || !confirmDialog.action) return;
    
    setLoading(true);
    try {
      const { id, approval_status } = confirmDialog.barbershop;
      const action = confirmDialog.action;

      switch (action) {
        case "approve":
          await onStatusChange(id, "approved", true);
          break;
        case "reject":
          await onStatusChange(id, "rejected", false);
          break;
        case "block":
          await onStatusChange(id, "blocked", false);
          break;
        case "unblock":
          await onStatusChange(id, "approved", true);
          break;
        case "deactivate":
          await onStatusChange(id, approval_status, false);
          break;
        case "activate":
          await onStatusChange(id, approval_status, true);
          break;
      }
    } finally {
      setLoading(false);
      setConfirmDialog({ open: false, barbershop: null, action: null });
    }
  };

  const getAvailableActions = (barbershop: Barbershop): ActionType[] => {
    const { approval_status, active } = barbershop;
    
    if (approval_status === "pending") {
      return ["approve", "reject"];
    }
    if (approval_status === "approved") {
      if (active) {
        return ["block", "deactivate"];
      } else {
        return ["activate", "block"];
      }
    }
    if (approval_status === "blocked") {
      return ["unblock"];
    }
    if (approval_status === "rejected") {
      return ["approve"];
    }
    return [];
  };

  const filteredBarbershops = barbershops.filter((b) => {
    const matchesSearch = 
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      (b.owner_email?.toLowerCase().includes(search.toLowerCase()) ?? false);
    
    if (!matchesSearch) return false;
    
    switch (filter) {
      case "pending":
        return b.approval_status === "pending";
      case "approved":
        return b.approval_status === "approved" && b.active;
      case "blocked":
        return b.approval_status === "blocked";
      case "rejected":
        return b.approval_status === "rejected";
      case "inactive":
        return b.approval_status === "approved" && !b.active;
      default:
        return true;
    }
  });

  const filterButtons: { label: string; value: FilterStatus; count: number }[] = [
    { label: "Todas", value: "all", count: barbershops.length },
    { label: "Pendentes", value: "pending", count: barbershops.filter(b => b.approval_status === "pending").length },
    { label: "Ativas", value: "approved", count: barbershops.filter(b => b.approval_status === "approved" && b.active).length },
    { label: "Bloqueadas", value: "blocked", count: barbershops.filter(b => b.approval_status === "blocked").length },
    { label: "Rejeitadas", value: "rejected", count: barbershops.filter(b => b.approval_status === "rejected").length },
    { label: "Inativas", value: "inactive", count: barbershops.filter(b => b.approval_status === "approved" && !b.active).length },
  ];

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou email..."
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
      </div>

      {/* List */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid gap-4"
      >
        {filteredBarbershops.map((barbershop) => (
          <motion.div key={barbershop.id} variants={item}>
            <Card className="border-border/50 hover:border-primary/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Info */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold flex items-center gap-2">
                          {barbershop.name}
                          {getStatusBadge(barbershop.approval_status, barbershop.active)}
                        </h3>
                        <p className="text-xs text-muted-foreground capitalize">
                          {barbershop.business_type}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {barbershop.owner_email || "Sem email"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(barbershop.created_at), "dd MMM yyyy", { locale: ptBR })}
                      </span>
                      {barbershop.lastSubscription && (
                        <span className="flex items-center gap-1">
                          <Zap className="h-3 w-3" />
                          {getSubscriptionBadge(barbershop.lastSubscription)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    {getAvailableActions(barbershop).map((action) => {
                      const actionConfig: Record<ActionType, { icon: typeof CheckCircle; variant: "default" | "destructive" | "outline"; label: string }> = {
                        approve: { icon: CheckCircle, variant: "default", label: "Aprovar" },
                        reject: { icon: XCircle, variant: "destructive", label: "Rejeitar" },
                        block: { icon: Ban, variant: "destructive", label: "Bloquear" },
                        unblock: { icon: CheckCircle, variant: "default", label: "Desbloquear" },
                        deactivate: { icon: PowerOff, variant: "outline", label: "Desativar" },
                        activate: { icon: Power, variant: "default", label: "Ativar" },
                      };
                      const config = actionConfig[action];
                      return (
                        <Button
                          key={action}
                          variant={config.variant}
                          size="sm"
                          onClick={() => setConfirmDialog({ open: true, barbershop, action })}
                        >
                          <config.icon className="h-4 w-4 mr-1" />
                          {config.label}
                        </Button>
                      );
                    })}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewSubscriptions(barbershop)}
                    >
                      <Zap className="h-4 w-4 mr-1" />
                      Ativações
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(`/b/${barbershop.slug}`, "_blank")}
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Ver
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}

        {filteredBarbershops.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma empresa encontrada</p>
          </div>
        )}
      </motion.div>

      {/* Confirm Dialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog({ open: false, barbershop: null, action: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar ação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja {confirmDialog.action && getActionText(confirmDialog.action)} a empresa{" "}
              <strong>{confirmDialog.barbershop?.name}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleAction} disabled={loading}>
              {loading ? "Processando..." : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
