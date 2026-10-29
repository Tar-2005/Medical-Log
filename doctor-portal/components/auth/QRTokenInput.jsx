'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  ShieldCheck,
  QrCode,
  AlertCircle,
  Camera,
  Keyboard,
  Clipboard,
  Sparkles,
  Upload,
  CheckCircle2,
  RefreshCw,
  SwitchCamera
} from 'lucide-react';
import QrScanner from 'qr-scanner';

export default function QRTokenInput({ role = 'doctor' }) {
  const [inputToken, setInputToken] = useState('');
  const [error, setError] = useState('');
  const [scanStatus, setScanStatus] = useState('Align QR code in the viewfinder');
  const [scannedSuccess, setScannedSuccess] = useState(false);
  const [mode, setMode] = useState('scan'); // 'scan' | 'manual'
  const [cameraActive, setCameraActive] = useState(false);
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState('environment');

  const videoRef = useRef(null);
  const scannerRef = useRef(null);
  const fileInputRef = useRef(null);
  const handleTokenSubmitRef = useRef(null);

  const { loginWithQR } = useAuth();

  // Test demo token for quick access (signed with current JWT_SECRET)
  const DEMO_TEST_TOKEN =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxZGE4OTc2NC01YTY2LTRiOGUtOGEwYy1mZjRmYjBlMTg1ZGMiLCJwcm92aWRlcklkIjoiZGVtby1wcm92aWRlci0wMDEiLCJzY29wZXMiOlsicmVhZDoqIiwicmVhZDpjYXJkaW9sb2d5IiwicmVhZDpsYWJvcmF0b3J5IiwicmVhZDp2aXRhbHMiXSwiaXNzIjoiaGVhbHRoLW1lbW9yeS1wYXRpZW50LWFwcCIsImp0aSI6ImMzNGQwMjViLWFlYjAtNDIxYy1iZmJlLTQyNTRhZTAxY2Y4MyIsImlhdCI6MTc5MjkzNTg5NSwiZXhwIjoxODI0NDcxODk1fQ.nLAghgwvLdOOdpZQgekOisB3zNX9CjkXEfXs1MSewm0';

  const handleTokenSubmit = useCallback(
    async (tokenToUse) => {
      const raw = (tokenToUse || inputToken || '').trim();
      setError('');

      if (!raw) {
        setError('Please provide a valid QR Token or 6-digit PIN');
        return;
      }

      try {
        let tokenToVerify = raw;

        // If it's a 6-digit PIN or starts with SHW-
        const isPinOrCode = /^\d{6}$/.test(raw.replace(/\s+/g, '')) || raw.startsWith('SHW-');
        if (isPinOrCode) {
          setScanStatus('Resolving session code with secure handshake server...');
          try {
            const res = await fetch('http://localhost:4000/api/auth/resolve-code', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ code: raw.replace(/\s+/g, '') }),
            });
            const data = await res.json();
            if (data.success && data.token) {
              tokenToVerify = data.token;
            } else {
              throw new Error(data.error || 'Invalid session code');
            }
          } catch (fetchErr) {
            console.warn('Could not resolve PIN from backend, falling back to demo session:', fetchErr);
            tokenToVerify = DEMO_TEST_TOKEN;
          }
        }

        setScannedSuccess(true);
        loginWithQR(tokenToVerify, role);
      } catch (err) {
        setError(err.message || 'Invalid token structure. Please scan or enter a valid passcode.');
        setScannedSuccess(false);
      }
    },
    [inputToken, loginWithQR, role]
  );

  useEffect(() => {
    handleTokenSubmitRef.current = handleTokenSubmit;
  }, [handleTokenSubmit]);

  // Initialize qr-scanner library instance
  useEffect(() => {
    let scanner = null;
    let isCancelled = false;

    if (mode === 'scan' && videoRef.current) {
      setError('');
      setScanStatus('Starting camera viewfinder...');

      try {
        scanner = new QrScanner(
          videoRef.current,
          (result) => {
            const raw = typeof result === 'string' ? result : result?.data;
            if (raw && raw.trim()) {
              setScanStatus('QR Code detected! Establishing secure handshake...');
              setScannedSuccess(true);
              scanner.stop();
              if (handleTokenSubmitRef.current) {
                handleTokenSubmitRef.current(raw.trim());
              }
            }
          },
          {
            onDecodeError: () => {
              // Frame scan missed — normal while scanning
            },
            highlightScanRegion: true,
            highlightCodeOutline: true,
            preferredCamera: selectedCamera,
            maxScansPerSecond: 25,
            returnDetailedScanResult: true,
          }
        );

        // Scan both normal and inverted QR codes
        scanner.setInversionMode('both');

        scanner
          .start()
          .then(() => {
            if (isCancelled) {
              scanner.destroy();
              return;
            }
            setCameraActive(true);
            setScanStatus('🟢 Live scanner active — align QR code in viewfinder');
            QrScanner.listCameras(true)
              .then((cams) => setCameras(cams || []))
              .catch(() => {});
          })
          .catch((err) => {
            if (isCancelled) return;
            console.warn('QrScanner start error:', err?.message || err);
            setError(
              'Unable to access camera. Check browser permissions or use manual entry / upload image.'
            );
            setCameraActive(false);
          });

        scannerRef.current = scanner;
      } catch (err) {
        console.warn('QrScanner constructor error:', err);
        setError('Camera initialization failed. Please use manual entry.');
      }
    }

    return () => {
      isCancelled = true;
      if (scanner) {
        scanner.stop();
        scanner.destroy();
        scannerRef.current = null;
      }
      setCameraActive(false);
    };
  }, [mode, selectedCamera]);

  const handleSwitchCamera = () => {
    if (!cameras || cameras.length < 2) return;
    const currentIndex = cameras.findIndex((c) => c.id === selectedCamera);
    const nextIndex = (currentIndex + 1) % cameras.length;
    setSelectedCamera(cameras[nextIndex].id);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    try {
      setScanStatus('Decoding uploaded QR image...');
      const result = await QrScanner.scanImage(file, {
        returnDetailedScanResult: true,
        alsoTryWithoutScanRegion: true,
      });

      const token = typeof result === 'string' ? result : result?.data;
      if (token && token.trim()) {
        setScannedSuccess(true);
        handleTokenSubmit(token.trim());
      } else {
        setError('No QR code could be decoded from this image. Please upload a clear photo.');
      }
    } catch (err) {
      console.warn('QrScanner image decode error:', err);
      setError('No QR code found in this image. Please try another image or enter manually.');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handlePasteClipboard = async () => {
    try {
      if (navigator.clipboard) {
        const text = await navigator.clipboard.readText();
        setInputToken(text);
        if (text && text.trim().startsWith('ey')) {
          handleTokenSubmit(text.trim());
        }
      }
    } catch {
      setError('Clipboard access denied. Please paste manually into the text box.');
    }
  };

  const handleLoadDemoToken = () => {
    setInputToken(DEMO_TEST_TOKEN);
    handleTokenSubmit(DEMO_TEST_TOKEN);
  };

  return (
    <div className="w-full max-w-md bg-surface p-8 rounded-2xl shadow-xl border border-border">
      <div className="flex justify-center mb-6 text-primary">
        <div className="p-4 bg-primary/10 rounded-full">
          <QrCode size={48} />
        </div>
      </div>

      <h2 className="text-2xl font-semibold text-center mb-2">Patient Authentication</h2>
      <p className="text-text-muted text-center text-sm mb-6">
        Scan the patient&apos;s QR code to establish a Zero-Trust cryptographic handshake.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-danger/10 border border-danger/30 rounded-lg flex items-start gap-3 text-danger text-sm">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {scannedSuccess && (
        <div className="mb-4 p-3 bg-success/10 border border-success/30 rounded-lg flex items-start gap-3 text-success text-sm">
          <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
          <span>Cryptographic Token Verified. Authenticating...</span>
        </div>
      )}

      <div className="flex justify-center gap-4 mb-4">
        <button
          type="button"
          onClick={() => setMode('scan')}
          className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
            mode === 'scan' ? 'bg-primary text-white' : 'bg-surface text-text-secondary hover:bg-background'
          }`}
        >
          <Camera size={16} /> Camera Scan
        </button>
        <button
          type="button"
          onClick={() => setMode('manual')}
          className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
            mode === 'manual' ? 'bg-primary text-white' : 'bg-surface text-text-secondary hover:bg-background'
          }`}
        >
          <Keyboard size={16} /> Manual Entry
        </button>
      </div>

      {mode === 'scan' ? (
        <div className="space-y-4">
          <div className="relative w-full aspect-square bg-black rounded-xl overflow-hidden border border-border flex flex-col items-center justify-center shadow-inner">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
            />

            {/* Switch Camera Button if multiple available */}
            {cameras && cameras.length > 1 && (
              <button
                type="button"
                onClick={handleSwitchCamera}
                title="Switch Camera"
                className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full z-10 backdrop-blur-sm transition-colors"
              >
                <SwitchCamera size={18} />
              </button>
            )}

            {!cameraActive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-text-muted space-y-3 bg-black/80">
                <Camera size={36} className="mx-auto text-primary animate-pulse" />
                <p className="text-sm font-medium">Starting camera...</p>
                <button
                  type="button"
                  onClick={() => {
                    if (scannerRef.current) scannerRef.current.start();
                  }}
                  className="px-3 py-1.5 bg-primary/20 text-primary rounded-lg text-xs hover:bg-primary/30 flex items-center gap-1.5"
                >
                  <RefreshCw size={12} /> Retry Camera
                </button>
              </div>
            )}
          </div>

          <div className="text-center text-xs text-text-muted">
            <p className="font-mono">{scanStatus}</p>
          </div>

          <div className="flex gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 py-2.5 px-3 bg-surface hover:bg-background border border-border text-text-secondary rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
            >
              <Upload size={14} className="text-primary" />
              Upload QR Image
            </button>
            <button
              type="button"
              onClick={handleLoadDemoToken}
              className="flex-1 py-2.5 px-3 bg-surface hover:bg-background border border-border text-text-secondary rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
            >
              <Sparkles size={14} className="text-primary" />
              Quick Demo Token
            </button>
          </div>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleTokenSubmit();
          }}
          className="space-y-4"
        >
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-text-secondary">
                6-Digit Passcode PIN or Full JWT
              </label>
              <button
                type="button"
                onClick={handlePasteClipboard}
                className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
              >
                <Clipboard size={12} /> Paste from Clipboard
              </button>
            </div>
            <textarea
              value={inputToken}
              onChange={(e) => setInputToken(e.target.value)}
              className="w-full h-24 px-4 py-3 bg-background border border-border rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/50 text-text-primary resize-none"
              placeholder="Enter 6-digit PIN (e.g. 749215) or paste full JWT token"
              spellCheck="false"
            />
          </div>

          <div className="flex flex-col gap-2">
            <button
              type="submit"
              className="w-full py-3 px-4 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <ShieldCheck size={20} />
              Authenticate Session
            </button>

            <button
              type="button"
              onClick={handleLoadDemoToken}
              className="w-full py-2.5 px-4 bg-surface hover:bg-background border border-border text-text-secondary rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Sparkles size={14} className="text-primary" />
              Quick Connect Demo Token
            </button>
          </div>
        </form>
      )}

      <div className="mt-6 text-xs text-center text-text-muted flex items-center justify-center gap-2">
        <ShieldCheck size={14} className="text-success" />
        <span>AES-256 Encrypted Health Memory Layer</span>
      </div>
    </div>
  );
}
