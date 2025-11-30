import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Camera,
  Users,
  History,
  LayoutDashboard,
  CheckCircle,
  UserPlus,
  AlertCircle,
  Loader2,
  Trash2,
  RefreshCw,
  Search,
  Download,
  GraduationCap,
  Upload,
  Image as ImageIcon,
  ZoomIn,
  Focus,
  Save,
  FileUp,
  FileText,
  Calendar,
  Edit3,
  Database,
  FolderOpen,
  HardDrive,
} from "lucide-react";
import { recognizeFace } from "./services/geminiService";
import { User, AttendanceRecord, AppView, RecognitionResult } from "./types";

// --- Configuration & Constants ---

const DATA_FOLDER_NAME = "data"; // Location for auto load/save
const AUTO_SAVE_INTERVAL = 5 * 60 * 1000; // 5 minutes
const DATABASE_FILENAME = "database.csv";
const RECORDS_FILENAME = "attendance_records.csv";

// Helper to convert an image URL to base64 for the sample data
const getBase64FromUrl = async (url: string): Promise<string> => {
  try {
    const data = await fetch(url);
    const blob = await data.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
    });
  } catch (e) {
    console.error("Error loading sample image", e);
    return "";
  }
};

// --- Helper Components ---

const Button: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary" | "danger" | "success";
  }
> = ({ children, variant = "primary", className = "", ...props }) => {
  const baseStyles =
    "flex items-center justify-center px-4 py-2 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary:
      "bg-blue-600 hover:bg-blue-500 text-white focus:ring-blue-500 shadow-lg shadow-blue-500/20",
    secondary:
      "bg-slate-700 hover:bg-slate-600 text-white focus:ring-slate-500 border border-slate-600",
    danger: "bg-red-600 hover:bg-red-500 text-white focus:ring-red-500",
    success:
      "bg-emerald-600 hover:bg-emerald-500 text-white focus:ring-emerald-500 shadow-lg shadow-emerald-500/20",
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = "",
}) => (
  <div
    className={`bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 ${className}`}
  >
    {children}
  </div>
);

const Badge: React.FC<{ status: "Present" | "Late" | "Absent" }> = ({
  status,
}) => {
  const colors = {
    Present: "bg-green-500/10 text-green-400 border-green-500/20",
    Late: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    Absent: "bg-red-500/10 text-red-400 border-red-500/20",
  };
  return (
    <span
      className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors[status]}`}
    >
      {status}
    </span>
  );
};

// --- Main App ---

export default function App() {
  // State
  const [view, setViewInternal] = useState<AppView>(AppView.DASHBOARD);
  const [users, setUsers] = useState<User[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // History View State
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );

  // Registration & Image State
  const [regName, setRegName] = useState("");
  const [regRole, setRegRole] = useState("Student");
  const [regDept, setRegDept] = useState("");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  // Camera Capabilities
  const [zoomCap, setZoomCap] = useState<{
    min: number;
    max: number;
    step: number;
  } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [focusCap, setFocusCap] = useState<{
    min: number;
    max: number;
    step: number;
  } | null>(null);
  const [focus, setFocus] = useState(0);

  // File System State
  const [dirHandle, setDirHandle] = useState<any>(null); // FileSystemDirectoryHandle
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dbInputRef = useRef<HTMLInputElement>(null);
  const recordsInputRef = useRef<HTMLInputElement>(null);

  // Load Sample Data on Mount
  useEffect(() => {
    const initData = async () => {
      console.log("Initializing sample data (In-Memory)...");
      try {
        const processedUsers: User[] = [];
        for (const u of SAMPLE_USERS) {
          const b64 = await getBase64FromUrl(u.image);
          if (b64) processedUsers.push({ ...u, image: b64 });
        }
        setUsers(processedUsers);
      } catch (e) {
        console.error("Failed to load sample data", e);
      }
    };
    initData();
  }, []);

  // --- File System Access API & Auto Save ---

  const generateUserCSV = () => {
    const headers = [
      "id",
      "name",
      "role",
      "department",
      "image",
      "registeredAt",
    ];
    const csvRows = [headers.join(",")];
    users.forEach((u) => {
      const safeName = `"${u.name.replace(/"/g, '""')}"`;
      const safeDept = `"${u.department.replace(/"/g, '""')}"`;
      const safeImage = `"${u.image}"`;
      const row = [u.id, safeName, u.role, safeDept, safeImage, u.registeredAt];
      csvRows.push(row.join(","));
    });
    return csvRows.join("\n");
  };

  const generateRecordsCSV = () => {
    const headers = [
      "id",
      "userId",
      "userName",
      "role",
      "timestamp",
      "status",
      "confidence",
    ];
    const csvRows = [headers.join(",")];
    records.forEach((r) => {
      const safeName = `"${r.userName.replace(/"/g, '""')}"`;
      const row = [
        r.id,
        r.userId,
        safeName,
        r.role,
        r.timestamp,
        r.status,
        r.confidence,
      ];
      csvRows.push(row.join(","));
    });
    return csvRows.join("\n");
  };

  const connectDataFolder = async () => {
    try {
      if (!("showDirectoryPicker" in window)) {
        setMessage({
          type: "error",
          text: "Your browser doesn't support folder access. Use Chrome or Edge.",
        });
        return;
      }

      const handle = await (window as any).showDirectoryPicker({
        id: "campus-id-data",
        mode: "readwrite",
        startIn: "documents",
      });

      if (handle.name !== DATA_FOLDER_NAME) {
        if (
          !confirm(
            `You selected folder '${handle.name}'. Recommended folder is '${DATA_FOLDER_NAME}'. Continue?`
          )
        ) {
          return;
        }
      }

      setDirHandle(handle);
      setMessage({
        type: "success",
        text: `Connected to '${handle.name}'. Auto-load/save enabled.`,
      });

      // Auto Load if files exist
      await autoLoadFromHandle(handle);
    } catch (err) {
      console.error("Error connecting folder:", err);
      // User cancelled or error
    }
  };

  const autoLoadFromHandle = async (handle: any) => {
    try {
      // Try load Users
      try {
        const fileHandle = await handle.getFileHandle(DATABASE_FILENAME);
        const file = await fileHandle.getFile();
        const text = await file.text();
        parseAndLoadUsers(text);
      } catch (e) {
        console.log("No existing database file found in folder.");
      }

      // Try load Records
      try {
        const fileHandle = await handle.getFileHandle(RECORDS_FILENAME);
        const file = await fileHandle.getFile();
        const text = await file.text();
        parseAndLoadRecords(text);
      } catch (e) {
        console.log("No existing records file found in folder.");
      }

      setHasUnsavedChanges(false);
      setLastSaved(new Date());
    } catch (err) {
      console.error("Auto Load Error", err);
      setMessage({
        type: "error",
        text: "Failed to auto-load files from folder.",
      });
    }
  };

  const saveToDisk = useCallback(async () => {
    if (!dirHandle) return false;

    try {
      // Save Users
      const userCSV = generateUserCSV();
      const userFileHandle = await dirHandle.getFileHandle(DATABASE_FILENAME, {
        create: true,
      });
      const userWritable = await userFileHandle.createWritable();
      await userWritable.write(userCSV);
      await userWritable.close();

      // Save Records
      const recordsCSV = generateRecordsCSV();
      const recFileHandle = await dirHandle.getFileHandle(RECORDS_FILENAME, {
        create: true,
      });
      const recWritable = await recFileHandle.createWritable();
      await recWritable.write(recordsCSV);
      await recWritable.close();

      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      return true;
    } catch (err) {
      console.error("Auto Save Error", err);
      setMessage({
        type: "error",
        text: "Auto-save failed. Check folder permissions.",
      });
      return false;
    }
  }, [dirHandle, users, records]);

  // Auto Save Timer
  useEffect(() => {
    const interval = setInterval(() => {
      if (hasUnsavedChanges && dirHandle) {
        saveToDisk().then((success) => {
          if (success) console.log("Auto-save triggered successfully.");
        });
      }
    }, AUTO_SAVE_INTERVAL);
    return () => clearInterval(interval);
  }, [hasUnsavedChanges, dirHandle, saveToDisk]);

  // View Navigation Guard
  const handleSetView = async (newView: AppView) => {
    // If leaving a data-entry view
    if (
      (view === AppView.REGISTER || view === AppView.HISTORY) &&
      hasUnsavedChanges
    ) {
      if (dirHandle) {
        // Connected? Save and go
        setMessage({
          type: "success",
          text: "Auto-saving before navigation...",
        });
        await saveToDisk();
        setViewInternal(newView);
      } else {
        // Not connected? Prompt
        if (
          window.confirm(
            "You have unsaved changes. Discard them? (Connect a Data Folder in 'Records' to enable auto-save)"
          )
        ) {
          setViewInternal(newView);
        }
      }
    } else {
      setViewInternal(newView);
    }
  };

  // --- Camera Logic ---
  const startCamera = async () => {
    if (capturedImage) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        // ... (Capability logic same as before) ...
        const track = stream.getVideoTracks()[0];
        const capabilities = (track as any).getCapabilities
          ? (track as any).getCapabilities()
          : {};
        const settings = track.getSettings();
        if ("zoom" in capabilities) {
          setZoomCap({
            min: capabilities.zoom.min,
            max: capabilities.zoom.max,
            step: capabilities.zoom.step,
          });
          setZoom((settings as any).zoom || capabilities.zoom.min);
        }
        if ("focusDistance" in capabilities) {
          setFocusCap({
            min: capabilities.focusDistance.min,
            max: capabilities.focusDistance.max,
            step: capabilities.focusDistance.step,
          });
          setFocus(
            (settings as any).focusDistance || capabilities.focusDistance.min
          );
        }
      }
    } catch (err) {
      console.error("Camera Error:", err);
      try {
        if (!capturedImage) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
          });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            streamRef.current = stream;
          }
        }
      } catch (e) {
        if (!capturedImage)
          setMessage({
            type: "error",
            text: "Could not access camera. Please upload a photo.",
          });
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    if (
      (view === AppView.REGISTER || view === AppView.ATTENDANCE) &&
      !capturedImage
    ) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [view, capturedImage]);

  const handleZoomChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setZoom(val);
    const track = streamRef.current?.getVideoTracks()[0];
    if (track)
      try {
        await (track as any).applyConstraints({ advanced: [{ zoom: val }] });
      } catch (err) {
        console.error(err);
      }
  };

  const handleFocusChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setFocus(val);
    const track = streamRef.current?.getVideoTracks()[0];
    if (track)
      try {
        await (track as any).applyConstraints({
          advanced: [{ focusMode: "manual", focusDistance: val }],
        });
      } catch (err) {
        console.error(err);
      }
  };

  const captureFrame = (): string | null => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext("2d");
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        return canvasRef.current.toDataURL("image/jpeg", 0.8);
      }
    }
    return null;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCapturedImage(reader.result as string);
        stopCamera();
      };
      reader.readAsDataURL(file);
    }
  };

  const retake = () => {
    setCapturedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // --- Core Logic ---

  const handleRegister = async () => {
    if (!regName || !regRole || !regDept || !capturedImage) {
      setMessage({ type: "error", text: "All fields and photo are required." });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      if (users.length > 0) {
        const result = await recognizeFace(capturedImage, users);
        if (result.matches && result.matches.length > 0) {
          const match = result.matches[0];
          if (match.confidence > 0.85) {
            const matchUser = users.find((u) => u.id === match.userId);
            if (matchUser) {
              setMessage({
                type: "error",
                text: `Face matches existing user: ${matchUser.name} (${(
                  match.confidence * 100
                ).toFixed(0)}% match).`,
              });
              setLoading(false);
              return;
            }
          }
        }
      }

      const newUser: User = {
        id: crypto.randomUUID(),
        name: regName,
        role: regRole,
        department: regDept,
        image: capturedImage,
        registeredAt: new Date().toISOString(),
      };

      setUsers((prev) => [...prev, newUser]);
      setHasUnsavedChanges(true); // Mark dirty
      setRegName("");
      setRegRole("Student");
      setRegDept("");
      setCapturedImage(null);
      setMessage({ type: "success", text: `Registered ${newUser.name}.` });
    } catch (error) {
      console.error(error);
      setMessage({ type: "error", text: "Verification failed." });
    } finally {
      setLoading(false);
    }
  };

  const handleAttendance = async () => {
    let frame = capturedImage || captureFrame();
    if (!frame) {
      setMessage({ type: "error", text: "No image provided." });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const result: RecognitionResult = await recognizeFace(frame, users);

      if (result.matches && result.matches.length > 0) {
        const todayStr = new Date().toDateString();
        const now = new Date();
        const isLate =
          now.getHours() > 9 || (now.getHours() === 9 && now.getMinutes() > 30);

        let newCount = 0;
        let alreadyCount = 0;
        const newRecordsList: AttendanceRecord[] = [];
        const validMatches = result.matches.filter((m) => m.confidence > 0.85);

        validMatches.forEach((match) => {
          const user = users.find((u) => u.id === match.userId);
          if (user) {
            const alreadyCheckedIn = records.some(
              (r) =>
                r.userId === user.id &&
                new Date(r.timestamp).toDateString() === todayStr
            );
            if (!alreadyCheckedIn) {
              newRecordsList.push({
                id: crypto.randomUUID(),
                userId: user.id,
                userName: user.name,
                role: user.role,
                timestamp: now.toISOString(),
                status: isLate ? "Late" : "Present",
                confidence: match.confidence,
              });
              newCount++;
            } else {
              alreadyCount++;
            }
          }
        });

        if (newCount > 0) {
          setRecords((prev) => [...newRecordsList, ...prev]);
          setHasUnsavedChanges(true); // Mark dirty
          const names = newRecordsList.map((r) => r.userName).join(", ");
          setMessage({ type: "success", text: `Marked present: ${names}` });
        } else if (alreadyCount > 0) {
          setMessage({
            type: "success",
            text: `Already present: ${alreadyCount} student(s).`,
          });
        } else {
          setMessage({
            type: "error",
            text: "Faces detected but low confidence match.",
          });
        }
      } else {
        setMessage({ type: "error", text: "No registered users found." });
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "Recognition error." });
    } finally {
      setLoading(false);
    }
  };

  const updateAttendanceStatus = (userId: string, newStatus: string) => {
    const todayStr = new Date(selectedDate).toDateString();
    setHasUnsavedChanges(true); // Mark dirty

    if (newStatus === "Absent") {
      setRecords((prev) =>
        prev.filter(
          (r) =>
            !(
              r.userId === userId &&
              new Date(r.timestamp).toDateString() === todayStr
            )
        )
      );
    } else {
      const user = users.find((u) => u.id === userId);
      if (!user) return;
      const existingRecord = records.find(
        (r) =>
          r.userId === userId &&
          new Date(r.timestamp).toDateString() === todayStr
      );
      if (existingRecord) {
        setRecords((prev) =>
          prev.map((r) =>
            r.id === existingRecord.id
              ? { ...r, status: newStatus as "Present" | "Late" }
              : r
          )
        );
      } else {
        const recordDate = new Date(selectedDate);
        recordDate.setHours(9, 0, 0);
        const newRecord: AttendanceRecord = {
          id: crypto.randomUUID(),
          userId: user.id,
          userName: user.name,
          role: user.role,
          timestamp: recordDate.toISOString(),
          status: newStatus as "Present" | "Late",
          confidence: 1.0,
        };
        setRecords((prev) => [...prev, newRecord]);
      }
    }
  };

  const deleteUser = (id: string) => {
    if (window.confirm("Delete this user?")) {
      setUsers(users.filter((u) => u.id !== id));
      setHasUnsavedChanges(true);
    }
  };

  // --- Import / Export / CSV Logic ---

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const backupDatabase = () => {
    if (users.length === 0) {
      setMessage({ type: "error", text: "Database is empty." });
      return;
    }
    downloadCSV(
      generateUserCSV(),
      `campus_users_backup_${new Date().toISOString().slice(0, 10)}.csv`
    );
  };

  const backupRecords = () => {
    if (records.length === 0) {
      setMessage({ type: "error", text: "No attendance records." });
      return;
    }
    downloadCSV(
      generateRecordsCSV(),
      `campus_attendance_backup_${new Date().toISOString().slice(0, 10)}.csv`
    );
  };

  const exportUserList = () => {
    if (users.length === 0) {
      setMessage({ type: "error", text: "No users to export." });
      return;
    }
    const headers = ["Name", "Role", "Department"];
    const csvRows = [headers.join(",")];
    users.forEach((u) => {
      const safeName = `"${u.name.replace(/"/g, '""')}"`;
      const safeDept = `"${u.department.replace(/"/g, '""')}"`;
      const row = [safeName, u.role, safeDept];
      csvRows.push(row.join(","));
    });
    downloadCSV(
      csvRows.join("\n"),
      `student_list_${new Date().toISOString().slice(0, 10)}.csv`
    );
  };

  const exportAttendance = () => {
    if (records.length === 0) {
      setMessage({ type: "error", text: "No records to export." });
      return;
    }
    const headers = ["Name", "Role", "Department", "Date", "Time", "Status"];
    const csvRows = [headers.join(",")];
    records.forEach((r) => {
      const user = users.find((u) => u.id === r.userId);
      const dept = user ? user.department : "Unknown";
      const d = new Date(r.timestamp);
      const row = [
        `"${r.userName}"`,
        r.role,
        `"${dept}"`,
        d.toLocaleDateString(),
        d.toLocaleTimeString(),
        r.status,
      ];
      csvRows.push(row.join(","));
    });
    downloadCSV(
      csvRows.join("\n"),
      `attendance_report_${new Date().toISOString().slice(0, 10)}.csv`
    );
  };

  const parseAndLoadUsers = (text: string) => {
    const rows = text.split("\n");
    const parseCSVLine = (line: string) => {
      const result = [];
      let startValueIndex = 0;
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        if (line[i] === '"') inQuotes = !inQuotes;
        else if (line[i] === "," && !inQuotes) {
          let val = line.substring(startValueIndex, i);
          if (val.startsWith('"') && val.endsWith('"'))
            val = val.substring(1, val.length - 1).replace(/""/g, '"');
          result.push(val);
          startValueIndex = i + 1;
        }
      }
      let val = line.substring(startValueIndex);
      if (val.startsWith('"') && val.endsWith('"'))
        val = val.substring(1, val.length - 1).replace(/""/g, '"');
      result.push(val);
      return result;
    };
    const newUsers: User[] = [];
    const firstLine = rows[0].toLowerCase();
    if (!firstLine.includes("image")) throw new Error("Invalid User DB format");

    for (let i = 1; i < rows.length; i++) {
      if (!rows[i].trim()) continue;
      const cols = parseCSVLine(rows[i]);
      if (cols.length >= 6) {
        newUsers.push({
          id: cols[0],
          name: cols[1],
          role: cols[2],
          department: cols[3],
          image: cols[4],
          registeredAt: cols[5],
        });
      }
    }
    setUsers(newUsers);
  };

  const parseAndLoadRecords = (text: string) => {
    const rows = text.split("\n");
    const newRecords: AttendanceRecord[] = [];
    for (let i = 1; i < rows.length; i++) {
      if (!rows[i].trim()) continue;
      const cols = rows[i].split(",");
      if (cols.length >= 7) {
        let name = cols[2];
        if (name.startsWith('"')) name = name.replace(/"/g, "");
        newRecords.push({
          id: cols[0],
          userId: cols[1],
          userName: name,
          role: cols[3],
          timestamp: cols[4],
          status: cols[5] as "Present" | "Late",
          confidence: Number(cols[6]),
        });
      }
    }
    setRecords(newRecords);
  };

  const handleImportDatabase = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        parseAndLoadUsers(event.target?.result as string);
        setMessage({ type: "success", text: `Database manually restored.` });
        setHasUnsavedChanges(true); // Treat import as a change to be saved to "connected" folder
      } catch (err) {
        console.error(err);
        setMessage({ type: "error", text: "Failed to parse file." });
      }
    };
    reader.readAsText(file);
  };

  const handleImportRecords = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        parseAndLoadRecords(event.target?.result as string);
        setMessage({ type: "success", text: `History manually restored.` });
        setHasUnsavedChanges(true);
      } catch (err) {
        console.error(err);
        setMessage({ type: "error", text: "Failed to parse file." });
      }
    };
    reader.readAsText(file);
  };

  // --- Views ---

  const renderDashboard = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-blue-900/40 to-slate-800/40 border-blue-500/20">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-500/20 rounded-lg text-blue-400">
              <Users size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-400">Total Registered</p>
              <h3 className="text-2xl font-bold text-white">{users.length}</h3>
            </div>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-900/40 to-slate-800/40 border-emerald-500/20">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-emerald-500/20 rounded-lg text-emerald-400">
              <CheckCircle size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-400">Present Today</p>
              <h3 className="text-2xl font-bold text-white">
                {
                  records.filter(
                    (r) =>
                      new Date(r.timestamp).toDateString() ===
                      new Date().toDateString()
                  ).length
                }
              </h3>
            </div>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-purple-900/40 to-slate-800/40 border-purple-500/20">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-purple-500/20 rounded-lg text-purple-400">
              <History size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-400">Total Logs</p>
              <h3 className="text-2xl font-bold text-white">
                {records.length}
              </h3>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="h-full">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">
              Recent Attendance
            </h3>
            <button
              onClick={() => handleSetView(AppView.HISTORY)}
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              View All
            </button>
          </div>
          <div className="space-y-4">
            {records.slice(0, 5).map((record) => (
              <div
                key={record.id}
                className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-xs font-bold text-white">
                    {record.userName.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-white">{record.userName}</p>
                    <p className="text-xs text-slate-400">{record.role}</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge status={record.status} />
                  <p className="text-xs text-slate-500 mt-1">
                    {new Date(record.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))}
            {records.length === 0 && (
              <p className="text-slate-500 text-center py-4">
                No recent activity
              </p>
            )}
          </div>
        </Card>

        <Card className="h-full">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">
              Registered Users
            </h3>
            <button
              onClick={() => handleSetView(AppView.REGISTER)}
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              Add New
            </button>
          </div>
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg border border-slate-700 hover:border-slate-600"
              >
                <div className="flex items-center space-x-3">
                  <img
                    src={user.image}
                    alt={user.name}
                    className="w-10 h-10 rounded-full object-cover border-2 border-slate-600 bg-slate-800"
                  />
                  <div>
                    <p className="font-medium text-white">{user.name}</p>
                    <p className="text-xs text-slate-400">
                      {user.role} • {user.department}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => deleteUser(user.id)}
                  className="text-slate-400 hover:text-red-400 p-2"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            {users.length === 0 && (
              <p className="text-slate-500 text-center py-4">
                No users registered
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );

  const renderCameraView = (isRegistration: boolean) => (
    <div className="flex flex-col items-center justify-center h-full space-y-6 max-w-4xl mx-auto">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/*"
        className="hidden"
      />

      <Card className="w-full relative overflow-hidden p-2 bg-slate-900 border-slate-700">
        <div className="relative aspect-video rounded-lg overflow-hidden bg-black">
          {capturedImage ? (
            <img
              src={capturedImage}
              alt="Captured"
              className="w-full h-full object-contain bg-slate-950"
            />
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform scale-x-[-1]"
            />
          )}
          <canvas ref={canvasRef} className="hidden" />

          {!capturedImage && (
            <div className="absolute inset-0 border-2 border-white/20 m-12 rounded-lg pointer-events-none flex items-center justify-center">
              <div
                className={`border-2 border-blue-500/50 rounded-lg animate-pulse ${
                  isRegistration ? "w-64 h-64 rounded-full" : "w-[90%] h-[80%]"
                }`}
              ></div>
              <p className="absolute bottom-4 text-white/50 text-sm shadow-black drop-shadow-md">
                {isRegistration
                  ? "Align face within frame"
                  : "Capture whole class or single student"}
              </p>
            </div>
          )}

          {loading && (
            <div className="absolute inset-0 bg-slate-900/80 flex flex-col items-center justify-center z-10 backdrop-blur-sm">
              <Loader2 size={48} className="text-blue-500 animate-spin mb-4" />
              <p className="text-white font-medium animate-pulse">
                {isRegistration ? "Verifying..." : "Scanning Class..."}
              </p>
            </div>
          )}
        </div>

        {!capturedImage && (zoomCap || focusCap) && (
          <div className="flex items-center space-x-4 p-2 bg-slate-800/50 mt-1 rounded-b-lg">
            {zoomCap && (
              <div className="flex items-center space-x-2 flex-1">
                <ZoomIn size={16} className="text-slate-400" />
                <input
                  type="range"
                  min={zoomCap.min}
                  max={zoomCap.max}
                  step={zoomCap.step}
                  value={zoom}
                  onChange={handleZoomChange}
                  className="w-full h-1 bg-slate-600 rounded-lg cursor-pointer"
                />
              </div>
            )}
            {focusCap && (
              <div className="flex items-center space-x-2 flex-1">
                <Focus size={16} className="text-slate-400" />
                <input
                  type="range"
                  min={focusCap.min}
                  max={focusCap.max}
                  step={focusCap.step}
                  value={focus}
                  onChange={handleFocusChange}
                  className="w-full h-1 bg-slate-600 rounded-lg cursor-pointer"
                />
              </div>
            )}
          </div>
        )}
      </Card>

      <div className="w-full max-w-xl space-y-4">
        {message && (
          <div
            className={`p-4 rounded-lg flex items-center space-x-3 ${
              message.type === "success"
                ? "bg-green-500/20 text-green-300"
                : "bg-red-500/20 text-red-300"
            }`}
          >
            <AlertCircle size={20} />
            <span>{message.text}</span>
          </div>
        )}

        {isRegistration ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">
                  Full Name
                </label>
                <input
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">
                  Role
                </label>
                <select
                  value={regRole}
                  onChange={(e) => setRegRole(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="Student">Student</option>
                  <option value="Professor">Professor</option>
                  <option value="Staff">Staff</option>
                </select>
              </div>
              <div className="space-y-2 col-span-2">
                <label className="text-sm font-medium text-slate-300">
                  Department
                </label>
                <input
                  type="text"
                  value={regDept}
                  onChange={(e) => setRegDept(e.target.value)}
                  placeholder="e.g. Computer Science"
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <div className="flex space-x-3">
              {!capturedImage ? (
                <>
                  <Button
                    onClick={() => setCapturedImage(captureFrame())}
                    className="flex-1 py-3"
                    disabled={loading}
                  >
                    <Camera className="mr-2" size={20} /> Capture
                  </Button>
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="secondary"
                    className="flex-1 py-3"
                    disabled={loading}
                  >
                    <Upload className="mr-2" size={20} /> Upload
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    onClick={retake}
                    variant="secondary"
                    className="flex-1 py-3"
                    disabled={loading}
                  >
                    <RefreshCw className="mr-2" size={20} /> Retake
                  </Button>
                  <Button
                    onClick={handleRegister}
                    className="flex-1 py-3"
                    disabled={!regName || !regRole || !regDept || loading}
                  >
                    <UserPlus className="mr-2" size={20} /> Register User
                  </Button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex space-x-3">
              {!capturedImage ? (
                <>
                  <Button
                    onClick={handleAttendance}
                    className="flex-1 py-4 text-lg bg-emerald-600 hover:bg-emerald-500"
                    disabled={loading}
                  >
                    <Camera className="mr-2" /> Live Group Scan
                  </Button>
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="secondary"
                    className="flex-1 py-4 text-lg"
                    disabled={loading}
                  >
                    <ImageIcon className="mr-2" /> Upload Group Photo
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    onClick={retake}
                    variant="secondary"
                    className="flex-1 py-4"
                    disabled={loading}
                  >
                    <RefreshCw className="mr-2" /> Clear
                  </Button>
                  <Button
                    onClick={handleAttendance}
                    className="flex-[2] py-4 text-lg bg-blue-600 hover:bg-blue-500"
                    disabled={loading}
                  >
                    <Users className="mr-2" /> Process Attendance
                  </Button>
                </>
              )}
            </div>
            <p className="text-center text-slate-500 text-sm">
              {capturedImage
                ? "Click 'Process' to identify students."
                : "Scan the whole class or upload a group photo."}
            </p>
          </div>
        )}
      </div>
    </div>
  );

  const renderHistory = () => {
    // Generate Daily Report for selectedDate
    const dailyReport = users.map((user) => {
      const record = records.find(
        (r) =>
          r.userId === user.id &&
          new Date(r.timestamp).toDateString() ===
            new Date(selectedDate).toDateString()
      );
      return {
        ...user,
        status: record ? record.status : "Absent",
        time: record
          ? new Date(record.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "--:--",
        recordId: record ? record.id : null,
      };
    });

    return (
      <div className="space-y-6">
        {/* Hidden input for DB import */}
        <input
          type="file"
          ref={dbInputRef}
          onChange={handleImportDatabase}
          accept=".csv"
          className="hidden"
        />
        <input
          type="file"
          ref={recordsInputRef}
          onChange={handleImportRecords}
          accept=".csv"
          className="hidden"
        />

        {/* --- Data Storage Connection Banner --- */}
        <div
          className={`p-4 rounded-xl border flex items-center justify-between ${
            dirHandle
              ? "bg-emerald-500/10 border-emerald-500/20"
              : "bg-slate-800 border-slate-700"
          }`}
        >
          <div className="flex items-center space-x-3">
            <div
              className={`p-2 rounded-lg ${
                dirHandle
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "bg-slate-700 text-slate-400"
              }`}
            >
              <HardDrive size={20} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">
                Data Storage: {dirHandle ? "Connected" : "Disconnected"}
              </h3>
              <p className="text-xs text-slate-400">
                {dirHandle
                  ? `Auto-saving to '${dirHandle.name}'. Last saved: ${
                      lastSaved ? lastSaved.toLocaleTimeString() : "Just now"
                    }`
                  : `Connect local '${DATA_FOLDER_NAME}' folder for Auto-Save.`}
              </p>
            </div>
          </div>
          <Button
            onClick={connectDataFolder}
            variant={dirHandle ? "success" : "secondary"}
            className="text-sm h-9"
          >
            {dirHandle ? (
              <CheckCircle size={16} className="mr-2" />
            ) : (
              <FolderOpen size={16} className="mr-2" />
            )}
            {dirHandle ? "Connected" : "Connect Folder"}
          </Button>
        </div>

        <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-white">Records & Data</h2>
            <p className="text-sm text-slate-400">
              Manage user database and attendance logs
            </p>
          </div>

          <div className="flex flex-wrap gap-2 w-full xl:w-auto">
            {/* Database Controls */}
            <div className="flex items-center p-1 bg-slate-800 rounded-lg border border-slate-700">
              <Button
                onClick={() => dbInputRef.current?.click()}
                variant="secondary"
                className="text-xs px-3 h-8 bg-transparent border-0"
              >
                <FileUp size={14} className="mr-1 text-blue-400" /> Load DB
              </Button>
              <div className="w-px h-4 bg-slate-600 mx-1"></div>
              <Button
                onClick={backupDatabase}
                variant="secondary"
                className="text-xs px-3 h-8 bg-transparent border-0"
              >
                <Database size={14} className="mr-1 text-blue-400" /> Backup DB
              </Button>
            </div>

            {/* Attendance Controls */}
            <div className="flex items-center p-1 bg-slate-800 rounded-lg border border-slate-700">
              <Button
                onClick={() => recordsInputRef.current?.click()}
                variant="secondary"
                className="text-xs px-3 h-8 bg-transparent border-0"
              >
                <FileUp size={14} className="mr-1 text-purple-400" /> Load Recs
              </Button>
              <div className="w-px h-4 bg-slate-600 mx-1"></div>
              <Button
                onClick={backupRecords}
                variant="secondary"
                className="text-xs px-3 h-8 bg-transparent border-0"
              >
                <Save size={14} className="mr-1 text-purple-400" /> Backup Recs
              </Button>
            </div>

            {/* Exports */}
            <div className="flex items-center p-1 bg-slate-800 rounded-lg border border-slate-700">
              <Button
                onClick={exportUserList}
                variant="secondary"
                className="text-xs px-3 h-8 bg-transparent border-0"
              >
                <Users size={14} className="mr-1 text-emerald-400" /> List
              </Button>
              <div className="w-px h-4 bg-slate-600 mx-1"></div>
              <Button
                onClick={exportAttendance}
                variant="secondary"
                className="text-xs px-3 h-8 bg-transparent border-0"
              >
                <Download size={14} className="mr-1 text-emerald-400" /> Report
              </Button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between bg-slate-800/50 p-4 rounded-xl border border-slate-700">
          <div className="flex items-center space-x-4">
            <div className="bg-slate-700 p-2 rounded-lg">
              <Calendar className="text-blue-400" size={20} />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                View Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-slate-900 border border-slate-600 text-white text-sm rounded-md px-3 py-1 outline-none focus:border-blue-500"
              />
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">Total Students</p>
            <p className="text-xl font-bold text-white">{users.length}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">Present</p>
            <p className="text-xl font-bold text-green-400">
              {
                dailyReport.filter(
                  (u) => u.status === "Present" || u.status === "Late"
                ).length
              }
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">Absent</p>
            <p className="text-xl font-bold text-red-400">
              {dailyReport.filter((u) => u.status === "Absent").length}
            </p>
          </div>
        </div>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-700/50 text-slate-300 text-sm border-b border-slate-700">
                  <th className="p-4 font-medium">Student Name</th>
                  <th className="p-4 font-medium">Role</th>
                  <th className="p-4 font-medium">Time In</th>
                  <th className="p-4 font-medium">Status (Edit)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {dailyReport.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-slate-700/20 transition-colors text-slate-300"
                  >
                    <td className="p-4 flex items-center space-x-3 text-white font-medium">
                      <img
                        src={user.image}
                        alt=""
                        className="w-8 h-8 rounded-full bg-slate-800 object-cover"
                      />
                      <span>{user.name}</span>
                    </td>
                    <td className="p-4">{user.role}</td>
                    <td className="p-4 font-mono text-xs text-slate-400">
                      {user.time}
                    </td>
                    <td className="p-4">
                      <div className="relative inline-block">
                        <select
                          value={user.status}
                          onChange={(e) =>
                            updateAttendanceStatus(user.id, e.target.value)
                          }
                          className={`
                            appearance-none pl-3 pr-8 py-1 rounded-md text-xs font-medium border outline-none cursor-pointer
                            ${
                              user.status === "Present"
                                ? "bg-green-500/10 text-green-400 border-green-500/20"
                                : user.status === "Late"
                                ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                                : "bg-red-500/10 text-red-400 border-red-500/20"
                            }
                          `}
                        >
                          <option
                            value="Present"
                            className="bg-slate-800 text-green-400"
                          >
                            Present
                          </option>
                          <option
                            value="Late"
                            className="bg-slate-800 text-yellow-400"
                          >
                            Late
                          </option>
                          <option
                            value="Absent"
                            className="bg-slate-800 text-red-400"
                          >
                            Absent
                          </option>
                        </select>
                        <Edit3
                          size={12}
                          className="absolute right-2 top-1.5 pointer-events-none opacity-50"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
                {dailyReport.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-500">
                      No users registered in database.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-900 flex text-slate-100 font-sans selection:bg-blue-500/30">
      <aside className="w-64 bg-slate-800/50 backdrop-blur-md border-r border-slate-700 flex flex-col fixed h-full z-20 transition-transform md:translate-x-0 -translate-x-full">
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center space-x-2 text-blue-400 mb-1">
            <GraduationCap size={28} />
            <h1 className="text-xl font-bold text-white tracking-tight">
              Campus<span className="text-slate-400">ID</span>
            </h1>
          </div>
          <p className="text-xs text-slate-500">College Attendance System</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {[
            {
              id: AppView.DASHBOARD,
              icon: LayoutDashboard,
              label: "Dashboard",
            },
            { id: AppView.ATTENDANCE, icon: Camera, label: "Mark Attendance" },
            { id: AppView.REGISTER, icon: UserPlus, label: "Register Member" },
            { id: AppView.HISTORY, icon: History, label: "Records & Data" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => handleSetView(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                view === item.id
                  ? "bg-blue-600/10 text-blue-400 border border-blue-600/20"
                  : "text-slate-400 hover:bg-slate-700/50 hover:text-white"
              }`}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-700">
          <div className="text-xs text-slate-500 text-center">
            Powered by Gemini 2.5 Flash
          </div>
        </div>
      </aside>

      <main className="flex-1 md:ml-64 p-6 lg:p-8 overflow-y-auto">
        <div className="md:hidden flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <GraduationCap className="text-blue-500" />
            <h1 className="text-xl font-bold">CampusID</h1>
          </div>
        </div>

        {view === AppView.DASHBOARD && renderDashboard()}
        {view === AppView.ATTENDANCE && renderCameraView(false)}
        {view === AppView.REGISTER && renderCameraView(true)}
        {view === AppView.HISTORY && renderHistory()}
      </main>
    </div>
  );
}
