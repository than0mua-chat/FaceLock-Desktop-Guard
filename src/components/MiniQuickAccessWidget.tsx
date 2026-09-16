import React, { useState } from 'react';
import {
  Lock,
  Maximize2,
  ShieldCheck,
  ShieldAlert,
  Volume2,
  VolumeX,
  Eye,
  EyeOff,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { FaceDetectionResult, OwnerProfile, GuardSettings } from '../types';
import { CameraStreamView } from './CameraStreamView';

interface MiniQuickAccessWidgetProps {
  faceResult: FaceDetectionResult;
  owner: OwnerProfile | null;
  settings: GuardSettings;
  stream: MediaStream | null;
  onLockScreen: () => void;
  onRestoreApp: () => void;
  onUpdateSettings: (newSettings: Partial<GuardSettings>) => void;
}

export const MiniQuickAccessWidget: React.FC<MiniQuickAccessWidgetProps> = ({
  faceResult,
  owner,
  settings,
  stream,
  onLockScreen,
  onRestoreApp,
  onUpdateSettings,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showCameraView, setShowCameraView] = useState(true);

  const isFacingSafe =
    faceResult.detected &&
    faceResult.isSittingInFront &&
    faceResult.isFacingScreen &&
    faceResult.isMatchedOwner;

  return (
    <div
      id="facelock-quick-widget"
      className="fixed top-5 right-5 z-50 select-none transition-all duration-300"
    >
      <div className="w-80 rounded-2xl border border-cyan-500/30 bg-zinc-950/85 backdrop-blur-xl shadow-2xl shadow-black/80 overflow-hidden ring-1 ring-white/10">
        {/* Top Handle / Status Header */}
        <div className="flex items-center justify-between px-3.5 py-2.5 bg-gradient-to-r from-zinc-900/95 via-slate-900/90 to-zinc-900/95 border-b border-zinc-800/80">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  isFacingSafe ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                  isFacingSafe ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
            </span>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white tracking-wide flex items-center gap-1.5">
                <span>FaceLock Quick Guard</span>
                <span className="px-1.5 py-0.2 rounded bg-cyan-950/80 border border-cyan-700/50 text-[10px] text-cyan-300 font-mono">
                  500ms
                </span>
              </span>
              <span className="text-[10px] text-zinc-400">
                {isFacingSafe ? 'Đang chạy ngầm • Đang nhìn thẳng' : 'Cảnh báo: Góc mặt lệch/vắng'}
              </span>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowCameraView(!showCameraView)}
              className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
              title={showCameraView ? 'Ẩn camera' : 'Hiện camera'}
            >
              {showCameraView ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
              title={isExpanded ? 'Thu gọn widget' : 'Mở rộng widget'}
            >
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={onRestoreApp}
              className="p-1 rounded-md text-cyan-400 hover:text-cyan-300 hover:bg-cyan-950/50 transition cursor-pointer"
              title="Phóng to mở ứng dụng đầy đủ"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Expanded Content Body */}
        {isExpanded && (
          <div className="p-3 space-y-3 text-xs">
            {/* Live Camera View (PiP) */}
            {showCameraView && (
              <div className="relative w-full aspect-[16/10] rounded-xl overflow-hidden bg-black border border-zinc-800 shadow-inner">
                {stream ? (
                  <CameraStreamView
                    stream={stream}
                    className="w-full h-full object-cover opacity-90"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-[11px] text-zinc-500">
                    <span className="animate-pulse">Đang kết nối camera...</span>
                  </div>
                )}

                {/* Radar HUD Overlay */}
                <div className="absolute inset-0 pointer-events-none p-2 flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <span className="px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-sm text-[10px] font-mono text-cyan-300 border border-cyan-900/60">
                      LIVE • 500MS
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono border backdrop-blur-sm ${
                        isFacingSafe
                          ? 'bg-emerald-950/80 border-emerald-600/60 text-emerald-300'
                          : 'bg-amber-950/80 border-amber-600/60 text-amber-300'
                      }`}
                    >
                      {faceResult.detected ? `Góc: ${faceResult.yawAngle}°` : 'VẮNG MẶT'}
                    </span>
                  </div>

                  {/* Laser line pulsing */}
                  <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_6px_rgba(34,211,238,0.9)] animate-pulse" />

                  <div className="flex justify-between items-end text-[10px] text-zinc-300 bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded">
                    <span>{owner ? owner.name : 'Chưa đăng ký'}</span>
                    <span>Khớp: {faceResult.matchScore}%</span>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Status Pill */}
            <div
              className={`flex items-center justify-between p-2 rounded-xl border ${
                isFacingSafe
                  ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
                  : 'bg-amber-950/30 border-amber-500/30 text-amber-200'
              }`}
            >
              <div className="flex items-center gap-1.5">
                {isFacingSafe ? (
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                )}
                <span className="font-medium text-[11px] leading-tight">
                  {isFacingSafe
                    ? 'Bạn đang nhìn thẳng — An toàn'
                    : faceResult.reason || 'Sẽ khóa ngay nếu quay mặt đi'}
                </span>
              </div>

              <button
                onClick={() =>
                  onUpdateSettings({ soundEnabled: !settings.soundEnabled })
                }
                className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white transition"
                title="Bật/tắt âm thanh"
              >
                {settings.soundEnabled ? (
                  <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5 text-zinc-500" />
                )}
              </button>
            </div>

            {/* Main Action: Lock Screen (Windows Win + L) */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onLockScreen}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-semibold text-xs shadow-md shadow-red-950/50 transition active:scale-95 cursor-pointer"
                title="Khóa màn hình theo thao tác của Windows (Win + L)"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Khóa (Win + L)</span>
              </button>

              <button
                onClick={onRestoreApp}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-xs border border-zinc-700 transition active:scale-95 cursor-pointer"
                title="Mở lại giao diện cửa sổ lớn"
              >
                <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Mở cửa sổ</span>
              </button>
            </div>

            {/* Quick Test Simulator Buttons */}
            <div className="pt-2 border-t border-zinc-800/80">
              <div className="flex items-center justify-between mb-1.5 text-[10px] text-zinc-400">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  Mô phỏng thử nghiệm phản xạ:
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1 text-[10px]">
                <button
                  onClick={() => onUpdateSettings({ simulatedState: 'live' })}
                  className={`py-1 rounded border transition ${
                    settings.simulatedState === 'live'
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-bold'
                      : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800'
                  }`}
                  title="Dùng camera thật"
                >
                  Thật
                </button>
                <button
                  onClick={() =>
                    onUpdateSettings({ simulatedState: 'simulate_turned_away' })
                  }
                  className={`py-1 rounded border transition ${
                    settings.simulatedState === 'simulate_turned_away'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold'
                      : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800'
                  }`}
                  title="Thử quay mặt đi"
                >
                  Quay mặt
                </button>
                <button
                  onClick={() =>
                    onUpdateSettings({ simulatedState: 'simulate_left_screen' })
                  }
                  className={`py-1 rounded border transition ${
                    settings.simulatedState === 'simulate_left_screen'
                      ? 'bg-red-500/20 text-red-300 border-red-500/50 font-bold'
                      : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800'
                  }`}
                  title="Thử rời máy tính"
                >
                  Rời máy
                </button>
                <button
                  onClick={() =>
                    onUpdateSettings({ simulatedState: 'simulate_stranger' })
                  }
                  className={`py-1 rounded border transition ${
                    settings.simulatedState === 'simulate_stranger'
                      ? 'bg-purple-500/20 text-purple-300 border-purple-500/50 font-bold'
                      : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800'
                  }`}
                  title="Thử người lạ ngồi trước máy"
                >
                  Người lạ
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
