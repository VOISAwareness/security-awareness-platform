import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState
} from "react";

import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  ChevronDown,
  Code,
  Highlighter,
  Image as ImageIcon,
  Indent,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Maximize2,
  Minimize2,
  Outdent,
  Palette,
  RemoveFormatting,
  Strikethrough,
  Subscript,
  Superscript,
  Underline,
  X
} from "lucide-react";
import { createPortal } from "react-dom";

const FX_PARAMETERS = [
  { label: "@UserName", code: "{{userName}}", desc: "Target user full name" },
  { label: "@UserEmailID", code: "{{email}}", desc: "Target user email address" },
  { label: "@UserDepartment", code: "{{department}}", desc: "Target user department" },
  { label: "@UserCountry", code: "{{country}}", desc: "Target user work location" },
  { label: "@PhishLink", code: "{{phishLink}}", desc: "Simulation trackable landing link" },
  { label: "@ManagerName", code: "{{managerName}}", desc: "Target direct reporting manager" },
  { label: "@EmployeeID", code: "{{employeeId}}", desc: "Corporate employee badge number" },
  { label: "@CurrentDate", code: "{{currentDate}}", desc: "Simulation execution timestamp" }
];

const EMPTY_HTML_VALUES = ["", "<br>", "<div><br></div>", "<p><br></p>"];

const EmailBodyRichTextEditor = ({
  value = "",
  onChange,
  placeholder = "Type your email content here...",
  disabled = false,
  minHeight = 300,
  className = "",
  compact = false // NEW: renders the slim toolbar shown in the screenshot
}) => {
  const editorRef = useRef(null);
  const imageInputRef = useRef(null);
  const savedSelectionRef = useRef(null);
  const internalHtmlRef = useRef(value || "");

  const [rawHtmlMode, setRawHtmlMode] = useState(false);
  const [rawHtmlCode, setRawHtmlCode] = useState(value || "");
  const [isExpanded, setIsExpanded] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [showFxMenu, setShowFxMenu] = useState(false);
  const fxRef = useRef(null);

  const showToast = useCallback((message) => {
    setToastMessage(message);

    window.setTimeout(() => {
      setToastMessage("");
    }, 2500);
  }, []);

  const emitChange = useCallback(
    (html) => {
      const updatedHtml = html || "";

      internalHtmlRef.current = updatedHtml;
      onChange?.(updatedHtml);
    },
    [onChange]
  );

  const isEditorSelection = useCallback((range) => {
    if (!range || !editorRef.current) {
      return false;
    }

    const commonAncestor = range.commonAncestorContainer;
    const selectedNode =
      commonAncestor.nodeType === Node.TEXT_NODE
        ? commonAncestor.parentNode
        : commonAncestor;

    return editorRef.current.contains(selectedNode);
  }, []);

  const saveSelection = useCallback(() => {
    if (rawHtmlMode || !editorRef.current) {
      return;
    }

    const selection = window.getSelection();

    if (!selection || selection.rangeCount === 0) {
      return;
    }

    const range = selection.getRangeAt(0);

    if (isEditorSelection(range)) {
      savedSelectionRef.current = range.cloneRange();
    }
  }, [isEditorSelection, rawHtmlMode]);

  const placeCaretAtEnd = useCallback(() => {
    if (!editorRef.current) {
      return;
    }

    const selection = window.getSelection();
    const range = document.createRange();

    range.selectNodeContents(editorRef.current);
    range.collapse(false);

    selection.removeAllRanges();
    selection.addRange(range);

    savedSelectionRef.current = range.cloneRange();
  }, []);

  const restoreSelection = useCallback(() => {
    if (!editorRef.current) {
      return;
    }

    editorRef.current.focus();

    const selection = window.getSelection();

    if (!selection) {
      return;
    }

    const savedRange = savedSelectionRef.current;

    if (savedRange && isEditorSelection(savedRange)) {
      try {
        selection.removeAllRanges();
        selection.addRange(savedRange);
        return;
      } catch (error) {
        console.warn("Unable to restore editor selection:", error);
      }
    }

    placeCaretAtEnd();
  }, [isEditorSelection, placeCaretAtEnd]);

  const synchroniseEditorValue = useCallback(() => {
    if (!editorRef.current) {
      return;
    }

    const updatedHtml = editorRef.current.innerHTML;

    emitChange(updatedHtml);
    saveSelection();
  }, [emitChange, saveSelection]);

 useLayoutEffect(() => {
  if (rawHtmlMode || !editorRef.current) {
    return;
  }

  const incomingHtml = value || "";

  // Sync React value → contentEditable DOM
  // This is important on the first render because
  // internalHtmlRef can already contain the same value.
  if (editorRef.current.innerHTML !== incomingHtml) {
    editorRef.current.innerHTML = incomingHtml;
  }

  // Always keep our internal reference synchronized
  internalHtmlRef.current = incomingHtml;

  // Keep HTML source mode synchronized as well
  setRawHtmlCode(incomingHtml);
}, [value, rawHtmlMode, isExpanded]);

  

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (fxRef.current && !fxRef.current.contains(event.target)) {
        setShowFxMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isExpanded) {
      return undefined;
    }

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setIsExpanded(false);
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isExpanded]);

  const runCommand = useCallback(
    (command, commandValue = null) => {
      if (disabled || rawHtmlMode) {
        return;
      }

      restoreSelection();

      try {
        document.execCommand(command, false, commandValue);
      } catch (error) {
        console.error(`Editor command failed: ${command}`, error);
      }

      synchroniseEditorValue();
    },
    [
      disabled,
      rawHtmlMode,
      restoreSelection,
      synchroniseEditorValue
    ]
  );

  const handleToolbarMouseDown = (event) => {
    event.preventDefault();
  };

  const handleEditorInput = () => {
    synchroniseEditorValue();
  };

  const handleEditorBlur = () => {
    saveSelection();

    if (!editorRef.current) {
      return;
    }

    emitChange(editorRef.current.innerHTML);
  };

  const handlePaste = (event) => {
    if (disabled || rawHtmlMode) {
      return;
    }

    const clipboardData = event.clipboardData;

    if (!clipboardData) {
      return;
    }

    const htmlContent = clipboardData.getData("text/html");
    const plainText = clipboardData.getData("text/plain");

    event.preventDefault();

    restoreSelection();

    if (htmlContent) {
      document.execCommand("insertHTML", false, htmlContent);
    } else {
      const safeText = plainText
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\n/g, "<br>");

      document.execCommand("insertHTML", false, safeText);
    }

    synchroniseEditorValue();
  };

  const handleToggleCodeMode = () => {
    if (disabled) {
      return;
    }

    if (!rawHtmlMode) {
      const currentHtml =
        editorRef.current?.innerHTML ?? internalHtmlRef.current ?? "";

      internalHtmlRef.current = currentHtml;
      setRawHtmlCode(currentHtml);
      setRawHtmlMode(true);
      return;
    }

    internalHtmlRef.current = rawHtmlCode;
    emitChange(rawHtmlCode);
    setRawHtmlMode(false);
  };

  const handleRawHtmlChange = (event) => {
    const updatedHtml = event.target.value;

    setRawHtmlCode(updatedHtml);
    emitChange(updatedHtml);
  };

  const handleToggleExpand = () => {
    if (!rawHtmlMode && editorRef.current) {
      internalHtmlRef.current = editorRef.current.innerHTML;
    }

    if (rawHtmlMode) {
      internalHtmlRef.current = rawHtmlCode;
    }

    setIsExpanded((previousValue) => !previousValue);
  };

  const insertLink = () => {
    const url = prompt(
      "Enter Destination URL (e.g., https://learning.vodafone.com):",
      "#training"
    );

    if (url) {
      runCommand("createLink", url);
    }
  };

  const insertFxPlaceholder = (param) => {
    setShowFxMenu(false);

    if (disabled || rawHtmlMode) {
      return;
    }

    restoreSelection();

    const spanHtml = `<span style="background-color: rgba(153,0,153,0.12); color: #990099; font-weight: bold; padding: 1px 5px; border-radius: 4px; font-family: monospace;">${param.label}</span>&nbsp;`;

    document.execCommand("insertHTML", false, spanHtml);
    synchroniseEditorValue();
  };

  const handleImageUpload = (event) => {
    const file = event.target.files?.[0];

    if (!file || !editorRef.current) {
      return;
    }

    const allowedImageTypes = [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/gif",
      "image/webp",
      "image/svg+xml"
    ];

    if (!allowedImageTypes.includes(file.type)) {
      showToast("Please select a valid image file.");
      event.target.value = "";
      return;
    }

    const maximumFileSize = 5 * 1024 * 1024;

    if (file.size > maximumFileSize) {
      showToast("Image size must be less than 5 MB.");
      event.target.value = "";
      return;
    }

    saveSelection();

    const reader = new FileReader();

    reader.onload = (readerEvent) => {
      const imageSource = readerEvent.target?.result;

      if (typeof imageSource !== "string") {
        showToast("Unable to read the selected image.");
        return;
      }

      const editor = editorRef.current;

      if (!editor) {
        return;
      }

      editor.focus();

      const selection = window.getSelection();
      let range = savedSelectionRef.current;

      if (
        !range ||
        !editor.contains(range.commonAncestorContainer)
      ) {
        range = document.createRange();
        range.selectNodeContents(editor);
        range.collapse(false);
      }

      selection.removeAllRanges();
      selection.addRange(range);

      const imageWrapper = document.createElement("div");

      imageWrapper.style.width = "100%";
      imageWrapper.style.margin = "16px 0";
      imageWrapper.style.textAlign = "center";

      const imageElement = document.createElement("img");

      imageElement.src = imageSource;
      imageElement.alt = file.name || "Uploaded image";
      imageElement.style.display = "inline-block";
      imageElement.style.maxWidth = "100%";
      imageElement.style.height = "auto";
      imageElement.style.borderRadius = "8px";
      imageElement.style.objectFit = "contain";

      imageElement.onload = () => {
        const updatedHtml = editor.innerHTML;

        internalHtmlRef.current = updatedHtml;
        onChange?.(updatedHtml);
      };

      imageElement.onerror = () => {
        showToast("The selected image could not be displayed.");
      };

      imageWrapper.appendChild(imageElement);

      const paragraphAfterImage = document.createElement("p");
      paragraphAfterImage.innerHTML = "<br>";

      range.deleteContents();
      range.insertNode(paragraphAfterImage);
      range.insertNode(imageWrapper);

      const newRange = document.createRange();

      newRange.selectNodeContents(paragraphAfterImage);
      newRange.collapse(true);

      selection.removeAllRanges();
      selection.addRange(newRange);

      savedSelectionRef.current = newRange.cloneRange();

      const updatedHtml = editor.innerHTML;

      internalHtmlRef.current = updatedHtml;
      onChange?.(updatedHtml);

      showToast("Image inserted successfully.");

      editor.focus();
    };

    reader.onerror = () => {
      showToast("Unable to read the selected image.");
    };

    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const editorIsEmpty = EMPTY_HTML_VALUES.includes(
    (internalHtmlRef.current || "").trim().toLowerCase()
  );

  const toolbarButtonClass = `
    flex h-7 w-7 items-center justify-center rounded-md
    text-slate-200 transition-colors
    hover:bg-white/15 hover:text-white
    disabled:cursor-not-allowed disabled:opacity-40
  `;

  // ==========================================================
  // COMPACT TOOLBAR — matches the "Email Body" screenshot:
  // B / I / U | Align-left / Align-center / Align-right ... Expand
  // ==========================================================
   // ==========================================================
  // COMPACT TOOLBAR — matches the "Email Body" screenshot
  // (No outer wrapper here — the wrapper lives in renderEditorWorkspace)
  // ==========================================================
  const renderCompactToolbar = () => (
    <div className="w-full h-8 px-2 flex items-center justify-between text-white select-none bg-[#202127] dark:bg-white border-b border-white/10 rounded-t-xl relative z-30 flex-nowrap">
      <div className="flex items-center gap-1 text-xs flex-nowrap overflow-x-auto">
        <select
          defaultValue="<p>"
          disabled={disabled || rawHtmlMode}
          onMouseDown={saveSelection}
          onChange={(event) => runCommand("formatBlock", event.target.value)}
          className="px-1 py-0.5 rounded bg-[#181A20] dark:bg-white text-white dark:text-black border-white/20 dark:border-black/20 text-[9px] font-bold border outline-none cursor-pointer"
          title="Paragraph format"
        >
          <option value="<p>">Paragraph</option>
          <option value="<h1>">Heading 1</option>
          <option value="<h2>">Heading 2</option>
          <option value="<h3>">Heading 3</option>
          <option value="<blockquote>">Quote</option>
        </select>

        <select
          defaultValue="Segoe UI"
          disabled={disabled || rawHtmlMode}
          onMouseDown={saveSelection}
          onChange={(event) => runCommand("fontName", event.target.value)}
          className="px-1 py-0.5 rounded bg-[#181A20] dark:bg-white text-white dark:text-black border-white/20 dark:border-black/20 text-[9px] font-bold border outline-none cursor-pointer"
          title="Font family"
        >
          <option value="Segoe UI">Segoe UI</option>
          <option value="Arial">Arial</option>
          <option value="Inter">Inter</option>
          <option value="Montserrat">Montserrat</option>
        </select>

        <select
          defaultValue="3"
          disabled={disabled || rawHtmlMode}
          onMouseDown={saveSelection}
          onChange={(event) => runCommand("fontSize", event.target.value)}
          className="px-1 py-0.5 rounded bg-[#181A20] dark:bg-white text-white dark:text-black border-white/20 dark:border-black/20 text-[9px] font-bold border outline-none cursor-pointer"
          title="Font size"
        >
          <option value="2">12px</option>
          <option value="3">14px</option>
          <option value="4">18px</option>
          <option value="5">24px</option>
        </select>

        <button type="button" disabled={disabled || rawHtmlMode} onMouseDown={handleToolbarMouseDown} onClick={() => runCommand("bold")} className="p-0.5 rounded hover:bg-white/10 cursor-pointer bg-[#181A20] dark:bg-white text-white dark:text-black" title="Bold">
          <Bold className="h-3.5 w-3.5" />
        </button>
        <button type="button" disabled={disabled || rawHtmlMode} onMouseDown={handleToolbarMouseDown} onClick={() => runCommand("italic")} className="p-0.5 rounded hover:bg-white/10 cursor-pointer bg-[#181A20] dark:bg-white text-white dark:text-black" title="Italic">
          <Italic className="h-3.5 w-3.5" />
        </button>
        <button type="button" disabled={disabled || rawHtmlMode} onMouseDown={handleToolbarMouseDown} onClick={() => runCommand("underline")} className="p-0.5 rounded hover:bg-white/10 cursor-pointer bg-[#181A20] dark:bg-white text-white dark:text-black" title="Underline">
          <Underline className="h-3.5 w-3.5" />
        </button>
        <button type="button" disabled={disabled || rawHtmlMode} onMouseDown={handleToolbarMouseDown} onClick={() => runCommand("strikeThrough")} className="p-0.5 rounded hover:bg-white/10 cursor-pointer bg-[#181A20] dark:bg-white text-white dark:text-black" title="Strikethrough">
          <Strikethrough className="h-3.5 w-3.5" />
        </button>
        <button type="button" disabled={disabled || rawHtmlMode} onMouseDown={handleToolbarMouseDown} onClick={() => runCommand("removeFormat")} className="p-0.5 rounded hover:bg-white/10 cursor-pointer bg-[#181A20] dark:bg-white text-white dark:text-black text-slate-400 hover:text-white dark:hover:text-black" title="Clear formatting">
          <RemoveFormatting className="h-3.5 w-3.5" />
        </button>

        <button type="button" disabled={disabled || rawHtmlMode} onMouseDown={handleToolbarMouseDown} onClick={() => runCommand("justifyLeft")} className="p-0.5 rounded hover:bg-white/10 cursor-pointer bg-[#181A20] dark:bg-white text-white dark:text-black" title="Align left">
          <AlignLeft className="h-3.5 w-3.5" />
        </button>
        <button type="button" disabled={disabled || rawHtmlMode} onMouseDown={handleToolbarMouseDown} onClick={() => runCommand("justifyCenter")} className="p-0.5 rounded hover:bg-white/10 cursor-pointer bg-[#181A20] dark:bg-white text-white dark:text-black" title="Align center">
          <AlignCenter className="h-3.5 w-3.5" />
        </button>
        <button type="button" disabled={disabled || rawHtmlMode} onMouseDown={handleToolbarMouseDown} onClick={() => runCommand("justifyRight")} className="p-0.5 rounded hover:bg-white/10 cursor-pointer bg-[#181A20] dark:bg-white text-white dark:text-black" title="Align right">
          <AlignRight className="h-3.5 w-3.5" />
        </button>

        <label
          className={`relative flex h-7 w-7 flex-shrink-0 cursor-pointer items-center justify-center rounded-md hover:bg-white/15 ${disabled || rawHtmlMode ? "pointer-events-none opacity-40" : ""}`}
          title="Text color"
          onMouseDown={saveSelection}
        >
          <Palette className="h-3.5 w-3.5 text-[#E60000]" />
          <input
            type="color"
            disabled={disabled || rawHtmlMode}
            onChange={(event) => runCommand("foreColor", event.target.value)}
            className="w-3 h-3 rounded cursor-pointer opacity-0 absolute inset-0"
          />
        </label>

        <input
          type="file"
          ref={imageInputRef}
          accept="image/png, image/jpeg, image/jpg, image/gif, image/webp, image/svg+xml"
          onChange={handleImageUpload}
          className="hidden"
        />

        <button type="button" disabled={disabled || rawHtmlMode} onClick={() => imageInputRef.current?.click()} className={`${toolbarButtonClass} text-blue-400`} title="Upload & Embed Local Image">
          <ImageIcon className="h-3.5 w-3.5" />
        </button>

        <button type="button" disabled={disabled || rawHtmlMode} onMouseDown={handleToolbarMouseDown} onClick={insertLink} className={`${toolbarButtonClass} text-emerald-400`} title="Insert link">
          <LinkIcon className="h-3.5 w-3.5" />
        </button>

        <div ref={fxRef} className="relative flex-shrink-0">
          <button
            type="button"
            disabled={disabled || rawHtmlMode}
            onMouseDown={(event) => {
              event.preventDefault();
              saveSelection();
            }}
            onClick={() => setShowFxMenu((prev) => !prev)}
            className="flex h-7 items-center gap-0.5 rounded-2xl bg-white px-2 text-[9px] font-bold text-black shadow-xs"
            title="Insert Dynamic Placeholder"
          >
            <span>fx</span>
            <ChevronDown className="h-2.5 w-2.5" />
          </button>

          {showFxMenu && (
            <div className="absolute left-0 top-full z-[9999] mt-1 flex max-h-48 w-52 flex-col gap-0.5 overflow-y-auto rounded-xl border border-white/20 bg-[#1A1C23] p-1 text-left shadow-2xl">
              <span className="px-2 py-0.5 font-mono-tech text-[7.5px] font-bold uppercase text-slate-400">
                Dynamic Placeholders
              </span>
              {FX_PARAMETERS.map((fx) => (
                <button
                  key={fx.label}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => insertFxPlaceholder(fx)}
                  className="flex items-center justify-between rounded-lg p-1 px-2 text-left transition-colors hover:bg-white/10"
                >
                  <span className="font-mono-tech text-[9px] font-bold text-[#FF8595]">
                    {fx.label}
                  </span>
                  <span className="max-w-[80px] truncate text-[8px] text-slate-400">
                    {fx.desc}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="ml-auto flex flex-shrink-0 items-center gap-1">
        <button
          type="button"
          disabled={disabled}
          onClick={handleToggleCodeMode}
          className={`flex h-7 items-center gap-0.5 rounded border px-2 text-[9px] font-bold transition-colors ${rawHtmlMode ? "border-red-600 bg-red-600 text-white" : "border-white/20 bg-[#181A20] text-white hover:bg-white/15"}`}
          title="Toggle HTML source code"
        >
          <Code className="h-3 w-3" />
          {rawHtmlMode ? "Visual" : "HTML"}
        </button>

        <button
          type="button"
          onClick={handleToggleExpand}
          className={toolbarButtonClass}
          title={isExpanded ? "Minimize editor" : "Expand editor"}
        >
          {isExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );

  // ==========================================================
  // Reusable editor workspace.
  // Normal mode and fullscreen mode both use this same canvas.
  // ==========================================================
  const renderEditorWorkspace = (expanded = false) => {
    if (compact) {
      return (
        <div
          className={`
            w-full rounded-2xl border border-[#202127] bg-[#202127] dark:bg-white
            shadow-xs flex flex-col relative z-20
            ${expanded ? "h-[calc(100vh-80px)]" : "h-[220px]"}
          `}
        >
          {renderCompactToolbar()}

          <div
            className={`
              relative min-w-0 w-full flex-1 p-2 mb-1
              bg-white dark:bg-[#15161A]
              rounded-b-xl border-t border-slate-200 dark:border-white/10
              overflow-hidden
              ${expanded ? "min-h-0" : ""}
            `}
          >
            <div className="w-full h-full overflow-y-auto">
              {rawHtmlMode ? (
                <textarea
                  value={rawHtmlCode}
                  disabled={disabled}
                  onChange={handleRawHtmlChange}
                  spellCheck={false}
                  className="w-full h-full p-2.5 font-mono text-[10.5px] bg-[#0F172A] text-emerald-400 outline-none resize-none leading-relaxed rounded-lg disabled:cursor-not-allowed disabled:opacity-70"
                  placeholder="Write email HTML code here..."
                />
              ) : (
                <>
                  {editorIsEmpty && (
                    <div className="pointer-events-none absolute left-4 top-4 z-10 text-sm text-slate-400">
                      {placeholder}
                    </div>
                  )}

                  <div
                    ref={editorRef}
                    contentEditable={!disabled}
                    suppressContentEditableWarning
                    role="textbox"
                    aria-label="Email body rich text editor"
                    aria-multiline="true"
                    spellCheck
                    onInput={handleEditorInput}
                    onKeyUp={saveSelection}
                    onMouseUp={saveSelection}
                    onFocus={saveSelection}
                    onBlur={handleEditorBlur}
                    onPaste={handlePaste}
                    className={`
                      w-full h-full outline-none cursor-text
                      text-slate-900 dark:text-slate-100 p-1 leading-normal text-xs
                      [&_a]:text-blue-600 [&_a]:underline
                      [&_blockquote]:border-l-4 [&_blockquote]:border-slate-300 [&_blockquote]:pl-4
                      [&_h1]:my-3 [&_h1]:text-3xl [&_h1]:font-bold
                      [&_h2]:my-3 [&_h2]:text-2xl [&_h2]:font-bold
                      [&_h3]:my-2 [&_h3]:text-xl [&_h3]:font-bold
                      [&_h4]:my-2 [&_h4]:text-lg [&_h4]:font-semibold
                      [&_ol]:list-decimal [&_ol]:pl-6
                      [&_p]:my-1
                      [&_ul]:list-disc [&_ul]:pl-6
                      ${disabled ? "cursor-not-allowed bg-slate-100 opacity-70" : "cursor-text"}
                    `}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        className={`
          w-full rounded-2xl
          border border-[#202127]
          bg-[#202127]
          dark:bg-white
          shadow-xs
          flex flex-col
          relative z-20
          ${expanded ? "h-[calc(100vh-80px)]" : "h-[220px]"}
        `}
      >
        <div
          className={`
            flex w-full flex-col overflow-hidden rounded-xl
            border border-slate-300 bg-black shadow-sm
            ${expanded ? "h-full" : ""}
          `}
        >
          {renderFullToolbar()}

          <div
            className={`
              relative flex-1 mx-2.5 mb-2.5
              rounded-xl border border-white/20
              overflow-y-auto bg-white
              flex flex-col shadow-inner
              ${expanded ? "min-h-0" : ""}
            `}
          >
            {rawHtmlMode ? (
              <textarea
                value={rawHtmlCode}
                disabled={disabled}
                onChange={handleRawHtmlChange}
                spellCheck={false}
                className="h-full w-full resize-none bg-[#0f172a] p-4 font-mono text-xs leading-6 text-emerald-400 outline-none disabled:cursor-not-allowed disabled:opacity-70"
                style={{
                  minHeight: expanded ? "calc(100vh - 82px)" : `${minHeight}px`
                }}
                placeholder="Enter HTML source code here..."
              />
            ) : (
              <>
                {editorIsEmpty && (
                  <div className="pointer-events-none absolute left-4 top-4 z-10 text-sm text-slate-400">
                    {placeholder}
                  </div>
                )}

                <div
                  ref={editorRef}
                  contentEditable={!disabled}
                  suppressContentEditableWarning
                  role="textbox"
                  aria-label="Email body rich text editor"
                  aria-multiline="true"
                  spellCheck
                  onInput={handleEditorInput}
                  onKeyUp={saveSelection}
                  onMouseUp={saveSelection}
                  onFocus={saveSelection}
                  onBlur={handleEditorBlur}
                  onPaste={handlePaste}
                  className={`
                    overflow-scroll h-full w-full overflow-y-auto
                    bg-white p-4 text-sm leading-6 text-slate-900
                    outline-none
                    [&_a]:text-blue-600 [&_a]:underline
                    [&_blockquote]:border-l-4 [&_blockquote]:border-slate-300 [&_blockquote]:pl-4
                    [&_h1]:my-3 [&_h1]:text-3xl [&_h1]:font-bold
                    [&_h2]:my-3 [&_h2]:text-2xl [&_h2]:font-bold
                    [&_h3]:my-2 [&_h3]:text-xl [&_h3]:font-bold
                    [&_h4]:my-2 [&_h4]:text-lg [&_h4]:font-semibold
                    [&_ol]:list-decimal [&_ol]:pl-6
                    [&_p]:my-1
                    [&_ul]:list-disc [&_ul]:pl-6
                    ${disabled ? "cursor-not-allowed bg-slate-100 opacity-70" : "cursor-text"}
                  `}
                  style={{
                    minHeight: expanded ? "calc(100vh - 82px)" : `${minHeight}px`
                  }}
                />
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ==========================================================
  // FULL TOOLBAR (unchanged — used when compact is false)
  // ==========================================================
  const renderFullToolbar = () => (
    <div className="flex w-full flex-shrink-0 flex-nowrap items-center gap-0.5 border-b border-white/10 bg-black px-2 py-1 text-white">
      <select
        defaultValue="<p>"
        disabled={disabled || rawHtmlMode}
        onMouseDown={saveSelection}
        onChange={(event) => runCommand("formatBlock", event.target.value)}
        className="h-7 rounded-md border border-white/20 bg-[#181A20] px-2 text-[10px] font-bold text-white outline-none"
        title="Paragraph format"
      >
        <option value="<p>">Paragraph</option>
        <option value="<h1>">Heading 1</option>
        <option value="<h2>">Heading 2</option>
        <option value="<h3>">Heading 3</option>
        <option value="<blockquote>">Quote</option>
      </select>

      <select
        defaultValue="Segoe UI"
        disabled={disabled || rawHtmlMode}
        onMouseDown={saveSelection}
        onChange={(event) => runCommand("fontName", event.target.value)}
        className="h-7 rounded-md border border-white/20 bg-[#181A20] px-2 text-[10px] font-bold text-white outline-none"
        title="Font family"
      >
        <option value="Segoe UI">Segoe UI</option>
        <option value="Arial">Arial</option>
        <option value="Inter">Inter</option>
        <option value="Montserrat">Montserrat</option>
      </select>

      <select
        defaultValue="3"
        disabled={disabled || rawHtmlMode}
        onMouseDown={saveSelection}
        onChange={(event) => runCommand("fontSize", event.target.value)}
        className="h-7 rounded-md border border-white/20 bg-[#181A20] px-2 text-[10px] font-bold text-white outline-none"
        title="Font size"
      >
        <option value="2">12px</option>
        <option value="3">14px</option>
        <option value="4">18px</option>
        <option value="5">24px</option>
      </select>

      <button type="button" disabled={disabled || rawHtmlMode} onMouseDown={handleToolbarMouseDown} onClick={() => runCommand("bold")} className={toolbarButtonClass} title="Bold"><Bold className="h-3.5 w-3.5" /></button>
      <button type="button" disabled={disabled || rawHtmlMode} onMouseDown={handleToolbarMouseDown} onClick={() => runCommand("italic")} className={toolbarButtonClass} title="Italic"><Italic className="h-3.5 w-3.5" /></button>
      <button type="button" disabled={disabled || rawHtmlMode} onMouseDown={handleToolbarMouseDown} onClick={() => runCommand("underline")} className={toolbarButtonClass} title="Underline"><Underline className="h-3.5 w-3.5" /></button>
      <button type="button" disabled={disabled || rawHtmlMode} onMouseDown={handleToolbarMouseDown} onClick={() => runCommand("strikeThrough")} className={toolbarButtonClass} title="Strikethrough"><Strikethrough className="h-3.5 w-3.5" /></button>
      <button type="button" disabled={disabled || rawHtmlMode} onMouseDown={handleToolbarMouseDown} onClick={() => runCommand("removeFormat")} className={toolbarButtonClass} title="Clear formatting"><RemoveFormatting className="h-3.5 w-3.5" /></button>

      <div className="mx-0.5 h-4 w-px bg-white/20" />

      <button type="button" disabled={disabled || rawHtmlMode} onMouseDown={handleToolbarMouseDown} onClick={() => runCommand("justifyLeft")} className={toolbarButtonClass} title="Align left"><AlignLeft className="h-3.5 w-3.5" /></button>
      <button type="button" disabled={disabled || rawHtmlMode} onMouseDown={handleToolbarMouseDown} onClick={() => runCommand("justifyCenter")} className={toolbarButtonClass} title="Align center"><AlignCenter className="h-3.5 w-3.5" /></button>
      <button type="button" disabled={disabled || rawHtmlMode} onMouseDown={handleToolbarMouseDown} onClick={() => runCommand("justifyRight")} className={toolbarButtonClass} title="Align right"><AlignRight className="h-3.5 w-3.5" /></button>
      <button type="button" disabled={disabled || rawHtmlMode} onMouseDown={handleToolbarMouseDown} onClick={() => runCommand("justifyFull")} className={toolbarButtonClass} title="Justify"><AlignJustify className="h-3.5 w-3.5" /></button>

      <label className={`relative flex h-7 w-7 flex-shrink-0 cursor-pointer items-center justify-center rounded-md hover:bg-white/15 ${disabled || rawHtmlMode ? "pointer-events-none opacity-40" : ""}`} title="Text color" onMouseDown={saveSelection}>
        <Palette className="h-3.5 w-3.5 text-[#E60000]" />
        <input type="color" disabled={disabled || rawHtmlMode} onChange={(event) => runCommand("foreColor", event.target.value)} className="absolute inset-0 h-3 w-3 cursor-pointer rounded opacity-0" />
      </label>

      <input type="file" ref={imageInputRef} accept="image/png, image/jpeg, image/jpg, image/gif, image/webp, image/svg+xml" onChange={handleImageUpload} className="hidden" />

      <button type="button" disabled={disabled || rawHtmlMode} onClick={() => imageInputRef.current?.click()} className={`${toolbarButtonClass} text-blue-400`} title="Upload & Embed Local Image"><ImageIcon className="h-3.5 w-3.5" /></button>

      <button type="button" disabled={disabled || rawHtmlMode} onMouseDown={handleToolbarMouseDown} onClick={insertLink} className={`${toolbarButtonClass} text-emerald-400`} title="Insert link"><LinkIcon className="h-3.5 w-3.5" /></button>

      <div ref={fxRef} className="relative flex-shrink-0">
        <button
          type="button"
          disabled={disabled || rawHtmlMode}
          onMouseDown={(event) => {
            event.preventDefault();
            saveSelection();
          }}
          onClick={() => setShowFxMenu((prev) => !prev)}
          className="flex h-7 items-center gap-0.5 rounded-2xl bg-white px-2 text-[9px] font-bold text-black shadow-xs"
          title="Insert Dynamic Placeholder"
        >
          <span>fx</span>
          <ChevronDown className="h-2.5 w-2.5" />
        </button>

        {showFxMenu && (
          <div className="absolute left-0 top-full z-[9999] mt-1 flex max-h-48 w-52 flex-col gap-0.5 overflow-y-auto rounded-xl border border-white/20 bg-[#1A1C23] p-1 text-left shadow-2xl">
            <span className="px-2 py-0.5 font-mono-tech text-[7.5px] font-bold uppercase text-slate-400">Dynamic Placeholders</span>
            {FX_PARAMETERS.map((fx) => (
              <button key={fx.label} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => insertFxPlaceholder(fx)} className="flex items-center justify-between rounded-lg p-1 px-2 text-left transition-colors hover:bg-white/10">
                <span className="font-mono-tech text-[9px] font-bold text-[#FF8595]">{fx.label}</span>
                <span className="max-w-[80px] truncate text-[8px] text-slate-400">{fx.desc}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* HTML + Expand pushed to the far right */}
      <div className="ml-auto flex flex-shrink-0 items-center gap-1">
        <button
          type="button"
          disabled={disabled}
          onClick={handleToggleCodeMode}
          className={`flex h-7 items-center gap-0.5 rounded border px-2 text-[9px] font-bold transition-colors ${rawHtmlMode ? "border-red-600 bg-red-600 text-white" : "border-white/20 bg-[#181A20] text-white hover:bg-white/15"}`}
          title="Toggle HTML source code"
        >
          <Code className="h-3 w-3" />
          {rawHtmlMode ? "Visual" : "HTML"}
        </button>

        <button type="button" onClick={handleToggleExpand} className={toolbarButtonClass} title={isExpanded ? "Minimize editor" : "Expand editor"}>
          {isExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
        </button>

        {isExpanded && (
          <button type="button" onClick={() => setIsExpanded(false)} className={toolbarButtonClass} title="Close full-screen editor">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );

  // ==========================================================
  // Reusable editor workspace.
  // Normal mode and fullscreen mode both use this same canvas.
  // ==========================================================
  

  return (
    <>
    {!isExpanded && (
        <div className={`w-full min-w-0 ${className}`}>
          {renderEditorWorkspace(false)}
        </div>
      )}
      {isExpanded &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[2147483647] bg-white dark:bg-black backdrop-blur-sm p-4 flex flex-col justify-between">
            <div className="w-full flex-1 flex flex-col overflow-hidden">
              {renderEditorWorkspace(true)}
            </div>

            <div className="flex justify-end pt-3">
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="px-6 py-2 rounded-xl bg-[#E60000] hover:bg-red-700 text-white font-voda font-bold text-[9px] uppercase cursor-pointer shadow-lg"
              >
                Done Editing
              </button>
            </div>
          </div>,
          document.body
        )}

      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[2147483647] rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white shadow-xl">
          {toastMessage}
        </div>
      )}
    </>
  );
};

export default EmailBodyRichTextEditor;