import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Wallet, TrendingDown } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { pt } from 'date-fns/locale';

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  expense_date: string;
  created_at: string;
}

const EXPENSE_CATEGORIES = [
  { value: 'aluguel', label: 'Aluguel' },
  { value: 'produtos', label: 'Produtos' },
  { value: 'salarios', label: 'Salários' },
  { value: 'equipamentos', label: 'Equipamentos' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'utilidades', label: 'Utilidades (Água, Luz, etc.)' },
  { value: 'manutencao', label: 'Manutenção' },
  { value: 'outros', label: 'Outros' },
];

export default function ExpensesList() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [barbershopId, setBarbershopId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  // Form state
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('outros');
  const [expenseDate, setExpenseDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  
  // Filter state
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState(format(new Date(), 'yyyy-MM'));

  // Summary
  const [monthTotal, setMonthTotal] = useState(0);

  useEffect(() => {
    if (user) {
      fetchBarbershopId();
    }
  }, [user]);

  useEffect(() => {
    if (barbershopId) {
      fetchExpenses();
    }
  }, [barbershopId, filterCategory, filterMonth]);

  const fetchBarbershopId = async () => {
    const { data } = await supabase
      .from('user_roles')
      .select('barbershop_id')
      .eq('user_id', user?.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (data?.barbershop_id) {
      setBarbershopId(data.barbershop_id);
    } else {
      setIsLoading(false);
    }
  };

  const fetchExpenses = async () => {
    if (!barbershopId) return;

    setIsLoading(true);
    
    const monthStart = format(startOfMonth(new Date(filterMonth)), 'yyyy-MM-dd');
    const monthEnd = format(endOfMonth(new Date(filterMonth)), 'yyyy-MM-dd');

    let query = supabase
      .from('expenses')
      .select('*')
      .eq('barbershop_id', barbershopId)
      .gte('expense_date', monthStart)
      .lte('expense_date', monthEnd)
      .order('expense_date', { ascending: false });

    if (filterCategory !== 'all') {
      query = query.eq('category', filterCategory);
    }

    const { data, error } = await query;

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar as despesas.",
      });
    } else {
      setExpenses(data || []);
      const total = (data || []).reduce((sum, exp) => sum + Number(exp.amount), 0);
      setMonthTotal(total);
    }

    setIsLoading(false);
  };

  const resetForm = () => {
    setDescription('');
    setAmount('');
    setCategory('outros');
    setExpenseDate(format(new Date(), 'yyyy-MM-dd'));
    setEditingExpense(null);
  };

  const openEditDialog = (expense: Expense) => {
    setEditingExpense(expense);
    setDescription(expense.description);
    setAmount(expense.amount.toString());
    setCategory(expense.category);
    setExpenseDate(expense.expense_date);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!barbershopId || !description.trim() || !amount) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Preencha todos os campos obrigatórios.",
      });
      return;
    }

    const expenseData = {
      barbershop_id: barbershopId,
      description: description.trim(),
      amount: parseFloat(amount),
      category,
      expense_date: expenseDate,
    };

    if (editingExpense) {
      // Update
      const { error } = await supabase
        .from('expenses')
        .update(expenseData)
        .eq('id', editingExpense.id);

      if (error) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Não foi possível atualizar a despesa.",
        });
      } else {
        toast({
          title: "Sucesso",
          description: "Despesa atualizada com sucesso.",
        });
        setDialogOpen(false);
        resetForm();
        fetchExpenses();
      }
    } else {
      // Create
      const { error } = await supabase
        .from('expenses')
        .insert(expenseData);

      if (error) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Não foi possível adicionar a despesa.",
        });
      } else {
        toast({
          title: "Sucesso",
          description: "Despesa adicionada com sucesso.",
        });
        setDialogOpen(false);
        resetForm();
        fetchExpenses();
      }
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível excluir a despesa.",
      });
    } else {
      toast({
        title: "Sucesso",
        description: "Despesa excluída com sucesso.",
      });
      setDeleteConfirmId(null);
      fetchExpenses();
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-MZ', { 
      style: 'currency', 
      currency: 'MZN',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const getCategoryLabel = (value: string) => {
    return EXPENSE_CATEGORIES.find(c => c.value === value)?.label || value;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-display font-bold text-foreground">Despesas</h1>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-border/50 bg-card/80">
              <CardContent className="p-6">
                <div className="h-12 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-display font-bold text-foreground">Despesas</h1>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Adicionar Despesa
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingExpense ? 'Editar Despesa' : 'Nova Despesa'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="description">Descrição *</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Aluguel do mês"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Valor (MZN) *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Categoria</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPENSE_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="expenseDate">Data</Label>
                <Input
                  id="expenseDate"
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                />
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancelar</Button>
                </DialogClose>
                <Button type="submit">
                  {editingExpense ? 'Salvar' : 'Adicionar'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Card */}
      <Card className="border-border/50 bg-card/80">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-red-500/20">
                <TrendingDown className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Despesas ({format(new Date(filterMonth), 'MMMM yyyy', { locale: pt })})</p>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(monthTotal)}</p>
              </div>
            </div>
            <Wallet className="w-12 h-12 text-muted-foreground/30" />
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="border-border/50 bg-card/80">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="filterMonth" className="text-sm text-muted-foreground">Mês</Label>
              <Input
                id="filterMonth"
                type="month"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="filterCategory" className="text-sm text-muted-foreground">Categoria</Label>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expenses Table */}
      <Card className="border-border/50 bg-card/80">
        <CardHeader>
          <CardTitle className="font-display">Lista de Despesas</CardTitle>
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma despesa encontrada para este período.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(expense.expense_date), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell className="font-medium">{expense.description}</TableCell>
                      <TableCell>
                        <span className="px-2 py-1 rounded-full text-xs bg-secondary text-secondary-foreground">
                          {getCategoryLabel(expense.category)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium text-red-500">
                        -{formatCurrency(expense.amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(expense)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Dialog open={deleteConfirmId === expense.id} onOpenChange={(open) => setDeleteConfirmId(open ? expense.id : null)}>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Confirmar Exclusão</DialogTitle>
                              </DialogHeader>
                              <p className="text-muted-foreground">
                                Tem certeza que deseja excluir a despesa "{expense.description}"?
                              </p>
                              <DialogFooter>
                                <DialogClose asChild>
                                  <Button variant="outline">Cancelar</Button>
                                </DialogClose>
                                <Button variant="destructive" onClick={() => handleDelete(expense.id)}>
                                  Excluir
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
