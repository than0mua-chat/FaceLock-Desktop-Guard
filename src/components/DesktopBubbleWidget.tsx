import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  Lock,
  Maximize2,
  Coffee,
  X,
  Sparkles,
} from 'lucide-react';
import { FaceDetectionResult, OwnerProfile, GuardSettings } from '../types';

export interface BubbleStateSync {
  isLocked: boolean;
  faceResult: FaceDetectionResult;
  owner: OwnerProfile | null;
  settings: GuardSettings;
}

interface DesktopBubbleWidgetProps {
  initialState?: BubbleStateSync;
  isStandaloneWindow?: boolean;
  onCloseStandalone?: () => void;
  onTriggerAction?: (action: string, payload?: unknown) => void;
}

export const DesktopBubbleWidget: React.FC<DesktopBubbleWidgetProps> = ({
  initialState,
  isStandaloneWindow = false,
  onCloseStandalone,
  onTriggerAction,
}) => {
  const [state, setState] = useState<BubbleStateSync>(() => {
    return (
      initialState || {
        isLocked: false,
        faceResult: {
          detected: false,
          confidence: 0,
          yawAngle: 0,
          pitchAngle: 0,
          rollAngle: 0,
          isFacingScreen: false,
          distanceRatio: 0,
          isSittingInFront: false,
          matchScore: 0,
          isMatchedOwner: false,
          reason: 'Đang kết nối...',
        },
        owner: null,
        settings: {
          scanFrequencyMs: 500,
          yawThresholdDeg: 30,
          pitchThresholdDeg: 35,
          minFaceDistanceRatio: 0.04,
          matchThresholdPercent: 50,
          soundEnabled: true,
          autoLockDelayMs: 0,
          simulatedState: 'live',
          isGuardEnabled: true,
          adaptiveDutyCycle: true,
          gracePeriodMs: 1500,
          lightingNormalization: true,
          floatingBubbleEnabled: true,
          floatingBubbleDetached: true,
          snoozeUntil: null,
        },
      }
    );
  });

  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // Listen to IPC updates if in standalone Electron bubble window
  useEffect(() => {
    if (isStandaloneWindow && window.electronAPI) {
      const unsub = window.electronAPI.onBubbleStateUpdate((newState) => {
        if (newState) {
          setState(newState as BubbleStateSync);
        }
      });
      return () => {
        unsub();
      };
    }
  }, [isStandaloneWindow]);

  const sendAction = (action: string, payload?: unknown) => {
    if (onTriggerAction) {
      onTriggerAction(action, payload);
    }
    if (isStandaloneWindow && window.electronAPI) {
      window.electronAPI.sendBubbleAction(action, payload);
    }
  };

  const { isLocked, faceResult, owner, settings } = state;

  const now = Date.now();
  const isSnoozed = settings.snoozeUntil !== null && settings.snoozeUntil > now;
  const snoozeRemainingSec = isSnoozed
    ? Math.max(0, Math.ceil((settings.snoozeUntil! - now) / 1000))
    : 0;

  const isGuardActive = settings.isGuardEnabled !== false && !isSnoozed;

  const isOwnerSafe =
    faceResult.detected &&
    faceResult.isSittingInFront &&
    faceResult.isFacingScreen &&
    faceResult.isMatchedOwner;

  const isTurned =
    faceResult.detected &&
    faceResult.isSittingInFront &&
    !faceResult.isFacingScreen;

  const isLeavingOrStranger =
    !faceResult.detected ||
    !faceResult.isSittingInFront ||
    (faceResult.isFacingScreen && !faceResult.isMatchedOwner);

  // Status Colors & Badges
  let ringColor = 'border-sky-500 shadow-sky-500/30';
  let badgeBg = 'bg-sky-500';
  let statusText = 'Đang quét 500ms';

  if (!isGuardActive) {
    ringColor = 'border-zinc-600 shadow-zinc-600/20';
    badgeBg = 'bg-zinc-500';
    statusText = isSnoozed ? `Nghỉ (${snoozeRemainingSec}s)` : 'Tạm dừng';
  } else if (isLocked) {
    ringColor = 'border-amber-500 shadow-amber-500/40';
    badgeBg = 'bg-amber-500';
    statusText = 'Đang khóa máy';
  } else if (isOwnerSafe) {
    ringColor = 'border-emerald-500 shadow-emerald-500/40';
    badgeBg = 'bg-emerald-500';
    statusText = `An toàn (${faceResult.matchScore}%)`;
  } else if (isTurned) {
    ringColor = 'border-amber-400 shadow-amber-400/40';
    badgeBg = 'bg-amber-400';
    statusText = `Quay mặt (${faceResult.yawAngle}°)`;
  } else if (isLeavingOrStranger) {
    ringColor = 'border-red-500 shadow-red-500/40';
    badgeBg = 'bg-red-500';
    statusText = faceResult.detected ? 'Không khớp chủ' : 'Vắng mặt';
  }

  return (
    <div
      className={`fixed inset-0 flex flex-col items-center justify-center select-none font-sans overflow-hidden ${
        isStandaloneWindow ? 'p-2 bg-transparent' : ''
      }`}
      style={isStandaloneWindow ? ({ WebkitAppRegion: 'drag' } as React.CSSProperties) : undefined}
    >
      {/* Outer Floating Widget Container */}
      <div
        className={`relative flex flex-col items-center justify-center transition-all duration-300 ${
          isExpanded
            ? 'w-[205px] rounded-2xl bg-zinc-950/95 border border-cyan-500/40 shadow-2xl p-3 backdrop-blur-2xl'
            : 'w-auto'
        }`}
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {/* Main Circular Bubble Orb */}
        <div className="relative group cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
          {/* Animated Ambient Pulse Ring */}
          <div
            className={`absolute -inset-1.5 rounded-full border-2 opacity-70 animate-pulse ${ringColor}`}
          />

          {/* Scanner Radar Sweep line */}
          {isGuardActive && (
            <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
              <div className="w-full h-full bg-gradient-to-b from-transparent via-cyan-400/20 to-transparent animate-scan" />
            </div>
          )}

          {/* Core Orb */}
          <div
            className={`relative flex h-14 w-14 items-center justify-center rounded-full bg-zinc-900/90 border-2 transition-all shadow-xl backdrop-blur-md ${ringColor}`}
          >
            {/* Snapshot avatar or Shield Icon */}
            {owner?.snapshotDataUrl ? (
              <img
                src={owner.snapshotDataUrl}
                alt="Owner Avatar"
                className="h-full w-full rounded-full object-cover p-0.5"
              />
            ) : isOwnerSafe ? (
              <ShieldCheck className="w-7 h-7 text-emerald-400" />
            ) : isLocked ? (
              <Lock className="w-6 h-6 text-amber-400 animate-pulse" />
            ) : isTurned ? (
              <ShieldAlert className="w-7 h-7 text-amber-400" />
            ) : isLeavingOrStranger ? (
              <ShieldAlert className="w-7 h-7 text-red-400" />
            ) : (
              <Shield className="w-7 h-7 text-sky-400" />
            )}

            {/* Corner Status Dot */}
            <span className="absolute bottom-0 right-0 flex h-4 w-4">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${badgeBg}`} />
              <span className={`relative inline-flex rounded-full h-4 w-4 border-2 border-zinc-900 ${badgeBg}`} />
            </span>
          </div>
        </div>

        {/* Small Live Status Pill Under Orb */}
        {!isExpanded && (
          <div
            onClick={() => setIsExpanded(true)}
            className="mt-1.5 px-2.5 py-0.5 rounded-full bg-zinc-900/90 border border-white/10 text-[10px] font-medium text-zinc-200 shadow-md backdrop-blur-md cursor-pointer hover:bg-zinc-800 transition whitespace-nowrap"
          >
            {statusText}
          </div>
        )}

        {/* Expanded Quick Controls Panel */}
        {isExpanded && (
          <div className="mt-2.5 w-full flex flex-col gap-2 animate-fadeIn text-zinc-200">
            {/* Info header */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-1.5 px-1">
              <div className="text-left leading-tight">
                <p className="text-xs font-bold text-white truncate max-w-[120px]">
                  {owner?.name || 'FaceLock Guard'}
                </p>
                <p className="text-[10px] text-zinc-400">{statusText}</p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(false);
                }}
                className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
                title="Thu gọn"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Biometric quick metrics */}
            <div className="grid grid-cols-2 gap-1 text-[10px] bg-black/40 p-1.5 rounded-lg border border-white/5">
              <div className="text-left">
                <span className="text-zinc-500">Khớp:</span>{' '}
                <span className="font-mono font-bold text-cyan-300">{faceResult.matchScore}%</span>
              </div>
              <div className="text-left">
                <span className="text-zinc-500">Góc:</span>{' '}
                <span className="font-mono text-zinc-300">
                  {faceResult.yawAngle > 0 ? `+${faceResult.yawAngle}` : faceResult.yawAngle}°
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-1.5">
              {/* Lock Workstation Now */}
              <button
                onClick={() => sendAction('lock')}
                className="w-full flex items-center justify-center gap-2 py-1.5 px-2 rounded-lg bg-amber-600/80 hover:bg-amber-500 text-white text-xs font-semibold shadow transition cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Khóa máy ngay</span>
              </button>

              {/* Toggle Guard Active/Inactive */}
              <button
                onClick={() => sendAction('toggle_guard')}
                className={`w-full flex items-center justify-center gap-2 py-1.5 px-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  settings.isGuardEnabled !== false
                    ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                    : 'bg-emerald-600/90 hover:bg-emerald-500 text-white'
                }`}
              >
                {settings.isGuardEnabled !== false ? (
                  <>
                    <ShieldOff className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Tạm dừng quét</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-white" />
                    <span>Bật bảo vệ</span>
                  </>
                )}
              </button>

              {/* Snooze 10 Minutes */}
              <button
                onClick={() => sendAction('snooze_10m')}
                className="w-full flex items-center justify-center gap-2 py-1 px-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-white/5 text-zinc-300 text-[11px] transition cursor-pointer"
              >
                <Coffee className="w-3 h-3 text-amber-400" />
                <span>Nghỉ 10 phút</span>
              </button>

              {/* Restore Main App Window */}
              <button
                onClick={() => sendAction('restore')}
                className="w-full flex items-center justify-center gap-2 py-1 px-2 rounded-lg bg-sky-600/80 hover:bg-sky-500 text-white text-[11px] font-medium transition cursor-pointer"
              >
                <Maximize2 className="w-3 h-3" />
                <span>Mở ứng dụng chính</span>
              </button>

              {/* Close Standalone Bubble / Dock back */}
              {isStandaloneWindow && (
                <button
                  onClick={() => {
                    if (onCloseStandalone) {
                      onCloseStandalone();
                    } else if (window.electronAPI) {
                      window.electronAPI.hideDesktopBubble();
                    }
                  }}
                  className="w-full py-1 text-[10px] text-zinc-500 hover:text-zinc-300 transition cursor-pointer"
                >
                  Thu về ứng dụng chính
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
