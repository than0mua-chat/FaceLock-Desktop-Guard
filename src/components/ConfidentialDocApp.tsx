import React from 'react';
import { FileText, Lock, ShieldAlert, EyeOff } from 'lucide-react';
import { FaceDetectionResult } from '../types';

interface ConfidentialDocAppProps {
  faceResult: FaceDetectionResult;
}

export const ConfidentialDocApp: React.FC<ConfidentialDocAppProps> = ({
  faceResult,
}) => {
  const isLookingAway =
    faceResult.detected && !faceResult.isFacingScreen;

  return (
    <div className="relative h-full flex flex-col bg-zinc-900 text-zinc-200 overflow-hidden font-sans select-none">
      {/* Privacy Protection Overlay when turning away */}
      {isLookingAway && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-zinc-950/90 backdrop-blur-xl p-6 text-center animate-fade-in">
          <div className="w-14 h-14 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center mb-3">
            <EyeOff className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">
            Bảo Mật Quyền Riêng Tư Kích Hoạt
          </h3>
          <p className="text-sm text-zinc-400 max-w-sm">
            Phát hiện bạn đã quay mặt đi ({faceResult.yawAngle}°). Nội dung tuyệt mật tự động làm mờ và màn hình đang khóa để chống nhìn trộm!
          </p>
        </div>
      )}

      {/* Doc toolbar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800 bg-zinc-900/90 text-xs">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-red-400" />
          <span className="font-semibold text-white">
            PROJECT_SENTINEL_CONFIDENTIAL.docx
          </span>
          <span className="bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded text-[10px] font-bold">
            TUYỆT MẬT
          </span>
        </div>
        <div className="text-zinc-500 text-[11px]">
          Chỉ xem khi chủ sở hữu trực tiếp nhìn màn hình
        </div>
      </div>

      {/* Document Content */}
      <div className="p-8 overflow-y-auto space-y-6 max-w-3xl mx-auto text-sm leading-relaxed text-zinc-300">
        <div className="border-b border-zinc-800 pb-4">
          <div className="text-xs uppercase tracking-widest text-red-400 font-bold mb-1">
            Tài liệu bảo mật cấp 1 • Lưu hành nội bộ
          </div>
          <h1 className="text-2xl font-bold text-white">
            Kế Hoạch Triển Khai Hệ Thống An Ninh Sinh Trắc Học 2026
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Tác giả: Ban Cố Vấn An Ninh Mạng • Cập nhật lần cuối: Hôm nay
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-white mb-2">
            1. Nguyên lý hoạt động FaceLock 500ms
          </h2>
          <p className="text-zinc-400">
            Ứng dụng sử dụng thuật toán thị giác máy tính quét luồng video từ webcam theo chu kỳ chính xác <strong>500 mili-giây (0.5 giây)</strong>. 
            Mỗi chu kỳ kiểm tra 3 điều kiện tiên quyết:
          </p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-zinc-400 pl-2">
            <li>Khuôn mặt người dùng có hiện diện trước màn hình trong cự ly cho phép không?</li>
            <li>Góc quay đầu (Yaw) có nhìn thẳng hay đã quay đi sang hướng khác?</li>
            <li>Các đặc trưng hình học khuôn mặt có trùng khớp với Chủ Sở Hữu đã đăng ký không?</li>
          </ul>
        </div>

        <div className="bg-zinc-800/40 border border-zinc-800 rounded-xl p-4">
          <h3 className="text-xs font-semibold text-white uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-cyan-400" />
            Cơ chế khóa tức thì (Zero-Latency Defense)
          </h3>
          <p className="text-xs text-zinc-400">
            Ngay khi người dùng đứng dậy rời khỏi bàn làm việc hoặc quay đầu sang trái/phải quá ngưỡng cho phép (±25°), màn hình lập tức chuyển về chế độ Lock Screen trong vòng 500ms, ngăn chặn hoàn toàn nguy cơ truy cập trái phép hoặc nhìn trộm màn hình (Visual Eavesdropping).
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-white mb-2">
            2. Danh sách dự án đang bảo vệ
          </h2>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-zinc-800/50 rounded-lg border border-zinc-700/60">
              <div className="font-bold text-emerald-400">AGI Core Gateway</div>
              <div className="text-zinc-400 mt-1">Cổng kết nối AI cục bộ bảo mật</div>
            </div>
            <div className="p-3 bg-zinc-800/50 rounded-lg border border-zinc-700/60">
              <div className="font-bold text-cyan-400">Face Sentinel Guard</div>
              <div className="text-zinc-400 mt-1">Hệ thống phòng vệ màn hình máy trạm</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
