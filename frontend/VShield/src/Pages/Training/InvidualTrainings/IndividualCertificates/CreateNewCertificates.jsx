 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { useState, useEffect, useRef } from "react";
import {
  X,
  ChevronDown,
  Trash2,
  Eye,
  UploadCloud,
  Palette
} from "lucide-react";

import { useIsDarkMode } from "../../components/modals/helpers";

export const CreateNewCertificates = ({
  onSave,
  onClose,
  editingCert,
  onDelete,
  isInline = false
}) => {
  const isDark = useIsDarkMode();
  const [name, setName] = useState(editingCert ? editingCert.TrainingCertificateName : "");
  const [description, setDescription] = useState(editingCert ? editingCert.Description : "");
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Default HTML template for certificate body
  const defaultHtml = `<div style="text-align: center; font-family: 'Segoe UI', Arial, sans-serif; padding: 10px; padding-top: 20px; color: #1e293b;">
    <p style="font-size: 11px; font-weight: 800; letter-spacing: 2px; color: #e60000; text-transform: uppercase; margin-bottom: 5px;">Vodafone Information Security Directorate</p>
    <h1 style="font-size: 20px; font-weight: 900; margin: 0 0 15px 0;">Certificate of Achievement</h1>
    <p style="font-size: 13px; color: #64748b; margin-bottom: 15px;">This credential is proudly presented to</p>
    <p style="font-size: 26px; font-weight: 900; color: #e60000; border-bottom: 2px solid #e2e8f0; display: inline-block; padding: 0 30px 4px 30px; margin-bottom: 20px;">{{userName}}</p>
    <p style="font-size: 12px; line-height: 1.6; max-width: 540px; margin: 0 auto 30px auto; color: #334155;">For successfully completing the interactive threat simulation curriculum <strong>{{trainingPathName}}</strong>, demonstrating exemplary proficiency in spotting phishing lures, social engineering triggers, and upholding corporate cyber resilience.</p>
  </div>`;

  // Parse existing HTML if editing, or use default template
  const [activeHtml, setActiveHtml] = useState(() => {
    if (editingCert && editingCert["Certificate(html)"]) {
      // Extract innerHTML of the cert-card or use full HTML
      const raw = editingCert["Certificate(html)"];
      const match = raw.match(/<div[^>]*class='cert-card'[^>]*>([\s\S]*)<\/div>/i) || 
                    raw.match(/<div[^>]*class="cert-card"[^>]*>([\s\S]*)<\/div>/i) ||
                    raw.match(/<div[^>]*class='cert-container'[^>]*>([\s\S]*)<\/div>/i) ||
                    raw.match(/<div[^>]*class="cert-container"[^>]*>([\s\S]*)<\/div>/i);
      return match ? match[1].trim() : raw;
    }
    return defaultHtml;
  });

  // Background Image state
  const [bgImage, setBgImage] = useState(() => {
    if (editingCert && editingCert["Certificate(html)"]) {
      const raw = editingCert["Certificate(html)"];
      const match = raw.match(/background-image:\s*url\(['"]?([^'")]+)['"]?\)/i) || 
                    raw.match(/background:\s*[^;]*url\(['"]?([^'")]+)['"]?\)/i);
      return match ? match[1] : "";
    }
    return "";
  });

  // Styling inputs (parsed from existing template if editing)
  const [borderColor, setBorderColor] = useState(() => {
    if (editingCert && editingCert["Certificate(html)"]) {
      const raw = editingCert["Certificate(html)"];
      const match = raw.match(/border:\s*\d+px\s+solid\s+([^;'"\s)]+)/i) ||
                    raw.match(/border-color:\s*([^;'"\s)]+)/i);
      return match ? match[1].trim() : "#0f172a";
    }
    return "#0f172a";
  });
  const [bgColor, setBgColor] = useState(() => {
    if (editingCert && editingCert["Certificate(html)"]) {
      const raw = editingCert["Certificate(html)"];
      const match = raw.match(/background-color:\s*([^;'"\s)]+)/i);
      return match ? match[1].trim() : "#ffffff";
    }
    return "#ffffff";
  });

  // Selection range caching for caret insertions
  const savedSelectionRangeRef = useRef(null);
  const editorCanvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const [showFxDropdown, setShowFxDropdown] = useState(false);

  // Scaling canvas wrapper references
  const canvasContainerRef = useRef(null);
  const [canvasScale, setCanvasScale] = useState(1);

  // Observer to auto-scale the canvas to fit the top-down layout container width
  useEffect(() => {
    if (!canvasContainerRef.current) return;
    const updateScale = () => {
      if (canvasContainerRef.current) {
        const width = canvasContainerRef.current.clientWidth;
        if (width > 0) {
          setCanvasScale(width / 800);
        }
      }
    };
    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(canvasContainerRef.current);
    return () => observer.disconnect();
  }, []);

  // Enforce strict vertical viewport discipline inside the contentEditable canvas
  const handleCanvasKeyDown = (e) => {
    const target = e.currentTarget;
    if (e.key === "Enter") {
      const children = Array.from(target.children);
      if (children.length > 0) {
        // Find the absolute top and bottom visual coordinates among all child elements
        let minTop = Infinity;
        let maxBottom = -Infinity;
        
        children.forEach((child) => {
          const rect = child.getBoundingClientRect();
          if (rect.top < minTop) minTop = rect.top;
          if (rect.bottom > maxBottom) maxBottom = rect.bottom;
        });

        const contentHeight = maxBottom - minTop;
        const containerHeight = target.getBoundingClientRect().height;

        // Block Enter key if the text content already visually occupies almost the full height of the canvas (within 40px)
        if (contentHeight >= containerHeight - 40) {
          e.preventDefault();
        }
      }
    }
  };

  useEffect(() => {
    if (editorCanvasRef.current) {
      editorCanvasRef.current.innerHTML = activeHtml;
    }
  }, [isFullScreen]);

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedSelectionRangeRef.current = sel.getRangeAt(0);
    }
  };

  const restoreSelection = () => {
    const sel = window.getSelection();
    if (sel && savedSelectionRangeRef.current) {
      sel.removeAllRanges();
      sel.addRange(savedSelectionRangeRef.current);
    }
  };

  const runCommand = (command, value = "") => {
    document.execCommand(command, false, value);
    if (editorCanvasRef.current) {
      setActiveHtml(editorCanvasRef.current.innerHTML);
    }
  };

  const handleFormatBlock = (value) => {
    runCommand("formatBlock", value);
  };

  const handleFontFamily = (value) => {
    runCommand("fontName", value);
  };

  const handleFontSize = (value) => {
    runCommand("fontSize", value);
  };

  const insertPlaceholder = (ph) => {
    setShowFxDropdown(false);
    if (editorCanvasRef.current) {
      editorCanvasRef.current.focus();
      restoreSelection();
      const placeholderText = ` ${ph} `;
      document.execCommand("insertText", false, placeholderText);
      setActiveHtml(editorCanvasRef.current.innerHTML);
      saveSelection();
    }
  };

  const handleFileChange = (e) => {
    const file = _optionalChain([e, 'access', _ => _.target, 'access', _2 => _2.files, 'optionalAccess', _3 => _3[0]]);
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setBgImage(_optionalChain([event, 'access', _4 => _4.target, 'optionalAccess', _5 => _5.result])  || "");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    if (!name.trim()) return;

    let certId = editingCert ? editingCert.TrainingCertificateID : `TC-${Math.floor(10000 + Math.random() * 90000)}`;
    const currentBody = editorCanvasRef.current ? editorCanvasRef.current.innerHTML : activeHtml;

    // Wrap canvas innerHTML - aspect-ratio consistent HTML template
    const fullHtml = `<!DOCTYPE html><html><head><meta charset='UTF-8'><style>body{margin:0;padding:0;background:#0f172a;display:flex;align-items:center;justify-content:center;height:100vh;font-family:'Segoe UI',Helvetica,Arial,sans-serif;}.cert-card{width:800px;height:500px;box-sizing:border-box;position:relative;background-color:${bgColor};${bgImage ? "background-image: url('" + bgImage + "'); background-size: cover; background-position: center;" : ""};border:10px solid ${borderColor};border-radius:16px;overflow:hidden;}</style></head><body><div class='cert-card'>${currentBody}</div></body></html>`;

    onSave({
      TrainingCertificateID: certId,
      TrainingCertificateName: name,
      "Thumbnail(CoverImage)": "",
      CreatedOn: editingCert ? editingCert.CreatedOn : new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      }).replace(/ /g, "-"),
      Description: description || "Accredited cyber compliance certificate.",
      "Certificate(html)": fullHtml
    }, null);

    onClose();
  };

  return (
    <>
      {/* Full Screen overlay container */}
      {isFullScreen && (
        <div className="fixed inset-0 z-[160] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 text-left select-none animate-clay-stagger-1">
          <div className={`w-[840px] max-w-full rounded-2xl border flex flex-col overflow-hidden shadow-2xl bg-[#0B1121] border-white/10 text-white`}>
            {/* Fullscreen Header */}
            <div className="px-6 py-3.5 bg-black/40 border-b border-white/10 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider font-voda">
                Certificate Editor
              </span>
              <button
                type="button"
                onClick={() => setIsFullScreen(false)}
                className="h-7 px-3.5 rounded-lg text-[9px] font-voda font-bold uppercase tracking-wider bg-white/10 hover:bg-white/20 text-white cursor-pointer transition-all"
              >
                Minimize Editor
              </button>
            </div>

            {/* Fullscreen Toolbar & Canvas */}
            <div className="p-5 flex flex-col gap-4 items-center justify-center bg-black/10">
              {/* Rich Text Format Toolbar */}
              <div className="w-[800px] max-w-full rounded-t-xl border border-white/10 p-1.5 flex items-center justify-between bg-[#1C1E24] text-white flex-wrap gap-1.5 relative z-30 shadow-md">
                <div className="flex items-center gap-1 text-xs flex-wrap">
                  <select
                    onMouseDown={() => saveSelection()}
                    onChange={(e) => handleFormatBlock(e.target.value)}
                    className="px-1 py-0.5 rounded bg-black/40 text-white border-white/10 text-[9px] font-bold border outline-none cursor-pointer"
                    title="Block Format"
                    defaultValue="<p>"
                  >
                    <option value="<p>">Paragraph</option>
                    <option value="<h1>">Heading 1</option>
                    <option value="<h2>">Heading 2</option>
                    <option value="<h3>">Heading 3</option>
                    <option value="<blockquote>">Quote</option>
                  </select>

                  <select
                    onMouseDown={() => saveSelection()}
                    onChange={(e) => handleFontFamily(e.target.value)}
                    className="px-1 py-0.5 rounded bg-black/40 text-white border-white/10 text-[9px] font-bold border outline-none cursor-pointer"
                    title="Font Family"
                    defaultValue="'Segoe UI', Arial, sans-serif"
                  >
                    <option value="'Segoe UI', Arial, sans-serif">Segoe UI</option>
                    <option value="'Vodafone ExB', 'Montserrat', Arial, sans-serif">Vodafone ExB</option>
                    <option value="'Inter', sans-serif">Inter</option>
                    <option value="'JetBrains Mono', monospace">Mono Tech</option>
                  </select>

                  <select
                    onMouseDown={() => saveSelection()}
                    onChange={(e) => handleFontSize(e.target.value)}
                    className="px-1 py-0.5 rounded bg-black/40 text-white border-white/10 text-[9px] font-bold border outline-none cursor-pointer"
                    title="Font Size"
                    defaultValue="3"
                  >
                    <option value="2">12px</option>
                    <option value="3">14px</option>
                    <option value="4">18px</option>
                    <option value="5">24px</option>
                  </select>

                  <button 
                    type="button" 
                    onMouseDown={(e) => { e.preventDefault(); runCommand('bold'); }} 
                    className="p-1 rounded hover:bg-white/10 cursor-pointer bg-black/30 text-white font-bold" 
                    title="Bold"
                  >
                    B
                  </button>

                  <button 
                    type="button" 
                    onMouseDown={(e) => { e.preventDefault(); runCommand('italic'); }} 
                    className="p-1 rounded hover:bg-white/10 cursor-pointer bg-black/30 text-white italic" 
                    title="Italic"
                  >
                    I
                  </button>

                  <button 
                    type="button" 
                    onMouseDown={(e) => { e.preventDefault(); runCommand('underline'); }} 
                    className="p-1 rounded hover:bg-white/10 cursor-pointer bg-black/30 text-white underline" 
                    title="Underline"
                  >
                    U
                  </button>

                  <button 
                    type="button" 
                    onMouseDown={(e) => { e.preventDefault(); runCommand('justifyLeft'); }} 
                    className="p-1 rounded hover:bg-white/10 cursor-pointer bg-black/30 text-white font-semibold" 
                    title="Align Left"
                  >
                    L
                  </button>

                  <button 
                    type="button" 
                    onMouseDown={(e) => { e.preventDefault(); runCommand('justifyCenter'); }} 
                    className="p-1 rounded hover:bg-white/10 cursor-pointer bg-black/30 text-white font-semibold" 
                    title="Align Center"
                  >
                    C
                  </button>

                  <button 
                    type="button" 
                    onMouseDown={(e) => { e.preventDefault(); runCommand('justifyRight'); }} 
                    className="p-1 rounded hover:bg-white/10 cursor-pointer bg-black/30 text-white font-semibold" 
                    title="Align Right"
                  >
                    R
                  </button>

                  <label className="flex items-center gap-0.5 cursor-pointer p-1 rounded hover:bg-white/10 relative" title="Text Color">
                    <Palette className="w-3.5 h-3.5 text-[#E60000]" />
                    <input
                      type="color"
                      onChange={(e) => runCommand('foreColor', e.target.value)}
                      className="w-3.5 h-3.5 rounded cursor-pointer opacity-0 absolute inset-0"
                    />
                  </label>

                  <span className="text-white/20 mx-1">|</span>

                  {/* fx Dropdown */}
                  <div className="relative z-50">
                    <button
                      type="button"
                      onClick={() => { saveSelection(); setShowFxDropdown(!showFxDropdown); }}
                      className="h-6 px-2 rounded bg-violet-600 hover:bg-violet-700 text-white text-[9px] font-black uppercase tracking-wide flex items-center gap-1 cursor-pointer"
                    >
                      <span>{`{fx}`}</span>
                      <ChevronDown className="w-3 h-3" />
                    </button>

                    {showFxDropdown && (
                      <div className="absolute top-7 left-[-150%] w-44 bg-[#1C1E24] rounded-md shadow-2xl border border-white/10 py-1 z-50 flex flex-col">
                        {[
                          { label: "Recipient Name", code: "{{userName}}" },
                          { label: "Completion Date", code: "{{completionDate}}" },
                          { label: "Certificate ID", code: "{{certificateId}}" },
                          { label: "Learning Path Name", code: "{{trainingPathName}}" }
                        ].map(ph => (
                          <button
                            key={ph.code}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => insertPlaceholder(ph.code)}
                            className="px-3 py-1.5 text-left text-[9.5px] font-bold text-slate-300 hover:bg-white/10 transition-colors cursor-pointer"
                          >
                            {ph.label} ({ph.code})
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Exactly 800px x 500px */}
              <div
                ref={editorCanvasRef}
                contentEditable
                onBlur={() => {
                  if (editorCanvasRef.current) {
                    setActiveHtml(editorCanvasRef.current.innerHTML);
                  }
                }}
                onKeyUp={() => {
                  if (editorCanvasRef.current) {
                    setActiveHtml(editorCanvasRef.current.innerHTML);
                  }
                }}
                onKeyDown={handleCanvasKeyDown}
                onMouseUp={() => saveSelection()}
                style={{
                  borderColor: borderColor,
                  borderWidth: "10px",
                  borderStyle: "solid",
                  backgroundColor: bgColor,
                  width: "800px",
                  height: "500px",
                  ...(bgImage ? { backgroundImage: `url('${bgImage}')`, backgroundSize: "cover", backgroundPosition: "center" } : {})
                }}
                className="rounded-b-xl overflow-hidden p-8 outline-none border cursor-text shadow-inner relative flex flex-col justify-center select-text text-left font-sans bg-white text-slate-900"
              />
            </div>

            {/* Fullscreen Actions Footer */}
            <div className="px-6 py-4 bg-black/40 border-t border-white/10 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsFullScreen(false)}
                className="h-10 px-5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-bold text-white cursor-pointer uppercase tracking-wider"
              >
                Exit Fullscreen
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsFullScreen(false);
                }}
                className="h-10 px-6 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-xs font-bold text-white cursor-pointer shadow-md uppercase tracking-wider"
              >
                Minimize
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Normal / Inline Render Block */}
      <div className={`w-full flex flex-col text-left ${
        isInline 
          ? "h-full min-h-[500px] border-none bg-transparent shadow-none" 
          : `max-w-5xl border rounded-2xl overflow-hidden shadow-2xl h-[90vh] ${
              isDark ? "bg-[#12141A] border-white/10 text-white shadow-[0_20px_50px_rgba(0,0,0,0.6)]" : "bg-white border-slate-200 text-slate-800"
            }`
      }`}>
        {/* Normal Header */}
        {!isInline && (
          <div className={`px-6 py-4 border-b flex items-center justify-between ${
            isDark ? "bg-black/40 border-white/10" : "bg-slate-100 border-slate-200"
          }`}>
            <h3 className="text-sm font-black font-voda uppercase">{editingCert ? "EDIT COMPLIANCE CERTIFICATE" : "ADD NEW ACCREDITED CERTIFICATE"}</h3>
            <button type="button" onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Editor Body */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 custom-light-scrollbar">
          {/* Settings Panel */}
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                  Certificate Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`w-full h-10 px-3 rounded-lg border text-xs focus:outline-none ${
                    isDark ? "border-white/10 bg-black/40 text-white focus:border-[#16A34A]" : "border-slate-200 bg-slate-50 text-slate-800 focus:border-[#16A34A]"
                  }`}
                  placeholder="e.g., Cyber Security Honors"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={`w-full h-10 px-3 rounded-lg border text-xs focus:outline-none ${
                    isDark ? "border-white/10 bg-black/40 text-white focus:border-[#16A34A]" : "border-slate-200 bg-slate-50 text-slate-800 focus:border-[#16A34A]"
                  }`}
                  placeholder="Certificate awarded for..."
                />
              </div>
            </div>

            {/* Customizer Controls */}
            <div className="flex flex-col gap-4 border-t pt-4 border-black/5 dark:border-white/5">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Canvas Settings:</span>

              {/* Background Image Upload */}
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-[9px] font-bold text-slate-400 uppercase block">Canvas Background Image</label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => _optionalChain([fileInputRef, 'access', _6 => _6.current, 'optionalAccess', _7 => _7.click, 'call', _8 => _8()])}
                    className={`h-9 px-4 rounded-xl border font-bold text-xs uppercase flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                      isDark ? "bg-white/5 border-white/5 text-slate-300 hover:bg-white/10" : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>{bgImage ? "Replace Background Image" : "Upload Background Image"}</span>
                  </button>
                  {bgImage && (
                    <button
                      type="button"
                      onClick={() => setBgImage("")}
                      className="h-9 px-3 rounded-xl border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-xs font-bold text-red-400 cursor-pointer"
                    >
                      Clear BG
                    </button>
                  )}
                </div>
              </div>

              {/* Border Color & Canvas Background Color */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Canvas Border</label>
                  <input
                    type="color"
                    value={borderColor}
                    onChange={(e) => setBorderColor(e.target.value)}
                    className="w-full h-8 rounded-lg cursor-pointer bg-transparent border border-white/15"
                  />
                </div>
                {!bgImage && (
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Canvas Background</label>
                    <input
                      type="color"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="w-full h-8 rounded-lg cursor-pointer bg-transparent border border-white/15"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Interactive Preview Canvas */}
          {!isFullScreen && (
            <div className="flex flex-col gap-2 relative">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                PREVIEW
              </span>

              {/* Toolbar */}
              <div className={`w-full rounded-t-xl border p-1.5 flex items-center justify-between text-white select-none relative z-30 flex-wrap gap-1.5 ${
                isDark ? "bg-[#1C1E24] border-white/10" : "bg-slate-900 border-slate-200"
              }`}>
                <div className="flex items-center gap-1 text-xs flex-wrap">
                  <select
                    onMouseDown={() => saveSelection()}
                    onChange={(e) => handleFormatBlock(e.target.value)}
                    className="px-1 py-0.5 rounded bg-black/40 text-white border-white/10 text-[9px] font-bold border outline-none cursor-pointer"
                    title="Block Format"
                    defaultValue="<p>"
                  >
                    <option value="<p>">Paragraph</option>
                    <option value="<h1>">Heading 1</option>
                    <option value="<h2>">Heading 2</option>
                    <option value="<h3>">Heading 3</option>
                    <option value="<blockquote>">Quote</option>
                  </select>

                  <select
                    onMouseDown={() => saveSelection()}
                    onChange={(e) => handleFontFamily(e.target.value)}
                    className="px-1 py-0.5 rounded bg-black/40 text-white border-white/10 text-[9px] font-bold border outline-none cursor-pointer"
                    title="Font Family"
                    defaultValue="'Segoe UI', Arial, sans-serif"
                  >
                    <option value="'Segoe UI', Arial, sans-serif">Segoe UI</option>
                    <option value="'Vodafone ExB', 'Montserrat', Arial, sans-serif">Vodafone ExB</option>
                    <option value="'Inter', sans-serif">Inter</option>
                    <option value="'JetBrains Mono', monospace">Mono Tech</option>
                  </select>

                  <select
                    onMouseDown={() => saveSelection()}
                    onChange={(e) => handleFontSize(e.target.value)}
                    className="px-1 py-0.5 rounded bg-black/40 text-white border-white/10 text-[9px] font-bold border outline-none cursor-pointer"
                    title="Font Size"
                    defaultValue="3"
                  >
                    <option value="2">12px</option>
                    <option value="3">14px</option>
                    <option value="4">18px</option>
                    <option value="5">24px</option>
                  </select>

                  <button 
                    type="button" 
                    onMouseDown={(e) => { e.preventDefault(); runCommand('bold'); }} 
                    className="p-1 rounded hover:bg-white/10 cursor-pointer bg-black/30 text-white" 
                    title="Bold"
                  >
                    <strong>B</strong>
                  </button>

                  <button 
                    type="button" 
                    onMouseDown={(e) => { e.preventDefault(); runCommand('italic'); }} 
                    className="p-1 rounded hover:bg-white/10 cursor-pointer bg-black/30 text-white" 
                    title="Italic"
                  >
                    <em>I</em>
                  </button>

                  <button 
                    type="button" 
                    onMouseDown={(e) => { e.preventDefault(); runCommand('underline'); }} 
                    className="p-1 rounded hover:bg-white/10 cursor-pointer bg-black/30 text-white" 
                    title="Underline"
                  >
                    <u>U</u>
                  </button>

                  <button 
                    type="button" 
                    onMouseDown={(e) => { e.preventDefault(); runCommand('justifyLeft'); }} 
                    className="p-1 rounded hover:bg-white/10 cursor-pointer bg-black/30 text-white" 
                    title="Align Left"
                  >
                    L
                  </button>

                  <button 
                    type="button" 
                    onMouseDown={(e) => { e.preventDefault(); runCommand('justifyCenter'); }} 
                    className="p-1 rounded hover:bg-white/10 cursor-pointer bg-black/30 text-white" 
                    title="Align Center"
                  >
                    C
                  </button>

                  <button 
                    type="button" 
                    onMouseDown={(e) => { e.preventDefault(); runCommand('justifyRight'); }} 
                    className="p-1 rounded hover:bg-white/10 cursor-pointer bg-black/30 text-white" 
                    title="Align Right"
                  >
                    R
                  </button>

                  <label className="flex items-center gap-0.5 cursor-pointer p-1 rounded hover:bg-white/10 relative" title="Text Color">
                    <Palette className="w-3.5 h-3.5 text-[#E60000]" />
                    <input
                      type="color"
                      onChange={(e) => runCommand('foreColor', e.target.value)}
                      className="w-3.5 h-3.5 rounded cursor-pointer opacity-0 absolute inset-0"
                    />
                  </label>

                  <span className="text-white/20 mx-1">|</span>

                  {/* fx Dropdown */}
                  <div className="relative z-50">
                    <button
                      type="button"
                      onClick={() => { saveSelection(); setShowFxDropdown(!showFxDropdown); }}
                      className="h-6 px-2 rounded bg-violet-600 hover:bg-violet-700 text-white text-[9px] font-black uppercase tracking-wide flex items-center gap-1 cursor-pointer"
                    >
                      <span>{`{fx}`}</span>
                      <ChevronDown className="w-3 h-3" />
                    </button>

                    {showFxDropdown && (
                      <div className="absolute top-7 left-[-200%] w-44 bg-white dark:bg-[#161820] rounded-md shadow-2xl border border-black/10 dark:border-white/10 py-1 z-50 flex flex-col">
                        {[
                          { label: "Recipient Name", code: "{{userName}}" },
                          { label: "Completion Date", code: "{{completionDate}}" },
                          { label: "Certificate ID", code: "{{certificateId}}" },
                          { label: "Learning Path Name", code: "{{trainingPathName}}" }
                        ].map(ph => (
                          <button
                            key={ph.code}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => insertPlaceholder(ph.code)}
                            className="px-3 py-1.5 text-left text-[9.5px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            {ph.label} ({ph.code})
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Fullscreen Button */}
                  <button
                    type="button"
                    onClick={() => setIsFullScreen(true)}
                    className="h-6 px-2.5 rounded bg-amber-500 hover:bg-amber-600 text-white text-[9px] font-black uppercase tracking-wide flex items-center gap-1 cursor-pointer ml-1.5 shadow-sm"
                    title="Fullscreen Certificate Editing"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Fullscreen</span>
                  </button>
                </div>
              </div>

              {/* contentEditable Scaled Preview Canvas with Strict Aspect Ratio */}
              <div 
                ref={canvasContainerRef} 
                className="w-full overflow-hidden flex items-start justify-center border border-black/10 dark:border-white/10 rounded-b-xl"
                style={{ height: `${500 * canvasScale}px` }}
              >
                <div
                  ref={editorCanvasRef}
                  contentEditable
                  onBlur={() => {
                    if (editorCanvasRef.current) {
                      setActiveHtml(editorCanvasRef.current.innerHTML);
                    }
                  }}
                  onKeyUp={() => {
                    if (editorCanvasRef.current) {
                      setActiveHtml(editorCanvasRef.current.innerHTML);
                    }
                  }}
                  onKeyDown={handleCanvasKeyDown}
                  onMouseUp={() => saveSelection()}
                  style={{
                    width: "800px",
                    height: "500px",
                    transform: `scale(${canvasScale})`,
                    transformOrigin: "top center",
                    flexShrink: 0,
                    borderColor: borderColor,
                    borderWidth: "10px",
                    borderStyle: "solid",
                    backgroundColor: bgColor,
                    ...(bgImage ? { backgroundImage: `url('${bgImage}')`, backgroundSize: "cover", backgroundPosition: "center" } : {})
                  }}
                  className="outline-none border cursor-text shadow-inner relative flex flex-col justify-center select-text text-left font-sans bg-white text-slate-900 overflow-hidden"
                />
              </div>

              <span className="text-[9px] text-slate-400 text-center block mt-1">
                Select or type inside the canvas directly to edit the certificate. Insert dynamic {`{fx}`} for placeholders.
              </span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className={`px-6 py-4 border-t flex items-center justify-between gap-3 ${
          isDark ? "bg-black/40 border-white/10" : "bg-slate-100 border-slate-200"
        }`}>
          {editingCert && onDelete ? (
            <button
              type="button"
              onClick={() => {
                if (confirm("Are you sure you want to delete this certificate template?")) {
                  onDelete(editingCert.TrainingCertificateID);
                  onClose();
                }
              }}
              className="h-10 px-4 rounded-xl border border-red-500/30 bg-red-600 hover:bg-red-700 text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer shadow-md transition-colors"
            >
              <Trash2 className="w-4 h-4" /> Delete Template
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
              disabled={!name.trim()}
              className="h-10 px-5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-xs font-bold text-white cursor-pointer transition-all shadow-md"
            >
              {editingCert ? "Save Changes" : "Save Template"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default CreateNewCertificates;