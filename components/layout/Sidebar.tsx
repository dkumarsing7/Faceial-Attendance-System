import React from 'react';
import { 
  LayoutDashboard, 
  Camera, 
  UserPlus, 
  History, 
  GraduationCap,
  X
} from 'lucide-react';
import { AppView } from '../../types';

interface SidebarProps {
  currentView: AppView;
  onViewChange: (view: AppView) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange, isOpen, onClose }) => {
  const navItems = [
    { id: AppView.DASHBOARD, icon: LayoutDashboard, label: 'Dashboard' },
    { id: AppView.ATTENDANCE, icon: Camera, label: 'Mark Attendance' },
    { id: AppView.REGISTER, icon: UserPlus, label: 'Register Member' },
    { id: AppView.HISTORY, icon: History, label: 'Records & Data' },
  ];

  const handleNavClick = (viewId: AppView) => {
    onViewChange(viewId);
    onClose(); // Close sidebar on mobile when a link is clicked
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside 
        className={`
          fixed top-0 left-0 h-full w-64 bg-slate-900/95 backdrop-blur-xl border-r border-slate-700 
          flex flex-col z-30 transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
          md:translate-x-0
        `}
      >
        <div className="p-6 border-b border-slate-700 flex justify-between items-center">
          <div>
            <div className="flex items-center space-x-2 text-blue-400 mb-1">
              <GraduationCap size={28} />
              <h1 className="text-xl font-bold text-white tracking-tight">Campus<span className="text-slate-400">ID</span></h1>
            </div>
            <p className="text-xs text-slate-500">College Attendance System</p>
          </div>
          {/* Close button for mobile */}
          <button onClick={onClose} className="md:hidden text-slate-400 hover:text-white">
            <X size={24} />
          </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                currentView === item.id 
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20' 
                  : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
              }`}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>
        
        <div className="p-4 border-t border-slate-700 bg-slate-900">
           <div className="text-xs text-slate-500 text-center">Deepak singh</div>
        </div>
      </aside>
    </>
  );
};