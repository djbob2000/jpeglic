import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { InputItem } from '../common/types';

type PreviewStatus =
  | { state: 'idle' }
  | { state: 'loading'; item: InputItem }
  | { state: 'ready'; item: InputItem; dataUrl: string }
  | { state: 'error'; item: InputItem; message: string };

interface PreviewContext<T> {
  setItem: (item: T | null) => void;
}

let controller: PreviewContext<InputItem> | null = null;

const Placeholder: React.FC<{ message: string }> = ({ message }) => (
  <div className="preview-placeholder">
    <svg viewBox="0 0 24 24" width="48" height="48">
      <path
        d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14l4-4h12l4 4z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
      <path
        d="M21 16l-4-4-4 4-3-3-5 5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
    <p>{message}</p>
  </div>
);

const PreviewPanel: React.FC<{ status: PreviewStatus }> = ({ status }) => {
  switch (status.state) {
    case 'idle':
      return <Placeholder message="Select an image to preview." />;
    case 'loading':
      return <Placeholder message={`Loading ${status.item.displayName}...`} />;
    case 'ready':
      return (
        <div className="preview-content">
          <img src={status.dataUrl} alt={status.item.displayName} />
          <div className="preview-details">
            <h4>{status.item.displayName}</h4>
            <p>{new URL(status.item.sourcePath, 'file://').pathname}</p>
            <p>{(status.item.sizeBytes / 1024).toFixed(1)} KB</p>
          </div>
        </div>
      );
    case 'error':
      return <Placeholder message={`Failed to load preview: ${status.message}`} />;
    default:
      return null;
  }
};

const PreviewApp: React.FC = () => {
  const [currentItem, setCurrentItem] = useState<InputItem | null>(null);
  const [status, setStatus] = useState<PreviewStatus>({ state: 'idle' });

  useEffect(() => {
    controller = {
      setItem: (item) => {
        setCurrentItem(item);
      },
    };

    return () => {
      controller = null;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadPreview = async () => {
      if (!currentItem) {
        setStatus({ state: 'idle' });
        return;
      }

      setStatus({ state: 'loading', item: currentItem });
      try {
        const dataUrl = await window.electron.preview.get(currentItem.sourcePath);
        if (!cancelled) {
          if (dataUrl) {
            setStatus({ state: 'ready', item: currentItem, dataUrl });
          } else {
            setStatus({ state: 'error', item: currentItem, message: 'Unsupported format' });
          }
        }
      } catch (error) {
        if (!cancelled) {
          setStatus({
            state: 'error',
            item: currentItem,
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }
    };

    loadPreview();

    return () => {
      cancelled = true;
    };
  }, [currentItem]);

  return (
    <div className="preview-panel">
      <div className="preview-header">
        <h3>Preview</h3>
      </div>
      <div className="preview-body">
        <PreviewPanel status={status} />
      </div>
    </div>
  );
};

export function initPreview(containerId: string): void {
  const container = document.getElementById(containerId);
  if (!container) {
    console.warn(`Preview container #${containerId} not found.`);
    return;
  }

  const root = createRoot(container);
  root.render(<PreviewApp />);
}

export function updatePreview(item: InputItem | null): void {
  controller?.setItem(item ?? null);
}
