import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  Lock,
  Maximize2,
  Power,
  Clock,
  Zap,
  Coffee,
  X,
  ChevronRight,
  SunMedium,
  CheckCircle2,
  Eye,
  EyeOff,
  ExternalLink,
} from 'lucide-react';
import { FaceDetectionResult, OwnerProfile, GuardSettings } from '../types';
import { CameraStreamView } from './CameraStreamView';

interface FloatingBubbleProps {
  faceResult: FaceDetectionResult;
  owner: OwnerProfile | null;
  settings: GuardSettings;
  stream: MediaStream | null;
  isLocked: boolean;
  onLockScreen: () => void;
  onRestoreApp: () => void;
  onUpdateSettings: (newSettings: Partial<GuardSettings>) => void;
}

export const FloatingBubble: React.FC<FloatingBubbleProps> = ({
  faceResult,
  owner,
  settings,
  stream,
  isLocked,
  onLockScreen,
  onRestoreApp,
  onUpdateSettings,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [showCamera, setShowCamera] = useState<boolean>(false);
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    // Default position: top right corner
    const saved = localStorage.getItem('facelock_bubble_pos');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return { x: window.innerWidth ? window.innerWidth - 76 : 1200, y: 110 };
  });

  const isDraggingRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const bubblePosStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const hasMovedRef = useRef<boolean>(false);
  const bubbleRef = useRef<HTMLDivElement>(null);

  // Check if snoozed
  const now = Date.now();
  const isSnoozed = settings.snoozeUntil !== null && settings.snoozeUntil > now;
  const snoozeRemainingSec = isSnoozed
    ? Math.max(0, Math.ceil((settings.snoozeUntil! - now) / 1000))
    : 0;

  const isGuardActive = settings.isGuardEnabled !== false && !isSnoozed;

  // Visual status
  const isOwnerSafe =
    faceResult.detected &&
    faceResult.isSittingInFront &&
    faceResult.isFacingScreen &&
    faceResult.isMatchedOwner;

  // Handle Dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // only left click
    isDraggingRef.current = true;
    hasMovedRef.current = false;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    bubblePosStartRef.current = { ...position };

    const handleMouseMove = (ev: MouseEvent) => {
      const dx = ev.clientX - dragStartRef.current.x;
      const dy = ev.clientY - dragStartRef.current.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        hasMovedRef.current = true;
      }

      const newX = Math.max(12, Math.min(window.innerWidth - 64, bubblePosStartRef.current.x + dx));
      const newY = Math.max(12, Math.min(window.innerHeight - 64, bubblePosStartRef.current.y + dy));
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);

      // Snap to nearest screen edge (left or right)
      setPosition((prev) => {
        const snapX = prev.x < window.innerWidth / 2 ? 16 : window.innerWidth - 68;
        const finalPos = { x: snapX, y: prev.y };
        localStorage.setItem('facelock_bubble_pos', JSON.stringify(finalPos));
        return finalPos;
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Toggle master protection
  const handleToggleGuard = () => {
    if (isSnoozed) {
      onUpdateSettings({ snoozeUntil: null, isGuardEnabled: true });
    } else {
      onUpdateSettings({ isGuardEnabled: !settings.isGuardEnabled });
    }
  };

  // Snooze handlers
  const handleSnooze = (minutes: number) => {
    if (minutes === 0) {
      onUpdateSettings({ snoozeUntil: null, isGuardEnabled: true });
    } else {
      const targetTime = Date.now() + minutes * 60 * 1000;
      onUpdateSettings({ snoozeUntil: targetTime, isGuardEnabled: true });
    }
  };

  // Detach bubble to independent desktop window
  const handleDetachToDesktop = async () => {
    if (window.electronAPI?.isElectron) {
      window.electronAPI.showDesktopBubble();
      onUpdateSettings({ floatingBubbleDetached: true });
      setIsOpen(false);
      return;
    }

    // Chrome/Edge Document Picture-in-Picture API
    if ('documentPictureInPicture' in window) {
      try {
        const pipWindow = await (window as any).documentPictureInPicture.requestWindow({
          width: 220,
          height: 250,
        });

        Array.from(document.styleSheets).forEach((sheet) => {
          try {
            if (sheet.cssRules) {
              const style = document.createElement('style');
              Array.from(sheet.cssRules).forEach((rule) => {
                style.appendChild(document.createTextNode(rule.cssText));
              });
              pipWindow.document.head.appendChild(style);
            }
          } catch {
            if (sheet.href) {
              const link = document.createElement('link');
              link.rel = 'stylesheet';
              link.href = sheet.href;
              pipWindow.document.head.appendChild(link);
            }
          }
        });

        const pipRoot = pipWindow.document.createElement('div');
        pipRoot.id = 'pip-bubble-root';
        pipWindow.document.body.style.margin = '0';
        pipWindow.document.body.style.backgroundColor = '#09090b';
        pipWindow.document.body.appendChild(pipRoot);

        const { createRoot } = await import('react-dom/client');
        const { DesktopBubbleWidget } = await import('./DesktopBubbleWidget');
        const root = createRoot(pipRoot);

        root.render(
          <DesktopBubbleWidget
            initialState={{
              isLocked,
              faceResult,
              owner,
              settings,
            }}
            isStandaloneWindow={true}
            onCloseStandalone={() => {
              pipWindow.close();
              onUpdateSettings({ floatingBubbleDetached: false });
            }}
            onTriggerAction={(action) => {
              if (action === 'lock') onLockScreen();
              else if (action === 'restore') onRestoreApp();
              else if (action === 'toggle_guard') handleToggleGuard();
              else if (action === 'snooze_10m') handleSnooze(10);
            }}
          />
        );

        onUpdateSettings({ floatingBubbleDetached: true });
        setIsOpen(false);

        pipWindow.addEventListener('pagehide', () => {
          onUpdateSettings({ floatingBubbleDetached: false });
        });
      } catch (err) {
        console.warn('Document PiP request error:', err);
      }
    } else {
      alert(
        'Bóng nổi desktop độc lập:\nKhi khởi động ứng dụng qua tệp start-desktop.bat (Windows native), bóng nổi sẽ tự động tách thành một cửa sổ trong suốt Always-on-top nổi trên màn hình desktop.'
      );
    }
  };

  const handleRecallFromDesktop = () => {
    if (window.electronAPI?.isElectron) {
      window.electronAPI.hideDesktopBubble();
    }
    onUpdateSettings({ floatingBubbleDetached: false });
  };

  // Status color variables
  let ringColor = 'border-emerald-500 shadow-emerald-500/40 bg-emerald-500/20 text-emerald-400';
  let statusText = 'Bảo vệ đang BẬT';
  let badgeColor = 'bg-emerald-500';

  if (!isGuardActive) {
    ringColor = 'border-zinc-600 shadow-zinc-800/40 bg-zinc-900 text-zinc-400';
    statusText = isSnoozed ? `Đang tạm dừng (${Math.ceil(snoozeRemainingSec / 60)}p)` : 'Bảo vệ ĐÃ TẮT';
    badgeColor = isSnoozed ? 'bg-amber-500' : 'bg-zinc-600';
  } else if (isLocked) {
    ringColor = 'border-red-500 shadow-red-500/40 bg-red-950/70 text-red-400';
    statusText = 'Màn hình đang khóa';
    badgeColor = 'bg-red-500';
  } else if (!isOwnerSafe) {
    ringColor = 'border-amber-500 shadow-amber-500/40 bg-amber-950/60 text-amber-400';
    statusText = faceResult.reason || 'Cảnh báo: Góc mặt lệch';
    badgeColor = 'bg-amber-500';
  }

  // Determine popup placement (open to left if docked on right, open to right if docked on left)
  const isDockedLeft = position.x < window.innerWidth / 2;

  return (
    <>
      {/* Floating Draggable Bubble (Bóng nổi) */}
      <div
        ref={bubbleRef}
        id="facelock-floating-bubble"
        onMouseDown={handleMouseDown}
        onClick={() => {
          if (!hasMovedRef.current) {
            setIsOpen((prev) => !prev);
          }
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          handleToggleGuard();
        }}
        style={{
          transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
          transition: isDraggingRef.current ? 'none' : 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        className="fixed top-0 left-0 z-50 select-none cursor-grab active:cursor-grabbing group touch-none"
        title="Bóng Nổi FaceLock Guard: Kéo để di chuyển • Bấm để mở menu • Nhấp đúp để Bật/Tắt nhanh"
      >
        <div
          className={`relative w-14 h-14 rounded-full border-2 backdrop-blur-xl shadow-xl flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 ${ringColor}`}
        >
          {/* Status Pulse Ring */}
          {isGuardActive && isOwnerSafe && (
            <span className="absolute inset-0 rounded-full border border-emerald-400/80 animate-ping opacity-70" />
          )}

          {/* Center Icon */}
          {!isGuardActive ? (
            <ShieldOff className="w-6 h-6 text-zinc-400 transition" />
          ) : isLocked ? (
            <Lock className="w-6 h-6 text-red-400 transition" />
          ) : isOwnerSafe ? (
            <ShieldCheck className="w-6 h-6 text-emerald-400 transition" />
          ) : (
            <ShieldAlert className="w-6 h-6 text-amber-400 transition" />
          )}

          {/* Mini Status Dot Badge */}
          <span
            className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-zinc-950 shadow ${badgeColor}`}
          />

          {/* Quick Frequency / Adaptive Tag */}
          <span className="absolute -top-1.5 px-1 py-0.2 rounded-full bg-zinc-900 border border-zinc-700 text-[9px] font-bold text-zinc-300 shadow">
            {isGuardActive ? (settings.adaptiveDutyCycle ? '⚡Eco' : '500ms') : 'OFF'}
          </span>
        </div>
      </div>

      {/* Floating Quick Settings Panel (Mở từ bóng nổi) */}
      {isOpen && (
        <div
          id="facelock-bubble-panel"
          style={{
            transform: isDockedLeft
              ? `translate3d(${position.x + 64}px, ${Math.min(window.innerHeight - 440, Math.max(16, position.y - 20))}px, 0)`
              : `translate3d(${Math.max(16, position.x - 336)}px, ${Math.min(window.innerHeight - 440, Math.max(16, position.y - 20))}px, 0)`,
          }}
          className="fixed top-0 left-0 z-50 w-80 rounded-2xl bg-zinc-950/95 border border-zinc-800/90 shadow-2xl backdrop-blur-2xl overflow-hidden ring-1 ring-white/10 animate-in fade-in zoom-in-95 duration-200"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/90 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <div
                className={`p-1.5 rounded-lg border ${
                  isGuardActive
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                }`}
              >
                {isGuardActive ? <Shield className="w-4 h-4" /> : <ShieldOff className="w-4 h-4" />}
              </div>
              <div>
                <h3 className="text-xs font-bold text-white tracking-wide">FaceLock Quick Guard</h3>
                <p className="text-[10px] text-zinc-400">{statusText}</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content Body */}
          <div className="p-3.5 space-y-3 max-h-[80vh] overflow-y-auto">
            {/* THOÁT BÓNG NỔI RA NGOÀI DESKTOP (Always On Top) */}
            <div className="p-2.5 rounded-xl bg-gradient-to-r from-sky-950/70 to-cyan-950/70 border border-cyan-500/40 space-y-2 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-300">
                    <ExternalLink className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold text-white">Thoát ra ngoài Desktop</div>
                    <div className="text-[10px] text-cyan-200/80">
                      Nổi trên mọi ứng dụng (Word, Excel, Game, Web)
                    </div>
                  </div>
                </div>
                {settings.floatingBubbleDetached ? (
                  <button
                    onClick={handleRecallFromDesktop}
                    className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-[11px] border border-white/10 transition cursor-pointer"
                  >
                    Gọi về
                  </button>
                ) : (
                  <button
                    onClick={handleDetachToDesktop}
                    className="px-2.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-[11px] shadow transition cursor-pointer"
                  >
                    Tách ra
                  </button>
                )}
              </div>
            </div>

            {/* MASTER ON/OFF TOGGLE */}
            <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold transition shadow ${
                    isGuardActive
                      ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-400'
                      : 'bg-zinc-800 border border-zinc-700 text-zinc-400'
                  }`}
                >
                  <Power className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-zinc-200">Bảo Vệ Khuôn Mặt</div>
                  <div className="text-[10px] text-zinc-400">
                    {isGuardActive
                      ? 'Đang hoạt động (Tự khóa khi vắng)'
                      : 'Đang tắt (Tiết kiệm 100% CPU & pin)'}
                  </div>
                </div>
              </div>

              {/* Toggle Switch */}
              <button
                onClick={handleToggleGuard}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isGuardActive ? 'bg-emerald-500' : 'bg-zinc-700'
                }`}
                title={isGuardActive ? 'Nhấp để Tắt bảo vệ' : 'Nhấp để Bật bảo vệ'}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    isGuardActive ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* SNOOZE / TẠM DỪNG NHANH */}
            <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-300">
                <div className="flex items-center gap-1.5">
                  <Coffee className="w-3.5 h-3.5 text-amber-400" />
                  <span>Tạm dừng / Nghỉ ngơi</span>
                </div>
                {isSnoozed && (
                  <span className="text-[10px] text-amber-400 font-mono font-bold animate-pulse">
                    Còn {Math.floor(snoozeRemainingSec / 60)}:
                    {(snoozeRemainingSec % 60).toString().padStart(2, '0')}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-4 gap-1.5 text-[10px]">
                <button
                  onClick={() => handleSnooze(5)}
                  className="py-1 px-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700/60 transition active:scale-95 text-center font-medium cursor-pointer"
                >
                  +5 phút
                </button>
                <button
                  onClick={() => handleSnooze(15)}
                  className="py-1 px-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700/60 transition active:scale-95 text-center font-medium cursor-pointer"
                >
                  +15 phút
                </button>
                <button
                  onClick={() => handleSnooze(60)}
                  className="py-1 px-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700/60 transition active:scale-95 text-center font-medium cursor-pointer"
                >
                  +1 giờ
                </button>
                <button
                  onClick={() => handleSnooze(0)}
                  disabled={!isSnoozed}
                  className={`py-1 px-1.5 rounded-lg border transition active:scale-95 text-center font-semibold cursor-pointer ${
                    isSnoozed
                      ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/30'
                      : 'bg-zinc-800/40 border-zinc-800 text-zinc-500 cursor-not-allowed'
                  }`}
                >
                  Tiếp tục
                </button>
              </div>
            </div>

            {/* PERFORMANCE OPTIMIZATION SWITCHES */}
            <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-2 text-xs">
              <div className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                <span>Tối ưu hóa thời gian chạy dài</span>
              </div>

              {/* Option 1: Adaptive Duty Cycle */}
              <div className="flex items-center justify-between py-1">
                <div>
                  <div className="text-zinc-200 text-[11px] font-medium">Tiết kiệm pin thông minh</div>
                  <div className="text-zinc-500 text-[9px]">
                    Quét 500ms khi khóa, 1000ms khi làm việc
                  </div>
                </div>
                <button
                  onClick={() =>
                    onUpdateSettings({ adaptiveDutyCycle: !settings.adaptiveDutyCycle })
                  }
                  className={`relative inline-flex h-4 w-8 shrink-0 cursor-pointer rounded-full transition-colors ${
                    settings.adaptiveDutyCycle ? 'bg-cyan-500' : 'bg-zinc-700'
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition ${
                      settings.adaptiveDutyCycle ? 'translate-x-4' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              {/* Option 2: Grace Period Buffer */}
              <div className="flex items-center justify-between py-1 border-t border-zinc-800/60">
                <div>
                  <div className="text-zinc-200 text-[11px] font-medium">Vùng đệm dung sai 1.5s</div>
                  <div className="text-zinc-500 text-[9px]">
                    Không khóa nhầm khi uống nước, gõ phím
                  </div>
                </div>
                <button
                  onClick={() =>
                    onUpdateSettings({
                      gracePeriodMs: settings.gracePeriodMs > 0 ? 0 : 1500,
                    })
                  }
                  className={`relative inline-flex h-4 w-8 shrink-0 cursor-pointer rounded-full transition-colors ${
                    settings.gracePeriodMs > 0 ? 'bg-cyan-500' : 'bg-zinc-700'
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition ${
                      settings.gracePeriodMs > 0 ? 'translate-x-4' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              {/* Option 3: Lighting Normalization */}
              <div className="flex items-center justify-between py-1 border-t border-zinc-800/60">
                <div>
                  <div className="text-zinc-200 text-[11px] font-medium">Tự cân bằng sáng</div>
                  <div className="text-zinc-500 text-[9px]">Chống sai lệch sáng/tối và ngược sáng</div>
                </div>
                <button
                  onClick={() =>
                    onUpdateSettings({
                      lightingNormalization: !settings.lightingNormalization,
                    })
                  }
                  className={`relative inline-flex h-4 w-8 shrink-0 cursor-pointer rounded-full transition-colors ${
                    settings.lightingNormalization ? 'bg-cyan-500' : 'bg-zinc-700'
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition ${
                      settings.lightingNormalization ? 'translate-x-4' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* CAMERA PREVIEW TOGGLE */}
            <div className="pt-1">
              <button
                onClick={() => setShowCamera(!showCamera)}
                className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 text-xs font-medium border border-zinc-800 transition cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  {showCamera ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showCamera ? 'Ẩn xem trước camera' : 'Xem góc camera & độ sáng'}</span>
                </div>
                <span className="text-[10px] text-cyan-400 font-mono">
                  Yaw: {faceResult.yawAngle}°
                </span>
              </button>

              {showCamera && (
                <div className="mt-2 h-32 rounded-xl overflow-hidden border border-zinc-800 shadow-inner relative bg-black">
                  <CameraStreamView
                    stream={stream}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-1.5 left-2 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur text-[9px] text-zinc-300 font-mono">
                    Yaw: {faceResult.yawAngle}° | Pitch: {faceResult.pitchAngle}°
                  </div>
                </div>
              )}
            </div>

            {/* ACTION BUTTONS: Lock PC & Open Workspace */}
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-zinc-800/80">
              <button
                onClick={() => {
                  setIsOpen(false);
                  onLockScreen();
                }}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/40 text-xs font-semibold transition active:scale-95 cursor-pointer shadow"
                title="Khóa máy ngay tức thì (tương đương Win + L)"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Khóa Máy Ngay</span>
              </button>

              <button
                onClick={() => {
                  setIsOpen(false);
                  onRestoreApp();
                }}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold transition active:scale-95 cursor-pointer shadow"
                title="Mở ứng dụng FaceLock Guard toàn màn hình"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Mở Ứng Dụng</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
