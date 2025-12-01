import React, { useState, useEffect, useCallback } from 'react';
import { AlertCircle, GraduationCap, Menu } from 'lucide-react';
import { recognizeFace } from './services/geminiService';
import { User, AttendanceRecord, AppView, RecognitionResult } from './types';
import { Sidebar } from './components/layout/Sidebar';
import { DashboardView } from './components/views/DashboardView';
import { RegistrationView } from './components/views/RegistrationView';
import { AttendanceView } from './components/views/AttendanceView';
import { HistoryView } from './components/views/HistoryView';

// --- Configuration & Constants ---
const DATA_FOLDER_NAME = 'data'; 
const AUTO_SAVE_INTERVAL = 5 * 60 * 1000; // 5 minutes
const DATABASE_FILENAME = 'database.csv';
const RECORDS_FILENAME = 'attendance_records.csv';

export default function App() {
  // --- Global State ---
  const [view, setViewInternal] = useState<AppView>(AppView.DASHBOARD);
  const [users, setUsers] = useState<User[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Settings
  const [lateThreshold, setLateThreshold] = useState("09:30"); // Default 9:30 AM

  // History View State
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // File System State
  const [dirHandle, setDirHandle] = useState<any>(null); 
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // --- File System & CSV Logic ---

  const generateUserCSV = () => {
    const headers = ["id", "name", "role", "department", "image", "registeredAt"];
    const csvRows = [headers.join(",")];
    users.forEach(u => {
      const safeName = `"${u.name.replace(/"/g, '""')}"`;
      const safeDept = `"${u.department.replace(/"/g, '""')}"`;
      const safeImage = `"${u.image}"`; 
      const row = [u.id, safeName, u.role, safeDept, safeImage, u.registeredAt];
      csvRows.push(row.join(","));
    });
    return csvRows.join("\n");
  };

  const generateRecordsCSV = () => {
    const headers = ["id", "userId", "userName", "role", "timestamp", "status", "confidence"];
    const csvRows = [headers.join(",")];
    records.forEach(r => {
        const safeName = `"${r.userName.replace(/"/g, '""')}"`;
        const row = [r.id, r.userId, safeName, r.role, r.timestamp, r.status, r.confidence];
        csvRows.push(row.join(","));
    });
    return csvRows.join("\n");
  };

  const connectDataFolder = async () => {
    try {
      if (!('showDirectoryPicker' in window)) {
        setMessage({ type: 'error', text: "Your browser doesn't support folder access. Use Chrome or Edge." });
        return;
      }
      
      const handle = await (window as any).showDirectoryPicker({
        id: 'campus-id-data',
        mode: 'readwrite',
        startIn: 'documents'
      });
      
      if (handle.name !== DATA_FOLDER_NAME) {
         if(!confirm(`You selected folder '${handle.name}'. Recommended folder is '${DATA_FOLDER_NAME}'. Continue?`)) {
             return;
         }
      }

      setDirHandle(handle);
      setMessage({ type: 'success', text: `Connected to '${handle.name}'. Auto-load/save enabled.` });
      await autoLoadFromHandle(handle);

    } catch (err) {
      console.error("Error connecting folder:", err);
    }
  };

  const autoLoadFromHandle = async (handle: any) => {
    try {
      try {
        const fileHandle = await handle.getFileHandle(DATABASE_FILENAME);
        const file = await fileHandle.getFile();
        const text = await file.text();
        parseAndLoadUsers(text);
      } catch (e) { console.log("No existing database file found."); }

      try {
        const fileHandle = await handle.getFileHandle(RECORDS_FILENAME);
        const file = await fileHandle.getFile();
        const text = await file.text();
        parseAndLoadRecords(text);
      } catch (e) { console.log("No existing records file found."); }
      
      setHasUnsavedChanges(false);
      setLastSaved(new Date());

    } catch (err) {
      console.error("Auto Load Error", err);
      setMessage({ type: 'error', text: "Failed to auto-load files." });
    }
  };

  const saveToDisk = useCallback(async () => {
    if (!dirHandle) return false;
    try {
      const userCSV = generateUserCSV();
      const userFileHandle = await dirHandle.getFileHandle(DATABASE_FILENAME, { create: true });
      const userWritable = await userFileHandle.createWritable();
      await userWritable.write(userCSV);
      await userWritable.close();

      const recordsCSV = generateRecordsCSV();
      const recFileHandle = await dirHandle.getFileHandle(RECORDS_FILENAME, { create: true });
      const recWritable = await recFileHandle.createWritable();
      await recWritable.write(recordsCSV);
      await recWritable.close();

      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      return true;
    } catch (err) {
      console.error("Auto Save Error", err);
      setMessage({ type: 'error', text: "Auto-save failed." });
      return false;
    }
  }, [dirHandle, users, records]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (hasUnsavedChanges && dirHandle) {
        saveToDisk().then(success => { if (success) console.log("Auto-save successful."); });
      }
    }, AUTO_SAVE_INTERVAL);
    return () => clearInterval(interval);
  }, [hasUnsavedChanges, dirHandle, saveToDisk]);

  const handleSetView = async (newView: AppView) => {
    if ((view === AppView.REGISTER || view === AppView.HISTORY) && hasUnsavedChanges) {
      if (dirHandle) {
        setMessage({ type: 'success', text: "Auto-saving..." });
        await saveToDisk();
        setViewInternal(newView);
      } else {
        if (window.confirm("Unsaved changes. Discard? (Connect Folder in 'Records' to auto-save)")) {
           setViewInternal(newView);
        }
      }
    } else {
      setViewInternal(newView);
    }
  };

  // --- CSV Helpers ---

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const parseAndLoadUsers = (text: string) => {
    const rows = text.split('\n');
    const parseCSVLine = (line: string) => {
        const result = [];
        let startValueIndex = 0;
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            if (line[i] === '"') inQuotes = !inQuotes;
            else if (line[i] === ',' && !inQuotes) {
                let val = line.substring(startValueIndex, i);
                if (val.startsWith('"') && val.endsWith('"')) val = val.substring(1, val.length - 1).replace(/""/g, '"');
                result.push(val);
                startValueIndex = i + 1;
            }
        }
        let val = line.substring(startValueIndex);
        if (val.startsWith('"') && val.endsWith('"')) val = val.substring(1, val.length - 1).replace(/""/g, '"');
        result.push(val);
        return result;
    };
    const newUsers: User[] = [];
    if (!rows[0]?.toLowerCase().includes('image')) throw new Error("Invalid User DB format");

    for (let i = 1; i < rows.length; i++) {
        if (!rows[i].trim()) continue;
        const cols = parseCSVLine(rows[i]);
        if (cols.length >= 6) {
            newUsers.push({
                id: cols[0], name: cols[1], role: cols[2], department: cols[3], image: cols[4], registeredAt: cols[5]
            });
        }
    }
    setUsers(newUsers);
  };

  const parseAndLoadRecords = (text: string) => {
    const rows = text.split('\n');
    const newRecords: AttendanceRecord[] = [];
    for (let i = 1; i < rows.length; i++) {
        if (!rows[i].trim()) continue;
        const cols = rows[i].split(',');
        if (cols.length >= 7) {
            let name = cols[2];
            if (name.startsWith('"')) name = name.replace(/"/g, '');
            newRecords.push({
                id: cols[0], userId: cols[1], userName: name, role: cols[3], timestamp: cols[4], status: cols[5] as 'Present' | 'Late', confidence: Number(cols[6])
            });
        }
    }
    setRecords(newRecords);
  };

  // --- Handlers ---

  const handleRegister = async (name: string, role: string, dept: string, image: string): Promise<boolean> => {
    setLoading(true);
    setMessage(null);
    try {
      if (users.length > 0) {
        const result = await recognizeFace(image, users);
        if (result.matches && result.matches.length > 0) {
          const match = result.matches[0];
          // Strict duplicate check with 85% confidence threshold
          if (match.confidence > 0.85) {
             const matchUser = users.find(u => u.id === match.userId);
             if (matchUser) {
                setMessage({ type: 'error', text: `Registration Blocked: Face already matches ${matchUser.name} (${Math.round(match.confidence * 100)}% match).` });
                setLoading(false);
                return false;
             }
          }
        }
      }
      const newUser: User = {
        id: crypto.randomUUID(),
        name, role, department: dept,
        image, registeredAt: new Date().toISOString()
      };
      setUsers(prev => [...prev, newUser]);
      setHasUnsavedChanges(true);
      setMessage({ type: 'success', text: `Successfully registered ${newUser.name}.` });
      return true;
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: "Verification failed due to an error." });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleAttendance = async (image: string) => {
    setLoading(true);
    setMessage(null);
    try {
      const result: RecognitionResult = await recognizeFace(image, users);
      
      // Filter matches with high confidence
      const validMatches = (result.matches || []).filter(m => m.confidence > 0.85);
      
      if (validMatches.length > 0) {
        const todayStr = new Date().toDateString();
        const now = new Date();
        
        // Calculate Late Status based on Config
        const [thHours, thMinutes] = lateThreshold.split(':').map(Number);
        const thresholdDate = new Date(now);
        thresholdDate.setHours(thHours, thMinutes, 0, 0);
        const isLate = now > thresholdDate;
        
        let newCount = 0;
        let alreadyCount = 0;
        const newRecordsList: AttendanceRecord[] = [];

        validMatches.forEach(match => {
          const user = users.find(u => u.id === match.userId);
          if (user) {
             const alreadyCheckedIn = records.some(r => r.userId === user.id && new Date(r.timestamp).toDateString() === todayStr);
              if (!alreadyCheckedIn) {
                 newRecordsList.push({
                   id: crypto.randomUUID(), userId: user.id, userName: user.name, role: user.role, timestamp: now.toISOString(), status: isLate ? 'Late' : 'Present', confidence: match.confidence
                 });
                 newCount++;
              } else {
                alreadyCount++;
              }
          }
        });

        if (newCount > 0) {
          setRecords(prev => [...newRecordsList, ...prev]);
          setHasUnsavedChanges(true);
          const names = newRecordsList.map(r => r.userName).join(', ');
          let msg = `✅ Present: ${names}.`;
          if (alreadyCount > 0) msg += ` (Skipped ${alreadyCount} already marked)`;
          setMessage({ type: 'success', text: msg });
        } else if (alreadyCount > 0) {
          setMessage({ type: 'success', text: `⚠️ All identified students (${alreadyCount}) are already marked Present for today.` });
        }
      } else {
        // Handle cases with no valid matches
        if (result.matches && result.matches.length > 0) {
           setMessage({ type: 'error', text: '⚠️ Low confidence match. Please try closer to the camera or improve lighting.' });
        } else {
           setMessage({ type: 'error', text: '❌ No registered faces detected. Please ensure students are registered.' });
        }
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Recognition error. Please check your API key.' });
    } finally {
      setLoading(false);
    }
  };

  // --- Handlers for History View ---
  const handleUpdateStatus = (userId: string, newStatus: string) => {
    const todayStr = new Date(selectedDate).toDateString();
    setHasUnsavedChanges(true);
    if (newStatus === 'Absent') {
      setRecords(prev => prev.filter(r => !(r.userId === userId && new Date(r.timestamp).toDateString() === todayStr)));
    } else {
      const user = users.find(u => u.id === userId);
      if (!user) return;
      const existingRecord = records.find(r => r.userId === userId && new Date(r.timestamp).toDateString() === todayStr);
      if (existingRecord) {
        setRecords(prev => prev.map(r => r.id === existingRecord.id ? { ...r, status: newStatus as 'Present' | 'Late' } : r));
      } else {
        const recordDate = new Date(selectedDate);
        recordDate.setHours(9, 0, 0); // Default set time for manual entry
        setRecords(prev => [...prev, {
           id: crypto.randomUUID(), userId: user.id, userName: user.name, role: user.role, timestamp: recordDate.toISOString(), status: newStatus as 'Present' | 'Late', confidence: 1.0 
        }]);
      }
    }
  };

  const handleImportDatabase = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        try { parseAndLoadUsers(event.target?.result as string); setMessage({ type: 'success', text: `Database restored.` }); setHasUnsavedChanges(true); } catch (err) { setMessage({ type: 'error', text: "Failed to parse file." }); }
    };
    reader.readAsText(file);
  };

  const handleImportRecords = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        try { parseAndLoadRecords(event.target?.result as string); setMessage({ type: 'success', text: `History restored.` }); setHasUnsavedChanges(true); } catch (err) { setMessage({ type: 'error', text: "Failed to parse file." }); }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex text-slate-100 font-sans selection:bg-blue-500/30">
      <Sidebar 
        currentView={view} 
        onViewChange={handleSetView}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <main className="flex-1 md:ml-64 p-6 lg:p-8 overflow-y-auto">
        <div className="md:hidden flex items-center justify-between mb-6">
           <div className="flex items-center space-x-2">
             <GraduationCap className="text-blue-500" />
             <h1 className="text-xl font-bold">CampusID</h1>
           </div>
           <button 
             onClick={() => setIsSidebarOpen(true)}
             className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
           >
             <Menu size={24} />
           </button>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-center space-x-3 ${message.type === 'success' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
            <AlertCircle size={20} className="shrink-0" /><span>{message.text}</span>
          </div>
        )}

        {view === AppView.DASHBOARD && (
          <DashboardView 
            users={users} 
            records={records} 
            onNavigate={handleSetView} 
            onDeleteUser={(id) => {
               if(confirm('Delete user?')) { setUsers(u => u.filter(x => x.id !== id)); setHasUnsavedChanges(true); }
            }}
            lateThreshold={lateThreshold}
            onUpdateThreshold={setLateThreshold}
          />
        )}

        {view === AppView.REGISTER && (
          <RegistrationView 
            onRegister={handleRegister}
            isLoading={loading}
          />
        )}

        {view === AppView.ATTENDANCE && (
          <AttendanceView 
            onProcess={handleAttendance}
            isLoading={loading}
          />
        )}

        {view === AppView.HISTORY && (
          <HistoryView 
            users={users} 
            records={records}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            onUpdateStatus={handleUpdateStatus}
            dirHandle={dirHandle}
            lastSaved={lastSaved}
            onConnectFolder={connectDataFolder}
            onBackupDB={() => {
               if (users.length === 0) setMessage({ type: 'error', text: 'Database is empty.' });
               else downloadCSV(generateUserCSV(), `campus_users_backup_${new Date().toISOString().slice(0,10)}.csv`);
            }}
            onLoadDB={handleImportDatabase}
            onBackupRecords={() => {
               if (records.length === 0) setMessage({ type: 'error', text: 'No records.' });
               else downloadCSV(generateRecordsCSV(), `campus_attendance_backup_${new Date().toISOString().slice(0,10)}.csv`);
            }}
            onLoadRecords={handleImportRecords}
            onExportList={() => {
                if (users.length === 0) setMessage({ type: 'error', text: 'No users.' });
                else {
                  const rows = ["Name,Role,Department", ...users.map(u => `"${u.name}",${u.role},"${u.department}"`)];
                  downloadCSV(rows.join("\n"), `student_list.csv`);
                }
            }}
            onExportReport={() => {
                 if (records.length === 0) setMessage({ type: 'error', text: 'No records.' });
                 else {
                   const rows = ["Name,Role,Dept,Date,Time,Status", ...records.map(r => {
                      const u = users.find(x => x.id === r.userId);
                      return `"${r.userName}",${r.role},"${u?.department || ''}",${new Date(r.timestamp).toLocaleDateString()},${new Date(r.timestamp).toLocaleTimeString()},${r.status}`;
                   })];
                   downloadCSV(rows.join("\n"), `report.csv`);
                 }
            }}
            onNavigate={handleSetView}
          />
        )}
      </main>
    </div>
  );
}