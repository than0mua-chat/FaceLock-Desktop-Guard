import React, { useState, useRef, useEffect } from 'react';
import { Terminal, Send, Trash2 } from 'lucide-react';
import { ScanAuditLog, FaceDetectionResult, OwnerProfile, GuardSettings } from '../types';

interface TerminalLogsAppProps {
  auditLogs: ScanAuditLog[];
  faceResult: FaceDetectionResult;
  owner: OwnerProfile | null;
  settings: GuardSettings;
  onClearLogs: () => void;
  onLockScreen: () => void;
}

export const TerminalLogsApp: React.FC<TerminalLogsAppProps> = ({
  auditLogs,
  faceResult,
  owner,
  settings,
  onClearLogs,
  onLockScreen,
}) => {
  const [command, setCommand] = useState('');
  const [terminalOutputs, setTerminalOutputs] = useState<string[]>([
    'FaceLock OS Sentinel Security Daemon v2.4.0',
    'Chu kỳ quét định kỳ: 500ms | Camera: ACTIVE',
    'Nhập "help" để xem danh sách lệnh.',
  ]);
  const terminalEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [auditLogs, terminalOutputs]);

  const handleCommand = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = command.trim().toLowerCase();
    if (!cmd) return;

    const newOutputs = [...terminalOutputs, `$ ${command}`];

    if (cmd === 'help') {
      newOutputs.push(
        'Available commands:',
        '  status   - Xem trạng thái giám sát hiện tại',
        '  owner    - Xem thông tin chủ sở hữu khuôn mặt',
        '  lock     - Khóa màn hình thủ công ngay',
        '  clear    - Xóa nhật ký dòng lệnh',
        '  config   - Hiển thị tham số bảo mật'
      );
    } else if (cmd === 'status') {
      newOutputs.push(
        `STATUS: ${faceResult.detected ? 'FACE_DETECTED' : 'NO_FACE'}`,
        `YAW: ${faceResult.yawAngle}° | PITCH: ${faceResult.pitchAngle}°`,
        `FACING_SCREEN: ${faceResult.isFacingScreen ? 'TRUE' : 'FALSE'}`,
        `OWNER_MATCH: ${faceResult.matchScore}% (${faceResult.isMatchedOwner ? 'PASS' : 'FAIL'})`,
        `INTERVAL: 500ms (Strict)`
      );
    } else if (cmd === 'owner') {
      newOutputs.push(
        `OWNER: ${owner?.name || 'Chưa đăng ký'}`,
        `ENROLLED_AT: ${owner?.enrolledAt || 'N/A'}`
      );
    } else if (cmd === 'lock') {
      newOutputs.push('Executing: LOCK_SCREEN...');
      onLockScreen();
    } else if (cmd === 'clear') {
      setTerminalOutputs([]);
      setCommand('');
      return;
    } else if (cmd === 'config') {
      newOutputs.push(
        `Scan interval: 500ms`,
        `Yaw threshold: ±${settings.yawThresholdDeg}°`,
        `Match threshold: >=${settings.matchThresholdPercent}%`
      );
    } else {
      newOutputs.push(`Command not found: "${cmd}". Nhập "help" để xem trợ giúp.`);
    }

    setTerminalOutputs(newOutputs);
    setCommand('');
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-emerald-400 font-mono text-xs overflow-hidden select-text">
      {/* Terminal Title Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-900/90 text-zinc-400">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold text-zinc-200">
            sentinel-guard-daemon.sh (500ms telemetry)
          </span>
        </div>
        <button
          onClick={onClearLogs}
          title="Xóa log"
          className="text-zinc-500 hover:text-zinc-300 transition"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Terminal Body */}
      <div className="flex-1 p-4 overflow-y-auto space-y-1">
        {terminalOutputs.map((out, idx) => (
          <div key={`out-${idx}`} className="text-zinc-300">
            {out}
          </div>
        ))}

        {/* Live streaming tick logs */}
        <div className="border-t border-zinc-800/80 my-2 pt-2 text-zinc-500">
          --- Dòng sự kiện 500ms thời gian thực ---
        </div>
        {auditLogs.slice(0, 15).map((log) => (
          <div
            key={log.id}
            className={`text-[11px] leading-tight ${
              log.status === 'unlocked'
                ? 'text-emerald-400/90'
                : log.status === 'warning'
                ? 'text-amber-400'
                : 'text-red-400'
            }`}
          >
            [{log.timestamp.toLocaleTimeString('vi-VN', { fractionalSecondDigits: 3 })}]
            {' '}TICK: {log.action.toUpperCase()} | Yaw: {log.yawAngle > 0 ? `+${log.yawAngle}` : log.yawAngle}° | Match: {log.matchScore}% | Latency: {log.latencyMs}ms | {log.reason}
          </div>
        ))}
        <div ref={terminalEndRef} />
      </div>

      {/* Command prompt input */}
      <form
        onSubmit={handleCommand}
        className="flex items-center gap-2 border-t border-zinc-800 bg-zinc-900/80 px-4 py-2"
      >
        <span className="text-emerald-400 font-bold">$</span>
        <input
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          placeholder="Nhập lệnh (status, lock, help)..."
          className="flex-1 bg-transparent text-zinc-100 placeholder-zinc-600 focus:outline-none font-mono text-xs"
        />
        <button
          type="submit"
          className="text-zinc-400 hover:text-emerald-400 transition"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
