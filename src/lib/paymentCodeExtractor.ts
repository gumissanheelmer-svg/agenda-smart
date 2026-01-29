/**
 * Utility functions for extracting M-Pesa and eMola transaction codes
 * from SMS/USSD confirmation messages
 */

export type PaymentMethod = 'mpesa' | 'emola';

export interface ExtractedCode {
  code: string;
  method: PaymentMethod;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * M-Pesa transaction code pattern (Mozambique)
 * - 10 to 12 characters
 * - Uppercase letters and numbers
 * - Heuristic: must contain at least 1 letter and 1 digit
 */
const MPESA_PATTERN = /\b[A-Z0-9]{10,12}\b/g;

/**
 * eMola transaction code pattern
 * - Starts with "PP" or "CI"
 * - Can contain uppercase letters, numbers, and dots
 */
const EMOLA_PATTERN = /\b(?:PP|CI)[A-Z0-9.]{6,}\b/g;

/**
 * Extract transaction codes from a message
 * Prioritizes exact pattern matches
 */
export function extractTransactionCodes(message: string): ExtractedCode[] {
  const codes: ExtractedCode[] = [];
  const upperMessage = message.toUpperCase();

  // First, try to find eMola codes (PP prefix)
  const emolaMatches = upperMessage.match(EMOLA_PATTERN);
  if (emolaMatches) {
    emolaMatches.forEach(code => {
      codes.push({
        code: code,
        method: 'emola',
        confidence: 'high'
      });
    });
  }

  // Then, try to find M-Pesa codes (DA prefix, exactly 11 chars)
  const mpesaMatches = upperMessage.match(MPESA_PATTERN);
  if (mpesaMatches) {
    mpesaMatches.forEach(code => {
      // Heuristic: avoid generic matches (must include at least 1 letter and 1 digit)
      if (!/[A-Z]/.test(code) || !/\d/.test(code)) return;

      // Avoid duplicates
      const isDuplicate = codes.some(c => c.code === code);
      if (!isDuplicate) {
        codes.push({
          code: code,
          method: 'mpesa',
          confidence: 'high'
        });
      }
    });
  }

  return codes;
}

/**
 * Get the best (highest confidence) code from extracted codes
 */
export function getBestCode(codes: ExtractedCode[]): ExtractedCode | null {
  if (codes.length === 0) return null;
  
  // Prioritize by confidence, then by method (eMola first for consistency)
  const sorted = [...codes].sort((a, b) => {
    const confidenceOrder = { high: 0, medium: 1, low: 2 };
    return confidenceOrder[a.confidence] - confidenceOrder[b.confidence];
  });
  
  return sorted[0];
}

/**
 * Validate a manually entered transaction code
 */
export function validateManualCode(code: string): { isValid: boolean; method: PaymentMethod | null } {
  const upperCode = code.toUpperCase().trim();
  
  // Check M-Pesa pattern: 10-12 chars, letters+numbers (must contain at least 1 letter and 1 digit)
  if (/^[A-Z0-9]{10,12}$/.test(upperCode) && /[A-Z]/.test(upperCode) && /\d/.test(upperCode)) {
    return { isValid: true, method: 'mpesa' };
  }
  
  // Check eMola pattern: starts with PP or CI, contains letters, numbers, and dots
  if (/^(PP|CI)[A-Z0-9.]{6,}$/.test(upperCode)) {
    return { isValid: true, method: 'emola' };
  }
  
  return { isValid: false, method: null };
}


/**
 * Generate payment instructions for a given method
 */
export function getPaymentInstructions(method: PaymentMethod, phoneNumber: string): string {
  const formattedPhone = phoneNumber.replace(/\D/g, '');
  
  if (method === 'mpesa') {
    return `Para efetuar o pagamento:\n\n1. Marque *150#\n2. Escolha "Transferir dinheiro"\n3. Selecione "M-Pesa"\n4. Digite o número: ${formattedPhone}\n5. Digite o valor\n6. Confirme com o seu PIN\n\nApós confirmar, copie a mensagem de confirmação recebida.`;
  }
  
  if (method === 'emola') {
    return `Para efetuar o pagamento:\n\n1. Marque *898#\n2. Escolha "Transferir"\n3. Digite o número: ${formattedPhone}\n4. Digite o valor\n5. Confirme com o seu PIN\n\nApós confirmar, copie a mensagem de confirmação recebida.`;
  }
  
  return '';
}
