import { useState, useRef } from "react";
import { X, UploadCloud, BookOpen, Sparkles } from "lucide-react";
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
    <div className="flex-1 flex flex-col min-h-0 text-left">
      <div className={`flex items-center justify-between border-b pb-3 mb-4 ${isDark ? "border-white/5" : "border-slate-100"}`}>
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-amber-500" />
          <h2 className="text-lg font-voda font-black text-slate-900 dark:text-white uppercase tracking-tight">
            Upload package
          </h2>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className={`h-8 px-3 rounded-lg text-[9px] font-voda font-bold uppercase tracking-wider transition-all cursor-pointer ${
            isDark ? "bg-white/5 hover:bg-white/10 text-slate-300" : "bg-slate-100 hover:bg-slate-200 text-slate-700"
          }`}
        >
          ← Cancel
        </button>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-y-auto pr-1 pb-6 custom-light-scrollbar">
        <div className="flex flex-col gap-4">
          <div>
            <label className={`text-[10px] font-extrabold uppercase tracking-wider block mb-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              Package Title
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`w-full h-10 px-3 rounded-lg border text-xs font-semibold focus:outline-none focus:border-amber-500 ${
                isDark 
                  ? "border-white/10 bg-black/40 text-white" 
                  : "border-slate-200 bg-slate-50 text-slate-800"
              }`}
              placeholder="e.g., Simulated Electric Vehicle Compliance Sandbox"
            />
          </div>

          <div>
            <label className={`text-[10px] font-extrabold uppercase tracking-wider block mb-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`w-full h-24 p-3 rounded-lg border text-xs font-semibold focus:outline-none focus:border-amber-500 resize-none ${
                isDark 
                  ? "border-white/10 bg-black/40 text-white" 
                  : "border-slate-200 bg-slate-50 text-slate-800"
              }`}
              placeholder="Provide a comprehensive summary of what the compiled sandbox program evaluates..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={`text-[10px] font-extrabold uppercase tracking-wider block mb-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Target Audience
              </label>
              <select
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                className={`w-full h-10 px-2.5 rounded-lg border text-xs font-semibold focus:outline-none focus:border-amber-500 cursor-pointer ${
                  isDark 
                    ? "border-white/10 bg-black/40 text-white [&>option]:bg-slate-900 [&>option]:text-white" 
                    : "border-slate-200 bg-slate-50 text-slate-800 [&>option]:bg-white [&>option]:text-slate-800"
                }`}
              >
                <option value="All Employees">All Employees</option>
                <option value="SOC Team">SOC Team</option>
                <option value="Executive Board">Executive Board</option>
                <option value="Developers">Developers</option>
              </select>
            </div>

            <div>
              <label className={`text-[10px] font-extrabold uppercase tracking-wider block mb-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Difficulty Level
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className={`w-full h-10 px-2.5 rounded-lg border text-xs font-semibold focus:outline-none focus:border-amber-500 cursor-pointer ${
                  isDark 
                    ? "border-white/10 bg-black/40 text-white [&>option]:bg-slate-900 [&>option]:text-white" 
                    : "border-slate-200 bg-slate-50 text-slate-800 [&>option]:bg-white [&>option]:text-slate-800"
                }`}
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>

            <div>
              <label className={`text-[10px] font-extrabold uppercase tracking-wider block mb-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Est. Duration (Mins): {duration}m
              </label>
              <input
                type="range"
                min="5"
                max="60"
                step="5"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full h-1 mt-4 bg-slate-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <label className={`text-[10px] font-extrabold uppercase tracking-wider block ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Zip Package Upload
          </label>

          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={`border-2 border-dashed transition-all rounded-2xl p-8 flex flex-col items-center justify-center gap-3 text-center cursor-pointer min-h-[160px] ${
              isDark 
                ? "border-white/15 bg-white/[0.01] hover:bg-white/[0.03] hover:border-amber-500/40" 
                : "border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-amber-500/40"
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".zip"
              className="hidden"
            />
            <UploadCloud className="w-10 h-10 text-slate-400" />
            <div>
              <p className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-white" : "text-slate-800"}`}>
                {selectedFile ? `Package: ${selectedFile.name}` : "Select compiled website zip"}
              </p>
              <p className={`text-[9px] mt-1 max-w-[220px] leading-relaxed ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                {selectedFile
                  ? `Size: ${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB`
                  : "Drag and drop SCORM compliant, HTML5 or standalone website .zip package"}
              </p>
            </div>
          </div>

          {isCompiling && (
            <div className={`p-4 rounded-xl border flex flex-col gap-2 ${
              isDark ? "border-white/5 bg-white/[0.01]" : "border-slate-200 bg-slate-50"
            }`}>
              <div className={`flex justify-between items-center text-[10px] font-bold uppercase ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}>
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

          <div className="flex items-center gap-3 mt-auto justify-end">
            <button
              type="button"
              onClick={onCancel}
              className={`h-10 px-5 rounded-xl border font-bold text-xs cursor-pointer uppercase tracking-wider transition-colors ${
                isDark 
                  ? "border-white/10 bg-white/5 hover:bg-white/10 text-white" 
                  : "border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCompileAndSave}
              disabled={!name.trim() || !selectedFile || isCompiling}
              className="h-10 px-6 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold text-white cursor-pointer uppercase tracking-wider flex items-center gap-1 shadow-lg transition-colors"
            >
              <Sparkles className="w-4 h-4" /> Save Package
            </button>
          </div>
        </div>
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
        ? "h-full min-h-[500px] border-none bg-transparent shadow-none" 
        : `max-w-lg border rounded-2xl overflow-hidden shadow-2xl ${
            isDark ? "bg-[#0B1121] border-white/10 text-white" : "bg-white border-slate-200 text-slate-800"
          }`
    }`}>
      <div className={`px-6 py-4 border-b flex items-center justify-between ${
        isDark ? "border-white/10 bg-black/40 text-white" : "border-slate-200 bg-slate-50 text-slate-800"
      }`}>
        <h3 className="text-sm font-black font-voda uppercase">UPLOAD PACKAGE (.ZIP)</h3>
        <button type="button" onClick={onClose} className="cursor-pointer text-slate-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-6 flex flex-col gap-4">
        <div>
          <label className={`text-[10px] font-bold uppercase tracking-wider block mb-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Package Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`w-full h-10 px-3 rounded-lg border text-xs focus:outline-none focus:border-[#E60000] ${
              isDark ? "border-white/10 bg-black/40 text-white" : "border-slate-200 bg-slate-50 text-slate-800"
            }`}
            placeholder="e.g., HTML5 Interactive Spear Phishing Room"
          />
        </div>

        <div>
          <label className={`text-[10px] font-bold uppercase tracking-wider block mb-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={`w-full h-16 p-3 rounded-lg border text-xs focus:outline-none focus:border-[#E60000] resize-none ${
              isDark ? "border-white/10 bg-black/40 text-white" : "border-slate-200 bg-slate-50 text-slate-800"
            }`}
            placeholder="Describe standalone package objectives..."
          />
        </div>

        {/* Upload drag dropzone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={`border-2 border-dashed transition-colors rounded-xl p-8 flex flex-col items-center justify-center gap-3 text-center cursor-pointer ${
            isDark 
              ? "border-white/15 bg-white/[0.01] hover:bg-white/[0.03] hover:border-white/35" 
              : "border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-slate-450"
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
              {selectedFile ? `Selected: ${selectedFile.name}` : "Drag & drop SCORM/HTML5 .zip file"}
            </p>
            <p className={`text-[9px] mt-0.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              {selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB` : "Zip archive containing index.html up to 250MB"}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        {isUploading && (
          <div className="mt-2 text-left">
            <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase mb-1">
              <span>Uploading Zip Package</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDark ? "bg-white/5" : "bg-slate-200"}`}>
              <div
                className="bg-amber-500 h-full transition-all duration-200"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className={`px-6 py-4 border-t flex items-center justify-end gap-3 ${
        isDark ? "bg-black/40 border-white/10" : "bg-slate-50 border-slate-200"
      }`}>
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
          onClick={handleUpload}
          disabled={!name.trim() || isUploading}
          className="h-10 px-5 rounded-xl bg-[#E60000] hover:bg-[#c40000] transition-colors text-xs font-bold text-white cursor-pointer disabled:opacity-40 disabled:hover:bg-[#E60000]"
        >
          Upload Package
        </button>
      </div>
    </div>
  );
};

export default CreateNewPackages;
