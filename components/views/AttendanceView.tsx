import React, { useRef, useState } from 'react';
import { Camera, Image as ImageIcon, RefreshCw, Users } from 'lucide-react';
import { Button } from '../ui/Button';
import { CameraPanel, useCameraCapture } from '../common/CameraPanel';

interface AttendanceViewProps {
  onProcess: (image: string) => void;
  isLoading: boolean;
}

export const AttendanceView: React.FC<AttendanceViewProps> = ({ onProcess, isLoading }) => {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { capture } = useCameraCapture();

  const handleCapture = () => {
    const img = capture();
    if (img) setCapturedImage(img);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCapturedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProcess = () => {
      if (capturedImage) onProcess(capturedImage);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full space-y-6 max-w-4xl mx-auto">
      <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />

      <CameraPanel 
        capturedImage={capturedImage} 
        onCapture={setCapturedImage} 
        isLoading={isLoading} 
        isRegistration={false} 
      />

      <div className="w-full max-w-xl space-y-4">
        <div className="space-y-4">
             <div className="flex space-x-3">
              {!capturedImage ? (
                 <>
                   <Button onClick={handleCapture} className="flex-1 py-4 text-lg bg-emerald-600 hover:bg-emerald-500" disabled={isLoading}><Camera className="mr-2" /> Live Group Scan</Button>
                   <Button onClick={() => fileInputRef.current?.click()} variant="secondary" className="flex-1 py-4 text-lg" disabled={isLoading}><ImageIcon className="mr-2" /> Upload Group Photo</Button>
                 </>
              ) : (
                 <>
                   <Button onClick={() => setCapturedImage(null)} variant="secondary" className="flex-1 py-4" disabled={isLoading}><RefreshCw className="mr-2" /> Clear</Button>
                   <Button onClick={handleProcess} className="flex-[2] py-4 text-lg bg-blue-600 hover:bg-blue-500" disabled={isLoading}><Users className="mr-2" /> Process Attendance</Button>
                 </>
              )}
            </div>
            <p className="text-center text-slate-500 text-sm">
              {capturedImage ? "Click 'Process' to identify students." : "Scan the whole class or upload a group photo."}
            </p>
          </div>
      </div>
    </div>
  );
};