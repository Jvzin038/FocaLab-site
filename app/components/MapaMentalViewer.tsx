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
  const [erroRender, setErroRender] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    
    // Configuração de cores e fonte
    mermaid.initialize({ 
      startOnLoad: true,
      theme: 'base',
      securityLevel: 'loose',
      fontFamily: 'arial, sans-serif',
      themeVariables: {
        primaryColor: '#1e3a8a', // Azul escuro
        primaryTextColor: '#fff',
        primaryBorderColor: '#60a5fa',
        lineColor: '#f59e0b', // Laranja vibrante
        secondaryColor: '#db2777',
        tertiaryColor: '#4f46e5',
        fontSize: '18px' // Fonte maior para leitura
      },
      flowchart: {
        curve: 'basis' // Curvas mais suaves
      }
    });
  }, []);

  useEffect(() => {
    if (isMounted && chart) {
        const renderMap = async () => {
            try {
                const cleanChart = chart.replace(/"/g, "'"); 
                const { svg } = await mermaid.render('mermaid-svg-' + Date.now(), cleanChart);
                if (elementRef.current) {
                    elementRef.current.innerHTML = svg;
                    setErroRender(false);
                }
            } catch (e) {
                console.error("Erro Mermaid:", e);
                setErroRender(true);
            }
        };
        renderMap();
    }
  }, [chart, isMounted]);

  const downloadImage = async () => {
    if (elementRef.current === null) return;
    try {
      const svgElement = elementRef.current.querySelector('svg');
      if (!svgElement) return;

      // CONFIGURAÇÃO DE ALTA QUALIDADE
      const dataUrl = await toPng(elementRef.current, { 
          backgroundColor: '#0f172a', // Fundo escuro igual do app
          quality: 1.0, 
          pixelRatio: 4, // 4x a resolução da tela (HD)
          cacheBust: true,
      });
      
      const link = document.createElement('a');
      link.download = 'mapa-focalab-hd.png';
      link.href = dataUrl;
      link.click();
    } catch (err) { 
        alert('Erro ao baixar imagem. Tente dar zoom out antes de baixar.'); 
    }
  };

  if (!isMounted) return <div className="text-slate-500 text-center p-4">Carregando visualizador...</div>;

  return (
    <div className="flex flex-col h-full w-full bg-slate-900 rounded-xl border border-slate-800 overflow-hidden relative group">
      {/* Botão de Download flutuante */}
      <div className="absolute top-4 right-4 z-50">
         <button onClick={downloadImage} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-lg text-xs font-bold transition flex items-center gap-2 border border-blue-400/30">
            📸 Baixar HD
         </button>
      </div>

      <TransformWrapper 
        initialScale={0.6} 
        minScale={0.1} 
        maxScale={8} 
        centerOnInit={true}
        limitToBounds={false} // REMOVE A BARREIRA (Pode arrastar livremente)
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            <div className="absolute bottom-4 left-4 z-50 flex flex-col gap-2 bg-slate-800/90 rounded-lg p-2 border border-slate-700 shadow-xl">
                <button onClick={() => zoomIn()} className="p-2 text-white hover:bg-slate-700 rounded bg-slate-900/50">+</button>
                <button onClick={() => zoomOut()} className="p-2 text-white hover:bg-slate-700 rounded bg-slate-900/50">-</button>
                <button onClick={() => resetTransform()} className="p-2 text-white hover:bg-slate-700 rounded bg-slate-900/50">↺</button>
            </div>

            <TransformComponent wrapperClass="w-full h-full" contentClass="w-full h-full">
              <div className="w-full h-full min-h-[500px] flex items-center justify-center p-10 cursor-grab active:cursor-grabbing">
                 {erroRender ? (
                     <div className="text-red-400 text-center p-4">
                         <p>Erro ao desenhar mapa.</p>
                     </div>
                 ) : (
                     <div ref={elementRef} className="mermaid-container w-full h-full flex items-center justify-center" />
                 )}
              </div>
            </TransformComponent>
          </>
        )}
      </TransformWrapper>
    </div>
  );
}