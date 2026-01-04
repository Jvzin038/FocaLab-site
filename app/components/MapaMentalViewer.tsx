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
    
    // Configuração de cores vibrantes
    mermaid.initialize({ 
      startOnLoad: true,
      theme: 'base',
      securityLevel: 'loose',
      themeVariables: {
        primaryColor: '#1e3a8a', // Azul escuro
        primaryTextColor: '#fff',
        primaryBorderColor: '#60a5fa',
        lineColor: '#f59e0b', // Laranja
        secondaryColor: '#db2777',
        tertiaryColor: '#4f46e5'
      }
    });
  }, []);

  useEffect(() => {
    if (isMounted && chart) {
        const renderMap = async () => {
            try {
                // Limpa o código para evitar quebras
                const cleanChart = chart.replace(/"/g, "'"); 
                
                // Força a renderização
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
      // Pega o SVG gerado
      const svgElement = elementRef.current.querySelector('svg');
      if (!svgElement) return;

      // Converte para PNG com fundo escuro
      const dataUrl = await toPng(elementRef.current, { backgroundColor: '#0f172a', quality: 1.0, pixelRatio: 3 });
      const link = document.createElement('a');
      link.download = 'mapa-focalab.png';
      link.href = dataUrl;
      link.click();
    } catch (err) { alert('Erro ao baixar imagem.'); }
  };

  if (!isMounted) return <div className="text-slate-500 text-center p-4">Carregando visualizador...</div>;

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-xl border border-slate-800 overflow-hidden relative group">
      <div className="absolute top-2 right-2 z-20">
         <button onClick={downloadImage} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded shadow text-xs font-bold transition flex items-center gap-1">📸 Baixar Imagem</button>
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
              <div className="w-full h-full flex items-center justify-center p-4 cursor-grab active:cursor-grabbing">
                 {erroRender ? (
                     <div className="text-red-400 text-center p-4 border border-red-900/50 rounded bg-red-900/20">
                         <p className="font-bold">Não foi possível desenhar este mapa.</p>
                         <p className="text-xs mt-2 opacity-70">O código gerado pela IA contém erros de sintaxe.</p>
                         <pre className="text-left text-[10px] mt-4 bg-black p-2 rounded overflow-auto max-w-sm">{chart}</pre>
                     </div>
                 ) : (
                     <div ref={elementRef} className="mermaid-container" />
                 )}
              </div>
            </TransformComponent>
          </>
        )}
      </TransformWrapper>
    </div>
  );
}