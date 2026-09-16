export interface FaceKeypoint {
  x: number;
  y: number;
  z?: number;
  name?: string;
}

export interface FaceDetectionResult {
  detected: boolean;
  confidence: number;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  landmarks?: {
    leftEye: { x: number; y: number };
    rightEye: { x: number; y: number };
    noseTip: { x: number; y: number };
    mouthCenter: { x: number; y: number };
    leftEar?: { x: number; y: number };
    rightEar?: { x: number; y: number };
  };
  // Pose angles in degrees
  yawAngle: number; // Left/right turn: 0 is centered, < -20 is turned left, > 20 is turned right
  pitchAngle: number; // Up/down: 0 is level, < -15 is down, > 15 is up
  rollAngle: number;
  isFacingScreen: boolean; // True if yaw and pitch within normal forward-facing tolerances
  distanceRatio: number; // Approximate face area ratio relative to frame (0 to 1)
  isSittingInFront: boolean; // True if within valid distance (e.g. 0.08 to 0.70)
  matchScore: number; // 0 to 100% match with registered owner
  isMatchedOwner: boolean; // True if matchScore >= threshold
  reason?: string; // e.g. "Đang nhìn thẳng", "Đã quay mặt đi", "Không thấy người dùng", "Không khớp chủ sở hữu"
}

export interface OwnerProfile {
  id: string;
  name: string;
  enrolledAt: string;
  snapshotDataUrl: string;
  // Biometric signature
  faceSignature: {
    eyeDistanceRatio: number; // eyeDistance / faceWidth
    noseToMouthRatio: number;
    aspectRatio: number; // faceWidth / faceHeight
    colorSignature: number[]; // R, G, B average in face region
    landmarkVector?: number[];
  };
}

export interface ScanAuditLog {
  id: string;
  timestamp: Date;
  status: 'unlocked' | 'locked' | 'warning';
  action: 'unlock' | 'lock' | 'maintain_unlock' | 'maintain_lock';
  detected: boolean;
  isFacingScreen: boolean;
  isMatchedOwner: boolean;
  yawAngle: number;
  distanceRatio: number;
  matchScore: number;
  latencyMs: number;
  reason: string;
}

export interface GuardSettings {
  scanFrequencyMs: number; // Fixed at 500ms per user prompt requirement
  yawThresholdDeg: number; // Max allowed head turn before locking (default: 30)
  pitchThresholdDeg: number; // Max allowed head tilt up/down (default: 35)
  minFaceDistanceRatio: number; // Min face size in frame (default: 0.05)
  matchThresholdPercent: number; // Minimum match score for owner (default: 50)
  soundEnabled: boolean;
  autoLockDelayMs: number; // Immediate lock
  simulatedState: 'live' | 'simulate_turned_away' | 'simulate_left_screen' | 'simulate_stranger';
  // Optimization & Floating Bubble Settings
  isGuardEnabled: boolean; // Master ON/OFF toggle
  adaptiveDutyCycle: boolean; // Adaptive scan rate: 500ms when locked/alert, 1000ms when unlocked (50% CPU & Battery savings)
  gracePeriodMs: number; // 1500ms grace period buffer for drinking water/looking at keyboard
  lightingNormalization: boolean; // Ambient light & contrast normalization
  floatingBubbleEnabled: boolean; // Show draggable floating bubble
  floatingBubbleDetached: boolean; // Detached outside application window onto desktop
  snoozeUntil: number | null; // Timestamp until snooze ends
}

export interface ElectronAPI {
  isElectron: boolean;
  lockWindows: () => Promise<{ success: boolean; message?: string }>;
  minimizeToTray: () => void;
  showWindow: () => void;
  closeApp: () => void;

  // Independent Floating Desktop Bubble (Bóng nổi thoát ra ngoài Desktop)
  showDesktopBubble: () => void;
  hideDesktopBubble: () => void;
  sendBubbleAction: (action: string, payload?: unknown) => void;
  onBubbleAction: (callback: (action: string, payload?: unknown) => void) => () => void;
  syncBubbleState: (state: unknown) => void;
  onBubbleStateUpdate: (callback: (state: unknown) => void) => () => void;
  onBubbleClosed: (callback: () => void) => () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
