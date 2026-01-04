import PDFParser from 'pdf2json';

export async function extrairTextoDoBuffer(buffer: Buffer): Promise<string> {
  // O "null, 1" configura para extrair texto bruto (raw text)
  const pdfParser = new PDFParser(null, true);

  return new Promise((resolve, reject) => {
    // Caso dê erro no processamento
    pdfParser.on("pdfParser_dataError", (errData: any) =>
      reject(new Error(errData.parserError))
    );

    // Quando terminar de processar
    pdfParser.on("pdfParser_dataReady", () => {
      // Pega o conteúdo de texto extraído
      const text = pdfParser.getRawTextContent();
      resolve(text);
    });

    // Inicia a leitura do Buffer
    pdfParser.parseBuffer(buffer);
  });
}