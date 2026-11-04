import { useState, useRef } from "react";
import { X, UploadCloud } from "lucide-react";
import { useIsDarkMode, loadJSZip, getMimeType } from "../../components/modals/helpers";

// AddNewPackageScreen (default export: CreateNewPackages)
export const CreateNewPackages = ({
  isDark,
  onSave,
  onCancel
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [targetAudience, setTargetAudience] = useState("All Employees");
  const [difficulty, setDifficulty] = useState("Intermediate");
  const [duration, setDuration] = useState(20);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file) => {
    if (!file.name.endsWith(".zip")) {
      alert("Please select a valid ZIP archive.");
      return;
    }
    setSelectedFile(file);
    if (!name) {
      const baseName = file.name.replace(/\.zip$/i, "");
      const cleaned = baseName.replace(/[0-9]/g, "").replace(/[-_]+/g, " ").trim();
      const formatted = cleaned
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
      setName(formatted || "SCORM Package");
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleCompileAndSave = async () => {
    if (!name.trim() || !selectedFile) return;
    setIsCompiling(true);
    setProgress(15);

    try {
      const JSZip = await loadJSZip();
      setProgress(40);

      const zip = await JSZip.loadAsync(selectedFile);
      setProgress(60);

      const blobUrlMap = {};
      const fileKeys = Object.keys(zip.files).filter((key) => !zip.files[key].dir);
      const totalFiles = fileKeys.length;

      for (let i = 0; i < totalFiles; i++) {
        const fileKey = fileKeys[i];
        const file = zip.files[fileKey];
        const mimeType = getMimeType(fileKey);
        const fileBlob = await file.async("blob");
        const mimeBlob = new Blob([fileBlob], { type: mimeType });
        const objectUrl = URL.createObjectURL(mimeBlob);
        blobUrlMap[fileKey] = objectUrl;

        const currentProgress = Math.round(60 + (i / totalFiles) * 30);
        setProgress(currentProgress);
      }

      let htmlFileKey = Object.keys(zip.files).find((key) => key.endsWith("index_local.html"));
      if (!htmlFileKey) {
        htmlFileKey = Object.keys(zip.files).find((key) => key.endsWith("index.html"));
      }
      if (!htmlFileKey) {
        htmlFileKey = Object.keys(zip.files).find((key) => key.endsWith(".html"));
      }

      if (!htmlFileKey) {
        throw new Error("No HTML entry point found inside the ZIP archive.");
      }

      let htmlContent = await zip.files[htmlFileKey].async("string");
      setProgress(95);

      const sortedPaths = Object.keys(blobUrlMap).sort((a, b) => b.length - a.length);
      for (const relativePath of sortedPaths) {
        const blobUrl = blobUrlMap[relativePath];
        const escapedPath = relativePath.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
        const regex = new RegExp(`(?:\\./)?${escapedPath}`, "g");
        htmlContent = htmlContent.replace(regex, blobUrl);
      }

      const finalHtmlBlob = new Blob([htmlContent], { type: "text/html" });
      const compiledHtmlUrl = URL.createObjectURL(finalHtmlBlob);
      setProgress(100);

      onSave({
        PackageID: `SP-${Math.floor(10000 + Math.random() * 90000)}`,
        PackageName: name,
        Description: description || "SCORM learning module.",
        FileName: selectedFile.name,
        CreatedOn: new Date().toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric"
        }).replace(/ /g, "-"),
        Size: `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB`,
        TargetAudience: targetAudience,
        Difficulty: difficulty,
        fileBlob: selectedFile,
        compiledHtmlUrl,
        duration: duration
      });
    } catch (err) {
      console.error(err);
      alert(err?.message || "Failed to extract and compile the uploaded file.");
      setIsCompiling(false);
      setProgress(0);
    }
  };

  return (
    <div className={`w-full h-full min-h-0 flex flex-col text-left ${isDark ? "bg-[#0B1121] text-white" : "bg-white text-slate-800"}`}>
      {/* ── DOCKED TOP HEADER BAR ── */}
      <div className={`w-full h-12 flex items-stretch justify-between flex-shrink-0 select-none border-b ${
        isDark ? 'border-white/10 bg-[#12141A]' : 'border-slate-200/90 bg-white'
      }`}>
        <div className="px-6 h-full flex items-center gap-2.5 flex-shrink-0">
          <span className="font-voda font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
            Upload Package (.Zip)
          </span>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className={`px-4 h-full flex items-center justify-center border-l hover:bg-red-500/10 hover:text-red-500 transition-colors cursor-pointer ${
            isDark ? "border-white/10 text-slate-400" : "border-slate-200 text-slate-500"
          }`}
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 custom-light-scrollbar">
        <div className={`p-5 rounded-2xl border flex flex-col gap-5 ${
          isDark ? "bg-[#15161A] border-white/10" : "bg-[#F8FAFC] border-slate-200"
        }`}>
          <div className="flex flex-col">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-2">
              Package Title <span className="text-[#FF6B6B] dark:text-[#FFA8A8] font-bold">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`w-full h-10 px-3.5 rounded-xl border text-xs font-medium focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all shadow-2xs ${
                isDark ? "border-white/10 bg-[#0B1121] text-white placeholder-slate-500" : "border-slate-200 bg-white text-slate-900 placeholder-slate-400"
              }`}
              placeholder="e.g., Simulated Electric Vehicle Compliance Sandbox"
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
              className={`w-full p-3.5 rounded-xl border text-xs font-medium focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 resize-none transition-all shadow-2xs ${
                isDark ? "border-white/10 bg-[#0B1121] text-white placeholder-slate-500" : "border-slate-200 bg-white text-slate-900 placeholder-slate-400"
              }`}
              placeholder="Provide a comprehensive summary of what the compiled sandbox program evaluates..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-1.5">
            <div className="flex flex-col">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-2">
                Target Audience
              </label>
              <select
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                className={`w-full h-10 px-3 rounded-xl border text-xs font-medium focus:outline-none focus:border-amber-500 cursor-pointer transition-all shadow-2xs ${
                  isDark
                    ? "border-white/10 bg-[#0B1121] text-white [&>option]:bg-slate-900 [&>option]:text-white"
                    : "border-slate-200 bg-white text-slate-900 [&>option]:bg-white [&>option]:text-slate-800"
                }`}
              >
                <option value="All Employees">All Employees</option>
                <option value="SOC Team">SOC Team</option>
                <option value="Executive Board">Executive Board</option>
                <option value="Developers">Developers</option>
              </select>
            </div>

            <div className="flex flex-col">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-2">
                Difficulty Level
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className={`w-full h-10 px-3 rounded-xl border text-xs font-medium focus:outline-none focus:border-amber-500 cursor-pointer transition-all shadow-2xs ${
                  isDark
                    ? "border-white/10 bg-[#0B1121] text-white [&>option]:bg-slate-900 [&>option]:text-white"
                    : "border-slate-200 bg-white text-slate-900 [&>option]:bg-white [&>option]:text-slate-800"
                }`}
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>

            <div className="flex flex-col">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-2">
                Est. Duration: {duration}m
              </label>
              <input
                type="range"
                min="5"
                max="60"
                step="5"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full h-1.5 mt-3.5 bg-slate-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>
          </div>
        </div>

        <div className={`p-5 rounded-2xl border flex flex-col gap-4 ${
          isDark ? "bg-[#15161A] border-white/10" : "bg-[#F8FAFC] border-slate-200"
        }`}>
          <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-2">
            Zip Package File <span className="text-[#FF6B6B] dark:text-[#FFA8A8] font-bold">*</span>
          </label>

          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={`border-2 border-dashed transition-all rounded-2xl p-6 flex flex-col items-center justify-center gap-2.5 text-center cursor-pointer min-h-[160px] ${
              isDark
                ? "border-white/15 bg-white/[0.01] hover:bg-white/[0.03] hover:border-amber-500/40"
                : "border-slate-300 bg-white hover:bg-slate-50 hover:border-amber-500/50"
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".zip"
              className="hidden"
            />
            <UploadCloud className="w-9 h-9 text-slate-400" />
            <div>
              <p className={`text-xs font-semibold ${isDark ? "text-white" : "text-slate-800"}`}>
                {selectedFile ? `Package: ${selectedFile.name}` : "Select compiled website zip"}
              </p>
              <p className={`text-[10px] mt-0.5 max-w-[240px] leading-relaxed ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                {selectedFile
                  ? `Size: ${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB`
                  : "Drag and drop SCORM compliant, HTML5 or standalone website .zip package"}
              </p>
            </div>
          </div>

          {isCompiling && (
            <div className={`p-4 rounded-xl border flex flex-col gap-2 ${
              isDark ? "border-white/10 bg-white/[0.02]" : "border-slate-200 bg-white"
            }`}>
              <div className="flex justify-between items-center text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">
                <span>Extracting and mapping relative pathways...</span>
                <span>{progress}%</span>
              </div>
              <div className={`w-full h-1.5 rounded-full overflow-hidden ${
                isDark ? "bg-white/5" : "bg-slate-200"
              }`}>
                <div
                  className="bg-amber-500 h-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── DOCKED FOOTER BAR ── */}
      <div className={`px-6 py-3 border-t flex items-center justify-end gap-2.5 flex-shrink-0 ${
        isDark ? "bg-[#12141A] border-white/10" : "bg-slate-50 border-slate-200"
      }`}>
        <button
          type="button"
          onClick={onCancel}
          className="w-[90px] h-[28px] sm:h-[30px] rounded-3xl bg-[#000000] dark:bg-[#ffffff] hover:bg-black/80 dark:hover:bg-white/80 text-white dark:text-black font-voda font-bold text-[10px] uppercase transition-all cursor-pointer shadow-xs flex items-center justify-center"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleCompileAndSave}
          disabled={!name.trim() || !selectedFile || isCompiling}
          className="min-w-[90px] px-6 h-[28px] sm:h-[30px] rounded-3xl bg-amber-500 hover:bg-amber-600 text-white font-voda font-bold text-[10px] uppercase tracking-wider shadow-sm transition-all cursor-pointer hover:scale-[1.02] active:scale-95 flex items-center justify-center disabled:opacity-40 disabled:hover:scale-100 disabled:cursor-not-allowed"
        >
          Save Package
        </button>
      </div>
    </div>
  );
};

// ZipUploader (named export)
export const ZipUploader = ({
  onSave,
  onClose,
  isInline = false
}) => {
  const isDark = useIsDarkMode();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const processSelectedFile = (file) => {
    setSelectedFile(file);

    // Extract base name, remove digits, clean up hyphens and underscores
    const baseName = file.name.replace(/\.zip$/i, "");
    const cleanedName = baseName.replace(/[0-9]/g, "").replace(/[-_]+/g, " ").trim();
    const formattedName = cleanedName
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    setName(formattedName || "SCORM Standalone Simulation");
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.name.endsWith(".zip")) {
      processSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!name.trim() || !selectedFile) return;
    setIsUploading(true);
    setUploadProgress(10);

    try {
      // 1. Load JSZip dynamically
      const JSZip = await loadJSZip();
      setUploadProgress(30);

      // 2. Load the ZIP file
      const zip = await JSZip.loadAsync(selectedFile);
      setUploadProgress(50);

      // 3. Compile all files inside the ZIP
      const blobUrlMap = {};
      const fileKeys = Object.keys(zip.files).filter((key) => !zip.files[key].dir);
      const totalFiles = fileKeys.length;

      for (let i = 0; i < totalFiles; i++) {
        const fileKey = fileKeys[i];
        const file = zip.files[fileKey];
        const mimeType = getMimeType(fileKey);
        const fileBlob = await file.async("blob");
        const mimeBlob = new Blob([fileBlob], { type: mimeType });
        const objectUrl = URL.createObjectURL(mimeBlob);
        blobUrlMap[fileKey] = objectUrl;

        // Progressively increment progress from 50% to 90%
        const fileProgress = Math.round(50 + (i / totalFiles) * 40);
        setUploadProgress(fileProgress);
      }

      // 4. Resolve HTML entry point
      let htmlFileKey = Object.keys(zip.files).find((key) => key.endsWith("index_local.html"));
      if (!htmlFileKey) {
        htmlFileKey = Object.keys(zip.files).find((key) => key.endsWith("index.html"));
      }
      if (!htmlFileKey) {
        htmlFileKey = Object.keys(zip.files).find((key) => key.endsWith(".html"));
      }

      if (!htmlFileKey) {
        throw new Error("No HTML entry point found inside the ZIP archive.");
      }

      let htmlContent = await zip.files[htmlFileKey].async("string");
      setUploadProgress(95);

      // 5. Rewrite HTML links
      const sortedPaths = Object.keys(blobUrlMap).sort((a, b) => b.length - a.length);
      for (const relativePath of sortedPaths) {
        const blobUrl = blobUrlMap[relativePath];
        const escapedPath = relativePath.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
        const regex = new RegExp(`(?:\\./)?${escapedPath}`, "g");
        htmlContent = htmlContent.replace(regex, blobUrl);
      }

      const finalHtmlBlob = new Blob([htmlContent], { type: "text/html" });
      const compiledHtmlUrl = URL.createObjectURL(finalHtmlBlob);

      setUploadProgress(100);

      // 6. Save the package!
      onSave({
        PackageID: `SP-${Math.floor(10000 + Math.random() * 90000)}`,
        PackageName: name,
        Description: description || "SCORM compliant standalone interactive threat simulation.",
        FileName: selectedFile.name,
        CreatedOn: new Date().toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric"
        }).replace(/ /g, "-"),
        Size: `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB`,
        fileBlob: selectedFile,
        compiledHtmlUrl
      });

      setIsUploading(false);
      onClose();
    } catch (err) {
      console.error(err);
      alert(err?.message || "Failed to extract and compile the SCORM zip.");
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
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
            Upload Package (.Zip)
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

      <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 flex flex-col gap-5 custom-light-scrollbar">
        <div className={`p-5 rounded-2xl border flex flex-col gap-5 ${
          isDark ? "bg-[#15161A] border-white/10" : "bg-[#F8FAFC] border-slate-200"
        }`}>
          <div className="flex flex-col">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-2">
              Package Name <span className="text-[#FF6B6B] dark:text-[#FFA8A8] font-bold">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`w-full h-10 px-3.5 rounded-xl border text-xs font-medium focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all shadow-2xs ${
                isDark ? "border-white/10 bg-[#0B1121] text-white placeholder-slate-500" : "border-slate-200 bg-white text-slate-900 placeholder-slate-400"
              }`}
              placeholder="e.g., HTML5 Interactive Spear Phishing Room"
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
              className={`w-full p-3.5 rounded-xl border text-xs font-medium focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 resize-none transition-all shadow-2xs ${
                isDark ? "border-white/10 bg-[#0B1121] text-white placeholder-slate-500" : "border-slate-200 bg-white text-slate-900 placeholder-slate-400"
              }`}
              placeholder="Describe standalone package objectives..."
            />
          </div>

          {/* Upload drag dropzone */}
          <div className="flex flex-col mt-1.5">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-2">
              Zip Package File <span className="text-[#FF6B6B] dark:text-[#FFA8A8] font-bold">*</span>
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className={`border-2 border-dashed transition-all rounded-2xl p-6 flex flex-col items-center justify-center gap-2.5 text-center cursor-pointer ${
                isDark
                  ? "border-white/15 bg-white/[0.01] hover:bg-white/[0.03] hover:border-amber-500/40"
                  : "border-slate-300 bg-white hover:bg-slate-50 hover:border-amber-500/50"
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".zip"
                className="hidden"
              />
              <UploadCloud className="w-8 h-8 text-slate-400" />
              <div>
                <p className={`text-xs font-semibold ${isDark ? "text-white" : "text-slate-800"}`}>
                  {selectedFile ? `Selected: ${selectedFile.name}` : "Drag & drop SCORM/HTML5 .zip file"}
                </p>
                <p className={`text-[10px] mt-0.5 max-w-[240px] leading-relaxed ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  {selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB` : "Zip archive containing index.html up to 250MB"}
                </p>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          {isUploading && (
            <div className={`p-4 rounded-xl border flex flex-col gap-2 ${
              isDark ? "border-white/10 bg-white/[0.02]" : "border-slate-200 bg-white"
            }`}>
              <div className="flex justify-between items-center text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">
                <span>Uploading Zip Package</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className={`w-full h-1.5 rounded-full overflow-hidden ${
                isDark ? "bg-white/5" : "bg-slate-200"
              }`}>
                <div
                  className="bg-amber-500 h-full transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── DOCKED FOOTER BAR ── */}
      <div className={`px-6 py-3 border-t flex items-center justify-end gap-2.5 flex-shrink-0 ${
        isDark ? "bg-[#12141A] border-white/10" : "bg-slate-50 border-slate-200"
      }`}>
        <button
          type="button"
          onClick={onClose}
          className="w-[90px] h-[28px] sm:h-[30px] rounded-3xl bg-[#000000] dark:bg-[#ffffff] hover:bg-black/80 dark:hover:bg-white/80 text-white dark:text-black font-voda font-bold text-[10px] uppercase transition-all cursor-pointer shadow-xs flex items-center justify-center"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleUpload}
          disabled={!name.trim() || !selectedFile || isUploading}
          className="min-w-[90px] px-6 h-[28px] sm:h-[30px] rounded-3xl bg-amber-500 hover:bg-amber-600 text-white font-voda font-bold text-[10px] uppercase tracking-wider shadow-sm transition-all cursor-pointer hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:hover:scale-100 disabled:cursor-not-allowed"
        >
          Upload Package
        </button>
      </div>
    </div>
  );
};

export default CreateNewPackages;
