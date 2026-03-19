import React, { useRef, useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { Vector2, Vector3 } from 'three';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TouchAppIcon from '@mui/icons-material/TouchApp';
import UndoIcon from '@mui/icons-material/Undo';
import { mobile } from '../responsive';

const AIFootMeasurement = ({ onMeasurementComplete }) => {
  const GUIDE_WIDTH_RATIO = 0.8;
  const GUIDE_HEIGHT_RATIO = 0.62;
  const GUIDE_REFERENCE_CM = 30;
  const FALLBACK_2D_SCALE_CORRECTION = 0.74;

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const offscreenCanvasRef = useRef(null);
  const streamRef = useRef(null);
  const animationFrameRef = useRef(null);
  const isMountedRef = useRef(true);
  const xrSessionRef = useRef(null);
  const xrRefSpaceRef = useRef(null);
  const xrTransientHitTestSourceRef = useRef(null);
  const xrFrameRef = useRef(null);
  const autoAppliedRef = useRef({ length: false, width: false, height: false });

  const [supportStatus, setSupportStatus] = useState({
    checking: true,
    supported: false,
    reason: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [cameraDebug, setCameraDebug] = useState('');
  const [measurementSource, setMeasurementSource] = useState('2d');
  const [autoDetectEnabled, setAutoDetectEnabled] = useState(true);
  const [autoDetectInfo, setAutoDetectInfo] = useState('');
  const [xrStatusMessage, setXrStatusMessage] = useState('');

  const [currentFoot, setCurrentFoot] = useState('left');
  const [measurementMode, setMeasurementMode] = useState('length');
  const [anglePrompt, setAnglePrompt] = useState('top');

  const [points, setPoints] = useState({
    lengthStart: null,
    lengthEnd: null,
    widthStart: null,
    widthEnd: null,
    heightStart: null,
    heightEnd: null,
  });
  const [worldPoints, setWorldPoints] = useState({
    lengthStart: null,
    lengthEnd: null,
    widthStart: null,
    widthEnd: null,
    heightStart: null,
    heightEnd: null,
  });

  const [leftFootMeasurement, setLeftFootMeasurement] = useState(null);
  const [rightFootMeasurement, setRightFootMeasurement] = useState(null);
  const [proposedPoints, setProposedPoints] = useState({
    lengthStart: null,
    lengthEnd: null,
    widthStart: null,
    widthEnd: null,
    heightStart: null,
    heightEnd: null,
  });

  const getGuideRect = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const w = canvas.width * GUIDE_WIDTH_RATIO;
    const h = canvas.height * GUIDE_HEIGHT_RATIO;
    const x = (canvas.width - w) / 2;
    const y = (canvas.height - h) / 2;
    return { x, y, w, h };
  }, [GUIDE_WIDTH_RATIO, GUIDE_HEIGHT_RATIO]);

  useEffect(() => {
    isMountedRef.current = true;

    const detectWebXRAR = async () => {
      if (!window.isSecureContext) {
        setSupportStatus({
          checking: false,
          supported: false,
          reason: 'AR live camera requires HTTPS secure context on this device.',
        });
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setSupportStatus({
          checking: false,
          supported: false,
          reason: 'This browser does not support camera API required for AI measurement.',
        });
        return;
      }

      if (!navigator.xr?.isSessionSupported) {
        setSupportStatus({
          checking: false,
          supported: false,
          reason: 'WebXR AR is not available on this browser or device.',
        });
        return;
      }

      try {
        const supported = await navigator.xr.isSessionSupported('immersive-ar');
        setSupportStatus({
          checking: false,
          supported,
          reason: supported ? '' : 'This device does not support immersive WebXR AR session.',
        });
      } catch (error) {
        setSupportStatus({
          checking: false,
          supported: false,
          reason: 'Unable to validate AR support. Use image upload method on this device.',
        });
      }
    };

    detectWebXRAR();

    return () => {
      isMountedRef.current = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (xrSessionRef.current) {
        xrSessionRef.current.end().catch(() => {});
      }
    };
  }, []);

  const estimatePixelsPerCm = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return 18;
    const guideWidthPx = canvas.width * GUIDE_WIDTH_RATIO;
    const guideLengthCm = GUIDE_REFERENCE_CM;
    return guideWidthPx / guideLengthCm;
  }, [GUIDE_WIDTH_RATIO, GUIDE_REFERENCE_CM]);

  const calculateDistanceCm2D = useCallback(
    (start, end) => {
      if (!start || !end) return null;
      const v1 = new Vector2(start.x, start.y);
      const v2 = new Vector2(end.x, end.y);
      const pixelDistance = v1.distanceTo(v2);
      const pixelsPerCm = estimatePixelsPerCm();
      const rawCm = pixelDistance / pixelsPerCm;
      const correctedCm = rawCm * FALLBACK_2D_SCALE_CORRECTION;
      return correctedCm.toFixed(2);
    },
    [estimatePixelsPerCm]
  );

  const calculateDistanceCmWorld = useCallback((start, end) => {
    if (!start || !end) return null;
    const v1 = new Vector3(start.x, start.y, start.z);
    const v2 = new Vector3(end.x, end.y, end.z);
    return (v1.distanceTo(v2) * 100).toFixed(2);
  }, []);

  const calculateDistanceCm = useCallback(
    (dimension) => {
      const keyMap = {
        length: ['lengthStart', 'lengthEnd'],
        width: ['widthStart', 'widthEnd'],
        height: ['heightStart', 'heightEnd'],
      };

      const keys = keyMap[dimension];
      if (!keys) return null;

      const [startKey, endKey] = keys;
      const start = points[startKey];
      const end = points[endKey];
      if (!start || !end) return null;

      if (measurementSource === 'xr-metric') {
        const worldStart = worldPoints[startKey];
        const worldEnd = worldPoints[endKey];
        const worldDistance = calculateDistanceCmWorld(worldStart, worldEnd);
        if (worldDistance) return worldDistance;
      }

      return calculateDistanceCm2D(start, end);
    },
    [points, worldPoints, measurementSource, calculateDistanceCm2D, calculateDistanceCmWorld]
  );

  const drawPoint = (ctx, point, color, label) => {
    ctx.beginPath();
    ctx.arc(point.x, point.y, 10, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(point.x, point.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    ctx.fillStyle = color;
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, point.x, point.y);
  };

  const drawLengthHighlight = useCallback((ctx, start, end) => {
    // Extra highlight so recorded length is clearly visible in live feed.
    ctx.save();
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.92)';
    ctx.lineWidth = 6;
    ctx.shadowColor = 'rgba(34, 197, 94, 0.55)';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    ctx.restore();
  }, []);

  const drawLine = useCallback((ctx, start, end, color, text) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();

    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;
    const width = ctx.measureText(text).width + 16;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(midX - width / 2, midY - 14, width, 28);

    ctx.fillStyle = color;
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, midX, midY);
  }, []);

  const drawGuide = useCallback((ctx, canvas) => {
    const rect = getGuideRect();
    if (!rect) return;
    const { x, y, w, h } = rect;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.setLineDash([8, 6]);
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
    ctx.setLineDash([]);
  }, [getGuideRect]);

  const drawOverlay = useCallback(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) return;

    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    drawGuide(ctx, canvas);

    const colorMap = {
      length: '#22C55E',
      width: '#FF5C5C',
      height: '#8E44AD',
    };
    const lengthCm = calculateDistanceCm('length');
    const widthCm = calculateDistanceCm('width');
    const heightCm = calculateDistanceCm('height');

    if (points.lengthStart) drawPoint(ctx, points.lengthStart, colorMap.length, '1');
    if (points.lengthEnd) drawPoint(ctx, points.lengthEnd, colorMap.length, '2');
    if (!points.lengthStart && proposedPoints.lengthStart) {
      drawPoint(ctx, proposedPoints.lengthStart, 'rgba(34, 197, 94, 0.55)', 'A');
    }
    if (!points.lengthEnd && proposedPoints.lengthEnd) {
      drawPoint(ctx, proposedPoints.lengthEnd, 'rgba(34, 197, 94, 0.55)', 'A');
    }
    if (points.lengthStart && points.lengthEnd) {
      drawLengthHighlight(ctx, points.lengthStart, points.lengthEnd);
      drawLine(ctx, points.lengthStart, points.lengthEnd, colorMap.length, `Length: ${lengthCm} cm`);
    }

    if (points.widthStart) drawPoint(ctx, points.widthStart, colorMap.width, '1');
    if (points.widthEnd) drawPoint(ctx, points.widthEnd, colorMap.width, '2');
    if (!points.widthStart && proposedPoints.widthStart) {
      drawPoint(ctx, proposedPoints.widthStart, 'rgba(255, 92, 92, 0.55)', 'A');
    }
    if (!points.widthEnd && proposedPoints.widthEnd) {
      drawPoint(ctx, proposedPoints.widthEnd, 'rgba(255, 92, 92, 0.55)', 'A');
    }
    if (points.widthStart && points.widthEnd) {
      drawLine(ctx, points.widthStart, points.widthEnd, colorMap.width, `Width: ${widthCm} cm`);
    }

    if (points.heightStart) drawPoint(ctx, points.heightStart, colorMap.height, '1');
    if (points.heightEnd) drawPoint(ctx, points.heightEnd, colorMap.height, '2');
    if (!points.heightStart && proposedPoints.heightStart) {
      drawPoint(ctx, proposedPoints.heightStart, 'rgba(142, 68, 173, 0.55)', 'A');
    }
    if (!points.heightEnd && proposedPoints.heightEnd) {
      drawPoint(ctx, proposedPoints.heightEnd, 'rgba(142, 68, 173, 0.55)', 'A');
    }
    if (points.heightStart && points.heightEnd) {
      drawLine(ctx, points.heightStart, points.heightEnd, colorMap.height, `Height: ${heightCm} cm`);
    }

    ctx.fillStyle = 'rgba(0, 0, 0, 0.68)';
    ctx.fillRect(0, 0, canvas.width, 64);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Show ${currentFoot.toUpperCase()} foot - ${measurementMode.toUpperCase()} mode`, canvas.width / 2, 24);
    ctx.font = '14px Arial';
    ctx.fillStyle = '#d9e8ff';
    ctx.fillText(
      anglePrompt === 'top'
        ? 'Top angle: keep full foot inside guide and mark points precisely.'
        : 'Side angle: rotate to side profile and mark floor-to-top for foot height.',
      canvas.width / 2,
      46
    );
    ctx.font = '12px Arial';
    ctx.fillStyle = '#9be7ff';
    ctx.textAlign = 'right';
    ctx.fillText(`Mode: ${measurementSource === 'xr-metric' ? 'True depth' : '2D fallback'}`, canvas.width - 12, 24);
  }, [
    anglePrompt,
    currentFoot,
    measurementMode,
    points,
    proposedPoints,
    drawLengthHighlight,
    drawGuide,
    drawLine,
    calculateDistanceCm,
    measurementSource,
  ]);

  const startDrawLoop = useCallback(() => {
    const drawFrame = () => {
      if (!isMountedRef.current) return;
      drawOverlay();
      animationFrameRef.current = requestAnimationFrame(drawFrame);
    };
    drawFrame();
  }, [drawOverlay]);

  const stopXRSession = useCallback(async () => {
    if (!xrSessionRef.current) return;
    try {
      await xrSessionRef.current.end();
    } catch (error) {
      // no-op
    }
    xrSessionRef.current = null;
    xrRefSpaceRef.current = null;
    xrTransientHitTestSourceRef.current = null;
    xrFrameRef.current = null;
    setMeasurementSource('2d');
  }, []);

  const startXRSessionIfAvailable = useCallback(async () => {
    if (!navigator.xr?.requestSession) {
      setMeasurementSource('2d');
      setXrStatusMessage('WebXR session API unavailable on this browser.');
      return false;
    }

    if (xrSessionRef.current) {
      setMeasurementSource('xr-metric');
      setXrStatusMessage('');
      return true;
    }

    try {
      const session = await navigator.xr.requestSession('immersive-ar', {
        requiredFeatures: ['hit-test'],
        optionalFeatures: ['dom-overlay'],
        domOverlay: { root: document.body },
      });

      const refSpace = await session.requestReferenceSpace('local');
      const transientHitTest = await session.requestHitTestSourceForTransientInput({
        profile: 'generic-touchscreen',
      });

      xrSessionRef.current = session;
      xrRefSpaceRef.current = refSpace;
      xrTransientHitTestSourceRef.current = transientHitTest;
      setMeasurementSource('xr-metric');
      setXrStatusMessage('');

      session.onend = () => {
        xrSessionRef.current = null;
        xrRefSpaceRef.current = null;
        xrTransientHitTestSourceRef.current = null;
        xrFrameRef.current = null;
        if (isMountedRef.current) {
          setMeasurementSource('2d');
        }
      };

      const xrLoop = (time, frame) => {
        if (!isMountedRef.current || !xrSessionRef.current) return;
        xrFrameRef.current = frame;
        xrSessionRef.current.requestAnimationFrame(xrLoop);
      };

      session.requestAnimationFrame(xrLoop);
      return true;
    } catch (error) {
      setMeasurementSource('2d');
      setXrStatusMessage(`XR metric unavailable (${error?.name || 'unknown'}).`);
      setCameraDebug((prev) => {
        const prefix = prev ? `${prev} | ` : '';
        return `${prefix}xr=${error?.name || 'unavailable'}`;
      });
      return false;
    }
  }, []);

  const isProposalPlausible = useCallback((proposal) => {
    if (!proposal?.lengthStart || !proposal?.lengthEnd || !proposal?.widthStart || !proposal?.widthEnd) {
      return { ok: false, reason: 'incomplete proposal' };
    }

    const lengthCm = parseFloat(calculateDistanceCm2D(proposal.lengthStart, proposal.lengthEnd));
    const widthCm = parseFloat(calculateDistanceCm2D(proposal.widthStart, proposal.widthEnd));

    if (!Number.isFinite(lengthCm) || !Number.isFinite(widthCm)) {
      return { ok: false, reason: 'invalid numeric values' };
    }

    const widthRatio = widthCm / lengthCm;
    const plausibleLength = lengthCm >= 18 && lengthCm <= 34;
    const plausibleWidth = widthCm >= 6 && widthCm <= 16;
    const plausibleRatio = widthRatio >= 0.24 && widthRatio <= 0.58;

    if (plausibleLength && plausibleWidth && plausibleRatio) {
      return { ok: true, lengthCm, widthCm };
    }

    return {
      ok: false,
      reason: `rejected L=${lengthCm.toFixed(1)} W=${widthCm.toFixed(1)} ratio=${widthRatio.toFixed(2)}`,
    };
  }, [calculateDistanceCm2D]);

  const detectFootProposal = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2 || !autoDetectEnabled) return null;

    if (!offscreenCanvasRef.current) {
      offscreenCanvasRef.current = document.createElement('canvas');
    }

    const offscreen = offscreenCanvasRef.current;
    offscreen.width = video.videoWidth;
    offscreen.height = video.videoHeight;
    const ctx = offscreen.getContext('2d');
    ctx.drawImage(video, 0, 0, offscreen.width, offscreen.height);

    const guide = getGuideRect();
    if (!guide) return null;
    const x0 = Math.floor(guide.x);
    const y0 = Math.floor(guide.y);
    const w = Math.floor(guide.w);
    const h = Math.floor(guide.h);
    const x1 = Math.floor(x0 + w);
    const y1 = Math.floor(y0 + h);

    const image = ctx.getImageData(x0, y0, x1 - x0, y1 - y0);
    const data = image.data;
    const stride = 3;

    let sumR = 0;
    let sumG = 0;
    let sumB = 0;
    let count = 0;

    // Sample border as background model
    for (let py = 0; py < y1 - y0; py += stride) {
      for (let px = 0; px < x1 - x0; px += stride) {
        const onBorder =
          py < 15 ||
          py > y1 - y0 - 15 ||
          px < 15 ||
          px > x1 - x0 - 15;
        if (!onBorder) continue;

        const idx = (py * (x1 - x0) + px) * 4;
        sumR += data[idx];
        sumG += data[idx + 1];
        sumB += data[idx + 2];
        count += 1;
      }
    }

    if (count === 0) return null;
    const bgR = sumR / count;
    const bgG = sumG / count;
    const bgB = sumB / count;

    const contour = [];
    const effectiveBottom = y0 + Math.floor(h * 0.93);
    for (let py = 1; py < y1 - y0 - 1; py += stride) {
      for (let px = 1; px < x1 - x0 - 1; px += stride) {
        if (y0 + py > effectiveBottom) continue;
        const idx = (py * (x1 - x0) + px) * 4;
        const dr = data[idx] - bgR;
        const dg = data[idx + 1] - bgG;
        const db = data[idx + 2] - bgB;
        const diff = Math.sqrt(dr * dr + dg * dg + db * db);
        if (diff < 38) continue;

        // Keep edge-like samples to form contour candidates.
        const rightIdx = (py * (x1 - x0) + (px + 1)) * 4;
        const edge = Math.abs(data[idx] - data[rightIdx]) + Math.abs(data[idx + 1] - data[rightIdx + 1]);
        if (edge < 15) continue;

        contour.push({ x: x0 + px, y: y0 + py });
      }
    }

    if (contour.length < 20) return null;

    // Length endpoints via robust principal-axis projection (less sensitive to leg/ankle outliers).
    let lengthStart = null;
    let lengthEnd = null;
    const sampleStep = Math.max(1, Math.floor(contour.length / 140));

    // Estimate major axis from covariance.
    let meanX = 0;
    let meanY = 0;
    let n = 0;
    for (let i = 0; i < contour.length; i += sampleStep) {
      meanX += contour[i].x;
      meanY += contour[i].y;
      n += 1;
    }
    if (n === 0) return null;
    meanX /= n;
    meanY /= n;

    let sxx = 0;
    let syy = 0;
    let sxy = 0;
    for (let i = 0; i < contour.length; i += sampleStep) {
      const dx = contour[i].x - meanX;
      const dy = contour[i].y - meanY;
      sxx += dx * dx;
      syy += dy * dy;
      sxy += dx * dy;
    }

    const theta = 0.5 * Math.atan2(2 * sxy, sxx - syy);
    const ux = Math.cos(theta);
    const uy = Math.sin(theta);

    const projected = [];
    for (let i = 0; i < contour.length; i += sampleStep) {
      const p = contour[i];
      const t = (p.x - meanX) * ux + (p.y - meanY) * uy;
      projected.push({ p, t });
    }
    projected.sort((a, b) => a.t - b.t);

    const lowIdx = Math.floor(projected.length * 0.08);
    const highIdx = Math.floor(projected.length * 0.90);
    lengthStart = projected[lowIdx]?.p || null;
    lengthEnd = projected[highIdx]?.p || null;

    if (!lengthStart || !lengthEnd) return null;

    // Width endpoints: use trimmed normal projections around mid-foot to avoid ankle/background outliers.
    const lx = lengthEnd.x - lengthStart.x;
    const ly = lengthEnd.y - lengthStart.y;
    const len = Math.sqrt(lx * lx + ly * ly) || 1;
    const uxLen = lx / len;
    const uyLen = ly / len;
    const nx = -ly / len;
    const ny = lx / len;
    const mx = (lengthStart.x + lengthEnd.x) / 2;
    const my = (lengthStart.y + lengthEnd.y) / 2;
    const lengthAxisSamples = [];
    for (let i = 0; i < contour.length; i += sampleStep) {
      const p = contour[i];
      const t = (p.x - lengthStart.x) * uxLen + (p.y - lengthStart.y) * uyLen;
      if (t < 0 || t > len) continue;
      const nProj = (p.x - mx) * nx + (p.y - my) * ny;
      lengthAxisSamples.push({ p, t, nProj });
    }

    if (lengthAxisSamples.length < 10) return null;

    // First pass: center band where forefoot width is more stable than heel/ankle transitions.
    const centerBand = lengthAxisSamples.filter((s) => s.t >= len * 0.28 && s.t <= len * 0.78);
    const widthCandidates = centerBand.length >= 8 ? centerBand : lengthAxisSamples;

    widthCandidates.sort((a, b) => a.nProj - b.nProj);
    const lowIndex = Math.max(0, Math.floor(widthCandidates.length * 0.12));
    const highIndex = Math.min(widthCandidates.length - 1, Math.floor(widthCandidates.length * 0.88));
    let widthStart = widthCandidates[lowIndex]?.p || null;
    let widthEnd = widthCandidates[highIndex]?.p || null;

    // Second pass guard: when width is still too large, tighten to a narrower mid-foot band.
    if (widthStart && widthEnd) {
      const roughLengthCm = parseFloat(calculateDistanceCm2D(lengthStart, lengthEnd));
      const roughWidthCm = parseFloat(calculateDistanceCm2D(widthStart, widthEnd));
      const roughRatio = roughWidthCm / roughLengthCm;

      if (Number.isFinite(roughRatio) && roughRatio > 0.62) {
        const tighterBand = lengthAxisSamples.filter((s) => s.t >= len * 0.38 && s.t <= len * 0.70);
        if (tighterBand.length >= 8) {
          tighterBand.sort((a, b) => a.nProj - b.nProj);
          const tightLow = Math.max(0, Math.floor(tighterBand.length * 0.2));
          const tightHigh = Math.min(tighterBand.length - 1, Math.floor(tighterBand.length * 0.8));
          widthStart = tighterBand[tightLow]?.p || widthStart;
          widthEnd = tighterBand[tightHigh]?.p || widthEnd;
        }
      }
    }

    // Height proposal for side mode: floor-to-top by y extrema near guide center.
    const centerX = (x0 + x1) / 2;
    let topPoint = null;
    let bottomPoint = null;
    for (let i = 0; i < contour.length; i += sampleStep) {
      const p = contour[i];
      if (Math.abs(p.x - centerX) > (x1 - x0) * 0.35) continue;
      if (!topPoint || p.y < topPoint.y) topPoint = p;
      if (!bottomPoint || p.y > bottomPoint.y) bottomPoint = p;
    }

    return {
      lengthStart,
      lengthEnd,
      widthStart,
      widthEnd,
      heightStart: bottomPoint,
      heightEnd: topPoint,
      score: contour.length,
    };
  }, [autoDetectEnabled, getGuideRect, calculateDistanceCm2D]);

  const getWorldPointFromXR = useCallback(() => {
    if (measurementSource !== 'xr-metric') return null;

    const frame = xrFrameRef.current;
    const refSpace = xrRefSpaceRef.current;
    const transientSource = xrTransientHitTestSourceRef.current;

    if (!frame || !refSpace || !transientSource || !frame.getHitTestResultsForTransientInput) {
      return null;
    }

    const transientResults = frame.getHitTestResultsForTransientInput(transientSource);
    for (const result of transientResults) {
      if (!result.results || result.results.length === 0) continue;
      const pose = result.results[0].getPose(refSpace);
      if (!pose) continue;
      return {
        x: pose.transform.position.x,
        y: pose.transform.position.y,
        z: pose.transform.position.z,
      };
    }

    return null;
  }, [measurementSource]);

  const getCameraPermissionState = async () => {
    if (!navigator.permissions?.query) {
      return 'unsupported';
    }

    try {
      const result = await navigator.permissions.query({ name: 'camera' });
      return result?.state || 'unknown';
    } catch (error) {
      return 'unknown';
    }
  };

  const getFriendlyCameraError = (error) => {
    if (error?.name === 'NotAllowedError') {
      return 'Camera permission is blocked in browser settings. Please allow camera access and reload.';
    }
    if (error?.name === 'NotReadableError') {
      return 'Camera is busy in another app or browser tab. Close other camera apps and retry.';
    }
    if (error?.name === 'OverconstrainedError') {
      return 'Requested camera settings are unsupported. Falling back failed on this device.';
    }
    if (error?.name === 'NotFoundError') {
      return 'No usable camera was found on this device.';
    }
    if (error?.name === 'AbortError') {
      return 'Camera start was interrupted by the browser. Please retry.';
    }
    if (error?.message === 'VIDEO_ELEMENT_MISSING') {
      return 'Camera could not start because video renderer is not ready. Please retry once.';
    }
    return 'Unable to open live camera. Please try again.';
  };

  const getCameraStreamWithFallback = async () => {
    const attempts = [
      {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      },
      {
        video: {
          facingMode: 'environment',
        },
        audio: false,
      },
      {
        video: true,
        audio: false,
      },
    ];

    let lastError = null;

    for (let i = 0; i < attempts.length; i += 1) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(attempts[i]);
        return stream;
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error('CAMERA_START_FAILED');
  };

  const startCamera = async () => {
    if (!supportStatus.supported) {
      setCameraError(supportStatus.reason || 'AI camera is not supported on this device.');
      return;
    }

    setIsLoading(true);
    setCameraError('');
    setCameraDebug('');
    setAutoDetectInfo('');

    try {
      // Request XR session immediately in the click call stack to preserve user-gesture activation.
      const xrStartPromise = startXRSessionIfAvailable();

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      const stream = await getCameraStreamWithFallback();

      if (!isMountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      const video = videoRef.current;
      if (!video) {
        throw new Error('VIDEO_ELEMENT_MISSING');
      }

      streamRef.current = stream;
      video.srcObject = stream;
      await video.play();

      if (!isMountedRef.current) return;

      setCameraReady(true);
      setIsLoading(false);
      startDrawLoop();
      const xrStarted = await xrStartPromise;
      if (!xrStarted && !xrStatusMessage) {
        setXrStatusMessage('True-depth XR did not start. Using calibrated 2D fallback.');
      }
    } catch (error) {
      if (!isMountedRef.current) return;
      setIsLoading(false);

      const message = getFriendlyCameraError(error);
      const permissionState = await getCameraPermissionState();
      const detail = [
        `error=${error?.name || 'UnknownError'}`,
        `permission=${permissionState}`,
        `secure=${window.isSecureContext ? 'yes' : 'no'}`,
        `message=${error?.message || 'n/a'}`,
      ].join(' | ');

      setCameraError(message);
      setCameraDebug(detail);
    }
  };

  const snapToProposalIfNear = useCallback((point, modeKey) => {
    const guide = getGuideRect();
    if (!guide) return point;

    // Keep manual points inside guide to avoid extreme outliers.
    const clamped = {
      x: Math.max(guide.x, Math.min(guide.x + guide.w, point.x)),
      y: Math.max(guide.y, Math.min(guide.y + guide.h, point.y)),
    };

    const candidates = [];
    if (modeKey === 'length') {
      if (proposedPoints.lengthStart) candidates.push(proposedPoints.lengthStart);
      if (proposedPoints.lengthEnd) candidates.push(proposedPoints.lengthEnd);
    } else if (modeKey === 'width') {
      if (proposedPoints.widthStart) candidates.push(proposedPoints.widthStart);
      if (proposedPoints.widthEnd) candidates.push(proposedPoints.widthEnd);
    } else {
      if (proposedPoints.heightStart) candidates.push(proposedPoints.heightStart);
      if (proposedPoints.heightEnd) candidates.push(proposedPoints.heightEnd);
    }

    let nearest = null;
    let nearestD2 = Number.POSITIVE_INFINITY;
    for (const c of candidates) {
      const dx = c.x - clamped.x;
      const dy = c.y - clamped.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < nearestD2) {
        nearestD2 = d2;
        nearest = c;
      }
    }

    // Snap when close to proposed contour endpoint (within ~35 px).
    if (nearest && nearestD2 <= 35 * 35) {
      return { x: nearest.x, y: nearest.y };
    }

    return clamped;
  }, [proposedPoints, getGuideRect]);

  const handleCanvasTap = useCallback(
    (event) => {
      event.preventDefault();

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      const clientX =
        event.clientX ?? event.changedTouches?.[0]?.clientX ?? event.touches?.[0]?.clientX;
      const clientY =
        event.clientY ?? event.changedTouches?.[0]?.clientY ?? event.touches?.[0]?.clientY;

      if (clientX === undefined || clientY === undefined) return;

      const rawPoint = {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY,
      };
      const modeKey = measurementMode === 'length' ? 'length' : (measurementMode === 'width' ? 'width' : 'height');
      const point = snapToProposalIfNear(rawPoint, modeKey);
      const worldPoint = getWorldPointFromXR();

      setPoints((prev) => {
        if (measurementMode === 'length') {
          if (!prev.lengthStart) {
            setWorldPoints((wp) => ({ ...wp, lengthStart: worldPoint }));
            return { ...prev, lengthStart: point };
          }
          if (!prev.lengthEnd) {
            setWorldPoints((wp) => ({ ...wp, lengthEnd: worldPoint }));
            return { ...prev, lengthEnd: point };
          }
          return prev;
        }

        if (measurementMode === 'width') {
          if (!prev.widthStart) {
            setWorldPoints((wp) => ({ ...wp, widthStart: worldPoint }));
            return { ...prev, widthStart: point };
          }
          if (!prev.widthEnd) {
            setWorldPoints((wp) => ({ ...wp, widthEnd: worldPoint }));
            return { ...prev, widthEnd: point };
          }
          return prev;
        }

        if (!prev.heightStart) {
          setWorldPoints((wp) => ({ ...wp, heightStart: worldPoint }));
          return { ...prev, heightStart: point };
        }
        if (!prev.heightEnd) {
          setWorldPoints((wp) => ({ ...wp, heightEnd: worldPoint }));
          return { ...prev, heightEnd: point };
        }
        return prev;
      });
    },
    [measurementMode, getWorldPointFromXR, snapToProposalIfNear]
  );

  useEffect(() => {
    if (!cameraReady || !autoDetectEnabled) return;

    const isCurrentModeIncomplete =
      (measurementMode === 'length' && (!points.lengthStart || !points.lengthEnd)) ||
      (measurementMode === 'width' && (!points.widthStart || !points.widthEnd)) ||
      (measurementMode === 'height' && (!points.heightStart || !points.heightEnd));

    if (!isCurrentModeIncomplete) return;

    const timer = setInterval(() => {
      const proposal = detectFootProposal();
      if (!proposal) return;

      const proposalCheck = isProposalPlausible(proposal);
      if (!proposalCheck.ok) {
        setAutoDetectInfo(`Auto contour ${proposalCheck.reason}. Use manual tap/undo.`);
        return;
      }

      setProposedPoints((prev) => ({
        ...prev,
        ...proposal,
      }));
      setAutoDetectInfo(
        `Auto contour detected (${proposal.score} samples): L~${proposalCheck.lengthCm.toFixed(1)} W~${proposalCheck.widthCm.toFixed(1)} cm`
      );

      if (measurementMode === 'length' && !autoAppliedRef.current.length) {
        setPoints((prev) => {
          if (prev.lengthStart || prev.lengthEnd) return prev;
          return {
            ...prev,
            lengthStart: proposal.lengthStart,
            lengthEnd: proposal.lengthEnd,
          };
        });
        autoAppliedRef.current.length = true;
      }

      if (measurementMode === 'width' && !autoAppliedRef.current.width) {
        setPoints((prev) => {
          if (prev.widthStart || prev.widthEnd) return prev;
          return {
            ...prev,
            widthStart: proposal.widthStart,
            widthEnd: proposal.widthEnd,
          };
        });
        autoAppliedRef.current.width = true;
      }

      if (measurementMode === 'height' && !autoAppliedRef.current.height) {
        setPoints((prev) => {
          if (prev.heightStart || prev.heightEnd) return prev;
          return {
            ...prev,
            heightStart: proposal.heightStart,
            heightEnd: proposal.heightEnd,
          };
        });
        autoAppliedRef.current.height = true;
      }
    }, 700);

    return () => clearInterval(timer);
  }, [cameraReady, autoDetectEnabled, measurementMode, points, detectFootProposal, isProposalPlausible]);

  const undoLastPoint = () => {
    setPoints((prev) => {
      if (measurementMode === 'height') {
        if (prev.heightEnd) return { ...prev, heightEnd: null };
        if (prev.heightStart) return { ...prev, heightStart: null };
        return prev;
      }

      if (measurementMode === 'width') {
        if (prev.widthEnd) return { ...prev, widthEnd: null };
        if (prev.widthStart) return { ...prev, widthStart: null };
        return prev;
      }

      if (prev.lengthEnd) return { ...prev, lengthEnd: null };
      if (prev.lengthStart) return { ...prev, lengthStart: null };
      return prev;
    });
  };

  const clearCurrentFootPoints = () => {
    setPoints({
      lengthStart: null,
      lengthEnd: null,
      widthStart: null,
      widthEnd: null,
      heightStart: null,
      heightEnd: null,
    });
    setWorldPoints({
      lengthStart: null,
      lengthEnd: null,
      widthStart: null,
      widthEnd: null,
      heightStart: null,
      heightEnd: null,
    });
    setMeasurementMode('length');
    setAnglePrompt('top');
    setProposedPoints({
      lengthStart: null,
      lengthEnd: null,
      widthStart: null,
      widthEnd: null,
      heightStart: null,
      heightEnd: null,
    });
    autoAppliedRef.current = { length: false, width: false, height: false };
  };

  const handleSaveCurrentFoot = () => {
    const length = calculateDistanceCm('length');
    const width = calculateDistanceCm('width');
    const height = calculateDistanceCm('height');

    if (!length || !width) return;

    const measurement = {
      length,
      width,
      height: height || null,
    };

    if (currentFoot === 'left') {
      setLeftFootMeasurement(measurement);
      setCurrentFoot('right');
      clearCurrentFootPoints();
      return;
    }

    setRightFootMeasurement(measurement);
  };

  const handleConfirm = () => {
    if (!leftFootMeasurement || !rightFootMeasurement || !onMeasurementComplete) return;
    onMeasurementComplete({
      left: leftFootMeasurement.length,
      right: rightFootMeasurement.length,
    });
  };

  const handleReset = () => {
    setLeftFootMeasurement(null);
    setRightFootMeasurement(null);
    setCurrentFoot('left');
    clearCurrentFootPoints();
  };

  useEffect(() => {
    if (!cameraReady) {
      stopXRSession();
    }
  }, [cameraReady, stopXRSession]);

  const lengthMeasured = !!(points.lengthStart && points.lengthEnd);
  const widthMeasured = !!(points.widthStart && points.widthEnd);
  const heightMeasured = !!(points.heightStart && points.heightEnd);
  const canSaveCurrentFoot = lengthMeasured && widthMeasured;
  const bothFeetMeasured = !!(leftFootMeasurement && rightFootMeasurement);

  if (supportStatus.checking) {
    return (
      <LoadingContainer>
        <LoadingSpinner />
        <LoadingText>Checking AR support...</LoadingText>
      </LoadingContainer>
    );
  }

  if (!supportStatus.supported) {
    return (
      <ErrorContainer>
        <ErrorText>{supportStatus.reason}</ErrorText>
        <InfoText>Please use the Upload Images method on this device.</InfoText>
      </ErrorContainer>
    );
  }

  return (
    <Container>
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        style={{
          position: 'fixed',
          top: '-9999px',
          left: '-9999px',
          width: '1px',
          height: '1px',
          pointerEvents: 'none',
        }}
      />

      {!cameraReady ? (
        <StartPanel>
          <InstructionTitle>
            <TouchAppIcon style={{ marginRight: '8px' }} />
            AI Live Camera (WebXR AR)
          </InstructionTitle>
          <InstructionText>
            Show left foot first. Mark heel and toe for length, left-right edges for width, and optional
            side profile points for height. Then move to right foot.
          </InstructionText>
          <StartButton type="button" onClick={startCamera} disabled={isLoading}>
            {isLoading ? 'Starting Camera...' : 'Start AI Camera'}
          </StartButton>
          {cameraError && <AccuracyWarning>{cameraError}</AccuracyWarning>}
          {cameraDebug && <DebugText>{cameraDebug}</DebugText>}
        </StartPanel>
      ) : (
        <>
          {measurementSource === '2d' && xrStatusMessage && (
            <AccuracyWarning>{xrStatusMessage}</AccuracyWarning>
          )}

          <AutoDetectRow>
            <AutoDetectLabel>
              <input
                type="checkbox"
                checked={autoDetectEnabled}
                onChange={(e) => setAutoDetectEnabled(e.target.checked)}
              />
              Auto detect points from contour (manual override with Undo + tap)
            </AutoDetectLabel>
            {autoDetectInfo && <AutoDetectInfo>{autoDetectInfo}</AutoDetectInfo>}
          </AutoDetectRow>

          <ProgressContainer>
            <ProgressStep completed={!!leftFootMeasurement} active={currentFoot === 'left'}>
              <StepIcon completed={!!leftFootMeasurement}>
                {leftFootMeasurement ? <CheckCircleIcon /> : '1'}
              </StepIcon>
              <StepLabel>Left Foot</StepLabel>
            </ProgressStep>
            <ProgressLine completed={!!leftFootMeasurement} />
            <ProgressStep completed={!!rightFootMeasurement} active={currentFoot === 'right'}>
              <StepIcon completed={!!rightFootMeasurement}>
                {rightFootMeasurement ? <CheckCircleIcon /> : '2'}
              </StepIcon>
              <StepLabel>Right Foot</StepLabel>
            </ProgressStep>
          </ProgressContainer>

          <CameraContainer>
            <Canvas ref={canvasRef} onClick={handleCanvasTap} onTouchEnd={handleCanvasTap} />
          </CameraContainer>

          <ControlButtons>
            <UndoButton onClick={undoLastPoint}>
              <UndoIcon style={{ marginRight: '4px' }} />
              Undo
            </UndoButton>

            {measurementMode === 'length' && lengthMeasured && (
              <ModeButton onClick={() => setMeasurementMode('width')}>Measure Width</ModeButton>
            )}

            {measurementMode === 'width' && widthMeasured && (
              <ModeButton
                onClick={() => {
                  setMeasurementMode('height');
                  setAnglePrompt('side');
                }}
              >
                Measure Height (Optional)
              </ModeButton>
            )}

            {measurementMode === 'height' && (
              <ModeButton
                onClick={() => {
                  setMeasurementMode('width');
                  setAnglePrompt('top');
                }}
              >
                Back To Top Angle
              </ModeButton>
            )}

            <SaveButton onClick={handleSaveCurrentFoot} disabled={!canSaveCurrentFoot}>
              {currentFoot === 'left' ? 'Save Left And Next Foot' : 'Save Right Foot'}
            </SaveButton>
          </ControlButtons>

          {(lengthMeasured || widthMeasured || heightMeasured) && (
            <LiveMeasurements>
              {lengthMeasured && (
                <MeasurementBadge color="#22C55E">
                  L: {calculateDistanceCm('length')} cm
                </MeasurementBadge>
              )}
              {widthMeasured && (
                <MeasurementBadge color="#FF5C5C">
                  W: {calculateDistanceCm('width')} cm
                </MeasurementBadge>
              )}
              {heightMeasured && (
                <MeasurementBadge color="#8E44AD">
                  H: {calculateDistanceCm('height')} cm
                </MeasurementBadge>
              )}
            </LiveMeasurements>
          )}
        </>
      )}

      {(leftFootMeasurement || rightFootMeasurement) && (
        <ResultsContainer>
          <ResultsTitle>Live Measurement Results</ResultsTitle>
          {leftFootMeasurement && (
            <ResultItem>
              <ResultLabel>Left:</ResultLabel>
              <ResultValue>
                {leftFootMeasurement.length} cm (L), {leftFootMeasurement.width} cm (W)
                {leftFootMeasurement.height ? `, ${leftFootMeasurement.height} cm (H)` : ''}
              </ResultValue>
            </ResultItem>
          )}
          {rightFootMeasurement && (
            <ResultItem>
              <ResultLabel>Right:</ResultLabel>
              <ResultValue>
                {rightFootMeasurement.length} cm (L), {rightFootMeasurement.width} cm (W)
                {rightFootMeasurement.height ? `, ${rightFootMeasurement.height} cm (H)` : ''}
              </ResultValue>
            </ResultItem>
          )}
        </ResultsContainer>
      )}

      {(leftFootMeasurement || rightFootMeasurement) && (
        <ActionButtons>
          <ResetButton onClick={handleReset}>
            <RestartAltIcon style={{ marginRight: '4px' }} />
            Start Over
          </ResetButton>
          {bothFeetMeasured && (
            <ConfirmButton onClick={handleConfirm}>
              <CheckCircleIcon style={{ marginRight: '4px' }} />
              Use These Measurements
            </ConfirmButton>
          )}
        </ActionButtons>
      )}
    </Container>
  );
};

export default AIFootMeasurement;

const Container = styled.div`
  width: 100%;
`;

const StartPanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  background: #f4f9ff;
  border-radius: 10px;
  border: 1px solid #cfe0ff;
`;

const StartButton = styled.button`
  width: 100%;
  padding: 0.85rem 1rem;
  border: none;
  border-radius: 8px;
  background: var(--clr-mocha-3);
  color: #fff;
  font-weight: 600;
  cursor: pointer;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 240px;
`;

const LoadingSpinner = styled.div`
  width: 42px;
  height: 42px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid var(--clr-mocha-3);
  border-radius: 50%;
  animation: spin 1s linear infinite;

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const LoadingText = styled.p`
  margin-top: 1rem;
  color: #4b5563;
`;

const ErrorContainer = styled.div`
  background: #fff1f1;
  border: 1px solid #ffcaca;
  border-radius: 8px;
  padding: 1rem;
`;

const ErrorText = styled.p`
  margin: 0;
  color: #c62828;
  font-weight: 600;
`;

const InfoText = styled.p`
  margin: 0.6rem 0 0 0;
  color: #505866;
  font-size: 0.9rem;
`;

const AccuracyWarning = styled.div`
  background: #fff7df;
  border: 1px solid #ffe08b;
  border-radius: 8px;
  padding: 0.7rem 0.9rem;
  color: #7f5a14;
  font-size: 0.88rem;
`;

const DebugText = styled.p`
  margin: 0;
  padding: 0.6rem 0.7rem;
  border-radius: 6px;
  background: #111827;
  color: #d1d5db;
  font-size: 0.75rem;
  line-height: 1.4;
  word-break: break-word;
`;

const InstructionTitle = styled.h4`
  display: flex;
  align-items: center;
  margin: 0;
  color: #1e3a8a;
`;

const InstructionText = styled.p`
  margin: 0;
  color: #374151;
  font-size: 0.9rem;
  line-height: 1.45;
`;

const AutoDetectRow = styled.div`
  margin-bottom: 0.8rem;
  padding: 0.65rem 0.75rem;
  border-radius: 8px;
  background: #eef6ff;
  border: 1px solid #cde2ff;
`;

const AutoDetectLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 0.55rem;
  color: #1e3a8a;
  font-size: 0.84rem;
  font-weight: 500;

  input {
    width: 16px;
    height: 16px;
    cursor: pointer;
  }
`;

const AutoDetectInfo = styled.p`
  margin: 0.45rem 0 0 0;
  color: #32507e;
  font-size: 0.78rem;
`;

const ProgressContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 0.8rem;
`;

const ProgressStep = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  opacity: ${(props) => (props.active ? 1 : 0.6)};
`;

const StepIcon = styled.div`
  width: 38px;
  height: 38px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${(props) => (props.completed ? '#2e7d32' : '#d6d7da')};
  color: ${(props) => (props.completed ? '#ffffff' : '#4b5563')};
  font-weight: 700;
`;

const StepLabel = styled.span`
  font-size: 0.82rem;
  margin-top: 0.45rem;
  color: #4b5563;
`;

const ProgressLine = styled.div`
  width: 56px;
  height: 4px;
  margin: 0 0.7rem 1.3rem 0.7rem;
  border-radius: 999px;
  background: ${(props) => (props.completed ? '#2e7d32' : '#d6d7da')};
  ${mobile({ width: '34px' })}
`;

const CameraContainer = styled.div`
  border-radius: 10px;
  overflow: hidden;
  background: #000;
  touch-action: none;
`;

const Canvas = styled.canvas`
  width: 100%;
  display: block;
`;

const ControlButtons = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-top: 0.9rem;
`;

const UndoButton = styled.button`
  padding: 0.7rem 0.9rem;
  border: 1px solid #9ca3af;
  border-radius: 8px;
  background: #fff;
  color: #374151;
  display: flex;
  align-items: center;
  cursor: pointer;
`;

const ModeButton = styled.button`
  padding: 0.7rem 0.95rem;
  border: none;
  border-radius: 8px;
  background: #374151;
  color: #fff;
  cursor: pointer;
  font-weight: 500;
`;

const SaveButton = styled.button`
  flex: 1;
  min-width: 180px;
  padding: 0.7rem 1rem;
  border: none;
  border-radius: 8px;
  background: #2e7d32;
  color: #fff;
  font-weight: 600;
  cursor: pointer;

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`;

const LiveMeasurements = styled.div`
  margin-top: 0.8rem;
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const MeasurementBadge = styled.div`
  background: #111827;
  color: ${(props) => props.color};
  border-radius: 999px;
  padding: 0.45rem 0.75rem;
  font-weight: 600;
  font-size: 0.86rem;
`;

const ResultsContainer = styled.div`
  background: #edf8ef;
  border: 1px solid #cbe9cf;
  border-radius: 8px;
  margin-top: 1rem;
  padding: 1rem;
`;

const ResultsTitle = styled.h3`
  margin: 0 0 0.6rem 0;
  color: #1b5e20;
`;

const ResultItem = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 0.45rem;
`;

const ResultLabel = styled.span`
  font-weight: 700;
  color: #1f2937;
`;

const ResultValue = styled.span`
  color: #14532d;
  font-weight: 600;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.7rem;
  margin-top: 1rem;
  flex-wrap: wrap;
`;

const ResetButton = styled.button`
  padding: 0.75rem 1rem;
  border-radius: 8px;
  border: 1px solid #9ca3af;
  background: #fff;
  color: #374151;
  display: flex;
  align-items: center;
  cursor: pointer;
`;

const ConfirmButton = styled.button`
  flex: 1;
  min-width: 200px;
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 8px;
  background: #2e7d32;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-weight: 700;
`;
