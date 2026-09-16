import React, { useState, useEffect } from 'react';
import {
  Lock,
  Unlock,
  ShieldAlert,
  UserCheck,
  KeyRound,
  Volume2,
  VolumeX,
  Sparkles,
  ArrowRight,
  Wifi,
  Battery,
  Power,
  Accessibility,
  ScanFace,
  ChevronUp,
  Camera,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';
import { FaceDetectionResult, OwnerProfile, GuardSettings } from '../types';
import { sounds } from '../utils/audio';
import { CameraStreamView } from './CameraStreamView';

interface LockScreenProps {
  isLocked: boolean;
  faceResult: FaceDetectionResult;
  owner: OwnerProfile | null;
  settings: GuardSettings;
  stream: MediaStream | null;
  scanCount?: number;
  lastScanLatency?: number;
  onUnlockManually: () => void;
  onOpenEnrollment: () => void;
  onUpdateSettings: (newSettings: Partial<GuardSettings>) => void;
}

export const LockScreen: React.FC<LockScreenProps> = ({
  faceResult,
  owner,
  settings,
  stream,
  scanCount = 0,
  lastScanLatency = 24,
  onUnlockManually,
  onOpenEnrollment,
  onUpdateSettings,
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showSignInPrompt, setShowSignInPrompt] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [showLivePreview, setShowLivePreview] = useState(true);

  // Time ticker
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Listen to keyboard press to transition to sign-in screen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowSignInPrompt((prev) => !prev);
      } else if (!showSignInPrompt && e.key !== 'F5' && e.key !== 'F12') {
        setShowSignInPrompt(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSignInPrompt]);

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === '1234' || pin === '0000') {
      sounds.playUnlock();
      onUnlockManually();
      setPin('');
      setPinError(false);
    } else {
      sounds.playWarning();
      setPinError(true);
      setTimeout(() => setPinError(false), 2000);
    }
  };

  const formattedTime = currentTime.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const formattedDate = currentTime.toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  // Face evaluation states with natural sitting posture tolerance
  const isAngleTolerant =
    Math.abs(faceResult.yawAngle) <= (settings.yawThresholdDeg + 12) &&
    Math.abs(faceResult.pitchAngle) <= (settings.pitchThresholdDeg + 12);

  const threshold = settings.matchThresholdPercent || 50;

  // Require enrolled owner and biometric match to verify owner
  const isOwnerMatched =
    Boolean(owner) &&
    faceResult.detected &&
    faceResult.isMatchedOwner &&
    faceResult.matchScore >= threshold;

  const isOwnerVerified =
    isOwnerMatched &&
    faceResult.isSittingInFront &&
    isAngleTolerant;

  const isTurnedAway =
    faceResult.detected &&
    faceResult.isSittingInFront &&
    isOwnerMatched &&
    !isAngleTolerant;

  const isLeaving = !faceResult.detected || !faceResult.isSittingInFront;

  const isStranger =
    Boolean(owner) &&
    faceResult.detected &&
    faceResult.isSittingInFront &&
    !isOwnerMatched;

  return (
    <div
      id="windows-lock-screen"
      onClick={() => {
        if (!showSignInPrompt) setShowSignInPrompt(true);
      }}
      className="relative h-screen w-screen overflow-hidden font-sans text-zinc-100 flex flex-col justify-between select-none cursor-default"
    >
      {/* Windows 11 Spotlight Background Wallpaper */}
      <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-sky-950/80 to-indigo-950" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(56,189,248,0.18),transparent_70%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(129,140,248,0.12),transparent_50%)]" />
      <div
        className={`absolute inset-0 backdrop-blur-md transition-all duration-700 ${
          showSignInPrompt ? 'backdrop-blur-2xl bg-black/40' : 'backdrop-blur-none bg-black/10'
        }`}
      />

      {/* Top Status & Continuous 500ms Scanner Badge */}
      <header
        onClick={(e) => e.stopPropagation()}
        className="relative z-20 flex items-center justify-between px-6 py-4 text-xs text-zinc-300"
      >
        {/* Left: Continuous scanning ticker */}
        <div className="flex items-center gap-2.5 bg-black/50 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 shadow-lg">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
          </span>
          <span className="font-semibold text-white tracking-wide">
            Đang quét liên tục: 500ms
          </span>
          <span className="text-zinc-400 border-l border-zinc-700 pl-2 font-mono text-[11px]">
            Lần #{scanCount} • {lastScanLatency}ms
          </span>
          <span className="hidden sm:inline text-cyan-300/90 text-[11px] font-mono border-l border-zinc-700 pl-2">
            Góc: {faceResult.yawAngle > 0 ? `+${faceResult.yawAngle}` : faceResult.yawAngle}° • Khớp: {faceResult.matchScore}%
          </span>
        </div>

        {/* Right: Quick actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowLivePreview(!showLivePreview)}
            className="flex items-center gap-1.5 rounded-full bg-black/50 hover:bg-black/80 px-3 py-1.5 text-xs text-zinc-300 border border-white/10 transition cursor-pointer backdrop-blur-md"
            title="Bật/tắt xem camera trực tiếp"
          >
            <Camera className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">
              {showLivePreview ? 'Ẩn camera' : 'Hiện camera'}
            </span>
          </button>

          <button
            onClick={() =>
              onUpdateSettings({ soundEnabled: !settings.soundEnabled })
            }
            className="flex items-center gap-1.5 rounded-full bg-black/50 hover:bg-black/80 px-3 py-1.5 text-xs text-zinc-300 border border-white/10 transition cursor-pointer backdrop-blur-md"
            title="Bật/Tắt âm thanh"
          >
            {settings.soundEnabled ? (
              <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-zinc-500" />
            )}
          </button>

          <button
            onClick={onOpenEnrollment}
            className="flex items-center gap-1.5 rounded-full bg-black/50 hover:bg-black/80 px-3 py-1.5 text-xs text-zinc-300 border border-white/10 transition cursor-pointer backdrop-blur-md"
            title="Đổi khuôn mặt chủ sở hữu"
          >
            <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Đổi chủ</span>
          </button>
        </div>
      </header>

      {/* Main Center Area: Windows 11 Lock Screen or Sign-In Prompt */}
      <main className="relative z-20 flex flex-col items-center justify-center my-auto px-4 text-center">
        {!showSignInPrompt ? (
          /* Standard Windows 11 Lock Screen with Big Clock & Hello Face Radar */
          <div className="flex flex-col items-center animate-fadeIn">
            {/* Windows Hello Face Scanning Eye / Icon */}
            <div className="mb-4 flex flex-col items-center">
              <div
                className={`relative flex h-14 w-14 items-center justify-center rounded-full border transition-all duration-500 shadow-2xl ${
                  isOwnerVerified
                    ? 'bg-emerald-500/25 border-emerald-400/80 text-emerald-300 shadow-emerald-500/30'
                    : isTurnedAway
                    ? 'bg-amber-500/20 border-amber-400/70 text-amber-300 shadow-amber-500/20'
                    : isStranger
                    ? 'bg-red-500/20 border-red-400/70 text-red-300 shadow-red-500/20'
                    : 'bg-sky-500/20 border-sky-400/60 text-sky-300 shadow-sky-500/20'
                }`}
              >
                {/* Infrared laser pulsing circle */}
                <div
                  className={`absolute inset-0 rounded-full animate-ping opacity-30 ${
                    isOwnerVerified ? 'bg-emerald-400' : 'bg-cyan-400'
                  }`}
                />

                {isOwnerVerified ? (
                  <Unlock className="w-7 h-7" />
                ) : (
                  <ScanFace className="w-7 h-7 animate-pulse" />
                )}
              </div>

              {/* Windows Hello Status Text & Unlock Notification Banner */}
              <div className="mt-3 flex flex-col items-center max-w-lg">
                {isOwnerVerified ? (
                  <div className="animate-bounce flex items-center gap-3 px-6 py-3 rounded-2xl bg-emerald-600/95 border border-emerald-400 text-white shadow-2xl backdrop-blur-xl">
                    <CheckCircle2 className="w-6 h-6 text-white shrink-0 animate-pulse" />
                    <div className="text-left">
                      <p className="text-sm font-bold tracking-wide">
                        Đã nhận diện: {owner?.name || 'Chủ sở hữu'} ({faceResult.matchScore}%)
                      </p>
                      <p className="text-xs text-emerald-100">
                        Khớp dữ liệu trắc sinh học • Đang mở khóa màn hình...
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <span className="text-sm font-semibold tracking-wide text-white drop-shadow">
                      {!owner
                        ? 'Chưa đăng ký khuôn mặt chủ sở hữu • Bấm "Đổi chủ" góc trên hoặc nhập mã PIN'
                        : isTurnedAway
                        ? Math.abs(faceResult.yawAngle) > settings.yawThresholdDeg
                          ? `Bạn đã quay mặt đi (${faceResult.yawAngle}°) • Khóa màn hình`
                          : `Bạn đang cúi/ngẩng đầu (${faceResult.pitchAngle}°) • Khóa màn hình`
                        : isStranger
                        ? `Khuôn mặt chưa khớp (${faceResult.matchScore}% / ${settings.matchThresholdPercent}%) • Khóa an toàn`
                        : isLeaving
                        ? 'Không có người trước màn hình • Đã khóa'
                        : 'Windows Hello Face: Đang tìm kiếm bạn (quét mỗi 500ms)...'}
                    </span>
                    <span className="text-xs text-zinc-300/80 mt-0.5">
                      {!owner
                        ? 'Đăng ký khuôn mặt chính chủ để tính năng tự động mở khóa hoạt động chính xác'
                        : isStranger
                        ? 'Vui lòng nhìn thẳng camera hoặc bấm "Đổi chủ" góc trên để lưu lại'
                        : 'Quay mặt nhìn thẳng vào camera để tự động mở khóa tức thì'}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Big Windows 11 Clock */}
            <h1 className="text-7xl sm:text-8xl font-light tracking-tight text-white drop-shadow-md font-sans">
              {formattedTime}
            </h1>
            <p className="mt-2 text-base sm:text-lg font-normal text-zinc-200 drop-shadow capitalize">
              {formattedDate}
            </p>

            {/* Live Camera Viewfinder HUD (Collapsible) */}
            {showLivePreview && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="mt-6 relative w-64 sm:w-72 aspect-[16/10] rounded-2xl overflow-hidden border border-white/20 bg-black/60 shadow-2xl backdrop-blur-lg p-1.5"
              >
                <div className="relative w-full h-full rounded-xl overflow-hidden bg-black flex items-center justify-center">
                  {stream ? (
                    <CameraStreamView
                      stream={stream}
                      className="w-full h-full object-cover opacity-80"
                    />
                  ) : (
                    <div className="text-xs text-zinc-400 flex flex-col items-center p-4">
                      <div className="animate-spin w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full mb-1.5" />
                      <span>Đang nạp camera...</span>
                    </div>
                  )}

                  {/* Corner brackets */}
                  <div className="absolute inset-0 pointer-events-none p-2.5 flex flex-col justify-between">
                    <div className="flex justify-between">
                      <div
                        className={`w-3.5 h-3.5 border-t-2 border-l-2 transition-colors ${
                          isOwnerVerified ? 'border-emerald-400' : isTurnedAway ? 'border-amber-400' : 'border-cyan-400'
                        }`}
                      />
                      <div
                        className={`w-3.5 h-3.5 border-t-2 border-r-2 transition-colors ${
                          isOwnerVerified ? 'border-emerald-400' : isTurnedAway ? 'border-amber-400' : 'border-cyan-400'
                        }`}
                      />
                    </div>

                    {/* 500ms Laser line */}
                    <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_8px_rgba(34,211,238,0.9)] animate-pulse" />

                    <div className="flex justify-between">
                      <div
                        className={`w-3.5 h-3.5 border-b-2 border-l-2 transition-colors ${
                          isOwnerVerified ? 'border-emerald-400' : isTurnedAway ? 'border-amber-400' : 'border-cyan-400'
                        }`}
                      />
                      <div
                        className={`w-3.5 h-3.5 border-b-2 border-r-2 transition-colors ${
                          isOwnerVerified ? 'border-emerald-400' : isTurnedAway ? 'border-amber-400' : 'border-cyan-400'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Video overlay badges */}
                  <div className="absolute bottom-1.5 left-2 right-2 flex items-center justify-between px-2 py-0.5 rounded bg-black/80 backdrop-blur-sm text-[10px]">
                    <span className="text-cyan-300 font-mono">500ms loop</span>
                    <span className="font-mono text-zinc-300">
                      Góc: {faceResult.yawAngle > 0 ? `+${faceResult.yawAngle}` : faceResult.yawAngle}°
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Click to swipe up hint */}
            <div className="mt-8 flex flex-col items-center animate-bounce text-zinc-300/80 text-xs">
              <ChevronUp className="w-5 h-5 mb-0.5" />
              <span>Nhấn phím hoặc nhấp chuột để mở tùy chọn đăng nhập</span>
            </div>
          </div>
        ) : (
          /* Windows 11 Sign-In Screen with User Avatar & PIN input */
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex flex-col items-center max-w-sm w-full p-6 rounded-3xl bg-black/40 backdrop-blur-2xl border border-white/10 shadow-2xl animate-fadeIn"
          >
            {/* User Avatar */}
            <div className="relative mb-3">
              {owner?.snapshotDataUrl ? (
                <img
                  src={owner.snapshotDataUrl}
                  alt={owner.name}
                  className="w-20 h-20 rounded-full object-cover border-2 border-white/30 shadow-xl"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-cyan-600 to-blue-500 text-white flex items-center justify-center font-bold text-2xl shadow-xl">
                  {owner?.name ? owner.name[0].toUpperCase() : 'U'}
                </div>
              )}
              {/* Windows Hello face badge */}
              <div
                className={`absolute -bottom-1 -right-1 p-1 rounded-full border-2 border-zinc-900 ${
                  isOwnerVerified ? 'bg-emerald-500 text-white' : 'bg-zinc-700 text-zinc-300'
                }`}
                title="Windows Hello Face"
              >
                <ScanFace className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Username */}
            <h2 className="text-xl font-semibold text-white tracking-wide">
              {owner ? owner.name : 'Người Dùng Windows'}
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              {isOwnerVerified
                ? 'Windows Hello: Đã nhận diện khuôn mặt!'
                : 'Đang quét khuôn mặt nền (500ms) hoặc nhập mã PIN'}
            </p>

            {/* PIN Form */}
            <form onSubmit={handlePinSubmit} className="mt-5 w-full space-y-2">
              <div className="relative flex items-center">
                <input
                  type="password"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Mã PIN (Mặc định: 1234)"
                  autoFocus
                  className="w-full bg-black/60 text-center font-mono tracking-widest text-base text-white px-4 py-2.5 rounded-xl border border-white/20 focus:outline-none focus:border-cyan-400 placeholder:text-zinc-500 placeholder:text-xs placeholder:tracking-normal shadow-inner"
                />
                <button
                  type="submit"
                  className="absolute right-1.5 p-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold transition cursor-pointer"
                  title="Xác nhận mã PIN"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {pinError && (
                <p className="text-xs text-red-400 font-medium">
                  Mã PIN không chính xác (mặc định là 1234)
                </p>
              )}
            </form>

            {/* Back button */}
            <div className="mt-4 flex items-center justify-between w-full text-xs text-zinc-400">
              <button
                onClick={() => setShowSignInPrompt(false)}
                className="hover:text-white transition cursor-pointer"
              >
                ← Trở lại màn hình khóa
              </button>

              <button
                onClick={onUnlockManually}
                className="text-cyan-400 hover:underline cursor-pointer"
              >
                Mở khóa ngay
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Windows Lock Screen Bottom Bar: Simulator Tools & Windows Tray */}
      <footer
        onClick={(e) => e.stopPropagation()}
        className="relative z-20 px-6 py-3.5 bg-black/40 backdrop-blur-xl border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-300"
      >
        {/* Left: Native Desktop Guard Status */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 font-medium text-zinc-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-white">FaceLock Desktop Sentinel</span>
            <span className="text-zinc-500">•</span>
            <span className="text-zinc-400">Windows Guard Offline</span>
          </div>

          <div className="hidden md:flex items-center gap-1 text-[11px] text-zinc-400 bg-zinc-900/80 px-2 py-0.5 rounded border border-zinc-800">
            <span>Độ trễ: {lastScanLatency}ms</span>
            <span className="text-zinc-600">|</span>
            <span>Đã quét: {scanCount} lần</span>
          </div>
        </div>

        {/* Right: Windows System Controls & Quick Unlock */}
        <div className="flex items-center gap-4 text-zinc-400">
          <button
            onClick={onUnlockManually}
            className="text-xs text-cyan-400 hover:text-cyan-300 transition cursor-pointer font-medium hover:underline"
          >
            Mở khóa màn hình
          </button>

          <div className="flex items-center gap-2">
            <span title="Wi-Fi: Trực tuyến an toàn"><Wifi className="w-4 h-4 text-zinc-300" /></span>
            <span title="Pin: 100% (Đang cắm sạc)"><Battery className="w-4 h-4 text-zinc-300" /></span>
            <span title="Trợ năng Windows"><Accessibility className="w-4 h-4 text-zinc-300" /></span>
          </div>

          <div className="h-4 w-px bg-zinc-700" />

          <button
            onClick={() => {
              sounds.playLock();
              if (window.electronAPI?.isElectron) {
                window.electronAPI.lockWindows().catch(() => {});
              }
            }}
            className="p-1 rounded-full hover:bg-white/10 text-zinc-300 hover:text-white transition cursor-pointer"
            title="Khóa máy trạm Windows ngay (LockWorkStation)"
          >
            <Power className="w-4 h-4" />
          </button>
        </div>
      </footer>
    </div>
  );
};
