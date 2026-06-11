import React, { useState, useEffect, useRef } from 'react';
import { X, Camera, RefreshCw, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CameraModalProps {
  onCapture: (imageBase64: string) => void;
  onClose: () => void;
}

export default function CameraModal({ onCapture, onClose }: CameraModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    setErrorMsg(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setHasPermission(true);
    } catch (err: any) {
      console.error("Camera error:", err);
      setHasPermission(false);
      setErrorMsg(err.message || 'Permiso denegado o cámara no encontrada.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Establecer dimensiones del canvas igual a la resolución del video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        onCapture(dataUrl);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[5000] bg-black flex flex-col items-center justify-center">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-[5010] bg-gradient-to-b from-black/80 to-transparent">
        <h2 className="text-white font-black tracking-widest uppercase text-sm">Cámara</h2>
        <button 
          onClick={() => { stopCamera(); onClose(); }}
          className="p-3 bg-white/20 hover:bg-white/40 rounded-full text-white transition-all backdrop-blur-md"
        >
          <X size={24} />
        </button>
      </div>

      {/* Video / Permissions area */}
      <div className="relative w-full h-full flex flex-col items-center justify-center">
        {hasPermission === false && (
          <div className="p-8 flex flex-col items-center text-center space-y-4">
            <div className="p-4 bg-red-500/20 rounded-full text-red-500">
              <AlertCircle size={48} />
            </div>
            <h3 className="text-white font-black text-xl">Permiso de Cámara Denegado</h3>
            <p className="text-gray-400 text-sm">
              Debes permitir el acceso a la cámara en tu navegador para tomar fotos desde Vuttik.
            </p>
            <button 
              onClick={startCamera}
              className="mt-4 bg-vuttik-blue text-white px-8 py-3 rounded-full font-bold flex items-center gap-2 hover:bg-opacity-90"
            >
              <RefreshCw size={18} />
              Reintentar
            </button>
          </div>
        )}

        {hasPermission === null && !errorMsg && (
          <div className="text-white flex flex-col items-center space-y-4">
            <div className="w-12 h-12 border-4 border-vuttik-blue border-t-transparent rounded-full animate-spin"></div>
            <p className="font-bold">Iniciando cámara...</p>
          </div>
        )}

        <video 
          ref={videoRef}
          className={`w-full h-full object-cover ${hasPermission ? 'opacity-100' : 'opacity-0'}`}
          playsInline
          muted
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Footer controls */}
        {hasPermission && (
          <div className="absolute bottom-0 left-0 right-0 p-8 flex justify-center items-center pb-12 bg-gradient-to-t from-black/80 to-transparent">
            {/* Capture Button */}
            <button 
              onClick={handleCapture}
              className="w-20 h-20 rounded-full bg-white/30 border-4 border-white flex items-center justify-center p-1.5 hover:scale-105 active:scale-95 transition-all"
            >
              <div className="w-full h-full bg-white rounded-full"></div>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
