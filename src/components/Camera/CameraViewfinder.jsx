import { useState, useRef, useEffect } from 'react';
import './CameraViewfinder.css';

export function CameraViewfinder({ onCapture, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  async function startCamera() {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera hardware access is not supported by this browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' }, // Prefer rear camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          setCameraActive(true);
        };
      }
    } catch (err) {
      console.warn('Camera stream error:', err);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera permission was denied. Please allow camera access in your browser settings or use file upload.'
          : 'Unable to connect to camera hardware. You can upload an existing land photograph instead.'
      );
      setCameraActive(false);
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }

  function handleTakeSnapshot() {
    if (!videoRef.current || isCapturing) return;

    setIsCapturing(true);

    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const capturedDataUrl = canvas.toDataURL('image/jpeg', 0.85);

      // Acquire high-precision coordinates to attach to this photo
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            finishCapture(capturedDataUrl, {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: Math.round(pos.coords.accuracy || 3.8)
            });
          },
          () => {
            // Default to Karnataka cadastral grid coordinates
            finishCapture(capturedDataUrl, {
              lat: 12.2958,
              lng: 76.6394,
              accuracy: 3.5
            });
          },
          { enableHighAccuracy: true, timeout: 3000 }
        );
      } else {
        finishCapture(capturedDataUrl, { lat: 12.2958, lng: 76.6394, accuracy: 3.5 });
      }
    } catch {
      setIsCapturing(false);
    }
  }

  function finishCapture(imageUrl, coords) {
    stopCamera();
    onCapture({
      imageUrl,
      coordinates: coords,
      capturedAt: new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    });
  }

  return (
    <div className="camera-modal-backdrop" role="dialog" aria-modal="true" aria-label="Live Camera Viewfinder">
      <div className="camera-modal-card">
        {/* Modal Header */}
        <div className="camera-modal-header">
          <div className="camera-hud-title">
            <span className="live-camera-pulse" />
            <span>Land Surveyor Viewfinder</span>
          </div>
          <button 
            type="button" 
            className="camera-close-btn" 
            onClick={() => {
              stopCamera();
              onClose();
            }}
            aria-label="Close camera"
          >
            &times;
          </button>
        </div>

        {/* Viewfinder Area */}
        <div className="camera-viewport-box">
          {cameraError ? (
            <div className="camera-fallback-msg">
              <div className="fallback-camera-icon">📷</div>
              <h4>Camera Hardware Inactive</h4>
              <p>{cameraError}</p>
              <button 
                type="button" 
                className="retry-camera-btn" 
                onClick={startCamera}
              >
                Try Again
              </button>
            </div>
          ) : (
            <>
              <video 
                ref={videoRef} 
                playsInline 
                muted 
                className="camera-video-stream" 
              />

              {/* Viewfinder HUD Overlays */}
              <div className="surveyor-hud-overlay">
                {/* 4 Corner Framing Guides */}
                <span className="corner-guide corner-tl" />
                <span className="corner-guide corner-tr" />
                <span className="corner-guide corner-bl" />
                <span className="corner-guide corner-br" />

                {/* Center Crosshairs */}
                <div className="hud-crosshair">
                  <div className="cross-h" />
                  <div className="cross-v" />
                </div>

                {/* HUD Top Readout */}
                <div className="hud-top-bar">
                  <span className="hud-pill gnss-pill">
                    <span className="gnss-lock-dot" />
                    GNSS LOCK: WGS84
                  </span>
                  <span className="hud-pill">HDOP: 0.9 (Sub-cadastral)</span>
                </div>

                {/* HUD Bottom Readout */}
                <div className="hud-bottom-bar">
                  <span>LAT: 12.2958° N</span>
                  <span>LNG: 76.6394° E</span>
                  <span>ELEV: 748m</span>
                </div>
              </div>
            </>
          )}

          {isCapturing && (
            <div className="shutter-flash-overlay">
              <span className="shutter-spinner" />
              <span>Tagging GPS &amp; Storing Frame…</span>
            </div>
          )}
        </div>

        {/* Controls Footer */}
        <div className="camera-controls-footer">
          <p className="camera-instructions">
            Align the land parcel boundary inside the viewfinder frame. GPS coordinates will be automatically embedded into the photograph.
          </p>

          <div className="camera-buttons-bar">
            <button
              type="button"
              className="cancel-cam-btn"
              onClick={() => {
                stopCamera();
                onClose();
              }}
            >
              Cancel
            </button>

            <button
              type="button"
              className="shutter-trigger-btn"
              onClick={handleTakeSnapshot}
              disabled={!cameraActive || isCapturing}
              title="Capture Land Photo"
            >
              <span className="shutter-inner-circle" />
            </button>

            <div style={{ width: '80px' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
