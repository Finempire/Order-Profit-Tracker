"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface SlideUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: "lg" | "xl" | "2xl" | "3xl" | "4xl";
}

export function SlideUpModal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = "2xl",
}: SlideUpModalProps) {
  const [shouldRender, setShouldRender] = useState(false);
  const [animState, setAnimState] = useState<"enter" | "exit">("enter");
  const [mounted, setMounted] = useState(false);
  const exitTimer = useRef<ReturnType<typeof setTimeout>>(null);

  // CSR only
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (exitTimer.current) clearTimeout(exitTimer.current);

    if (isOpen) {
      setShouldRender(true);
      setAnimState("enter");
      document.body.style.overflow = "hidden";
    } else if (shouldRender) {
      setAnimState("exit");
      document.body.style.overflow = "";
      exitTimer.current = setTimeout(() => setShouldRender(false), 300);
    }

    return () => {
      if (exitTimer.current) clearTimeout(exitTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Restore scroll on unmount
  useEffect(() => () => { document.body.style.overflow = ""; }, []);

  const handleClose = useCallback(() => onClose(), [onClose]);

  // Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, handleClose]);

  const maxWidthClass = {
    lg: "sm:max-w-lg",
    xl: "sm:max-w-xl",
    "2xl": "sm:max-w-2xl",
    "3xl": "sm:max-w-3xl",
    "4xl": "sm:max-w-4xl",
  }[maxWidth];

  if (!mounted || !shouldRender) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/50 backdrop-blur-sm ${
          animState === "enter" ? "modal-backdrop-enter" : "modal-backdrop-exit"
        }`}
        onClick={handleClose}
      />

      {/* Panel */}
      <div
        className={`
          relative z-10 w-full ${maxWidthClass} sm:mx-4
          bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl
          max-h-[95dvh] sm:max-h-[92dvh]
          flex flex-col overflow-hidden
          ${animState === "enter" ? "modal-panel-enter" : "modal-panel-exit"}
        `}
      >
        {/* Drag handle (mobile) */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>

        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
            <h2 className="font-bold text-lg text-slate-900">{title}</h2>
            <button
              onClick={handleClose}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Close button when no title */}
        {!title && (
          <div className="absolute top-4 right-4 z-10 sm:block hidden">
            <button
              onClick={handleClose}
              className="p-2 rounded-xl bg-white/80 backdrop-blur-sm hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors shadow-sm border border-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
