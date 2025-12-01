import React, { useRef } from 'react';
import { 
  HardDrive, 
  CheckCircle, 
  FolderOpen, 
  FileUp, 
  Database, 
  Save, 
  Users, 
  Download,
  Calendar,
  Edit3,
  ChevronLeft,
  ChevronRight,
  ArrowLeft
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { User, AttendanceRecord, AppView } from '../../types';

interface HistoryViewProps {
  users: User[];
  records: AttendanceRecord[];
  selectedDate: string;
  onDateChange: (date: string) => void;
  onUpdateStatus: (userId: string, newStatus: string) => void;
  dirHandle: any;
  lastSaved: Date | null;
  onConnectFolder: () => void;
  onBackupDB: () => void;
  onLoadDB: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBackupRecords: () => void;
  onLoadRecords: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExportList: () => void;
  onExportReport: () => void;
  onNavigate: (view: AppView) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  users, records, selectedDate, onDateChange, onUpdateStatus,
  dirHandle, lastSaved, onConnectFolder,
  onBackupDB, onLoadDB,
  onBackupRecords, onLoadRecords,
  onExportList, onExportReport,
  onNavigate
}) => {
  const dbInputRef = useRef<HTMLInputElement>(null);
  const recordsInputRef = useRef<HTMLInputElement>(null);

  // Date Navigation Helpers
  const handleDateShift = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    onDateChange(d.toISOString().split('T')[0]);
  };

  const handleToday = () => {
    onDateChange(new Date().toISOString().split('T')[0]);
  };

  // Generate Daily Report
  const dailyReport = users.map(user => {
    const record = records.find(r => r.userId === user.id && new Date(r.timestamp).toDateString() === new Date(selectedDate).toDateString());
    return {
      ...user,
      status: record ? record.status : 'Absent',
      time: record ? new Date(record.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--',
      recordId: record ? record.id : null
    };
 });

  const presentCount = dailyReport.filter(u => u.status === 'Present' || u.status === 'Late').length;
  const absentCount = dailyReport.filter(u => u.status === 'Absent').length;

  return (
    <div className="space-y-4 md:space-y-6 pb-20 md:pb-0">
      <input type="file" ref={dbInputRef} onChange={onLoadDB} accept=".csv" className="hidden" />
      <input type="file" ref={recordsInputRef} onChange={onLoadRecords} accept=".csv" className="hidden" />

      {/* --- Header Section --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => onNavigate(AppView.DASHBOARD)} 
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-white leading-tight">Records & Data</h2>
            <p className="text-sm text-slate-400">Manage database and attendance logs</p>
          </div>
        </div>

        {/* Data Storage Banner (Compact on mobile) */}
        <div className={`p-3 rounded-xl border flex items-center justify-between md:justify-start md:space-x-4 ${dirHandle ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-slate-800 border-slate-700'}`}>
           <div className="flex items-center space-x-2">
              <div className={`p-1.5 rounded-lg ${dirHandle ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                <HardDrive size={18} />
              </div>
              <div className="flex flex-col">
                 <span className="text-xs font-bold text-white uppercase tracking-wider">{dirHandle ? 'Auto-Save On' : 'Storage Off'}</span>
                 <span className="text-[10px] text-slate-400 hidden sm:inline">
                    {dirHandle ? `Last saved: ${lastSaved ? lastSaved.toLocaleTimeString() : 'Just now'}` : `Connect 'data' folder`}
                 </span>
              </div>
           </div>
           <Button onClick={onConnectFolder} variant={dirHandle ? 'success' : 'secondary'} className="text-xs px-3 py-1 h-8">
              {dirHandle ? 'Connected' : 'Connect'}
           </Button>
        </div>
      </div>

      {/* --- Action Toolbar (Scrollable on Mobile) --- */}
      <div className="overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:pb-0">
        <div className="flex space-x-2 min-w-max">
           {/* Database Controls */}
           <div className="flex items-center p-1 bg-slate-800 rounded-lg border border-slate-700">
              <span className="text-[10px] font-bold text-slate-500 px-2 uppercase">DB</span>
              <Button onClick={() => dbInputRef.current?.click()} variant="secondary" className="text-xs px-2 h-7 bg-transparent border-0 hover:bg-slate-700">
                 <FileUp size={14} className="mr-1.5 text-blue-400" /> Import
              </Button>
              <div className="w-px h-3 bg-slate-600 mx-1"></div>
              <Button onClick={onBackupDB} variant="secondary" className="text-xs px-2 h-7 bg-transparent border-0 hover:bg-slate-700">
                 <Database size={14} className="mr-1.5 text-blue-400" /> Backup
              </Button>
           </div>

           {/* Attendance Controls */}
           <div className="flex items-center p-1 bg-slate-800 rounded-lg border border-slate-700">
              <span className="text-[10px] font-bold text-slate-500 px-2 uppercase">Recs</span>
              <Button onClick={() => recordsInputRef.current?.click()} variant="secondary" className="text-xs px-2 h-7 bg-transparent border-0 hover:bg-slate-700">
                 <FileUp size={14} className="mr-1.5 text-purple-400" /> Import
              </Button>
              <div className="w-px h-3 bg-slate-600 mx-1"></div>
              <Button onClick={onBackupRecords} variant="secondary" className="text-xs px-2 h-7 bg-transparent border-0 hover:bg-slate-700">
                 <Save size={14} className="mr-1.5 text-purple-400" /> Backup
              </Button>
           </div>

           {/* Exports */}
           <div className="flex items-center p-1 bg-slate-800 rounded-lg border border-slate-700">
               <span className="text-[10px] font-bold text-slate-500 px-2 uppercase">Exp</span>
               <Button onClick={onExportList} variant="secondary" className="text-xs px-2 h-7 bg-transparent border-0 hover:bg-slate-700">
                <Users size={14} className="mr-1.5 text-emerald-400" /> List
              </Button>
              <div className="w-px h-3 bg-slate-600 mx-1"></div>
              <Button onClick={onExportReport} variant="secondary" className="text-xs px-2 h-7 bg-transparent border-0 hover:bg-slate-700">
                <Download size={14} className="mr-1.5 text-emerald-400" /> Report
              </Button>
           </div>
        </div>
      </div>

      {/* --- Date Filter & Stats Bar --- */}
      <div className="bg-slate-800/80 backdrop-blur-sm p-4 rounded-xl border border-slate-700 flex flex-col md:flex-row items-center justify-between gap-4 sticky top-0 z-10 shadow-xl shadow-slate-900/50">
         
         {/* Date Controls */}
         <div className="flex items-center w-full md:w-auto bg-slate-900/50 p-1 rounded-lg border border-slate-600/50">
            <button onClick={() => handleDateShift(-1)} className="p-2 hover:bg-slate-700 rounded-md text-slate-400 hover:text-white transition-colors">
              <ChevronLeft size={18} />
            </button>
            
            <div className="flex-1 flex items-center justify-center px-2 relative group">
               <Calendar size={16} className="text-blue-400 mr-2 absolute left-2 pointer-events-none" />
               <input 
                  type="date" 
                  value={selectedDate} 
                  onChange={(e) => onDateChange(e.target.value)}
                  className="bg-transparent text-white text-sm font-medium border-none outline-none pl-8 pr-2 w-full text-center cursor-pointer"
               />
            </div>

            <button onClick={() => handleDateShift(1)} className="p-2 hover:bg-slate-700 rounded-md text-slate-400 hover:text-white transition-colors">
              <ChevronRight size={18} />
            </button>
            
            <div className="w-px h-5 bg-slate-700 mx-1"></div>
            
            <button onClick={handleToday} className="px-3 py-1.5 text-xs font-medium text-blue-400 hover:bg-blue-500/10 rounded-md transition-colors whitespace-nowrap">
              Today
            </button>
         </div>

         {/* Stats Pills */}
         <div className="flex items-center space-x-2 w-full md:w-auto justify-between md:justify-end">
            <div className="flex flex-col items-center px-4 py-1 bg-slate-700/30 rounded-lg border border-slate-700 min-w-[80px]">
               <span className="text-[10px] text-slate-400 uppercase font-bold">Total</span>
               <span className="text-lg font-bold text-white leading-none">{users.length}</span>
            </div>
            <div className="flex flex-col items-center px-4 py-1 bg-green-500/10 rounded-lg border border-green-500/20 min-w-[80px]">
               <span className="text-[10px] text-green-400 uppercase font-bold">Present</span>
               <span className="text-lg font-bold text-green-400 leading-none">{presentCount}</span>
            </div>
            <div className="flex flex-col items-center px-4 py-1 bg-red-500/10 rounded-lg border border-red-500/20 min-w-[80px]">
               <span className="text-[10px] text-red-400 uppercase font-bold">Absent</span>
               <span className="text-lg font-bold text-red-400 leading-none">{absentCount}</span>
            </div>
         </div>
      </div>

      {/* --- Data Table --- */}
      <Card className="overflow-hidden border-0 md:border md:border-slate-700 shadow-none md:shadow-lg bg-transparent md:bg-slate-800/50">
        <div className="overflow-x-auto -mx-4 md:mx-0">
          <div className="inline-block min-w-full align-middle">
            <table className="min-w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/50 md:bg-slate-700/50 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-700">
                  <th className="p-4 font-semibold sticky left-0 bg-slate-900 md:bg-transparent z-10 shadow-[2px_0_5px_rgba(0,0,0,0.3)] md:shadow-none">Student</th>
                  <th className="p-4 font-semibold hidden sm:table-cell">Role</th>
                  <th className="p-4 font-semibold">Time</th>
                  <th className="p-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50 bg-slate-800/30 md:bg-transparent">
                {dailyReport.map(user => (
                  <tr key={user.id} className="hover:bg-slate-700/30 transition-colors group">
                    <td className="p-3 md:p-4 sticky left-0 bg-slate-900 md:bg-transparent z-10 shadow-[2px_0_5px_rgba(0,0,0,0.3)] md:shadow-none group-hover:bg-slate-800 md:group-hover:bg-transparent transition-colors">
                      <div className="flex items-center space-x-3">
                        <img src={user.image} alt="" className="w-9 h-9 rounded-full bg-slate-800 object-cover border border-slate-600" />
                        <div className="flex flex-col">
                           <span className="text-white font-medium text-sm">{user.name}</span>
                           <span className="text-xs text-slate-500 sm:hidden">{user.role}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-slate-300 text-sm hidden sm:table-cell">{user.role}</td>
                    <td className="p-4 font-mono text-xs text-slate-400 whitespace-nowrap">{user.time}</td>
                    <td className="p-4">
                      <div className="relative inline-block w-full min-w-[100px]">
                          <select 
                            value={user.status} 
                            onChange={(e) => onUpdateStatus(user.id, e.target.value)}
                            className={`
                              w-full appearance-none pl-3 pr-8 py-1.5 rounded-lg text-xs font-bold border outline-none cursor-pointer transition-all
                              ${user.status === 'Present' ? 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20' : 
                                user.status === 'Late' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20 hover:bg-yellow-500/20' : 
                                'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'}
                            `}
                          >
                            <option value="Present" className="bg-slate-800 text-green-400">Present</option>
                            <option value="Late" className="bg-slate-800 text-yellow-400">Late</option>
                            <option value="Absent" className="bg-slate-800 text-red-400">Absent</option>
                          </select>
                          <Edit3 size={12} className="absolute right-3 top-2 pointer-events-none opacity-50" />
                      </div>
                    </td>
                  </tr>
                ))}
                {dailyReport.length === 0 && (
                  <tr><td colSpan={4} className="p-12 text-center text-slate-500 italic">No users found in database.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </div>
  );
};