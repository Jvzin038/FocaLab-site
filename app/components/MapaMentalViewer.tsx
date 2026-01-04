'use client';

import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { toPng } from 'html-to-image';

interface MapaProps {
  chart: string;
}

export default function MapaMentalViewer({ chart }: MapaProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Inicializa o Mermaid
  useEffect(() => {
    setIsMounted(true);
    mermaid.initialize({ 
      startOnLoad: false, 
      theme: 'dark',
      securityLevel: 'loose',
      fontFamily: 'sans-serif'
    });
    
    // Pequeno delay para garantir que o DOM renderizou antes de desenhar
    setTimeout(() => {
      mermaid.contentLoaded();
    }, 100);
  }, [chart]);

  // Função de Download
  const downloadImage = async () => {
    if (elementRef.current === null) return;
    
    try {
      // Pega o elemento com o zoom aplicado (conteúdo interno)
      // Buscamos a div que contém o SVG gerado pelo mermaid
      const node = elementRef.current.querySelector('.mermaid') as HTMLElement;
      
      if (!node) return;

      const dataUrl = await toPng(node, { 
        backgroundColor: '#0f172a', // Cor de fundo do slate-900 para combinar
        quality: 1.0,
        pixelRatio: 2 // Melhora a resolução
      });
      
      const link = document.createElement('a');
      link.download = 'mapa-mental-focalab.png';
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Erro ao baixar:', err);
      alert('Erro ao baixar imagem.');
    }
  };

  if (!isMounted) return <div className="text-slate-500">Carregando visualizador...</div>;

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-xl border border-slate-800 overflow-hidden relative group">
      
      {/* BARRA DE FERRAMENTAS FLUTUANTE */}
      <div className="absolute top-4 right-4 z-20 flex gap-2">
         <button 
           onClick={downloadImage}
           className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded-lg text-xs font-bold shadow-lg transition flex items-center gap-2"
         >
           📸 Baixar PNG
         </button>
      </div>

      {/* ÁREA DE ZOOM */}
      <TransformWrapper 
        initialScale={1} 
        minScale={0.5} 
        maxScale={4}
        centerOnInit={true}
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            <div className="absolute bottom-4 left-4 z-20 flex bg-slate-800/80 backdrop-blur rounded-lg p-1 border border-slate-700 shadow-lg">
                <button onClick={() => zoomIn()} className="p-2 text-white hover:bg-slate-700 rounded transition" title="Mais Zoom">➕</button>
                <button onClick={() => zoomOut()} className="p-2 text-white hover:bg-slate-700 rounded transition" title="Menos Zoom">➖</button>
                <button onClick={() => resetTransform()} className="p-2 text-white hover:bg-slate-700 rounded transition" title="Resetar">🔄</button>
            </div>

            <TransformComponent wrapperClass="w-full h-full cursor-grab active:cursor-grabbing" contentClass="w-full h-full flex items-center justify-center">
              <div ref={elementRef} className="p-10 min-w-[800px] min-h-[600px] flex items-center justify-center">
                 {/* O Mermaid desenha o SVG aqui dentro */}
                 <div className="mermaid">
                   {chart}
                 </div>
              </div>
            </TransformComponent>
          </>
        )}
      </TransformWrapper>
    </div>
  );
}