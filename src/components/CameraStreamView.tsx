import React, { useEffect, useRef } from 'react';

interface CameraStreamViewProps {
  stream: MediaStream | null;
  className?: string;
  mirrored?: boolean;
}

export const CameraStreamView: React.FC<CameraStreamViewProps> = ({
  stream,
  className = 'w-full h-full object-cover',
  mirrored = true,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (stream) {
      video.srcObject = stream;
      video.play().catch(() => {});
    } else {
      video.srcObject = null;
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      className={`${className} ${mirrored ? '-scale-x-100' : ''}`}
    />
  );
};
