import React from 'react';
import { Users, CheckCircle, History, Trash2, Settings, Clock, Calendar } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { User, AttendanceRecord, AppView } from '../../types';

interface DashboardViewProps {
  users: User[];
  records: AttendanceRecord[];
  onNavigate: (view: AppView) => void;
  onDeleteUser: (id: string) => void;
  lateThreshold: string;
  onUpdateThreshold: (time: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ 
  users, 
  records, 
  onNavigate,
  onDeleteUser,
  lateThreshold,
  onUpdateThreshold
}) => {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-blue-900/40 to-slate-800/40 border-blue-500/20">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-500/20 rounded-lg text-blue-400"><Users size={24} /></div>
            <div>
              <p className="text-sm text-slate-400">Total Registered</p>
              <h3 className="text-2xl font-bold text-white">{users.length}</h3>
            </div>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-900/40 to-slate-800/40 border-emerald-500/20">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-emerald-500/20 rounded-lg text-emerald-400"><CheckCircle size={24} /></div>
            <div>
              <p className="text-sm text-slate-400">Present Today</p>
              <h3 className="text-2xl font-bold text-white">
                {records.filter(r => new Date(r.timestamp).toDateString() === new Date().toDateString()).length}
              </h3>
            </div>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-purple-900/40 to-slate-800/40 border-purple-500/20">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-purple-500/20 rounded-lg text-purple-400"><History size={24} /></div>
            <div>
              <p className="text-sm text-slate-400">Total Logs</p>
              <h3 className="text-2xl font-bold text-white">{records.length}</h3>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Recent Activity */}
        <div className="space-y-6">
           <Card className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Clock size={18} className="text-blue-400" /> Recent Attendance
              </h3>
              <button onClick={() => onNavigate(AppView.HISTORY)} className="text-xs text-blue-400 hover:text-blue-300 font-medium px-2 py-1 rounded hover:bg-blue-500/10">
                View All
              </button>
            </div>
            <div className="space-y-4 flex-1">
              {records.slice(0, 6).map(record => {
                const date = new Date(record.timestamp);
                return (
                  <div key={record.id} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg border border-slate-700/50 hover:border-slate-600 transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-slate-600 flex items-center justify-center text-sm font-bold text-white border-2 border-slate-500 shadow-sm">
                        {record.userName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-white text-sm">{record.userName}</p>
                        <p className="text-xs text-slate-400">{record.role}</p>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <Badge status={record.status} />
                      <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                        {date.toLocaleDateString([], { month: 'short', day: 'numeric' })} • {date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </p>
                    </div>
                  </div>
                );
              })}
              {records.length === 0 && (
                <div className="flex flex-col items-center justify-center h-40 text-slate-500">
                   <History size={32} className="mb-2 opacity-50" />
                   <p className="text-sm">No attendance records yet</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right Column: Registered Users & Settings */}
        <div className="space-y-6">
           {/* System Settings Card */}
           <Card>
              <div className="flex items-center space-x-2 mb-4 border-b border-slate-700 pb-2">
                 <Settings size={18} className="text-slate-400" />
                 <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Configuration</h3>
              </div>
              <div className="flex items-center justify-between">
                 <div className="flex items-center space-x-3">
                    <div className="p-2 bg-yellow-500/10 rounded-lg text-yellow-400">
                       <Clock size={20} />
                    </div>
                    <div>
                       <p className="text-sm font-medium text-white">Late Time Threshold</p>
                       <p className="text-xs text-slate-400">Students checking in after this time are marked Late.</p>
                    </div>
                 </div>
                 <input 
                    type="time" 
                    value={lateThreshold} 
                    onChange={(e) => onUpdateThreshold(e.target.value)}
                    className="bg-slate-900 border border-slate-600 rounded-md px-3 py-2 text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none w-32 text-center font-mono"
                 />
              </div>
           </Card>

           {/* Registered Users List */}
           <Card className="flex flex-col h-[400px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                 <Users size={18} className="text-emerald-400" /> Registered Users
              </h3>
              <button onClick={() => onNavigate(AppView.REGISTER)} className="text-xs text-emerald-400 hover:text-emerald-300 font-medium px-2 py-1 rounded hover:bg-emerald-500/10">
                + Add New
              </button>
            </div>
            <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1">
               {users.map(user => (
                 <div key={user.id} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors">
                   <div className="flex items-center space-x-3">
                     <img src={user.image} alt={user.name} className="w-10 h-10 rounded-full object-cover border-2 border-slate-600 bg-slate-800" />
                     <div>
                       <p className="font-medium text-white text-sm">{user.name}</p>
                       <p className="text-[10px] text-slate-400 uppercase tracking-wide">{user.role} • {user.department}</p>
                     </div>
                   </div>
                   <button 
                     onClick={() => onDeleteUser(user.id)} 
                     className="text-slate-500 hover:text-red-400 p-2 hover:bg-slate-700 rounded-lg transition-colors"
                     title="Delete User"
                   >
                     <Trash2 size={16} />
                   </button>
                 </div>
               ))}
               {users.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-slate-500">
                    <Users size={32} className="mb-2 opacity-50" />
                    <p className="text-sm">No users registered</p>
                  </div>
               )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};  