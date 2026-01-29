import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  CreditCard, 
  Smartphone, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  MessageCircle,
  ChevronRight
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  extractTransactionCodes,
  validateManualCode,
  getPaymentInstructions,
  PaymentMethod,
  ExtractedCode
} from '@/lib/paymentCodeExtractor';
import { getClientToBusinessMessage } from '@/lib/whatsappTemplates';
import { openWhatsApp } from '@/lib/whatsapp';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

interface PaymentStepProps {
  paymentMethods: PaymentMethod[];
  mpesaNumber: string | null;
  emolaNumber: string | null;
  whatsappNumber: string;
  businessName: string;
  clientName: string;
  appointmentDate: Date;
  appointmentTime: string;
  serviceName: string;
  servicePrice: number;
  professionalName: string;
  onBack: () => void;
  onComplete: () => void;
}

export function PaymentStep({
  paymentMethods,
  mpesaNumber,
  emolaNumber,
  whatsappNumber,
  businessName,
  clientName,
  appointmentDate,
  appointmentTime,
  serviceName,
  servicePrice,
  professionalName,
  onBack,
  onComplete
}: PaymentStepProps) {
  const { toast } = useToast();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(
    paymentMethods.length === 1 ? paymentMethods[0] : null
  );
  const [confirmationMessage, setConfirmationMessage] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [extractedCodes, setExtractedCodes] = useState<ExtractedCode[]>([]);
  const [selectedCode, setSelectedCode] = useState<ExtractedCode | null>(null);
  const [isManualEntry, setIsManualEntry] = useState(false);
  const [isPaymentConfirmed, setIsPaymentConfirmed] = useState(false);

  // Extract codes when message changes
  useEffect(() => {
    if (confirmationMessage.trim()) {
      const codes = extractTransactionCodes(confirmationMessage);
      setExtractedCodes(codes);
      
      // Auto-select best code if only one found
      if (codes.length === 1) {
        setSelectedCode(codes[0]);
        setManualCode(codes[0].code);
      } else if (codes.length > 1) {
        // Multiple codes found, let user choose
        setSelectedCode(null);
      } else {
        // No code found
        setSelectedCode(null);
      }
    } else {
      setExtractedCodes([]);
      setSelectedCode(null);
    }
  }, [confirmationMessage]);

  // Update manual code when selected code changes
  useEffect(() => {
    if (selectedCode && !isManualEntry) {
      setManualCode(selectedCode.code);
    }
  }, [selectedCode, isManualEntry]);

  const getPhoneForMethod = (method: PaymentMethod): string => {
    if (method === 'mpesa' && mpesaNumber) return mpesaNumber;
    if (method === 'emola' && emolaNumber) return emolaNumber;
    return '';
  };

  const handleCopyNumber = (number: string) => {
    navigator.clipboard.writeText(number.replace(/\D/g, ''));
    toast({
      title: 'Número copiado!',
      description: 'Cole no campo de transferência.',
    });
  };

  const handleManualCodeChange = (value: string) => {
    setManualCode(value.toUpperCase());
    setIsManualEntry(true);
    
    // Validate the manual code
    const validation = validateManualCode(value);
    if (validation.isValid && value.trim()) {
      setSelectedCode({
        code: value.toUpperCase().trim(),
        method: validation.method || selectedMethod || 'mpesa',
        confidence: 'high'
      });
    } else {
      setSelectedCode(null);
    }
  };

  const handleSelectExtractedCode = (code: ExtractedCode) => {
    setSelectedCode(code);
    setManualCode(code.code);
    setIsManualEntry(false);
  };

  const handleConfirmPayment = () => {
    if (hasValidCode) {
      setIsPaymentConfirmed(true);
      toast({
        title: 'Pagamento confirmado!',
        description: 'Agora envie a confirmação no WhatsApp.',
      });
    }
  };

  // Check if we have a valid code
  const hasValidCode = selectedCode !== null && validateManualCode(manualCode).isValid;

  const formattedDate = format(appointmentDate, "dd 'de' MMMM", { locale: pt });

  const handleSendWhatsApp = () => {
    if (!hasValidCode) return;

    if (!whatsappNumber?.trim()) {
      toast({
        title: 'WhatsApp não configurado',
        description: 'O negócio não tem um número de WhatsApp definido nas configurações.',
        variant: 'destructive',
      });
      return;
    }

    const paymentMethodLabel = selectedMethod === 'mpesa' ? 'M-Pesa' : 'eMola';
    const message = getClientToBusinessMessage({
      clientName,
      professionalName,
      serviceName,
      appointmentDate: format(appointmentDate, 'yyyy-MM-dd'),
      appointmentTime,
      price: servicePrice,
      businessName,
      paymentMethod: paymentMethodLabel,
      transactionCode: manualCode.trim(),
    });

    const opened = openWhatsApp(whatsappNumber, message);
    if (!opened) {
      toast({
        title: 'Número inválido',
        description: 'Número do WhatsApp do negócio inválido. Peça ao dono para configurar corretamente.',
        variant: 'destructive',
      });
      return;
    }

    onComplete();
  };

  return (
    <Card className="border-border/50 bg-card/90 backdrop-blur-md shadow-xl animate-fade-in">
      <CardHeader>
        <CardTitle className="text-xl font-display flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-primary" />
          Efetuar Pagamento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Resumo do agendamento */}
        <div className="bg-secondary/50 rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Serviço:</span>
            <span className="text-foreground font-medium">{serviceName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Valor:</span>
            <span className="text-primary font-bold">{servicePrice.toFixed(0)} MZN</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Data:</span>
            <span className="text-foreground">{formattedDate}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Hora:</span>
            <span className="text-foreground">{appointmentTime}</span>
          </div>
        </div>

        {/* Estado: Pagamento confirmado - mostrar apenas botão WhatsApp */}
        {isPaymentConfirmed ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
              <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0" />
              <div>
                <p className="font-medium text-green-600">Pagamento confirmado!</p>
                <p className="text-sm text-muted-foreground">
                  Código: {manualCode}
                </p>
              </div>
            </div>

            <Button
              variant="gold"
              size="lg"
              className="w-full"
              onClick={handleSendWhatsApp}
            >
              <MessageCircle className="w-5 h-5 mr-2" />
              Enviar confirmação no WhatsApp
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        ) : (
          <>
            {/* Seleção de método de pagamento */}
            {paymentMethods.length > 1 && !selectedMethod && (
              <div className="space-y-3">
                <Label>Escolha o método de pagamento</Label>
                <div className="grid grid-cols-2 gap-3">
                  {paymentMethods.includes('mpesa') && mpesaNumber && (
                    <Button
                      variant="outline"
                      className="h-auto py-4 flex flex-col items-center gap-2"
                      onClick={() => setSelectedMethod('mpesa')}
                    >
                      <Smartphone className="w-6 h-6 text-red-500" />
                      <span className="font-medium">M-Pesa</span>
                    </Button>
                  )}
                  {paymentMethods.includes('emola') && emolaNumber && (
                    <Button
                      variant="outline"
                      className="h-auto py-4 flex flex-col items-center gap-2"
                      onClick={() => setSelectedMethod('emola')}
                    >
                      <Smartphone className="w-6 h-6 text-orange-500" />
                      <span className="font-medium">eMola</span>
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Instruções de pagamento */}
            {selectedMethod && (
              <>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Smartphone className={`w-4 h-4 ${selectedMethod === 'mpesa' ? 'text-red-500' : 'text-orange-500'}`} />
                      Pagar via {selectedMethod === 'mpesa' ? 'M-Pesa' : 'eMola'}
                    </Label>
                    {paymentMethods.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedMethod(null)}
                        className="text-xs"
                      >
                        Trocar
                      </Button>
                    )}
                  </div>
                  
                  {/* Número para transferência */}
                  <div className="bg-secondary/70 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground mb-2">Transfira para:</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xl font-mono font-bold text-foreground">
                        {getPhoneForMethod(selectedMethod)}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyNumber(getPhoneForMethod(selectedMethod))}
                      >
                        <Copy className="w-4 h-4 mr-1" />
                        Copiar
                      </Button>
                    </div>
                  </div>

                  {/* Instruções detalhadas */}
                  <div className="text-sm text-muted-foreground whitespace-pre-line bg-muted/30 rounded-lg p-3">
                    {getPaymentInstructions(selectedMethod, getPhoneForMethod(selectedMethod))}
                  </div>
                </div>

                {/* Campo para colar mensagem de confirmação */}
                <div className="space-y-3">
                  <Label htmlFor="confirmation">
                    Cole aqui a mensagem de confirmação (M-Pesa ou eMola)
                  </Label>
                  <Textarea
                    id="confirmation"
                    placeholder="Cole a mensagem SMS/USSD que recebeu após a transferência..."
                    value={confirmationMessage}
                    onChange={(e) => setConfirmationMessage(e.target.value)}
                    className="min-h-[100px] bg-input border-border"
                  />

                  {/* Códigos extraídos */}
                  {extractedCodes.length > 0 && (
                    <div className="space-y-2">
                      {extractedCodes.length === 1 ? (
                        <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                          <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-green-600">Código detectado!</p>
                            <p className="text-xs text-muted-foreground">
                              {extractedCodes[0].method === 'emola' ? 'eMola' : 'M-Pesa'}: {extractedCodes[0].code}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">
                            <AlertCircle className="w-4 h-4 inline mr-1" />
                            Múltiplos códigos detectados. Escolha o correto:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {extractedCodes.map((code, idx) => (
                              <Badge
                                key={idx}
                                variant={selectedCode?.code === code.code ? 'default' : 'outline'}
                                className="cursor-pointer py-2 px-3"
                                onClick={() => handleSelectExtractedCode(code)}
                              >
                                {code.method === 'emola' ? 'eMola' : 'M-Pesa'}: {code.code}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Mensagem quando nenhum código encontrado */}
                  {confirmationMessage.trim() && extractedCodes.length === 0 && (
                    <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                      <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
                      <p className="text-sm text-destructive">
                        Não foi possível identificar o código de pagamento. Verifique e tente novamente.
                      </p>
                    </div>
                  )}
                </div>

                {/* Campo para código manual */}
                <div className="space-y-2">
                  <Label htmlFor="manualCode">
                    Código da transação
                    {extractedCodes.length > 0 && (
                      <span className="text-xs text-muted-foreground ml-2">(edite se necessário)</span>
                    )}
                  </Label>
                  <Input
                    id="manualCode"
                    placeholder="Ex: DAT2IVYA7R0 ou PP1A2.B3C"
                    value={manualCode}
                    onChange={(e) => handleManualCodeChange(e.target.value)}
                    className="bg-input border-border font-mono uppercase"
                  />
                  {manualCode && (
                    <p className="text-xs text-muted-foreground">
                      {validateManualCode(manualCode).isValid 
                        ? `✓ Código ${validateManualCode(manualCode).method === 'mpesa' ? 'M-Pesa' : 'eMola'} válido` 
                        : 'Código inválido. M-Pesa: 10–12 caracteres (letras/números). eMola: começa com PP ou CI.'}
                    </p>
                  )}
                </div>

                {/* Botão de confirmar pagamento */}
                <div className="space-y-3 pt-2">
                  <Button
                    variant="gold"
                    size="lg"
                    className="w-full"
                    disabled={!hasValidCode}
                    onClick={handleConfirmPayment}
                  >
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    Confirmar pagamento
                  </Button>
                  {!hasValidCode && (
                    <p className="text-xs text-center text-muted-foreground">
                      Cole a mensagem de confirmação para validar o código de pagamento.
                    </p>
                  )}
                </div>
              </>
            )}
          </>
        )}

        {/* Botão voltar - não mostrar se pagamento confirmado */}
        {!isPaymentConfirmed && (
          <Button variant="outline" className="w-full" onClick={onBack}>
            Voltar
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

