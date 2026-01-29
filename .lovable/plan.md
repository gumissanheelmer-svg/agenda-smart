
# Plano: Unificar Mensagens de WhatsApp

## Resumo
Modificar o sistema para usar um único formato de mensagem simples para todas as confirmações de agendamento, independentemente do tipo de negócio ou se há pagamento.

## Formato Unificado
```
Olá! 👋

Fiz um agendamento na {{NOME_DO_NEGOCIO}} 💈

👤 Cliente: {{NOME_DO_CLIENTE}}
✂️ Serviço: {{SERVICO}}
💈 Profissional: {{PROFISSIONAL}}
📅 Data: {{DATA}}
⏰ Hora: {{HORA}}
💰 Valor: {{VALOR}} MZN
💳 Código da transação: {{CODIGO}} ← (condicional)

Aguardo confirmação 🙏
```

## Mudanças Necessárias

### 1. Atualizar `src/lib/whatsappTemplates.ts`
**Simplificar `getClientToBusinessMessage`:**
- Remover as variações por tipo de negócio (salao, barbearia, salao_barbearia)
- Usar formato único igual ao `generatePaymentConfirmationMessage`
- Adicionar parâmetro opcional `transactionCode` para suportar linha condicional

### 2. Atualizar `src/components/BookingForm.tsx`
**Ajustar chamada na função `getWhatsAppLink`:**
- Passar o código de transação (se houver) para a função de mensagem
- Garantir que o formato de data seja consistente (dd/MM/yyyy)

### 3. Atualizar `src/components/booking/PaymentStep.tsx`
**Unificar com a mesma função:**
- Usar `getClientToBusinessMessage` em vez de `generatePaymentConfirmationMessage`
- Remover dependência duplicada

### 4. Limpar código não utilizado
- Remover `generatePaymentConfirmationMessage` de `paymentCodeExtractor.ts` (será substituída)
- Manter funções de extração de código (ainda necessárias)

---

## Detalhes Técnicos

### Nova assinatura da função `getClientToBusinessMessage`:
```typescript
interface AppointmentDetails {
  clientName: string;
  professionalName: string;
  serviceName: string;
  appointmentDate: string;
  appointmentTime: string;
  price: number;
  businessName: string;
  transactionCode?: string; // Novo campo opcional
}

export function getClientToBusinessMessage(details: AppointmentDetails): string {
  const formattedDate = format(new Date(details.appointmentDate), 'dd/MM/yyyy');
  const transactionLine = details.transactionCode?.trim() 
    ? `\n💳 Código da transação: ${details.transactionCode.trim()}` 
    : '';

  return `Olá! 👋

Fiz um agendamento na ${details.businessName} 💈

👤 Cliente: ${details.clientName}
✂️ Serviço: ${details.serviceName}
💈 Profissional: ${details.professionalName}
📅 Data: ${formattedDate}
⏰ Hora: ${details.appointmentTime}
💰 Valor: ${details.price.toFixed(0)} MZN${transactionLine}

Aguardo confirmação 🙏`;
}
```

### Arquivos a modificar:
1. `src/lib/whatsappTemplates.ts` - Simplificar função principal
2. `src/components/BookingForm.tsx` - Atualizar chamada
3. `src/components/booking/PaymentStep.tsx` - Usar função unificada
4. `src/lib/paymentCodeExtractor.ts` - Remover função duplicada
5. `src/pages/admin/AppointmentsList.tsx` - Atualizar chamada (usa `getBusinessToClientMessage`)

### Nota sobre `getBusinessToClientMessage`:
Esta função é usada pelo admin para enviar confirmações ao cliente. Se desejar, posso também unificá-la para usar um formato semelhante ou mantê-la separada (pois é uma mensagem diferente - do estabelecimento para o cliente).
