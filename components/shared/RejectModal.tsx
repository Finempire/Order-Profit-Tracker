"use client";

import { useState } from "react";
import { X } from "lucide-react";

interface RejectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (note: string) => void;
  requestNumber?: string;
  isLoading?: boolean;
}

export function RejectModal({
  isOpen,
  onClose,
  onConfirm,
  requestNumber,
  isLoading,
}: RejectModalProps) {
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!note.trim()) {
      setError("Rejection note is required");
      return;
    }
    onConfirm(note.trim());
    setNote("");
    setError("");
  };

  const handleClose = () => {
    setNote("");
    setError("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h3 className="font-semibold text-slate-900">Reject Request</h3>
            {requestNumber && (
              <p className="text-xs text-slate-500 mt-0.5">{requestNumber}</p>
            )}
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          <p className="text-sm text-slate-600">
            Please provide a reason for rejecting this purchase request. This note will be visible to the requester.
          </p>
          <div>
            <label className="form-label">Rejection Note *</label>
            <textarea
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                setError("");
              }}
              className="form-input resize-none"
              rows={4}
              maxLength={500}
              placeholder="Explain why this request is being rejected..."
            />
            {error && <p className="form-error">{error}</p>}
            <p className="text-xs text-slate-400 mt-1">{note.length}/500</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-100">
          <button onClick={handleClose} className="btn-secondary" disabled={isLoading}>
            Cancel
          </button>
          <button onClick={handleSubmit} className="btn-danger" disabled={isLoading}>
            {isLoading ? "Rejecting..." : "Reject Request"}
          </button>
        </div>
      </div>
    </div>
  );
}
