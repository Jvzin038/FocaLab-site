import { PDFParse } from 'pdf-parse';

// --- CORREÇÃO 1: MOCK DO DOMMatrix (Para não dar erro no Vercel) ---
// @ts-ignore
(global as any).DOMMatrix = (global as any).DOMMatrix || class {
    m11: number;
    m12: number;
    m21: number;
    m22: number;
    m41: number;
    m42: number;
    constructor() {
        this.m11 = 1; this.m12 = 0; this.m21 = 0; this.m22 = 1; 
        this.m41 = 0; this.m42 = 0;
    }
};

// --- CORREÇÃO 2: CORREÇÃO DO ATOB (Para não dar erro de "Pattern") ---
// O pdf-parse usa atob internamente. Vamos blindar essa função para limpar sujeira antes de ler.
const originalAtob = global.atob;
global.atob = function (str) {
    try {
        // Remove qualquer coisa que não seja Base64 (espaços, enters, tabs)
        const cleanStr = String(str).replace(/[\t\n\f\r ]+/g, "");
        if (originalAtob) return originalAtob(cleanStr);
        return Buffer.from(cleanStr, 'base64').toString('binary');
    } catch (e) {
        return "";
    }
};

export async function extrairTextoDoBuffer(buffer: Buffer, mimeType: string): Promise<string> {
  try {
    // 1. Se for PDF
    if (mimeType === 'application/pdf') {
      try {
        const parser = new PDFParse({ data: buffer });
        const result = await parser.getText();
        await parser.destroy();
        
        if (!result || !result.text || result.text.trim().length === 0) {
           // Se não leu nada, retorna vazio sem quebrar
           return ""; 
        }

        // Limpa excesso de quebras de linha
        return result.text.replace(/\n\n+/g, '\n').substring(0, 35000);
        
      } catch (pdfError) {
        console.error("Erro interno do pdf-parse:", pdfError);
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