import { useState, useRef } from "react";
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
    const file = e.target.files?.[0];
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
    const file = e.dataTransfer?.files?.[0];
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
        ? "h-full min-h-0 border-none bg-transparent shadow-none" 
        : `max-w-lg border rounded-2xl overflow-hidden shadow-2xl ${
            isDark ? "bg-[#0B1121] border-white/10 text-white" : "bg-white border-slate-200 text-slate-800"
          }`
    }`}>
      {/* ── DOCKED TOP HEADER BAR ── */}
      <div className={`w-full h-12 flex items-stretch justify-between flex-shrink-0 select-none border-b ${
        isDark ? 'border-white/10 bg-[#12141A]' : 'border-slate-200/90 bg-white'
      }`}>
        <div className="px-6 h-full flex items-center gap-2.5 flex-shrink-0">
          <span className="font-voda font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
            {editingVideo ? "Edit Video" : "Add New Video"}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className={`px-4 h-full flex items-center justify-center border-l hover:bg-red-500/10 hover:text-red-500 transition-colors cursor-pointer ${
            isDark ? "border-white/10 text-slate-400" : "border-slate-200 text-slate-500"
          }`}
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── BODY WORKSPACE ── */}
      <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 flex flex-col gap-5 custom-light-scrollbar">
        <div className={`p-5 rounded-2xl border flex flex-col gap-5 ${
          isDark ? "bg-[#15161A] border-white/10" : "bg-[#F8FAFC] border-slate-200"
        }`}>
          <div className="flex flex-col">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-2">
              Video Title <span className="text-[#FF6B6B] dark:text-[#FFA8A8] font-bold">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`w-full h-10 px-3.5 rounded-xl border text-xs font-medium focus:outline-none focus:border-[#E60000] focus:ring-1 focus:ring-[#E60000] transition-all shadow-2xs ${
                isDark ? "border-white/10 bg-[#0B1121] text-white placeholder-slate-500" : "border-slate-200 bg-white text-slate-900 placeholder-slate-400"
              }`}
              placeholder="e.g., Deceptive Hyperlinks & Domain Inspection"
            />
          </div>

          <div className="flex flex-col mt-1.5">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className={`w-full p-3.5 rounded-xl border text-xs font-medium focus:outline-none focus:border-[#E60000] focus:ring-1 focus:ring-[#E60000] resize-none transition-all shadow-2xs ${
                isDark ? "border-white/10 bg-[#0B1121] text-white placeholder-slate-500" : "border-slate-200 bg-white text-slate-900 placeholder-slate-400"
              }`}
              placeholder="Provide summary and learning metrics..."
            />
          </div>

          {/* Upload Dropzone */}
          {editingVideo ? (
            <div className={`border p-4 rounded-xl text-center text-xs leading-normal mt-1.5 ${
              isDark ? "border-white/10 bg-white/[0.02] text-slate-400" : "border-slate-200 bg-white text-slate-600"
            }`}>
              Media file is locked ({editingVideo.TrainingVideoID}). Video files cannot be replaced during metadata modifications.
            </div>
          ) : (
            <div className="flex flex-col mt-1.5">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-2">
                Video File <span className="text-[#FF6B6B] dark:text-[#FFA8A8] font-bold">*</span>
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className={`border-2 border-dashed transition-all rounded-2xl p-6 flex flex-col items-center justify-center gap-2.5 text-center cursor-pointer ${
                  isDark 
                    ? "border-white/15 bg-white/[0.01] hover:bg-white/[0.03] hover:border-white/35" 
                    : "border-slate-300 bg-white hover:bg-slate-50 hover:border-slate-400"
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
                  <p className={`text-[10px] mt-0.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    {selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB` : "MP4, WEBM, or MOV up to 100MB"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── DOCKED FOOTER BAR ── */}
      <div className={`px-6 py-3 border-t flex items-center justify-between gap-3 flex-shrink-0 ${
        isDark ? "bg-[#12141A] border-white/10" : "bg-slate-50 border-slate-200"
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
            className="h-[24px] px-4 rounded-3xl bg-red-600 hover:bg-red-700 text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer shadow-xs transition-all font-voda uppercase text-[10px] tracking-wider"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete Video
          </button>
        ) : (
          <div />
        )}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="w-[90px] h-[24px] rounded-3xl bg-[#000000] dark:bg-[#ffffff] hover:bg-black/80 dark:hover:bg-white/80 text-white dark:text-black font-voda font-bold text-[10px] uppercase transition-all cursor-pointer shadow-xs flex items-center justify-center"
          >
            CLOSE
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!name.trim() || (!editingVideo && !selectedFile) || isUploading}
            className="min-w-[90px] px-5 h-[24px] rounded-3xl bg-[#8ED973] hover:bg-[#7ec963] text-white font-voda font-bold text-[10px] uppercase tracking-wider shadow-sm transition-all cursor-pointer hover:scale-[1.02] active:scale-95 flex items-center justify-center disabled:opacity-40 disabled:hover:scale-100 disabled:cursor-not-allowed"
          >
            {isUploading ? "SAVING..." : (editingVideo ? "SAVE CHANGES" : "SAVE VIDEO")}
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
