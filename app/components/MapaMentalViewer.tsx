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

  useEffect(() => {
    setIsMounted(true);
    // CONFIGURAÇÃO DE CORES VIBRANTES AQUI
    mermaid.initialize({ 
      startOnLoad: false, 
      theme: 'base',
      themeVariables: {
        primaryColor: '#2563eb', // Azul forte
        primaryTextColor: '#ffffff',
        primaryBorderColor: '#60a5fa',
        lineColor: '#f59e0b', // Linhas laranjas
        secondaryColor: '#db2777', // Rosa para sub-tópicos
        tertiaryColor: '#4f46e5' // Roxo
      },
      fontFamily: 'sans-serif'
    });
    
    setTimeout(() => {
      try {
        mermaid.contentLoaded();
      } catch (e) { console.error("Erro render mermaid", e); }
    }, 200);
  }, [chart]);

  const downloadImage = async () => {
    if (elementRef.current === null) return;
    const node = elementRef.current.querySelector('.mermaid') as HTMLElement;
    if (!node) return;
    try {
      const dataUrl = await toPng(node, { backgroundColor: '#0f172a', quality: 2.0 });
      const link = document.createElement('a');
      link.download = 'mapa-focalab.png';
      link.href = dataUrl;
      link.click();
    } catch (err) { alert('Erro ao baixar imagem.'); }
  };

  if (!isMounted) return <div className="text-slate-500 text-center p-4">Carregando mapa...</div>;

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-xl border border-slate-800 overflow-hidden relative group">
      <div className="absolute top-2 right-2 z-20">
         <button onClick={downloadImage} className="bg-blue-600 text-white px-3 py-1 rounded shadow text-xs font-bold">📸 Baixar</button>
      </div>

      <TransformWrapper initialScale={0.8} minScale={0.2} maxScale={4} centerOnInit={true}>
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            <div className="absolute bottom-4 left-4 z-20 flex bg-slate-800/90 rounded-lg p-1 border border-slate-700">
                <button onClick={() => zoomIn()} className="p-2 text-white text-lg hover:bg-slate-700 rounded">+</button>
                <button onClick={() => zoomOut()} className="p-2 text-white text-lg hover:bg-slate-700 rounded">-</button>
                <button onClick={() => resetTransform()} className="p-2 text-white text-lg hover:bg-slate-700 rounded">↺</button>
            </div>

            <TransformComponent wrapperClass="w-full h-full" contentClass="w-full h-full flex items-center justify-center">
              {/* REMOVI O MIN-WIDTH FIXO PARA CABER NO CELULAR */}
              <div ref={elementRef} className="w-full h-full flex items-center justify-center p-4">
                 <div className="mermaid text-center">
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