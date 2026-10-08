import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import LandingPageRichTextEditor from './LandingPageRichTextEditor';

const OutcomeRichTextEditorModal = ({
  isOpen,
  value = '',
  onClose,
  onSave,
}) => {
  const [editorValue, setEditorValue] = useState(value);

  useEffect(() => {
    if (isOpen) {
      setEditorValue(value || '');
    }
  }, [isOpen, value]);

  if (!isOpen) {
    return null;
  }

  const handleSave = () => {
    onSave(editorValue);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4">

      <div className="flex w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-900 px-5 py-3">

          <div>
            <h2 className="text-sm font-bold text-white">
              Design Outcome
            </h2>

            <p className="mt-0.5 text-[11px] text-slate-300">
              Create the content for this outcome
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-white hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>

        </div>

        {/* Editor */}
        <div className="max-h-[75vh] overflow-auto p-4">

          <LandingPageRichTextEditor
            value={editorValue}
            onChange={setEditorValue}
            placeholder="Design your outcome content here..."
            minHeight={420}
          />

        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">

          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="rounded-md bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
          >
            Save
          </button>

        </div>

      </div>

    </div>
  );
};

export default OutcomeRichTextEditorModal;