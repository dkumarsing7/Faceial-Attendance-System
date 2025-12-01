import React, { useState, useRef, useEffect } from 'react';
import { Loader2, ZoomIn, Focus } from 'lucide-react';
import { Card } from '../ui/Card';

interface CameraPanelProps {
  capturedImage: string | null;
  onCapture: (image: string) => void;
  isLoading: boolean;
  isRegistration: boolean;
}

export const CameraPanel: React.FC<CameraPanelProps> = ({ 
  capturedImage, 
  onCapture, 
  isLoading, 
  isRegistration 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [zoomCap, setZoomCap] = useState<{min: number, max: number, step: number} | null>(null);
  const [zoom, setZoom] = useState(1);
  const [focusCap, setFocusCap] = useState<{min: number, max: number, step: number} | null>(null);
  const [focus, setFocus] = useState(0);

  const startCamera = async () => {
    if (capturedImage) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 }, 
          height: { ideal: 1080 } 
        } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        
        const track = stream.getVideoTracks()[0];
        const capabilities = (track as any).getCapabilities ? (track as any).getCapabilities() : {};
        const settings = track.getSettings();
        
        if ('zoom' in capabilities) {
          setZoomCap({ min: capabilities.zoom.min, max: capabilities.zoom.max, step: capabilities.zoom.step });
          setZoom((settings as any).zoom || capabilities.zoom.min);
        }
        if ('focusDistance' in capabilities) {
          setFocusCap({ min: capabilities.focusDistance.min, max: capabilities.focusDistance.max, step: capabilities.focusDistance.step });
          setFocus((settings as any).focusDistance || capabilities.focusDistance.min);
        }
      }
    } catch (err) {
      console.error("Camera Error:", err);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    if (!capturedImage) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [capturedImage]);

  const handleZoomChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setZoom(val);
    const track = streamRef.current?.getVideoTracks()[0];
    if (track) try { await (track as any).applyConstraints({ advanced: [{ zoom: val }] }); } catch (err) { console.error(err); }
  };

  const handleFocusChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setFocus(val);
    const track = streamRef.current?.getVideoTracks()[0];
    if (track) try { await (track as any).applyConstraints({ advanced: [{ focusMode: 'manual', focusDistance: val }] }); } catch (err) { console.error(err); }
  };

  return (
    <Card className="w-full relative overflow-hidden p-0 bg-black border-slate-700 flex flex-col">
        <div className="relative aspect-video overflow-hidden bg-black rounded-t-lg">
          {capturedImage ? (
             <img src={capturedImage} alt="Captured" className="w-full h-full object-contain bg-slate-950" />
          ) : (
             <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1]" />
          )}
          <canvas ref={canvasRef} className="hidden" />
          
          {!capturedImage && (
            <div className="absolute inset-0 border-2 border-white/20 m-4 md:m-12 rounded-lg pointer-events-none flex items-center justify-center">
              <div className={`border-2 border-blue-500/50 rounded-lg animate-pulse ${isRegistration ? 'w-48 h-48 md:w-64 md:h-64 rounded-full' : 'w-[90%] h-[80%]'}`}></div>
              <p className="absolute bottom-4 text-white/70 text-sm shadow-black drop-shadow-md bg-black/40 px-3 py-1 rounded-full">
                 {isRegistration ? 'Align face within frame' : 'Capture class or single student'}
              </p>
            </div>
          )}

          {isLoading && (
            <div className="absolute inset-0 bg-slate-900/80 flex flex-col items-center justify-center z-10 backdrop-blur-sm">
              <Loader2 size={48} className="text-blue-500 animate-spin mb-4" />
              <p className="text-white font-medium animate-pulse">{isRegistration ? 'Verifying...' : 'Scanning Class...'}</p>
            </div>
          )}
        </div>

        {/* Camera Controls - Only visible if camera supports features */}
        {!capturedImage && (zoomCap || focusCap) && (
          <div className="p-3 bg-slate-900 border-t border-slate-800 grid grid-cols-2 gap-4">
             {zoomCap && (
               <div className="flex flex-col space-y-1">
                 <div className="flex justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-1"><ZoomIn size={12} /> Zoom</span>
                    <span>{zoom.toFixed(1)}x</span>
                 </div>
                 <input 
                   type="range" 
                   min={zoomCap.min} 
                   max={zoomCap.max} 
                   step={zoomCap.step} 
                   value={zoom} 
                   onChange={handleZoomChange} 
                   className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500" 
                 />
               </div>
             )}
             {focusCap && (
               <div className="flex flex-col space-y-1">
                 <div className="flex justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-1"><Focus size={12} /> Focus</span>
                    <span>{focus.toFixed(2)}</span>
                 </div>
                 <input 
                   type="range" 
                   min={focusCap.min} 
                   max={focusCap.max} 
                   step={focusCap.step} 
                   value={focus} 
                   onChange={handleFocusChange} 
                   className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500" 
                 />
               </div>
             )}
          </div>
        )}
      </Card>
  );
};

export const useCameraCapture = () => {
    const capture = (): string | null => {
        const video = document.querySelector('video'); 
        const canvas = document.createElement('canvas');
        if (video) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(video, 0, 0);
                return canvas.toDataURL('image/jpeg', 0.8);
            }
        }
        return null;
    };
    return { capture };
};