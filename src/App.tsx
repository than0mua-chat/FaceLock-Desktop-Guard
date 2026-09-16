import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  FaceDetectionResult,
  OwnerProfile,
  GuardSettings,
  ScanAuditLog,
} from './types';
import {
  initFaceDetector,
  analyzeFrame,
  createOwnerProfile,
} from './utils/faceEngine';
import { sounds } from './utils/audio';
import { LockScreen } from './components/LockScreen';
import { DesktopWorkspace } from './components/DesktopWorkspace';
import { EnrollmentModal } from './components/EnrollmentModal';
import { FloatingBubble } from './components/FloatingBubble';
import { Camera, AlertCircle } from 'lucide-react';

const DEFAULT_SETTINGS: GuardSettings = {
  scanFrequencyMs: 500, // Strict 500ms scanning interval per prompt
  yawThresholdDeg: 30, // Natural comfortable head tilt tolerance
  pitchThresholdDeg: 35, // Natural comfortable laptop screen pitch tolerance
  minFaceDistanceRatio: 0.05, // Realistic distance ratio for laptop webcams
  matchThresholdPercent: 50, // Calibrated threshold for owner verification
  soundEnabled: true,
  autoLockDelayMs: 0,
  simulatedState: 'live',
  isGuardEnabled: true,
  adaptiveDutyCycle: true,
  gracePeriodMs: 1500,
  lightingNormalization: true,
  floatingBubbleEnabled: true,
  floatingBubbleDetached: false,
  snoozeUntil: null,
};

const INITIAL_FACE_RESULT: FaceDetectionResult = {
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
  reason: 'Khởi động cảm biến thị giác...',
};

export default function App() {
  const [isLocked, setIsLocked] = useState<boolean>(true);
  const [owner, setOwner] = useState<OwnerProfile | null>(null);
  const [settings, setSettings] = useState<GuardSettings>(DEFAULT_SETTINGS);
  const [faceResult, setFaceResult] = useState<FaceDetectionResult>(INITIAL_FACE_RESULT);
  const [auditLogs, setAuditLogs] = useState<ScanAuditLog[]>([]);
  const [scanCount, setScanCount] = useState<number>(0);
  const [lastScanLatency, setLastScanLatency] = useState<number>(0);
  const [isEnrollmentOpen, setIsEnrollmentOpen] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraReady, setIsCameraReady] = useState<boolean>(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [unlockNotification, setUnlockNotification] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fallbackCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const scanIntervalRef = useRef<number | null>(null);
  const consecutiveAwayCountRef = useRef<number>(0);
  const consecutiveUnlockMatchCountRef = useRef<number>(0);
  const awayStartTimeRef = useRef<number | null>(null);
  const isLockedRef = useRef<boolean>(isLocked);

  useEffect(() => {
    isLockedRef.current = isLocked;
  }, [isLocked]);

  // Load saved owner profile and settings from localStorage
  useEffect(() => {
    try {
      const savedOwner = localStorage.getItem('facelock_owner_profile');
      if (savedOwner) {
        setOwner(JSON.parse(savedOwner));
      }
      const savedSettings = localStorage.getItem('facelock_guard_settings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setSettings((prev) => ({
          ...prev,
          ...parsed,
          pitchThresholdDeg: Math.max(35, parsed.pitchThresholdDeg || 35),
          yawThresholdDeg: Math.max(30, parsed.yawThresholdDeg || 30),
          minFaceDistanceRatio: Math.min(0.05, parsed.minFaceDistanceRatio || 0.05),
          matchThresholdPercent: Math.min(55, parsed.matchThresholdPercent || 50),
        }));
      }
    } catch {
      // Storage unavailable or parsing error ignored
    }
  }, []);

  // Sync sound manager enabled state
  useEffect(() => {
    sounds.enabled = settings.soundEnabled;
    try {
      localStorage.setItem('facelock_guard_settings', JSON.stringify(settings));
    } catch {
      // Ignore
    }
  }, [settings]);

  // Request Camera Stream
  useEffect(() => {
    let activeStream: MediaStream | null = null;

    async function startCamera() {
      try {
        setCameraError(null);
        activeStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user',
          },
          audio: false,
        });

        setMediaStream(activeStream);

        if (videoRef.current) {
          videoRef.current.srcObject = activeStream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().catch(() => {});
            setIsCameraReady(true);
          };
        }

        // Initialize MediaPipe asynchronously
        initFaceDetector().catch(() => {});
      } catch (err: unknown) {
        const error = err as Error;
        console.warn('Camera access issue:', error);
        setCameraError(
          error.name === 'NotAllowedError'
            ? 'Quyền truy cập webcam bị từ chối. Vui lòng cho phép truy cập camera trong trình duyệt hoặc ứng dụng.'
            : 'Không tìm thấy camera hoặc camera đang được sử dụng bởi ứng dụng khác. Bạn có thể sử dụng các nút mô phỏng hoặc chọn ảnh.'
        );
      }
    }

    startCamera();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Continuously ensure videoRef is attached to mediaStream and actively playing
  useEffect(() => {
    if (videoRef.current && mediaStream) {
      if (videoRef.current.srcObject !== mediaStream) {
        videoRef.current.srcObject = mediaStream;
      }
      videoRef.current.play().catch(() => {});
    }
  }, [mediaStream]);

  // Update Settings helper
  const handleUpdateSettings = useCallback((newSettings: Partial<GuardSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  }, []);

  // Face Enrollment
  const handleEnrollOwner = useCallback(
    (name: string, customSnapshot?: string) => {
      const video = videoRef.current;
      const newOwner = createOwnerProfile(name, video, faceResult, customSnapshot);
      setOwner(newOwner);
      try {
        localStorage.setItem('facelock_owner_profile', JSON.stringify(newOwner));
      } catch {
        // Ignore
      }
    },
    [faceResult]
  );

  // Manual Unlock & Lock
  const handleManualUnlock = useCallback(() => {
    sounds.playUnlock();
    setIsLocked(false);
  }, []);

  const handleManualLock = useCallback(() => {
    sounds.playLock();
    setIsLocked(true);
    if (window.electronAPI?.isElectron) {
      window.electronAPI.lockWindows().catch(() => {});
    }
  }, []);

  // Global Windows Lock Shortcut: Win + L or Alt + L
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey && e.key.toLowerCase() === 'l') || (e.altKey && e.key.toLowerCase() === 'l')) {
        e.preventDefault();
        sounds.playLock();
        setIsLocked(true);
        if (window.electronAPI?.isElectron) {
          window.electronAPI.lockWindows().catch(() => {});
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Listen for actions dispatched from independent desktop floating bubble (Electron)
  useEffect(() => {
    if (window.electronAPI) {
      const unsubAction = window.electronAPI.onBubbleAction((action) => {
        if (action === 'lock') {
          handleManualLock();
        } else if (action === 'toggle_guard') {
          setSettings((prev) => {
            const now = Date.now();
            const isSnoozed = prev.snoozeUntil !== null && prev.snoozeUntil > now;
            if (isSnoozed) {
              return { ...prev, snoozeUntil: null, isGuardEnabled: true };
            }
            return { ...prev, isGuardEnabled: !prev.isGuardEnabled };
          });
        } else if (action === 'snooze_10m') {
          setSettings((prev) => ({
            ...prev,
            snoozeUntil: Date.now() + 10 * 60 * 1000,
            isGuardEnabled: true,
          }));
        } else if (action === 'restore') {
          window.electronAPI?.showWindow();
        }
      });

      const unsubClosed = window.electronAPI.onBubbleClosed(() => {
        setSettings((prev) => ({ ...prev, floatingBubbleDetached: false }));
      });

      return () => {
        unsubAction();
        unsubClosed();
      };
    }
  }, [handleManualLock]);

  // Intelligent Scanning Loop with Adaptive Duty Cycle & Grace Period
  useEffect(() => {
    let isCancelled = false;
    let timerId: number | null = null;

    const performScanCycle = async (): Promise<number> => {
      const video = videoRef.current;
      const fallbackCanvas = fallbackCanvasRef.current;
      if (!fallbackCanvas || isCancelled) return 500;

      // Keep master video stream attached and unpaused
      if (video) {
        if (mediaStream && video.srcObject !== mediaStream) {
          video.srcObject = mediaStream;
        }
        if (video.paused) {
          video.play().catch(() => {});
        }
      }

      const now = Date.now();
      const isSnoozed = settings.snoozeUntil !== null && settings.snoozeUntil > now;
      const isGuardActive = settings.isGuardEnabled !== false && !isSnoozed;

      // When guard is turned OFF or Snoozed, run minimal heartbeat (2000ms) to save 100% CPU & battery
      if (!isGuardActive) {
        setFaceResult((prev) => ({
          ...prev,
          reason: isSnoozed ? 'Đang tạm dừng bảo vệ' : 'Bảo vệ đang TẮT (Tiết kiệm CPU & Pin)',
        }));
        return 2000;
      }

      const startTime = performance.now();

      // Analyze face in current frame
      const result = await analyzeFrame(
        video || (document.createElement('video') as HTMLVideoElement),
        fallbackCanvas,
        owner,
        settings
      );

      const latency = Math.round(performance.now() - startTime);
      setLastScanLatency(latency);
      setScanCount((prev) => prev + 1);

      // Evaluate Lock/Unlock Logic
      const currentLocked = isLockedRef.current;
      const threshold = settings.matchThresholdPercent || 50;

      // Posture and identity validation
      const isAngleTolerant =
        Math.abs(result.yawAngle) <= (settings.yawThresholdDeg + 10) &&
        Math.abs(result.pitchAngle) <= (settings.pitchThresholdDeg + 10);

      // Require enrolled owner AND verified biometric match strictly >= threshold
      const isOwnerMatched =
        Boolean(owner) &&
        result.detected &&
        result.isMatchedOwner &&
        result.matchScore >= threshold;

      const isOwnerValidToUnlock =
        isOwnerMatched &&
        result.isSittingInFront &&
        isAngleTolerant;

      let nextLocked = currentLocked;
      let auditAction: ScanAuditLog['action'] = 'maintain_lock';
      let nextDelayMs = 500;

      if (currentLocked) {
        // If currently locked:
        // Must strictly meet all biometric conditions:
        // - Enrolled owner present
        // - matchScore >= matchThresholdPercent (e.g. 50%)
        // - Sitting in front and facing camera
        // If score is solidly above threshold (>= threshold + 8) or 2 consecutive scans >= threshold: unlock!
        // Scores below threshold (e.g. 26%) can NEVER unlock.
        if (isOwnerValidToUnlock) {
          consecutiveUnlockMatchCountRef.current += 1;
          if (result.matchScore >= (threshold + 8) || consecutiveUnlockMatchCountRef.current >= 2) {
            nextLocked = false;
            consecutiveUnlockMatchCountRef.current = 0;
            consecutiveAwayCountRef.current = 0;
            awayStartTimeRef.current = null;
            auditAction = 'unlock';
            sounds.playUnlock();
            setUnlockNotification(
              `Đã nhận diện: ${owner?.name || 'Chủ sở hữu'} (${result.matchScore}%) • Mở khóa màn hình!`
            );
            setTimeout(() => setUnlockNotification(null), 4500);
            nextDelayMs = 500;
          } else {
            // First verified scan near borderline threshold: schedule quick confirmation scan
            nextLocked = true;
            auditAction = 'maintain_lock';
            nextDelayMs = 250;
          }
        } else {
          // If score is below threshold (e.g. 26%) or face not matching: reset count and strictly stay locked!
          consecutiveUnlockMatchCountRef.current = 0;
          nextLocked = true;
          auditAction = 'maintain_lock';
          nextDelayMs = settings.scanFrequencyMs || 500;
        }
      } else {
        // If currently unlocked:
        const hasLeftCamera = !result.detected;
        const hasMovedFar = !result.isSittingInFront;
        const isUnknownPerson =
          Boolean(owner) &&
          result.detected &&
          result.isSittingInFront &&
          (!result.isMatchedOwner || result.matchScore < threshold);
        const hasTurnedAway =
          result.detected &&
          result.isSittingInFront &&
          isOwnerMatched &&
          !result.isFacingScreen;

        if (hasLeftCamera) {
          // Walked away from camera: lock immediately!
          awayStartTimeRef.current = null;
          consecutiveAwayCountRef.current += 1;
          nextLocked = true;
          auditAction = 'lock';
          sounds.playLock();
          if (window.electronAPI?.isElectron) {
            window.electronAPI.lockWindows().catch(() => {});
          }
          nextDelayMs = 500;
        } else if (isUnknownPerson) {
          // Stranger / mismatched face (score < threshold, e.g. 26%) sitting in front: lock immediately!
          awayStartTimeRef.current = null;
          consecutiveAwayCountRef.current += 1;
          nextLocked = true;
          auditAction = 'lock';
          sounds.playLock();
          if (window.electronAPI?.isElectron) {
            window.electronAPI.lockWindows().catch(() => {});
          }
          nextDelayMs = 500;
        } else if (hasTurnedAway || hasMovedFar) {
          // User is still present, but turned head away, drinking water, or looking at keyboard
          const graceLimit = settings.gracePeriodMs ?? 1500;
          if (graceLimit > 0) {
            if (awayStartTimeRef.current === null) {
              awayStartTimeRef.current = now;
            }
            const elapsed = now - awayStartTimeRef.current;
            if (elapsed >= graceLimit) {
              // Grace period expired: lock now!
              nextLocked = true;
              auditAction = 'lock';
              sounds.playLock();
              if (window.electronAPI?.isElectron) {
                window.electronAPI.lockWindows().catch(() => {});
              }
              nextDelayMs = 500;
            } else {
              // In grace period: maintain unlocked with visual grace countdown
              nextLocked = false;
              auditAction = 'maintain_unlock';
              const remainingSec = Math.max(0.1, Math.round((graceLimit - elapsed) / 100) / 10);
              result.reason = `${result.reason} (Vùng đệm: còn ${remainingSec}s)`;
              nextDelayMs = 400;
            }
          } else {
            // No grace period: lock immediately
            nextLocked = true;
            auditAction = 'lock';
            sounds.playLock();
            if (window.electronAPI?.isElectron) {
              window.electronAPI.lockWindows().catch(() => {});
            }
            nextDelayMs = 500;
          }
        } else {
          // Valid owner looking straight ahead
          awayStartTimeRef.current = null;
          consecutiveAwayCountRef.current = 0;
          nextLocked = false;
          auditAction = 'maintain_unlock';

          // Adaptive duty cycle: When comfortably working and unlocked,
          // scan at 1000ms to reduce CPU & camera heat by 50%!
          if (settings.adaptiveDutyCycle) {
            nextDelayMs = 1000;
          } else {
            nextDelayMs = settings.scanFrequencyMs || 500;
          }
        }
      }

      setFaceResult(result);

      // Commit lock state transition
      if (nextLocked !== currentLocked) {
        setIsLocked(nextLocked);
        isLockedRef.current = nextLocked;
      }

      // Sync state to independent desktop floating bubble (Electron)
      if (window.electronAPI) {
        window.electronAPI.syncBubbleState({
          isLocked: nextLocked,
          faceResult: result,
          owner,
          settings,
        });
      }

      // Add to audit logs
      setAuditLogs((prevLogs) => {
        const newEntry: ScanAuditLog = {
          id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          timestamp: new Date(),
          status: !nextLocked ? 'unlocked' : auditAction === 'lock' ? 'warning' : 'locked',
          action: auditAction,
          detected: result.detected,
          isFacingScreen: result.isFacingScreen,
          isMatchedOwner: result.isMatchedOwner,
          yawAngle: result.yawAngle,
          distanceRatio: result.distanceRatio,
          matchScore: result.matchScore,
          latencyMs: latency,
          reason: result.reason || (nextLocked ? 'Đã khóa màn hình' : 'Mở màn hình'),
        };
        return [newEntry, ...prevLogs.slice(0, 49)];
      });

      return nextDelayMs;
    };

    const runLoop = async () => {
      if (isCancelled) return;
      let delay = 500;
      try {
        delay = await performScanCycle();
      } catch (err) {
        console.warn('Scan loop iteration exception:', err);
      }
      if (!isCancelled) {
        timerId = window.setTimeout(runLoop, delay);
      }
    };

    timerId = window.setTimeout(runLoop, 200);

    return () => {
      isCancelled = true;
      if (timerId !== null) {
        clearTimeout(timerId);
      }
    };
  }, [owner, settings, mediaStream]);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-zinc-950 font-sans text-zinc-100">
      {/* Master Video & Fallback Canvas for frame analysis (positioned safely to maintain active hardware rendering pipeline) */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="pointer-events-none fixed -bottom-10 -right-10 w-24 h-24 opacity-10 z-0"
      />
      <canvas
        ref={fallbackCanvasRef}
        className="pointer-events-none fixed -bottom-10 -right-10 w-24 h-24 opacity-0 z-0"
      />

      {/* Floating Windows Hello Unlock Notification Toast */}
      {unlockNotification && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] animate-bounce flex items-center gap-3 px-5 py-3 rounded-2xl bg-emerald-600/95 border border-emerald-400 text-white shadow-2xl backdrop-blur-xl">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
            <span className="text-lg font-bold">✓</span>
          </div>
          <div>
            <p className="text-[11px] font-bold tracking-wide uppercase text-emerald-200">
              Windows Hello Guard
            </p>
            <p className="text-sm font-semibold text-white">{unlockNotification}</p>
          </div>
        </div>
      )}

      {/* Camera Permission Alert Banner (if error occurs) */}
      {cameraError && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 max-w-xl w-full mx-4 rounded-xl bg-amber-950/90 border border-amber-500/50 p-3.5 shadow-2xl flex items-start gap-3 backdrop-blur-md">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-200">
            <p className="font-semibold text-amber-100">Thông báo Camera</p>
            <p className="mt-0.5 text-amber-300/90">{cameraError}</p>
          </div>
          <button
            onClick={() => setCameraError(null)}
            className="ml-auto text-amber-400 hover:text-white text-xs px-2 py-1 rounded bg-amber-900/50 cursor-pointer"
          >
            Đã hiểu
          </button>
        </div>
      )}

      {/* Active Screen: Lock Screen or Unlocked Desktop Workspace */}
      {isLocked ? (
        <LockScreen
          isLocked={isLocked}
          faceResult={faceResult}
          owner={owner}
          settings={settings}
          stream={mediaStream}
          scanCount={scanCount}
          lastScanLatency={lastScanLatency}
          onUnlockManually={handleManualUnlock}
          onOpenEnrollment={() => setIsEnrollmentOpen(true)}
          onUpdateSettings={handleUpdateSettings}
        />
      ) : (
        <DesktopWorkspace
          faceResult={faceResult}
          owner={owner}
          settings={settings}
          auditLogs={auditLogs}
          scanCount={scanCount}
          lastScanLatency={lastScanLatency}
          onLockScreen={handleManualLock}
          onOpenEnrollment={() => setIsEnrollmentOpen(true)}
          onUpdateSettings={handleUpdateSettings}
          onClearLogs={() => setAuditLogs([])}
          stream={mediaStream}
        />
      )}

      {/* Owner Face Registration Modal */}
      <EnrollmentModal
        isOpen={isEnrollmentOpen}
        onClose={() => setIsEnrollmentOpen(false)}
        stream={mediaStream}
        currentFaceResult={faceResult}
        onEnroll={handleEnrollOwner}
      />

      {/* Floating Quick-Access Bubble (Bóng nổi bật tắt nhanh ứng dụng) */}
      {!isLocked && settings.floatingBubbleEnabled !== false && (
        <FloatingBubble
          faceResult={faceResult}
          owner={owner}
          settings={settings}
          stream={mediaStream}
          isLocked={isLocked}
          onLockScreen={handleManualLock}
          onRestoreApp={() => {
            // Already in desktop workspace
          }}
          onUpdateSettings={handleUpdateSettings}
        />
      )}
    </div>
  );
}
