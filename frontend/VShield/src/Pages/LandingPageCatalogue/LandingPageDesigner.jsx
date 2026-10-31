import {
    ArrowLeft,
    Bold,
    Italic,
    Underline,
    Strikethrough,
    Subscript,
    Superscript,
    RemoveFormatting,
    AlignLeft,
    AlignCenter,
    AlignRight,
    AlignJustify,
    List,
    ListOrdered,
    Indent,
    Outdent,
    Image as ImageIcon,
    Link as LinkIcon,
    Code,
    Palette,
    Highlighter,
    Maximize2,
    Minimize2
} from 'lucide-react';

const LandingPageDesigner = ({
    isEditorExpanded,
    isDark,
    currentDisplayId,
    pageName,
    setPageName,
    pageDescription,
    setPageDescription,
    rawHtmlMode,
    rawHtmlCode,
    setRawHtmlCode,
    activeHtmlRef,
    editorCanvasRef,
    imageInputRef,
    handleImageUpload,
    runCommand,
    insertComponent,
    promptInsertLink,
    handleToggleCodeMode,
    handleToggleExpand,
    handleInitiateSave
}) => {
    return (
        <div
            className={`w-full flex-1 min-h-0 flex flex-col gap-2.5 overflow-hidden ${isEditorExpanded
                ? 'w-screen h-screen p-4 bg-slate-100 dark:bg-[#0c0d10] fixed inset-0'
                : ''
                }`}
            style={isEditorExpanded ? { zIndex: 2147483640 } : {}}
        >
            {/* ── 1. TOP BENTO ROW: REQUIRED DETAILS CARD (Hidden when expanded) ── */}
            {!isEditorExpanded && (
                <div
                    className={`w-full p-3 rounded-2xl border flex flex-col md:flex-row items-stretch gap-4 flex-shrink-0 shadow-2xs ${isDark
                        ? 'bg-[#1F2128] border-white/5'
                        : 'bg-[#ffffff] border-slate-200'
                        }`}
                >
                    {/* Isolated Solid Black Title Box */}
                    <div className="w-full md:w-[155px] p-3 rounded-xl bg-black text-white flex flex-col justify-between flex-shrink-0 shadow-xs">
                        <div>
                            <h3 className="text-[12.5px] font-voda-exb leading-tight tracking-tight uppercase">
                                Required
                                <br />
                                Details
                            </h3>
                        </div>

                        <p className="text-[8px] text-slate-300 font-medium leading-tight mt-2">
                            Fill in the required details to store a landing page and to use it
                            in future
                        </p>
                    </div>

                    {/* Middle Inputs: Landing Page ID & Landing Page Name */}
                    <div className="w-full md:w-[380px] flex flex-col justify-center gap-2.5 flex-shrink-0">
                        {/* Landing Page ID */}
                        <div className="flex items-center gap-2">
                            <label className="text-[11.5px] font-voda-exb text-slate-800 dark:text-slate-100 w-24 flex-shrink-0 leading-tight">
                                Landing
                                <br />
                                Page ID
                            </label>

                            <div
                                className={`flex-1 h-8 px-3.5 rounded-lg flex items-center text-[10.5px] font-mono-tech font-bold select-none ${isDark
                                    ? 'bg-[#15161A] text-slate-300'
                                    : 'bg-[#E9EEF4] text-slate-600'
                                    }`}
                            >
                                {currentDisplayId}
                            </div>
                        </div>

                        {/* Landing Page Name */}
                        <div className="flex items-center gap-2">
                            <label className="text-[11.5px] font-voda-exb text-slate-800 dark:text-slate-100 w-24 flex-shrink-0 leading-tight">
                                Landing
                                <br />
                                Page Name
                            </label>

                            <div
                                className={`flex-1 h-8 px-3.5 rounded-lg flex items-center ${isDark
                                    ? 'bg-[#15161A] text-white'
                                    : 'bg-[#E9EEF4] text-slate-900'
                                    }`}
                            >
                                <input
                                    type="text"
                                    value={pageName}
                                    onChange={(e) => setPageName(e.target.value)}
                                    placeholder="Type here"
                                    className="w-full bg-transparent text-[11px] font-medium outline-none placeholder-slate-400"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Right Input: Description */}
                    <div className="flex-1 flex flex-col justify-center gap-1 min-w-0">
                        <label className="text-[11.5px] font-voda-exb text-slate-800 dark:text-slate-100">
                            Description
                        </label>

                        <div
                            className={`w-full h-[52px] p-2.5 px-3.5 rounded-lg flex items-start ${isDark
                                ? 'bg-[#15161A] text-white'
                                : 'bg-[#E9EEF4] text-slate-900'
                                }`}
                        >
                            <textarea
                                rows={2}
                                value={pageDescription}
                                onChange={(e) => setPageDescription(e.target.value)}
                                placeholder="Type here"
                                className="w-full h-full bg-transparent text-[11px] font-medium outline-none resize-none placeholder-slate-400 leading-snug"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* ── 2. ULTIMATE ADVANCED CAPABILITIES CANVAS CONTAINER ── */}
            <div className="w-full flex-1 min-h-0 rounded-2xl bg-black dark:bg-[#1F2128] border border-black flex flex-col overflow-hidden shadow-sm">
                {/* Full Ribbon Toolbar */}
                <div className="w-full px-3 py-1.5 flex flex-wrap items-center justify-between gap-1 text-white flex-shrink-0 select-none bg-black dark:bg-[#1F2128] border-b border-white/10">
                    <div className="flex flex-wrap items-center gap-1 text-xs">
                        {/* Headings */}
                        <select
                            onChange={(e) => runCommand('formatBlock', e.target.value)}
                            className="px-2 py-0.5 rounded bg-[#181A20] text-[10px] font-bold text-white border border-white/20 outline-none cursor-pointer"
                            title="Block Format"
                        >
                            <option value="<p>">Paragraph</option>
                            <option value="<h1>">Heading 1</option>
                            <option value="<h2>">Heading 2</option>
                            <option value="<h3>">Heading 3</option>
                            <option value="<h4>">Heading 4</option>
                            <option value="<blockquote>">Quote Block</option>
                        </select>

                        {/* Font Family */}
                        <select
                            onChange={(e) => runCommand('fontName', e.target.value)}
                            className="px-2 py-0.5 rounded bg-[#181A20] text-[10px] font-bold text-white border border-white/20 outline-none cursor-pointer"
                            title="Font Family"
                        >
                            <option value="'Vodafone ExB', 'Montserrat', Arial, sans-serif">
                                Vodafone ExB
                            </option>
                            <option value="'Segoe UI', Arial, sans-serif">
                                Segoe UI
                            </option>
                            <option value="'Inter', sans-serif">
                                Inter
                            </option>
                            <option value="'Montserrat', sans-serif">
                                Montserrat
                            </option>
                            <option value="'JetBrains Mono', monospace">
                                Mono Tech
                            </option>
                        </select>

                        {/* Font Size */}
                        <select
                            onChange={(e) => runCommand('fontSize', e.target.value)}
                            className="px-1.5 py-0.5 rounded bg-[#181A20] text-[10px] font-bold text-white border border-white/20 outline-none cursor-pointer"
                            title="Font Size"
                        >
                            <option value="3">Size 14px</option>
                            <option value="1">Size 11px</option>
                            <option value="2">Size 12px</option>
                            <option value="4">Size 18px</option>
                            <option value="5">Size 24px</option>
                            <option value="6">Size 32px</option>
                            <option value="7">Size 42px</option>
                        </select>

                        <span className="text-white/25 mx-0.5">|</span>

                        {/* Formatting Buttons */}
                        <button
                            type="button"
                            onClick={() => runCommand('bold')}
                            className="p-1 rounded hover:bg-white/10 font-black cursor-pointer text-white"
                            title="Bold"
                        >
                            <Bold className="w-3.5 h-3.5 stroke-[2.5]" />
                        </button>

                        <button
                            type="button"
                            onClick={() => runCommand('italic')}
                            className="p-1 rounded hover:bg-white/10 italic cursor-pointer text-white"
                            title="Italic"
                        >
                            <Italic className="w-3.5 h-3.5 stroke-[2.5]" />
                        </button>

                        <button
                            type="button"
                            onClick={() => runCommand('underline')}
                            className="p-1 rounded hover:bg-white/10 underline cursor-pointer text-white"
                            title="Underline"
                        >
                            <Underline className="w-3.5 h-3.5 stroke-[2.5]" />
                        </button>

                        <button
                            type="button"
                            onClick={() => runCommand('strikeThrough')}
                            className="p-1 rounded hover:bg-white/10 line-through cursor-pointer text-white"
                            title="Strikethrough"
                        >
                            <Strikethrough className="w-3.5 h-3.5" />
                        </button>

                        <button
                            type="button"
                            onClick={() => runCommand('subscript')}
                            className="p-1 rounded hover:bg-white/10 cursor-pointer text-white"
                            title="Subscript"
                        >
                            <Subscript className="w-3.5 h-3.5" />
                        </button>

                        <button
                            type="button"
                            onClick={() => runCommand('superscript')}
                            className="p-1 rounded hover:bg-white/10 cursor-pointer text-white"
                            title="Superscript"
                        >
                            <Superscript className="w-3.5 h-3.5" />
                        </button>

                        <button
                            type="button"
                            onClick={() => runCommand('removeFormat')}
                            className="p-1 rounded hover:bg-white/10 cursor-pointer text-slate-400 hover:text-white"
                            title="Clear Formatting"
                        >
                            <RemoveFormatting className="w-3.5 h-3.5" />
                        </button>

                        <span className="text-white/25 mx-0.5">|</span>

                        {/* Alignments */}
                        <button
                            type="button"
                            onClick={() => runCommand('justifyLeft')}
                            className="p-1 rounded hover:bg-white/10 cursor-pointer text-white"
                            title="Align Left"
                        >
                            <AlignLeft className="w-3.5 h-3.5" />
                        </button>

                        <button
                            type="button"
                            onClick={() => runCommand('justifyCenter')}
                            className="p-1 rounded hover:bg-white/10 cursor-pointer text-white"
                            title="Align Center"
                        >
                            <AlignCenter className="w-3.5 h-3.5" />
                        </button>

                        <button
                            type="button"
                            onClick={() => runCommand('justifyRight')}
                            className="p-1 rounded hover:bg-white/10 cursor-pointer text-white"
                            title="Align Right"
                        >
                            <AlignRight className="w-3.5 h-3.5" />
                        </button>

                        <button
                            type="button"
                            onClick={() => runCommand('justifyFull')}
                            className="p-1 rounded hover:bg-white/10 cursor-pointer text-white"
                            title="Justify"
                        >
                            <AlignJustify className="w-3.5 h-3.5" />
                        </button>

                        <span className="text-white/25 mx-0.5">|</span>

                        {/* Lists & Indentation */}
                        <button
                            type="button"
                            onClick={() => runCommand('insertUnorderedList')}
                            className="p-1 rounded hover:bg-white/10 cursor-pointer text-white"
                            title="Bullet List"
                        >
                            <List className="w-3.5 h-3.5" />
                        </button>

                        <button
                            type="button"
                            onClick={() => runCommand('insertOrderedList')}
                            className="p-1 rounded hover:bg-white/10 cursor-pointer text-white"
                            title="Numbered List"
                        >
                            <ListOrdered className="w-3.5 h-3.5" />
                        </button>

                        <button
                            type="button"
                            onClick={() => runCommand('indent')}
                            className="p-1 rounded hover:bg-white/10 cursor-pointer text-white"
                            title="Increase Indent"
                        >
                            <Indent className="w-3.5 h-3.5" />
                        </button>

                        <button
                            type="button"
                            onClick={() => runCommand('outdent')}
                            className="p-1 rounded hover:bg-white/10 cursor-pointer text-white"
                            title="Decrease Indent"
                        >
                            <Outdent className="w-3.5 h-3.5" />
                        </button>

                        <span className="text-white/25 mx-0.5">|</span>

                        {/* Color Pickers */}
                        <label
                            className="flex items-center gap-1 cursor-pointer p-1 rounded hover:bg-white/10 text-[10px] font-bold text-white"
                            title="Text Color"
                        >
                            <Palette className="w-3.5 h-3.5 text-[#E60000]" />

                            <input
                                type="color"
                                onChange={(e) => runCommand('foreColor', e.target.value)}
                                className="w-4 h-4 rounded cursor-pointer opacity-0 absolute pointer-events-auto"
                            />

                            <span>Text</span>
                        </label>

                        <label
                            className="flex items-center gap-1 cursor-pointer p-1 rounded hover:bg-white/10 text-[10px] font-bold text-white"
                            title="Highlight / Fill Color"
                        >
                            <Highlighter className="w-3.5 h-3.5 text-amber-400" />

                            <input
                                type="color"
                                defaultValue="#FFF1F2"
                                onChange={(e) => runCommand('hiliteColor', e.target.value)}
                                className="w-4 h-4 rounded cursor-pointer opacity-0 absolute pointer-events-auto"
                            />

                            <span>Highlight</span>
                        </label>

                        <span className="text-white/25 mx-0.5">|</span>

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
                            onClick={() => imageInputRef.current?.click()}
                            className="px-2 py-0.5 rounded bg-[#181A20] hover:bg-white/20 border border-white/20 text-[10px] font-bold text-white flex items-center gap-1 cursor-pointer"
                            title="Upload & Embed Local Image"
                        >
                            <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
                            Image
                        </button>

                        <button
                            type="button"
                            onClick={promptInsertLink}
                            className="px-2 py-0.5 rounded bg-[#181A20] hover:bg-white/20 border border-white/20 text-[10px] font-bold text-white flex items-center gap-1 cursor-pointer"
                            title="Insert Link"
                        >
                            <LinkIcon className="w-3.5 h-3.5 text-emerald-400" />
                            Link
                        </button>

                        <span className="text-white/25 mx-0.5">|</span>

                        {/* Components Menu */}
                        <select
                            onChange={(e) => {
                                if (e.target.value) {
                                    insertComponent(e.target.value);
                                    e.target.value = '';
                                }
                            }}
                            className="px-2 py-0.5 rounded bg-[#181A20] text-[10px] font-bold text-white border border-white/20 outline-none cursor-pointer"
                            defaultValue=""
                            title="Insert Designed Elements"
                        >
                            <option value="" disabled>
                                + Add Component
                            </option>

                            <option value="primary-btn">
                                Primary Action Button (Red)
                            </option>

                            <option value="secondary-btn">
                                Corporate Button (Blue)
                            </option>

                            <option value="warning-banner">
                                Alert Warning Banner
                            </option>

                            <option value="two-cols">
                                2-Column Layout Grid
                            </option>

                            <option value="divider">
                                Horizontal Divider
                            </option>
                        </select>
                    </div>

                    {/* Right: Code Toggle & Expand */}
                    <div className="flex items-center gap-1.5 ml-auto">
                        <button
                            type="button"
                            onClick={handleToggleCodeMode}
                            className={`px-2 py-0.5 rounded border text-[10px] font-bold flex items-center gap-1 cursor-pointer ${rawHtmlMode
                                ? 'bg-[#E60000] text-white border-[#E60000]'
                                : 'bg-[#181A20] text-white border-white/20 hover:bg-white/10'
                                }`}
                            title="Toggle Raw HTML Source Code"
                        >
                            <Code className="w-3 h-3" />

                            {rawHtmlMode ? 'Visual Mode' : 'HTML Code'}
                        </button>

                        <button
                            type="button"
                            onClick={handleToggleExpand}
                            className="hover:text-[#E60000] cursor-pointer transition-colors p-1 rounded hover:bg-white/10"
                            title={
                                isEditorExpanded
                                    ? 'Minimize Screen'
                                    : 'Expand Full Screen'
                            }
                        >
                            {isEditorExpanded ? (
                                <Minimize2 className="w-3.5 h-3.5 stroke-[2.5]" />
                            ) : (
                                <Maximize2 className="w-3.5 h-3.5 stroke-[2.5]" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Main White Bordered Canvas Area */}
                <div className="flex-1 min-h-0 mx-2.5 mb-2.5 rounded-xl border border-white/20 overflow-hidden bg-white flex flex-col shadow-inner">
                    {rawHtmlMode ? (
                        <textarea
                            value={rawHtmlCode}
                            onChange={(e) => {
                                setRawHtmlCode(e.target.value);
                                activeHtmlRef.current = e.target.value;
                            }}
                            className="w-full h-full p-4 rounded-xl font-mono-tech text-xs bg-[#0F172A] text-emerald-400 outline-none resize-none leading-relaxed"
                            placeholder="Enter custom HTML code here..."
                        />
                    ) : (
                        <div
                            ref={editorCanvasRef}
                            contentEditable
                            suppressContentEditableWarning
                            onInput={() => {
                                if (editorCanvasRef.current) {
                                    activeHtmlRef.current =
                                        editorCanvasRef.current.innerHTML;
                                }
                            }}
                            className="w-full h-full overflow-y-auto outline-none cursor-text shadow-sm [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-black/20"
                            style={{
                                minHeight: isEditorExpanded
                                    ? 'calc(100vh - 120px)'
                                    : '360px'
                            }}
                        />
                    )}
                </div>
            </div>

            {/* ── 3. BOTTOM BUTTONS (With BACK button to the left of SAVE when expanded) ── */}
            <div className="flex items-center justify-center gap-3 pt-0.5 flex-shrink-0">
                {isEditorExpanded && (
                    <button
                        type="button"
                        onClick={handleToggleExpand}
                        className="px-6 py-1.5 rounded-md bg-slate-700 hover:bg-slate-800 text-white font-voda-exb text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer flex items-center gap-1.5 hover:scale-105 active:scale-95"
                    >
                        <ArrowLeft className="w-3.5 h-3.5 stroke-[2.5]" />
                        Back
                    </button>
                )}

                <button
                    type="button"
                    onClick={handleInitiateSave}
                    className="px-10 py-1.5 rounded-md bg-[#84cc16] hover:bg-[#65a30d] text-white font-voda-exb text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer hover:scale-105 active:scale-95"
                >
                    SAVE
                </button>
            </div>
        </div>
    );
};

export default LandingPageDesigner;