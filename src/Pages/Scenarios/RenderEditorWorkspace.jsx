import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useUserType } from '../../UserTypeContext/UserTypeContext';
import {
  Check,
  ChevronDown,
  RotateCw,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  RemoveFormatting,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Image as ImageIcon,
  Link as LinkIcon,
  Code,
  Palette,
  Maximize2,
  Minimize2,
  Search
} from 'lucide-react';
// Essential Dynamic Email Variables
const FX_PARAMETERS = [
  { label: '@UserName', code: '{{userName}}', desc: 'Target user full name' },
  { label: '@UserEmailID', code: '{{email}}', desc: 'Target user email address' },
  { label: '@UserDepartment', code: '{{department}}', desc: 'Target user department' },
  { label: '@UserCountry', code: '{{country}}', desc: 'Target user work location' },
  { label: '@PhishLink', code: '{{phishLink}}', desc: 'Simulation trackable landing link' },
  { label: '@ManagerName', code: '{{managerName}}', desc: 'Target direct reporting manager' },
  { label: '@EmployeeID', code: '{{employeeId}}', desc: 'Corporate employee badge number' },
  { label: '@CurrentDate', code: '{{currentDate}}', desc: 'Simulation execution timestamp' }
];
const RenderEditorWorkspace = (expanded = false) => (
    <div className={`w-full rounded-2xl border border-[#202127] bg-[#202127] dark:bg-white shadow-xs flex flex-col relative z-20 ${
      expanded ? 'h-[calc(100vh-80px)]' : 'h-[220px]'
    }`}>
      {/* 🌟 Single-Line Dark Header Toolbar (Seamless with Container) */}
      <div className="w-full h-8 px-2 flex items-center justify-between text-white select-none bg-[#202127] dark:bg-white border-b border-white/10 rounded-t-xl relative z-30 flex-nowrap">
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
            onMouseDown={(e) => { e.preventDefault(); runCommand('bold'); }} 
            className="p-0.5 rounded hover:bg-white/10 cursor-pointer bg-[#181A20] dark:bg-white text-white dark:text-black" 
            title="Bold"
          >
            <Bold className="w-3 h-3 stroke-[2.5]" />
          </button>

          <button 
            type="button" 
            onMouseDown={(e) => { e.preventDefault(); runCommand('italic'); }} 
            className="p-0.5 rounded hover:bg-white/10 cursor-pointer bg-[#181A20] dark:bg-white text-white dark:text-black" 
            title="Italic"
          >
            <Italic className="w-3 h-3 stroke-[2.5]" />
          </button>

          <button 
            type="button" 
            onMouseDown={(e) => { e.preventDefault(); runCommand('underline'); }} 
            className="p-0.5 rounded hover:bg-white/10 cursor-pointer bg-[#181A20] dark:bg-white text-white dark:text-black" 
            title="Underline"
          >
            <Underline className="w-3 h-3 stroke-[2.5]" />
          </button>

          <button 
            type="button" 
            onMouseDown={(e) => { e.preventDefault(); runCommand('strikeThrough'); }} 
            className="p-0.5 rounded hover:bg-white/10 cursor-pointer bg-[#181A20] dark:bg-white text-white dark:text-black" 
            title="Strikethrough"
          >
            <Strikethrough className="w-3 h-3" />
          </button>

          <button 
            type="button" 
            onMouseDown={(e) => { e.preventDefault(); runCommand('removeFormat'); }} 
            className="p-0.5 rounded hover:bg-white/10 cursor-pointer bg-[#181A20] dark:bg-white text-white dark:text-black text-slate-400 hover:text-white dark:hover:text-black" 
            title="Clear Formatting"
          >
            <RemoveFormatting className="w-3 h-3" />
          </button>
          <span className="text-white/25 dark:text-black/25 mx-0.5">|</span>

          {/* Alignment */}
          <button 
            type="button" 
            onMouseDown={(e) => { e.preventDefault(); runCommand('justifyLeft'); }} 
            className="p-0.5 rounded hover:bg-white/10 cursor-pointer bg-[#181A20] dark:bg-white text-white dark:text-black" 
            title="Align Left"
          >
            <AlignLeft className="w-3 h-3" />
          </button>

          <button 
            type="button" 
            onMouseDown={(e) => { e.preventDefault(); runCommand('justifyCenter'); }} 
            className="p-0.5 rounded hover:bg-white/10 cursor-pointer bg-[#181A20] dark:bg-white text-white dark:text-black" 
            title="Align Center"
          >
            <AlignCenter className="w-3 h-3" />
          </button>

          <button 
            type="button" 
            onMouseDown={(e) => { e.preventDefault(); runCommand('justifyRight'); }} 
            className="p-0.5 rounded hover:bg-white/10 cursor-pointer bg-[#181A20] dark:bg-white text-white dark:text-black" 
            title="Align Right"
          >
            <AlignRight className="w-3 h-3" />
          </button>

          {/* Text Color */}
          <label className="flex items-center gap-0.5 cursor-pointer p-0.5 rounded hover:bg-white/10 relative" title="Text Color">
            <Palette className="w-3 h-3 text-[#E60000]" />
            <input
              type="color"
              onChange={(e) => runCommand('foreColor', e.target.value)}
              className="w-3 h-3 rounded cursor-pointer opacity-0 absolute inset-0"
            />
          </label>

          <span className="text-white/25 dark:text-black/25 mx-0.5">|</span>

          {/* Image & Link */}
          <input
            type="file"
            ref={imageInputRef}
            accept="image/png, image/jpeg, image/jpg, image/svg+xml"
            onChange={handleImageUpload}
            className="hidden"
          />
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => imageInputRef.current?.click()}
            className="p-0.5 rounded hover:bg-white/10 text-blue-400 cursor-pointer"
            title="Upload Image"
          >
            <ImageIcon className="w-3 h-3" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              const url = prompt('Enter Destination URL:', '{{phishLink}}');
              if (url) runCommand('createLink', url);
            }}
            className="p-0.5 rounded hover:bg-white/10 text-emerald-400 cursor-pointer"
            title="Insert Link"
          >
            <LinkIcon className="w-3 h-3" />
          </button>

          {/* 🌟 Compact Width Add Component Dropdown (Decreased width to fit single line) */}
          <select
            onChange={(e) => {
              if (e.target.value) {
                insertComponent(e.target.value);
                e.target.value = '';
              }
            }}
            className="px-1 py-1 rounded bg-[#181A20] dark:bg-white text-white dark:text-black border-white/20 dark:border-black/20 text-[9px] font-bold border outline-none cursor-pointer w-[118px] max-w-[138px] truncate"
            defaultValue=""
            title="Insert Designed Component Block"
          >
            <option value="" disabled>+ Add component</option>
            <option value="primary-btn">Primary Button</option>
            <option value="secondary-btn">Corporate Button</option>
            <option value="warning-banner">Alert Banner</option>
            <option value="two-cols">2-Col Grid</option>
            <option value="divider">Divider</option>
          </select>

          {/* 🌟 Rich Editor "fx" Dropdown */}
          <div ref={editorFxRef} className="relative z-50">
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                saveSelection();
              }}
              onClick={() => setShowEditorFxMenu(!showEditorFxMenu)}
              className="px-1.5 py-0 rounded-2xl bg-white dark:bg-black hover:brightness-110 text-black dark:text-white font-mono-tech text-[9px] font-bold shadow-xs flex items-center gap-0.5 cursor-pointer"
              title="Insert Dynamic Placeholder"
            >
              <span>fx</span>
              <ChevronDown className="w-2.5 h-2.5" />
            </button>

            {showEditorFxMenu && (
              <div
                style={{ position: 'absolute', top: '100%', left: 0, zIndex: 9999 }}
                className="mt-1 w-52 max-h-48 overflow-y-auto rounded-xl bg-[#1A1C23] border border-white/20 p-1 shadow-2xl flex flex-col gap-0.5 text-left"
              >
                <span className="text-[7.5px] font-mono-tech uppercase text-slate-400 px-2 py-0.5 font-bold">
                  Dynamic Placeholders
                </span>
                {FX_PARAMETERS.map((fx) => (
                  <button
                    key={fx.label}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => insertFxToEditor(fx)}
                    className="p-1 px-2 rounded-lg hover:bg-white/10 text-left flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <span className="text-[9px] font-mono-tech font-bold text-[#FF8595]">
                      {fx.label}
                    </span>
                    <span className="text-[8px] text-slate-400 truncate max-w-[80px]">
                      {fx.desc}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right side: HTML Code Toggle & Expand */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={handleToggleCodeMode}
            className={`px-1.5 py-0.5 rounded border text-[8.5px] font-bold flex items-center gap-0.5 cursor-pointer ${
              rawHtmlMode ? 'bg-[#E60000] text-white border-[#E60000]' : 'bg-[#181A20] text-white border-white/20 hover:bg-white/10'
            }`}
            title="Toggle HTML Source Code"
          >
            <Code className="w-2.5 h-2.5" />
            {rawHtmlMode ? 'Visual' : 'HTML'}
          </button>

          <button
            type="button"
            onClick={() => setIsEditorExpanded(!isEditorExpanded)}
            className="hover:text-[#E60000] text-white dark:text-black cursor-pointer transition-colors p-0.5 rounded hover:bg-white/10"
            title={expanded ? 'Minimize Screen' : 'Expand Full Screen'}
          >
            {expanded ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Main Canvas Area: Clean bottom radius without outer edge bleed */}
      <div 
        className={`min-w-[480px] max-w-full flex-1 ml-1 p-2 mb-1 bg-white dark:bg-[#15161A] rounded-b-xl border-t border-slate-200 dark:border-white/10 overflow-hidden transition-all duration-200 ${
          isEditorExpanded 
            ? 'w-[1230px] min-w-[1230px] h-[500px] min-h-[400px] max-h-none resize-none' 
            : 'w-[648px] min-w-[400px] h-[180px] min-h-[180px] max-h-[125px] resize-x'
        }`}
        style={!isEditorExpanded ? { resize: 'horizontal' } : undefined}
      >
        <div className="w-full h-full overflow-y-auto">
          {rawHtmlMode ? (
            <textarea
              value={rawHtmlCode}
              onChange={(e) => {
                setRawHtmlCode(e.target.value);
                activeHtmlRef.current = e.target.value;
                persistChanges({ emailBody: e.target.value });
              }}
              className="w-full h-full p-2.5 font-mono-tech text-[10.5px] bg-[#0F172A] text-emerald-400 outline-none resize-none leading-relaxed rounded-lg"
              placeholder="Write email HTML code here..."
            />
          ) : (
            <div
              ref={editorCanvasRef}
              contentEditable
              suppressContentEditableWarning
              onKeyUp={saveSelection}
              onMouseUp={saveSelection}
              onSelect={saveSelection}
              onInput={() => {
                saveSelection();
                if (editorCanvasRef.current) {
                  activeHtmlRef.current = editorCanvasRef.current.innerHTML;
                  persistChanges({ emailBody: activeHtmlRef.current });
                }
              }}
              className="w-full h-full outline-none cursor-text text-slate-900 dark:text-slate-100 p-1 leading-normal text-xs"
            />
          )}
        </div>
      </div>
    </div>
  );

  export default RenderEditorWorkspace;