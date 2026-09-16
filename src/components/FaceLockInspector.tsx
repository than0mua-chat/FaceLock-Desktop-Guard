import React, { useEffect, useRef } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Camera,
  Compass,
  Activity,
  UserCheck,
  Sliders,
  History,
  Lock,
  Volume2,
  VolumeX,
  RefreshCw,
  Eye,
} from 'lucide-react';
import {
  FaceDetectionResult,
  OwnerProfile,
  GuardSettings,
  ScanAuditLog,
} from '../types';
import { CameraStreamView } from './CameraStreamView';

interface FaceLockInspectorProps {
  faceResult: FaceDetectionResult;
  owner: OwnerProfile | null;
  settings: GuardSettings;
  auditLogs: ScanAuditLog[];
  scanCount: number;
  lastScanLatency: number;
  onOpenEnrollment: () => void;
  onLockScreen: () => void;
  onUpdateSettings: (newSettings: Partial<GuardSettings>) => void;
  onClearLogs: () => void;
  stream: MediaStream | null;
}

export const FaceLockInspector: React.FC<FaceLockInspectorProps> = ({
  faceResult,
  owner,
  settings,
  auditLogs,
  scanCount,
  lastScanLatency,
  onOpenEnrollment,
  onLockScreen,
  onUpdateSettings,
  onClearLogs,
  stream,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Draw detection bounding box & landmarks on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 640;
    const height = 480;
    canvas.width = width;
    canvas.height = height;

    ctx.clearRect(0, 0, width, height);

    if (faceResult.detected && faceResult.boundingBox) {
      const b = faceResult.boundingBox;
      const screenX = width - (b.x + b.width);
      const screenY = b.y;
      const screenW = b.width;
      const screenH = b.height;

      const isOk =
        faceResult.isFacingScreen &&
        faceResult.isSittingInFront &&
        faceResult.isMatchedOwner;

      // Color code based on status
      const strokeColor = isOk
        ? '#10b981' // emerald green
        : !faceResult.isFacingScreen
        ? '#f59e0b' // amber
        : '#ef4444'; // red

      // Bounding box with rounded corners
      ctx.lineWidth = 3;
      ctx.strokeStyle = strokeColor;
      ctx.fillStyle = isOk ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)';

      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(screenX, screenY, screenW, screenH, 12);
      } else {
        ctx.rect(screenX, screenY, screenW, screenH);
      }
      ctx.fill();
      ctx.stroke();

      // Corner target brackets
      const bracketLen = 20;
      ctx.lineWidth = 4;
      ctx.strokeStyle = strokeColor;

      // Top-left
      ctx.beginPath();
      ctx.moveTo(screenX, screenY + bracketLen);
      ctx.lineTo(screenX, screenY);
      ctx.lineTo(screenX + bracketLen, screenY);
      ctx.stroke();

      // Top-right
      ctx.beginPath();
      ctx.moveTo(screenX + screenW - bracketLen, screenY);
      ctx.lineTo(screenX + screenW, screenY);
      ctx.lineTo(screenX + screenW, screenY + bracketLen);
      ctx.stroke();

      // Bottom-left
      ctx.beginPath();
      ctx.moveTo(screenX, screenY + screenH - bracketLen);
      ctx.lineTo(screenX, screenY + screenH);
      ctx.lineTo(screenX + bracketLen, screenY + screenH);
      ctx.stroke();

      // Bottom-right
      ctx.beginPath();
      ctx.moveTo(screenX + screenW - bracketLen, screenY + screenH);
      ctx.lineTo(screenX + screenW, screenY + screenH);
      ctx.lineTo(screenX + screenW, screenY + screenH - bracketLen);
      ctx.stroke();

      // Landmarks dots (mirrored horizontally)
      if (faceResult.landmarks) {
        const lm = faceResult.landmarks;
        const drawDot = (pt: { x: number; y: number }, color: string) => {
          ctx.beginPath();
          ctx.arc(width - pt.x, pt.y, 4, 0, 2 * Math.PI);
          ctx.fillStyle = color;
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        };

        drawDot(lm.leftEye, '#38bdf8');
        drawDot(lm.rightEye, '#38bdf8');
        drawDot(lm.noseTip, '#fbbf24');
        drawDot(lm.mouthCenter, '#f43f5e');

        // Orientation ray from nose (mirrored angle)
        const noseX = width - lm.noseTip.x;
        const noseY = lm.noseTip.y;
        ctx.beginPath();
        ctx.moveTo(noseX, noseY);
        const rayLen = 50;
        // Invert yaw direction for mirrored webcam perspective
        const rad = (-faceResult.yawAngle * Math.PI) / 180;
        ctx.lineTo(
          noseX + Math.sin(rad) * rayLen,
          noseY - Math.cos(rad) * 10
        );
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }

      // Tag label above face (drawn cleanly from left to right, un-mirrored)
      ctx.font = 'bold 13px sans-serif';
      const label = isOk
        ? `✓ ${owner?.name || 'Chủ sở hữu'} (${faceResult.matchScore}%)`
        : !faceResult.isFacingScreen
        ? `⚠ Quay mặt đi: ${faceResult.yawAngle}°`
        : `✕ Người lạ (${faceResult.matchScore}%)`;

      const textWidth = ctx.measureText(label).width;
      const labelX = Math.max(6, Math.min(width - textWidth - 20, screenX));
      const labelY = Math.max(26, screenY - 10);

      ctx.fillStyle = 'rgba(9, 9, 11, 0.85)';
      ctx.fillRect(labelX, labelY - 20, textWidth + 18, 24);

      ctx.fillStyle = strokeColor;
      ctx.fillText(label, labelX + 9, labelY - 4);
    }
  }, [faceResult, owner]);

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-100 overflow-y-auto">
      {/* Header bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/60 sticky top-0 z-20 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-white flex items-center gap-2">
              FaceLock Sentinel Engine
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                ACTIVE
              </span>
            </h2>
            <p className="text-xs text-zinc-400">
              Quét định kỳ 500ms • Nhận diện khuôn mặt & phát hiện quay mặt tức thì
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              onUpdateSettings({ soundEnabled: !settings.soundEnabled })
            }
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-800 text-xs text-zinc-300 hover:bg-zinc-700 transition"
          >
            {settings.soundEnabled ? (
              <>
                <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Âm thanh Bật</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5 text-zinc-500" />
                <span>Âm thanh Tắt</span>
              </>
            )}
          </button>

          <button
            onClick={onLockScreen}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600/80 hover:bg-red-600 text-white font-medium text-xs shadow-md transition cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Khóa Màn Hình Ngay</span>
          </button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: 500ms Scan Pulse */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 relative overflow-hidden">
            <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
              <span className="flex items-center gap-1.5 font-medium">
                <Activity className="w-4 h-4 text-cyan-400" />
                Tần Suất Quét
              </span>
              <span className="font-mono text-cyan-400 font-bold">500 ms</span>
            </div>
            <div className="text-2xl font-bold font-mono text-white flex items-baseline gap-2">
              #{scanCount.toLocaleString()}
              <span className="text-xs font-normal text-zinc-500">lần quét</span>
            </div>
            {/* Animated 500ms cycle bar */}
            <div className="mt-3 w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-full animate-[pulse_0.5s_ease-in-out_infinite]" />
            </div>
            <div className="mt-2 flex justify-between text-[11px] text-zinc-500 font-mono">
              <span>Độ trễ: {lastScanLatency}ms</span>
              <span className="text-emerald-400">Thời gian thực</span>
            </div>
          </div>

          {/* Card 2: Head Yaw Angle */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
            <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
              <span className="flex items-center gap-1.5 font-medium">
                <Compass className="w-4 h-4 text-amber-400" />
                Góc Quay Đầu (Yaw)
              </span>
              <span
                className={`font-mono font-bold text-xs px-2 py-0.5 rounded ${
                  faceResult.isFacingScreen
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-amber-500/20 text-amber-400'
                }`}
              >
                {faceResult.isFacingScreen ? 'Nhìn Thẳng' : 'Đã Quay Đi'}
              </span>
            </div>
            <div className="text-2xl font-bold font-mono text-white flex items-baseline gap-2">
              {faceResult.yawAngle > 0 ? `+${faceResult.yawAngle}` : faceResult.yawAngle}°
              <span className="text-xs font-normal text-zinc-500">
                (Ngưỡng: ±{settings.yawThresholdDeg}°)
              </span>
            </div>
            {/* Yaw gauge meter */}
            <div className="mt-3 relative w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  faceResult.isFacingScreen ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
                style={{
                  width: `${Math.min(100, Math.max(10, Math.abs(faceResult.yawAngle) * 2))}%`,
                  marginLeft: faceResult.yawAngle < 0 ? 'auto' : '0',
                }}
              />
            </div>
            <div className="mt-2 text-[11px] text-zinc-400 flex justify-between">
              <span>Quay trái</span>
              <span className="text-zinc-500">0° (Trực diện)</span>
              <span>Quay phải</span>
            </div>
          </div>

          {/* Card 3: User Match Score */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
            <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
              <span className="flex items-center gap-1.5 font-medium">
                <UserCheck className="w-4 h-4 text-emerald-400" />
                Khớp Chủ Sở Hữu
              </span>
              <span
                className={`font-mono font-bold text-xs px-2 py-0.5 rounded ${
                  faceResult.isMatchedOwner
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-red-500/20 text-red-400'
                }`}
              >
                {faceResult.isMatchedOwner ? 'Trùng Khớp' : 'Không Khớp'}
              </span>
            </div>
            <div className="text-2xl font-bold font-mono text-white flex items-baseline gap-2">
              {faceResult.matchScore}%
              <span className="text-xs font-normal text-zinc-500">
                (Cần: &ge;{settings.matchThresholdPercent}%)
              </span>
            </div>
            <div className="mt-3 w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  faceResult.isMatchedOwner ? 'bg-emerald-500' : 'bg-red-500'
                }`}
                style={{ width: `${faceResult.matchScore}%` }}
              />
            </div>
            <div className="mt-2 text-[11px] text-zinc-400 truncate">
              Chủ sở hữu: <strong>{owner?.name || 'Chưa đăng ký'}</strong>
            </div>
          </div>

          {/* Card 4: Distance & Presence */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
            <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
              <span className="flex items-center gap-1.5 font-medium">
                <Eye className="w-4 h-4 text-indigo-400" />
                Vị Trí Trước Màn Hình
              </span>
              <span
                className={`font-mono font-bold text-xs px-2 py-0.5 rounded ${
                  faceResult.isSittingInFront
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-red-500/20 text-red-400'
                }`}
              >
                {faceResult.isSittingInFront ? 'Đang Ngồi' : 'Đã Rời Đi'}
              </span>
            </div>
            <div className="text-2xl font-bold font-mono text-white flex items-baseline gap-2">
              {Math.round(faceResult.distanceRatio * 100)}%
              <span className="text-xs font-normal text-zinc-500">diện tích</span>
            </div>
            <div className="mt-3 w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, faceResult.distanceRatio * 250)}%` }}
              />
            </div>
            <div className="mt-2 text-[11px] text-zinc-400 truncate">
              {faceResult.reason || 'Sẵn sàng nhận diện'}
            </div>
          </div>
        </div>

        {/* Middle Section: Live Camera + Canvas Overlay + Owner Card */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video & AI Canvas Overlay (2 cols) */}
          <div className="lg:col-span-2 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-cyan-400" />
                <h3 className="font-semibold text-sm text-white">
                  Khung Hình Thị Giác Trực Tiếp
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 text-xs text-zinc-400 bg-zinc-800/80 px-2.5 py-1 rounded-lg border border-zinc-700">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                  Live HUD
                </span>
              </div>
            </div>

            {/* Video Viewport Container */}
            <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black border border-zinc-800 flex items-center justify-center">
              {/* Actual Video */}
              <CameraStreamView
                stream={stream}
                className="absolute inset-0 w-full h-full object-cover opacity-90"
              />

              {/* Bounding Box Canvas Overlay (no CSS scale flip so labels are rendered correctly forward) */}
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              />

              {/* Status Badge in bottom corner */}
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between p-2 rounded-lg bg-black/80 backdrop-blur-md border border-zinc-800 text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      faceResult.isFacingScreen && faceResult.isMatchedOwner
                        ? 'bg-emerald-400'
                        : 'bg-red-400'
                    }`}
                  />
                  <span className="text-zinc-300 font-medium">
                    {faceResult.reason || 'Đang giám sát'}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] font-mono text-zinc-400">
                  <span>Pitch: {faceResult.pitchAngle}°</span>
                  <span>Roll: {faceResult.rollAngle}°</span>
                  <span>Confidence: {Math.round(faceResult.confidence * 100)}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Side: Owner Biometrics & Threshold Settings */}
          <div className="space-y-6 flex flex-col justify-between">
            {/* Owner Profile Card */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-sm text-white flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                  Hồ Sơ Chủ Sở Hữu
                </h3>
                <button
                  onClick={onOpenEnrollment}
                  className="text-xs text-cyan-400 hover:text-cyan-300 transition flex items-center gap-1 font-medium cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  Đăng ký lại
                </button>
              </div>

              {owner ? (
                <div className="flex items-start gap-4">
                  <div className="relative">
                    <img
                      src={owner.snapshotDataUrl}
                      alt={owner.name}
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-500/40 shadow-lg"
                    />
                    <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-black">
                      <ShieldCheck className="w-3.5 h-3.5" />
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-white text-base truncate">
                      {owner.name}
                    </h4>
                    <p className="text-xs text-zinc-400">
                      Đăng ký lúc: {owner.enrolledAt}
                    </p>
                    <div className="mt-2 text-[11px] text-zinc-400 bg-zinc-800/60 rounded-lg p-2 border border-zinc-800 space-y-0.5 font-mono">
                      <div>Tỷ lệ mắt: {owner.faceSignature.eyeDistanceRatio.toFixed(2)}</div>
                      <div>Tỷ lệ khung mặt: {owner.faceSignature.aspectRatio.toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-xs text-zinc-400 mb-3">
                    Chưa có hồ sơ chủ sở hữu. Hãy đăng ký để phân biệt bạn với người lạ!
                  </p>
                  <button
                    onClick={onOpenEnrollment}
                    className="w-full rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs py-2.5 shadow transition cursor-pointer"
                  >
                    Đăng ký khuôn mặt ngay
                  </button>
                </div>
              )}
            </div>

            {/* Quick Sensitivity Configuration */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 flex-1">
              <h3 className="font-semibold text-sm text-white flex items-center gap-2 mb-4">
                <Sliders className="w-4 h-4 text-cyan-400" />
                Cấu Hình Độ Nhạy Nhận Diện
              </h3>

              <div className="space-y-4 text-xs">
                {/* Yaw threshold slider */}
                <div>
                  <div className="flex justify-between text-zinc-300 mb-1.5">
                    <span>Ngưỡng quay mặt (Yaw threshold):</span>
                    <span className="font-mono text-cyan-400 font-bold">
                      ±{settings.yawThresholdDeg}°
                    </span>
                  </div>
                  <input
                    type="range"
                    min="15"
                    max="45"
                    step="1"
                    value={settings.yawThresholdDeg}
                    onChange={(e) =>
                      onUpdateSettings({ yawThresholdDeg: Number(e.target.value) })
                    }
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                  <p className="text-[10px] text-zinc-500 mt-1">
                    Quay quá góc này sẽ khóa màn hình ngay lập tức.
                  </p>
                </div>

                {/* Match threshold slider */}
                <div>
                  <div className="flex justify-between text-zinc-300 mb-1.5">
                    <span>Độ khớp chủ sở hữu tối thiểu:</span>
                    <span className="font-mono text-emerald-400 font-bold">
                      &ge;{settings.matchThresholdPercent}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="90"
                    step="5"
                    value={settings.matchThresholdPercent}
                    onChange={(e) =>
                      onUpdateSettings({
                        matchThresholdPercent: Number(e.target.value),
                      })
                    }
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                  <p className="text-[10px] text-zinc-500 mt-1">
                    Người lạ có độ khớp thấp hơn sẽ không mở được màn hình.
                  </p>
                </div>

                {/* Master Switch & Optimization Options */}
                <div className="pt-2 border-t border-zinc-800/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-zinc-200 font-semibold">Bóng Nổi Bật/Tắt Nhanh (Floating Bubble)</span>
                      <p className="text-[10px] text-zinc-500">Bóng nổi kéo thả trên màn hình để bật/tắt hoặc khóa nhanh</p>
                    </div>
                    <button
                      onClick={() =>
                        onUpdateSettings({ floatingBubbleEnabled: !settings.floatingBubbleEnabled })
                      }
                      className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full transition-colors ${
                        settings.floatingBubbleEnabled !== false ? 'bg-cyan-500' : 'bg-zinc-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition mt-0.5 ${
                          settings.floatingBubbleEnabled !== false ? 'translate-x-5' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-zinc-200 font-semibold">Tiết Kiệm Pin Thích Ứng (Adaptive Duty Cycle)</span>
                      <p className="text-[10px] text-zinc-500">Quét 500ms khi cần, 1000ms khi đang làm việc (tiết kiệm 50% CPU)</p>
                    </div>
                    <button
                      onClick={() =>
                        onUpdateSettings({ adaptiveDutyCycle: !settings.adaptiveDutyCycle })
                      }
                      className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full transition-colors ${
                        settings.adaptiveDutyCycle ? 'bg-cyan-500' : 'bg-zinc-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition mt-0.5 ${
                          settings.adaptiveDutyCycle ? 'translate-x-5' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-zinc-200 font-semibold">Vùng Đệm Dung Sai 1.5s (Grace Period)</span>
                      <p className="text-[10px] text-zinc-500">Tránh khóa nhầm khi cúi gõ phím hoặc uống nước</p>
                    </div>
                    <button
                      onClick={() =>
                        onUpdateSettings({ gracePeriodMs: settings.gracePeriodMs > 0 ? 0 : 1500 })
                      }
                      className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full transition-colors ${
                        settings.gracePeriodMs > 0 ? 'bg-cyan-500' : 'bg-zinc-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition mt-0.5 ${
                          settings.gracePeriodMs > 0 ? 'translate-x-5' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section: Real-Time Audit Log Table */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-cyan-400" />
              <h3 className="font-semibold text-sm text-white">
                Nhật Ký Quét Chu Kỳ 500ms (Real-time Telemetry)
              </h3>
              <span className="text-xs text-zinc-500 font-mono">
                ({auditLogs.length} bản ghi gần nhất)
              </span>
            </div>
            <button
              onClick={onClearLogs}
              className="text-xs text-zinc-400 hover:text-zinc-200 transition"
            >
              Xóa lịch sử
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-zinc-800">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-zinc-800/80 text-zinc-400 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Thời gian</th>
                  <th className="py-2.5 px-3">Trạng thái</th>
                  <th className="py-2.5 px-3">Hành động</th>
                  <th className="py-2.5 px-3">Góc Quay (Yaw)</th>
                  <th className="py-2.5 px-3">Độ Khớp</th>
                  <th className="py-2.5 px-3">Độ trễ</th>
                  <th className="py-2.5 px-3">Lý do</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800 text-zinc-300">
                {auditLogs.slice(0, 10).map((log) => (
                  <tr key={log.id} className="hover:bg-zinc-800/40 transition">
                    <td className="py-2 px-3 text-zinc-400">
                      {log.timestamp.toLocaleTimeString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        fractionalSecondDigits: 3,
                      })}
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.status === 'unlocked'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : log.status === 'warning'
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        {log.status === 'unlocked'
                          ? 'MỞ KHÓA'
                          : log.status === 'warning'
                          ? 'CẢNH BÁO'
                          : 'ĐÃ KHÓA'}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-semibold text-white">
                      {log.action === 'unlock'
                        ? 'Tự động mở'
                        : log.action === 'lock'
                        ? 'Khóa tức thì'
                        : log.action === 'maintain_unlock'
                        ? 'Duy trì mở'
                        : 'Duy trì khóa'}
                    </td>
                    <td className="py-2 px-3">
                      {log.yawAngle > 0 ? `+${log.yawAngle}` : log.yawAngle}°
                    </td>
                    <td className="py-2 px-3">{log.matchScore}%</td>
                    <td className="py-2 px-3 text-zinc-400">{log.latencyMs}ms</td>
                    <td className="py-2 px-3 text-zinc-400 max-w-xs truncate">
                      {log.reason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
