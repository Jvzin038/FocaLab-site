// @ts-ignore
import pdf from 'pdf-parse';

// --- CORREÇÃO 1: BLINDAGEM DO ATOB ---
// @ts-ignore
global.atob = function(str: any) {
    try {
        const cleanStr = String(str).replace(/[\t\n\f\r ]+/g, "");
        return Buffer.from(cleanStr, 'base64').toString('binary');
    } catch (e) {
        return "";
    }
};

// --- CORREÇÃO 2: DOMMatrix FALSO (Corrigido para TypeScript) ---
// @ts-ignore
if (!global.DOMMatrix) {
    // @ts-ignore
    global.DOMMatrix = class {
        // AQUI ESTAVA O ERRO: Precisamos declarar as variáveis antes
        m11: number; m12: number; m21: number; m22: number;
        m41: number; m42: number;

        constructor() {
            this.m11 = 1; this.m12 = 0; this.m21 = 0; this.m22 = 1; 
            this.m41 = 0; this.m42 = 0;
        }
    };
}

export async function extrairTextoDoBuffer(buffer: Buffer, mimeType: string): Promise<string> {
  try {
    // 1. Se for PDF
    if (mimeType === 'application/pdf') {
      try {
        const data = await pdf(buffer);
        
        if (!data || !data.text || data.text.trim().length === 0) {
           return ""; 
        }

        return data.text.replace(/\n\n+/g, '\n').substring(0, 40000);
        
      } catch (pdfError) {
        console.error("Erro interno ao ler PDF:", pdfError);
        return ""; 
      }
    }
    
    // 2. Se for texto puro
    if (mimeType.includes('text') || mimeType.includes('json')) {
      return buffer.toString('utf-8');
    }

    return "";
  } catch (error) {
    console.error("Erro geral na extração:", error);
    return ""; 
  }
}