import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  CheckCircle2,
  User,
  ShieldCheck,
  X,
  Compass,
  Eye,
  Sparkles,
  AlertTriangle,
  Upload,
} from 'lucide-react';
import { FaceDetectionResult } from '../types';
import { sounds } from '../utils/audio';
import { CameraStreamView } from './CameraStreamView';

interface EnrollmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  stream: MediaStream | null;
  currentFaceResult: FaceDetectionResult;
  onEnroll: (name: string, customSnapshot?: string) => void;
}

export const EnrollmentModal: React.FC<EnrollmentModalProps> = ({
  isOpen,
  onClose,
  stream,
  currentFaceResult,
  onEnroll,
}) => {
  const [name, setName] = useState('Chủ Sở Hữu');
  const [step, setStep] = useState<'capture' | 'success'>('capture');
  const [allowManualCapture, setAllowManualCapture] = useState(false);
  const [customPhoto, setCustomPhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStep('capture');
      setCustomPhoto(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isDetected = currentFaceResult.detected;
  const isFacing = currentFaceResult.isFacingScreen;
  const isOptimal = isDetected && isFacing && currentFaceResult.isSittingInFront;

  const handleCapture = (forced = false) => {
    if (!isDetected && !customPhoto) {
      sounds.playWarning();
      return;
    }
    sounds.playShutter();
    onEnroll(name.trim() || 'Chủ Sở Hữu', customPhoto || undefined);
    setStep('success');
    setTimeout(() => {
      setStep('capture');
      onClose();
    }, 1200);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setCustomPhoto(dataUrl);
      setAllowManualCapture(true);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-white/20 bg-zinc-900/95 p-6 shadow-2xl text-zinc-100 ring-1 ring-white/10">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          title="Đóng cửa sổ"
        >
          <X className="w-5 h-5" />
        </button>

        {step === 'capture' ? (
          <div>
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-inner">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white tracking-wide">
                  Đăng Ký Khuôn Mặt Chủ Sở Hữu
                </h3>
                <p className="text-xs text-zinc-400">
                  Hệ thống bảo vệ Windows Hello sẽ lưu trắc sinh học để nhận diện tự động
                </p>
              </div>
            </div>

            {/* Live Camera Viewfinder with Overlay Guide */}
            <div className="relative my-3 aspect-video w-full overflow-hidden rounded-xl border border-zinc-700/80 bg-black flex items-center justify-center shadow-2xl">
              {customPhoto ? (
                <img
                  src={customPhoto}
                  alt="Ảnh chủ sở hữu"
                  className="w-full h-full object-cover"
                />
              ) : stream ? (
                <CameraStreamView stream={stream} className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center justify-center p-6 text-center text-zinc-400">
                  <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mb-2 text-zinc-500">
                    <User className="w-6 h-6" />
                  </div>
                  <span className="text-xs">Đang nạp luồng camera trực tiếp...</span>
                </div>
              )}

              {/* HUD Target Overlay Oval */}
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-4">
                <div
                  className={`relative w-40 h-52 rounded-[48%] border-2 border-dashed transition-all duration-300 flex items-center justify-center ${
                    isOptimal
                      ? 'border-emerald-400 bg-emerald-500/10 shadow-[0_0_30px_rgba(52,211,153,0.35)]'
                      : isDetected
                      ? 'border-amber-400 bg-amber-500/10 shadow-[0_0_20px_rgba(251,191,36,0.2)]'
                      : 'border-white/30 bg-black/30'
                  }`}
                >
                  {/* Subtle target crosshair in center */}
                  <div className="w-3 h-0.5 bg-cyan-400/60" />
                  <div className="h-3 w-0.5 bg-cyan-400/60 absolute" />

                  {/* Corner notches */}
                  <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-cyan-400" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-cyan-400" />
                  <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-cyan-400" />
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-cyan-400" />
                </div>

                {/* Floating status tag */}
                <div className="mt-2">
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full shadow-lg backdrop-blur-md border ${
                      isOptimal
                        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50'
                        : isDetected
                        ? 'bg-amber-950/80 text-amber-300 border-amber-500/50'
                        : 'bg-zinc-900/90 text-zinc-300 border-zinc-700'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isOptimal
                          ? 'bg-emerald-400 animate-ping'
                          : isDetected
                          ? 'bg-amber-400'
                          : 'bg-zinc-500'
                      }`}
                    />
                    {isOptimal
                      ? 'Khuôn mặt hợp lệ - Sẵn sàng đăng ký'
                      : isDetected
                      ? `Đã nhận diện khuôn mặt (Góc: ${currentFaceResult.yawAngle}°)`
                      : 'Căn chỉnh khuôn mặt vào hình oval'}
                  </span>
                </div>
              </div>

              {/* Live Metric Badges */}
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[11px] font-mono px-2 py-1 rounded bg-black/75 backdrop-blur-sm text-zinc-300">
                <span className="flex items-center gap-1">
                  <Compass className="w-3.5 h-3.5 text-amber-400" />
                  Góc: {currentFaceResult.yawAngle}°
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5 text-cyan-400" />
                  Khoảng cách: {Math.round(currentFaceResult.distanceRatio * 100)}%
                </span>
                <span className="text-emerald-400">
                  {isOptimal ? 'Tối ưu' : isDetected ? 'Chấp nhận được' : 'Chưa tìm thấy'}
                </span>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-3.5 mt-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Tên chủ sở hữu máy tính
                </label>
                <div className="relative flex items-center">
                  <User className="w-4 h-4 text-zinc-400 absolute left-3 pointer-events-none" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ví dụ: Admin, Nguyễn Văn A..."
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-800/90 pl-9 pr-3 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 shadow-inner"
                  />
                </div>
              </div>

              {/* Status Alert notice if not optimal */}
              {!isOptimal && (
                <div className="rounded-xl bg-zinc-800/60 border border-zinc-700/80 p-3 text-xs text-zinc-300 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-zinc-200">
                      {!isDetected
                        ? 'Chưa nhận diện thấy khuôn mặt trong khung hình.'
                        : !isFacing
                        ? 'Bạn đang nhìn hơi lệch sang một bên.'
                        : 'Hãy di chuyển lại gần camera hơn.'}
                    </p>
                    <p className="mt-0.5 text-zinc-400 text-[11px]">
                      Bạn vẫn có thể bấm nút <strong>"Chụp & Đăng Ký Ngay"</strong> bên dưới để lưu ngay dữ liệu khuôn mặt hiện tại.
                    </p>
                  </div>
                </div>
              )}

              {/* Upload photo alternative button */}
              <div className="flex items-center justify-between text-xs text-zinc-400 pt-1">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 text-zinc-400 hover:text-cyan-300 transition cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Chọn ảnh từ máy tính (tùy chọn)</span>
                </button>
                {customPhoto && (
                  <button
                    type="button"
                    onClick={() => setCustomPhoto(null)}
                    className="text-amber-400 hover:underline cursor-pointer"
                  >
                    Dùng lại Camera
                  </button>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-700 transition cursor-pointer"
                >
                  Hủy bỏ
                </button>

                {/* Primary enrollment button */}
                <button
                  type="button"
                  disabled={!isDetected && !customPhoto}
                  onClick={() => handleCapture(true)}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-lg transition active:scale-95 ${
                    !isDetected && !customPhoto
                      ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-60 border border-zinc-700'
                      : isOptimal
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 shadow-emerald-500/25 cursor-pointer'
                      : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-cyan-500/25 cursor-pointer'
                  }`}
                >
                  <Camera className="w-4 h-4" />
                  <span>
                    {!isDetected && !customPhoto
                      ? 'Chưa thấy khuôn mặt'
                      : isOptimal
                      ? 'Chụp & Lưu Khuôn Mặt'
                      : 'Chụp & Đăng Ký Ngay'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Step Success */
          <div className="py-10 text-center flex flex-col items-center justify-center animate-fadeIn">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3 border border-emerald-500/40 shadow-[0_0_30px_rgba(52,211,153,0.3)]">
              <CheckCircle2 className="w-10 h-10 animate-bounce" />
            </div>
            <h3 className="text-xl font-bold text-white mb-1">
              Đăng Ký Khuôn Mặt Thành Công!
            </h3>
            <p className="text-sm text-zinc-300">
              Đã lưu hồ sơ trắc sinh học của <strong>{name}</strong> vào bộ nhớ bảo mật.
            </p>
            <p className="text-xs text-emerald-400 mt-2 font-mono">
              Windows Hello Guard: Đã kích hoạt nhận diện khuôn mặt
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
