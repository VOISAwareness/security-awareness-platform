 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { useState, useRef } from "react";
import {
  X,
  Trash2,
  UploadCloud
} from "lucide-react";

import { useIsDarkMode } from "../../components/modals/helpers";

export const CreateNewVideos = ({
  onSave,
  onClose,
  editingVideo,
  onDelete,
  isInline = false
}) => {
  const isDark = useIsDarkMode();
  const [name, setName] = useState(editingVideo ? editingVideo.TrainingVideoName : "");
  const [description, setDescription] = useState(editingVideo ? editingVideo.Description : "");
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = _optionalChain([e, 'access', _ => _.target, 'access', _2 => _2.files, 'optionalAccess', _3 => _3[0]]);
    if (file) {
      setSelectedFile(file);
      if (!name) {
        const baseName = file.name.replace(/\.[^/.]+$/, "");
        setName(
          baseName
            .replace(/[_-]+/g, " ")
            .split(" ")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ")
        );
      }
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = _optionalChain([e, 'access', _4 => _4.dataTransfer, 'access', _5 => _5.files, 'optionalAccess', _6 => _6[0]]);
    if (file && file.type.startsWith("video/")) {
      setSelectedFile(file);
      if (!name) {
        const baseName = file.name.replace(/\.[^/.]+$/, "");
        setName(
          baseName
            .replace(/[_-]+/g, " ")
            .split(" ")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ")
        );
      }
    }
  };

  const handleSave = () => {
    if (!name.trim() || (!editingVideo && !selectedFile)) return;
    setIsUploading(true);
    setTimeout(() => {
      onSave({
        TrainingVideoID: editingVideo ? editingVideo.TrainingVideoID : `TV-${Math.floor(10000 + Math.random() * 90000)}`,
        TrainingVideoName: name,
        "Thumbnail(CoverImage)": "",
        TrainingVideo: selectedFile ? URL.createObjectURL(selectedFile) : (editingVideo ? editingVideo.TrainingVideo : ""),
        CreatedOn: editingVideo ? editingVideo.CreatedOn : new Date().toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric"
        }).replace(/ /g, "-"),
        Description: description
      }, selectedFile || null);
      setIsUploading(false);
      onClose();
    }, 1200);
  };

  const uploaderContent = (
    <div className={`w-full flex flex-col text-left ${
      isInline 
        ? "h-full min-h-[500px] border-none bg-transparent shadow-none" 
        : `max-w-lg border rounded-2xl overflow-hidden shadow-2xl ${
            isDark ? "bg-[#0B1121] border-white/10 text-white" : "bg-white border-slate-200 text-slate-800"
          }`
    }`}>
      <div className={`px-6 py-4 border-b flex items-center justify-between ${
        isDark ? "border-white/10 bg-black/40 text-white" : "border-slate-200 bg-slate-50 text-slate-800"
      }`}>
        <h3 className="text-sm font-black font-voda uppercase">{editingVideo ? "EDIT VIDEO MODULE" : "ADD NEW VIDEO"}</h3>
        <button type="button" onClick={onClose} className={`cursor-pointer ${isDark ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-800"}`}>
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-6 flex flex-col gap-4">
        <div>
          <label className={`text-[10px] font-bold uppercase tracking-wider block mb-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Video Title
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`w-full h-10 px-3 rounded-lg border text-xs focus:outline-none focus:border-[#E60000] ${
              isDark ? "border-white/10 bg-black/40 text-white" : "border-slate-200 bg-slate-50 text-slate-800"
            }`}
            placeholder="e.g., Deceptive Hyperlinks & Domain Inspection"
          />
        </div>

        <div>
          <label className={`text-[10px] font-bold uppercase tracking-wider block mb-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={`w-full h-20 p-3 rounded-lg border text-xs focus:outline-none focus:border-[#E60000] resize-none ${
              isDark ? "border-white/10 bg-black/40 text-white" : "border-slate-200 bg-slate-50 text-slate-800"
            }`}
            placeholder="Provide summary and learning metrics..."
          />
        </div>

        {/* Upload Dropzone */}
        {editingVideo ? (
          <div className={`border p-4 rounded-xl text-center text-xs leading-normal ${
            isDark ? "border-white/5 bg-white/[0.02] text-slate-400" : "border-slate-200 bg-slate-50 text-slate-500"
          }`}>
            Media file is locked ({editingVideo.TrainingVideoID}). Video files cannot be replaced during metadata modifications.
          </div>
        ) : (
          <div
            onClick={() => _optionalChain([fileInputRef, 'access', _7 => _7.current, 'optionalAccess', _8 => _8.click, 'call', _9 => _9()])}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={`border-2 border-dashed transition-colors rounded-xl p-6 flex flex-col items-center justify-center gap-2 text-center cursor-pointer ${
              isDark 
                ? "border-white/15 bg-white/[0.01] hover:bg-white/[0.03] hover:border-white/35" 
                : "border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-slate-450"
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="video/*"
              className="hidden"
            />
            <UploadCloud className="w-8 h-8 text-slate-400" />
            <div>
              <p className={`text-xs font-semibold ${isDark ? "text-white" : "text-slate-800"}`}>
                {selectedFile ? `Selected: ${selectedFile.name}` : "Drag & drop or click to select video file"}
              </p>
              <p className={`text-[9px] mt-0.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                {selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB` : "MP4, WEBM, or MOV up to 100MB"}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className={`px-6 py-4 border-t flex items-center justify-between gap-3 ${
        isDark ? "bg-black/40 border-white/10" : "bg-slate-50 border-slate-200"
      }`}>
        {editingVideo && onDelete ? (
          <button
            type="button"
            onClick={() => {
              if (confirm("Are you sure you want to delete this video module? All attached pathways will retain reference but lose playback.")) {
                onDelete(editingVideo.TrainingVideoID);
                onClose();
              }
            }}
            className="h-10 px-4 rounded-xl border border-red-500/30 bg-red-600 hover:bg-red-700 text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer shadow-md transition-colors"
          >
            <Trash2 className="w-4 h-4" /> Delete Video
          </button>
        ) : (
          <div />
        )}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className={`h-10 px-4 rounded-xl border text-xs font-bold cursor-pointer transition-colors ${
              isDark ? "border-white/10 bg-white/5 hover:bg-white/10 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!name.trim() || (!editingVideo && !selectedFile) || isUploading}
            className="h-10 px-5 rounded-xl bg-[#E60000] hover:bg-[#c40000] transition-colors text-xs font-bold text-white cursor-pointer disabled:opacity-40 disabled:hover:bg-[#E60000]"
          >
            {isUploading ? "Saving..." : (editingVideo ? "Save Changes" : "Save Module")}
          </button>
        </div>
      </div>
    </div>
  );

  if (isInline) {
    return uploaderContent;
  }

  return (
    <div className={`fixed inset-0 z-50 backdrop-blur-xl flex items-center justify-center p-4 transition-all duration-300 ${
      isDark ? "bg-slate-950/45" : "bg-slate-500/15"
    }`}>
      {uploaderContent}
    </div>
  );
};

export default CreateNewVideos;
