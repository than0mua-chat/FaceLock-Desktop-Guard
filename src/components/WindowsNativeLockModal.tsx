import React from 'react';
import {
  Monitor,
  Terminal,
  Download,
  Copy,
  Check,
  X,
  Lock,
  ExternalLink,
  Shield,
} from 'lucide-react';

interface WindowsNativeLockModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WindowsNativeLockModal: React.FC<WindowsNativeLockModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  const winCmd = `rundll32.exe user32.dll,LockWorkStation`;

  const handleCopy = () => {
    navigator.clipboard.writeText(winCmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadBat = () => {
    const batContent = `@echo off\r\nREM FaceLock Sentinel - Windows Lock Trigger\r\necho Khoa man hinh Windows...\r\nrundll32.exe user32.dll,LockWorkStation\r\n`;
    const blob = new Blob([batContent], { type: 'application/bat' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'LockWindows.bat';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl overflow-hidden text-zinc-100">
        {/* Header Windows Style */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-zinc-800/80 border-b border-zinc-700">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Monitor className="w-4 h-4 text-cyan-400" />
            <span>Thao Tác Khóa Màn Hình Windows (Windows Lock Action)</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-700 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs text-zinc-300">
          <p className="leading-relaxed">
            Ứng dụng hỗ trợ đầy đủ hành vi và thao tác khóa màn hình của hệ điều hành Windows:
          </p>

          {/* Shortcut Card */}
          <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-2">
            <div className="flex items-center gap-2 text-white font-semibold">
              <Lock className="w-4 h-4 text-cyan-400" />
              <span>1. Phím tắt Windows kinh điển</span>
            </div>
            <p className="text-zinc-400 text-[11px]">
              Nhấn tổ hợp phím <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-600 font-mono text-cyan-300">Win</kbd> + <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-600 font-mono text-cyan-300">L</kbd> (hoặc <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-600 font-mono text-zinc-300">Alt</kbd> + <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-600 font-mono text-zinc-300">L</kbd>) tại bất cứ vị trí nào để kích hoạt khóa ngay.
            </p>
          </div>

          {/* CMD Command */}
          <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-white font-semibold">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span>2. Lệnh khóa hệ thống Windows thực tế</span>
              </span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Đã chép' : 'Sao chép'}</span>
              </button>
            </div>
            <div className="bg-black/60 p-2 rounded-lg font-mono text-cyan-300 text-[11px] overflow-x-auto border border-zinc-800">
              {winCmd}
            </div>
          </div>

          {/* Download Script */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30">
            <div className="space-y-0.5">
              <p className="text-white font-semibold">Tải file khóa nhanh 1-Click</p>
              <p className="text-zinc-400 text-[11px]">Tập tin script <code className="text-cyan-300">LockWindows.bat</code> khóa máy Windows lập tức khi chạy.</p>
            </div>
            <button
              onClick={handleDownloadBat}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tải file .bat</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-zinc-400 pt-1">
            <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Màn hình khóa Windows Hello Face được mô phỏng chuẩn xác và tiếp tục quét mỗi 500ms để tự động mở khóa khi bạn quay mặt lại.</span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-zinc-800/60 border-t border-zinc-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white text-xs font-medium transition cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
