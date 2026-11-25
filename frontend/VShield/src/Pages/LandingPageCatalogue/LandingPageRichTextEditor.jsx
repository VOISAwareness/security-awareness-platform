import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlignCenter,
  AlignHorizontalJustifyCenter,
  AlignLeft,
  AlignRight,
  AlignVerticalJustifyCenter,
  Bold,
  BringToFront,
  Check,
  ChevronDown,
  Code,
  Copy,
  Eraser,
  Eye,
  FileText,
  Grid,
  GripVertical,
  Group,
  Image as ImageIcon,
  Italic,
  Layers,
  Link as LinkIcon,
  Maximize2,
  Menu,
  Minimize2,
  MousePointerClick,
  Move,
  Pencil,
  Pipette,
  RemoveFormatting,
  RotateCcw,
  RotateCw,
  SendToBack,
  Settings,
  Shapes,
  ShieldAlert,
  Square,
  Strikethrough,
  Trash2,
  Type,
  Underline,
  Ungroup,
  X,
} from "lucide-react";
import { createPortal } from "react-dom";
import HtmlCodeEditor from "../../GlobalComponents/HtmlCodeEditor";
import LandingPageCatalogues from "./LandingPageCatalogues.json";
import Toast from "../../GlobalComponents/Toast";
import { APP_URL } from "../../appConfig";
import {
  MAX_LANDING_BYTES,
  exportLandingHtml,
  isScriptUrl,
  isTrainingHref,
  prepareForEditor,
  sanitizeLandingHtml,
  splitCanvasBg,
  wrapCanvasBg,
} from "../../services/landingHtml";

// =========================================================================
// 🎛️ SCALE, ROUTE & BROWSER SAFE ZONE CONTROL VARIABLES
// =========================================================================
const VarEditorOuterFrameThickness = 4; // Thickness of outer frame in pixels
const PX_PER_CM = 37.7952755906; // 96 DPI standard conversion
const GRID_SIZE_PX = 20;

// Fixed max width of the canvas designer (scrolls horizontally when viewport is smaller)
const VarCanvasFixedWidthPx = 1280;

// Fine-tune Browser Safe Zone bottom line in pixels (+ moves Down, - moves Up)
const VarBrowserSafeZoneBottomAdjuster = 0;

// Standard usable browser viewport height (tabs bar + search bar + taskbar adjusted)
const SAFE_ZONE_HEIGHT_PX = 580 + VarBrowserSafeZoneBottomAdjuster;

// Route to frontend\VShield\src\Pages\MyTraining\MyTraining.jsx
const MY_TRAINING_ROUTE = "/my-training";

const MAX_HISTORY_STEPS = 60;
// Keystrokes this close together are one undo step, so undo goes back a
// word or phrase at a time instead of one character.
const TYPING_HISTORY_MERGE_MS = 1000;

// Largest image that can be embedded and still leave the page under the
// saved-page limit (embedded images grow by about a third as base64).
const MAX_EMBEDDED_IMAGE_BYTES = 200 * 1024;

// Unique element ids for inserted items (Date.now alone repeats within a millisecond).
let canvasIdSequence = 0;
const newCanvasId = (prefix) => {
  canvasIdSequence += 1;
  return prefix + "-" + Date.now().toString(36) + "-" + canvasIdSequence;
};

// Saved HTML on its way into the editor: script stripped and the editor-only
// bits that saving parked away put back (see services/landingHtml.js).
const loadIntoEditor = (html) => prepareForEditor(html || "");

const CANVAS_SCROLL_CSS = [
  ".vshield-canvas-scroll { scrollbar-width: thin; scrollbar-color: #cbd5e1 transparent; }",
  ".dark .vshield-canvas-scroll { scrollbar-color: #475569 transparent; }",
  ".vshield-canvas-scroll::-webkit-scrollbar { width: 6px; height: 6px; }",
  ".vshield-canvas-scroll::-webkit-scrollbar-track { background: transparent; }",
  ".vshield-canvas-scroll::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 9999px; }",
  ".vshield-canvas-scroll::-webkit-scrollbar-thumb:hover { background-color: #94a3b8; }",
  ".dark .vshield-canvas-scroll::-webkit-scrollbar-thumb { background-color: #475569; }",
  ".dark .vshield-canvas-scroll::-webkit-scrollbar-thumb:hover { background-color: #64748b; }",
].join("\n");

const FX_PARAMETERS = [
  { label: "@UserName", code: "{{userName}}", desc: "Target user full name" },
  {
    label: "@UserEmailID",
    code: "{{email}}",
    desc: "Target user email address",
  },
  {
    label: "@UserDepartment",
    code: "{{department}}",
    desc: "Target user department",
  },
  {
    label: "@UserCountry",
    code: "{{country}}",
    desc: "Target user work location",
  },
  {
    label: "@ManagerName",
    code: "{{managerName}}",
    desc: "Target direct reporting manager",
  },
  {
    label: "@EmployeeID",
    code: "{{employeeId}}",
    desc: "Corporate employee badge number",
  },
  {
    label: "@CurrentDate",
    code: "{{currentDate}}",
    desc: "Simulation execution timestamp",
  },
];

const PRESET_COLORS = [
  "#E60000",
  "#000000",
  "#FFFFFF",
  "#2563EB",
  "#16A34A",
  "#D97706",
  "#9333EA",
  "#475569",
  "#F1F5F9",
  "#FEF2F2",
];

const SHADOW_PRESETS = [
  { label: "None", value: "none" },
  { label: "Soft", value: "0 2px 8px rgba(0, 0, 0, 0.12)" },
  { label: "Medium", value: "0 4px 16px rgba(0, 0, 0, 0.2)" },
  { label: "Deep", value: "0 10px 25px -5px rgba(0, 0, 0, 0.35)" },
  { label: "Glow Red", value: "0 0 16px rgba(230, 0, 0, 0.45)" },
];

const ROUNDED_PRESETS = [
  { label: "0px", value: "0px" },
  { label: "4px", value: "4px" },
  { label: "8px", value: "8px" },
  { label: "12px", value: "12px" },
  { label: "20px", value: "20px" },
  { label: "Pill", value: "9999px" },
];

const BORDER_WIDTHS = ["0px", "1px", "2px", "3px", "4px"];
const BORDER_STYLES = ["solid", "dashed", "dotted", "none"];

const SHAPE_PRESETS = [
  { id: "rect", label: "Rectangle" },
  { id: "rounded", label: "Rounded Box" },
  { id: "circle", label: "Circle" },
  { id: "ellipse", label: "Pill / Badge" },
  { id: "divider", label: "Divider Line" },
  { id: "card", label: "Notice Card" },
];

const BUTTON_PRESETS = [
  { id: "pill", label: "Pill Shape" },
  { id: "rounded", label: "Rounded Corners" },
  { id: "sharp", label: "Sharp Rectangle" },
  { id: "soft", label: "Soft Tile" },
];

// =========================================================================
// 🌟 LANDING PAGE ("OOPS YOU'VE BEEN PHISHED") ELEMENTS
// =========================================================================
const LANDING_PAGE_ELEMENTS = [
  {
    id: "oops-hero",
    label: "Oops! Phished Alert Banner",
    desc: "Bold red simulation alert header announcing a phishing test",
  },
  {
    id: "red-flags-box",
    label: "Red Flags Checklist Box",
    desc: "Highlighted breakdown of phishing indicators to spot next time",
  },
  {
    id: "what-happened",
    label: "What Happened & Next Steps",
    desc: "Two-column explanation of the simulation and follow-up actions",
  },
  {
    id: "training-cta",
    label: "Mandatory Training CTA Card",
    desc: "Call-to-action card with button linked directly to My Training",
  },
  {
    id: "simulation-footer",
    label: "Authorized Simulation Footer",
    desc: "InfoSec transparency disclaimer and reassurance notice",
  },
];

// =========================================================================
// 🌟 10 FULL-SCREEN LANDING PAGE TEMPLATES (RESPONSIVE & BROWSER FITTED)
//    3 VOIS | 2 Vodafone (1 Dark, 1 Scarlet Red) | 2 VOISShield | 3 Normal
// =========================================================================
const LANDING_PAGE_FALLBACK_TEMPLATES = [
  // ── 1. VOIS THEMED #1 ──
  {
    id: "lp-vois-1",
    category: "VOIS",
    name: "VOIS Global Cyber Defense — Full-Screen Phishing Intercept",
    html:
      '<div style="width:100%;min-height:560px;margin:0;padding:0;background:#F8FAFC;font-family:\'Segoe UI\',Arial,sans-serif;box-sizing:border-box;display:flex;flex-direction:column;">' +
      '<div class="vshield-canvas-item" data-type="element" data-item-name="VOIS Top Bar" style="position:relative;width:100%;background:#0F172A;border-bottom:3px solid #E60000;padding:12px 36px;display:flex;align-items:center;justify-content:space-between;box-sizing:border-box;cursor:move;">' +
      '<div style="display:flex;align-items:center;gap:12px;"><span contenteditable="true" style="font-size:18px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">_VOIS</span><span style="color:#475569;">|</span><span contenteditable="true" style="font-size:11px;font-weight:700;color:#CBD5E1;text-transform:uppercase;letter-spacing:1px;">Global Cyber Defense</span></div>' +
      '<span contenteditable="true" style="background:rgba(230,0,0,0.2);border:1px solid #E60000;color:#FCA5A5;font-size:10px;font-weight:800;padding:4px 12px;border-radius:9999px;text-transform:uppercase;">Authorized Phishing Simulation</span>' +
      "</div>" +
      '<div class="vshield-canvas-item" data-type="element" data-item-name="VOIS Hero Banner" style="position:relative;width:100%;background:linear-gradient(135deg,#0F172A 0%,#1E293B 58%,#991B1B 100%);padding:30px 36px;text-align:center;color:#ffffff;box-sizing:border-box;cursor:move;">' +
      '<div style="max-width:960px;margin:0 auto;">' +
      '<h1 contenteditable="true" style="margin:0 0 8px 0;font-size:28px;font-weight:900;color:#ffffff;outline:none;">🎣 Oops! You Just Clicked a Simulated Phish</h1>' +
      '<p contenteditable="true" style="margin:0 auto;max-width:680px;font-size:13.5px;color:#E2E8F0;line-height:1.5;outline:none;">Take a breath, <strong>{{userName}}</strong> — your workstation and _VOIS credentials are completely safe. This simulation was run by _VOIS Global Information Security.</p>' +
      "</div></div>" +
      '<div class="vshield-canvas-item" data-type="element" data-item-name="VOIS Metrics Band" style="position:relative;width:100%;background:#ffffff;border-bottom:1px solid #E2E8F0;padding:16px 36px;box-sizing:border-box;cursor:move;">' +
      '<div style="max-width:1040px;margin:0 auto;display:flex;gap:16px;flex-wrap:wrap;justify-content:center;">' +
      '<div style="flex:1;min-width:190px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:12px;text-align:center;"><div style="font-size:22px;font-weight:900;color:#E60000;" contenteditable="true">91%</div><div style="font-size:11px;color:#475569;font-weight:600;margin-top:2px;" contenteditable="true">of cyber breaches begin with phishing</div></div>' +
      '<div style="flex:1;min-width:190px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:12px;text-align:center;"><div style="font-size:22px;font-weight:900;color:#0F172A;" contenteditable="true">3 Minutes</div><div style="font-size:11px;color:#475569;font-weight:600;margin-top:2px;" contenteditable="true">Quick awareness refresher assigned</div></div>' +
      '<div style="flex:1;min-width:190px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:12px;text-align:center;"><div style="font-size:22px;font-weight:900;color:#16A34A;" contenteditable="true">Zero Risk</div><div style="font-size:11px;color:#475569;font-weight:600;margin-top:2px;" contenteditable="true">No passwords or data were captured</div></div>' +
      "</div></div>" +
      '<div class="vshield-canvas-item" data-type="element" data-item-name="VOIS Red Flags Section" style="position:relative;width:100%;padding:22px 36px;box-sizing:border-box;flex:1;cursor:move;">' +
      '<div style="max-width:1040px;margin:0 auto;display:flex;gap:20px;flex-wrap:wrap;">' +
      '<div style="flex:1.2;min-width:280px;background:#FFF1F2;border-left:5px solid #E60000;border-radius:10px;padding:18px 22px;">' +
      '<h3 contenteditable="true" style="margin:0 0 8px 0;font-size:15px;font-weight:900;color:#9F1239;">🚩 Key Red Flags to Spot Next Time</h3>' +
      '<p contenteditable="true" style="margin:0 0 6px 0;font-size:12px;color:#881337;line-height:1.5;"><strong>1. Sender Verification:</strong> Confirm the sender domain belongs to an official _VOIS or Vodafone address.</p>' +
      '<p contenteditable="true" style="margin:0 0 6px 0;font-size:12px;color:#881337;line-height:1.5;"><strong>2. Artificial Urgency:</strong> Attackers pressure you with short deadlines to bypass inspection.</p>' +
      '<p contenteditable="true" style="margin:0;font-size:12px;color:#881337;line-height:1.5;"><strong>3. Hover Before Clicking:</strong> Always preview link destinations before entering credentials.</p>' +
      "</div>" +
      '<div style="flex:1;min-width:260px;background:#ffffff;border:1px solid #E2E8F0;border-radius:10px;padding:18px 22px;display:flex;flex-direction:column;justify-content:space-between;">' +
      '<div><h3 contenteditable="true" style="margin:0 0 8px 0;font-size:15px;font-weight:900;color:#0F172A;">Your Next Step</h3><p contenteditable="true" style="margin:0 0 14px 0;font-size:12px;color:#475569;line-height:1.5;">Complete your short interactive module in <strong>My Training</strong> to learn how to spot and report phishing lures in Outlook.</p></div>' +
      '<div class="vshield-canvas-item vshield-custom-btn" data-type="button" data-item-name="VOIS Training CTA" data-action="training" data-url="' +
      MY_TRAINING_ROUTE +
      '" style="position:relative;display:inline-block;cursor:move;"><a href="' +
      MY_TRAINING_ROUTE +
      '" target="_top" onclick="return false;" style="display:inline-block;background-color:#E60000;color:#ffffff;text-decoration:none;padding:11px 28px;border-radius:8px;font-weight:800;font-size:13px;cursor:pointer;" contenteditable="true">Go to My Training →</a></div>' +
      "</div></div></div>" +
      '<div class="vshield-canvas-item" data-type="element" data-item-name="VOIS Footer" style="position:relative;width:100%;background:#0F172A;color:#94A3B8;padding:12px 36px;text-align:center;font-size:11px;box-sizing:border-box;cursor:move;"><p contenteditable="true" style="margin:0;">© 2026 _VOIS Global Information Security • Authorized Phishing Awareness Simulation • Report suspicious emails via Outlook</p></div>' +
      "</div>",
  },

  // ── 2. VOIS THEMED #2 ──
  {
    id: "lp-vois-2",
    category: "VOIS",
    name: "VOIS Digital Workplace — Full-Screen Security Drill Portal",
    html:
      '<div style="width:100%;min-height:560px;margin:0;padding:0;background:#ffffff;font-family:\'Segoe UI\',Arial,sans-serif;box-sizing:border-box;display:flex;flex-direction:column;">' +
      '<div class="vshield-canvas-item" data-type="element" data-item-name="VOIS Workplace Header" style="position:relative;width:100%;background:#ffffff;border-bottom:2px solid #E60000;padding:14px 40px;display:flex;align-items:center;justify-content:space-between;box-sizing:border-box;cursor:move;">' +
      '<div><span contenteditable="true" style="font-size:20px;font-weight:900;color:#0F172A;">_VOIS</span><span contenteditable="true" style="font-size:12px;font-weight:700;color:#64748B;margin-left:10px;">Digital Workplace Security Portal</span></div>' +
      '<span contenteditable="true" style="background:#FEE2E2;color:#B91C1C;font-size:10px;font-weight:800;padding:5px 12px;border-radius:6px;text-transform:uppercase;">Simulation Intercepted</span>' +
      "</div>" +
      '<div class="vshield-canvas-item" data-type="element" data-item-name="Workplace Split Hero" style="position:relative;width:100%;background:#F8FAFC;border-bottom:1px solid #E2E8F0;padding:30px 40px;box-sizing:border-box;cursor:move;">' +
      '<div style="max-width:1060px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:28px;flex-wrap:wrap;">' +
      '<div style="flex:1.4;min-width:280px;"><span contenteditable="true" style="display:inline-block;background:#E60000;color:#ffffff;font-size:10px;font-weight:800;padding:3px 10px;border-radius:9999px;text-transform:uppercase;margin-bottom:8px;">SECURITY AWARENESS CHECKPOINT</span><h1 contenteditable="true" style="margin:0 0 8px 0;font-size:28px;font-weight:900;color:#0F172A;line-height:1.2;">Wait a Second — That Link Was a Phishing Drill!</h1><p contenteditable="true" style="margin:0;font-size:13.5px;color:#475569;line-height:1.6;">In a real attack, clicking an unverified link could install malware or expose _VOIS client environments. Review our 3-step workplace defense routine below.</p></div>' +
      '<div style="flex:0.7;min-width:210px;background:#ffffff;border:1px solid #E2E8F0;border-radius:12px;padding:18px;text-align:center;box-shadow:0 6px 18px rgba(15,23,42,0.05);"><div style="font-size:32px;margin-bottom:4px;">🛡️</div><div contenteditable="true" style="font-size:14px;font-weight:800;color:#0F172A;">Your Account Is Safe</div><p contenteditable="true" style="margin:4px 0 0 0;font-size:11.5px;color:#64748B;">No data was collected during this simulation.</p></div>' +
      "</div></div>" +
      '<div class="vshield-canvas-item" data-type="element" data-item-name="3-Step Workplace Defense" style="position:relative;width:100%;padding:26px 40px;box-sizing:border-box;flex:1;cursor:move;">' +
      '<div style="max-width:1060px;margin:0 auto;display:flex;gap:18px;flex-wrap:wrap;">' +
      '<div style="flex:1;min-width:220px;background:#ffffff;border:1px solid #E2E8F0;border-top:4px solid #E60000;border-radius:10px;padding:18px;"><div style="font-size:20px;margin-bottom:6px;">🔍</div><h3 contenteditable="true" style="margin:0 0 6px 0;font-size:14.5px;font-weight:800;color:#0F172A;">1. Inspect the Sender</h3><p contenteditable="true" style="margin:0;font-size:12px;color:#64748B;line-height:1.5;">Check for subtle typosquatting, external sender cautions, or mismatched reply-to addresses.</p></div>' +
      '<div style="flex:1;min-width:220px;background:#ffffff;border:1px solid #E2E8F0;border-top:4px solid #2563EB;border-radius:10px;padding:18px;"><div style="font-size:20px;margin-bottom:6px;">⏸️</div><h3 contenteditable="true" style="margin:0 0 6px 0;font-size:14.5px;font-weight:800;color:#0F172A;">2. Pause on Urgency</h3><p contenteditable="true" style="margin:0;font-size:12px;color:#64748B;line-height:1.5;">Verify urgent HR, IT, or Payroll requests directly via Microsoft Teams or official bookmarks.</p></div>' +
      '<div style="flex:1;min-width:220px;background:#ffffff;border:1px solid #E2E8F0;border-top:4px solid #16A34A;border-radius:10px;padding:18px;"><div style="font-size:20px;margin-bottom:6px;">📢</div><h3 contenteditable="true" style="margin:0 0 6px 0;font-size:14.5px;font-weight:800;color:#0F172A;">3. Report Immediately</h3><p contenteditable="true" style="margin:0;font-size:12px;color:#64748B;line-height:1.5;">Click the Outlook Report Phishing button so Security Operations can protect all _VOIS colleagues.</p></div>' +
      "</div></div>" +
      '<div class="vshield-canvas-item" data-type="element" data-item-name="Workplace Dark CTA Band" style="position:relative;width:100%;background:#0F172A;padding:22px 40px;box-sizing:border-box;cursor:move;">' +
      '<div style="max-width:1060px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:18px;flex-wrap:wrap;">' +
      '<div><h3 contenteditable="true" style="margin:0 0 4px 0;font-size:17px;font-weight:900;color:#ffffff;">Complete Your 3-Minute Micro-Learning</h3><p contenteditable="true" style="margin:0;font-size:12.5px;color:#CBD5E1;">Your assigned awareness module is ready on the My Training page.</p></div>' +
      '<div class="vshield-canvas-item vshield-custom-btn" data-type="button" data-item-name="Open My Training Button" data-action="training" data-url="' +
      MY_TRAINING_ROUTE +
      '" style="display:inline-block;cursor:move;"><a href="' +
      MY_TRAINING_ROUTE +
      '" target="_top" onclick="return false;" style="display:inline-block;background-color:#E60000;color:#ffffff;text-decoration:none;padding:11px 28px;border-radius:8px;font-weight:800;font-size:13px;cursor:pointer;" contenteditable="true">Open My Training →</a></div>' +
      "</div></div>" +
      "</div>",
  },

  // ── 3. VOIS THEMED #3 ──
  {
    id: "lp-vois-3",
    category: "VOIS",
    name: "VOIS Threat Defense — Full-Screen Social Engineering Briefing",
    html:
      '<div style="width:100%;min-height:560px;margin:0;padding:0;background:#FAF5FF;font-family:\'Segoe UI\',Arial,sans-serif;box-sizing:border-box;display:flex;flex-direction:column;">' +
      '<div class="vshield-canvas-item" data-type="element" data-item-name="VOIS Magenta Hero" style="position:relative;width:100%;background:linear-gradient(120deg,#3B0764 0%,#990099 55%,#E60000 100%);padding:34px 36px;text-align:center;color:#ffffff;box-sizing:border-box;cursor:move;">' +
      '<div style="max-width:920px;margin:0 auto;">' +
      '<span contenteditable="true" style="display:inline-block;background:rgba(255,255,255,0.18);padding:4px 12px;border-radius:9999px;font-size:10px;font-weight:800;letter-spacing:1px;text-transform:uppercase;margin-bottom:10px;">_VOIS THREAT DEFENSE BRIEFING</span>' +
      '<h1 contenteditable="true" style="margin:0 0 8px 0;font-size:28px;font-weight:900;color:#ffffff;outline:none;">_VOIS Phishing Simulation Caught You!</h1>' +
      '<p contenteditable="true" style="margin:0 auto;max-width:680px;font-size:13.5px;color:#F3E8FF;line-height:1.5;">Every simulation click is a safe opportunity to sharpen your instincts. Here is how social engineering lures trick busy professionals.</p>' +
      "</div></div>" +
      '<div class="vshield-canvas-item" data-type="element" data-item-name="Social Engineering Anatomy Grid" style="position:relative;width:100%;padding:26px 36px;box-sizing:border-box;flex:1;cursor:move;">' +
      '<div style="max-width:1060px;margin:0 auto;">' +
      '<div style="display:flex;gap:18px;flex-wrap:wrap;margin-bottom:20px;">' +
      '<div style="flex:1;min-width:230px;background:#ffffff;border:1px solid #E9D5FF;border-radius:12px;padding:18px;"><div style="font-size:20px;margin-bottom:6px;">🎭</div><h3 contenteditable="true" style="margin:0 0 6px 0;font-size:14.5px;font-weight:800;color:#581C87;">Authority Impersonation</h3><p contenteditable="true" style="margin:0;font-size:12px;color:#475569;line-height:1.5;">Attackers pose as IT Helpdesk, HR Benefits, or Leadership to lower your guard.</p></div>' +
      '<div style="flex:1;min-width:230px;background:#ffffff;border:1px solid #E9D5FF;border-radius:12px;padding:18px;"><div style="font-size:20px;margin-bottom:6px;">⏳</div><h3 contenteditable="true" style="margin:0 0 6px 0;font-size:14.5px;font-weight:800;color:#581C87;">Fear &amp; Scarcity</h3><p contenteditable="true" style="margin:0;font-size:12px;color:#475569;line-height:1.5;">Threats of account lockout or overdue compliance push you to click without checking.</p></div>' +
      '<div style="flex:1;min-width:230px;background:#ffffff;border:1px solid #E9D5FF;border-radius:12px;padding:18px;"><div style="font-size:20px;margin-bottom:6px;">🔗</div><h3 contenteditable="true" style="margin:0 0 6px 0;font-size:14.5px;font-weight:800;color:#581C87;">Cloned Login Portals</h3><p contenteditable="true" style="margin:0;font-size:12px;color:#475569;line-height:1.5;">Links route to lookalike SSO pages designed to steal corporate passwords.</p></div>' +
      "</div>" +
      '<div style="background:#ffffff;border:1px solid #E9D5FF;border-radius:12px;padding:20px;text-align:center;">' +
      '<h3 contenteditable="true" style="margin:0 0 6px 0;font-size:16px;font-weight:900;color:#3B0764;">Ready to Strengthen Your Cyber Reflexes?</h3>' +
      '<p contenteditable="true" style="margin:0 0 14px 0;font-size:12.5px;color:#64748B;">No personal information was saved. Launch your quick _VOIS awareness refresher below.</p>' +
      '<div class="vshield-canvas-item vshield-custom-btn" data-type="button" data-item-name="VOIS Refresher Button" data-action="training" data-url="' +
      MY_TRAINING_ROUTE +
      '" style="display:inline-block;cursor:move;"><a href="' +
      MY_TRAINING_ROUTE +
      '" target="_top" onclick="return false;" style="display:inline-block;background-color:#990099;color:#ffffff;text-decoration:none;padding:11px 32px;border-radius:9999px;font-weight:800;font-size:13px;cursor:pointer;" contenteditable="true">Start _VOIS Awareness Training</a></div>' +
      "</div></div></div>" +
      '<div class="vshield-canvas-item" data-type="element" data-item-name="VOIS Briefing Footer" style="position:relative;width:100%;background:#3B0764;color:#E9D5FF;padding:12px 36px;text-align:center;font-size:11px;box-sizing:border-box;cursor:move;"><p contenteditable="true" style="margin:0;">_VOIS Threat Defense &amp; Security Culture • Authorized Simulation Environment</p></div>' +
      "</div>",
  },

  // ── 4. VODAFONE DARK THEMED ──
  {
    id: "lp-vodafone-dark",
    category: "Vodafone Dark",
    name: "Vodafone Cyber Defense — Full-Screen Dark Mode Alert",
    html:
      '<div style="width:100%;min-height:560px;margin:0;padding:0;background:#090B10;color:#F8FAFC;font-family:\'Segoe UI\',Arial,sans-serif;box-sizing:border-box;display:flex;flex-direction:column;">' +
      '<div class="vshield-canvas-item" data-type="element" data-item-name="Vodafone Dark Navbar" style="position:relative;width:100%;background:#11141C;border-bottom:2px solid #E60000;padding:14px 40px;display:flex;align-items:center;justify-content:space-between;box-sizing:border-box;cursor:move;">' +
      '<div style="display:flex;align-items:center;gap:10px;"><span style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;background:#E60000;color:#ffffff;font-weight:900;font-size:14px;">V</span><span contenteditable="true" style="font-size:14px;font-weight:900;color:#ffffff;letter-spacing:0.6px;">VODAFONE GROUP CYBER DEFENSE</span></div>' +
      '<span contenteditable="true" style="background:rgba(230,0,0,0.18);border:1px solid rgba(230,0,0,0.5);color:#FCA5A5;font-size:10px;font-weight:800;padding:4px 12px;border-radius:9999px;text-transform:uppercase;">SIMULATION INTERCEPTED</span>' +
      "</div>" +
      '<div class="vshield-canvas-item" data-type="element" data-item-name="Vodafone Dark Hero" style="position:relative;width:100%;background:radial-gradient(circle at top center,rgba(230,0,0,0.22) 0%,#090B10 70%);padding:34px 40px 22px 40px;text-align:center;box-sizing:border-box;cursor:move;">' +
      '<div style="max-width:900px;margin:0 auto;">' +
      '<h1 contenteditable="true" style="margin:0 0 8px 0;font-size:30px;font-weight:900;color:#ffffff;outline:none;">Oops! You Interacted With a Simulated Phish</h1>' +
      '<p contenteditable="true" style="margin:0 auto;max-width:680px;font-size:13.5px;color:#94A3B8;line-height:1.6;">Your device and Vodafone identity remain completely secure. This controlled simulation helps protect our global network against real adversaries.</p>' +
      "</div></div>" +
      '<div class="vshield-canvas-item" data-type="element" data-item-name="Vodafone Dark Content Band" style="position:relative;width:100%;padding:16px 40px 26px 40px;box-sizing:border-box;flex:1;cursor:move;">' +
      '<div style="max-width:1060px;margin:0 auto;">' +
      '<div style="background:#121620;border:1px solid #252B3B;border-left:4px solid #E60000;border-radius:12px;padding:18px 22px;margin-bottom:18px;">' +
      '<h3 contenteditable="true" style="margin:0 0 8px 0;font-size:15px;font-weight:800;color:#F87171;">⚠️ Threat Indicators to Watch For Next Time</h3>' +
      '<div style="display:flex;gap:16px;flex-wrap:wrap;">' +
      '<div style="flex:1;min-width:210px;"><p contenteditable="true" style="margin:0;font-size:12px;color:#CBD5E1;line-height:1.5;"><strong>• Spoofed Domains:</strong> External senders impersonating internal Vodafone teams.</p></div>' +
      '<div style="flex:1;min-width:210px;"><p contenteditable="true" style="margin:0;font-size:12px;color:#CBD5E1;line-height:1.5;"><strong>• Urgent Pressure:</strong> Demands for immediate password sync or verification.</p></div>' +
      '<div style="flex:1;min-width:210px;"><p contenteditable="true" style="margin:0;font-size:12px;color:#CBD5E1;line-height:1.5;"><strong>• Unverified URLs:</strong> Links routing outside trusted corporate domains.</p></div>' +
      "</div></div>" +
      '<div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:22px;">' +
      '<div style="flex:1;min-width:260px;background:#121620;border:1px solid #252B3B;border-radius:10px;padding:16px;"><h4 contenteditable="true" style="margin:0 0 4px 0;font-size:13.5px;font-weight:800;color:#ffffff;">Zero Impact Guarantee</h4><p contenteditable="true" style="margin:0;font-size:12px;color:#94A3B8;line-height:1.5;">Hosted safely inside Vodafone Cyber Defense infrastructure. Zero credentials were stored.</p></div>' +
      '<div style="flex:1;min-width:260px;background:#121620;border:1px solid #252B3B;border-radius:10px;padding:16px;"><h4 contenteditable="true" style="margin:0 0 4px 0;font-size:13.5px;font-weight:800;color:#ffffff;">Mandatory Follow-Up</h4><p contenteditable="true" style="margin:0;font-size:12px;color:#94A3B8;line-height:1.5;">Complete your assigned 3-minute awareness lesson in My Training to close out this event.</p></div>' +
      "</div>" +
      '<div style="text-align:center;">' +
      '<div class="vshield-canvas-item vshield-custom-btn" data-type="button" data-item-name="Vodafone Dark CTA" data-action="training" data-url="' +
      MY_TRAINING_ROUTE +
      '" style="display:inline-block;cursor:move;"><a href="' +
      MY_TRAINING_ROUTE +
      '" target="_top" onclick="return false;" style="display:inline-block;background-color:#E60000;color:#ffffff;text-decoration:none;padding:12px 34px;border-radius:8px;font-weight:800;font-size:13.5px;box-shadow:0 0 20px rgba(230,0,0,0.4);cursor:pointer;" contenteditable="true">Go to My Training Portal</a></div>' +
      "</div></div></div>" +
      '<div class="vshield-canvas-item" data-type="element" data-item-name="Vodafone Dark Footer" style="position:relative;width:100%;background:#06080C;border-top:1px solid #1E2433;color:#64748B;padding:12px 40px;text-align:center;font-size:11px;box-sizing:border-box;cursor:move;"><p contenteditable="true" style="margin:0;">© 2026 Vodafone Group Plc • Global Cyber Defense Operations • Always report suspicious emails in Outlook</p></div>' +
      "</div>",
  },

  // ── 5. VODAFONE SCARLET RED THEMED ──
  {
    id: "lp-vodafone-scarlet",
    category: "Vodafone Scarlet Red",
    name: "Vodafone Group Security — Full-Screen Scarlet Red Alert",
    html:
      '<div style="width:100%;min-height:560px;margin:0;padding:0;background:#ffffff;font-family:\'Segoe UI\',Arial,sans-serif;box-sizing:border-box;display:flex;flex-direction:column;">' +
      '<div class="vshield-canvas-item" data-type="element" data-item-name="Scarlet Full-Bleed Hero" style="position:relative;width:100%;background:linear-gradient(135deg,#E60000 0%,#B91C1C 100%);padding:36px 36px;text-align:center;color:#ffffff;box-sizing:border-box;cursor:move;">' +
      '<div style="max-width:920px;margin:0 auto;">' +
      '<div style="display:inline-flex;align-items:center;justify-content:center;width:52px;height:52px;border-radius:50%;background:#ffffff;color:#E60000;font-size:26px;font-weight:900;margin-bottom:10px;box-shadow:0 6px 16px rgba(0,0,0,0.2);">!</div>' +
      '<h1 contenteditable="true" style="margin:0 0 8px 0;font-size:32px;font-weight:900;color:#ffffff;outline:none;">Oops! You\'ve Been Phished!</h1>' +
      '<p contenteditable="true" style="margin:0 auto;max-width:680px;font-size:14px;color:#FEE2E2;line-height:1.5;">Don\'t panic — this was an official Vodafone Security Awareness phishing simulation designed to help protect you and our customers.</p>' +
      "</div></div>" +
      '<div class="vshield-canvas-item" data-type="element" data-item-name="Scarlet Warning Strip" style="position:relative;width:100%;background:#FEF2F2;border-bottom:1px solid #FECACA;padding:12px 36px;text-align:center;box-sizing:border-box;cursor:move;">' +
      '<p contenteditable="true" style="margin:0;font-size:13px;font-weight:800;color:#991B1B;">Had this been a real attack, your Vodafone SSO credentials or confidential business data could have been compromised.</p>' +
      "</div>" +
      '<div class="vshield-canvas-item" data-type="element" data-item-name="4 Golden Rules Grid" style="position:relative;width:100%;padding:26px 36px;box-sizing:border-box;flex:1;cursor:move;">' +
      '<div style="max-width:1060px;margin:0 auto;">' +
      '<h2 contenteditable="true" style="margin:0 0 16px 0;text-align:center;font-size:18px;font-weight:900;color:#0F172A;">4 Golden Rules to Stop Phishing at Vodafone</h2>' +
      '<div style="display:flex;gap:14px;flex-wrap:wrap;margin-bottom:24px;">' +
      '<div style="flex:1;min-width:200px;background:#ffffff;border:1px solid #E2E8F0;border-left:4px solid #E60000;border-radius:10px;padding:16px;"><h4 contenteditable="true" style="margin:0 0 4px 0;font-size:13.5px;font-weight:800;color:#0F172A;">1. Check the Sender</h4><p contenteditable="true" style="margin:0;font-size:12px;color:#475569;line-height:1.5;">Look past the display name and inspect the actual sender domain.</p></div>' +
      '<div style="flex:1;min-width:200px;background:#ffffff;border:1px solid #E2E8F0;border-left:4px solid #E60000;border-radius:10px;padding:16px;"><h4 contenteditable="true" style="margin:0 0 4px 0;font-size:13.5px;font-weight:800;color:#0F172A;">2. Hover Before Clicking</h4><p contenteditable="true" style="margin:0;font-size:12px;color:#475569;line-height:1.5;">Preview URLs before opening links or downloading files.</p></div>' +
      '<div style="flex:1;min-width:200px;background:#ffffff;border:1px solid #E2E8F0;border-left:4px solid #E60000;border-radius:10px;padding:16px;"><h4 contenteditable="true" style="margin:0 0 4px 0;font-size:13.5px;font-weight:800;color:#0F172A;">3. Guard Your MFA</h4><p contenteditable="true" style="margin:0;font-size:12px;color:#475569;line-height:1.5;">Never approve unexpected two-factor notifications.</p></div>' +
      '<div style="flex:1;min-width:200px;background:#ffffff;border:1px solid #E2E8F0;border-left:4px solid #E60000;border-radius:10px;padding:16px;"><h4 contenteditable="true" style="margin:0 0 4px 0;font-size:13.5px;font-weight:800;color:#0F172A;">4. Report Fast</h4><p contenteditable="true" style="margin:0;font-size:12px;color:#475569;line-height:1.5;">Click "Report Phishing" in Outlook — even if unsure.</p></div>' +
      "</div>" +
      '<div style="text-align:center;">' +
      '<div class="vshield-canvas-item vshield-custom-btn" data-type="button" data-item-name="Scarlet Training Button" data-action="training" data-url="' +
      MY_TRAINING_ROUTE +
      '" style="display:inline-block;cursor:move;"><a href="' +
      MY_TRAINING_ROUTE +
      '" target="_top" onclick="return false;" style="display:inline-block;background-color:#E60000;color:#ffffff;text-decoration:none;padding:12px 36px;border-radius:9999px;font-weight:900;font-size:14px;box-shadow:0 6px 16px rgba(230,0,0,0.28);cursor:pointer;" contenteditable="true">Complete My Training Now</a></div>' +
      "</div></div></div>" +
      '<div class="vshield-canvas-item" data-type="element" data-item-name="Scarlet Footer" style="position:relative;width:100%;background:#111827;color:#9CA3AF;padding:12px 36px;text-align:center;font-size:11px;box-sizing:border-box;cursor:move;"><p contenteditable="true" style="margin:0;">Vodafone Group Information Security • Together We Stay Cyber Safe</p></div>' +
      "</div>",
  },

  // ── 6. VOISSHIELD THEMED #1 ──
  {
    id: "lp-voisshield-1",
    category: "VOISShield",
    name: "VOISShield Active Defense — Full-Screen Threat Intercept",
    html:
      '<div style="width:100%;min-height:560px;margin:0;padding:0;background:#0B1120;color:#F8FAFC;font-family:\'Segoe UI\',Arial,sans-serif;box-sizing:border-box;display:flex;flex-direction:column;">' +
      '<div class="vshield-canvas-item" data-type="element" data-item-name="VOISShield Top Bar" style="position:relative;width:100%;background:#020617;border-bottom:2px solid #EF4444;padding:14px 40px;display:flex;align-items:center;justify-content:space-between;box-sizing:border-box;cursor:move;">' +
      '<span contenteditable="true" style="font-size:15px;font-weight:900;color:#ffffff;letter-spacing:1px;">🛡️ VOISSHIELD DEFENSE ENGINE</span>' +
      '<span contenteditable="true" style="background:#16A34A;color:#ffffff;font-size:10px;font-weight:800;padding:4px 12px;border-radius:9999px;text-transform:uppercase;">SAFE SIMULATION</span>' +
      "</div>" +
      '<div class="vshield-canvas-item" data-type="element" data-item-name="VOISShield Hero" style="position:relative;width:100%;background:linear-gradient(135deg,#020617 0%,#1E1B4B 55%,#7F1D1D 100%);padding:34px 40px;text-align:center;box-sizing:border-box;cursor:move;">' +
      '<div style="max-width:920px;margin:0 auto;">' +
      '<h1 contenteditable="true" style="margin:0 0 8px 0;font-size:30px;font-weight:900;color:#ffffff;outline:none;">VOISShield Intercepted This Phishing Simulation</h1>' +
      '<p contenteditable="true" style="margin:0 auto;max-width:680px;font-size:13.5px;color:#CBD5E1;line-height:1.6;">You clicked a simulated threat link generated by the VOISShield Cyber Awareness platform. No harm occurred — let\'s turn this click into a quick defense upgrade.</p>' +
      "</div></div>" +
      '<div class="vshield-canvas-item" data-type="element" data-item-name="VOISShield Telemetry & Guide" style="position:relative;width:100%;padding:24px 40px;box-sizing:border-box;flex:1;cursor:move;">' +
      '<div style="max-width:1060px;margin:0 auto;">' +
      '<div style="display:flex;gap:14px;flex-wrap:wrap;margin-bottom:18px;">' +
      '<div style="flex:1;min-width:200px;background:#1E293B;border:1px solid #334155;border-radius:10px;padding:14px;"><span style="font-size:10px;font-weight:800;color:#38BDF8;text-transform:uppercase;">Simulation Status</span><div style="font-size:15px;font-weight:800;color:#ffffff;margin-top:4px;" contenteditable="true">Link Click Logged</div></div>' +
      '<div style="flex:1;min-width:200px;background:#1E293B;border:1px solid #334155;border-radius:10px;padding:14px;"><span style="font-size:10px;font-weight:800;color:#4ADE80;text-transform:uppercase;">Data Exposure</span><div style="font-size:15px;font-weight:800;color:#ffffff;margin-top:4px;" contenteditable="true">None (Safe Drill)</div></div>' +
      '<div style="flex:1;min-width:200px;background:#1E293B;border:1px solid #334155;border-radius:10px;padding:14px;"><span style="font-size:10px;font-weight:800;color:#FBBF24;text-transform:uppercase;">Assigned Action</span><div style="font-size:15px;font-weight:800;color:#ffffff;margin-top:4px;" contenteditable="true">My Training Refresher</div></div>' +
      "</div>" +
      '<div style="background:#1E293B;border-left:5px solid #38BDF8;border-radius:10px;padding:18px 22px;margin-bottom:22px;">' +
      '<h3 contenteditable="true" style="margin:0 0 8px 0;font-size:15px;font-weight:800;color:#38BDF8;">How to Spot This Lure in the Wild</h3>' +
      '<p contenteditable="true" style="margin:0 0 5px 0;font-size:12.5px;color:#E2E8F0;line-height:1.5;">1. Check the sender address carefully — attackers spoof trusted internal brand names.</p>' +
      '<p contenteditable="true" style="margin:0 0 5px 0;font-size:12.5px;color:#E2E8F0;line-height:1.5;">2. Question unexpected password resets, payroll attachments, or urgent IT patch links.</p>' +
      '<p contenteditable="true" style="margin:0;font-size:12.5px;color:#E2E8F0;line-height:1.5;">3. Use the Outlook Report Phishing button to notify VOISShield SOC in one click.</p>' +
      "</div>" +
      '<div style="text-align:center;">' +
      '<div class="vshield-canvas-item vshield-custom-btn" data-type="button" data-item-name="VOISShield CTA" data-action="training" data-url="' +
      MY_TRAINING_ROUTE +
      '" style="display:inline-block;cursor:move;"><a href="' +
      MY_TRAINING_ROUTE +
      '" target="_top" onclick="return false;" style="display:inline-block;background-color:#EF4444;color:#ffffff;text-decoration:none;padding:12px 34px;border-radius:8px;font-weight:800;font-size:13.5px;cursor:pointer;" contenteditable="true">Proceed to My Training</a></div>' +
      "</div></div></div>" +
      '<div class="vshield-canvas-item" data-type="element" data-item-name="VOISShield Footer" style="position:relative;width:100%;background:#020617;border-top:1px solid #1E293B;color:#94A3B8;padding:12px 40px;text-align:center;font-size:11px;box-sizing:border-box;cursor:move;"><p contenteditable="true" style="margin:0;">Powered by VOISShield Security Awareness Platform • Authorized Phishing Resilience Exercise</p></div>' +
      "</div>",
  },

  // ── 7. VOISSHIELD THEMED #2 ──
  {
    id: "lp-voisshield-2",
    category: "VOISShield",
    name: "VOISShield Awareness Hub — Full-Screen Remediation Portal",
    html:
      '<div style="width:100%;min-height:560px;margin:0;padding:0;background:#F8FAFC;font-family:\'Segoe UI\',Arial,sans-serif;box-sizing:border-box;display:flex;flex-direction:column;">' +
      '<div class="vshield-canvas-item" data-type="element" data-item-name="VOISShield Hub Header" style="position:relative;width:100%;background:#ffffff;border-bottom:1px solid #E2E8F0;padding:14px 40px;display:flex;align-items:center;justify-content:space-between;box-sizing:border-box;cursor:move;">' +
      '<div style="display:flex;align-items:center;gap:10px;"><span style="display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:8px;background:#E60000;color:#ffffff;font-size:16px;">🛡️</span><div><div contenteditable="true" style="font-size:15px;font-weight:900;color:#0F172A;">VOISShield Awareness Hub</div><div contenteditable="true" style="font-size:10px;color:#64748B;">Human Risk Management &amp; Simulation</div></div></div>' +
      '<span contenteditable="true" style="background:#FEF3C7;color:#92400E;border:1px solid #FDE68A;font-size:10px;font-weight:800;padding:4px 12px;border-radius:6px;">ACTION REQUIRED</span>' +
      "</div>" +
      '<div class="vshield-canvas-item" data-type="element" data-item-name="Hub Remediation Hero" style="position:relative;width:100%;background:#ffffff;border-bottom:1px solid #E2E8F0;padding:28px 40px;text-align:center;box-sizing:border-box;cursor:move;">' +
      '<div style="max-width:860px;margin:0 auto;">' +
      '<h1 contenteditable="true" style="margin:0 0 8px 0;font-size:28px;font-weight:900;color:#0F172A;outline:none;">Oops, {{userName}} — You Fell for a Simulated Phish!</h1>' +
      '<p contenteditable="true" style="margin:0;font-size:13.5px;color:#475569;line-height:1.6;">This phishing simulation was delivered via VOISShield to help you recognize modern social engineering tactics in a zero-risk environment.</p>' +
      "</div></div>" +
      '<div class="vshield-canvas-item" data-type="element" data-item-name="Do and Dont Full Band" style="position:relative;width:100%;padding:26px 40px;box-sizing:border-box;flex:1;cursor:move;">' +
      '<div style="max-width:1060px;margin:0 auto;">' +
      '<div style="display:flex;gap:20px;flex-wrap:wrap;margin-bottom:24px;">' +
      '<div style="flex:1;min-width:260px;background:#FEF2F2;border:1px solid #FECACA;border-radius:12px;padding:20px;"><h3 contenteditable="true" style="margin:0 0 8px 0;font-size:15px;font-weight:800;color:#991B1B;">❌ Avoid Doing This</h3><p contenteditable="true" style="margin:0 0 6px 0;font-size:12.5px;color:#7F1D1D;line-height:1.5;">• Clicking urgent links without hovering to inspect the real URL</p><p contenteditable="true" style="margin:0 0 6px 0;font-size:12.5px;color:#7F1D1D;line-height:1.5;">• Entering corporate passwords on unexpected login prompts</p><p contenteditable="true" style="margin:0;font-size:12.5px;color:#7F1D1D;line-height:1.5;">• Opening unexpected attachments from external senders</p></div>' +
      '<div style="flex:1;min-width:260px;background:#F0FDF4;border:1px solid #BBF7D0;border-radius:12px;padding:20px;"><h3 contenteditable="true" style="margin:0 0 8px 0;font-size:15px;font-weight:800;color:#166534;">✅ Always Do This</h3><p contenteditable="true" style="margin:0 0 6px 0;font-size:12.5px;color:#14532D;line-height:1.5;">• Verify unusual requests through Teams or an independent call</p><p contenteditable="true" style="margin:0 0 6px 0;font-size:12.5px;color:#14532D;line-height:1.5;">• Navigate to corporate portals using your own saved bookmarks</p><p contenteditable="true" style="margin:0;font-size:12.5px;color:#14532D;line-height:1.5;">• Report suspicious messages immediately using Outlook</p></div>' +
      "</div>" +
      '<div style="text-align:center;">' +
      '<div class="vshield-canvas-item vshield-custom-btn" data-type="button" data-item-name="VOISShield Hub CTA" data-action="training" data-url="' +
      MY_TRAINING_ROUTE +
      '" style="display:inline-block;cursor:move;"><a href="' +
      MY_TRAINING_ROUTE +
      '" target="_top" onclick="return false;" style="display:inline-block;background-color:#0F172A;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:800;font-size:13.5px;cursor:pointer;" contenteditable="true">Launch My Training Dashboard</a></div>' +
      "</div></div></div>" +
      '<div class="vshield-canvas-item" data-type="element" data-item-name="VOISShield Hub Footer" style="position:relative;width:100%;background:#ffffff;border-top:1px solid #E2E8F0;color:#64748B;padding:12px 40px;text-align:center;font-size:11px;box-sizing:border-box;cursor:move;"><p contenteditable="true" style="margin:0;">VOISShield Security Awareness • Building a Human Firewall Together</p></div>' +
      "</div>",
  },

  // ── 8. NORMAL THEMED #1 ──
  {
    id: "lp-normal-1",
    category: "General",
    name: "Modern Enterprise — Full-Screen Oops! Simulated Phish",
    html:
      '<div style="width:100%;min-height:560px;margin:0;padding:0;background:#ffffff;font-family:\'Segoe UI\',Arial,sans-serif;box-sizing:border-box;display:flex;flex-direction:column;">' +
      '<div class="vshield-canvas-item" data-type="element" data-item-name="Modern Blue Hero" style="position:relative;width:100%;background:linear-gradient(135deg,#1E3A8A 0%,#2563EB 100%);padding:40px 40px;text-align:center;color:#ffffff;box-sizing:border-box;cursor:move;">' +
      '<div style="max-width:880px;margin:0 auto;">' +
      '<div style="font-size:36px;margin-bottom:8px;">🎣</div>' +
      '<h1 contenteditable="true" style="margin:0 0 8px 0;font-size:30px;font-weight:900;color:#ffffff;outline:none;">Oops! You Clicked a Simulated Phishing Link</h1>' +
      '<p contenteditable="true" style="margin:0 auto;max-width:660px;font-size:14px;color:#DBEAFE;line-height:1.6;">Good news: this was only a security training exercise. No malware was downloaded and your corporate account remains completely safe.</p>' +
      "</div></div>" +
      '<div class="vshield-canvas-item" data-type="element" data-item-name="Modern Awareness Content" style="position:relative;width:100%;padding:32px 40px;box-sizing:border-box;flex:1;cursor:move;">' +
      '<div style="max-width:1040px;margin:0 auto;">' +
      '<div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:24px 28px;margin-bottom:24px;">' +
      '<h3 contenteditable="true" style="margin:0 0 8px 0;font-size:16px;font-weight:800;color:#0F172A;">Why We Run Phishing Simulations</h3>' +
      '<p contenteditable="true" style="margin:0 0 10px 0;font-size:13px;color:#475569;line-height:1.6;">Cybercriminals craft convincing emails every day to trick employees into revealing passwords or opening infected documents. Practicing in a safe environment is the fastest way to build lasting awareness.</p>' +
      '<p contenteditable="true" style="margin:0;font-size:13px;color:#475569;line-height:1.6;"><strong>Quick Tip:</strong> Always check the full email address, hover over links, and verify unexpected requests with the sender directly.</p>' +
      "</div>" +
      '<div style="text-align:center;">' +
      '<div class="vshield-canvas-item vshield-custom-btn" data-type="button" data-item-name="Modern Training CTA" data-action="training" data-url="' +
      MY_TRAINING_ROUTE +
      '" style="display:inline-block;cursor:move;"><a href="' +
      MY_TRAINING_ROUTE +
      '" target="_top" onclick="return false;" style="display:inline-block;background-color:#2563EB;color:#ffffff;text-decoration:none;padding:12px 34px;border-radius:8px;font-weight:800;font-size:13.5px;cursor:pointer;" contenteditable="true">Go to My Training Page</a></div>' +
      "</div></div></div>" +
      '<div class="vshield-canvas-item" data-type="element" data-item-name="Modern Footer" style="position:relative;width:100%;background:#F8FAFC;border-top:1px solid #E2E8F0;color:#64748B;padding:14px 40px;text-align:center;font-size:11.5px;box-sizing:border-box;cursor:move;"><p contenteditable="true" style="margin:0;">Information Security Awareness Team • Safe Phishing Simulation Page</p></div>' +
      "</div>",
  },

  // ── 9. NORMAL THEMED #2 ──
  {
    id: "lp-normal-2",
    category: "General",
    name: "Executive Caution Checkpoint — Full-Screen Amber Alert",
    html:
      '<div style="width:100%;min-height:560px;margin:0;padding:0;background:#FFFBEB;font-family:\'Segoe UI\',Arial,sans-serif;box-sizing:border-box;display:flex;flex-direction:column;">' +
      '<div class="vshield-canvas-item" data-type="element" data-item-name="Amber Caution Hero" style="position:relative;width:100%;background:linear-gradient(135deg,#B45309 0%,#F59E0B 100%);padding:36px 40px;text-align:center;color:#ffffff;box-sizing:border-box;cursor:move;">' +
      '<div style="max-width:900px;margin:0 auto;">' +
      '<span contenteditable="true" style="display:inline-block;background:rgba(0,0,0,0.22);color:#ffffff;font-size:10px;font-weight:800;padding:4px 12px;border-radius:6px;text-transform:uppercase;margin-bottom:10px;">SECURITY AWARENESS CHECKPOINT</span>' +
      '<h1 contenteditable="true" style="margin:0 0 8px 0;font-size:30px;font-weight:900;color:#ffffff;outline:none;">Hold On! That Email Was a Phishing Test</h1>' +
      '<p contenteditable="true" style="margin:0 auto;max-width:680px;font-size:14px;color:#FEF3C7;line-height:1.5;">In a real-world attack, this click could have exposed sensitive company files or corporate logins. Review the breakdown below.</p>' +
      "</div></div>" +
      '<div class="vshield-canvas-item" data-type="element" data-item-name="Executive Action Grid" style="position:relative;width:100%;padding:28px 40px;box-sizing:border-box;flex:1;cursor:move;">' +
      '<div style="max-width:1040px;margin:0 auto;">' +
      '<div style="display:flex;gap:20px;flex-wrap:wrap;margin-bottom:26px;">' +
      '<div style="flex:1;min-width:260px;background:#ffffff;border:1px solid #FDE68A;border-top:4px solid #D97706;border-radius:12px;padding:20px;"><h3 contenteditable="true" style="margin:0 0 8px 0;font-size:15px;font-weight:800;color:#92400E;">🚩 Missed Red Flags</h3><p contenteditable="true" style="margin:0;font-size:12.5px;color:#78350F;line-height:1.7;">• Unverified external sender address<br/>• Sense of urgency or threat of suspension<br/>• Unexpected login or document link</p></div>' +
      '<div style="flex:1;min-width:260px;background:#ffffff;border:1px solid #E2E8F0;border-top:4px solid #0F172A;border-radius:12px;padding:20px;"><h3 contenteditable="true" style="margin:0 0 8px 0;font-size:15px;font-weight:800;color:#0F172A;">📋 Your Action Plan</h3><p contenteditable="true" style="margin:0;font-size:12.5px;color:#475569;line-height:1.7;">1. Complete your short training module<br/>2. Always hover over links before clicking<br/>3. Report suspicious emails right away</p></div>' +
      "</div>" +
      '<div style="text-align:center;">' +
      '<div class="vshield-canvas-item vshield-custom-btn" data-type="button" data-item-name="Amber Training CTA" data-action="training" data-url="' +
      MY_TRAINING_ROUTE +
      '" style="display:inline-block;cursor:move;"><a href="' +
      MY_TRAINING_ROUTE +
      '" target="_top" onclick="return false;" style="display:inline-block;background-color:#D97706;color:#ffffff;text-decoration:none;padding:12px 34px;border-radius:9999px;font-weight:800;font-size:13.5px;cursor:pointer;" contenteditable="true">Complete My Training Module</a></div>' +
      "</div></div></div>" +
      '<div class="vshield-canvas-item" data-type="element" data-item-name="Amber Footer" style="position:relative;width:100%;background:#ffffff;border-top:1px solid #FDE68A;color:#92400E;padding:12px 40px;text-align:center;font-size:11px;box-sizing:border-box;cursor:move;"><p contenteditable="true" style="margin:0;">Authorized Security Awareness Exercise • No credentials were collected or stored.</p></div>' +
      "</div>",
  },

  // ── 10. NORMAL THEMED #3 ──
  {
    id: "lp-normal-3",
    category: "General",
    name: "Stop, Think & Protect — Full-Screen Awareness Landing Page",
    html:
      '<div style="width:100%;min-height:560px;margin:0;padding:0;background:#F8FAFC;font-family:\'Segoe UI\',Arial,sans-serif;box-sizing:border-box;display:flex;flex-direction:column;">' +
      '<div class="vshield-canvas-item" data-type="element" data-item-name="Emerald Full-Bleed Hero" style="position:relative;width:100%;background:linear-gradient(135deg,#064E3B 0%,#059669 100%);padding:38px 40px;text-align:center;color:#ffffff;box-sizing:border-box;cursor:move;">' +
      '<div style="max-width:900px;margin:0 auto;">' +
      '<span contenteditable="true" style="display:inline-block;background:rgba(255,255,255,0.18);color:#ECFDF5;font-size:10px;font-weight:800;padding:4px 12px;border-radius:9999px;text-transform:uppercase;margin-bottom:10px;">STOP • THINK • PROTECT</span>' +
      '<h1 contenteditable="true" style="margin:0 0 8px 0;font-size:30px;font-weight:900;color:#ffffff;outline:none;">You\'ve Been Caught in a Security Drill!</h1>' +
      '<p contenteditable="true" style="margin:0 auto;max-width:660px;font-size:14px;color:#D1FAE5;line-height:1.6;">Don\'t worry — this simulation is here to help you stay one step ahead of real cyber threats every single day.</p>' +
      "</div></div>" +
      '<div class="vshield-canvas-item" data-type="element" data-item-name="Stop Think Protect Pillars" style="position:relative;width:100%;padding:28px 40px;box-sizing:border-box;flex:1;cursor:move;">' +
      '<div style="max-width:1060px;margin:0 auto;">' +
      '<div style="display:flex;gap:18px;flex-wrap:wrap;margin-bottom:26px;">' +
      '<div style="flex:1;min-width:220px;background:#ffffff;border:1px solid #E2E8F0;border-radius:12px;padding:20px;text-align:center;box-shadow:0 4px 14px rgba(15,23,42,0.04);"><div style="font-size:26px;margin-bottom:6px;">🛑</div><h3 contenteditable="true" style="margin:0 0 6px 0;font-size:15px;font-weight:900;color:#0F172A;">STOP</h3><p contenteditable="true" style="margin:0;font-size:12px;color:#64748B;line-height:1.5;">Take 5 seconds before clicking links or opening files in unexpected emails.</p></div>' +
      '<div style="flex:1;min-width:220px;background:#ffffff;border:1px solid #E2E8F0;border-radius:12px;padding:20px;text-align:center;box-shadow:0 4px 14px rgba(15,23,42,0.04);"><div style="font-size:26px;margin-bottom:6px;">🧠</div><h3 contenteditable="true" style="margin:0 0 6px 0;font-size:15px;font-weight:900;color:#0F172A;">THINK</h3><p contenteditable="true" style="margin:0;font-size:12px;color:#64748B;line-height:1.5;">Does the sender address match? Is the urgency realistic? Does the URL look right?</p></div>' +
      '<div style="flex:1;min-width:220px;background:#ffffff;border:1px solid #E2E8F0;border-radius:12px;padding:20px;text-align:center;box-shadow:0 4px 14px rgba(15,23,42,0.04);"><div style="font-size:26px;margin-bottom:6px;">🔒</div><h3 contenteditable="true" style="margin:0 0 6px 0;font-size:15px;font-weight:900;color:#0F172A;">PROTECT</h3><p contenteditable="true" style="margin:0;font-size:12px;color:#64748B;line-height:1.5;">Report suspicious emails immediately so Security Operations can block the threat.</p></div>' +
      "</div>" +
      '<div style="text-align:center;">' +
      '<div class="vshield-canvas-item vshield-custom-btn" data-type="button" data-item-name="Checkpoint Training CTA" data-action="training" data-url="' +
      MY_TRAINING_ROUTE +
      '" style="display:inline-block;cursor:move;"><a href="' +
      MY_TRAINING_ROUTE +
      '" target="_top" onclick="return false;" style="display:inline-block;background-color:#059669;color:#ffffff;text-decoration:none;padding:12px 34px;border-radius:8px;font-weight:800;font-size:13.5px;cursor:pointer;" contenteditable="true">Open My Training Refresher</a></div>' +
      "</div></div></div>" +
      '<div class="vshield-canvas-item" data-type="element" data-item-name="Checkpoint Footer" style="position:relative;width:100%;background:#064E3B;color:#A7F3D0;padding:12px 40px;text-align:center;font-size:11.5px;box-sizing:border-box;cursor:move;"><p contenteditable="true" style="margin:0;">Security Awareness Program • Safe Training Simulation • Thank you for staying vigilant</p></div>' +
      "</div>",
  },
];

const FONT_OPTIONS = [
  { label: "Vodafone", value: "Vodafone, sans-serif" },
  { label: "Vodafone ExB", value: "'Vodafone ExB', sans-serif" },
  { label: "Segoe UI", value: "'Segoe UI', sans-serif" },
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Inter", value: "Inter, sans-serif" },
  { label: "Montserrat", value: "Montserrat, sans-serif" },
  { label: "Poppins", value: "Poppins, sans-serif" },
  { label: "Roboto", value: "Roboto, sans-serif" },
  { label: "Helvetica", value: "Helvetica, Arial, sans-serif" },
  { label: "Times New Roman", value: "'Times New Roman', serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Courier New", value: "'Courier New', monospace" },
  { label: "JetBrains Mono", value: "'JetBrains Mono', monospace" },
  { label: "Trebuchet MS", value: "'Trebuchet MS', sans-serif" },
  { label: "Verdana", value: "Verdana, sans-serif" },
  { label: "Tahoma", value: "Tahoma, sans-serif" },
];

const FONT_SIZES = [
  { label: "8px", value: "8px" },
  { label: "10px", value: "10px" },
  { label: "12px", value: "12px" },
  { label: "14px", value: "14px" },
  { label: "16px", value: "16px" },
  { label: "18px", value: "18px" },
  { label: "20px", value: "20px" },
  { label: "24px", value: "24px" },
  { label: "28px", value: "28px" },
  { label: "32px", value: "32px" },
  { label: "36px", value: "36px" },
  { label: "40px", value: "40px" },
  { label: "48px", value: "48px" },
];

const EMPTY_HTML_VALUES = ["", "<br>", "<div><br></div>", "<p><br></p>"];

const calculateAspectRatio = (width, height) => {
  if (!width || !height) return "1:1";
  const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(Math.round(width), Math.round(height));
  const wRatio = Math.round(width / divisor);
  const hRatio = Math.round(height / divisor);
  if (wRatio > 32 || hRatio > 32) {
    return (width / height).toFixed(2) + ":1";
  }
  return wRatio + ":" + hRatio;
};

const getBodySnippet = (html) => {
  if (!html) return "";
  const tmp = document.implementation.createHTMLDocument("").createElement("div");
  tmp.innerHTML = html;
  const text = tmp.textContent || tmp.innerText || "";
  return text.replace(/\s+/g, " ").trim().slice(0, 65);
};

const isSameBody = (a, b) => {
  if (!a || !b) return false;
  const cleanA = String(a).replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  const cleanB = String(b).replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  return cleanA.length > 12 && cleanA === cleanB;
};

// Computes effective CSS zoom/transform scale so overlays & drag deltas match 1:1
// in both unexpanded (zoom: 0.94) and expanded (zoom: 1) modes.
const getEffectiveScale = (el) => {
  if (!el || !el.offsetWidth) return 1;
  const rect = el.getBoundingClientRect();
  const ratio = rect.width / el.offsetWidth;
  return ratio > 0.1 && Number.isFinite(ratio) ? ratio : 1;
};

// =========================================================================
// 🌟 ADVANCED TEMPLATE COMPONENTIZER
// =========================================================================
const componentizeTemplateHtml = (htmlString) => {
  if (!htmlString || EMPTY_HTML_VALUES.includes(htmlString.trim().toLowerCase())) {
    return htmlString;
  }

  try {
    const doc = new DOMParser().parseFromString(htmlString, "text/html");
    const body = doc.body;
    if (!body || !body.children.length) return htmlString;

    const markElement = (el, type) => {
      if (!el || el.nodeType !== 1) return;
      el.classList.add("vshield-canvas-item");
      if (!el.getAttribute("data-type")) {
        el.setAttribute("data-type", type);
      }
      if (!el.style.position || el.style.position === "static") {
        el.style.position = "relative";
      }
      el.style.cursor = "move";
      if (!el.style.boxShadow) {
        el.style.boxShadow = "none";
      }
    };

    const links = body.querySelectorAll("a");
    links.forEach((a) => {
      const parent = a.parentElement;
      const isButtonLike =
        a.style.backgroundColor ||
        a.style.padding ||
        a.style.display === "inline-block" ||
        (parent &&
          parent.children.length === 1 &&
          parent.tagName === "DIV" &&
          (parent.style.textAlign === "center" || parent.style.margin));

      const wrapper =
        parent &&
        isButtonLike &&
        parent.children.length === 1 &&
        parent.tagName === "DIV" &&
        parent !== body
          ? parent
          : a;
      markElement(wrapper, "button");
      wrapper.classList.add("vshield-custom-btn");
      // Only a training-shaped link (none, "#", "#training", /my-training)
      // becomes a My Training button; any other link keeps its destination.
      if (isTrainingHref(a.getAttribute("href"))) {
        wrapper.setAttribute("data-action", "training");
        wrapper.setAttribute("data-url", MY_TRAINING_ROUTE);
        a.setAttribute("href", MY_TRAINING_ROUTE);
        a.setAttribute("target", "_top");
      }
      a.setAttribute("contenteditable", "true");
      a.style.cursor = "pointer";
    });

    const imgs = body.querySelectorAll("img");
    imgs.forEach((img) => {
      const parent = img.parentElement;
      if (parent && parent !== body && parent.children.length === 1 && parent.tagName === "DIV") {
        markElement(parent, "image");
      } else {
        markElement(img, "image");
      }
    });

    const headings = body.querySelectorAll("h1, h2, h3, h4, h5, h6");
    headings.forEach((h) => {
      if (!h.closest(".vshield-canvas-item")) {
        markElement(h, "text");
      }
      h.setAttribute("contenteditable", "true");
      h.style.outline = "none";
    });

    const textNodes = body.querySelectorAll("p, blockquote");
    textNodes.forEach((p) => {
      if (!p.querySelector(".vshield-canvas-item") && !p.closest(".vshield-canvas-item")) {
        markElement(p, "text");
      }
      p.setAttribute("contenteditable", "true");
      p.style.outline = "none";
    });

    const divs = body.querySelectorAll("div, header, footer, section, table, td");
    divs.forEach((d) => {
      if (
        !d.classList.contains("vshield-canvas-item") &&
        d !== body &&
        !d.closest(".vshield-canvas-item")
      ) {
        const bg = d.style.backgroundColor || d.style.background;
        const hasBg = bg && bg !== "transparent" && bg !== "inherit";
        const hasBorder =
          d.style.border ||
          d.style.borderLeft ||
          d.style.borderTop ||
          d.style.borderBottom ||
          d.style.borderRight;
        if (hasBg || hasBorder) {
          markElement(d, "element");
        }
      }
    });

    return body.innerHTML;
  } catch (err) {
    console.warn("Could not componentize template HTML:", err);
    return htmlString;
  }
};

const LandingPageRichTextEditor = ({
  value = "",
  onChange,
  placeholder = "Design your Oops! Landing Page here or choose a Landing Page template...",
  disabled = false,
  className = "",
  compact = false,
  fullHeight = false,
  isExpanded: controlledExpanded,
  onToggleExpand,
}) => {
  const editorRef = useRef(null);
  const stageRef = useRef(null);
  const workspaceRef = useRef(null);
  const imageInputRef = useRef(null);
  const savedSelectionRef = useRef(null);
  // The value as it arrived: the canvas background split off (it is saved as
  // a wrapper round the page) and the HTML made safe and editable.
  const [initialContent] = useState(() => {
    const { bg, html } = splitCanvasBg(value || "");
    return { bg: bg || "#FFFFFF", html: loadIntoEditor(html) };
  });
  const internalHtmlRef = useRef(initialContent.html);
  // What this editor last handed to onChange, so its own echo coming back
  // as `value` is not mistaken for a new page.
  const lastEmittedRef = useRef(value || "");
  const canvasBgColorRef = useRef(initialContent.bg);
  const itemCounterRef = useRef(1);
  const marqueeActiveRef = useRef(false);
  const lastTypingPushRef = useRef(0);

  const [rawHtmlMode, setRawHtmlMode] = useState(false);
  const [rawHtmlCode, setRawHtmlCode] = useState(initialContent.html);
  const [internalExpanded, setInternalExpanded] = useState(false);
  const isControlledExpand =
    typeof controlledExpanded === "boolean" && typeof onToggleExpand === "function";
  const isExpanded = isControlledExpand ? controlledExpanded : internalExpanded;

  // Forces floating blue selection box to re-sync during drag, resize, scroll, or expand toggle
  const [, setOverlayTick] = useState(0);
  const bumpOverlay = useCallback(() => {
    setOverlayTick((t) => (t + 1) % 1000000);
  }, []);

  // Full-screen live preview modal triggered by Eye icon on ribbon
  const [showFullScreenPreview, setShowFullScreenPreview] = useState(false);
  const [previewHtmlSnapshot, setPreviewHtmlSnapshot] = useState("");

  const [selectedBlockFormat, setSelectedBlockFormat] = useState("<p>");
  const [selectedFontFamily, setSelectedFontFamily] = useState("Vodafone, sans-serif");
  const [selectedFontSize, setSelectedFontSize] = useState("14px");

  const [toastMessage, setToastMessage] = useState("");
  const [showFxMenu, setShowFxMenu] = useState(false);
  const [showShapeMenu, setShowShapeMenu] = useState(false);
  const [showButtonMenu, setShowButtonMenu] = useState(false);
  const [showElementsMenu, setShowElementsMenu] = useState(false);
  const [showBodyMenu, setShowBodyMenu] = useState(false);
  const [showCanvasBgMenu, setShowCanvasBgMenu] = useState(false);
  const [showGridlines, setShowGridlines] = useState(false);
  const [isOverflowingSafeZoneY, setIsOverflowingSafeZoneY] = useState(false);
  const [canvasContentHeightPx, setCanvasContentHeightPx] = useState(SAFE_ZONE_HEIGHT_PX + 80);
  const [showShadowMenu, setShowShadowMenu] = useState(false);
  const [showRoundedMenu, setShowRoundedMenu] = useState(false);
  const [showBorderMenu, setShowBorderMenu] = useState(false);
  const [canvasBgColor, setCanvasBgColor] = useState(initialContent.bg);
  const [activeElement, setActiveElement] = useState(null);
  const [selectedElements, setSelectedElements] = useState([]);
  const [aspectRatioText, setAspectRatioText] = useState("");
  const [marqueeRect, setMarqueeRect] = useState(null);

  // Used Items Right Vertical Pane (Opened/Closed via Hamburger Icon)
  const [showUsedItemsPane, setShowUsedItemsPane] = useState(false);
  const [usedItems, setUsedItems] = useState([]);
  const [renamingItemId, setRenamingItemId] = useState(null);
  const [tempItemName, setTempItemName] = useState("");
  const [draggedLayerId, setDraggedLayerId] = useState(null);
  const [dragOverLayerId, setDragOverLayerId] = useState(null);

  const historyRef = useRef([initialContent.html]);
  const historyIndexRef = useRef(0);
  const [historyMeta, setHistoryMeta] = useState({ index: 0, length: 1 });
  const isHistoryActionRef = useRef(false);

  const [selectionColorMenu, setSelectionColorMenu] = useState({
    visible: false,
    top: 0,
    left: 0,
  });

  const [actionConfigModal, setActionConfigModal] = useState({
    open: false,
    element: null,
    actionType: "training",
  });

  const fxRef = useRef(null);
  const shapeMenuRef = useRef(null);
  const buttonMenuRef = useRef(null);
  const elementsMenuRef = useRef(null);
  const bodyMenuRef = useRef(null);
  const canvasBgRef = useRef(null);

  const showToast = useCallback((message) => {
    setToastMessage(message);
  }, []);

  // =========================================================================
  // 🌟 BROWSER SAFE ZONE BOTTOM CHECKER (Scale-Aware — Visual Only)
  // =========================================================================
  const checkSafeZoneOverflow = useCallback(() => {
    if (!editorRef.current || !stageRef.current) return;
    const scale = getEffectiveScale(stageRef.current);
    const editorRect = editorRef.current.getBoundingClientRect();
    let maxBottom = 0;

    Array.from(editorRef.current.children).forEach((el) => {
      const rect = el.getBoundingClientRect();
      const bottom = (rect.bottom - editorRect.top) / scale;
      if (bottom > maxBottom) maxBottom = bottom;
    });

    setIsOverflowingSafeZoneY(maxBottom > SAFE_ZONE_HEIGHT_PX + 4);
    setCanvasContentHeightPx(Math.max(SAFE_ZONE_HEIGHT_PX + 80, Math.ceil(maxBottom + 80)));
  }, []);

  // =========================================================================
  // 🌟 USED ITEMS SCANNER (Matches Actual Top-to-Bottom Canvas Order)
  // =========================================================================
  const syncUsedItemsList = useCallback(() => {
    if (!editorRef.current) {
      setUsedItems([]);
      return;
    }

    const allNodes = Array.from(editorRef.current.querySelectorAll(".vshield-canvas-item")).filter(
      (el) => {
        const parentGroup = el.parentElement?.closest(".vshield-group-item");
        if (parentGroup && editorRef.current.contains(parentGroup)) return false;
        if (el.classList.contains("vshield-grid-cursor-box")) {
          const txt = (el.textContent || "").replace(/\u200B/g, "").trim();
          if (!txt && !el.querySelector("img, a")) return false;
        }
        return true;
      }
    );

    // Ids key the list and drive select/rename/reorder, so a repeated id
    // (a copied block, pasted HTML) is replaced with a fresh one.
    const seenIds = new Set();
    const items = allNodes.map((el) => {
      if (!el.id || seenIds.has(el.id)) {
        el.id = newCanvasId("vshield-item");
      }
      seenIds.add(el.id);
      let itemName = el.getAttribute("data-item-name");
      if (!itemName) {
        itemName = "Item " + itemCounterRef.current;
        itemCounterRef.current += 1;
        el.setAttribute("data-item-name", itemName);
      }
      return {
        id: el.id,
        name: itemName,
        type: el.getAttribute("data-type") || "element",
        element: el,
      };
    });

    setUsedItems(items);
  }, []);

  // Hands the page to the parent: the editor's HTML wrapped with the canvas
  // background so the colour is saved with it.
  const notifyParent = useCallback(
    (html) => {
      const outgoing = wrapCanvasBg(html || "", canvasBgColorRef.current);
      lastEmittedRef.current = outgoing;
      onChange?.(outgoing);
    },
    [onChange]
  );

  const emitChange = useCallback(
    (html, { typing = false } = {}) => {
      const updatedHtml = html || "";
      internalHtmlRef.current = updatedHtml;
      notifyParent(updatedHtml);

      if (!isHistoryActionRef.current) {
        const currentStack = historyRef.current.slice(0, historyIndexRef.current + 1);
        const now = Date.now();
        const mergeWithLast =
          typing &&
          currentStack.length > 1 &&
          now - lastTypingPushRef.current < TYPING_HISTORY_MERGE_MS;
        lastTypingPushRef.current = typing ? now : 0;
        if (mergeWithLast && currentStack[currentStack.length - 1] !== updatedHtml) {
          // Still typing: replace the last step instead of adding one.
          currentStack[currentStack.length - 1] = updatedHtml;
          historyRef.current = currentStack;
        } else if (currentStack[currentStack.length - 1] !== updatedHtml) {
          currentStack.push(updatedHtml);
          if (currentStack.length > MAX_HISTORY_STEPS) {
            currentStack.shift();
          }
          historyRef.current = currentStack;
          historyIndexRef.current = currentStack.length - 1;
          setHistoryMeta({
            index: historyIndexRef.current,
            length: currentStack.length,
          });
        }
      }

      syncUsedItemsList();
      checkSafeZoneOverflow();
      bumpOverlay();
    },
    [notifyParent, syncUsedItemsList, checkSafeZoneOverflow, bumpOverlay]
  );

  const handleUndo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      isHistoryActionRef.current = true;
      const newIndex = historyIndexRef.current - 1;
      // A step may have come from HTML mode, so it is cleaned before it
      // goes back into the live editor.
      const restored = sanitizeLandingHtml(historyRef.current[newIndex]);
      historyIndexRef.current = newIndex;
      setHistoryMeta({ index: newIndex, length: historyRef.current.length });
      internalHtmlRef.current = restored;
      if (editorRef.current) editorRef.current.innerHTML = restored;
      setRawHtmlCode(restored);
      notifyParent(restored);
      setActiveElement(null);
      setSelectedElements([]);
      syncUsedItemsList();
      checkSafeZoneOverflow();
      setTimeout(() => {
        isHistoryActionRef.current = false;
      }, 50);
      showToast("Undo");
    }
  }, [notifyParent, showToast, syncUsedItemsList, checkSafeZoneOverflow]);

  const handleRedo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      isHistoryActionRef.current = true;
      const newIndex = historyIndexRef.current + 1;
      // A step may have come from HTML mode, so it is cleaned before it
      // goes back into the live editor.
      const restored = sanitizeLandingHtml(historyRef.current[newIndex]);
      historyIndexRef.current = newIndex;
      setHistoryMeta({ index: newIndex, length: historyRef.current.length });
      internalHtmlRef.current = restored;
      if (editorRef.current) editorRef.current.innerHTML = restored;
      setRawHtmlCode(restored);
      notifyParent(restored);
      setActiveElement(null);
      setSelectedElements([]);
      syncUsedItemsList();
      checkSafeZoneOverflow();
      setTimeout(() => {
        isHistoryActionRef.current = false;
      }, 50);
      showToast("Redo");
    }
  }, [notifyParent, showToast, syncUsedItemsList, checkSafeZoneOverflow]);

  // Landing Page Templates: 10 Full-Screen Templates + LandingPageCatalogues.json
  const landingPageTemplates = useMemo(() => {
    const list = [];
    const fallbacks = LANDING_PAGE_FALLBACK_TEMPLATES || [];
    fallbacks.forEach((fb) => {
      list.push({
        ...fb,
        snippet: getBodySnippet(fb.html),
      });
    });

    const rawList =
      LandingPageCatalogues?.landingPages ||
      LandingPageCatalogues?.default?.landingPages ||
      [];
    if (Array.isArray(rawList)) {
      rawList.forEach((item) => {
        const html =
          item.LandingPageContent ||
          item.landingPageContent ||
          item.content ||
          item.html;
        const name =
          item.LandingPageName ||
          item.landingPageName ||
          item.name ||
          item.title;
        if (html && !list.some((existing) => existing.name === name)) {
          list.push({
            id: item.LandingPageID || item.landingPageId || item.id || name,
            category: "Catalogue",
            name: name || "Landing Page Template",
            html,
            snippet: getBodySnippet(html),
          });
        }
      });
    }

    return list;
  }, []);

  const isEditorSelection = useCallback((range) => {
    if (!range || !editorRef.current) return false;
    const commonAncestor = range.commonAncestorContainer;
    const selectedNode =
      commonAncestor.nodeType === Node.TEXT_NODE
        ? commonAncestor.parentNode
        : commonAncestor;
    return editorRef.current.contains(selectedNode);
  }, []);

  const saveSelection = useCallback(() => {
    if (rawHtmlMode || !editorRef.current) return;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    if (isEditorSelection(range)) {
      savedSelectionRef.current = range.cloneRange();
    }
  }, [isEditorSelection, rawHtmlMode]);

  const placeCaretInElement = useCallback((el, atEnd = false) => {
    if (!el) return;
    const selection = window.getSelection();
    if (!selection) return;
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(!atEnd);
    selection.removeAllRanges();
    selection.addRange(range);
    savedSelectionRef.current = range.cloneRange();
  }, []);

  const placeCaretAtEnd = useCallback(() => {
    if (!editorRef.current) return;
    placeCaretInElement(editorRef.current, true);
  }, [placeCaretInElement]);

  const restoreSelection = useCallback(() => {
    if (!editorRef.current) return;
    editorRef.current.focus();

    const selection = window.getSelection();
    if (!selection) return;

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

  const synchroniseEditorValue = useCallback(
    (options) => {
      if (!editorRef.current) return;
      const updatedHtml = editorRef.current.innerHTML;
      emitChange(updatedHtml, options);
      saveSelection();
    },
    [emitChange, saveSelection]
  );

  const cleanupEmptyGridBoxes = useCallback((keepNode = null) => {
    if (!editorRef.current) return;
    const boxes = editorRef.current.querySelectorAll(".vshield-grid-cursor-box");
    boxes.forEach((box) => {
      if (box === keepNode) return;
      const text = (box.textContent || "").replace(/\u200B/g, "").trim();
      if (!text && !box.querySelector("img, a")) {
        box.remove();
      }
    });
  }, []);

  const insertCanvasItem = useCallback(
    (html) => {
      const editor = editorRef.current;
      if (!editor) return;

      restoreSelection();
      const selection = window.getSelection();
      let inserted = false;

      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        if (editor.contains(range.commonAncestorContainer)) {
          try {
            const temp = document.createElement("div");
            temp.innerHTML = html;
            const frag = document.createDocumentFragment();
            let node;
            while ((node = temp.firstChild)) {
              frag.appendChild(node);
            }
            range.deleteContents();
            range.insertNode(frag);
            range.collapse(false);
            inserted = true;
          } catch {
            inserted = false;
          }
        }
      }

      if (!inserted) {
        editor.insertAdjacentHTML("beforeend", html);
      }

      synchroniseEditorValue();
    },
    [restoreSelection, synchroniseEditorValue]
  );

  useLayoutEffect(() => {
    if (rawHtmlMode || !editorRef.current) return;
    // Cleaned here too: this is also the way back in from HTML mode.
    let htmlToSync = sanitizeLandingHtml(internalHtmlRef.current || "");
    if (
      htmlToSync &&
      !htmlToSync.includes("vshield-canvas-item") &&
      !EMPTY_HTML_VALUES.includes(htmlToSync.trim().toLowerCase())
    ) {
      htmlToSync = componentizeTemplateHtml(htmlToSync);
    }
    if (editorRef.current.innerHTML !== htmlToSync) {
      editorRef.current.innerHTML = htmlToSync;
    }
    internalHtmlRef.current = htmlToSync;
    setRawHtmlCode(htmlToSync);
    // Before any edit, undo's first step is the page as it is shown, not as
    // it arrived (which may not have been componentised yet).
    if (historyRef.current.length === 1 && historyIndexRef.current === 0) {
      historyRef.current = [htmlToSync];
    }
    // Clear stale DOM reference across expand/portal transitions so blue overlay never points at a detached node
    setActiveElement(null);
    setSelectedElements([]);
    syncUsedItemsList();
    checkSafeZoneOverflow();
  }, [rawHtmlMode, isExpanded, syncUsedItemsList, checkSafeZoneOverflow]);

  useEffect(() => {
    if (
      value === undefined ||
      value === lastEmittedRef.current ||
      value === internalHtmlRef.current
    ) {
      return;
    }
    // A different page arrived from the parent: load it fresh.
    const { bg, html } = splitCanvasBg(value);
    let finalVal = loadIntoEditor(html);
    if (
      finalVal &&
      !finalVal.includes("vshield-canvas-item") &&
      !EMPTY_HTML_VALUES.includes(finalVal.trim().toLowerCase())
    ) {
      finalVal = componentizeTemplateHtml(finalVal);
    }
    lastEmittedRef.current = value;
    canvasBgColorRef.current = bg || "#FFFFFF";
    setCanvasBgColor(canvasBgColorRef.current);
    internalHtmlRef.current = finalVal;
    if (editorRef.current && !rawHtmlMode) {
      editorRef.current.innerHTML = finalVal;
    }
    setRawHtmlCode(finalVal);
    // Undo must not step back into the previous page.
    historyRef.current = [finalVal];
    historyIndexRef.current = 0;
    setHistoryMeta({ index: 0, length: 1 });
    syncUsedItemsList();
    checkSafeZoneOverflow();
  }, [value, rawHtmlMode, syncUsedItemsList, checkSafeZoneOverflow]);

  // Keep blue dotted selection box synced on window resize
  useEffect(() => {
    const onResize = () => {
      checkSafeZoneOverflow();
      bumpOverlay();
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [checkSafeZoneOverflow, bumpOverlay]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (fxRef.current && !fxRef.current.contains(event.target)) {
        setShowFxMenu(false);
      }
      if (shapeMenuRef.current && !shapeMenuRef.current.contains(event.target)) {
        setShowShapeMenu(false);
      }
      if (buttonMenuRef.current && !buttonMenuRef.current.contains(event.target)) {
        setShowButtonMenu(false);
      }
      if (elementsMenuRef.current && !elementsMenuRef.current.contains(event.target)) {
        setShowElementsMenu(false);
      }
      if (bodyMenuRef.current && !bodyMenuRef.current.contains(event.target)) {
        setShowBodyMenu(false);
      }
      if (canvasBgRef.current && !canvasBgRef.current.contains(event.target)) {
        setShowCanvasBgMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleTextSelectionChange = useCallback(() => {
    if (rawHtmlMode || disabled) {
      setSelectionColorMenu((prev) => ({ ...prev, visible: false }));
      return;
    }

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
      setSelectionColorMenu((prev) => ({ ...prev, visible: false }));
      return;
    }

    const range = selection.getRangeAt(0);
    if (!isEditorSelection(range)) {
      setSelectionColorMenu((prev) => ({ ...prev, visible: false }));
      return;
    }

    const text = selection.toString().trim();
    if (!text) {
      setSelectionColorMenu((prev) => ({ ...prev, visible: false }));
      return;
    }

    const rect = range.getBoundingClientRect();
    const stageEl = stageRef.current;
    const stageRect = stageEl?.getBoundingClientRect();
    const scale = getEffectiveScale(stageEl);

    if (stageRect) {
      setSelectionColorMenu({
        visible: true,
        top: Math.max(8, (rect.top - stageRect.top) / scale - 46),
        left: Math.max(8, (rect.left - stageRect.left) / scale),
      });
      savedSelectionRef.current = range.cloneRange();
    }
  }, [disabled, isEditorSelection, rawHtmlMode]);

  useEffect(() => {
    document.addEventListener("selectionchange", handleTextSelectionChange);
    return () => document.removeEventListener("selectionchange", handleTextSelectionChange);
  }, [handleTextSelectionChange]);

  const applyTextColorToSelection = (color) => {
    restoreSelection();
    try {
      document.execCommand("styleWithCSS", false, true);
      document.execCommand("foreColor", false, color);
      synchroniseEditorValue();
    } catch (e) {
      console.error(e);
    }
  };

  const handleEyedropperForText = async () => {
    if (!window.EyeDropper) {
      showToast("EyeDropper is not supported in this browser.");
      return;
    }
    try {
      const eyeDropper = new window.EyeDropper();
      const result = await eyeDropper.open();
      if (result?.sRGBHex) {
        applyTextColorToSelection(result.sRGBHex);
      }
    } catch {
      // Canceled
    }
  };

  const handleClearAllCanvas = () => {
    internalHtmlRef.current = "";
    if (editorRef.current) {
      editorRef.current.innerHTML = "";
    }
    setRawHtmlCode("");
    setActiveElement(null);
    setSelectedElements([]);
    itemCounterRef.current = 1;
    emitChange("");
    showToast("Canvas cleared.");
  };

  // The canvas colour is part of the page: it goes to the parent with it.
  const applyCanvasBgColor = (color) => {
    canvasBgColorRef.current = color;
    setCanvasBgColor(color);
    notifyParent(editorRef.current?.innerHTML ?? internalHtmlRef.current ?? "");
  };

  const chooseLandingPageTemplate = (option) => {
    setShowBodyMenu(false);
    if (!option?.html) return;
    itemCounterRef.current = 1;
    const componentized = option.html.includes("vshield-canvas-item")
      ? option.html
      : componentizeTemplateHtml(option.html);
    internalHtmlRef.current = componentized;
    if (editorRef.current) {
      editorRef.current.innerHTML = componentized;
    }
    setRawHtmlCode(componentized);
    emitChange(componentized);
    setActiveElement(null);
    setSelectedElements([]);
    showToast('Applied "' + option.name + '".');
  };

  const handleOpenFullScreenPreview = () => {
    cleanupEmptyGridBoxes(null);
    const liveHtml = rawHtmlMode
      ? rawHtmlCode
      : editorRef.current?.innerHTML ?? internalHtmlRef.current ?? "";
    // Previewed exactly as a phished person will get it.
    setPreviewHtmlSnapshot(exportLandingHtml(liveHtml, { appUrl: APP_URL }));
    setShowFullScreenPreview(true);
  };

  const getEditableTargetsForActive = useCallback((el) => {
    if (!el) return [];
    const nested = el.querySelectorAll("a, h1, h2, h3, h4, h5, h6, p, span, [contenteditable='true']");
    if (nested.length > 0) return Array.from(nested);
    return [el];
  }, []);

  const runCommand = useCallback(
    (command, commandValue = null) => {
      if (disabled || rawHtmlMode) return;
      restoreSelection();

      const selection = window.getSelection();
      const hasExpandedText =
        selection &&
        selection.rangeCount > 0 &&
        !selection.isCollapsed &&
        isEditorSelection(selection.getRangeAt(0));

      try {
        if (command !== "removeFormat" && command !== "formatBlock") {
          document.execCommand("styleWithCSS", false, true);
        }
        document.execCommand(command, false, commandValue);
      } catch (error) {
        console.error("Editor command failed: " + command, error);
      }

      if (!hasExpandedText && activeElement?.element) {
        const el = activeElement.element;
        const targets = getEditableTargetsForActive(el);
        if (command === "bold") {
          targets.forEach((t) => {
            const isBold = t.style.fontWeight === "bold" || parseInt(t.style.fontWeight, 10) >= 700;
            t.style.fontWeight = isBold ? "normal" : "bold";
          });
        } else if (command === "italic") {
          targets.forEach((t) => {
            t.style.fontStyle = t.style.fontStyle === "italic" ? "normal" : "italic";
          });
        } else if (command === "underline") {
          targets.forEach((t) => {
            t.style.textDecoration = t.style.textDecoration.includes("underline") ? "none" : "underline";
          });
        } else if (command === "strikeThrough") {
          targets.forEach((t) => {
            t.style.textDecoration = t.style.textDecoration.includes("line-through")
              ? "none"
              : "line-through";
          });
        } else if (command === "justifyLeft") {
          el.style.textAlign = "left";
        } else if (command === "justifyCenter") {
          el.style.textAlign = "center";
        } else if (command === "justifyRight") {
          el.style.textAlign = "right";
        } else if (command === "removeFormat") {
          targets.forEach((t) => {
            t.style.fontWeight = "";
            t.style.fontStyle = "";
            t.style.textDecoration = "";
          });
        }
      }

      synchroniseEditorValue();
    },
    [
      disabled,
      rawHtmlMode,
      restoreSelection,
      isEditorSelection,
      activeElement,
      getEditableTargetsForActive,
      synchroniseEditorValue,
    ]
  );

  const applyFontSize = useCallback(
    (sizePx) => {
      if (disabled || rawHtmlMode) return;
      setSelectedFontSize(sizePx);
      restoreSelection();

      const selection = window.getSelection();
      const hasExpandedText =
        selection &&
        selection.rangeCount > 0 &&
        !selection.isCollapsed &&
        isEditorSelection(selection.getRangeAt(0));

      if (hasExpandedText && editorRef.current) {
        try {
          document.execCommand("styleWithCSS", false, false);
          document.execCommand("fontSize", false, "7");
          const fontTags = editorRef.current.querySelectorAll('font[size="7"]');
          let lastSpan = null;
          fontTags.forEach((fontEl) => {
            const span = document.createElement("span");
            span.style.fontSize = sizePx;
            span.style.lineHeight = "1.35";
            while (fontEl.firstChild) {
              span.appendChild(fontEl.firstChild);
            }
            fontEl.parentNode?.replaceChild(span, fontEl);
            lastSpan = span;
          });
          if (lastSpan) {
            const newRange = document.createRange();
            newRange.selectNodeContents(lastSpan);
            selection.removeAllRanges();
            selection.addRange(newRange);
            savedSelectionRef.current = newRange.cloneRange();
          }
        } catch (err) {
          console.error("Failed to apply font size:", err);
        }
      } else if (activeElement?.element) {
        const targets = getEditableTargetsForActive(activeElement.element);
        targets.forEach((t) => {
          t.style.fontSize = sizePx;
        });
      } else if (selection && selection.rangeCount > 0 && isEditorSelection(selection.getRangeAt(0))) {
        const range = selection.getRangeAt(0);
        const span = document.createElement("span");
        span.style.fontSize = sizePx;
        span.style.lineHeight = "1.35";
        span.innerHTML = "&#8203;";
        range.insertNode(span);
        const newRange = document.createRange();
        newRange.setStart(span.firstChild, 1);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
        savedSelectionRef.current = newRange.cloneRange();
      }

      synchroniseEditorValue();
    },
    [
      disabled,
      rawHtmlMode,
      restoreSelection,
      isEditorSelection,
      activeElement,
      getEditableTargetsForActive,
      synchroniseEditorValue,
    ]
  );

  const applyFontFamily = useCallback(
    (fontValue) => {
      if (disabled || rawHtmlMode) return;
      setSelectedFontFamily(fontValue);
      restoreSelection();

      const selection = window.getSelection();
      const hasExpandedText =
        selection &&
        selection.rangeCount > 0 &&
        !selection.isCollapsed &&
        isEditorSelection(selection.getRangeAt(0));

      if (hasExpandedText) {
        try {
          document.execCommand("styleWithCSS", false, true);
          document.execCommand("fontName", false, fontValue);
        } catch (err) {
          console.error("Failed to apply font family:", err);
        }
      } else if (activeElement?.element) {
        activeElement.element.style.fontFamily = fontValue;
        const targets = getEditableTargetsForActive(activeElement.element);
        targets.forEach((t) => {
          t.style.fontFamily = fontValue;
        });
      } else {
        try {
          document.execCommand("styleWithCSS", false, true);
          document.execCommand("fontName", false, fontValue);
        } catch (err) {
          console.error("Failed to apply font family:", err);
        }
      }

      synchroniseEditorValue();
    },
    [
      disabled,
      rawHtmlMode,
      restoreSelection,
      isEditorSelection,
      activeElement,
      getEditableTargetsForActive,
      synchroniseEditorValue,
    ]
  );

  const applyBlockFormat = useCallback(
    (tagValue) => {
      if (disabled || rawHtmlMode) return;
      setSelectedBlockFormat(tagValue);
      runCommand("formatBlock", tagValue);
    },
    [disabled, rawHtmlMode, runCommand]
  );

  const handleToolbarMouseDown = (event) => {
    event.preventDefault();
  };

  const handleEditorInput = () => {
    synchroniseEditorValue({ typing: true });
  };

  const handleEditorBlur = () => {
    saveSelection();
    cleanupEmptyGridBoxes(null);
    if (!editorRef.current) return;
    emitChange(editorRef.current.innerHTML);
  };

  const handleToggleCodeMode = () => {
    if (disabled) return;
    if (!rawHtmlMode) {
      cleanupEmptyGridBoxes(null);
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

  const handleRawHtmlCode = (updatedHtml) => {
    setRawHtmlCode(updatedHtml);
    emitChange(updatedHtml);
  };

  const handleToggleExpand = () => {
    if (!rawHtmlMode && editorRef.current) {
      cleanupEmptyGridBoxes(null);
      const latest = editorRef.current.innerHTML;
      internalHtmlRef.current = latest;
      emitChange(latest);
    }
    if (rawHtmlMode) {
      internalHtmlRef.current = rawHtmlCode;
    }
    if (isControlledExpand) {
      onToggleExpand();
    } else {
      setInternalExpanded((previousValue) => !previousValue);
    }
  };

  const insertLink = () => {
    saveSelection();
    const url = prompt(
      "Enter Destination URL (e.g., /my-training):",
      MY_TRAINING_ROUTE
    );
    if (url) {
      // A script URL would run in the app when the page is edited or previewed.
      if (isScriptUrl(url)) {
        showToast("That link type is not allowed. Use a web address.");
        return;
      }
      runCommand("createLink", url);
    }
  };

  const insertFxPlaceholder = (param) => {
    setShowFxMenu(false);
    if (disabled || rawHtmlMode) return;
    restoreSelection();
    const spanHtml =
      '<span data-vshield-fx="true" style="background-color: rgba(153,0,153,0.12); color: #990099; font-weight: bold; padding: 1px 5px; border-radius: 4px; font-family: monospace;">' +
      param.label +
      "</span>&nbsp;";
    document.execCommand("insertHTML", false, spanHtml);
    synchroniseEditorValue();
  };

  const insertTextBox = () => {
    if (disabled || rawHtmlMode) return;
    const textId = newCanvasId("txt");
    const itemName = "Item " + itemCounterRef.current;
    itemCounterRef.current += 1;
    const textHtml =
      '<div id="' +
      textId +
      '" class="vshield-canvas-item vshield-textbox" data-type="text" data-item-name="' +
      itemName +
      '" style="position: relative; display: inline-block; width: 22%; min-width: 180px; padding: 8px 12px; margin: 0; cursor: move; border: 1px dashed rgba(100,116,139,0.35); border-radius: 6px; background-color: transparent; box-shadow: none; box-sizing: border-box;"><div contenteditable="true" spellcheck="true" style="outline: none; cursor: text; font-size: 14px; line-height: 1.5; color: #1E293B;">Click here to edit text...</div></div>';
    insertCanvasItem(textHtml);
    showToast("Text box added. Click inside to edit.");
  };

  const insertShape = (shapeType) => {
    setShowShapeMenu(false);
    if (disabled || rawHtmlMode) return;

    const shapeId = newCanvasId("shape");
    const itemName = "Item " + itemCounterRef.current;
    itemCounterRef.current += 1;
    let shapeHtml;

    switch (shapeType) {
      case "circle":
        shapeHtml =
          '<div id="' +
          shapeId +
          '" class="vshield-canvas-item" data-type="shape" data-item-name="' +
          itemName +
          '" style="position: relative; display: inline-flex; align-items: center; justify-content: center; width: 120px; height: 120px; background-color: #E60000; border-radius: 50%; margin: 0; cursor: move; vertical-align: middle; text-align: center; box-shadow: none; box-sizing: border-box;"><div contenteditable="true" spellcheck="false" style="outline: none; max-width: 85%; word-break: break-word; color: #FFFFFF; font-weight: bold; font-size: 13px; cursor: text;">Shape Text</div></div>';
        break;
      case "rounded":
        shapeHtml =
          '<div id="' +
          shapeId +
          '" class="vshield-canvas-item" data-type="shape" data-item-name="' +
          itemName +
          '" style="position: relative; display: inline-flex; align-items: center; justify-content: center; width: 20%; height: 80px; background-color: #2563EB; border-radius: 12px; margin: 0; cursor: move; vertical-align: middle; text-align: center; box-shadow: none; box-sizing: border-box;"><div contenteditable="true" spellcheck="false" style="outline: none; max-width: 90%; word-break: break-word; color: #FFFFFF; font-weight: bold; font-size: 13px; cursor: text;">Shape Text</div></div>';
        break;
      case "ellipse":
        shapeHtml =
          '<div id="' +
          shapeId +
          '" class="vshield-canvas-item" data-type="shape" data-item-name="' +
          itemName +
          '" style="position: relative; display: inline-flex; align-items: center; justify-content: center; width: 18%; height: 50px; background-color: #16A34A; border-radius: 9999px; margin: 0; cursor: move; vertical-align: middle; text-align: center; box-shadow: none; box-sizing: border-box;"><div contenteditable="true" spellcheck="false" style="outline: none; max-width: 90%; word-break: break-word; color: #FFFFFF; font-weight: bold; font-size: 13px; cursor: text;">Security Badge</div></div>';
        break;
      case "divider":
        shapeHtml =
          '<div id="' +
          shapeId +
          '" class="vshield-canvas-item" data-type="shape" data-item-name="' +
          itemName +
          '" style="position: relative; display: block; width: 100%; height: 4px; background-color: #E2E8F0; margin: 12px 0; cursor: move; box-shadow: none; box-sizing: border-box;"></div>';
        break;
      case "card":
        shapeHtml =
          '<div id="' +
          shapeId +
          '" class="vshield-canvas-item" data-type="shape" data-item-name="' +
          itemName +
          '" style="position: relative; display: flex; align-items: center; justify-content: center; width: 100%; min-height: 70px; padding: 14px 20px; background-color: #FEF2F2; border-left: 5px solid #E60000; border-radius: 0px; margin: 0; cursor: move; box-shadow: none; text-align: center; box-sizing: border-box;"><div contenteditable="true" spellcheck="false" style="outline: none; width: 100%; color: #991B1B; font-size: 13px; font-weight: 600; cursor: text;">Notice: This was a simulated phishing exercise conducted by Information Security.</div></div>';
        break;
      case "rect":
      default:
        shapeHtml =
          '<div id="' +
          shapeId +
          '" class="vshield-canvas-item" data-type="shape" data-item-name="' +
          itemName +
          '" style="position: relative; display: inline-flex; align-items: center; justify-content: center; width: 20%; height: 90px; background-color: #475569; border-radius: 0px; margin: 0; cursor: move; vertical-align: middle; text-align: center; box-shadow: none; box-sizing: border-box;"><div contenteditable="true" spellcheck="false" style="outline: none; max-width: 90%; word-break: break-word; color: #FFFFFF; font-weight: bold; font-size: 13px; cursor: text;">Shape Text</div></div>';
        break;
    }

    insertCanvasItem(shapeHtml);
    showToast("Shape added. Stretch to canvas edge for full-width responsive fit.");
  };

  const insertButton = (buttonShape) => {
    setShowButtonMenu(false);
    if (disabled || rawHtmlMode) return;

    const buttonId = newCanvasId("btn");
    const itemName = "Item " + itemCounterRef.current;
    itemCounterRef.current += 1;
    let borderRadius = "6px";
    if (buttonShape === "pill") borderRadius = "9999px";
    if (buttonShape === "rounded") borderRadius = "12px";
    if (buttonShape === "sharp") borderRadius = "0px";
    if (buttonShape === "soft") borderRadius = "8px";

    const buttonHtml =
      '<div id="' +
      buttonId +
      '" class="vshield-canvas-item vshield-custom-btn" data-type="button" data-item-name="' +
      itemName +
      '" data-action="training" data-url="' +
      MY_TRAINING_ROUTE +
      '" style="position: relative; display: inline-block; margin: 0; cursor: move; user-select: none; box-shadow: none; box-sizing: border-box;"><a href="' +
      MY_TRAINING_ROUTE +
      '" target="_top" onclick="return false;" style="display: inline-block; padding: 10px 26px; background-color: #E60000; color: #FFFFFF; font-family: \'Vodafone ExB\', Arial, sans-serif; font-size: 13px; font-weight: 800; text-decoration: none; border-radius: ' +
      borderRadius +
      '; text-align: center; border: none; cursor: pointer; box-shadow: none;" contenteditable="true" spellcheck="false">Go to My Training</a></div>';

    insertCanvasItem(buttonHtml);
    showToast("Button added. Click to edit text or set On Click.");
  };

  const insertLandingPageElement = (elementId) => {
    setShowElementsMenu(false);
    if (disabled || rawHtmlMode) return;

    const elemId = newCanvasId("elem");
    const itemName = "Item " + itemCounterRef.current;
    itemCounterRef.current += 1;
    let elemHtml;

    switch (elementId) {
      case "oops-hero":
        elemHtml =
          '<div id="' +
          elemId +
          '" class="vshield-canvas-item" data-type="card" data-item-name="' +
          itemName +
          '" style="position: relative; display: block; width: 100%; padding: 28px 32px; background-color: #E60000; margin: 0; font-family: sans-serif; text-align: center; cursor: move; box-shadow: none; box-sizing: border-box;"><h2 contenteditable="true" style="outline: none; margin: 0; font-size: 24px; font-weight: 900; color: #FFFFFF;">Oops! You\'ve Been Phished!</h2><p contenteditable="true" style="outline: none; margin: 6px 0 0 0; font-size: 13px; color: #FEE2E2;">Relax — this was a safe phishing simulation run by Information Security.</p></div>';
        break;
      case "red-flags-box":
        elemHtml =
          '<div id="' +
          elemId +
          '" class="vshield-canvas-item" data-type="card" data-item-name="' +
          itemName +
          '" style="position: relative; display: block; width: 100%; padding: 20px 24px; background-color: #FFF1F2; border-left: 5px solid #E11D48; margin: 0; font-family: sans-serif; cursor: move; box-shadow: none; box-sizing: border-box;"><h4 contenteditable="true" style="outline: none; margin: 0 0 8px 0; font-size: 14.5px; font-weight: 800; color: #9F1239;">🚩 Phishing Red Flags You Missed</h4><p contenteditable="true" style="outline: none; margin: 0 0 4px 0; font-size: 12.5px; color: #881337;">• Look closely at the sender\'s address and external domain.</p><p contenteditable="true" style="outline: none; margin: 0 0 4px 0; font-size: 12.5px; color: #881337;">• Be cautious of artificial urgency or threats of account lockout.</p><p contenteditable="true" style="outline: none; margin: 0; font-size: 12.5px; color: #881337;">• Hover over buttons and links before clicking to inspect the real URL.</p></div>';
        break;
      case "what-happened":
        elemHtml =
          '<div id="' +
          elemId +
          '" class="vshield-canvas-item" data-type="card" data-item-name="' +
          itemName +
          '" style="position: relative; display: flex; gap: 18px; flex-wrap: wrap; width: 100%; padding: 16px 24px; margin: 0; font-family: sans-serif; cursor: move; box-shadow: none; box-sizing: border-box;"><div style="flex: 1; min-width: 240px; background-color: #F8FAFC; padding: 18px; border-radius: 10px; border: 1px solid #E2E8F0;"><h4 contenteditable="true" style="outline: none; margin: 0 0 6px 0; font-size: 14px; font-weight: 800; color: #0F172A;">What Happened?</h4><p contenteditable="true" style="outline: none; margin: 0; font-size: 12.5px; color: #475569; line-height: 1.5;">You interacted with a simulated phishing campaign designed to strengthen organizational resilience against cyber threats.</p></div><div style="flex: 1; min-width: 240px; background-color: #F8FAFC; padding: 18px; border-radius: 10px; border: 1px solid #E2E8F0;"><h4 contenteditable="true" style="outline: none; margin: 0 0 6px 0; font-size: 14px; font-weight: 800; color: #0F172A;">What Should I Do Next?</h4><p contenteditable="true" style="outline: none; margin: 0; font-size: 12.5px; color: #475569; line-height: 1.5;">Complete your short assigned awareness module on the My Training page to learn how to spot and report similar lures.</p></div></div>';
        break;
      case "training-cta":
        elemHtml =
          '<div id="' +
          elemId +
          '" class="vshield-canvas-item" data-type="card" data-item-name="' +
          itemName +
          '" style="position: relative; display: block; width: 100%; padding: 20px 24px; background-color: #F0F9FF; border-top: 1px solid #BAE6FD; border-bottom: 1px solid #BAE6FD; margin: 0; font-family: sans-serif; cursor: move; box-shadow: none; box-sizing: border-box;"><div style="display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap;"><div style="flex: 1; min-width: 220px;"><h4 contenteditable="true" style="outline: none; margin: 0 0 4px 0; font-size: 14.5px; font-weight: 800; color: #0369A1;">Assigned Security Awareness Training</h4><p contenteditable="true" style="outline: none; margin: 0; font-size: 12.5px; color: #0C4A6E;">A quick 3-minute micro-learning module has been assigned to your profile.</p></div><div class="vshield-canvas-item vshield-custom-btn" data-type="button" data-action="training" data-url="' +
          MY_TRAINING_ROUTE +
          '" style="cursor: move;"><a href="' +
          MY_TRAINING_ROUTE +
          '" target="_top" onclick="return false;" style="background-color: #E60000; color: #FFFFFF; text-decoration: none; padding: 10px 24px; border-radius: 6px; font-size: 12.5px; font-weight: 800; white-space: nowrap; display: inline-block; cursor: pointer;" contenteditable="true">Go to My Training</a></div></div></div>';
        break;
      case "simulation-footer":
      default:
        elemHtml =
          '<div id="' +
          elemId +
          '" class="vshield-canvas-item" data-type="card" data-item-name="' +
          itemName +
          '" style="position: relative; display: block; width: 100%; padding: 18px 24px; background-color: #F8FAFC; border-top: 1px solid #E2E8F0; margin: 0; font-family: sans-serif; text-align: center; cursor: move; box-shadow: none; box-sizing: border-box;"><p contenteditable="true" style="outline: none; margin: 0; font-size: 11px; color: #64748B; line-height: 1.5;">This page is part of an authorized VShield Phishing Awareness Simulation. No sensitive credentials were captured or stored.</p></div>';
        break;
    }

    insertCanvasItem(elemHtml);
    showToast("Landing page element inserted.");
  };

  const handleImageUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file || !editorRef.current) return;

    const allowedImageTypes = [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/gif",
      "image/webp",
      "image/svg+xml",
    ];

    if (!allowedImageTypes.includes(file.type)) {
      showToast("Please select a valid image file.");
      event.target.value = "";
      return;
    }

    // Embedded images are saved inside the page, which must stay under
    // MAX_LANDING_BYTES to be saved and shown.
    if (file.size > MAX_EMBEDDED_IMAGE_BYTES) {
      showToast(
        "Image must be under " + Math.round(MAX_EMBEDDED_IMAGE_BYTES / 1024) +
          " KB so the landing page stays within the " +
          Math.round(MAX_LANDING_BYTES / 1024) + " KB limit."
      );
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const imageSource = readerEvent.target?.result;
      if (typeof imageSource !== "string") {
        showToast("Unable to read the selected image.");
        return;
      }

      const imageId = newCanvasId("img");
      const itemName = "Item " + itemCounterRef.current;
      itemCounterRef.current += 1;
      const imgHtml =
        '<div id="' +
        imageId +
        '" class="vshield-canvas-item" data-type="image" data-item-name="' +
        itemName +
        '" style="position: relative; display: inline-block; width: 25%; margin: 0; cursor: move; text-align: center; box-shadow: none; box-sizing: border-box;"><img src="' +
        imageSource +
        '" alt="' +
        (file.name || "Image") +
        '" style="display: block; width: 100%; height: auto; border-radius: 8px; pointer-events: none; box-shadow: none;" /></div>';

      insertCanvasItem(imgHtml);
      showToast("Image inserted. Click to resize or move.");
    };

    reader.onerror = () => {
      showToast("Unable to read the selected image.");
    };

    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const selectSingleCanvasItem = useCallback((canvasItem) => {
    if (!canvasItem) {
      setActiveElement(null);
      return;
    }
    const scale = getEffectiveScale(stageRef.current);
    const rect = canvasItem.getBoundingClientRect();
    const logicalWidth = rect.width / scale;
    const logicalHeight = rect.height / scale;

    const innerA = canvasItem.querySelector("a");
    const innerImg = canvasItem.querySelector("img");
    const currentBg = innerA
      ? innerA.style.backgroundColor
      : canvasItem.style.backgroundColor ||
        window.getComputedStyle(canvasItem).backgroundColor;

    const elForRadius = innerA || innerImg || canvasItem;
    const currentRadius =
      elForRadius.style.borderRadius ||
      window.getComputedStyle(elForRadius).borderRadius ||
      "0px";

    setActiveElement({
      element: canvasItem,
      type: canvasItem.getAttribute("data-type") || "shape",
      width: logicalWidth,
      height: logicalHeight,
      color: currentBg,
      borderRadius: currentRadius,
    });
    setSelectedElements([canvasItem]);
    setAspectRatioText(calculateAspectRatio(logicalWidth, logicalHeight));
    setShowShadowMenu(false);
    setShowRoundedMenu(false);
    setShowBorderMenu(false);
  }, []);

  // =========================================================================
  // 🌟 GROUP & UNGROUP SELECTED ELEMENTS
  // =========================================================================
  const groupSelectedElements = useCallback(() => {
    if (!editorRef.current || selectedElements.length < 2) return;

    const topLevelSelected = selectedElements.filter(
      (el) =>
        editorRef.current.contains(el) &&
        !selectedElements.some((other) => other !== el && other.contains(el))
    );

    if (topLevelSelected.length < 2) {
      showToast("Select at least 2 separate elements to group.");
      return;
    }

    const firstEl = topLevelSelected[0];
    const parent = firstEl.parentNode || editorRef.current;

    const groupDiv = document.createElement("div");
    groupDiv.id = newCanvasId("grp");
    groupDiv.className = "vshield-canvas-item vshield-group-item";
    groupDiv.setAttribute("data-type", "group");
    const groupName = "Group " + itemCounterRef.current;
    itemCounterRef.current += 1;
    groupDiv.setAttribute("data-item-name", groupName);
    groupDiv.style.position = "relative";
    groupDiv.style.display = "block";
    groupDiv.style.width = "100%";
    groupDiv.style.padding = "0px";
    groupDiv.style.margin = "0px";
    groupDiv.style.cursor = "move";
    groupDiv.style.boxShadow = "none";
    groupDiv.style.boxSizing = "border-box";

    parent.insertBefore(groupDiv, firstEl);
    topLevelSelected.forEach((el) => {
      el.setAttribute("data-grouped-child", "true");
      groupDiv.appendChild(el);
    });

    synchroniseEditorValue();
    selectSingleCanvasItem(groupDiv);
    showToast("Grouped " + topLevelSelected.length + " elements into " + groupName + ".");
  }, [selectedElements, synchroniseEditorValue, selectSingleCanvasItem, showToast]);

  const ungroupActiveItem = useCallback(() => {
    if (!activeElement?.element) return;
    const groupEl = activeElement.element;
    if (!groupEl.classList.contains("vshield-group-item")) return;

    const parent = groupEl.parentNode;
    if (!parent) return;

    const children = Array.from(groupEl.children);
    children.forEach((child) => {
      child.removeAttribute("data-grouped-child");
      parent.insertBefore(child, groupEl);
    });
    groupEl.remove();

    setActiveElement(null);
    setSelectedElements([]);
    synchroniseEditorValue();
    showToast("Ungrouped elements.");
  }, [activeElement, synchroniseEditorValue, showToast]);

  const deleteSelectedElements = useCallback(() => {
    if (selectedElements.length === 0) return;
    selectedElements.forEach((el) => {
      if (el && el.parentNode) el.remove();
    });
    setSelectedElements([]);
    setActiveElement(null);
    synchroniseEditorValue();
    showToast("Deleted selected elements.");
  }, [selectedElements, synchroniseEditorValue, showToast]);

  // =========================================================================
  // 🌟 USED ITEMS PANE: RENAME, DELETE, REAL DOM + Z-INDEX DRAG REORDERING
  // =========================================================================
  const saveUsedItemName = (item) => {
    const trimmed = tempItemName.trim() || item.name;
    if (item.element) {
      item.element.setAttribute("data-item-name", trimmed);
    }
    setRenamingItemId(null);
    setTempItemName("");
    synchroniseEditorValue();
    showToast("Renamed to " + trimmed + ".");
  };

  const deleteUsedItem = (item) => {
    if (!item?.element) return;
    if (activeElement?.element === item.element) {
      setActiveElement(null);
    }
    setSelectedElements((prev) => prev.filter((el) => el !== item.element));
    item.element.remove();
    synchroniseEditorValue();
    showToast("Deleted " + item.name + ".");
  };

  const handleLayerDrop = (targetId) => {
    if (!draggedLayerId || draggedLayerId === targetId) {
      setDraggedLayerId(null);
      setDragOverLayerId(null);
      return;
    }

    const fromIndex = usedItems.findIndex((i) => i.id === draggedLayerId);
    const toIndex = usedItems.findIndex((i) => i.id === targetId);
    if (fromIndex === -1 || toIndex === -1) {
      setDraggedLayerId(null);
      setDragOverLayerId(null);
      return;
    }

    const moved = usedItems[fromIndex];
    const target = usedItems[toIndex];

    if (
      moved?.element &&
      target?.element &&
      target.element.parentNode &&
      !moved.element.contains(target.element) &&
      !target.element.contains(moved.element)
    ) {
      const targetParent = target.element.parentNode;
      if (toIndex < fromIndex) {
        targetParent.insertBefore(moved.element, target.element);
      } else {
        targetParent.insertBefore(moved.element, target.element.nextSibling);
      }
    }

    const reordered = [...usedItems];
    const [removed] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, removed);
    const total = reordered.length;
    reordered.forEach((item, idx) => {
      if (item.element) {
        if (!item.element.style.position || item.element.style.position === "static") {
          item.element.style.position = "relative";
        }
        item.element.style.zIndex = String(10 + (total - idx) * 2);
      }
    });

    setDraggedLayerId(null);
    setDragOverLayerId(null);
    synchroniseEditorValue();
    if (activeElement?.element === moved.element) {
      selectSingleCanvasItem(moved.element);
    }
    showToast(
      moved.name + (toIndex < fromIndex ? " moved above & forward." : " moved below & backward.")
    );
  };

  const toggleItemSelectionFromPane = (item, checked) => {
    if (!item?.element) return;
    setSelectedElements((prev) => {
      const next = checked
        ? Array.from(new Set([...prev, item.element]))
        : prev.filter((el) => el !== item.element);
      if (next.length === 1) {
        selectSingleCanvasItem(next[0]);
      } else {
        setActiveElement(null);
      }
      return next;
    });
  };

  // =========================================================================
  // 🌟 CANVAS GAP SPACING & GRID-MODE CLICK-ANYWHERE CURSOR
  // =========================================================================
  const placeCaretAtCanvasGap = useCallback(
    (clickY) => {
      const editor = editorRef.current;
      if (!editor) return;

      const children = Array.from(editor.children).filter(
        (el) => !el.classList.contains("vshield-grid-cursor-box")
      );

      const createSpacerP = () => {
        const p = document.createElement("p");
        p.setAttribute("data-vshield-spacer", "true");
        p.style.margin = "0 0 4px 0";
        p.style.minHeight = "18px";
        p.innerHTML = "<br>";
        return p;
      };

      if (children.length === 0) {
        const p = createSpacerP();
        editor.appendChild(p);
        editor.focus();
        placeCaretInElement(p, false);
        synchroniseEditorValue();
        return;
      }

      const firstEl = children[0];
      const firstRect = firstEl.getBoundingClientRect();
      if (clickY <= firstRect.top + 8) {
        if (firstEl.tagName === "P" && !firstEl.classList.contains("vshield-canvas-item")) {
          editor.focus();
          placeCaretInElement(firstEl, false);
          return;
        }
        const spacer = createSpacerP();
        editor.insertBefore(spacer, firstEl);
        editor.focus();
        placeCaretInElement(spacer, false);
        synchroniseEditorValue();
        return;
      }

      for (let i = 0; i < children.length; i++) {
        const rect = children[i].getBoundingClientRect();
        if (clickY < rect.top) {
          const prevEl = children[i - 1];
          if (
            prevEl &&
            prevEl.tagName === "P" &&
            !prevEl.classList.contains("vshield-canvas-item") &&
            !(prevEl.textContent || "").trim()
          ) {
            editor.focus();
            placeCaretInElement(prevEl, false);
            return;
          }
          const spacer = createSpacerP();
          editor.insertBefore(spacer, children[i]);
          editor.focus();
          placeCaretInElement(spacer, false);
          synchroniseEditorValue();
          return;
        }
      }

      const lastEl = children[children.length - 1];
      if (
        lastEl.tagName === "P" &&
        !lastEl.classList.contains("vshield-canvas-item") &&
        !(lastEl.textContent || "").trim()
      ) {
        editor.focus();
        placeCaretInElement(lastEl, false);
        return;
      }
      const trailingSpacer = createSpacerP();
      editor.appendChild(trailingSpacer);
      editor.focus();
      placeCaretInElement(trailingSpacer, false);
      synchroniseEditorValue();
    },
    [placeCaretInElement, synchroniseEditorValue]
  );

  const placeCursorOnGridCell = useCallback(
    (e) => {
      const editor = editorRef.current;
      if (!editor) return;

      const existingGridBox = e.target.closest(".vshield-grid-cursor-box");
      if (existingGridBox && editor.contains(existingGridBox)) {
        cleanupEmptyGridBoxes(existingGridBox);
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      cleanupEmptyGridBoxes(null);
      setActiveElement(null);
      setSelectedElements([]);
      setShowShadowMenu(false);
      setShowRoundedMenu(false);
      setShowBorderMenu(false);

      const scale = getEffectiveScale(stageRef.current);
      const editorRect = editor.getBoundingClientRect();
      const rawX = (e.clientX - editorRect.left) / scale;
      const rawY = (e.clientY - editorRect.top) / scale;

      const snappedX = Math.max(0, Math.floor(rawX / GRID_SIZE_PX) * GRID_SIZE_PX);
      const snappedY = Math.max(0, Math.floor(rawY / GRID_SIZE_PX) * GRID_SIZE_PX);

      const box = document.createElement("div");
      box.id = newCanvasId("grid-txt");
      box.className = "vshield-canvas-item vshield-grid-cursor-box";
      box.setAttribute("data-type", "text");
      const itemName = "Item " + itemCounterRef.current;
      itemCounterRef.current += 1;
      box.setAttribute("data-item-name", itemName);
      box.style.position = "absolute";
      box.style.left = ((snappedX / VarCanvasFixedWidthPx) * 100).toFixed(2) + "%";
      box.style.top = snappedY + "px";
      box.style.minWidth = "120px";
      box.style.minHeight = "20px";
      box.style.zIndex = "35";
      box.style.padding = "2px 4px";
      box.style.backgroundColor = "transparent";
      box.style.boxShadow = "none";
      box.style.cursor = "text";

      const inner = document.createElement("div");
      inner.setAttribute("contenteditable", "true");
      inner.setAttribute("spellcheck", "true");
      inner.style.outline = "none";
      inner.style.minWidth = "100px";
      inner.style.minHeight = "20px";
      inner.style.fontSize = selectedFontSize || "14px";
      inner.style.fontFamily = selectedFontFamily || "inherit";
      inner.style.lineHeight = "1.4";
      inner.style.color = "#0F172A";
      inner.style.cursor = "text";
      inner.innerHTML = "<br>";

      box.appendChild(inner);
      editor.appendChild(box);

      inner.focus();
      placeCaretInElement(inner, false);
      synchroniseEditorValue();
    },
    [
      cleanupEmptyGridBoxes,
      selectedFontSize,
      selectedFontFamily,
      placeCaretInElement,
      synchroniseEditorValue,
    ]
  );

  // =========================================================================
  // 🌟 MARQUEE DRAG-SELECTION ON CANVAS (Scale-Aware & Stage-Relative)
  // =========================================================================
  const handleStageMouseDown = (e) => {
    if (rawHtmlMode || disabled || showGridlines || e.button !== 0) return;
    const target = e.target;
    if (target.closest("[data-floating-control]")) return;

    const isCanvasBackground =
      target === editorRef.current || target === stageRef.current;
    if (!isCanvasBackground || !stageRef.current) return;

    const stageEl = stageRef.current;
    const scale = getEffectiveScale(stageEl);
    const stageRect = stageEl.getBoundingClientRect();
    const startX = (e.clientX - stageRect.left) / scale;
    const startY = (e.clientY - stageRect.top) / scale;
    let didDrag = false;

    const onMouseMove = (moveEvent) => {
      const currentX = (moveEvent.clientX - stageRect.left) / scale;
      const currentY = (moveEvent.clientY - stageRect.top) / scale;
      const width = Math.abs(currentX - startX);
      const height = Math.abs(currentY - startY);

      if (width > 6 || height > 6) {
        didDrag = true;
        marqueeActiveRef.current = true;
        setMarqueeRect({
          left: Math.min(startX, currentX),
          top: Math.min(startY, currentY),
          width,
          height,
        });
      }
    };

    const onMouseUp = (upEvent) => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);

      if (didDrag && editorRef.current && stageRef.current) {
        const endX = (upEvent.clientX - stageRect.left) / scale;
        const endY = (upEvent.clientY - stageRect.top) / scale;
        const boxLeft = Math.min(startX, endX) * scale + stageRect.left;
        const boxRight = Math.max(startX, endX) * scale + stageRect.left;
        const boxTop = Math.min(startY, endY) * scale + stageRect.top;
        const boxBottom = Math.max(startY, endY) * scale + stageRect.top;

        const candidates = Array.from(
          editorRef.current.querySelectorAll(".vshield-canvas-item")
        ).filter((el) => {
          const parentGroup = el.parentElement?.closest(".vshield-group-item");
          if (parentGroup && editorRef.current.contains(parentGroup)) return false;
          const parentItem = el.parentElement?.closest(".vshield-canvas-item");
          if (parentItem && editorRef.current.contains(parentItem)) {
            const pr = parentItem.getBoundingClientRect();
            const parentIntersects =
              pr.left < boxRight &&
              pr.right > boxLeft &&
              pr.top < boxBottom &&
              pr.bottom > boxTop;
            if (parentIntersects) return false;
          }
          const r = el.getBoundingClientRect();
          return (
            r.left < boxRight &&
            r.right > boxLeft &&
            r.top < boxBottom &&
            r.bottom > boxTop
          );
        });

        setMarqueeRect(null);

        if (candidates.length === 1) {
          selectSingleCanvasItem(candidates[0]);
        } else if (candidates.length >= 2) {
          setActiveElement(null);
          setSelectedElements(candidates);
          showToast(
            "Selected " + candidates.length + " elements. Click Group to combine."
          );
        }

        setTimeout(() => {
          marqueeActiveRef.current = false;
        }, 40);
      } else {
        setMarqueeRect(null);
      }
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const handleCanvasClick = (e) => {
    // Links on the canvas are for editing, never for following.
    if (e.target.closest?.("a")) e.preventDefault();
    if (rawHtmlMode || disabled || marqueeActiveRef.current) return;
    const target = e.target;
    if (target.closest("[data-floating-control]")) {
      return;
    }

    if (showGridlines) {
      placeCursorOnGridCell(e);
      return;
    }

    cleanupEmptyGridBoxes(null);

    const groupItem = target.closest(".vshield-group-item");
    const canvasItem =
      (groupItem && editorRef.current?.contains(groupItem) ? groupItem : null) ||
      target.closest(".vshield-canvas-item") ||
      (target.tagName === "IMG" ? target.parentElement : null);

    if (canvasItem && editorRef.current?.contains(canvasItem)) {
      e.stopPropagation();

      if (e.shiftKey || e.ctrlKey || e.metaKey) {
        const next = selectedElements.includes(canvasItem)
          ? selectedElements.filter((el) => el !== canvasItem)
          : [...selectedElements, canvasItem];
        if (next.length === 1) {
          selectSingleCanvasItem(next[0]);
        } else {
          setSelectedElements(next);
          setActiveElement(null);
        }
        return;
      }

      selectSingleCanvasItem(canvasItem);
      // Clicking an item itself (not its text) selects it as an object:
      // take the caret out so Delete, arrow keys and Ctrl+D act on it.
      if (target === canvasItem || target.tagName === "IMG") {
        window.getSelection()?.removeAllRanges();
        editorRef.current?.blur();
      }
    } else {
      setActiveElement(null);
      setSelectedElements([]);
      setShowShadowMenu(false);
      setShowRoundedMenu(false);
      setShowBorderMenu(false);

      if (target === editorRef.current || target === stageRef.current) {
        placeCaretAtCanvasGap(e.clientY);
      }
    }
  };

  // =========================================================================
  // 🌟 SCALE-AWARE DRAG WITH REAL-TIME BLUE OVERLAY TRACKING & EDGE SNAP
  // =========================================================================
  const startDragItem = (e) => {
    if (!activeElement?.element || !stageRef.current) return;
    e.preventDefault();
    e.stopPropagation();

    const targetEl = activeElement.element;
    const stageEl = stageRef.current;
    const scale = getEffectiveScale(stageEl);
    const initialX = e.clientX;
    const initialY = e.clientY;

    const stageRect = stageEl.getBoundingClientRect();
    const targetRect = targetEl.getBoundingClientRect();

    const currentLeftPx =
      targetEl.style.left && targetEl.style.left.endsWith("%")
        ? (parseFloat(targetEl.style.left) / 100) * VarCanvasFixedWidthPx
        : parseFloat(targetEl.style.left) || 0;
    const currentTop = parseFloat(targetEl.style.top) || 0;

    const targetWidthLogical = targetRect.width / scale;
    const baseLeft = (targetRect.left - stageRect.left) / scale - currentLeftPx;
    const baseTop = (targetRect.top - stageRect.top) / scale - currentTop;

    const minLeft = -baseLeft;
    const maxLeft = Math.max(minLeft, VarCanvasFixedWidthPx - baseLeft - targetWidthLogical);
    const minTop = -baseTop;

    const isAbs = targetEl.style.position === "absolute";

    const onMouseMove = (moveEvent) => {
      const deltaX = (moveEvent.clientX - initialX) / scale;
      const deltaY = (moveEvent.clientY - initialY) / scale;

      let nextLeft = Math.max(minLeft, Math.min(maxLeft, currentLeftPx + deltaX));
      let nextTop = Math.max(minTop, currentTop + deltaY);

      // Snap cleanly to left/top walls so no stray padding appears in preview
      if (Math.abs(baseLeft + nextLeft) <= 8) {
        nextLeft = -baseLeft;
        targetEl.style.marginLeft = "0px";
      }
      if (Math.abs(baseTop + nextTop) <= 8) {
        nextTop = -baseTop;
        targetEl.style.marginTop = "0px";
      }

      if (!isAbs) {
        targetEl.style.position = "relative";
      }
      const leftPct = (nextLeft / VarCanvasFixedWidthPx) * 100;
      targetEl.style.left = Math.abs(leftPct) < 0.05 ? "0px" : leftPct.toFixed(2) + "%";
      targetEl.style.top = Math.abs(nextTop) < 1 ? "0px" : Math.round(nextTop) + "px";
      checkSafeZoneOverflow();
      bumpOverlay();
    };

    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      synchroniseEditorValue();
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  // =========================================================================
  // 🌟 SCALE-AWARE RESPONSIVE RESIZE (Always % width; snaps to 100% edge-to-edge)
  // =========================================================================
  const startResizeItem = (e, corner) => {
    if (!activeElement?.element || !stageRef.current) return;
    e.preventDefault();
    e.stopPropagation();

    const targetEl = activeElement.element;
    const stageEl = stageRef.current;
    const scale = getEffectiveScale(stageEl);
    const stageRect = stageEl.getBoundingClientRect();
    const elemRect = targetEl.getBoundingClientRect();
    const isImage =
      targetEl.getAttribute("data-type") === "image" ||
      targetEl.querySelector("img");
    const innerImg = targetEl.querySelector("img");
    const innerA = targetEl.querySelector("a");

    const startWidth = elemRect.width / scale;
    const startHeight = elemRect.height / scale;
    const startX = e.clientX;
    const startY = e.clientY;
    const offsetFromLeft = Math.max(0, (elemRect.left - stageRect.left) / scale);
    const offsetFromTop = Math.max(0, (elemRect.top - stageRect.top) / scale);

    const onMouseMove = (moveEvent) => {
      const deltaX = (moveEvent.clientX - startX) / scale;
      const deltaY = (moveEvent.clientY - startY) / scale;

      let newWidth = Math.max(
        40,
        startWidth + (corner.includes("right") ? deltaX : -deltaX)
      );
      newWidth = Math.min(newWidth, VarCanvasFixedWidthPx);

      let newHeight = Math.max(
        24,
        startHeight + (corner.includes("bottom") ? deltaY : -deltaY)
      );

      const reachedFullWidth =
        newWidth >= VarCanvasFixedWidthPx - 12 ||
        (corner.includes("right") &&
          offsetFromLeft + newWidth >= VarCanvasFixedWidthPx - 12 &&
          offsetFromLeft <= 12);

      targetEl.style.boxSizing = "border-box";
      targetEl.style.maxWidth = "100%";

      if (reachedFullWidth) {
        newWidth = VarCanvasFixedWidthPx;
        targetEl.style.width = "100%";
        targetEl.style.left = "0px";
        targetEl.style.marginLeft = "0px";
        targetEl.style.marginRight = "0px";
        if (offsetFromTop <= 12) {
          targetEl.style.marginTop = "0px";
          targetEl.style.top = "0px";
        }
      } else {
        const widthPct = Math.min(100, (newWidth / VarCanvasFixedWidthPx) * 100);
        targetEl.style.width = widthPct.toFixed(2) + "%";
      }

      if (innerA && targetEl.getAttribute("data-type") === "button") {
        innerA.style.width = "100%";
        innerA.style.boxSizing = "border-box";
        innerA.style.minHeight = Math.round(newHeight) + "px";
        innerA.style.display = "flex";
        innerA.style.alignItems = "center";
        innerA.style.justifyContent = "center";
      } else if (!isImage) {
        targetEl.style.height = Math.round(newHeight) + "px";
      } else if (innerImg) {
        innerImg.style.width = "100%";
        innerImg.style.height = "auto";
        newHeight = innerImg.offsetHeight;
      }

      setActiveElement((prev) =>
        prev ? { ...prev, width: newWidth, height: newHeight } : null
      );
      setAspectRatioText(calculateAspectRatio(newWidth, newHeight));
      checkSafeZoneOverflow();
      bumpOverlay();
    };

    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      synchroniseEditorValue();
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const setDimensionsCm = (type, valCm) => {
    if (!activeElement?.element || isNaN(valCm)) return;
    const targetEl = activeElement.element;
    const isImage =
      targetEl.getAttribute("data-type") === "image" ||
      targetEl.querySelector("img");
    const innerA =
      targetEl.getAttribute("data-type") === "button" ? targetEl.querySelector("a") : null;
    const innerImg = targetEl.querySelector("img");
    const newPx = Math.max(20, Math.round(parseFloat(valCm) * PX_PER_CM));

    if (type === "width") {
      const clampedPx = Math.min(newPx, VarCanvasFixedWidthPx);
      const isFull = clampedPx >= VarCanvasFixedWidthPx - 12;
      targetEl.style.boxSizing = "border-box";
      targetEl.style.maxWidth = "100%";
      if (isFull) {
        targetEl.style.width = "100%";
        targetEl.style.left = "0px";
        targetEl.style.marginLeft = "0px";
        targetEl.style.marginRight = "0px";
      } else {
        targetEl.style.width = ((clampedPx / VarCanvasFixedWidthPx) * 100).toFixed(2) + "%";
      }
      if (innerA) innerA.style.width = "100%";
      if (innerImg) innerImg.style.width = "100%";
      setActiveElement((prev) => (prev ? { ...prev, width: clampedPx } : null));
    } else {
      if (!isImage) {
        targetEl.style.height = newPx + "px";
      }
      if (innerA) innerA.style.minHeight = newPx + "px";
      setActiveElement((prev) => (prev ? { ...prev, height: newPx } : null));
    }
    synchroniseEditorValue();
  };

  const updateActiveItemColor = (newColor) => {
    if (!activeElement?.element) return;
    const el = activeElement.element;
    const isBtnWrapper = el.getAttribute("data-type") === "button";
    const innerA = isBtnWrapper ? el.querySelector("a") : null;

    if (innerA) {
      innerA.style.backgroundColor = newColor;
    } else {
      el.style.backgroundColor = newColor;
    }
    setActiveElement((prev) => (prev ? { ...prev, color: newColor } : null));
    synchroniseEditorValue();
  };

  const handleEyedropperForObject = async () => {
    if (!window.EyeDropper) {
      showToast("EyeDropper is not supported in this browser.");
      return;
    }
    try {
      const eyeDropper = new window.EyeDropper();
      const result = await eyeDropper.open();
      if (result?.sRGBHex) {
        updateActiveItemColor(result.sRGBHex);
      }
    } catch {
      // Canceled
    }
  };

  const updateActiveItemShadow = (shadowValue) => {
    if (!activeElement?.element) return;
    const el = activeElement.element;
    const isBtnWrapper = el.getAttribute("data-type") === "button";
    const innerA = isBtnWrapper ? el.querySelector("a") : null;
    const target = innerA || el;

    target.style.boxShadow = shadowValue;
    setShowShadowMenu(false);
    synchroniseEditorValue();
    showToast("Shadow updated.");
  };

  const updateActiveItemRoundedness = (radiusValue, closeMenu = false) => {
    if (!activeElement?.element) return;
    const el = activeElement.element;
    const isBtnWrapper = el.getAttribute("data-type") === "button";
    const innerA = isBtnWrapper ? el.querySelector("a") : null;
    const innerImg = el.tagName === "IMG" ? el : el.querySelector(":scope > img");

    el.style.borderRadius = radiusValue;
    if (innerA) innerA.style.borderRadius = radiusValue;
    if (innerImg) innerImg.style.borderRadius = radiusValue;

    setActiveElement((prev) => (prev ? { ...prev, borderRadius: radiusValue } : null));
    if (closeMenu) {
      setShowRoundedMenu(false);
    }
    synchroniseEditorValue();
  };

  const updateActiveItemBorder = (styleType, widthValue, colorValue) => {
    if (!activeElement?.element) return;
    const el = activeElement.element;
    const isBtnWrapper = el.getAttribute("data-type") === "button";
    const innerA = isBtnWrapper ? el.querySelector("a") : null;
    const target = innerA || el;

    if (styleType !== undefined) target.style.borderStyle = styleType;
    if (widthValue !== undefined) target.style.borderWidth = widthValue;
    if (colorValue !== undefined) target.style.borderColor = colorValue;

    setShowBorderMenu(false);
    synchroniseEditorValue();
    showToast("Border updated.");
  };

  const updateZIndex = (action) => {
    if (!activeElement?.element) return;
    const target = activeElement.element;
    const currentZ = parseInt(target.style.zIndex, 10) || 10;
    if (action === "front") target.style.zIndex = "50";
    else if (action === "back") target.style.zIndex = "1";
    else if (action === "forward") target.style.zIndex = String(Math.min(50, currentZ + 2));
    else if (action === "backward") target.style.zIndex = String(Math.max(1, currentZ - 2));
    synchroniseEditorValue();
    showToast("Layer adjusted.");
  };

  const duplicateActiveItem = useCallback(() => {
    if (!activeElement?.element) return;
    const clone = activeElement.element.cloneNode(true);
    // Inner items get fresh ids and names too, or the copy and the original
    // would share them and select/rename the wrong one.
    clone.querySelectorAll("[id]").forEach((n) => n.removeAttribute("id"));
    clone
      .querySelectorAll(".vshield-canvas-item[data-item-name]")
      .forEach((n) => n.removeAttribute("data-item-name"));
    clone.id = newCanvasId("dup");
    const dupName = "Item " + itemCounterRef.current;
    itemCounterRef.current += 1;
    clone.setAttribute("data-item-name", dupName);

    const currentTop = parseFloat(activeElement.element.style.top) || 0;
    if (activeElement.element.style.position !== "absolute") {
      clone.style.position = "relative";
    }
    clone.style.top = currentTop + 12 + "px";

    activeElement.element.parentNode.insertBefore(clone, activeElement.element.nextSibling);
    synchroniseEditorValue();
    selectSingleCanvasItem(clone);
    showToast("Element duplicated.");
  }, [activeElement, synchroniseEditorValue, selectSingleCanvasItem, showToast]);

  const alignElement = (direction) => {
    if (!activeElement?.element || !stageRef.current) return;
    const target = activeElement.element;
    if (target.style.position !== "absolute") {
      target.style.position = "relative";
    }

    if (direction === "center-h") {
      const centerLeftPct = Math.max(
        0,
        ((VarCanvasFixedWidthPx - target.offsetWidth) / 2 / VarCanvasFixedWidthPx) * 100
      );
      target.style.left = centerLeftPct < 0.05 ? "0px" : centerLeftPct.toFixed(2) + "%";
    } else if (direction === "center-v") {
      const centerTop = Math.max(0, (SAFE_ZONE_HEIGHT_PX - target.offsetHeight) / 2);
      target.style.top = Math.round(centerTop) + "px";
    }
    synchroniseEditorValue();
    showToast("Aligned to center.");
  };

  const getCurrentRadius = () => {
    if (!activeElement?.element) return "0px";
    if (activeElement.borderRadius !== undefined) return activeElement.borderRadius;
    const innerA = activeElement.element.querySelector("a");
    const innerImg = activeElement.element.querySelector("img");
    const el = innerA || innerImg || activeElement.element;
    return el.style.borderRadius || window.getComputedStyle(el).borderRadius || "0px";
  };

  const deleteActiveItem = useCallback(() => {
    if (!activeElement?.element) return;
    activeElement.element.remove();
    setActiveElement(null);
    setSelectedElements([]);
    setShowShadowMenu(false);
    setShowRoundedMenu(false);
    setShowBorderMenu(false);
    synchroniseEditorValue();
    showToast("Item deleted.");
  }, [activeElement, synchroniseEditorValue, showToast]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Never hijack typing inside external form fields (Page Name, Description, Rename input, etc.)
      const tag = e.target?.tagName;
      if (rawHtmlMode || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        handleRedo();
        return;
      }

      if (activeElement?.element && !e.target?.isContentEditable) {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
          e.preventDefault();
          duplicateActiveItem();
          return;
        }
        if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
          e.preventDefault();
          const step = e.shiftKey ? 10 : 1;
          const targetEl = activeElement.element;
          const currentLeftPx =
            targetEl.style.left && targetEl.style.left.endsWith("%")
              ? (parseFloat(targetEl.style.left) / 100) * VarCanvasFixedWidthPx
              : parseFloat(targetEl.style.left) || 0;
          const currentTop = parseFloat(targetEl.style.top) || 0;

          let deltaX = 0;
          let deltaY = 0;
          if (e.key === "ArrowLeft") deltaX = -step;
          if (e.key === "ArrowRight") deltaX = step;
          if (e.key === "ArrowUp") deltaY = -step;
          if (e.key === "ArrowDown") deltaY = step;

          const newLeftPx = Math.max(0, currentLeftPx + deltaX);
          const newTop = Math.max(0, currentTop + deltaY);

          if (targetEl.style.position !== "absolute") {
            targetEl.style.position = "relative";
          }
          const leftPct = (newLeftPx / VarCanvasFixedWidthPx) * 100;
          targetEl.style.left = leftPct < 0.05 ? "0px" : leftPct.toFixed(2) + "%";
          targetEl.style.top = newTop + "px";
          synchroniseEditorValue();
          return;
        }
        if (e.key === "Delete") {
          e.preventDefault();
          deleteActiveItem();
          return;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    rawHtmlMode,
    activeElement,
    handleUndo,
    handleRedo,
    duplicateActiveItem,
    deleteActiveItem,
    synchroniseEditorValue,
  ]);

  const openActionModal = (e) => {
    e?.stopPropagation();
    if (!activeElement?.element) return;
    setActionConfigModal({
      open: true,
      element: activeElement.element,
      actionType: "training",
    });
  };

  // 🌟 ONLY "Attach My Training Page" — routes directly to MyTraining page
  const saveActionConfig = () => {
    const targetEl = actionConfigModal.element || activeElement?.element;
    if (!targetEl) return;

    const finalUrl = MY_TRAINING_ROUTE;
    targetEl.setAttribute("data-action", "training");
    targetEl.setAttribute("data-url", finalUrl);

    // A plain link, never an onclick: inline script would navigate the app
    // away while editing, and the served page blocks script anyway.
    const innerA = targetEl.querySelector("a");
    if (innerA) {
      innerA.setAttribute("href", finalUrl);
      innerA.setAttribute("target", "_top");
      innerA.setAttribute("data-action", "training");
      innerA.removeAttribute("onclick");
    } else {
      const link = document.createElement("a");
      link.setAttribute("href", finalUrl);
      link.setAttribute("target", "_top");
      link.setAttribute("data-action", "training");
      link.style.color = "inherit";
      link.style.textDecoration = "none";
      // display: contents keeps the item's own layout exactly as it was.
      link.style.display = "contents";
      while (targetEl.firstChild) link.appendChild(targetEl.firstChild);
      targetEl.appendChild(link);
      targetEl.removeAttribute("onclick");
      targetEl.style.cursor = "pointer";
    }

    setActionConfigModal({ open: false, element: null, actionType: "training" });
    synchroniseEditorValue();
    showToast("On Click attached to My Training (" + finalUrl + ").");
  };

  const editorIsEmpty =
    EMPTY_HTML_VALUES.includes((internalHtmlRef.current || "").trim().toLowerCase()) &&
    !editorRef.current?.querySelector(".vshield-canvas-item");

  const subtleToolbarBtnClass =
    "flex h-6 px-1.5 items-center gap-1 justify-center rounded border border-white/10 dark:border-black/10 bg-[#181A20] dark:bg-white text-slate-300 dark:text-slate-800 hover:bg-white/10 dark:hover:bg-slate-100 hover:text-white dark:hover:text-black transition-colors cursor-pointer text-[8.5px] font-bold shadow-xs flex-shrink-0 disabled:cursor-not-allowed disabled:opacity-40 select-none";

  // Shared Toolbar Controls
  const renderSharedTools = () => (
    <>
      <button
        type="button"
        disabled={disabled || rawHtmlMode || historyMeta.index <= 0}
        onClick={() => handleUndo()}
        className="p-1 rounded hover:bg-white/10 cursor-pointer text-slate-300 dark:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
        title="Undo (Ctrl+Z)"
      >
        <RotateCcw className="h-3 w-3" />
      </button>
      <button
        type="button"
        disabled={disabled || rawHtmlMode || historyMeta.index >= historyMeta.length - 1}
        onClick={() => handleRedo()}
        className="p-1 rounded hover:bg-white/10 cursor-pointer text-slate-300 dark:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
        title="Redo (Ctrl+Y)"
      >
        <RotateCw className="h-3 w-3" />
      </button>

      <div className="mx-0.5 h-3.5 w-px bg-white/20 flex-shrink-0" />

      <select
        value={String(selectedBlockFormat)}
        disabled={disabled || rawHtmlMode}
        onMouseDown={() => saveSelection()}
        onChange={(event) => applyBlockFormat(event.target.value)}
        className="px-1 py-0.5 rounded bg-[#181A20] dark:bg-white text-white dark:text-black border-white/20 dark:border-black/20 text-[8.5px] font-bold border outline-none cursor-pointer flex-shrink-0 max-w-[65px]"
        title="Paragraph format"
      >
        <option value="<p>">Paragraph</option>
        <option value="<h1>">Heading 1</option>
        <option value="<h2>">Heading 2</option>
        <option value="<h3>">Heading 3</option>
        <option value="<blockquote>">Quote</option>
      </select>

      <select
        value={String(selectedFontFamily)}
        disabled={disabled || rawHtmlMode}
        onMouseDown={() => saveSelection()}
        onChange={(event) => applyFontFamily(event.target.value)}
        className="px-1 py-0.5 rounded bg-[#181A20] dark:bg-white text-white dark:text-black border-white/20 dark:border-black/20 text-[8.5px] font-bold border outline-none cursor-pointer max-w-[74px] flex-shrink-0"
        title="Font family"
      >
        {FONT_OPTIONS.map((f) => (
          <option key={f.label} value={f.value}>
            {f.label}
          </option>
        ))}
      </select>

      <select
        value={String(selectedFontSize)}
        disabled={disabled || rawHtmlMode}
        onMouseDown={() => saveSelection()}
        onChange={(event) => applyFontSize(event.target.value)}
        className="px-1 py-0.5 rounded bg-[#181A20] dark:bg-white text-white dark:text-black border-white/20 dark:border-black/20 text-[8.5px] font-bold border outline-none cursor-pointer flex-shrink-0 max-w-[46px]"
        title="Font size"
      >
        {FONT_SIZES.map((s, idx) => (
          <option key={s.label + "-" + idx} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>

      <button
        type="button"
        disabled={disabled || rawHtmlMode}
        onMouseDown={(event) => handleToolbarMouseDown(event)}
        onClick={() => runCommand("bold")}
        className="p-1 rounded hover:bg-white/10 cursor-pointer bg-[#181A20] dark:bg-white text-white dark:text-black flex-shrink-0"
        title="Bold"
      >
        <Bold className="h-3 w-3" />
      </button>
      <button
        type="button"
        disabled={disabled || rawHtmlMode}
        onMouseDown={(event) => handleToolbarMouseDown(event)}
        onClick={() => runCommand("italic")}
        className="p-1 rounded hover:bg-white/10 cursor-pointer bg-[#181A20] dark:bg-white text-white dark:text-black flex-shrink-0"
        title="Italic"
      >
        <Italic className="h-3 w-3" />
      </button>
      <button
        type="button"
        disabled={disabled || rawHtmlMode}
        onMouseDown={(event) => handleToolbarMouseDown(event)}
        onClick={() => runCommand("underline")}
        className="p-1 rounded hover:bg-white/10 cursor-pointer bg-[#181A20] dark:bg-white text-white dark:text-black flex-shrink-0"
        title="Underline"
      >
        <Underline className="h-3 w-3" />
      </button>
      <button
        type="button"
        disabled={disabled || rawHtmlMode}
        onMouseDown={(event) => handleToolbarMouseDown(event)}
        onClick={() => runCommand("strikeThrough")}
        className="p-1 rounded hover:bg-white/10 cursor-pointer bg-[#181A20] dark:bg-white text-white dark:text-black flex-shrink-0"
        title="Strikethrough"
      >
        <Strikethrough className="h-3 w-3" />
      </button>
      <button
        type="button"
        disabled={disabled || rawHtmlMode}
        onMouseDown={(event) => handleToolbarMouseDown(event)}
        onClick={() => runCommand("removeFormat")}
        className="p-1 rounded hover:bg-white/10 cursor-pointer bg-[#181A20] dark:bg-white text-slate-400 hover:text-white dark:hover:text-black flex-shrink-0"
        title="Clear formatting"
      >
        <RemoveFormatting className="h-3 w-3" />
      </button>

      <div className="mx-0.5 h-3.5 w-px bg-white/20 flex-shrink-0" />

      <button
        type="button"
        disabled={disabled || rawHtmlMode}
        onMouseDown={(event) => handleToolbarMouseDown(event)}
        onClick={() => runCommand("justifyLeft")}
        className="p-1 rounded hover:bg-white/10 cursor-pointer bg-[#181A20] dark:bg-white text-white dark:text-black flex-shrink-0"
        title="Align left"
      >
        <AlignLeft className="h-3 w-3" />
      </button>
      <button
        type="button"
        disabled={disabled || rawHtmlMode}
        onMouseDown={(event) => handleToolbarMouseDown(event)}
        onClick={() => runCommand("justifyCenter")}
        className="p-1 rounded hover:bg-white/10 cursor-pointer bg-[#181A20] dark:bg-white text-white dark:text-black flex-shrink-0"
        title="Align center"
      >
        <AlignCenter className="h-3 w-3" />
      </button>
      <button
        type="button"
        disabled={disabled || rawHtmlMode}
        onMouseDown={(event) => handleToolbarMouseDown(event)}
        onClick={() => runCommand("justifyRight")}
        className="p-1 rounded hover:bg-white/10 cursor-pointer bg-[#181A20] dark:bg-white text-white dark:text-black flex-shrink-0"
        title="Align right"
      >
        <AlignRight className="h-3 w-3" />
      </button>

      <div className="mx-0.5 h-3.5 w-px bg-white/20 flex-shrink-0" />

      {/* Insert Text */}
      <button
        type="button"
        disabled={disabled || rawHtmlMode}
        onMouseDown={(event) => {
          event.preventDefault();
          saveSelection();
        }}
        onClick={() => insertTextBox()}
        className={String(subtleToolbarBtnClass)}
        title="Insert Text Box"
      >
        <Type className="h-3 w-3 text-slate-400 dark:text-slate-600" />
        <span>Text</span>
      </button>

      {/* Insert Button */}
      <div
        ref={(el) => {
          buttonMenuRef.current = el;
        }}
        className="relative flex-shrink-0"
      >
        <button
          type="button"
          disabled={disabled || rawHtmlMode}
          onMouseDown={(event) => {
            event.preventDefault();
            saveSelection();
          }}
          onClick={() => {
            setShowButtonMenu((prev) => !prev);
            setShowShapeMenu(false);
            setShowElementsMenu(false);
            setShowBodyMenu(false);
            setShowCanvasBgMenu(false);
          }}
          className={String(subtleToolbarBtnClass)}
          title="Insert Clickable Button"
        >
          <MousePointerClick className="h-3 w-3 text-slate-400 dark:text-slate-600" />
          <span>Button</span>
        </button>
        {showButtonMenu && (
          <div className="absolute left-0 top-full z-[9999] mt-1 flex w-44 flex-col gap-0.5 rounded-xl border border-white/20 bg-[#1A1C23] p-1 text-left shadow-2xl">
            <span className="px-2 py-0.5 font-mono-tech text-[7.5px] font-bold uppercase text-slate-400">
              Button Shape
            </span>
            {BUTTON_PRESETS.map((b) => (
              <button
                key={b.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  insertButton(b.id);
                }}
                className="flex items-center gap-2 rounded-lg p-1.5 px-2 text-left text-[9px] font-bold text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <span className="h-2 w-3 rounded bg-red-600 block" />
                <span>{b.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Insert Shapes */}
      <div
        ref={(el) => {
          shapeMenuRef.current = el;
        }}
        className="relative flex-shrink-0"
      >
        <button
          type="button"
          disabled={disabled || rawHtmlMode}
          onMouseDown={(event) => {
            event.preventDefault();
            saveSelection();
          }}
          onClick={() => {
            setShowShapeMenu((prev) => !prev);
            setShowButtonMenu(false);
            setShowElementsMenu(false);
            setShowBodyMenu(false);
            setShowCanvasBgMenu(false);
          }}
          className={String(subtleToolbarBtnClass)}
          title="Insert Shape (With centered editable text)"
        >
          <Shapes className="h-3 w-3 text-slate-400 dark:text-slate-600" />
          <span>Shapes</span>
        </button>
        {showShapeMenu && (
          <div className="absolute left-0 top-full z-[9999] mt-1 flex w-40 flex-col gap-0.5 rounded-xl border border-white/20 bg-[#1A1C23] p-1 text-left shadow-2xl">
            <span className="px-2 py-0.5 font-mono-tech text-[7.5px] font-bold uppercase text-slate-400">
              Shapes
            </span>
            {SHAPE_PRESETS.map((s) => (
              <button
                key={s.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  insertShape(s.id);
                }}
                className="flex items-center gap-2 rounded-lg p-1.5 px-2 text-left text-[9px] font-bold text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <Square className="h-2.5 w-2.5 text-amber-400" />
                <span>{s.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Elements (Pre-Built Oops Landing Page Blocks) */}
      <div
        ref={(el) => {
          elementsMenuRef.current = el;
        }}
        className="relative flex-shrink-0"
      >
        <button
          type="button"
          disabled={disabled || rawHtmlMode}
          onMouseDown={(event) => {
            event.preventDefault();
            saveSelection();
          }}
          onClick={() => {
            setShowElementsMenu((prev) => !prev);
            setShowShapeMenu(false);
            setShowButtonMenu(false);
            setShowBodyMenu(false);
            setShowCanvasBgMenu(false);
          }}
          className={String(subtleToolbarBtnClass)}
          title="Insert Pre-Built Oops Landing Page Blocks"
        >
          <ShieldAlert className="h-3 w-3 text-amber-400" />
          <span>Elements</span>
        </button>
        {showElementsMenu && (
          <div className="absolute left-0 top-full z-[9999] mt-1 flex w-60 flex-col gap-0.5 rounded-xl border border-white/20 bg-[#1A1C23] p-1 text-left shadow-2xl vshield-canvas-scroll max-h-64 overflow-y-auto">
            <span className="px-2 py-0.5 font-mono-tech text-[7.5px] font-bold uppercase text-slate-400">
              Oops Landing Page Components
            </span>
            {LANDING_PAGE_ELEMENTS.map((el) => (
              <button
                key={el.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  insertLandingPageElement(el.id);
                }}
                className="flex flex-col gap-0.5 rounded-lg p-1.5 px-2 text-left hover:bg-white/10 transition-colors cursor-pointer"
              >
                <span className="text-[9px] font-bold text-white">{el.label}</span>
                <span className="text-[7.5px] text-slate-400">{el.desc}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Landing Page Templates Dropdown (10 Full-Screen Templates) */}
      <div
        ref={(el) => {
          bodyMenuRef.current = el;
        }}
        className="relative flex-shrink-0"
      >
        <button
          type="button"
          disabled={disabled || rawHtmlMode}
          onClick={() => {
            setShowBodyMenu((prev) => !prev);
            setShowShapeMenu(false);
            setShowButtonMenu(false);
            setShowElementsMenu(false);
            setShowCanvasBgMenu(false);
          }}
          className={String(subtleToolbarBtnClass)}
          title="Use a Full-Screen Landing Page template"
        >
          <FileText className="h-3 w-3 text-slate-400 dark:text-slate-600" />
          <span>Templates</span>
          <ChevronDown className="h-2.5 w-2.5" />
        </button>
        {showBodyMenu && (
          <div
            role="menu"
            aria-label="Landing page templates"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className="absolute left-0 top-full mt-1 w-76 max-h-72 overflow-y-auto vshield-canvas-scroll rounded-xl bg-[#1A1C23] border border-white/20 p-1 shadow-2xl flex flex-col gap-0.5 text-left z-[9999]"
          >
            <span className="text-[7.5px] font-mono-tech uppercase text-slate-400 px-2 py-0.5 font-bold">
              Full-Screen Landing Page Templates ({landingPageTemplates.length})
            </span>
            {landingPageTemplates.map((option) => {
              const inEditor = isSameBody(option.html, internalHtmlRef.current);
              return (
                <button
                  key={option.id}
                  type="button"
                  role="menuitem"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    chooseLandingPageTemplate(option);
                  }}
                  className={
                    "w-full p-2 rounded-lg text-left flex flex-col gap-0.5 cursor-pointer transition-colors " +
                    (inEditor ? "bg-white/15 border border-white/20" : "hover:bg-white/10")
                  }
                >
                  <div className="flex items-center justify-between gap-1.5 pointer-events-none">
                    <span className="flex items-center gap-1.5 min-w-0">
                      {inEditor && <Check className="w-3 h-3 text-[#8ED973] flex-shrink-0" />}
                      <span className="text-[10px] font-bold text-white truncate">{option.name}</span>
                    </span>
                    {option.category && (
                      <span className="px-1.5 py-0.5 rounded bg-white/10 text-[7px] font-mono-tech uppercase text-slate-300 flex-shrink-0">
                        {option.category}
                      </span>
                    )}
                  </div>
                  <span className="text-[8px] text-slate-400 truncate pointer-events-none">
                    {option.snippet}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Canvas Background Color */}
      <div
        ref={(el) => {
          canvasBgRef.current = el;
        }}
        className="relative flex-shrink-0"
      >
        <button
          type="button"
          disabled={disabled || rawHtmlMode}
          onClick={() => {
            setShowCanvasBgMenu((prev) => !prev);
            setShowBodyMenu(false);
            setShowShapeMenu(false);
            setShowButtonMenu(false);
            setShowElementsMenu(false);
          }}
          className="flex h-6 px-1.5 items-center justify-center rounded border border-white/10 dark:border-black/10 bg-[#181A20] dark:bg-white text-slate-300 dark:text-slate-700 hover:bg-white/10 dark:hover:bg-slate-100 cursor-pointer"
          title="Change Canvas Background Color"
        >
          <span className="text-[8.5px] font-bold border border-current px-0.5 rounded leading-none">
            BG
          </span>
        </button>
        {showCanvasBgMenu && (
          <div className="absolute left-0 top-full z-[9999] mt-1 flex w-44 flex-col gap-1.5 rounded-xl border border-white/20 bg-[#1A1C23] p-2 text-left shadow-2xl">
            <span className="text-[8px] font-bold uppercase text-slate-400">
              Canvas Background
            </span>
            <div className="grid grid-cols-5 gap-1">
              {PRESET_COLORS.map((c) => (
                <button
                  key={String(c)}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    applyCanvasBgColor(c);
                    setShowCanvasBgMenu(false);
                  }}
                  style={{ backgroundColor: c }}
                  className="h-4.5 w-4.5 rounded border border-white/30 hover:scale-110 transition-transform cursor-pointer"
                />
              ))}
            </div>
            <div className="flex items-center justify-between gap-1 pt-1 border-t border-white/10">
              <span className="text-[8.5px] text-slate-300">Custom:</span>
              <input
                type="color"
                value={String(canvasBgColor)}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => applyCanvasBgColor(e.target.value)}
                className="h-4.5 w-6 cursor-pointer rounded border border-white/20 bg-transparent"
              />
            </div>
          </div>
        )}
      </div>

      {/* Gridlines */}
      <button
        type="button"
        disabled={disabled || rawHtmlMode}
        onClick={() => {
          setShowGridlines((prev) => {
            const next = !prev;
            if (next) {
              setActiveElement(null);
              setSelectedElements([]);
              showToast("Grid mode ON: Click any grid cell to place cursor and type.");
            } else {
              cleanupEmptyGridBoxes(null);
              showToast("Grid mode OFF.");
            }
            return next;
          });
        }}
        className={
          "h-6 w-6 flex items-center justify-center rounded cursor-pointer " +
          (showGridlines ? "bg-white/25 text-emerald-400" : "text-slate-300 dark:text-slate-700")
        }
        title="Toggle Gridlines (Click any grid cell to place cursor)"
      >
        <Grid className="h-3 w-3" />
      </button>

      {/* Erase Canvas */}
      <button
        type="button"
        disabled={disabled || rawHtmlMode}
        onClick={() => handleClearAllCanvas()}
        className="flex h-6 px-1.5 items-center gap-1 justify-center rounded border border-white/10 dark:border-black/10 bg-[#181A20] dark:bg-white text-slate-300 dark:text-slate-800 hover:bg-red-500/10 hover:text-red-400 dark:hover:bg-red-50 dark:hover:text-red-600 hover:border-red-500/20 transition-colors cursor-pointer text-[8.5px] font-bold shadow-xs flex-shrink-0"
        title="Erase Canvas"
      >
        <Eraser className="h-3 w-3 text-slate-400 dark:text-slate-600" />
        <span>Erase</span>
      </button>

      <input
        type="file"
        ref={(el) => {
          imageInputRef.current = el;
        }}
        accept="image/png, image/jpeg, image/jpg, image/gif, image/webp, image/svg+xml"
        onChange={(e) => handleImageUpload(e)}
        className="hidden"
      />
      <button
        type="button"
        disabled={disabled || rawHtmlMode}
        onMouseDown={() => saveSelection()}
        onClick={() => imageInputRef.current?.click()}
        className="h-6 w-6 flex items-center justify-center rounded text-blue-400 hover:bg-white/10 flex-shrink-0 cursor-pointer"
        title="Upload & Embed Local Image"
      >
        <ImageIcon className="h-3 w-3" />
      </button>

      <button
        type="button"
        disabled={disabled || rawHtmlMode}
        onMouseDown={(event) => {
          event.preventDefault();
          saveSelection();
        }}
        onClick={() => insertLink()}
        className="h-6 w-6 flex items-center justify-center rounded text-emerald-400 hover:bg-white/10 flex-shrink-0 cursor-pointer"
        title="Insert link"
      >
        <LinkIcon className="h-3 w-3" />
      </button>

      {/* Dynamic Placeholder */}
      <div
        ref={(el) => {
          fxRef.current = el;
        }}
        className="relative flex-shrink-0"
      >
        <button
          type="button"
          disabled={disabled || rawHtmlMode}
          onMouseDown={(event) => {
            event.preventDefault();
            saveSelection();
          }}
          onClick={() => setShowFxMenu((prev) => !prev)}
          className="flex h-6 items-center gap-0.5 rounded-xl bg-white px-1.5 text-[8.5px] font-bold text-black shadow-xs cursor-pointer"
          title="Insert Dynamic Placeholder"
        >
          <span>fx</span>
          <ChevronDown className="h-2 w-2" />
        </button>
        {showFxMenu && (
          <div className="absolute left-0 top-full z-[9999] mt-1 flex max-h-48 w-52 flex-col gap-0.5 overflow-y-auto vshield-canvas-scroll rounded-xl border border-white/20 bg-[#1A1C23] p-1 text-left shadow-2xl">
            <span className="px-2 py-0.5 font-mono-tech text-[7.5px] font-bold uppercase text-slate-400">
              Dynamic Placeholders
            </span>
            {FX_PARAMETERS.map((fx) => (
              <button
                key={fx.label}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => insertFxPlaceholder(fx)}
                className="flex items-center justify-between rounded-lg p-1 px-2 text-left transition-colors hover:bg-white/10 cursor-pointer"
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
    </>
  );

  // Right-side Toolbar Controls (Group + Eye Preview + HTML + Expand + Hamburger at right-most extreme)
  const renderRightControls = (showCloseX = false) => (
    <div className="ml-auto flex flex-shrink-0 items-center gap-1.5">
      {selectedElements.length >= 2 && !rawHtmlMode && (
        <button
          type="button"
          onClick={() => groupSelectedElements()}
          className="flex h-6 items-center gap-1 rounded border border-indigo-400/40 bg-indigo-600 text-white hover:bg-indigo-700 px-2 text-[8.5px] font-bold transition-colors cursor-pointer shadow-xs"
          title="Group selected elements"
        >
          <Group className="h-3 w-3" />
          <span>{"Group (" + selectedElements.length + ")"}</span>
        </button>
      )}

      {/* Eye Icon: Preview in Full Screen */}
      <button
        type="button"
        onClick={() => handleOpenFullScreenPreview()}
        className="h-6 w-6 flex items-center justify-center rounded border border-white/15 dark:border-black/15 bg-[#181A20] dark:bg-white text-cyan-400 dark:text-blue-600 hover:bg-white/15 dark:hover:bg-slate-100 transition-colors cursor-pointer"
        title="Preview in full screen"
      >
        <Eye className="h-3.5 w-3.5" />
      </button>

      <button
        type="button"
        disabled={Boolean(disabled)}
        onClick={() => handleToggleCodeMode()}
        className={
          "flex h-6 items-center gap-0.5 rounded border px-1.5 text-[8.5px] font-bold transition-colors cursor-pointer " +
          (rawHtmlMode
            ? "border-red-600 bg-red-600 text-white"
            : "border-white/20 bg-[#181A20] text-white hover:bg-white/15")
        }
        title="Toggle HTML source code"
      >
        <Code className="h-2.5 w-2.5" />
        {rawHtmlMode ? "Visual" : "HTML"}
      </button>

      <button
        type="button"
        onClick={() => handleToggleExpand()}
        className="h-6 w-6 flex items-center justify-center rounded text-slate-200 dark:text-slate-800 hover:bg-white/15 dark:hover:bg-slate-200 cursor-pointer"
        title={isExpanded ? "Minimize editor" : "Expand editor"}
      >
        {isExpanded ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
      </button>

      {showCloseX && isExpanded && !isControlledExpand && (
        <button
          type="button"
          onClick={() => setInternalExpanded(false)}
          className="h-6 w-6 flex items-center justify-center rounded text-slate-200 dark:text-slate-800 hover:bg-white/15 dark:hover:bg-slate-200 cursor-pointer"
          title="Close full-screen editor"
        >
          <X className="h-3 w-3" />
        </button>
      )}

      {/* Hamburger Icon on Right-Most Extreme Side -> Toggles "Used Items" Vertical Pane */}
      <button
        type="button"
        disabled={Boolean(disabled || rawHtmlMode)}
        onClick={() => {
          syncUsedItemsList();
          setShowUsedItemsPane((prev) => !prev);
        }}
        className={
          "h-6 w-6 flex items-center justify-center rounded border transition-colors cursor-pointer " +
          (showUsedItemsPane
            ? "border-blue-500 bg-blue-600 text-white"
            : "border-white/15 dark:border-black/15 bg-[#181A20] dark:bg-white text-slate-200 dark:text-slate-800 hover:bg-white/15 dark:hover:bg-slate-100")
        }
        title={showUsedItemsPane ? "Close Used Items Pane" : "Open Used Items Pane"}
      >
        <Menu className="h-3.5 w-3.5" />
      </button>
    </div>
  );

  const renderCompactToolbar = () => (
    <div className="w-full h-8.5 px-2 flex items-center justify-between text-white select-none bg-[#202127] dark:bg-white border-b border-white/10 dark:border-black/10 rounded-t-2xl relative z-30 flex-nowrap overflow-visible">
      <div className="flex items-center gap-1 text-xs flex-nowrap overflow-visible pr-1">
        {renderSharedTools()}
      </div>
      {renderRightControls(false)}
    </div>
  );

  const renderFullToolbar = () => (
    <div className="flex w-full h-8.5 flex-shrink-0 flex-nowrap items-center justify-between border-b border-white/10 dark:border-black/10 bg-[#202127] dark:bg-white px-2 text-white rounded-t-2xl relative z-30 overflow-visible select-none">
      <div className="flex items-center gap-1 flex-nowrap overflow-visible pr-1">
        {renderSharedTools()}
      </div>
      {renderRightControls(true)}
    </div>
  );

  // Floating text selection color palette (positioned inside stageRef)
  const renderFloatingTextSelectionColorBar = () => {
    if (!selectionColorMenu.visible) return null;
    return (
      <div
        data-floating-control="true"
        style={{
          position: "absolute",
          top: selectionColorMenu.top + "px",
          left: selectionColorMenu.left + "px",
          zIndex: 60,
        }}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onClick={(e) => e.stopPropagation()}
        className="flex items-center gap-1 bg-[#1A1C23] border border-white/20 rounded-lg p-1.5 shadow-2xl select-none"
      >
        <span className="text-[8px] font-mono-tech text-slate-400 uppercase mr-1">
          Color:
        </span>
        {PRESET_COLORS.slice(0, 5).map((col) => (
          <button
            key={String(col)}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              applyTextColorToSelection(col);
            }}
            style={{ backgroundColor: col }}
            className="w-4 h-4 rounded-full border border-white/30 cursor-pointer hover:scale-110 transition-transform"
          />
        ))}
        <input
          type="color"
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => applyTextColorToSelection(e.target.value)}
          className="w-4 h-4 rounded cursor-pointer border-none bg-transparent"
          title="Custom HEX Color"
        />
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleEyedropperForText();
          }}
          className="p-1 hover:bg-white/10 rounded text-cyan-400 hover:text-cyan-300 cursor-pointer"
          title="Eyedropper Tool"
        >
          <Pipette className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  };

  // Multi-Select Highlight Overlays + Floating "Group" Bar (Scale-Aware inside stageRef)
  const renderMultiSelectionOverlay = () => {
    if (selectedElements.length < 2 || !stageRef.current) return null;
    const stageEl = stageRef.current;
    const scale = getEffectiveScale(stageEl);
    const stageRect = stageEl.getBoundingClientRect();

    let minTop = Infinity;
    let minLeft = Infinity;

    const boxes = selectedElements
      .filter((el) => el && editorRef.current?.contains(el))
      .map((el, idx) => {
        const r = el.getBoundingClientRect();
        const top = (r.top - stageRect.top) / scale;
        const left = (r.left - stageRect.left) / scale;
        const width = r.width / scale;
        const height = r.height / scale;
        if (top < minTop) minTop = top;
        if (left < minLeft) minLeft = left;
        return { key: el.id || "sel-" + idx, top, left, width, height };
      });

    if (boxes.length < 2) return null;

    return (
      <>
        {boxes.map((b) => (
          <div
            key={b.key}
            data-floating-control="true"
            style={{
              position: "absolute",
              top: b.top + "px",
              left: b.left + "px",
              width: b.width + "px",
              height: b.height + "px",
              pointerEvents: "none",
              border: "2px dashed #6366F1",
              backgroundColor: "rgba(99, 102, 241, 0.08)",
              zIndex: 38,
            }}
          />
        ))}
        <div
          data-floating-control="true"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "absolute",
            top: Math.max(8, minTop - 36) + "px",
            left: Math.max(8, minLeft) + "px",
            zIndex: 55,
          }}
          className="flex items-center gap-1.5 bg-[#1A1C23] border border-indigo-400/50 rounded-lg px-2 py-1 shadow-2xl select-none"
        >
          <span className="text-[9px] font-mono-tech font-bold text-indigo-300">
            {boxes.length + " selected"}
          </span>
          <button
            type="button"
            onClick={() => groupSelectedElements()}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-[9px] font-bold cursor-pointer"
          >
            <Group className="w-3 h-3" />
            <span>Group</span>
          </button>
          <button
            type="button"
            onClick={() => deleteSelectedElements()}
            className="p-1 hover:bg-red-500/20 rounded text-red-400 hover:text-red-300 cursor-pointer"
            title="Delete Selected"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </>
    );
  };

  // Universal Floating Controller for Single Selected Element (Scale-Aware inside stageRef)
  const renderFloatingObjectControls = () => {
    if (!activeElement?.element || selectedElements.length >= 2) return null;
    if (!stageRef.current || !editorRef.current?.contains(activeElement.element)) return null;

    const stageEl = stageRef.current;
    const scale = getEffectiveScale(stageEl);
    const stageRect = stageEl.getBoundingClientRect();
    const targetRect = activeElement.element.getBoundingClientRect();

    const top = (targetRect.top - stageRect.top) / scale;
    const left = (targetRect.left - stageRect.left) / scale;
    const boxWidth = targetRect.width / scale;
    const boxHeight = targetRect.height / scale;

    const stageHeightLogical = stageRect.height / scale;
    const spaceAbove = top;
    const spaceBelow = stageHeightLogical - (top + boxHeight);

    const isActionBarAbove = spaceBelow < 45 && spaceAbove > 45;
    const openMenuUpward = isActionBarAbove
      ? spaceAbove > 180
      : spaceBelow < 180 && spaceAbove > 180;

    const widthCm = (boxWidth / PX_PER_CM).toFixed(2);
    const heightCm = (boxHeight / PX_PER_CM).toFixed(2);
    const isGroup = activeElement.element.classList.contains("vshield-group-item");

    return (
      <div
        data-floating-control="true"
        style={{
          position: "absolute",
          top: top + "px",
          left: left + "px",
          width: boxWidth + "px",
          height: boxHeight + "px",
          pointerEvents: "none",
          border: isGroup ? "2px dashed #6366F1" : "2px dashed #2563EB",
          zIndex: 40,
          boxSizing: "border-box",
        }}
      >
        <div
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          style={{
            top: top < 28 ? "4px" : "-26px",
            left: "2px",
          }}
          className="absolute bg-[#1A1C23] text-white px-2 py-0.5 rounded text-[8.5px] font-mono-tech whitespace-nowrap shadow-lg pointer-events-auto flex items-center gap-1.5 border border-white/20 select-none"
        >
          <div className="flex items-center gap-0.5">
            <span className="text-slate-400">W:</span>
            <input
              type="number"
              step="0.05"
              value={String(widthCm)}
              onChange={(e) => setDimensionsCm("width", e.target.value)}
              className="w-11 px-1 py-0 bg-black/60 rounded border border-white/20 text-[8.5px] text-white outline-none"
            />
            <span className="text-slate-400">cm</span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="flex items-center gap-0.5">
            <span className="text-slate-400">H:</span>
            <input
              type="number"
              step="0.05"
              value={String(heightCm)}
              onChange={(e) => setDimensionsCm("height", e.target.value)}
              className="w-11 px-1 py-0 bg-black/60 rounded border border-white/20 text-[8.5px] text-white outline-none"
            />
            <span className="text-slate-400">cm</span>
          </div>
          <span className="text-emerald-400 font-bold ml-1">
            {"(" + aspectRatioText + ")"}
          </span>
        </div>

        <div
          onMouseDown={(e) => startDragItem(e)}
          onClick={(e) => e.stopPropagation()}
          style={{
            top: top < 18 ? "2px" : "-12px",
            right: "2px",
          }}
          className="absolute h-5 px-1.5 bg-[#2563EB] text-white rounded cursor-move pointer-events-auto flex items-center gap-1 shadow select-none"
          title="Move: Drag to reposition anywhere"
        >
          <Move className="w-2.5 h-2.5" />
          <span className="text-[7.5px] font-bold uppercase">Move</span>
        </div>

        <div
          onMouseDown={(e) => startResizeItem(e, "top-left")}
          onClick={(e) => e.stopPropagation()}
          className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-[#2563EB] rounded-full cursor-nwse-resize pointer-events-auto"
        />
        <div
          onMouseDown={(e) => startResizeItem(e, "top-right")}
          onClick={(e) => e.stopPropagation()}
          className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-[#2563EB] rounded-full cursor-nesw-resize pointer-events-auto"
        />
        <div
          onMouseDown={(e) => startResizeItem(e, "bottom-left")}
          onClick={(e) => e.stopPropagation()}
          className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-[#2563EB] rounded-full cursor-nesw-resize pointer-events-auto"
        />
        <div
          onMouseDown={(e) => startResizeItem(e, "bottom-right")}
          onClick={(e) => e.stopPropagation()}
          className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-[#2563EB] rounded-full cursor-nwse-resize pointer-events-auto"
        />

        <div
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          style={{
            bottom: isActionBarAbove ? "auto" : "-38px",
            top: isActionBarAbove ? "-38px" : "auto",
            left: "0px",
          }}
          className="absolute bg-[#1A1C23] border border-white/20 rounded-lg p-1 flex items-center gap-1.5 shadow-2xl pointer-events-auto select-none"
        >
          {/* Color */}
          <div className="flex items-center gap-1 pr-1 border-r border-white/15">
            {PRESET_COLORS.slice(0, 3).map((color) => (
              <button
                key={String(color)}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  updateActiveItemColor(color);
                }}
                style={{ backgroundColor: color }}
                className="w-4 h-4 rounded-full border border-white/30 cursor-pointer hover:scale-110"
                title={"Apply " + color}
              />
            ))}
            <input
              type="color"
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => updateActiveItemColor(e.target.value)}
              className="w-4 h-4 rounded cursor-pointer border-none bg-transparent"
              title="Custom HEX Color"
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleEyedropperForObject();
              }}
              className="p-1 hover:bg-white/10 rounded text-slate-300 hover:text-white cursor-pointer"
              title="Eyedropper Tool"
            >
              <Pipette className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Border */}
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowBorderMenu((prev) => !prev);
                setShowShadowMenu(false);
                setShowRoundedMenu(false);
              }}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white text-[9px] font-bold cursor-pointer"
              title="Border Styling"
            >
              <Square className="w-3 h-3 text-cyan-400" />
              <span>Border</span>
            </button>
            {showBorderMenu && (
              <div
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                style={{
                  bottom: openMenuUpward ? "100%" : "auto",
                  top: openMenuUpward ? "auto" : "100%",
                  marginBottom: openMenuUpward ? "4px" : "0px",
                  marginTop: openMenuUpward ? "0px" : "4px",
                }}
                className="absolute left-0 w-36 flex flex-col gap-1 rounded-lg border border-white/20 bg-[#1A1C23] p-2 text-left shadow-2xl z-50 pointer-events-auto"
              >
                <span className="text-[7.5px] font-mono-tech uppercase text-slate-400">
                  Width
                </span>
                <div className="flex gap-1">
                  {BORDER_WIDTHS.map((w) => (
                    <button
                      key={String(w)}
                      type="button"
                      onClick={() => updateActiveItemBorder(undefined, w, undefined)}
                      className="px-1.5 py-0.5 text-[8px] bg-white/10 rounded hover:bg-white/20 text-white cursor-pointer"
                    >
                      {String(w)}
                    </button>
                  ))}
                </div>
                <span className="text-[7.5px] font-mono-tech uppercase text-slate-400 mt-1">
                  Style
                </span>
                <div className="flex gap-1">
                  {BORDER_STYLES.map((st) => (
                    <button
                      key={String(st)}
                      type="button"
                      onClick={() => updateActiveItemBorder(st, undefined, undefined)}
                      className="px-1.5 py-0.5 text-[8px] bg-white/10 rounded hover:bg-white/20 text-white cursor-pointer"
                    >
                      {String(st)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Shadow */}
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowShadowMenu((prev) => !prev);
                setShowRoundedMenu(false);
                setShowBorderMenu(false);
              }}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white text-[9px] font-bold cursor-pointer"
              title="Shadow Options"
            >
              <Layers className="w-3 h-3 text-amber-400" />
              <span>Shadow</span>
            </button>
            {showShadowMenu && (
              <div
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                style={{
                  bottom: openMenuUpward ? "100%" : "auto",
                  top: openMenuUpward ? "auto" : "100%",
                  marginBottom: openMenuUpward ? "4px" : "0px",
                  marginTop: openMenuUpward ? "0px" : "4px",
                }}
                className="absolute left-0 w-28 flex flex-col gap-0.5 rounded-lg border border-white/20 bg-[#1A1C23] p-1 text-left shadow-2xl z-50 pointer-events-auto vshield-canvas-scroll max-h-48 overflow-y-auto"
              >
                {SHADOW_PRESETS.map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      updateActiveItemShadow(s.value);
                    }}
                    className="w-full text-left px-2 py-1 text-[9px] font-semibold text-slate-200 hover:bg-white/10 rounded cursor-pointer"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Edge Roundedness */}
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowRoundedMenu((prev) => !prev);
                setShowShadowMenu(false);
                setShowBorderMenu(false);
              }}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white text-[9px] font-bold cursor-pointer"
              title="Edge Roundedness Adjuster"
            >
              <Square className="w-3 h-3 text-emerald-400" />
              <span>Rounded</span>
            </button>
            {showRoundedMenu && (
              <div
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                style={{
                  bottom: openMenuUpward ? "100%" : "auto",
                  top: openMenuUpward ? "auto" : "100%",
                  marginBottom: openMenuUpward ? "4px" : "0px",
                  marginTop: openMenuUpward ? "0px" : "4px",
                }}
                className="absolute left-0 w-44 flex flex-col gap-1.5 rounded-lg border border-white/20 bg-[#1A1C23] p-2 text-left shadow-2xl z-50 pointer-events-auto vshield-canvas-scroll max-h-56 overflow-y-auto"
              >
                <div className="flex items-center justify-between text-[8px] font-mono-tech text-slate-400 uppercase">
                  <span>Edge Radius</span>
                  <span className="text-white font-bold">
                    {getCurrentRadius() === "9999px" ? "Pill" : getCurrentRadius()}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 py-0.5">
                  <input
                    type="range"
                    min="0"
                    max="50"
                    value={
                      getCurrentRadius() === "9999px"
                        ? 50
                        : Math.min(50, parseInt(getCurrentRadius(), 10) || 0)
                    }
                    onChange={(e) => updateActiveItemRoundedness(e.target.value + "px", false)}
                    className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#2563EB]"
                  />
                </div>
                <div className="grid grid-cols-3 gap-1 pt-1 border-t border-white/10">
                  {ROUNDED_PRESETS.map((r) => (
                    <button
                      key={r.label}
                      type="button"
                      onClick={() => updateActiveItemRoundedness(r.value, false)}
                      className="px-1 py-0.5 text-[8.5px] font-semibold text-center text-slate-200 hover:bg-white/10 rounded cursor-pointer"
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {isGroup && (
            <button
              type="button"
              onClick={() => ungroupActiveItem()}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-[9px] font-bold cursor-pointer"
              title="Ungroup elements"
            >
              <Ungroup className="w-3 h-3" />
              <span>Ungroup</span>
            </button>
          )}

          {/* Alignment */}
          <button
            type="button"
            onClick={() => alignElement("center-h")}
            className="p-1 hover:bg-white/10 rounded text-slate-300 hover:text-white cursor-pointer"
            title="Align Center Horizontally"
          >
            <AlignHorizontalJustifyCenter className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => alignElement("center-v")}
            className="p-1 hover:bg-white/10 rounded text-slate-300 hover:text-white cursor-pointer"
            title="Align Center Vertically"
          >
            <AlignVerticalJustifyCenter className="w-3.5 h-3.5" />
          </button>

          {/* Layer Ordering */}
          <button
            type="button"
            onClick={() => updateZIndex("front")}
            className="p-1 hover:bg-white/10 rounded text-slate-300 hover:text-white cursor-pointer"
            title="Bring to Front"
          >
            <BringToFront className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => updateZIndex("back")}
            className="p-1 hover:bg-white/10 rounded text-slate-300 hover:text-white cursor-pointer"
            title="Send to Back"
          >
            <SendToBack className="w-3.5 h-3.5" />
          </button>

          {/* Duplicate (Ctrl+D) */}
          <button
            type="button"
            onClick={() => duplicateActiveItem()}
            className="p-1 hover:bg-white/10 rounded text-slate-300 hover:text-white cursor-pointer"
            title="Duplicate (Ctrl+D)"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>

          {/* On Click */}
          <button
            type="button"
            onClick={(e) => openActionModal(e)}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-[9px] font-bold cursor-pointer"
            title="Configure On-Click action"
          >
            <Settings className="w-3 h-3 text-white" />
            <span>On Click</span>
          </button>

          {/* Delete */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              deleteActiveItem();
            }}
            className="p-1 hover:bg-red-500/20 rounded text-red-400 hover:text-red-300 cursor-pointer"
            title="Delete Element (Delete key)"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  };

  // =========================================================================
  // 🌟 RIGHT VERTICAL PANE: "USED ITEMS" (Toggled by Hamburger Icon)
  // =========================================================================
  const renderUsedItemsPane = () => {
    if (!showUsedItemsPane || rawHtmlMode) return null;

    return (
      <div
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        className="w-64 flex-shrink-0 h-full bg-[#181A20] dark:bg-[#14151B] border-l border-white/15 flex flex-col text-white select-none z-30"
      >
        <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between bg-[#1F2128]">
          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-white">
              Used Items ({usedItems.length})
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowUsedItemsPane(false)}
            className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
            title="Close Used Items"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="px-3 py-1.5 border-b border-white/10 flex items-center justify-between gap-2 bg-black/20">
          <span className="text-[8.5px] text-slate-400">
            Drag ↑ Above/Front • ↓ Below/Back
          </span>
          {selectedElements.length >= 2 && (
            <button
              type="button"
              onClick={() => groupSelectedElements()}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-[8.5px] font-bold cursor-pointer"
            >
              <Group className="w-2.5 h-2.5" />
              <span>{"Group (" + selectedElements.length + ")"}</span>
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto vshield-canvas-scroll p-2 flex flex-col gap-1">
          {usedItems.length === 0 ? (
            <div className="text-center py-8 px-3 text-[10px] text-slate-400">
              No items on canvas yet. Insert shapes, text, buttons, elements, or a template.
            </div>
          ) : (
            usedItems.map((item) => {
              const isSelected =
                activeElement?.element === item.element ||
                selectedElements.includes(item.element);
              const isDragTarget =
                dragOverLayerId === item.id && draggedLayerId !== item.id;

              return (
                <div
                  key={item.id}
                  draggable
                  onDragStart={(e) => {
                    setDraggedLayerId(item.id);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (dragOverLayerId !== item.id) {
                      setDragOverLayerId(item.id);
                    }
                  }}
                  onDragLeave={() => {
                    if (dragOverLayerId === item.id) {
                      setDragOverLayerId(null);
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleLayerDrop(item.id);
                  }}
                  onDragEnd={() => {
                    setDraggedLayerId(null);
                    setDragOverLayerId(null);
                  }}
                  onClick={(e) => {
                    if (e.shiftKey || e.ctrlKey || e.metaKey) {
                      toggleItemSelectionFromPane(item, !isSelected);
                    } else {
                      selectSingleCanvasItem(item.element);
                      item.element?.scrollIntoView({ behavior: "smooth", block: "nearest" });
                    }
                  }}
                  className={
                    "flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-[10px] transition-colors cursor-pointer " +
                    (isDragTarget
                      ? "border-emerald-400 bg-emerald-500/15"
                      : isSelected
                      ? "border-blue-500 bg-blue-600/20 text-white"
                      : "border-white/10 bg-white/5 hover:bg-white/10 text-slate-200")
                  }
                >
                  <GripVertical
                    className="w-3 h-3 text-slate-500 flex-shrink-0 cursor-grab"
                    title="Drag up/down to reorder on canvas"
                  />

                  <input
                    type="checkbox"
                    checked={Boolean(isSelected)}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => toggleItemSelectionFromPane(item, e.target.checked)}
                    className="w-3 h-3 accent-indigo-500 cursor-pointer flex-shrink-0"
                    title="Select for grouping"
                  />

                  {renamingItemId === item.id ? (
                    <input
                      autoFocus
                      type="text"
                      value={String(tempItemName)}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => setTempItemName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveUsedItemName(item);
                        if (e.key === "Escape") setRenamingItemId(null);
                      }}
                      onBlur={() => saveUsedItemName(item)}
                      className="flex-1 min-w-0 bg-black/60 text-white border border-white/30 rounded px-1.5 py-0.5 text-[9.5px] font-semibold outline-none"
                    />
                  ) : (
                    <div className="flex-1 min-w-0 flex flex-col">
                      <span
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          setRenamingItemId(item.id);
                          setTempItemName(item.name);
                        }}
                        className="font-bold truncate leading-tight"
                        title={item.name + " (Double-click to rename)"}
                      >
                        {item.name}
                      </span>
                      <span className="text-[7.5px] font-mono-tech uppercase text-slate-400">
                        {item.type}
                      </span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setRenamingItemId(item.id);
                      setTempItemName(item.name);
                    }}
                    className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer flex-shrink-0"
                    title="Rename item"
                  >
                    <Pencil className="w-2.5 h-2.5" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteUsedItem(item);
                    }}
                    className="p-1 rounded hover:bg-red-500/20 text-red-400 hover:text-red-300 cursor-pointer flex-shrink-0"
                    title={"Delete " + item.name}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  // 🌟 On-Click Action Modal — ONLY "Attach My Training Page"
  const renderActionModal = () => {
    if (!actionConfigModal.open || typeof document === "undefined") return null;

    return createPortal(
      <div
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
      >
        <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#1A1C23] p-5 text-white shadow-2xl flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center gap-2">
              <MousePointerClick className="w-4 h-4 text-pink-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider">
                Configure &quot;On Click&quot; Action
              </h4>
            </div>
            <button
              type="button"
              onClick={() =>
                setActionConfigModal({ open: false, element: null, actionType: "training" })
              }
              className="text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-col gap-2 text-xs">
            <label className="flex items-center gap-2 cursor-pointer p-2.5 rounded-lg border border-white/20 bg-white/5">
              <input
                type="radio"
                name="elemAction"
                checked
                readOnly
                className="text-red-600"
              />
              <div>
                <span className="font-bold block">Attach My Training Page</span>
                <span className="text-[10px] text-slate-400">
                  Directly redirects user to My Training page (
                  <code>{String(MY_TRAINING_ROUTE)}</code>)
                </span>
              </div>
            </label>
          </div>

          <div className="mt-2 flex justify-end gap-2 border-t border-white/10 pt-3">
            <button
              type="button"
              onClick={() =>
                setActionConfigModal({ open: false, element: null, actionType: "training" })
              }
              className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/5 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => saveActionConfig()}
              className="rounded-lg bg-[#E60000] px-4 py-1.5 text-xs font-bold text-white hover:bg-red-700 cursor-pointer"
            >
              Save On Click Action
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  // 🌟 Full-Screen Live Preview Modal (Zero unwanted top/left/right padding)
  const renderFullScreenPreviewModal = () => {
    if (!showFullScreenPreview || typeof document === "undefined") return null;

    return createPortal(
      <div
        id="lp-editor-fullscreen-preview"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: "100vw",
          height: "100vh",
          zIndex: 2147483647,
          backgroundColor: canvasBgColor || "#ffffff",
          display: "flex",
          flexDirection: "column",
          margin: 0,
          padding: 0,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            zIndex: 2147483647,
          }}
        >
          <button
            type="button"
            onClick={() => setShowFullScreenPreview(false)}
            className="p-2 rounded-xl bg-black/75 hover:bg-black text-white backdrop-blur-md border border-white/20 shadow-2xl cursor-pointer hover:scale-105 active:scale-95 transition-all"
            title="Exit Full Screen Preview"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        <iframe
          title="Full Screen Canvas Preview"
          // No script from the page may run in the app's origin.
          sandbox=""
          srcDoc={
            '<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><style>*{box-sizing:border-box;}html,body{margin:0;padding:0;width:100%;min-height:100vh;overflow-x:hidden;background:' +
            (canvasBgColor || "#ffffff") +
            ";}</style></head><body>" +
            previewHtmlSnapshot +
            "</body></html>"
          }
          style={{
            width: "100vw",
            height: "100vh",
            border: "none",
            margin: 0,
            padding: 0,
            display: "block",
            backgroundColor: canvasBgColor || "#ffffff",
          }}
        />
      </div>,
      document.body
    );
  };


  // Workspace Renderer (White Outer Canvas + Grey Dotted Left/Right Lines + Bottom Safe Zone)
  const renderEditorWorkspace = (expanded = false) => {
    const isCompactMode = compact;
    const heightClass = fullHeight
      ? "h-full flex-1 min-h-0"
      : expanded
      ? "h-[calc(100vh-80px)]"
      : "h-[220px]";

    return (
      <div
        style={{ borderWidth: VarEditorOuterFrameThickness + "px" }}
        className={
          "w-full rounded-2xl border border-[#202127] dark:border-white/10 bg-[#202127] dark:bg-white shadow-xs flex flex-col relative z-20 overflow-visible " +
          heightClass
        }
      >
        {isCompactMode ? renderCompactToolbar() : renderFullToolbar()}

        <div className="flex flex-1 min-h-0 w-full rounded-b-2xl overflow-hidden border-t border-slate-200 dark:border-white/10">
          {/* Main Canvas Area (White outer background — no grey side bars) */}
          <div
            ref={(el) => {
              workspaceRef.current = el;
            }}
            className={
              "relative min-w-0 flex-1 overflow-hidden bg-white dark:bg-[#0c0d10] transition-colors duration-200 " +
              (expanded || fullHeight ? "min-h-0" : "")
            }
          >
            <div className="w-full h-full overflow-auto vshield-canvas-scroll relative z-0">
              {rawHtmlMode ? (
                <HtmlCodeEditor
                  value={String(rawHtmlCode)}
                  disabled={Boolean(disabled)}
                  onChange={(code) => handleRawHtmlCode(code)}
                  ariaLabel="Landing page HTML"
                  placeholder="Write landing page HTML code here..."
                />
              ) : (
                <div
                  ref={(el) => {
                    stageRef.current = el;
                  }}
                  onMouseDown={(e) => handleStageMouseDown(e)}
                  onClick={(e) => handleCanvasClick(e)}
                  className="relative mx-auto border-x-2 border-dotted border-slate-300 dark:border-slate-600"
                  style={{
                    width: VarCanvasFixedWidthPx + "px",
                    minWidth: VarCanvasFixedWidthPx + "px",
                    maxWidth: VarCanvasFixedWidthPx + "px",
                    minHeight: canvasContentHeightPx + "px",
                    backgroundColor: canvasBgColor,
                  }}
                >
                  {showGridlines && (
                    <div
                      style={{
                        backgroundImage:
                          "linear-gradient(to right, rgba(100, 116, 139, 0.16) 1px, transparent 1px), linear-gradient(to bottom, rgba(100, 116, 139, 0.16) 1px, transparent 1px)",
                        backgroundSize: GRID_SIZE_PX + "px " + GRID_SIZE_PX + "px",
                      }}
                      className="pointer-events-none absolute inset-0 z-10"
                    />
                  )}

                  {/* Marquee Selection Box (Inside stageRef — scrolls & scales 1:1) */}
                  {marqueeRect && (
                    <div
                      data-floating-control="true"
                      style={{
                        position: "absolute",
                        left: marqueeRect.left + "px",
                        top: marqueeRect.top + "px",
                        width: marqueeRect.width + "px",
                        height: marqueeRect.height + "px",
                        border: "1.5px dashed #2563EB",
                        backgroundColor: "rgba(37, 99, 235, 0.12)",
                        pointerEvents: "none",
                        zIndex: 45,
                      }}
                    />
                  )}

                  {renderMultiSelectionOverlay()}
                  {renderFloatingObjectControls()}
                  {renderFloatingTextSelectionColorBar()}

                  {editorIsEmpty && (
                    <div className="pointer-events-none absolute left-4 top-4 z-10 text-xs text-slate-400">
                      {String(placeholder)}
                    </div>
                  )}

                  <div
                    ref={(el) => {
                      editorRef.current = el;
                    }}
                    contentEditable={!disabled}
                    suppressContentEditableWarning
                    role="textbox"
                    aria-label="Landing page rich text editor"
                    aria-multiline="true"
                    spellCheck
                    onInput={() => handleEditorInput()}
                    onKeyUp={() => saveSelection()}
                    onMouseUp={() => saveSelection()}
                    onFocus={() => saveSelection()}
                    onBlur={() => handleEditorBlur()}
                    style={{
                      width: "100%",
                      minHeight: canvasContentHeightPx + "px",
                      backgroundColor: canvasBgColor,
                    }}
                    className={
                      "relative outline-none text-slate-900 dark:text-slate-100 p-0 m-0 leading-normal text-xs [&_a]:text-blue-600 [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-slate-300 [&_blockquote]:pl-4 [&_h1]:my-2 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:my-2 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:my-1.5 [&_h3]:text-lg [&_h3]:font-bold [&_p]:my-1 " +
                      (disabled
                        ? "cursor-not-allowed bg-slate-100 opacity-70"
                        : showGridlines
                        ? "cursor-crosshair"
                        : "cursor-text")
                    }
                  />

                  {/* Bottom Horizontal Safe Zone Reference Line Only (Visual indicator — never saved) */}
                  <div
                    data-floating-control="true"
                    style={{
                      position: "absolute",
                      top: SAFE_ZONE_HEIGHT_PX + "px",
                      left: 0,
                      right: 0,
                      pointerEvents: "none",
                      zIndex: 25,
                    }}
                    className="flex items-center select-none"
                  >
                    <div
                      className={
                        "w-full border-t-2 border-dashed " +
                        (isOverflowingSafeZoneY
                          ? "border-amber-500/90"
                          : "border-emerald-500/80")
                      }
                    />
                    <span
                      style={{ right: "12px" }}
                      className={
                        "absolute -top-2.5 px-2 py-0.5 rounded text-[8.5px] font-mono-tech font-bold uppercase tracking-wider shadow-xs whitespace-nowrap " +
                        (isOverflowingSafeZoneY
                          ? "bg-amber-500 text-white"
                          : "bg-emerald-600/95 text-white")
                      }
                    >
                      {isOverflowingSafeZoneY
                        ? "Browser Safe Zone (" + SAFE_ZONE_HEIGHT_PX + "px) — Below Overflows"
                        : "Browser Safe Zone Bottom (" + SAFE_ZONE_HEIGHT_PX + "px)"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Vertical Pane: Used Items (Only visible when Hamburger is toggled open) */}
          {renderUsedItemsPane()}
        </div>
      </div>
    );
  };

  return (
    <>
      <style>{String(CANVAS_SCROLL_CSS)}</style>

      {(!isExpanded || isControlledExpand) && (
        <div
          className={
            "w-full min-w-0 " +
            (fullHeight ? "flex-1 min-h-0 flex flex-col " : "") +
            className
          }
        >
          {renderEditorWorkspace(isExpanded)}
        </div>
      )}

      {isExpanded &&
        !isControlledExpand &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[2147483647] bg-white dark:bg-black backdrop-blur-sm p-4 flex flex-col justify-between">
            <div className="w-full flex-1 flex flex-col overflow-hidden">
              {renderEditorWorkspace(true)}
            </div>
            <div className="flex justify-end pt-3">
              <button
                type="button"
                onClick={() => {
                  if (editorRef.current && !rawHtmlMode) {
                    cleanupEmptyGridBoxes(null);
                    const latest = editorRef.current.innerHTML;
                    internalHtmlRef.current = latest;
                    emitChange(latest);
                  }
                  setInternalExpanded(false);
                }}
                className="px-6 py-2 rounded-xl bg-[#E60000] hover:bg-red-700 text-white font-voda font-bold text-[9px] uppercase cursor-pointer shadow-lg"
              >
                Done Editing
              </button>
            </div>
          </div>,
          document.body
        )}

      {renderActionModal()}
      {renderFullScreenPreviewModal()}

      {toastMessage && (
        <Toast
          message={String(toastMessage)}
          type="success"
          duration={2500}
          className="z-[2147483647]"
          onClose={() => setToastMessage("")}
        />
      )}
    </>
  );
};

export default LandingPageRichTextEditor;