import PDFParser from 'pdf2json';

export async function extrairTextoDoBuffer(buffer: Buffer): Promise<string> {
  // CORREÇÃO: Usamos 'true' (booleano) em vez de '1'
  const pdfParser = new PDFParser(null, true);

  return new Promise((resolve, reject) => {
    pdfParser.on("pdfParser_dataError", (errData: { parserError: Error } | Error) =>
      reject(new Error(errData instanceof Error ? errData.message : errData.parserError.message))
    );

    pdfParser.on("pdfParser_dataReady", () => {
      // O método getRawTextContent pega o texto puro
      const text = pdfParser.getRawTextContent();
      resolve(text);
    });

    pdfParser.parseBuffer(buffer);
  });
}