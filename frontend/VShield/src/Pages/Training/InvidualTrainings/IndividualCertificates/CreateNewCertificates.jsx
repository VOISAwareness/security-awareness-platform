import { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  X,
  ChevronDown,
  Trash2,
  UploadCloud,
  Palette,
  Maximize2,
  Minimize2,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  RemoveFormatting,
  AlignLeft,
  AlignCenter,
  AlignRight,
  PaintBucket,
  Square,
  Shapes
} from "lucide-react";

import { useIsDarkMode } from "../../components/modals/helpers";

// Default HTML template for certificate body
const DEFAULT_CERTIFICATE_HTML = `<div style="text-align: center; font-family: 'Segoe UI', Arial, sans-serif; padding: 10px; padding-top: 20px; color: #1e293b;">
  <p style="font-size: 11px; font-weight: 800; letter-spacing: 2px; color: #e60000; text-transform: uppercase; margin-bottom: 5px;">Vodafone Information Security Directorate</p>
  <h1 style="font-size: 20px; font-weight: 900; margin: 0 0 15px 0;">Certificate of Achievement</h1>
  <p style="font-size: 13px; color: #64748b; margin-bottom: 15px;">This credential is proudly presented to</p>
  <p style="font-size: 26px; font-weight: 900; color: #e60000; border-bottom: 2px solid #e2e8f0; display: inline-block; padding: 0 30px 4px 30px; margin-bottom: 20px;">{{userName}}</p>
  <p style="font-size: 12px; line-height: 1.6; max-width: 540px; margin: 0 auto 30px auto; color: #334155;">For successfully completing the interactive threat simulation curriculum <strong>{{trainingPathName}}</strong>, demonstrating exemplary proficiency in spotting phishing lures, social engineering triggers, and upholding corporate cyber resilience.</p>
</div>`;

// Dynamic Placeholders for Certificate
const FX_PARAMETERS = [
  { label: "Recipient Name", code: "{{userName}}", desc: "Target user full name" },
  { label: "Completion Date", code: "{{completionDate}}", desc: "Award timestamp" },
  { label: "Certificate ID", code: "{{certificateId}}", desc: "Unique cert identifier" },
  { label: "Learning Path Name", code: "{{trainingPathName}}", desc: "Curriculum title" }
];

// Preset quick-color swatches for shapes & text
const PRESET_COLORS = [
  { label: "Red", value: "#E60000" },
  { label: "Purple", value: "#8B5CF6" },
  { label: "Blue", value: "#2563EB" },
  { label: "Emerald", value: "#10B981" },
  { label: "Amber", value: "#F59E0B" },
  { label: "Pink", value: "#EC4899" },
  { label: "Dark", value: "#1E293B" },
  { label: "White", value: "#FFFFFF" }
];

// Geometric Shapes list with dynamic color preview
const SHAPE_DEFINITIONS = [
  {
    type: "square",
    label: "Square",
    renderPreview: (color) => (
      <span
        className="inline-block w-4 h-4 rounded-xs shadow-xs border border-white/20"
        style={{ backgroundColor: color }}
      />
    )
  },
  {
    type: "circle",
    label: "Circle",
    renderPreview: (color) => (
      <span
        className="inline-block w-4 h-4 rounded-full shadow-xs border border-white/20"
        style={{ backgroundColor: color }}
      />
    )
  },
  {
    type: "rectangle",
    label: "Rectangle",
    renderPreview: (color) => (
      <span
        className="inline-block w-5 h-3 rounded-xs shadow-xs border border-white/20"
        style={{ backgroundColor: color }}
      />
    )
  },
  {
    type: "triangle",
    label: "Triangle",
    renderPreview: (color) => (
      <svg className="w-4 h-4" viewBox="0 0 36 36">
        <polygon points="18,3 34,33 2,33" fill={color} stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
      </svg>
    )
  },
  {
    type: "badge",
    label: "Badge / Pill",
    renderPreview: (color) => (
      <span
        className="inline-block w-5 h-2.5 rounded-full shadow-xs border border-white/20"
        style={{ backgroundColor: color }}
      />
    )
  },
  {
    type: "diamond",
    label: "Diamond",
    renderPreview: (color) => (
      <svg className="w-4 h-4" viewBox="0 0 36 36">
        <polygon points="18,2 34,18 18,34 2,18" fill={color} stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
      </svg>
    )
  },
  {
    type: "star",
    label: "Star",
    renderPreview: (color) => (
      <svg className="w-4 h-4" viewBox="0 0 36 36">
        <polygon points="18,2 23,13 35,14 26,22 29,34 18,27 7,34 10,22 1,14 13,13" fill={color} stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
      </svg>
    )
  }
];

// Helper to generate HTML for a variablized geometric shape
const getShapeHtml = (shapeType, color) => {
  switch (shapeType) {
    case "square":
      return `<span style="display:inline-block;width:36px;height:36px;background-color:${color};border-radius:4px;vertical-align:middle;margin:4px;"></span>`;
    case "circle":
      return `<span style="display:inline-block;width:36px;height:36px;background-color:${color};border-radius:50%;vertical-align:middle;margin:4px;"></span>`;
    case "rectangle":
      return `<span style="display:inline-block;width:60px;height:30px;background-color:${color};border-radius:6px;vertical-align:middle;margin:4px;"></span>`;
    case "triangle":
      return `<svg width="36" height="36" viewBox="0 0 36 36" style="display:inline-block;vertical-align:middle;margin:4px;"><polygon points="18,3 34,33 2,33" fill="${color}" /></svg>`;
    case "badge":
      return `<span style="display:inline-block;width:54px;height:24px;background-color:${color};border-radius:12px;vertical-align:middle;margin:4px;"></span>`;
    case "diamond":
      return `<svg width="36" height="36" viewBox="0 0 36 36" style="display:inline-block;vertical-align:middle;margin:4px;"><polygon points="18,2 34,18 18,34 2,18" fill="${color}" /></svg>`;
    case "star":
      return `<svg width="36" height="36" viewBox="0 0 36 36" style="display:inline-block;vertical-align:middle;margin:4px;"><polygon points="18,2 23,13 35,14 26,22 29,34 18,27 7,34 10,22 1,14 13,13" fill="${color}" /></svg>`;
    default:
      return `<span style="display:inline-block;width:36px;height:36px;background-color:${color};border-radius:4px;vertical-align:middle;margin:4px;"></span>`;
  }
};

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

  // Active color for text and shapes (variablized)
  const [activeColor, setActiveColor] = useState("#E60000");

  // Parse existing HTML if editing, or use default template
  const [activeHtml, setActiveHtml] = useState(() => {
    if (editingCert && editingCert["Certificate(html)"]) {
      const raw = editingCert["Certificate(html)"];
      const match = raw.match(/<div[^>]*class='cert-card'[^>]*>([\s\S]*)<\/div>/i) ||
                    raw.match(/<div[^>]*class="cert-card"[^>]*>([\s\S]*)<\/div>/i) ||
                    raw.match(/<div[^>]*class='cert-container'[^>]*>([\s\S]*)<\/div>/i) ||
                    raw.match(/<div[^>]*class="cert-container"[^>]*>([\s\S]*)<\/div>/i);
      return match ? match[1].trim() : raw;
    }
    return DEFAULT_CERTIFICATE_HTML;
  });

  const activeHtmlRef = useRef(activeHtml);

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

  // Dropdown states & positions
  const [showFxDropdown, setShowFxDropdown] = useState(false);
  const [showShapesDropdown, setShowShapesDropdown] = useState(false);
  const [fxMenuAt, setFxMenuAt] = useState(null);
  const [shapesMenuAt, setShapesMenuAt] = useState(null);

  // Scaling canvas wrapper references
  const canvasContainerRef = useRef(null);
  const fullScreenContainerRef = useRef(null);
  const [canvasScale, setCanvasScale] = useState(1);
  const [fullScreenScale, setFullScreenScale] = useState(1);

  // Calculates menu positioning relative to toolbar
  const toolbarMenuAnchor = (button, expanded, menuWidth) => {
    const bar = button.closest("[data-editor-toolbar]");
    const anchor = button.parentElement;
    if (!bar || !anchor) return { expanded, left: 0 };
    const barBox = bar.getBoundingClientRect();
    const box = anchor.getBoundingClientRect();
    const scale = bar.offsetWidth ? barBox.width / bar.offsetWidth : 1;
    const room = Math.max(0, bar.offsetWidth - menuWidth);
    return {
      expanded,
      left: Math.min(Math.max(0, (box.left - barBox.left) / scale), room)
    };
  };

  const closeToolbarMenus = useCallback(() => {
    setShowFxDropdown(false);
    setShowShapesDropdown(false);
  }, []);

  // Close dropdowns on outside clicks
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (
        !e.target.closest('[data-dropdown="fx"]') &&
        !e.target.closest('[data-editor-menu="fx"]')
      ) {
        setShowFxDropdown(false);
      }
      if (
        !e.target.closest('[data-dropdown="shapes"]') &&
        !e.target.closest('[data-editor-menu="shapes"]')
      ) {
        setShowShapesDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Lock body overflow when in fullscreen
  useEffect(() => {
    if (isFullScreen) {
      const prevBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prevBodyOverflow;
      };
    }
  }, [isFullScreen]);

  // Observer to auto-scale the inline canvas to fit container width
  useEffect(() => {
    if (!canvasContainerRef.current) return;
    const updateScale = () => {
      if (canvasContainerRef.current) {
        const width = canvasContainerRef.current.clientWidth;
        if (width > 0) {
          setCanvasScale(Math.min(1, width / 800));
        }
      }
    };
    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(canvasContainerRef.current);
    return () => observer.disconnect();
  }, [isFullScreen]);

  // Observer for fullscreen canvas scale: keeps certificate at natural 800x500 without stretching
  useEffect(() => {
    if (!isFullScreen || !fullScreenContainerRef.current) return;
    const updateFullScreenScale = () => {
      if (fullScreenContainerRef.current) {
        const containerW = fullScreenContainerRef.current.clientWidth - 48;
        const containerH = fullScreenContainerRef.current.clientHeight - 48;
        if (containerW > 0 && containerH > 0) {
          const scaleW = containerW / 800;
          const scaleH = containerH / 500;
          const scale = Math.min(1, scaleW, scaleH);
          setFullScreenScale(Math.max(0.4, scale));
        }
      }
    };
    updateFullScreenScale();
    const observer = new ResizeObserver(updateFullScreenScale);
    observer.observe(fullScreenContainerRef.current);
    return () => observer.disconnect();
  }, [isFullScreen]);

  // Restore canvas innerHTML cleanly when toggling fullscreen
  useLayoutEffect(() => {
    if (editorCanvasRef.current) {
      editorCanvasRef.current.innerHTML = activeHtmlRef.current || DEFAULT_CERTIFICATE_HTML;
    }
  }, [isFullScreen]);

  // Enforce strict vertical viewport discipline inside contentEditable
  const handleCanvasKeyDown = (e) => {
    const target = e.currentTarget;
    if (e.key === "Enter") {
      const children = Array.from(target.children);
      if (children.length > 0) {
        let minTop = Infinity;
        let maxBottom = -Infinity;

        children.forEach((child) => {
          const rect = child.getBoundingClientRect();
          if (rect.top < minTop) minTop = rect.top;
          if (rect.bottom > maxBottom) maxBottom = rect.bottom;
        });

        const contentHeight = maxBottom - minTop;
        const containerHeight = target.getBoundingClientRect().height;

        if (contentHeight >= containerHeight - 40) {
          e.preventDefault();
        }
      }
    }
  };

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
    if (editorCanvasRef.current) {
      editorCanvasRef.current.focus();
      restoreSelection();
      document.execCommand(command, false, value);
      activeHtmlRef.current = editorCanvasRef.current.innerHTML;
      setActiveHtml(activeHtmlRef.current);
      saveSelection();
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
    closeToolbarMenus();
    if (editorCanvasRef.current) {
      editorCanvasRef.current.focus();
      restoreSelection();
      const placeholderText = ` ${ph} `;
      document.execCommand("insertText", false, placeholderText);
      activeHtmlRef.current = editorCanvasRef.current.innerHTML;
      setActiveHtml(activeHtmlRef.current);
      saveSelection();
    }
  };

  const insertShape = (shapeType) => {
    closeToolbarMenus();
    if (editorCanvasRef.current) {
      editorCanvasRef.current.focus();
      restoreSelection();
      const shapeHtml = getShapeHtml(shapeType, activeColor);
      document.execCommand("insertHTML", false, shapeHtml);
      activeHtmlRef.current = editorCanvasRef.current.innerHTML;
      setActiveHtml(activeHtmlRef.current);
      saveSelection();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setBgImage(event.target?.result || "");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleToggleExpand = useCallback(() => {
    if (editorCanvasRef.current) {
      activeHtmlRef.current = editorCanvasRef.current.innerHTML;
      setActiveHtml(activeHtmlRef.current);
    }
    closeToolbarMenus();
    setIsFullScreen((prev) => !prev);
  }, [closeToolbarMenus]);

  // Handle Escape key: closes open menus, exits fullscreen, or closes creation wizard
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (showFxDropdown || showShapesDropdown) {
          closeToolbarMenus();
          return;
        }
        e.preventDefault();
        if (isFullScreen) {
          handleToggleExpand();
        } else if (onClose) {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullScreen, showFxDropdown, showShapesDropdown, handleToggleExpand, closeToolbarMenus, onClose]);

  const scrollToolsWithWheel = (e) => {
    if (e.deltaY) {
      e.currentTarget.scrollLeft += e.deltaY;
    }
  };

  const handleSave = () => {
    if (!name.trim()) return;

    let certId = editingCert ? editingCert.TrainingCertificateID : `TC-${Math.floor(10000 + Math.random() * 90000)}`;
    const currentBody = editorCanvasRef.current ? editorCanvasRef.current.innerHTML : activeHtmlRef.current;

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

  // ═══════════════════════════════════════════════════════════════════════
  // 🌟 CERTIFICATE WORKSPACE JSX (MATCHING EMAIL CANVAS DESIGN)
  // ═══════════════════════════════════════════════════════════════════════
  const workspaceContent = (
    <div
      className={`w-full rounded-2xl border border-[#202127] dark:border-white/10 bg-[#202127] dark:bg-white shadow-xs flex flex-col relative z-20 ${
        isFullScreen ? "h-full flex-1" : ""
      }`}
    >
      {/* 🌟 Single-Line Dark Header Toolbar (Matches CampaignEmail Step 3) */}
      <div
        data-editor-toolbar
        className="w-full h-8 text-white select-none bg-[#202127] dark:bg-white border-b border-white/10 dark:border-black/10 rounded-t-xl relative z-30 flex-shrink-0"
      >
        <div
          data-editor-tools
          onScroll={closeToolbarMenus}
          onWheel={scrollToolsWithWheel}
          className="w-full h-full flex items-center overflow-x-auto overflow-y-hidden rounded-t-xl [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/30 dark:[&::-webkit-scrollbar-thumb]:bg-black/25"
        >
          <div className="min-w-full w-max h-full px-2 flex items-center justify-between gap-3 flex-nowrap">
            <div className="flex items-center gap-1 text-xs flex-nowrap">
              {/* Format Block */}
              <select
                onMouseDown={() => saveSelection()}
                onChange={(e) => handleFormatBlock(e.target.value)}
                className="px-1 py-0.5 rounded bg-[#181A20] dark:bg-white text-white dark:text-black border-white/20 dark:border-black/20 text-[9px] font-bold border outline-none cursor-pointer"
                title="Block Format"
                defaultValue="<p>"
              >
                <option value="<p>">Paragraph</option>
                <option value="<h1>">Heading 1</option>
                <option value="<h2>">Heading 2</option>
                <option value="<h3>">Heading 3</option>
                <option value="<blockquote>">Quote</option>
              </select>

              {/* Font Family */}
              <select
                onMouseDown={() => saveSelection()}
                onChange={(e) => handleFontFamily(e.target.value)}
                className="px-1 py-0.5 rounded bg-[#181A20] dark:bg-white text-white dark:text-black border-white/20 dark:border-black/20 text-[9px] font-bold border outline-none cursor-pointer"
                title="Font Family"
                defaultValue="'Segoe UI', Arial, sans-serif"
              >
                <option value="'Segoe UI', Arial, sans-serif">Segoe UI</option>
                <option value="'Vodafone ExB', 'Montserrat', Arial, sans-serif">Vodafone ExB</option>
                <option value="'Inter', sans-serif">Inter</option>
                <option value="'JetBrains Mono', monospace">Mono Tech</option>
              </select>

              {/* Font Size */}
              <select
                onMouseDown={() => saveSelection()}
                onChange={(e) => handleFontSize(e.target.value)}
                className="px-1 py-0.5 rounded bg-[#181A20] dark:bg-white text-white dark:text-black border-white/20 dark:border-black/20 text-[9px] font-bold border outline-none cursor-pointer"
                title="Font Size"
                defaultValue="3"
              >
                <option value="2">12px</option>
                <option value="3">14px</option>
                <option value="4">18px</option>
                <option value="5">24px</option>
              </select>

              {/* Formatting Buttons */}
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); runCommand("bold"); }}
                className="p-0.5 rounded hover:bg-white/10 dark:hover:bg-black/10 cursor-pointer bg-[#181A20] dark:bg-white text-white dark:text-black"
                title="Bold"
              >
                <Bold className="w-3 h-3 stroke-[2.5]" />
              </button>

              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); runCommand("italic"); }}
                className="p-0.5 rounded hover:bg-white/10 dark:hover:bg-black/10 cursor-pointer bg-[#181A20] dark:bg-white text-white dark:text-black"
                title="Italic"
              >
                <Italic className="w-3 h-3 stroke-[2.5]" />
              </button>

              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); runCommand("underline"); }}
                className="p-0.5 rounded hover:bg-white/10 dark:hover:bg-black/10 cursor-pointer bg-[#181A20] dark:bg-white text-white dark:text-black"
                title="Underline"
              >
                <Underline className="w-3 h-3 stroke-[2.5]" />
              </button>

              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); runCommand("strikeThrough"); }}
                className="p-0.5 rounded hover:bg-white/10 dark:hover:bg-black/10 cursor-pointer bg-[#181A20] dark:bg-white text-white dark:text-black"
                title="Strikethrough"
              >
                <Strikethrough className="w-3 h-3" />
              </button>

              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); runCommand("removeFormat"); }}
                className="p-0.5 rounded hover:bg-white/10 dark:hover:bg-black/10 cursor-pointer bg-[#181A20] dark:bg-white text-white dark:text-black text-slate-400 hover:text-white dark:hover:text-black"
                title="Clear Formatting"
              >
                <RemoveFormatting className="w-3 h-3" />
              </button>

              <span className="text-white/25 dark:text-black/25 mx-0.5">|</span>

              {/* Alignments */}
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); runCommand("justifyLeft"); }}
                className="p-0.5 rounded hover:bg-white/10 dark:hover:bg-black/10 cursor-pointer bg-[#181A20] dark:bg-white text-white dark:text-black"
                title="Align Left"
              >
                <AlignLeft className="w-3 h-3" />
              </button>

              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); runCommand("justifyCenter"); }}
                className="p-0.5 rounded hover:bg-white/10 dark:hover:bg-black/10 cursor-pointer bg-[#181A20] dark:bg-white text-white dark:text-black"
                title="Align Center"
              >
                <AlignCenter className="w-3 h-3" />
              </button>

              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); runCommand("justifyRight"); }}
                className="p-0.5 rounded hover:bg-white/10 dark:hover:bg-black/10 cursor-pointer bg-[#181A20] dark:bg-white text-white dark:text-black"
                title="Align Right"
              >
                <AlignRight className="w-3 h-3" />
              </button>

              {/* Text & Shape Color Picker */}
              <label
                className="flex items-center justify-center cursor-pointer p-0.5 rounded hover:bg-white/10 dark:hover:bg-black/10 relative"
                title={`Text Color: ${activeColor}`}
              >
                <Palette className="w-3 h-3" style={{ color: activeColor }} />
                <input
                  type="color"
                  value={activeColor}
                  onChange={(e) => {
                    setActiveColor(e.target.value);
                    runCommand("foreColor", e.target.value);
                  }}
                  className="w-full h-full rounded cursor-pointer opacity-0 absolute inset-0"
                />
              </label>

              <span className="text-white/25 dark:text-black/25 mx-0.5">|</span>

              {/* Canvas Background Image Upload Icon */}
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                className="p-0.5 rounded hover:bg-white/10 dark:hover:bg-black/10 text-blue-400 cursor-pointer relative flex items-center justify-center"
                title={bgImage ? "Replace Canvas Background Image" : "Upload Canvas Background Image"}
              >
                <UploadCloud className="w-3 h-3" />
              </button>
              {bgImage && (
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setBgImage("")}
                  className="p-0.5 rounded hover:bg-white/10 dark:hover:bg-black/10 text-red-400 cursor-pointer flex items-center justify-center"
                  title="Remove Canvas Background Image"
                >
                  <X className="w-3 h-3" />
                </button>
              )}

              {/* Canvas Background Color Icon */}
              <label
                className="flex items-center justify-center cursor-pointer p-0.5 rounded hover:bg-white/10 dark:hover:bg-black/10 relative"
                title="Canvas Background Color"
              >
                <PaintBucket className="w-3 h-3 text-cyan-400" />
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="w-full h-full rounded cursor-pointer opacity-0 absolute inset-0"
                />
              </label>

              {/* Canvas Border Color Icon */}
              <label
                className="flex items-center justify-center cursor-pointer p-0.5 rounded hover:bg-white/10 dark:hover:bg-black/10 relative"
                title="Canvas Border Color"
              >
                <Square className="w-3 h-3 text-amber-400" />
                <input
                  type="color"
                  value={borderColor}
                  onChange={(e) => setBorderColor(e.target.value)}
                  className="w-full h-full rounded cursor-pointer opacity-0 absolute inset-0"
                />
              </label>

              <span className="text-white/25 dark:text-black/25 mx-0.5">|</span>

              {/* fx Dropdown Button */}
              <div data-dropdown="fx" className="relative flex-shrink-0">
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    saveSelection();
                  }}
                  onClick={(e) => {
                    setFxMenuAt(toolbarMenuAnchor(e.currentTarget, isFullScreen, 224));
                    setShowShapesDropdown(false);
                    setShowFxDropdown((prev) => !prev);
                  }}
                  className="px-1.5 py-0 rounded-2xl bg-white dark:bg-black hover:brightness-110 text-black dark:text-white font-mono-tech text-[9px] font-bold shadow-xs flex items-center gap-0.5 cursor-pointer"
                  title="Insert Dynamic Placeholder"
                >
                  <span>fx</span>
                  <ChevronDown className="w-2.5 h-2.5" />
                </button>
              </div>

              {/* Shapes Dropdown Button */}
              <div data-dropdown="shapes" className="relative flex-shrink-0">
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    saveSelection();
                  }}
                  onClick={(e) => {
                    setShapesMenuAt(toolbarMenuAnchor(e.currentTarget, isFullScreen, 260));
                    setShowFxDropdown(false);
                    setShowShapesDropdown((prev) => !prev);
                  }}
                  className="px-1.5 py-0 rounded-2xl bg-white dark:bg-black hover:brightness-110 text-black dark:text-white text-[9px] font-bold shadow-xs flex items-center gap-0.5 cursor-pointer whitespace-nowrap"
                  title="Insert Geometric Shape"
                >
                  <Shapes className="w-2.5 h-2.5" style={{ color: activeColor }} />
                  <span>Shapes</span>
                  <ChevronDown className="w-2.5 h-2.5" />
                </button>
              </div>
            </div>

            {/* Right side: Expand / Minimize toggle icon */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                type="button"
                onClick={handleToggleExpand}
                className="hover:text-[#E60000] text-white dark:text-black cursor-pointer transition-colors p-0.5 rounded hover:bg-white/10 dark:hover:bg-black/10"
                title={isFullScreen ? "Minimize Screen" : "Expand Full Screen"}
              >
                {isFullScreen ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
              </button>
            </div>
          </div>
        </div>

        {/* 🌟 Menus of the tools above, rendered outside data-editor-tools so overflow-y-hidden never clips them */}
        {showFxDropdown && fxMenuAt?.expanded === isFullScreen && (
          <div
            data-editor-menu="fx"
            style={{ position: "absolute", top: "100%", left: fxMenuAt.left, zIndex: 9999 }}
            className="mt-1 w-56 max-h-52 overflow-y-auto rounded-xl bg-[#1A1C23] border border-white/20 p-1 shadow-2xl flex flex-col gap-0.5 text-left"
          >
            <span className="text-[7.5px] font-mono-tech uppercase text-slate-400 px-2 py-0.5 font-bold">
              Dynamic Placeholders
            </span>
            {FX_PARAMETERS.map((ph) => (
              <button
                key={ph.code}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => insertPlaceholder(ph.code)}
                className="p-1 px-2 rounded-lg hover:bg-white/10 text-left flex items-center justify-between cursor-pointer transition-colors"
              >
                <span className="text-[9px] font-mono-tech font-bold text-[#FF8595]">
                  {ph.code}
                </span>
                <span className="text-[8px] text-slate-400 truncate max-w-[80px]">
                  {ph.label}
                </span>
              </button>
            ))}
          </div>
        )}

        {showShapesDropdown && shapesMenuAt?.expanded === isFullScreen && (
          <div
            data-editor-menu="shapes"
            style={{ position: "absolute", top: "100%", left: shapesMenuAt.left, zIndex: 9999 }}
            className="mt-1 w-64 max-h-80 overflow-y-auto rounded-xl bg-[#1A1C23] border border-white/20 p-2 shadow-2xl flex flex-col gap-2 text-left"
          >
            <div className="flex items-center justify-between px-1">
              <span className="text-[7.5px] font-mono-tech uppercase text-slate-400 font-bold">
                Insert Shape
              </span>
              <span className="text-[7.5px] font-mono-tech uppercase text-slate-400">
                Active Color
              </span>
            </div>

            {/* Variablized Color Controls: Custom color picker + Preset color swatches */}
            <div className="p-1.5 rounded-lg bg-black/40 border border-white/10 flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <label
                  className="relative cursor-pointer flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/10 hover:bg-white/15 border border-white/10 text-[9px] font-bold text-white transition-colors"
                  title="Pick Any Custom Color"
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-white/40 shadow-xs flex-shrink-0"
                    style={{ backgroundColor: activeColor }}
                  />
                  <span className="text-[8.5px]">Custom Color</span>
                  <input
                    type="color"
                    value={activeColor}
                    onChange={(e) => setActiveColor(e.target.value)}
                    className="opacity-0 absolute inset-0 cursor-pointer w-full h-full"
                  />
                </label>

                <span className="text-[8px] font-mono-tech font-bold text-slate-400 uppercase">
                  {activeColor}
                </span>
              </div>

              {/* Preset swatches */}
              <div className="flex items-center justify-between gap-1 pt-0.5">
                {PRESET_COLORS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setActiveColor(preset.value)}
                    className={`w-4 h-4 rounded-full border transition-all cursor-pointer ${
                      activeColor.toLowerCase() === preset.value.toLowerCase()
                        ? "scale-115 border-white ring-1 ring-white/60"
                        : "border-white/20 hover:scale-110"
                    }`}
                    style={{ backgroundColor: preset.value }}
                    title={preset.label}
                  />
                ))}
              </div>
            </div>

            {/* Shape Options List (dynamically renders in activeColor) */}
            <div className="flex flex-col gap-0.5 pt-0.5">
              {SHAPE_DEFINITIONS.map((shape) => (
                <button
                  key={shape.type}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => insertShape(shape.type)}
                  className="p-1 px-2 rounded-lg hover:bg-white/10 text-left flex items-center justify-between cursor-pointer transition-colors"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                      {shape.renderPreview(activeColor)}
                    </span>
                    <span className="text-[9px] font-bold text-white">
                      {shape.label}
                    </span>
                  </span>
                  <span className="text-[7.5px] text-slate-400 font-mono-tech">
                    + Insert
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Canvas Area: Empty workspace background matching email canvas design */}
      <div
        ref={isFullScreen ? fullScreenContainerRef : canvasContainerRef}
        className={`w-full bg-[#F1F5F7] dark:bg-[#15161A] border-t border-slate-200 dark:border-white/10 overflow-auto flex items-center justify-center ${
          isFullScreen ? "flex-1 h-full p-6" : "p-3 rounded-b-xl overflow-hidden items-start"
        }`}
        style={!isFullScreen ? { height: `${Math.round(500 * canvasScale + 24)}px` } : undefined}
      >
        <div
          ref={editorCanvasRef}
          contentEditable
          suppressContentEditableWarning
          onBlur={() => {
            if (editorCanvasRef.current) {
              activeHtmlRef.current = editorCanvasRef.current.innerHTML;
              setActiveHtml(activeHtmlRef.current);
            }
          }}
          onKeyUp={() => {
            if (editorCanvasRef.current) {
              activeHtmlRef.current = editorCanvasRef.current.innerHTML;
              setActiveHtml(activeHtmlRef.current);
            }
          }}
          onInput={() => {
            saveSelection();
            if (editorCanvasRef.current) {
              activeHtmlRef.current = editorCanvasRef.current.innerHTML;
              setActiveHtml(activeHtmlRef.current);
            }
          }}
          onKeyDown={handleCanvasKeyDown}
          onMouseUp={() => saveSelection()}
          style={{
            width: "800px",
            height: "500px",
            transform: `scale(${isFullScreen ? fullScreenScale : canvasScale})`,
            transformOrigin: isFullScreen ? "center center" : "top center",
            flexShrink: 0,
            borderColor: borderColor,
            borderWidth: "10px",
            borderStyle: "solid",
            backgroundColor: bgColor,
            ...(bgImage ? { backgroundImage: `url('${bgImage}')`, backgroundSize: "cover", backgroundPosition: "center" } : {})
          }}
          className="rounded-xl overflow-hidden p-8 outline-none border cursor-text shadow-xl relative flex flex-col justify-center select-text text-left font-sans bg-white text-slate-900"
        />
      </div>
    </div>
  );

  return (
    <>
      {/* ── FULLSCREEN MODAL PORTAL MATCHING EMAIL CANVAS (CAMPAIGN STEP 3) ── */}
      {isFullScreen &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[2147483647] bg-white dark:bg-black backdrop-blur-sm p-4 flex flex-col justify-between">
            <div className="w-full flex-1 flex flex-col overflow-hidden">
              {workspaceContent}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 flex-shrink-0">
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 font-voda uppercase tracking-wider flex-shrink-0">
                  Certificate Name:
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Cyber Security Honors"
                  className="h-7 px-2.5 rounded-lg border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-[#15161A] text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:border-[#16A34A] w-56 sm:w-72"
                />
                <span className="text-[10px] text-slate-400 hidden md:inline ml-1">
                  (Press <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-white/10 font-mono text-[9px] text-slate-700 dark:text-slate-300">Esc</kbd> to exit fullscreen)
                </span>
              </div>
              <div className="flex items-center gap-2.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={handleToggleExpand}
                  className="w-[100px] h-[26px] rounded-3xl bg-[#000000] dark:bg-[#ffffff] hover:bg-black/80 dark:hover:bg-white/80 text-white dark:text-black font-voda font-bold text-[10px] uppercase transition-all cursor-pointer shadow-xs flex items-center justify-center tracking-wider"
                >
                  Done Editing
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!name.trim()}
                  className="min-w-[90px] px-5 h-[26px] rounded-3xl bg-[#8ED973] hover:bg-[#7ec963] text-white font-voda font-bold text-[10px] uppercase tracking-wider shadow-sm transition-all cursor-pointer hover:scale-[1.02] active:scale-95 flex items-center justify-center disabled:opacity-40 disabled:hover:scale-100 disabled:cursor-not-allowed"
                >
                  {editingCert ? "SAVE CHANGES" : "SAVE TEMPLATE"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ── NORMAL / INLINE RENDER BLOCK ── */}
      <div className={`w-full flex flex-col text-left ${
        isInline
          ? "h-full min-h-0 border-none bg-transparent shadow-none"
          : `max-w-5xl border rounded-2xl overflow-hidden shadow-2xl h-[90vh] ${
              isDark ? "bg-[#12141A] border-white/10 text-white shadow-[0_20px_50px_rgba(0,0,0,0.6)]" : "bg-white border-slate-200 text-slate-800"
            }`
      }`}>
        {/* ── DOCKED TOP HEADER BAR ── */}
        <div className={`w-full h-12 flex items-stretch justify-between flex-shrink-0 select-none border-b ${
          isDark ? "border-white/10 bg-[#12141A]" : "border-slate-200/90 bg-white"
        }`}>
          <div className="px-6 h-full flex items-center gap-2.5 flex-shrink-0">
            <span className="font-voda font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
              {editingCert ? "Edit Compliance Certificate" : "Add New Certificate"}
            </span>
          </div>

          <div className="flex items-center h-full">
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
        </div>

        {/* ── EDITOR BODY ── */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 flex flex-col gap-5 custom-light-scrollbar">
          {/* Settings Panel: Clean Name & Description without buttons outside form */}
          <div className={`p-5 rounded-2xl border flex flex-col gap-4 ${
            isDark ? "bg-[#15161A] border-white/10" : "bg-[#F8FAFC] border-slate-200"
          }`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-2">
                  Certificate Name <span className="text-[#FF6B6B] dark:text-[#FFA8A8] font-bold">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`w-full h-10 px-3.5 rounded-xl border text-xs font-medium focus:outline-none focus:border-[#16A34A] focus:ring-1 focus:ring-[#16A34A] transition-all shadow-2xs ${
                    isDark ? "border-white/10 bg-[#0B1121] text-white placeholder-slate-500" : "border-slate-200 bg-white text-slate-900 placeholder-slate-400"
                  }`}
                  placeholder="e.g., Cyber Security Honors"
                />
              </div>

              <div className="flex flex-col">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-2">
                  Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={`w-full h-10 px-3.5 rounded-xl border text-xs font-medium focus:outline-none focus:border-[#16A34A] focus:ring-1 focus:ring-[#16A34A] transition-all shadow-2xs ${
                    isDark ? "border-white/10 bg-[#0B1121] text-white placeholder-slate-500" : "border-slate-200 bg-white text-slate-900 placeholder-slate-400"
                  }`}
                  placeholder="Certificate awarded for..."
                />
              </div>
            </div>
          </div>

          {/* Certificate Canvas Preview & Editor */}
          <div className="flex flex-col gap-2 relative">
            <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest block font-voda">
              PREVIEW
            </span>

            {!isFullScreen ? (
              workspaceContent
            ) : (
              <div
                className="w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-[#F1F5F7] dark:bg-[#15161A] flex items-center justify-center text-slate-400 text-xs font-semibold select-none"
                style={{ height: `${Math.round(500 * canvasScale + 24)}px` }}
              >
                <span>Editing in Fullscreen Mode...</span>
              </div>
            )}

            <span className="text-[9px] text-slate-500 dark:text-slate-400 text-center block mt-1">
              Select or type inside the canvas directly to edit the certificate. Insert dynamic &#123;fx&#125; for placeholders or custom shapes from the toolbar.
            </span>
          </div>
        </div>

        {/* ── DOCKED FOOTER BAR ── */}
        <div className={`px-6 py-3 border-t flex items-center justify-between gap-3 flex-shrink-0 ${
          isDark ? "bg-[#12141A] border-white/10" : "bg-slate-50 border-slate-200"
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
              className="h-[24px] px-4 rounded-3xl bg-red-600 hover:bg-red-700 text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer shadow-xs transition-all font-voda uppercase text-[10px] tracking-wider"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete Template
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
              disabled={!name.trim()}
              className="min-w-[90px] px-5 h-[24px] rounded-3xl bg-[#8ED973] hover:bg-[#7ec963] text-white font-voda font-bold text-[10px] uppercase tracking-wider shadow-sm transition-all cursor-pointer hover:scale-[1.02] active:scale-95 flex items-center justify-center disabled:opacity-40 disabled:hover:scale-100 disabled:cursor-not-allowed"
            >
              {editingCert ? "SAVE CHANGES" : "SAVE TEMPLATE"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default CreateNewCertificates;
