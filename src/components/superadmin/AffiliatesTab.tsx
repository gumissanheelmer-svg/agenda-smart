import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { Plus, Users, Phone, DollarSign, Edit2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

interface AffiliatesTabProps {
  affiliates: Affiliate[];
  onCreateAffiliate: (data: { name: string; phone?: string; commission_fixed: number }) => Promise<void>;
  onUpdateAffiliate: (id: string, data: { name?: string; phone?: string; commission_fixed?: number; active?: boolean }) => Promise<void>;
  onDeleteAffiliate: (id: string) => Promise<void>;
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

export function AffiliatesTab({ affiliates, onCreateAffiliate, onUpdateAffiliate, onDeleteAffiliate }: AffiliatesTabProps) {
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    commission_fixed: 0,
  });

  const resetForm = () => {
    setFormData({ name: '', phone: '', commission_fixed: 0 });
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast({ title: 'Erro', description: 'Nome é obrigatório', variant: 'destructive' });
      return;
    }
    
    setIsLoading(true);
    try {
      await onCreateAffiliate({
        name: formData.name.trim(),
        phone: formData.phone.trim() || undefined,
        commission_fixed: formData.commission_fixed,
      });
      toast({ title: 'Sucesso', description: 'Afiliado criado com sucesso' });
      setIsCreating(false);
      resetForm();
    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível criar o afiliado', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async (id: string) => {
    setIsLoading(true);
    try {
      await onUpdateAffiliate(id, {
        name: formData.name.trim(),
        phone: formData.phone.trim() || undefined,
        commission_fixed: formData.commission_fixed,
      });
      toast({ title: 'Sucesso', description: 'Afiliado atualizado com sucesso' });
      setIsEditing(null);
      resetForm();
    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível atualizar o afiliado', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleActive = async (affiliate: Affiliate) => {
    try {
      await onUpdateAffiliate(affiliate.id, { active: !affiliate.active });
      toast({ 
        title: 'Sucesso', 
        description: `Afiliado ${affiliate.active ? 'desativado' : 'ativado'} com sucesso` 
      });
    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível alterar status', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este afiliado? Esta ação não pode ser desfeita.')) return;
    
    try {
      await onDeleteAffiliate(id);
      toast({ title: 'Sucesso', description: 'Afiliado excluído com sucesso' });
    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível excluir o afiliado', variant: 'destructive' });
    }
  };

  const openEditDialog = (affiliate: Affiliate) => {
    setFormData({
      name: affiliate.name,
      phone: affiliate.phone || '',
      commission_fixed: affiliate.commission_fixed,
    });
    setIsEditing(affiliate.id);
  };

  const activeAffiliates = affiliates.filter(a => a.active).length;
  const totalCommissions = affiliates.reduce((sum, a) => sum + (a.totalCommission || 0), 0);

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div variants={item}>
          <Card className="border-border/50 bg-gradient-to-br from-primary/20 to-primary/5">
            <div className="absolute inset-0 bg-gradient-to-br from-transparent to-background/80" />
            <CardContent className="relative p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Total de Afiliados</p>
                  <p className="text-2xl font-bold">{affiliates.length}</p>
                </div>
                <Users className="h-8 w-8 text-primary opacity-80" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="border-border/50 bg-gradient-to-br from-green-500/20 to-green-500/5">
            <div className="absolute inset-0 bg-gradient-to-br from-transparent to-background/80" />
            <CardContent className="relative p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Afiliados Ativos</p>
                  <p className="text-2xl font-bold">{activeAffiliates}</p>
                </div>
                <Users className="h-8 w-8 text-green-500 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="border-border/50 bg-gradient-to-br from-emerald-500/20 to-emerald-500/5">
            <div className="absolute inset-0 bg-gradient-to-br from-transparent to-background/80" />
            <CardContent className="relative p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Total em Comissões</p>
                  <p className="text-2xl font-bold">{totalCommissions.toLocaleString('pt-BR')} MT</p>
                </div>
                <DollarSign className="h-8 w-8 text-emerald-500 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Affiliates Table */}
      <motion.div variants={item}>
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg font-medium">Afiliados</CardTitle>
              <CardDescription>Gerencie os afiliados de agendamentos</CardDescription>
            </div>
            
            <Dialog open={isCreating} onOpenChange={setIsCreating}>
              <DialogTrigger asChild>
                <Button onClick={() => { resetForm(); setIsCreating(true); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Afiliado
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Novo Afiliado</DialogTitle>
                  <DialogDescription>Adicione um novo afiliado para vendas de agendamentos</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Nome do afiliado"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+258 84 000 0000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="commission">Comissão Fixa (MT)</Label>
                    <Input
                      id="commission"
                      type="number"
                      min="0"
                      step="100"
                      value={formData.commission_fixed}
                      onChange={(e) => setFormData({ ...formData, commission_fixed: Number(e.target.value) })}
                      placeholder="0"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreating(false)}>Cancelar</Button>
                  <Button onClick={handleCreate} disabled={isLoading}>
                    {isLoading ? 'Criando...' : 'Criar Afiliado'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>

          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead className="text-right">Comissão Fixa</TableHead>
                  <TableHead className="text-right">Vendas</TableHead>
                  <TableHead className="text-right">Total Comissões</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {affiliates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      Nenhum afiliado cadastrado
                    </TableCell>
                  </TableRow>
                ) : (
                  affiliates.map((affiliate) => (
                    <TableRow key={affiliate.id}>
                      <TableCell className="font-medium">{affiliate.name}</TableCell>
                      <TableCell>
                        {affiliate.phone ? (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {affiliate.phone}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{affiliate.commission_fixed.toLocaleString('pt-BR')} MT</TableCell>
                      <TableCell className="text-right">{affiliate.salesCount || 0}</TableCell>
                      <TableCell className="text-right">{(affiliate.totalCommission || 0).toLocaleString('pt-BR')} MT</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Switch
                            checked={affiliate.active}
                            onCheckedChange={() => handleToggleActive(affiliate)}
                          />
                          <Badge variant={affiliate.active ? "default" : "secondary"}>
                            {affiliate.active ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(affiliate)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(affiliate.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>

      {/* Edit Dialog */}
      <Dialog open={isEditing !== null} onOpenChange={(open) => !open && setIsEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Afiliado</DialogTitle>
            <DialogDescription>Atualize os dados do afiliado</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nome do afiliado"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Telefone</Label>
              <Input
                id="edit-phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+258 84 000 0000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-commission">Comissão Fixa (MT)</Label>
              <Input
                id="edit-commission"
                type="number"
                min="0"
                step="100"
                value={formData.commission_fixed}
                onChange={(e) => setFormData({ ...formData, commission_fixed: Number(e.target.value) })}
                placeholder="0"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditing(null)}>Cancelar</Button>
            <Button onClick={() => isEditing && handleUpdate(isEditing)} disabled={isLoading}>
              {isLoading ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
