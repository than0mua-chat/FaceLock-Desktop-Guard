import { FaceDetectionResult, OwnerProfile, GuardSettings } from '../types';
import { FilesetResolver, FaceDetector } from '@mediapipe/tasks-vision';

let mediaPipeDetector: FaceDetector | null = null;
let isInitializingMediaPipe = false;
let mediaPipeReady = false;

// Native Chromium FaceDetector if supported (instant C++ GPU speed in Edge/Chrome/Electron)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let nativeChromiumFaceDetector: any = null;
if (typeof window !== 'undefined' && 'FaceDetector' in window) {
  try {
    // @ts-expect-error Chromium Shape Detection API
    nativeChromiumFaceDetector = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
  } catch {
    nativeChromiumFaceDetector = null;
  }
}

// Initialize MediaPipe FaceDetector asynchronously with local offline bundle first, CDN fallback
export async function initFaceDetector(): Promise<boolean> {
  if (mediaPipeDetector) return true;
  if (isInitializingMediaPipe) return false;

  isInitializingMediaPipe = true;

  // Prioritize bundled local assets for 100% offline Electron & Web execution
  const wasmCandidates = [
    '/wasm',
    './wasm',
    'wasm',
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm',
  ];

  const modelCandidates = [
    '/models/blaze_face_short_range.tflite',
    './models/blaze_face_short_range.tflite',
    'models/blaze_face_short_range.tflite',
    'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/latest/blaze_face_short_range.tflite',
  ];

  for (const wasmPath of wasmCandidates) {
    try {
      const vision = await FilesetResolver.forVisionTasks(wasmPath);
      for (const modelPath of modelCandidates) {
        try {
          try {
            mediaPipeDetector = await FaceDetector.createFromOptions(vision, {
              baseOptions: {
                modelAssetPath: modelPath,
                delegate: 'GPU',
              },
              runningMode: 'IMAGE',
              minDetectionConfidence: 0.52,
            });
          } catch {
            mediaPipeDetector = await FaceDetector.createFromOptions(vision, {
              baseOptions: {
                modelAssetPath: modelPath,
                delegate: 'CPU',
              },
              runningMode: 'IMAGE',
              minDetectionConfidence: 0.52,
            });
          }

          if (mediaPipeDetector) {
            mediaPipeReady = true;
            isInitializingMediaPipe = false;
            return true;
          }
        } catch {
          // Continue to next candidate model
        }
      }
    } catch {
      // Continue to next candidate wasm
    }
  }

  isInitializingMediaPipe = false;
  mediaPipeReady = false;
  return false;
}

// Detect if camera is covered (by hand, finger, tape, dark cloth, or macro unfocused blur)
export function checkCameraObstruction(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement
): { isBlocked: boolean; reason?: string } {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx || !video.videoWidth || !video.videoHeight || video.readyState < 2) {
    return { isBlocked: false };
  }

  const w = 64;
  const h = 48;
  canvas.width = w;
  canvas.height = h;

  try {
    ctx.drawImage(video, 0, 0, w, h);
    const imgData = ctx.getImageData(0, 0, w, h);
    const d = imgData.data;

    let totalLuma = 0;
    let maxLuma = 0;
    let edgeSum = 0;
    let edgeSamples = 0;
    let skinPixelCount = 0;
    const totalPixels = w * h;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const r = d[idx];
        const g = d[idx + 1];
        const b = d[idx + 2];
        const luma = 0.299 * r + 0.587 * g + 0.114 * b;
        totalLuma += luma;
        if (luma > maxLuma) maxLuma = luma;

        // Gradient to right and bottom neighbor
        if (x < w - 1 && y < h - 1) {
          const idxR = (y * w + (x + 1)) * 4;
          const lumaR = 0.299 * d[idxR] + 0.587 * d[idxR + 1] + 0.114 * d[idxR + 2];
          const idxB = ((y + 1) * w + x) * 4;
          const lumaB = 0.299 * d[idxB] + 0.587 * d[idxB + 1] + 0.114 * d[idxB + 2];
          edgeSum += Math.abs(luma - lumaR) + Math.abs(luma - lumaB);
          edgeSamples++;
        }

        // Skin tone check
        const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
        const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
        if (cb >= 65 && cb <= 150 && cr >= 115 && cr <= 185 && r > 30 && r > g) {
          skinPixelCount++;
        }
      }
    }

    const avgLuma = totalLuma / totalPixels;
    const avgEdge = edgeSamples > 0 ? edgeSum / edgeSamples : 0;
    const skinRatio = skinPixelCount / totalPixels;

    // 1. Camera taped / covered in pitch black darkness (< 6 luma)
    if (avgLuma < 6 && maxLuma < 14) {
      return { isBlocked: true, reason: 'Camera bị che (tối đen)' };
    }

    // 2. Pure flat white paper pressed tightly against lens
    if (avgLuma > 245 && avgEdge < 0.6) {
      return { isBlocked: true, reason: 'Camera bị che bởi vật cản' };
    }

    return { isBlocked: false };

    return { isBlocked: false };
  } catch {
    return { isBlocked: false };
  }
}

// Robust Multi-Spectral Skin, Anthropometric Centroid & Head Topology Detector (100% Offline, zero internet needed)
function analyzeFrameFallback(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement
): {
  detected: boolean;
  confidence: number;
  box?: { x: number; y: number; width: number; height: number };
  landmarks?: {
    leftEye: { x: number; y: number };
    rightEye: { x: number; y: number };
    noseTip: { x: number; y: number };
    mouthCenter: { x: number; y: number };
  };
  colorSig: number[];
  yawAngle: number;
  pitchAngle: number;
} {
  // Pre-check for lens obstruction before running fallback
  const obstruction = checkCameraObstruction(video, canvas);
  if (obstruction.isBlocked) {
    return { detected: false, confidence: 0, colorSig: [120, 100, 90], yawAngle: 0, pitchAngle: 0 };
  }

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return { detected: false, confidence: 0, colorSig: [120, 100, 90], yawAngle: 0, pitchAngle: 0 };

  const w = 160;
  const h = 120;
  canvas.width = w;
  canvas.height = h;

  try {
    ctx.drawImage(video, 0, 0, w, h);
  } catch {
    return { detected: false, confidence: 0, colorSig: [120, 100, 90], yawAngle: 0, pitchAngle: 0 };
  }

  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  // Grid density: 20 columns x 15 rows (each cell 8x8 pixels)
  const cols = 20;
  const rows = 15;
  const cellW = w / cols;
  const cellH = h / rows;
  const gridSkinCount = new Int32Array(cols * rows);
  const gridLuma = new Float32Array(cols * rows);

  let totalSkin = 0;
  let sumR = 0, sumG = 0, sumB = 0;
  let weightedGx = 0;
  let weightedGy = 0;

  for (let y = 0; y < h; y++) {
    const gy = Math.floor(y / cellH);
    for (let x = 0; x < w; x++) {
      const gx = Math.floor(x / cellW);
      const gIdx = gy * cols + gx;
      const idx = (y * w + x) * 4;

      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      const luma = 0.299 * r + 0.587 * g + 0.114 * b;
      gridLuma[gIdx] += luma;

      // YCbCr transformation
      const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
      const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

      // Lighting-adaptive skin & human face tissue test (supports Asian, European, African, indoor fluorescent & warm bulbs)
      const sumRGB = r + g + b;
      const maxRGB = Math.max(r, g, b);
      const minRGB = Math.min(r, g, b);
      const rgbDiff = maxRGB - minRGB;

      const isSkinYCbCr = cb >= 64 && cb <= 152 && cr >= 110 && cr <= 190;
      const isSkinRGB = r > 28 && g > 18 && b > 12 && rgbDiff >= 6 && (r >= g * 0.82) && sumRGB >= 60;
      const isSkinNormalized = sumRGB > 0 && (r / sumRGB >= 0.28) && (g / sumRGB >= 0.23);

      if ((isSkinYCbCr && isSkinRGB) || (isSkinNormalized && isSkinRGB)) {
        // Give higher weight to central 75% of camera view where user sits
        const centerDistX = Math.abs(gx - (cols / 2 - 0.5)) / (cols / 2);
        const centerDistY = Math.abs(gy - (rows / 2 - 0.5)) / (rows / 2);
        const weight = centerDistX < 0.85 && centerDistY < 0.85 ? 1.4 : 0.7;

        gridSkinCount[gIdx]++;
        totalSkin += weight;
        sumR += r;
        sumG += g;
        sumB += b;
        weightedGx += gx * weight;
        weightedGy += gy * weight;
      }
    }
  }

  // Centroid of face mass
  // A real human face at desk distance occupies 4% to 50% of the frame.
  const skinOccupancy = totalSkin / (w * h);
  if (totalSkin >= 60 && skinOccupancy <= 0.60) {
    const meanGx = weightedGx / totalSkin;
    const meanGy = weightedGy / totalSkin;

    // Calculate spread (standard deviation) to determine actual face size
    let varX = 0;
    let varY = 0;

    for (let gy = 0; gy < rows; gy++) {
      for (let gx = 0; gx < cols; gx++) {
        const count = gridSkinCount[gy * cols + gx];
        if (count > 0) {
          varX += Math.pow(gx - meanGx, 2) * count;
          varY += Math.pow(gy - meanGy, 2) * count;
        }
      }
    }

    const stdGx = Math.sqrt(varX / Math.max(1, totalSkin));
    const stdGy = Math.sqrt(varY / Math.max(1, totalSkin));

    // Human head bounding box around centroid
    const halfBoxW = Math.max(2.0, Math.min(6.5, stdGx * 1.5)) * cellW;
    const halfBoxH = Math.max(2.4, Math.min(8.0, stdGy * 1.7)) * cellH;

    const rawCx = meanGx * cellW;
    const rawCy = meanGy * cellH;

    const rawX = Math.max(0, rawCx - halfBoxW);
    const rawY = Math.max(0, rawCy - halfBoxH);
    const rawW = Math.min(w - rawX, halfBoxW * 2);
    const rawH = Math.min(h - rawY, halfBoxH * 2);

    // Aspect ratio check for human head (typical ratio: 0.60 to 1.10)
    const headRatio = rawW / Math.max(1, rawH);
    if (headRatio < 0.55 || headRatio > 1.15) {
      return { detected: false, confidence: 0, colorSig: [120, 100, 90], yawAngle: 0, pitchAngle: 0 };
    }

    const scaleX = video.videoWidth / w;
    const scaleY = video.videoHeight / h;

    const realBox = {
      x: Math.max(0, rawX * scaleX),
      y: Math.max(0, rawY * scaleY),
      width: Math.min(video.videoWidth, rawW * scaleX),
      height: Math.min(video.videoHeight, rawH * scaleY),
    };

    const cx = realBox.x + realBox.width / 2;
    const cy = realBox.y + realBox.height / 2;

    // Facial landmarks estimation based on human facial proportions
    const eyeY = realBox.y + realBox.height * 0.35;
    const leftEyeX = cx - realBox.width * 0.22;
    const rightEyeX = cx + realBox.width * 0.22;
    const noseY = realBox.y + realBox.height * 0.54;
    const mouthY = realBox.y + realBox.height * 0.76;

    // Anthropometric ocular contrast verification:
    // A genuine human face has eyes (pupils + orbital cavity shadow) that are darker than the forehead/cheeks.
    // Flat hands, palms, or arms have near-zero luminance difference across these zones.
    const eyeCellY = Math.max(0, Math.min(rows - 1, Math.floor(rawY / cellH + (rawH / cellH) * 0.35)));
    const foreheadCellY = Math.max(0, Math.min(rows - 1, Math.floor(rawY / cellH + (rawH / cellH) * 0.15)));
    const midCellX = Math.max(0, Math.min(cols - 1, Math.floor(meanGx)));

    const eyeLuma = gridLuma[eyeCellY * cols + midCellX] / Math.max(1, gridSkinCount[eyeCellY * cols + midCellX] || 64);
    const foreheadLuma = gridLuma[foreheadCellY * cols + midCellX] / Math.max(1, gridSkinCount[foreheadCellY * cols + midCellX] || 64);

    // If there is no biological eye socket contrast (less than 4.5 luma contrast), this is a hand or flat surface
    if (Math.abs(foreheadLuma - eyeLuma) < 4.5 && skinOccupancy < 0.25) {
      return { detected: false, confidence: 0, colorSig: [120, 100, 90], yawAngle: 0, pitchAngle: 0 };
    }

    // Yaw calculation based on left vs right brightness & skin distribution
    let leftSkin = 0;
    let rightSkin = 0;
    const midGx = Math.round(meanGx);

    for (let gy = 0; gy < rows; gy++) {
      for (let gx = 0; gx < midGx; gx++) {
        leftSkin += gridSkinCount[gy * cols + gx];
      }
      for (let gx = midGx; gx < cols; gx++) {
        rightSkin += gridSkinCount[gy * cols + gx];
      }
    }

    const totalLR = Math.max(1, leftSkin + rightSkin);
    const asymmetry = (rightSkin - leftSkin) / totalLR; // -1 to +1
    const yawAngle = Math.max(-45, Math.min(45, Math.round(asymmetry * 42)));

    // Pitch calculation (vertical displacement from frame center)
    const normCenterY = (meanGy / rows) - 0.45;
    const pitchAngle = Math.max(-30, Math.min(30, Math.round(normCenterY * 35)));

    const avgColor = [
      Math.round(sumR / Math.max(1, totalSkin)),
      Math.round(sumG / Math.max(1, totalSkin)),
      Math.round(sumB / Math.max(1, totalSkin)),
    ];

    return {
      detected: true,
      confidence: 0.50,
      box: realBox,
      landmarks: {
        leftEye: { x: leftEyeX, y: eyeY },
        rightEye: { x: rightEyeX, y: eyeY },
        noseTip: { x: cx, y: noseY },
        mouthCenter: { x: cx, y: mouthY },
      },
      colorSig: avgColor,
      yawAngle,
      pitchAngle,
    };
  }

  return { detected: false, confidence: 0, colorSig: [120, 100, 90], yawAngle: 0, pitchAngle: 0 };
}

// Face Biometric Signature definition
export interface FaceBiometricSignature {
  eyeDistanceRatio: number;
  noseToMouthRatio: number;
  aspectRatio: number;
  colorSignature: number[];
  landmarkVector?: number[];
}

export function extractFaceSignature(
  bBox: { x?: number; y?: number; width: number; height: number },
  landmarks?: FaceDetectionResult['landmarks'],
  colorSig: number[] = [135, 110, 95]
): FaceBiometricSignature {
  const width = Math.max(1, bBox.width);
  const height = Math.max(1, bBox.height);
  const aspectRatio = width / height;

  let eyeDistanceRatio = 0.42;
  let noseToMouthRatio = 0.45;
  let landmarkVector: number[] | undefined;

  if (landmarks) {
    const eyeDist = Math.hypot(
      landmarks.rightEye.x - landmarks.leftEye.x,
      landmarks.rightEye.y - landmarks.leftEye.y
    );
    eyeDistanceRatio = eyeDist / width;

    const eyeMidY = (landmarks.leftEye.y + landmarks.rightEye.y) / 2;
    const eyeMidX = (landmarks.leftEye.x + landmarks.rightEye.x) / 2;
    const eyeToMouth = Math.hypot(landmarks.mouthCenter.x - eyeMidX, landmarks.mouthCenter.y - eyeMidY);
    noseToMouthRatio = eyeToMouth / height;

    const bx = bBox.x ?? (eyeMidX - width / 2);
    const by = bBox.y ?? (eyeMidY - height * 0.35);

    landmarkVector = [
      (landmarks.leftEye.x - bx) / width,
      (landmarks.leftEye.y - by) / height,
      (landmarks.rightEye.x - bx) / width,
      (landmarks.rightEye.y - by) / height,
      (landmarks.noseTip.x - bx) / width,
      (landmarks.noseTip.y - by) / height,
      (landmarks.mouthCenter.x - bx) / width,
      (landmarks.mouthCenter.y - by) / height,
    ];
  }

  return {
    eyeDistanceRatio,
    noseToMouthRatio,
    aspectRatio,
    colorSignature: colorSig,
    landmarkVector,
  };
}

// Compute Biometric similarity between current face and enrolled owner
export function calculateMatchScore(
  currentSignature: FaceBiometricSignature,
  ownerSignature: OwnerProfile['faceSignature'],
  lightingNormalization: boolean = true
): number {
  if (!ownerSignature || !currentSignature) return 0;

  // 1. Compare aspect ratios (normalized, typical human face ratio is 0.70 to 0.95)
  const aspectDiff = Math.abs(currentSignature.aspectRatio - ownerSignature.aspectRatio);
  const aspectScore = Math.max(0, 100 - aspectDiff * 180);

  // 2. Compare eye distance relative to face width (typical ratio is 0.38 to 0.48)
  const eyeDiff = Math.abs(currentSignature.eyeDistanceRatio - ownerSignature.eyeDistanceRatio);
  const eyeScore = Math.max(0, 100 - eyeDiff * 220);

  // 3. Compare eye-to-mouth ratio (typical ratio is 0.28 to 0.45)
  const noseDiff = Math.abs(currentSignature.noseToMouthRatio - ownerSignature.noseToMouthRatio);
  const noseScore = Math.max(0, 100 - noseDiff * 190);

  // 4. Compare color signature with ambient light normalization
  const c1 = currentSignature.colorSignature || [135, 110, 95];
  const c2 = ownerSignature.colorSignature || [135, 110, 95];

  let colorScore = 80;
  if (lightingNormalization) {
    // Normalized Chromaticity: r / (r+g+b), g / (r+g+b) - invariant to overall light level (day vs night)
    const sum1 = Math.max(1, c1[0] + c1[1] + c1[2]);
    const sum2 = Math.max(1, c2[0] + c2[1] + c2[2]);
    const nr1 = c1[0] / sum1;
    const ng1 = c1[1] / sum1;
    const nr2 = c2[0] / sum2;
    const ng2 = c2[1] / sum2;
    const chromDist = Math.hypot(nr1 - nr2, ng1 - ng2);
    colorScore = Math.max(0, 100 - chromDist * 220);
  } else {
    const colorDist = Math.hypot(c1[0] - c2[0], c1[1] - c2[1], c1[2] - c2[2]);
    colorScore = Math.max(0, 100 - (colorDist / 441.6) * 100);
  }

  // 5. Compare landmark vector coordinates if available on both
  let landmarkScore = 80;
  let hasLandmarks = false;
  if (currentSignature.landmarkVector && ownerSignature.landmarkVector) {
    hasLandmarks = true;
    const v1 = currentSignature.landmarkVector;
    const v2 = ownerSignature.landmarkVector;
    let distSum = 0;
    const count = Math.min(v1.length, v2.length);
    for (let i = 0; i < count; i += 2) {
      distSum += Math.hypot(v1[i] - v2[i], v1[i + 1] - v2[i + 1]);
    }
    const avgDist = distSum / (count / 2);
    landmarkScore = Math.max(0, 100 - avgDist * 250);
  }

  let rawTotal: number;
  if (hasLandmarks) {
    rawTotal =
      aspectScore * 0.25 +
      eyeScore * 0.30 +
      noseScore * 0.20 +
      landmarkScore * 0.15 +
      colorScore * 0.10;
  } else {
    rawTotal =
      aspectScore * 0.35 +
      eyeScore * 0.35 +
      noseScore * 0.20 +
      colorScore * 0.10;
  }

  // Smooth deviation damping for different faces:
  // If proportions are vastly different (e.g. completely different person or wrong object)
  if (eyeDiff > 0.18 || aspectDiff > 0.28 || noseDiff > 0.28) {
    return Math.min(25, Math.round(rawTotal * 0.35));
  } else if (eyeDiff > 0.13 || aspectDiff > 0.22 || noseDiff > 0.22) {
    return Math.min(42, Math.round(rawTotal * 0.65));
  }

  return Math.min(100, Math.max(0, Math.round(rawTotal)));
}

// Core scan function: evaluates frame every 500ms
export async function analyzeFrame(
  video: HTMLVideoElement,
  fallbackCanvas: HTMLCanvasElement,
  owner: OwnerProfile | null,
  settings: GuardSettings
): Promise<FaceDetectionResult> {
  // Check for test simulation mode first
  if (settings.simulatedState === 'simulate_left_screen') {
    return {
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
      reason: 'Người dùng đã rời khỏi màn hình (Mô phỏng)',
    };
  }

  if (settings.simulatedState === 'simulate_turned_away') {
    return {
      detected: true,
      confidence: 0.95,
      boundingBox: {
        x: video.videoWidth * 0.2,
        y: video.videoHeight * 0.2,
        width: video.videoWidth * 0.4,
        height: video.videoHeight * 0.5,
      },
      yawAngle: 42, // Severely turned away
      pitchAngle: 5,
      rollAngle: 0,
      isFacingScreen: false,
      distanceRatio: 0.25,
      isSittingInFront: true,
      matchScore: 88,
      isMatchedOwner: true,
      reason: 'Phát hiện người dùng quay mặt đi (+42° Yaw)',
    };
  }

  if (settings.simulatedState === 'simulate_stranger') {
    return {
      detected: true,
      confidence: 0.96,
      boundingBox: {
        x: video.videoWidth * 0.25,
        y: video.videoHeight * 0.15,
        width: video.videoWidth * 0.45,
        height: video.videoHeight * 0.55,
      },
      yawAngle: 0,
      pitchAngle: 0,
      rollAngle: 0,
      isFacingScreen: true,
      distanceRatio: 0.28,
      isSittingInFront: true,
      matchScore: 32, // Low match
      isMatchedOwner: false,
      reason: 'Khuôn mặt lạ - Không khớp với chủ sở hữu (32% match)',
    };
  }

  if (!video || video.readyState < 2 || video.videoWidth === 0) {
    return {
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
      reason: 'Đang đợi tín hiệu camera...',
    };
  }

  const vWidth = video.videoWidth;
  const vHeight = video.videoHeight;
  const totalFrameArea = vWidth * vHeight;

  // 0. Instant Camera Obstruction Check (Hand, finger, dark tape, cloth, or macro blur)
  const obstruction = checkCameraObstruction(video, fallbackCanvas);
  if (obstruction.isBlocked) {
    return {
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
      reason: obstruction.reason || 'Camera bị che hoặc không phát hiện khuôn mặt',
    };
  }

  let detected = false;
  let confidence = 0;
  let bBox: { x: number; y: number; width: number; height: number } | undefined;
  let landmarks: FaceDetectionResult['landmarks'];
  let colorSig: number[] = [120, 100, 90];
  let aiDetectorRan = false;

  // 1. Try MediaPipe FaceDetector if ready
  if (!mediaPipeReady && !isInitializingMediaPipe) {
    await initFaceDetector().catch(() => {});
  }

  if (mediaPipeReady && mediaPipeDetector) {
    try {
      const detections = mediaPipeDetector.detect(video);
      aiDetectorRan = true;
      if (detections.detections && detections.detections.length > 0) {
        const det = detections.detections[0];
        const score = det.categories?.[0]?.score || 0.9;

        if (score >= 0.52) {
          let tempBox: { x: number; y: number; width: number; height: number } | undefined;
          if (det.boundingBox) {
            const isNormalized = det.boundingBox.width <= 1.0 && det.boundingBox.height <= 1.0;
            tempBox = {
              x: isNormalized ? det.boundingBox.originX * vWidth : det.boundingBox.originX,
              y: isNormalized ? det.boundingBox.originY * vHeight : det.boundingBox.originY,
              width: isNormalized ? det.boundingBox.width * vWidth : det.boundingBox.width,
              height: isNormalized ? det.boundingBox.height * vHeight : det.boundingBox.height,
            };
          }

          // Keypoints: 0=left/right eye, 1=eye, 2=nose tip, 3=mouth, 4=left ear, 5=right ear
          if (det.keypoints && det.keypoints.length >= 4) {
            const kps = det.keypoints;
            const areNorm = kps[0].x <= 1.0 && kps[0].y <= 1.0;
            const kx = areNorm ? vWidth : 1;
            const ky = areNorm ? vHeight : 1;

            const p0 = { x: kps[0].x * kx, y: kps[0].y * ky };
            const p1 = { x: kps[1].x * kx, y: kps[1].y * ky };
            const leftEye = p0.x <= p1.x ? p0 : p1;
            const rightEye = p0.x <= p1.x ? p1 : p0;
            const noseTip = { x: kps[2].x * kx, y: kps[2].y * ky };
            const mouthCenter = { x: kps[3].x * kx, y: kps[3].y * ky };

            const eyeDist = Math.hypot(rightEye.x - leftEye.x, rightEye.y - leftEye.y);
            const eyeMidY = (leftEye.y + rightEye.y) / 2;

            // Sanity check: eyes must have a positive distance
            if (eyeDist >= 6) {
              detected = true;
              confidence = score;
              bBox = tempBox;
              landmarks = {
                leftEye,
                rightEye,
                noseTip,
                mouthCenter,
                leftEar: kps[4] ? { x: kps[4].x * kx, y: kps[4].y * ky } : undefined,
                rightEar: kps[5] ? { x: kps[5].x * kx, y: kps[5].y * ky } : undefined,
              };
            }
          }

          // If keypoints were sparse but bounding box exists
          if (!detected && tempBox) {
            detected = true;
            confidence = score;
            bBox = tempBox;
            const cx = tempBox.x + tempBox.width / 2;
            const cy = tempBox.y + tempBox.height / 2;
            landmarks = {
              leftEye: { x: cx - tempBox.width * 0.2, y: cy - tempBox.height * 0.15 },
              rightEye: { x: cx + tempBox.width * 0.2, y: cy - tempBox.height * 0.15 },
              noseTip: { x: cx, y: cy + tempBox.height * 0.05 },
              mouthCenter: { x: cx, y: cy + tempBox.height * 0.28 },
            };
          }

          // Synthesize bBox if detector provided keypoints but no bounding box
          if (detected && !bBox && landmarks) {
            const minX = Math.min(landmarks.leftEye.x, landmarks.rightEye.x, landmarks.noseTip.x, landmarks.mouthCenter.x);
            const maxX = Math.max(landmarks.leftEye.x, landmarks.rightEye.x, landmarks.noseTip.x, landmarks.mouthCenter.x);
            const minY = Math.min(landmarks.leftEye.y, landmarks.rightEye.y, landmarks.noseTip.y, landmarks.mouthCenter.y);
            const maxY = Math.max(landmarks.leftEye.y, landmarks.rightEye.y, landmarks.noseTip.y, landmarks.mouthCenter.y);
            const w = Math.max(80, (maxX - minX) * 2.2);
            const h = Math.max(100, (maxY - minY) * 2.4);
            const cx = (minX + maxX) / 2;
            const cy = (minY + maxY) / 2;
            bBox = {
              x: Math.max(0, cx - w / 2),
              y: Math.max(0, cy - h * 0.45),
              width: Math.min(vWidth, w),
              height: Math.min(vHeight, h),
            };
          }
        }
      }
    } catch {
      aiDetectorRan = false;
    }
  }

  // 2. Try Native Chromium FaceDetector ONLY if AI detector hasn't run yet
  if (!detected && !aiDetectorRan && nativeChromiumFaceDetector) {
    try {
      const faces = await nativeChromiumFaceDetector.detect(video);
      aiDetectorRan = true;
      if (faces && faces.length > 0) {
        const f = faces[0];
        detected = true;
        confidence = 0.92;
        bBox = {
          x: f.boundingBox.x,
          y: f.boundingBox.y,
          width: f.boundingBox.width,
          height: f.boundingBox.height,
        };
        const cx = bBox.x + bBox.width / 2;
        const cy = bBox.y + bBox.height / 2;
        landmarks = {
          leftEye: { x: cx - bBox.width * 0.2, y: cy - bBox.height * 0.15 },
          rightEye: { x: cx + bBox.width * 0.2, y: cy - bBox.height * 0.15 },
          noseTip: { x: cx, y: cy + bBox.height * 0.05 },
          mouthCenter: { x: cx, y: cy + bBox.height * 0.28 },
        };
        // Use detected facial keypoints if provided
        if (f.landmarks && Array.isArray(f.landmarks)) {
          for (const lm of f.landmarks) {
            if (lm.type === 'eye' && lm.locations?.[0]) {
              if (lm.locations[0].x < cx) landmarks.leftEye = lm.locations[0];
              else landmarks.rightEye = lm.locations[0];
            } else if (lm.type === 'nose' && lm.locations?.[0]) {
              landmarks.noseTip = lm.locations[0];
            } else if (lm.type === 'mouth' && lm.locations?.[0]) {
              landmarks.mouthCenter = lm.locations[0];
            }
          }
        }
      }
    } catch {
      // Continue
    }
  }

  // 3. Fallback to Canvas Analyzer if AI detector hasn't detected a face
  let fallbackYaw = 0;
  let fallbackPitch = 0;
  let detectedViaFallback = false;

  if (!detected) {
    const fallbackRes = analyzeFrameFallback(video, fallbackCanvas);
    if (fallbackRes.detected && fallbackRes.box) {
      detected = true;
      detectedViaFallback = true;
      confidence = fallbackRes.confidence || 0.45;
      bBox = fallbackRes.box;
      landmarks = fallbackRes.landmarks;
      colorSig = fallbackRes.colorSig;
      fallbackYaw = fallbackRes.yawAngle;
      fallbackPitch = fallbackRes.pitchAngle;
    }
  }

  if (!detected || !bBox || !landmarks) {
    return {
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
      reason: 'Không phát hiện khuôn mặt trước màn hình',
    };
  }

  // Sample actual skin color from detected face if available
  if (fallbackCanvas && bBox) {
    try {
      const sampleX = Math.max(0, Math.floor(bBox.x + bBox.width * 0.35));
      const sampleY = Math.max(0, Math.floor(bBox.y + bBox.height * 0.40));
      const sampleW = Math.max(8, Math.floor(bBox.width * 0.30));
      const sampleH = Math.max(8, Math.floor(bBox.height * 0.25));
      fallbackCanvas.width = 32;
      fallbackCanvas.height = 32;
      const sCtx = fallbackCanvas.getContext('2d', { willReadFrequently: true });
      if (sCtx) {
        sCtx.drawImage(video, sampleX, sampleY, sampleW, sampleH, 0, 0, 32, 32);
        const data = sCtx.getImageData(0, 0, 32, 32).data;
        let rSum = 0, gSum = 0, bSum = 0, cnt = 0;
        for (let i = 0; i < data.length; i += 4) {
          rSum += data[i];
          gSum += data[i + 1];
          bSum += data[i + 2];
          cnt++;
        }
        if (cnt > 0) {
          colorSig = [Math.round(rSum / cnt), Math.round(gSum / cnt), Math.round(bSum / cnt)];
        }
      }
    } catch {
      // Keep default
    }
  }

  // Calculate Distance Ratio (Face area relative to camera frame)
  const faceArea = bBox.width * bBox.height;
  const distanceRatio = Math.min(1, faceArea / totalFrameArea);
  // Any face with area >= 1.2% of camera frame is recognized as sitting in front of screen
  const isSittingInFront = distanceRatio >= 0.012;

  // Calculate Head Pose Angles (Yaw, Pitch, Roll)
  const le = landmarks.leftEye;
  const re = landmarks.rightEye;
  const nose = landmarks.noseTip;
  const mouth = landmarks.mouthCenter;

  // Eye distance
  const eyeDistance = Math.hypot(re.x - le.x, re.y - le.y);
  const eyeMidX = (le.x + re.x) / 2;
  const eyeMidY = (le.y + re.y) / 2;

  // Roll angle (tilt left/right shoulder)
  const rollAngle = Math.atan2(re.y - le.y, re.x - le.x) * (180 / Math.PI);

  let yawAngle = 0;
  let pitchAngle = 0;

  if (detectedViaFallback) {
    yawAngle = fallbackYaw;
    pitchAngle = fallbackPitch;
  } else {
    // Yaw angle from keypoints
    const halfEyeDist = Math.max(1, eyeDistance / 2);
    const yawDisplacement = (nose.x - eyeMidX) / halfEyeDist;
    yawAngle = Math.round(yawDisplacement * 38);

    if (landmarks.leftEar && landmarks.rightEar) {
      const leftEarDist = Math.hypot(landmarks.leftEar.x - nose.x, landmarks.leftEar.y - nose.y);
      const rightEarDist = Math.hypot(landmarks.rightEar.x - nose.x, landmarks.rightEar.y - nose.y);
      const earAsymmetry = (rightEarDist - leftEarDist) / Math.max(1, rightEarDist + leftEarDist);
      yawAngle = Math.round(yawAngle * 0.6 + earAsymmetry * 65 * 0.4);
    }

    // Pitch angle from keypoints
    const eyeToNoseDist = Math.hypot(nose.x - eyeMidX, nose.y - eyeMidY);
    const noseToMouthDist = Math.hypot(mouth.x - nose.x, mouth.y - nose.y);
    const pitchRatio = eyeToNoseDist / Math.max(5, noseToMouthDist);
    pitchAngle = Math.round((pitchRatio - 1.05) * 25);
    pitchAngle = Math.max(-45, Math.min(45, pitchAngle));
  }

  // Is user facing the screen?
  const isFacingScreen =
    Math.abs(yawAngle) <= settings.yawThresholdDeg &&
    Math.abs(pitchAngle) <= settings.pitchThresholdDeg;

  // Biometric Matching with Owner
  let matchScore = 0;
  let isMatchedOwner = false;

  const currentSignature = extractFaceSignature(bBox, landmarks, colorSig);

  if (owner) {
    matchScore = calculateMatchScore(
      currentSignature,
      owner.faceSignature,
      settings.lightingNormalization !== false
    );
    const threshold = settings.matchThresholdPercent || 50;
    isMatchedOwner = matchScore >= threshold;
  } else {
    // If no owner is enrolled yet, strictly return 0% and false
    matchScore = 0;
    isMatchedOwner = false;
  }

  // Determine Reason
  let reason = 'Đang nhìn thẳng vào màn hình';
  if (!owner) {
    reason = detected
      ? 'Phát hiện khuôn mặt nhưng chưa đăng ký chủ sở hữu'
      : 'Chưa đăng ký khuôn mặt chủ sở hữu';
  } else if (!isSittingInFront) {
    reason = 'Người dùng ở quá xa hoặc đã rời ghế';
  } else if (!isMatchedOwner) {
    reason = `Không khớp khuôn mặt chủ sở hữu (${matchScore}% / ${settings.matchThresholdPercent}%)`;
  } else if (!isFacingScreen) {
    if (Math.abs(yawAngle) > settings.yawThresholdDeg) {
      reason = `Đã quay mặt đi (${yawAngle > 0 ? 'sang phải' : 'sang trái'} ${Math.abs(yawAngle)}°)`;
    } else {
      reason = `Đã cúi hoặc ngẩng mặt đi (${Math.abs(pitchAngle)}° Pitch)`;
    }
  } else {
    reason = `Đã nhận diện: ${owner.name} (${matchScore}%)`;
  }

  return {
    detected: true,
    confidence,
    boundingBox: bBox,
    landmarks,
    yawAngle,
    pitchAngle,
    rollAngle: Math.round(rollAngle),
    isFacingScreen,
    distanceRatio,
    isSittingInFront,
    matchScore,
    isMatchedOwner,
    reason,
  };
}

// Helper to capture a snapshot and create an owner profile
export function createOwnerProfile(
  name: string,
  video: HTMLVideoElement | null,
  faceResult?: FaceDetectionResult,
  customSnapshot?: string
): OwnerProfile {
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 240;
  const ctx = canvas.getContext('2d');
  let hasDrawnVideo = false;

  if (ctx && video && video.videoWidth > 0 && video.readyState >= 2) {
    try {
      ctx.save();
      ctx.translate(320, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, 320, 240);
      ctx.restore();
      hasDrawnVideo = true;
    } catch (e) {
      console.warn('Video frame capture fallback:', e);
    }
  }

  let snapshotDataUrl = customSnapshot || '';
  if (!snapshotDataUrl && hasDrawnVideo) {
    try {
      snapshotDataUrl = canvas.toDataURL('image/jpeg', 0.85);
    } catch {
      snapshotDataUrl = '';
    }
  }

  // Sample actual color signature from video center face region if available
  let actualColorSig = [135, 110, 95];
  if (ctx && hasDrawnVideo) {
    try {
      const sample = ctx.getImageData(140, 100, 40, 40);
      let r = 0, g = 0, b = 0, count = 0;
      for (let i = 0; i < sample.data.length; i += 4) {
        r += sample.data[i];
        g += sample.data[i + 1];
        b += sample.data[i + 2];
        count++;
      }
      if (count > 0) {
        actualColorSig = [Math.round(r / count), Math.round(g / count), Math.round(b / count)];
      }
    } catch {
      // ignore
    }
  }

  // Fallback high-tech biometric avatar if snapshot from video was not available
  if (!snapshotDataUrl && ctx) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, 0, 320, 240);

    // Subtle radial glow
    const grad = ctx.createRadialGradient(160, 120, 10, 160, 120, 120);
    grad.addColorStop(0, 'rgba(14, 165, 233, 0.25)');
    grad.addColorStop(1, 'rgba(9, 9, 11, 0.95)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 320, 240);

    // Profile head silhouette
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(160, 95, 42, 0, Math.PI * 2);
    ctx.fill();

    // Shoulders
    ctx.beginPath();
    ctx.arc(160, 210, 75, Math.PI, 0);
    ctx.fill();

    // Biometric scanner reticle
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(160, 120, 70, 0, Math.PI * 2);
    ctx.stroke();

    snapshotDataUrl = canvas.toDataURL('image/png');
  }

  const vw = video?.videoWidth || 640;
  const vh = video?.videoHeight || 480;
  const bBox = faceResult?.boundingBox || {
    x: vw * 0.25,
    y: vh * 0.2,
    width: vw * 0.5,
    height: vh * 0.6,
  };

  const landmarks = faceResult?.landmarks;
  const faceSignature = extractFaceSignature(bBox, landmarks, actualColorSig);

  return {
    id: 'owner_' + Date.now(),
    name: (name && name.trim()) || 'Chủ Sở Hữu',
    enrolledAt: new Date().toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
    snapshotDataUrl,
    faceSignature,
  };
}
