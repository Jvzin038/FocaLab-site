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
    
    // CONFIGURAÇÃO TURBINADA DE VISUAL
    mermaid.initialize({ 
      startOnLoad: true,
      theme: 'base',
      securityLevel: 'loose',
      fontFamily: 'arial, sans-serif',
      themeVariables: {
        primaryColor: '#1e3a8a', // Azul escuro
        primaryTextColor: '#ffffff',
        primaryBorderColor: '#60a5fa',
        lineColor: '#f59e0b', // Laranja vibrante
        secondaryColor: '#db2777',
        tertiaryColor: '#4f46e5',
        fontSize: '28px', // FONTE MUITO MAIOR PARA LEITURA
      },
      flowchart: {
        curve: 'basis', // Curvas suaves
        nodeSpacing: 50,
        rankSpacing: 50,
        padding: 20
      }
    });
  }, []);

  useEffect(() => {
    if (isMounted && chart) {
        const renderMap = async () => {
            try {
                const cleanChart = chart.replace(/"/g, "'"); 
                // Renderiza o SVG
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

      // CONFIGURAÇÃO ULTRA HD PARA DOWNLOAD
      const dataUrl = await toPng(elementRef.current, { 
          backgroundColor: '#0f172a', // Fundo escuro igual do app
          quality: 1.0, 
          pixelRatio: 5, // 5x a resolução (Fica nítido até em TV)
          cacheBust: true,
      });
      
      const link = document.createElement('a');
      link.download = 'mapa-mental-focalab.png';
      link.href = dataUrl;
      link.click();
    } catch (err) { 
        alert('Erro ao baixar. Tente dar zoom out para caber tudo na tela antes de baixar.'); 
    }
  };

  if (!isMounted) return <div className="text-slate-500 text-center p-4">Carregando mapa...</div>;

  return (
    <div className="flex flex-col h-full w-full bg-slate-900 rounded-xl border border-slate-800 overflow-hidden relative group">
      
      {/* Botão de Download Fixo e Visível */}
      <div className="absolute top-4 right-4 z-50">
         <button onClick={downloadImage} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-xl border border-white/10 text-xs font-bold transition flex items-center gap-2">
            📸 Baixar Imagem HD
         </button>
      </div>

      <TransformWrapper 
        initialScale={0.5} 
        minScale={0.1} 
        maxScale={8} 
        centerOnInit={true}
        limitToBounds={false} // IMPORTANTE: Permite arrastar sem limites (fim da barreira)
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            {/* Controles de Zoom Flutuantes */}
            <div className="absolute bottom-4 left-4 z-50 flex flex-col gap-2 bg-slate-800/90 rounded-lg p-2 border border-slate-700 shadow-xl backdrop-blur-sm">
                <button onClick={() => zoomIn()} className="p-2 text-white hover:bg-slate-700 rounded font-bold" title="Mais Zoom">+</button>
                <button onClick={() => zoomOut()} className="p-2 text-white hover:bg-slate-700 rounded font-bold" title="Menos Zoom">-</button>
                <button onClick={() => resetTransform()} className="p-2 text-white hover:bg-slate-700 rounded text-xs" title="Resetar">↺</button>
            </div>

            <TransformComponent wrapperClass="w-full h-full" contentClass="w-full h-full">
              <div className="w-full h-full min-h-[600px] flex items-center justify-center p-20 cursor-grab active:cursor-grabbing">
                 {erroRender ? (
                     <div className="text-red-400 text-center p-4">
                         <p>Não foi possível desenhar este mapa.</p>
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