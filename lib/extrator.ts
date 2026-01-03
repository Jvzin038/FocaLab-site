import { PDFParse } from 'pdf-parse';

// --- O PULO DO GATO (CORREÇÃO DO ERRO DOMMatrix) ---
// O Node.js não tem DOMMatrix nativo, então criamos um falso para o pdf-parse não travar.
// @ts-ignore
if (typeof Promise.withResolvers === "undefined") {
    // Polyfill opcional para versões antigas do Node, por segurança
    // @ts-ignore
    Promise.withResolvers = function () {
        let resolve, reject;
        const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
        return { promise, resolve, reject };
    };
}

// @ts-ignore
global.DOMMatrix = global.DOMMatrix || class {
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
// O pdf-parse as vezes tenta usar atob para decodificar partes do PDF e falha se tiver espaços.
if (typeof global.atob === 'undefined') {
    global.atob = (str) => Buffer.from(str, 'base64').toString('binary');
} else {
    const originalAtob = global.atob;
    global.atob = (str) => {
        // Limpa a string antes de tentar decodificar
        try {
            return originalAtob(str.replace(/\s/g, ''));
        } catch (e) {
            return ""; // Retorna vazio se falhar, em vez de erro fatal
        }
    };
}

export async function extrairTextoDoBuffer(buffer: Buffer, mimeType: string): Promise<string> {
  try {
    // 1. Se for PDF, usa o pdf-parse
    if (mimeType === 'application/pdf') {
      const parser = new PDFParse({ data: buffer });
      const data = await parser.getText();
      await parser.destroy();
      // Limpa quebras de linha estranhas que PDFs costumam ter
      return data.text.replace(/\n\n+/g, '\n').substring(0, 25000); 
    }
    
    // 2. Se for texto puro
    if (mimeType.includes('text') || mimeType.includes('json')) {
      return buffer.toString('utf-8');
    }

    // 3. Se for imagem ou áudio, por enquanto retornamos vazio (trataremos depois)
    return "";
  } catch (error) {
    console.error("Erro ao ler PDF:", error);
    throw new Error("Não foi possível ler o texto do arquivo.");
  }
}