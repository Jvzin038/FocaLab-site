export async function extrairTextoDoBuffer(buffer: Buffer, mimeType: string): Promise<string> {
  try {
    // 1. Se for PDF, usa o pdf-parse
    if (mimeType === 'application/pdf') {
      const { PDFParse } = await import('pdf-parse');
      const parser = new PDFParse({ data: buffer });
      const data = await parser.getText();
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