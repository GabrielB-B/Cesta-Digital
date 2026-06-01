import { type CSSProperties, useCallback, useEffect, useRef, useState } from "react";
import { BrandLockup } from "./BrandLockup";

const SPLASH_VIDEO_START_SECONDS = 3.05;
const SPLASH_VIDEO_END_SECONDS = 9.88;
const SPLASH_VIDEO_PLAYBACK_RATE = 1;
const LOGIN_SUCCESS_VIDEO_DURATION_MS = 7400;
const LOGIN_SUCCESS_VIDEO_OUTRO_MS = 560;
const LOGIN_SUCCESS_FALLBACK_MS = 4200;

export const LOGIN_SUCCESS_SPLASH_TIMEOUT_MS = 8500;
export const LOGIN_SUCCESS_SPLASH_REDUCED_TIMEOUT_MS = 900;

interface LoginSuccessOverlayProps {
  onComplete?: () => void;
}

export function LoginSuccessOverlay({ onComplete }: LoginSuccessOverlayProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hasStartedVideoRef = useRef(false);
  const hasCompletedRef = useRef(false);
  const completionTimeoutRef = useRef<number | null>(null);
  const [hasVideoFailed, setHasVideoFailed] = useState(false);
  const [hasVideoFinished, setHasVideoFinished] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  const clearCompletionTimeout = useCallback(() => {
    if (completionTimeoutRef.current !== null) {
      window.clearTimeout(completionTimeoutRef.current);
      completionTimeoutRef.current = null;
    }
  }, []);

  const completeSplash = useCallback(() => {
    if (hasCompletedRef.current) {
      return;
    }

    hasCompletedRef.current = true;
    clearCompletionTimeout();
    onComplete?.();
  }, [clearCompletionTimeout, onComplete]);

  const completeSplashAfter = useCallback(
    (delayMs: number) => {
      if (hasCompletedRef.current) {
        return;
      }

      clearCompletionTimeout();
      completionTimeoutRef.current = window.setTimeout(completeSplash, delayMs);
    },
    [clearCompletionTimeout, completeSplash],
  );

  useEffect(() => {
    if (!window.matchMedia) {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleMotionChange = () => {
      setIsReducedMotion(mediaQuery.matches);
    };

    handleMotionChange();
    mediaQuery.addEventListener("change", handleMotionChange);

    return () => {
      mediaQuery.removeEventListener("change", handleMotionChange);
    };
  }, []);

  const shouldUseVideo = !isReducedMotion;
  const overlayDurationMs = shouldUseVideo && !hasVideoFailed
    ? LOGIN_SUCCESS_VIDEO_DURATION_MS
    : LOGIN_SUCCESS_FALLBACK_MS;
  const overlayStyle = {
    "--login-success-duration": `${overlayDurationMs}ms`,
  } as CSSProperties;
  const className = [
    "login-success-overlay",
    shouldUseVideo ? "login-success-overlay--video" : null,
    isVideoReady ? "login-success-overlay--video-ready" : null,
    hasVideoFinished ? "login-success-overlay--video-finished" : null,
  ]
    .filter(Boolean)
    .join(" ");

  useEffect(() => clearCompletionTimeout, [clearCompletionTimeout]);

  useEffect(() => {
    if (isReducedMotion) {
      completeSplashAfter(LOGIN_SUCCESS_SPLASH_REDUCED_TIMEOUT_MS);
      return;
    }

    if (hasVideoFailed) {
      completeSplashAfter(LOGIN_SUCCESS_FALLBACK_MS);
    }
  }, [completeSplashAfter, hasVideoFailed, isReducedMotion]);

  useEffect(() => {
    if (shouldUseVideo && isVideoReady) {
      completeSplashAfter(LOGIN_SUCCESS_VIDEO_DURATION_MS);
    }
  }, [completeSplashAfter, isVideoReady, shouldUseVideo]);

  function finishSplashVideo() {
    if (hasVideoFinished) {
      return;
    }

    setHasVideoFinished(true);
    completeSplashAfter(LOGIN_SUCCESS_VIDEO_OUTRO_MS);
  }

  function playSplashVideo() {
    const video = videoRef.current;

    if (!video || hasStartedVideoRef.current) {
      return;
    }

    hasStartedVideoRef.current = true;

    try {
      video.playbackRate = SPLASH_VIDEO_PLAYBACK_RATE;
      video.currentTime = SPLASH_VIDEO_START_SECONDS;
    } catch {
      setHasVideoFailed(true);
    }
  }

  function handleVideoSeeked() {
    const video = videoRef.current;

    if (!video || !hasStartedVideoRef.current || isVideoReady) {
      return;
    }

    setIsVideoReady(true);
    void video.play().catch(() => {
      setHasVideoFailed(true);
    });
  }

  function handleVideoCanPlay() {
    if (hasStartedVideoRef.current && !isVideoReady) {
      handleVideoSeeked();
    }
  }

  function handleVideoTimeUpdate() {
    const video = videoRef.current;

    if (!video || video.currentTime < SPLASH_VIDEO_END_SECONDS) {
      return;
    }

    finishSplashVideo();
  }

  return (
    <div
      className={className}
      role="status"
      aria-live="polite"
      aria-label="Entrada confirmada no Cesta Digital"
      style={overlayStyle}
    >
      {shouldUseVideo ? (
        <video
          ref={videoRef}
          className="login-success-overlay__video"
          muted
          playsInline
          preload="auto"
          onLoadedMetadata={playSplashVideo}
          onCanPlay={handleVideoCanPlay}
          onSeeked={handleVideoSeeked}
          onTimeUpdate={handleVideoTimeUpdate}
          onEnded={finishSplashVideo}
          onError={() => setHasVideoFailed(true)}
          aria-hidden="true"
        >
          <source src="/animations/login-splash.mp4" type="video/mp4" />
        </video>
      ) : (
        <>
          <div className="login-success-overlay__aura" aria-hidden="true" />
          <div className="login-success-overlay__smoke" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <svg
            className="login-success-overlay__infinity"
            viewBox="0 0 900 420"
            aria-hidden="true"
            focusable="false"
          >
            <defs>
              <linearGradient
                id="login-success-infinity"
                x1="60"
                y1="210"
                x2="840"
                y2="210"
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0%" stopColor="#7b5cff" stopOpacity="0" />
                <stop offset="18%" stopColor="#8d6cff" stopOpacity="0.96" />
                <stop offset="43%" stopColor="#dfc7ff" stopOpacity="0.98" />
                <stop offset="56%" stopColor="#ff5aa9" stopOpacity="0.98" />
                <stop offset="82%" stopColor="#ff3f96" stopOpacity="0.96" />
                <stop offset="100%" stopColor="#ff3f96" stopOpacity="0" />
              </linearGradient>
              <filter id="login-success-infinity-glow" x="-20%" y="-45%" width="140%" height="190%">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feColorMatrix
                  in="blur"
                  type="matrix"
                  values="1 0 0 0 0.8 0 1 0 0 0.18 0 0 1 0 0.82 0 0 0 0.8 0"
                  result="glow"
                />
                <feMerge>
                  <feMergeNode in="glow" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <path
              className="login-success-overlay__energy-line login-success-overlay__energy-line--main"
              d="M68 228C158 88 301 92 450 214C600 336 745 336 832 206C743 77 597 92 450 214C303 336 156 337 68 228Z"
            />
            <path
              className="login-success-overlay__energy-line login-success-overlay__energy-line--violet"
              d="M76 216C161 119 290 96 447 203C594 304 721 326 820 216C743 94 601 112 455 224C309 335 157 306 76 216Z"
            />
            <path
              className="login-success-overlay__energy-line login-success-overlay__energy-line--rose"
              d="M86 237C186 107 322 107 454 222C590 340 730 308 812 196C711 103 594 119 443 207C292 294 168 323 86 237Z"
            />
            <path
              className="login-success-overlay__energy-line login-success-overlay__energy-line--spark"
              d="M266 90C333 132 381 170 450 214C517 258 572 294 641 337"
            />
          </svg>
          <svg
            className="login-success-overlay__trails"
            viewBox="0 0 420 420"
            aria-hidden="true"
            focusable="false"
          >
            <defs>
              <linearGradient
                id="login-success-trail"
                x1="52"
                y1="64"
                x2="366"
                y2="344"
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0%" stopColor="#a84ee4" stopOpacity="0" />
                <stop offset="34%" stopColor="#bd57f3" stopOpacity="0.86" />
                <stop offset="70%" stopColor="#ff4ca6" stopOpacity="0.92" />
                <stop offset="100%" stopColor="#e8b84a" stopOpacity="0" />
              </linearGradient>
              <filter id="login-success-glow" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <path
              className="login-success-overlay__trail login-success-overlay__trail--outer"
              d="M84 244C64 160 126 72 216 62C314 51 376 124 352 206C332 276 263 318 188 304"
            />
            <path
              className="login-success-overlay__trail login-success-overlay__trail--inner"
              d="M270 132C327 166 342 230 305 280C269 329 190 333 148 286C110 244 119 184 162 152"
            />
            <path
              className="login-success-overlay__trail login-success-overlay__trail--stem"
              d="M156 298C166 240 204 186 236 136C253 109 269 83 286 58"
            />
          </svg>
        </>
      )}

      <div className="login-success-overlay__mark" aria-hidden="true">
        <span className="login-success-overlay__mark-ring" aria-hidden="true" />
        <BrandLockup variant="compact" title="Cesta Digital" subtitle="" markOnly />
        <span className="login-success-overlay__particles" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
        </span>
      </div>
    </div>
  );
}
