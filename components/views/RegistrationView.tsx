import React, { useRef, useState } from 'react';
import { Camera, Upload, RefreshCw, UserPlus } from 'lucide-react';
import { Button } from '../ui/Button';
import { CameraPanel, useCameraCapture } from '../common/CameraPanel';

interface RegistrationViewProps {
  onRegister: (name: string, role: string, dept: string, image: string) => Promise<boolean>;
  isLoading: boolean;
}

export const RegistrationView: React.FC<RegistrationViewProps> = ({ onRegister, isLoading }) => {
  const [regName, setRegName] = useState('');
  const [regRole, setRegRole] = useState('Student');
  const [regDept, setRegDept] = useState('');
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

  const handleRegisterClick = async () => {
    if (capturedImage && regName && regRole && regDept) {
      const success = await onRegister(regName, regRole, regDept, capturedImage);
      
      // Only clear the form if registration was successful
      if (success) {
        setCapturedImage(null);
        setRegName('');
        setRegDept('');
      }
      // If failed (e.g. duplicate user), the form data remains so user can see/fix it
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full space-y-6 max-w-4xl mx-auto">
      <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />

      <CameraPanel 
        capturedImage={capturedImage} 
        onCapture={setCapturedImage} 
        isLoading={isLoading} 
        isRegistration={true} 
      />

      <div className="w-full max-w-xl space-y-4">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Full Name</label>
                <input type="text" value={regName} onChange={e => setRegName(e.target.value)} placeholder="e.g. Jane Doe" className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Role</label>
                <select value={regRole} onChange={e => setRegRole(e.target.value)} className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="Student">Student</option>
                  <option value="Professor">Professor</option>
                  <option value="Staff">Staff</option>
                </select>
              </div>
              <div className="space-y-2 col-span-2">
                <label className="text-sm font-medium text-slate-300">Department</label>
                 <input type="text" value={regDept} onChange={e => setRegDept(e.target.value)} placeholder="e.g. Computer Science" className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>
            
            <div className="flex space-x-3">
              {!capturedImage ? (
                <>
                  <Button onClick={handleCapture} className="flex-1 py-3" disabled={isLoading}><Camera className="mr-2" size={20} /> Capture</Button>
                  <Button onClick={() => fileInputRef.current?.click()} variant="secondary" className="flex-1 py-3" disabled={isLoading}><Upload className="mr-2" size={20} /> Upload</Button>
                </>
              ) : (
                <>
                  <Button onClick={() => setCapturedImage(null)} variant="secondary" className="flex-1 py-3" disabled={isLoading}><RefreshCw className="mr-2" size={20} /> Retake</Button>
                  <Button onClick={handleRegisterClick} className="flex-1 py-3" disabled={!regName || !regRole || !regDept || isLoading}><UserPlus className="mr-2" size={20} /> Register User</Button>
                </>
              )}
            </div>
          </div>
      </div>
    </div>
  );
};