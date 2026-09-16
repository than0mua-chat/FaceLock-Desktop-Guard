import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  ShieldOff,
  Shield,
  Lock,
  FileText,
  Terminal,
  Activity,
  Sliders,
  Volume2,
  VolumeX,
  Sparkles,
  UserCheck,
  Minus,
  Square,
  X,
  Wifi,
  Battery,
  Camera,
  Search,
  Folder,
  Monitor,
  Trash2,
  Power,
  ChevronUp,
  LayoutGrid,
  Maximize2,
  Download,
  Package,
  Zap,
} from 'lucide-react';
import {
  FaceDetectionResult,
  OwnerProfile,
  GuardSettings,
  ScanAuditLog,
} from '../types';
import { FaceLockInspector } from './FaceLockInspector';
import { ConfidentialDocApp } from './ConfidentialDocApp';
import { TerminalLogsApp } from './TerminalLogsApp';
import { MiniQuickAccessWidget } from './MiniQuickAccessWidget';
import { WindowsNativeLockModal } from './WindowsNativeLockModal';
import { WindowsExeBuildModal } from './WindowsExeBuildModal';

interface DesktopWorkspaceProps {
  faceResult: FaceDetectionResult;
  owner: OwnerProfile | null;
  settings: GuardSettings;
  auditLogs: ScanAuditLog[];
  scanCount: number;
  lastScanLatency: number;
  onLockScreen: () => void;
  onOpenEnrollment: () => void;
  onUpdateSettings: (newSettings: Partial<GuardSettings>) => void;
  onClearLogs: () => void;
  stream: MediaStream | null;
}

type ActiveApp = 'inspector' | 'document' | 'terminal';

export const DesktopWorkspace: React.FC<DesktopWorkspaceProps> = ({
  faceResult,
  owner,
  settings,
  auditLogs,
  scanCount,
  lastScanLatency,
  onLockScreen,
  onOpenEnrollment,
  onUpdateSettings,
  onClearLogs,
  stream,
}) => {
  const [activeApp, setActiveApp] = useState<ActiveApp>('inspector');
  const [isAppMinimized, setIsAppMinimized] = useState<boolean>(false);
  const [isStartMenuOpen, setIsStartMenuOpen] = useState<boolean>(false);
  const [isNativeLockModalOpen, setIsNativeLockModalOpen] = useState<boolean>(false);
  const [isExeBuildModalOpen, setIsExeBuildModalOpen] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Global Windows shortcut listener: Win + L / Alt + L / Ctrl + L
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Win+L (Meta+L) or Alt+L
      if ((e.metaKey && e.key.toLowerCase() === 'l') || (e.altKey && e.key.toLowerCase() === 'l')) {
        e.preventDefault();
        onLockScreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onLockScreen]);

  const formattedTime = currentTime.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const formattedDate = currentTime.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const isSafe =
    faceResult.detected &&
    faceResult.isFacingScreen &&
    faceResult.isSittingInFront &&
    faceResult.isMatchedOwner;

  return (
    <div
      id="windows-desktop-environment"
      onClick={() => {
        if (isStartMenuOpen) setIsStartMenuOpen(false);
      }}
      className="relative h-screen w-screen overflow-hidden bg-slate-950 font-sans text-zinc-100 flex flex-col select-none"
    >
      {/* Windows 11 Flow / Bloom Wallpaper */}
      <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-blue-950/80 to-indigo-950" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-600/15 via-blue-950/30 to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(37,99,235,0.15),transparent_50%)]" />

      {/* Desktop Icons Grid */}
      <div className="relative z-10 p-6 grid grid-flow-col grid-rows-6 gap-6 w-max pointer-events-auto">
        {/* Desktop Icon: This PC */}
        <button
          onDoubleClick={() => alert('Windows File Explorer: Hệ thống máy tính an toàn')}
          className="flex flex-col items-center gap-1.5 w-20 p-2 rounded-xl hover:bg-white/10 transition group text-center cursor-pointer"
        >
          <div className="w-11 h-11 rounded-lg bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-400 shadow-md group-hover:scale-105 transition">
            <Monitor className="w-6 h-6" />
          </div>
          <span className="text-[11px] text-white/90 drop-shadow group-hover:text-white leading-tight">
            Máy tính này
          </span>
        </button>

        {/* Desktop Icon: FaceLock Guard (Restore Window) */}
        <button
          onClick={() => {
            setIsAppMinimized(false);
            setActiveApp('inspector');
          }}
          className="flex flex-col items-center gap-1.5 w-20 p-2 rounded-xl hover:bg-white/10 transition group text-center cursor-pointer"
        >
          <div className="relative w-11 h-11 rounded-lg bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-cyan-400 shadow-md group-hover:scale-105 transition">
            <ShieldCheck className="w-6 h-6" />
            <span className="absolute -bottom-1 -right-1 px-1 rounded-full bg-cyan-500 text-[9px] font-bold text-black">
              500ms
            </span>
          </div>
          <span className="text-[11px] text-white/90 drop-shadow group-hover:text-white leading-tight">
            FaceLock Guard
          </span>
        </button>

        {/* Desktop Icon: Confidential Doc */}
        <button
          onClick={() => {
            setIsAppMinimized(false);
            setActiveApp('document');
          }}
          className="flex flex-col items-center gap-1.5 w-20 p-2 rounded-xl hover:bg-white/10 transition group text-center cursor-pointer"
        >
          <div className="w-11 h-11 rounded-lg bg-red-500/20 border border-red-400/40 flex items-center justify-center text-red-400 shadow-md group-hover:scale-105 transition">
            <FileText className="w-6 h-6" />
          </div>
          <span className="text-[11px] text-white/90 drop-shadow group-hover:text-white leading-tight">
            Tài liệu bảo mật
          </span>
        </button>

        {/* Desktop Icon: Lock Windows (Win + L) */}
        <button
          onClick={onLockScreen}
          className="flex flex-col items-center gap-1.5 w-20 p-2 rounded-xl hover:bg-white/10 transition group text-center cursor-pointer"
          title="Thao tác khóa màn hình Windows (Win + L)"
        >
          <div className="w-11 h-11 rounded-lg bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shadow-md group-hover:scale-105 transition">
            <Lock className="w-6 h-6" />
          </div>
          <span className="text-[11px] text-white/90 drop-shadow group-hover:text-white leading-tight font-medium">
            Khóa (Win+L)
          </span>
        </button>

        {/* Desktop Icon: Build .EXE */}
        <button
          onClick={() => setIsExeBuildModalOpen(true)}
          className="flex flex-col items-center gap-1.5 w-20 p-2 rounded-xl hover:bg-white/10 transition group text-center cursor-pointer"
          title="Đóng gói và xuất file .EXE cho Windows"
        >
          <div className="w-11 h-11 rounded-lg bg-gradient-to-tr from-cyan-600/30 to-blue-500/30 border border-cyan-400/50 flex items-center justify-center text-cyan-300 shadow-md group-hover:scale-105 transition">
            <Package className="w-6 h-6" />
          </div>
          <span className="text-[11px] text-cyan-200 drop-shadow group-hover:text-white leading-tight font-medium">
            Build Bản .EXE
          </span>
        </button>

        {/* Desktop Icon: Windows Native Lock Script */}
        <button
          onClick={() => setIsNativeLockModalOpen(true)}
          className="flex flex-col items-center gap-1.5 w-20 p-2 rounded-xl hover:bg-white/10 transition group text-center cursor-pointer"
          title="Công cụ & Script khóa Windows thật (.bat)"
        >
          <div className="w-11 h-11 rounded-lg bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shadow-md group-hover:scale-105 transition">
            <Terminal className="w-6 h-6" />
          </div>
          <span className="text-[11px] text-white/90 drop-shadow group-hover:text-white leading-tight">
            Script .bat khóa
          </span>
        </button>

        {/* Desktop Icon: Recycle Bin */}
        <button
          onDoubleClick={() => alert('Thùng rác trống')}
          className="flex flex-col items-center gap-1.5 w-20 p-2 rounded-xl hover:bg-white/10 transition group text-center cursor-pointer"
        >
          <div className="w-11 h-11 rounded-lg bg-zinc-700/30 border border-zinc-600/40 flex items-center justify-center text-zinc-400 shadow-md group-hover:scale-105 transition">
            <Trash2 className="w-6 h-6" />
          </div>
          <span className="text-[11px] text-zinc-300 drop-shadow group-hover:text-white leading-tight">
            Thùng rác
          </span>
        </button>
      </div>

      {/* Main FaceLock Application Window (When NOT minimized) */}
      {!isAppMinimized && (
        <div className="absolute inset-x-4 top-4 bottom-16 z-20 flex flex-col rounded-2xl border border-white/15 bg-zinc-950/90 shadow-2xl backdrop-blur-2xl overflow-hidden ring-1 ring-black/50 animate-fadeIn">
          {/* Windows 11 Title Bar */}
          <div className="h-10 bg-gradient-to-r from-zinc-900/95 via-slate-900/90 to-zinc-900/95 border-b border-zinc-800 flex items-center justify-between px-3.5 select-none">
            {/* Left: Window Icon & Title */}
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-cyan-500 text-black text-xs font-black">
                F
              </span>
              <span>FaceLock Desktop Guard — Windows 11 Sentinel</span>
              <span className="px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-[10px] text-cyan-300 font-mono">
                Quét mỗi 500ms
              </span>
            </div>

            {/* Center: Tabs */}
            <div className="hidden md:flex items-center gap-1 bg-zinc-950/60 p-1 rounded-xl border border-zinc-800 text-xs">
              <button
                onClick={() => setActiveApp('inspector')}
                className={`px-3 py-1 rounded-lg transition ${
                  activeApp === 'inspector'
                    ? 'bg-zinc-800 text-white font-semibold shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Giám sát AI
              </button>
              <button
                onClick={() => setActiveApp('document')}
                className={`px-3 py-1 rounded-lg transition ${
                  activeApp === 'document'
                    ? 'bg-zinc-800 text-white font-semibold shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Tài liệu bảo mật
              </button>
              <button
                onClick={() => setActiveApp('terminal')}
                className={`px-3 py-1 rounded-lg transition ${
                  activeApp === 'terminal'
                    ? 'bg-zinc-800 text-white font-semibold shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Terminal 500ms
              </button>
            </div>

            {/* Right: Windows 11 Window Controls: Minimize (-), Maximize, Close (X) */}
            <div className="flex items-center gap-1">
              {/* Highlight button: Minimize to Background */}
              <button
                onClick={() => setIsAppMinimized(true)}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 mr-2 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-medium transition cursor-pointer"
                title="Ẩn cửa sổ lớn xuống chạy ngầm (chỉ hiển thị widget truy cập nhanh)"
              >
                <Minus className="w-3.5 h-3.5" />
                <span>Ẩn chạy ngầm</span>
              </button>

              {/* Native Windows 11 Window Action Buttons */}
              <button
                onClick={() => setIsAppMinimized(true)}
                className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-zinc-800 text-zinc-300 hover:text-white transition cursor-pointer"
                title="Thu nhỏ xuống chạy ngầm (Minimize)"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => alert('Cửa sổ đang ở kích thước tối ưu')}
                className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-zinc-800 text-zinc-300 hover:text-white transition cursor-pointer"
                title="Phóng to (Maximize)"
              >
                <Square className="w-3 h-3" />
              </button>
              <button
                onClick={() => setIsAppMinimized(true)}
                className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-red-600 text-zinc-300 hover:text-white transition cursor-pointer"
                title="Ẩn xuống khay hệ thống / chạy ngầm"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Sub-toolbar */}
          <div className="h-9 px-4 bg-zinc-900/60 border-b border-zinc-800/80 flex items-center justify-between text-xs text-zinc-300">
            <div className="flex items-center gap-3">
              <div
                className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] ${
                  isSafe
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                    : 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                }`}
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span>
                  {isSafe
                    ? `Bảo vệ hoạt động • Yaw: ${faceResult.yawAngle > 0 ? `+${faceResult.yawAngle}` : faceResult.yawAngle}°`
                    : `Cảnh báo: ${faceResult.reason}`}
                </span>
              </div>

              <span className="text-zinc-500 text-[11px]">
                Chủ nhân: <strong className="text-zinc-200">{owner ? owner.name : 'Chưa thiết lập'}</strong>
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Quick Master Guard ON/OFF */}
              <button
                onClick={() =>
                  onUpdateSettings({ isGuardEnabled: !settings.isGuardEnabled })
                }
                className={`flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold transition active:scale-95 cursor-pointer border shadow ${
                  settings.isGuardEnabled !== false
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/30'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700'
                }`}
                title={settings.isGuardEnabled !== false ? 'Bảo vệ đang BẬT. Nhấp để TẮT' : 'Bảo vệ đang TẮT. Nhấp để BẬT'}
              >
                {settings.isGuardEnabled !== false ? (
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                ) : (
                  <ShieldOff className="w-3 h-3 text-zinc-400" />
                )}
                <span>{settings.isGuardEnabled !== false ? 'Bảo Vệ: BẬT' : 'Bảo Vệ: TẮT'}</span>
              </button>

              {/* Floating Bubble Quick Toggle */}
              <button
                onClick={() =>
                  onUpdateSettings({ floatingBubbleEnabled: !settings.floatingBubbleEnabled })
                }
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] transition active:scale-95 cursor-pointer border ${
                  settings.floatingBubbleEnabled !== false
                    ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:text-zinc-300'
                }`}
                title="Bật/Tắt bóng nổi điều khiển nhanh trên màn hình"
              >
                <span className="text-[12px] leading-none">🔘</span>
                <span>Bóng nổi</span>
              </button>

              <button
                onClick={() => setIsExeBuildModalOpen(true)}
                className="flex items-center gap-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 px-2.5 py-0.5 rounded text-[11px] font-semibold transition active:scale-95 cursor-pointer shadow"
                title="Đóng gói và xuất file .EXE cho Windows"
              >
                <Package className="w-3 h-3 text-cyan-400" />
                <span>Xuất Bản .EXE</span>
              </button>

              <button
                onClick={() => setIsNativeLockModalOpen(true)}
                className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-cyan-300 px-2 py-0.5 rounded hover:bg-zinc-800 transition"
              >
                <Download className="w-3 h-3" />
                <span>Script .bat</span>
              </button>

              <button
                onClick={onOpenEnrollment}
                className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-emerald-300 px-2 py-0.5 rounded hover:bg-zinc-800 transition"
              >
                <UserCheck className="w-3 h-3" />
                <span>Đổi khuôn mặt</span>
              </button>

              <button
                onClick={onLockScreen}
                className="flex items-center gap-1 bg-red-600/80 hover:bg-red-600 text-white px-2.5 py-0.5 rounded text-[11px] font-semibold transition active:scale-95 cursor-pointer shadow"
                title="Khóa màn hình theo thao tác Windows (Win + L)"
              >
                <Lock className="w-3 h-3" />
                <span>Khóa màn hình (Win + L)</span>
              </button>
            </div>
          </div>

          {/* Window Main Content View */}
          <div className="flex-1 overflow-hidden relative">
            {activeApp === 'inspector' && (
              <FaceLockInspector
                faceResult={faceResult}
                owner={owner}
                settings={settings}
                scanCount={scanCount}
                lastScanLatency={lastScanLatency}
                auditLogs={auditLogs}
                onOpenEnrollment={onOpenEnrollment}
                onLockScreen={onLockScreen}
                onUpdateSettings={onUpdateSettings}
                onClearLogs={onClearLogs}
                stream={stream}
              />
            )}
            {activeApp === 'document' && (
              <ConfidentialDocApp faceResult={faceResult} />
            )}
            {activeApp === 'terminal' && (
              <TerminalLogsApp
                auditLogs={auditLogs}
                faceResult={faceResult}
                owner={owner}
                settings={settings}
                onClearLogs={onClearLogs}
                onLockScreen={onLockScreen}
              />
            )}
          </div>
        </div>
      )}

      {/* Floating Mini Quick-Access Widget (Rendered when minimized to background) */}
      {isAppMinimized && (
        <MiniQuickAccessWidget
          faceResult={faceResult}
          owner={owner}
          settings={settings}
          stream={stream}
          onLockScreen={onLockScreen}
          onRestoreApp={() => setIsAppMinimized(false)}
          onUpdateSettings={onUpdateSettings}
        />
      )}

      {/* Windows 11 Start Menu Popup */}
      {isStartMenuOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-14 left-1/2 -translate-x-1/2 z-40 w-96 rounded-2xl bg-zinc-900/95 border border-white/10 shadow-2xl backdrop-blur-2xl p-5 text-zinc-200 animate-fadeIn"
        >
          {/* Start Menu Search Bar */}
          <div className="relative mb-4">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Tìm kiếm ứng dụng, cài đặt và tài liệu..."
              className="w-full bg-zinc-800/80 pl-9 pr-3 py-2 rounded-xl text-xs text-white border border-zinc-700 focus:outline-none focus:border-cyan-500 placeholder:text-zinc-500"
            />
          </div>

          {/* Pinned Items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-400">
              <span>Đã ghim (Pinned)</span>
              <span className="text-cyan-400 cursor-pointer">Tất cả ứng dụng &gt;</span>
            </div>

            <div className="grid grid-cols-4 gap-3 py-2">
              <button
                onClick={() => {
                  setIsAppMinimized(false);
                  setActiveApp('inspector');
                  setIsStartMenuOpen(false);
                }}
                className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-zinc-800 transition cursor-pointer text-center"
              >
                <div className="w-10 h-10 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <span className="text-[10px] text-zinc-200">FaceLock</span>
              </button>

              <button
                onClick={() => {
                  setIsAppMinimized(false);
                  setActiveApp('document');
                  setIsStartMenuOpen(false);
                }}
                className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-zinc-800 transition cursor-pointer text-center"
              >
                <div className="w-10 h-10 rounded-lg bg-red-500/20 border border-red-400/40 flex items-center justify-center text-red-400">
                  <FileText className="w-5 h-5" />
                </div>
                <span className="text-[10px] text-zinc-200">Tài liệu</span>
              </button>

              <button
                onClick={() => {
                  setIsAppMinimized(false);
                  setActiveApp('terminal');
                  setIsStartMenuOpen(false);
                }}
                className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-zinc-800 transition cursor-pointer text-center"
              >
                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400">
                  <Terminal className="w-5 h-5" />
                </div>
                <span className="text-[10px] text-zinc-200">Terminal</span>
              </button>

              <button
                onClick={() => {
                  setIsExeBuildModalOpen(true);
                  setIsStartMenuOpen(false);
                }}
                className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-zinc-800 transition cursor-pointer text-center"
              >
                <div className="w-10 h-10 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400">
                  <Package className="w-5 h-5" />
                </div>
                <span className="text-[10px] text-zinc-200">Build .EXE</span>
              </button>

              <button
                onClick={() => {
                  setIsNativeLockModalOpen(true);
                  setIsStartMenuOpen(false);
                }}
                className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-zinc-800 transition cursor-pointer text-center"
              >
                <div className="w-10 h-10 rounded-lg bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
                  <Download className="w-5 h-5" />
                </div>
                <span className="text-[10px] text-zinc-200">Script .bat</span>
              </button>
            </div>
          </div>

          {/* User Profile & Power Actions */}
          <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-cyan-600/40 text-cyan-300 flex items-center justify-center font-bold text-xs">
                {owner?.name ? owner.name[0].toUpperCase() : 'U'}
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-white">
                  {owner ? owner.name : 'Người dùng Windows'}
                </span>
                <span className="text-[10px] text-zinc-400">Tài khoản cục bộ</span>
              </div>
            </div>

            {/* Windows Power / Lock Actions */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setIsStartMenuOpen(false);
                  onLockScreen();
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-600/70 hover:bg-red-600 text-white text-xs font-semibold transition cursor-pointer"
                title="Khóa máy Windows (Win + L)"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Khóa (Win+L)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Windows 11 Taskbar */}
      <footer className="relative z-30 h-12 bg-zinc-900/80 backdrop-blur-2xl border-t border-white/10 flex items-center justify-between px-3 select-none">
        {/* Left spacer / Weather widget */}
        <div className="hidden sm:flex items-center gap-2 text-xs text-zinc-400 pl-2">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-white/10 transition cursor-pointer">
            <span className="text-amber-400">☀️</span>
            <span className="text-white text-[11px] font-medium">31°C Nắng nhẹ</span>
          </div>
        </div>

        {/* Center: Windows 11 Center App Icons */}
        <div className="flex items-center gap-1 sm:absolute sm:left-1/2 sm:-translate-x-1/2">
          {/* Windows 11 Start Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsStartMenuOpen(!isStartMenuOpen);
            }}
            className={`w-10 h-10 rounded-lg flex items-center justify-center transition cursor-pointer ${
              isStartMenuOpen ? 'bg-white/15' : 'hover:bg-white/10 active:scale-95'
            }`}
            title="Bắt đầu (Windows Start)"
          >
            {/* Windows 11 4-square logo */}
            <div className="grid grid-cols-2 gap-0.5">
              <div className="w-2 h-2 rounded-[1px] bg-sky-400" />
              <div className="w-2 h-2 rounded-[1px] bg-sky-400" />
              <div className="w-2 h-2 rounded-[1px] bg-sky-400" />
              <div className="w-2 h-2 rounded-[1px] bg-sky-400" />
            </div>
          </button>

          {/* Search Button */}
          <button
            onClick={() => setIsStartMenuOpen(true)}
            className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-white/10 text-zinc-300 hover:text-white transition cursor-pointer"
            title="Tìm kiếm Windows"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* App Icon: FaceLock Guard */}
          <button
            onClick={() => setIsAppMinimized(!isAppMinimized)}
            className={`relative w-10 h-10 rounded-lg flex items-center justify-center transition cursor-pointer ${
              !isAppMinimized ? 'bg-white/15' : 'hover:bg-white/10'
            }`}
            title="FaceLock Desktop Guard (Nhấn để ẩn/hiện)"
          >
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            {/* Running indicator line */}
            <span
              className={`absolute bottom-1 w-4 h-0.5 rounded-full ${
                !isAppMinimized ? 'bg-cyan-400' : 'bg-zinc-500'
              }`}
            />
          </button>

          {/* App Icon: Confidential Doc */}
          <button
            onClick={() => {
              setIsAppMinimized(false);
              setActiveApp('document');
            }}
            className="relative w-10 h-10 rounded-lg flex items-center justify-center hover:bg-white/10 transition cursor-pointer"
            title="Tài liệu bảo mật"
          >
            <FileText className="w-4 h-4 text-red-400" />
            {!isAppMinimized && activeApp === 'document' && (
              <span className="absolute bottom-1 w-4 h-0.5 rounded-full bg-red-400" />
            )}
          </button>

          {/* App Icon: Terminal */}
          <button
            onClick={() => {
              setIsAppMinimized(false);
              setActiveApp('terminal');
            }}
            className="relative w-10 h-10 rounded-lg flex items-center justify-center hover:bg-white/10 transition cursor-pointer"
            title="Terminal logs"
          >
            <Terminal className="w-4 h-4 text-emerald-400" />
            {!isAppMinimized && activeApp === 'terminal' && (
              <span className="absolute bottom-1 w-4 h-0.5 rounded-full bg-emerald-400" />
            )}
          </button>
        </div>

        {/* Right: Windows System Tray & Clock */}
        <div className="flex items-center gap-1.5 text-xs text-zinc-300">
          {/* FaceLock Guard Background System Tray Indicator */}
          <button
            onClick={() => setIsAppMinimized(!isAppMinimized)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-500/30 text-cyan-300 text-[11px] transition cursor-pointer"
            title="FaceLock Guard đang chạy ngầm mỗi 500ms"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
            </span>
            <span className="font-mono">500ms</span>
          </button>

          {/* System status icons group */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-white/10 transition cursor-pointer">
            <span title="Wi-Fi"><Wifi className="w-3.5 h-3.5 text-zinc-300" /></span>
            <button
              onClick={() =>
                onUpdateSettings({ soundEnabled: !settings.soundEnabled })
              }
              title="Âm thanh"
            >
              {settings.soundEnabled ? (
                <Volume2 className="w-3.5 h-3.5 text-zinc-300" />
              ) : (
                <VolumeX className="w-3.5 h-3.5 text-zinc-500" />
              )}
            </button>
            <span title="Pin: 100%"><Battery className="w-3.5 h-3.5 text-zinc-300" /></span>
          </div>

          {/* Windows Clock & Date */}
          <div
            onClick={onLockScreen}
            className="flex flex-col items-end px-2 py-0.5 rounded-lg hover:bg-white/10 transition cursor-pointer text-right leading-tight"
            title="Nhấn để khóa màn hình (Win + L)"
          >
            <span className="text-xs text-white font-medium">{formattedTime}</span>
            <span className="text-[10px] text-zinc-400 font-mono">{formattedDate}</span>
          </div>

          {/* Show Desktop Peek strip at the far right */}
          <div
            onClick={() => setIsAppMinimized(true)}
            className="w-1.5 h-8 border-l border-zinc-700 hover:bg-white/20 transition cursor-pointer"
            title="Hiện màn hình nền (Show Desktop)"
          />
        </div>
      </footer>

      {/* Windows Native Lock Instructions Modal */}
      <WindowsNativeLockModal
        isOpen={isNativeLockModalOpen}
        onClose={() => setIsNativeLockModalOpen(false)}
      />

      {/* Windows .EXE Build & Distribution Modal */}
      <WindowsExeBuildModal
        isOpen={isExeBuildModalOpen}
        onClose={() => setIsExeBuildModalOpen(false)}
      />
    </div>
  );
};
