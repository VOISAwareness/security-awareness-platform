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
  AlignEndHorizontal,
  AlignEndVertical,
  AlignHorizontalSpaceAround,
  AlignStartHorizontal,
  AlignHorizontalJustifyCenter,
  AlignStartVertical,
  AlignJustify,
  AlignLeft,
  AlignRight,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
  AlignVerticalSpaceAround,
  ArrowDown,
  ArrowUp,
  Baseline,
  Bold,
  BringToFront,
  Check,
  ChevronDown,
  Code,
  Copy,
  Eraser,
  Eye,
  EyeOff,
  Globe,
  FileText,
  Grid,
  Group,
  Image as ImageIcon,
  ImageUp,
  IndentDecrease,
  IndentIncrease,
  Upload,
  Italic,
  Keyboard,
  Layers,
  Link as LinkIcon,
  List as ListIcon,
  ListOrdered,
  Maximize2,
  Menu,
  Minimize2,
  MousePointerClick,
  Palette,
  Pipette,
  Plus,
  RemoveFormatting,
  RotateCcw,
  RotateCw,
  SendToBack,
  Settings,
  Shapes,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  Square,
  Strikethrough,
  Trash2,
  Type,
  Underline,
  Ungroup,
  Unlink,
  X,
} from "lucide-react";
import { createPortal } from "react-dom";
import HtmlCodeEditor from "../../../../GlobalComponents/HtmlCodeEditor";
import Toast from "../../../../GlobalComponents/Toast";
import EmailPreviewModal from "./EmailPreviewModal";
import { canRedo, canUndo, moveTo, newHistory, recordStep } from "../../../../services/pageHistory";
import {
  DRAG_START_PX,
  GROUP_CLASS,
  ITEM_CLASS,
  PAGE_MIN_HEIGHT,
  PAGE_WIDTH,
  SNAP_PX,
  alignRects,
  clampToPage,
  distributeRects,
  emptyPageHtml,
  fitPageHeight,
  fitScale,
  isLaidOut,
  layerItems,
  layoutPageHtml,
  moveLayers,
  pageOf,
  readRect,
  rectsIntersect,
  renumberLayers,
  resizeRect,
  scaleIntoGroup,
  snapLines,
  snapRect,
  unionRects,
  writeRect,
} from "../../../../services/canvasLayout";
import {
  FONT_SIZES_PX,
  actionLink,
  cleanPastedHtml,
  firstFontFamily,
  fontSizePx,
  fromUnit,
  plainTextToHtml,
  toUnit,
} from "../../../../services/canvasText";
import { api } from "../../../../services/api";
import {
  classifyPicture,
  dataUrlToBlob,
  embeddedPictures,
  findPictures,
  missingPictures,
  pictureFileProblem,
  picturesLabel,
  replacePicture,
} from "../../../../services/pictures";
import scenariosJsonData from "../../ScenariosData.json";
import {
  BROWSER_PAGE_ID,
  ACTION_WORDS,
  BROWSER_PAGE_LINK,
  COMPROMISE_LINK,
  EMAIL_PAGE_ID,
  MAX_PAGES,
  PAGE_LABELS,
  PHISH_LINK,
  dropBrowserLinks,
  isBlankHtml,
  previewDocument,
  toBrowserPageHtml,
  PERSONAL_FX,
} from "../../../../services/simulationPages";

// =========================================================================
// 🎛️ SCALE & FRAME CONTROL VARIABLES
// =========================================================================
const VarEditorOuterFrameThickness = 4; // Thickness of outer frame in pixels

// What the Page size menu allows (px).
const PAGE_SIZE_LIMITS = { minWidth: 320, maxWidth: 1920, minHeight: 200, maxHeight: 6000 };
const PAGE_WIDTH_PRESETS = {
  email: [
    [600, "600px: standard, fits every inbox"],
    [650, "650px"],
    [700, "700px: the widest most reading panes show"],
    [800, "800px: wide (employees may scroll sideways)"],
  ],
  browser: [
    [1280, "1280px: laptop"],
    [1440, "1440px: large laptop"],
    [1920, "1920px: full HD"],
  ],
};
// Grey room around the page on the canvas (px each side).
const CANVAS_GUTTER_PX = 16;
// The canvas's text looks as the preview (and the employee) shows it:
// previewDocument() in simulationPages.js.
const CANVAS_TEXT_STYLE = {
  fontFamily: "'Segoe UI', Calibri, Arial, sans-serif",
  fontSize: "14px",
  lineHeight: "normal",
};

const LEGACY_FX_SPAN =
  /<span style="background-color: rgba\(153, ?0, ?153, ?0\.12\); color: #990099; font-weight: bold; padding: 1px 5px; border-radius: 4px; font-family: monospace;">/g;

// The body's fx: the personal fields, and the phish link (put in as a link).
const FX_PARAMETERS = [
  ...PERSONAL_FX,
  { label: "@PhishLink", desc: "The landing page link", link: true },
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

const PHISHING_ELEMENTS = [
  {
    id: "external-banner",
    label: "External Sender Banner",
    desc: "Amber caution banner for outside organization mail",
  },
  {
    id: "password-expiry",
    label: "Password Expiry Alert Bar",
    desc: "Urgent red alert strip for simulated expiring passwords",
  },
  {
    id: "attachment-card",
    label: "Simulated Attachment Card",
    desc: "Clickable PDF/Excel document attachment block",
  },
  {
    id: "it-notice",
    label: "IT Support Advisory Box",
    desc: "Blue framed helpdesk software patch communication",
  },
  {
    id: "footer-disclaimer",
    label: "Corporate Confidentiality Footer",
    desc: "Legal disclaimer text and compliance contact footer",
  },
];

// =========================================================================
// 🌟 5 CREDENTIAL SCREENS (EACH SUB-PIECE IS A STANDALONE CANVAS ITEM)
// =========================================================================
const CREDENTIAL_TEMPLATES = [
  {
    id: "cred-1",
    name: "Credential Screen 1",
    subtitle: "Microsoft Corporate SSO Login",
    html: `
      <div class="vshield-canvas-item" data-type="card" style="position:relative;display:block;max-width:440px;margin:20px auto;background:#ffffff;border-radius:10px;padding:24px;border:1px solid #E2E8F0;box-shadow:none;">
        <div class="vshield-canvas-item" data-type="element" style="position:relative;display:inline-flex;align-items:center;gap:6px;margin-bottom:12px;padding:4px 6px;cursor:move;border-radius:4px;">
          <span style="display:inline-block;width:10px;height:10px;background:#F25022;"></span>
          <span style="display:inline-block;width:10px;height:10px;background:#7FBA00;"></span>
          <span style="display:inline-block;width:10px;height:10px;background:#00A4EF;"></span>
          <span style="display:inline-block;width:10px;height:10px;background:#FFB900;"></span>
          <span style="font-size:12px;font-weight:700;color:#5E5E5E;margin-left:4px;" contenteditable="true">Microsoft</span>
        </div>
        <div class="vshield-canvas-item" data-type="text" style="position:relative;display:block;margin:0 0 6px 0;cursor:move;">
          <h2 contenteditable="true" style="margin:0;font-size:18px;font-weight:bold;color:#0F172A;outline:none;">Sign in</h2>
        </div>
        <div class="vshield-canvas-item" data-type="text" style="position:relative;display:block;margin:0 0 16px 0;cursor:move;">
          <p contenteditable="true" style="margin:0;font-size:11.5px;color:#64748B;outline:none;">to continue to Microsoft 365 services</p>
        </div>
        <div class="vshield-canvas-item" data-type="input" style="position:relative;display:block;margin-bottom:12px;cursor:move;">
          <input type="email" placeholder="Email, phone, or Skype" value="{{email}}" style="width:100%;padding:8px 10px;border:1px solid #94A3B8;border-radius:4px;font-size:12px;box-sizing:border-box;outline:none;background:#ffffff;" />
        </div>
        <div class="vshield-canvas-item" data-type="input" style="position:relative;display:block;margin-bottom:16px;cursor:move;">
          <input type="password" placeholder="Password" style="width:100%;padding:8px 10px;border:1px solid #94A3B8;border-radius:4px;font-size:12px;box-sizing:border-box;outline:none;background:#ffffff;" />
        </div>
        <div class="vshield-canvas-item vshield-custom-btn" data-type="button" data-action="landing" data-url="{{phishLink}}" style="position:relative;display:block;text-align:right;cursor:move;">
          <a href="{{phishLink}}" onclick="return false;" style="display:inline-block;background-color:#0067B8;color:#ffffff;text-decoration:none;padding:8px 24px;border-radius:4px;font-weight:700;font-size:12px;cursor:pointer;" contenteditable="true">Next</a>
        </div>
      </div>
    `,
  },
  {
    id: "cred-2",
    name: "Credential Screen 2",
    subtitle: "Vodafone IAM Access Gateway",
    html: `
      <div class="vshield-canvas-item" data-type="card" style="position:relative;display:block;max-width:440px;margin:20px auto;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #E2E8F0;box-shadow:none;">
        <div class="vshield-canvas-item" data-type="element" style="position:relative;display:block;background-color:#E60000;padding:16px 20px;cursor:move;">
          <h3 contenteditable="true" style="color:#ffffff;margin:0;font-size:15px;font-weight:900;outline:none;">Vodafone Identity & Access Management</h3>
        </div>
        <div class="vshield-canvas-item" data-type="text" style="position:relative;display:block;margin:16px 20px 14px 20px;cursor:move;">
          <p contenteditable="true" style="font-size:12px;color:#334155;margin:0;outline:none;">Authenticate with your corporate credentials to synchronize identity token.</p>
        </div>
        <div class="vshield-canvas-item" data-type="input" style="position:relative;display:block;margin:0 20px 12px 20px;cursor:move;">
          <label style="font-size:10.5px;font-weight:700;color:#475569;display:block;margin-bottom:3px;" contenteditable="true">User ID</label>
          <input type="text" value="{{email}}" style="width:100%;padding:8px 10px;border:1px solid #CBD5E1;border-radius:6px;font-size:12px;box-sizing:border-box;outline:none;background:#ffffff;" />
        </div>
        <div class="vshield-canvas-item" data-type="input" style="position:relative;display:block;margin:0 20px 18px 20px;cursor:move;">
          <label style="font-size:10.5px;font-weight:700;color:#475569;display:block;margin-bottom:3px;" contenteditable="true">Domain Password</label>
          <input type="password" placeholder="••••••••••••" style="width:100%;padding:8px 10px;border:1px solid #CBD5E1;border-radius:6px;font-size:12px;box-sizing:border-box;outline:none;background:#ffffff;" />
        </div>
        <div class="vshield-canvas-item vshield-custom-btn" data-type="button" data-action="landing" data-url="{{phishLink}}" style="position:relative;display:block;margin:0 20px 20px 20px;cursor:move;">
          <a href="{{phishLink}}" onclick="return false;" style="display:block;text-align:center;background-color:#E60000;color:#ffffff;text-decoration:none;padding:10px;border-radius:6px;font-weight:800;font-size:12.5px;cursor:pointer;" contenteditable="true">Log In to Portal</a>
        </div>
      </div>
    `,
  },
  {
    id: "cred-3",
    name: "Credential Screen 3",
    subtitle: "Office 365 Outlook Web App",
    html: `
      <div class="vshield-canvas-item" data-type="card" style="position:relative;display:block;max-width:440px;margin:20px auto;background:#ffffff;border-radius:10px;padding:24px;border:1px solid #CBD5E1;box-shadow:none;">
        <div class="vshield-canvas-item" data-type="element" style="position:relative;display:block;border-bottom:2px solid #0078D4;padding-bottom:10px;margin-bottom:16px;cursor:move;">
          <h3 contenteditable="true" style="margin:0;color:#0078D4;font-size:16px;font-weight:800;outline:none;">Outlook Web Access</h3>
          <span contenteditable="true" style="font-size:10.5px;color:#64748B;outline:none;display:block;margin-top:2px;">Enter your work credentials to open mailbox</span>
        </div>
        <div class="vshield-canvas-item" data-type="input" style="position:relative;display:block;margin-bottom:12px;cursor:move;">
          <input type="text" placeholder="domain\\username or email" value="{{email}}" style="width:100%;padding:8px 10px;border:1px solid #CBD5E1;border-radius:4px;font-size:12px;box-sizing:border-box;outline:none;background:#ffffff;" />
        </div>
        <div class="vshield-canvas-item" data-type="input" style="position:relative;display:block;margin-bottom:16px;cursor:move;">
          <input type="password" placeholder="Password" style="width:100%;padding:8px 10px;border:1px solid #CBD5E1;border-radius:4px;font-size:12px;box-sizing:border-box;outline:none;background:#ffffff;" />
        </div>
        <div class="vshield-canvas-item vshield-custom-btn" data-type="button" data-action="landing" data-url="{{phishLink}}" style="position:relative;display:inline-block;cursor:move;">
          <a href="{{phishLink}}" onclick="return false;" style="display:inline-block;background-color:#0078D4;color:#ffffff;text-decoration:none;padding:8px 28px;border-radius:4px;font-weight:700;font-size:12px;cursor:pointer;" contenteditable="true">Sign in</a>
        </div>
      </div>
    `,
  },
  {
    id: "cred-4",
    name: "Credential Screen 4",
    subtitle: "Modern Minimal Floating Auth Card",
    html: `
      <div class="vshield-canvas-item" data-type="card" style="position:relative;display:block;max-width:420px;margin:20px auto;background:#F8FAFC;border-radius:12px;padding:24px;border:1px solid #E2E8F0;box-shadow:none;text-align:center;">
        <div class="vshield-canvas-item" data-type="shape" style="position:relative;display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:50%;background:#EEF2F6;margin-bottom:12px;font-size:20px;cursor:move;">🔒</div>
        <div class="vshield-canvas-item" data-type="text" style="position:relative;display:block;margin-bottom:4px;cursor:move;">
          <h3 contenteditable="true" style="margin:0;font-size:16px;font-weight:800;color:#0F172A;outline:none;">Protected Resource</h3>
        </div>
        <div class="vshield-canvas-item" data-type="text" style="position:relative;display:block;margin-bottom:16px;cursor:move;">
          <p contenteditable="true" style="font-size:11px;color:#64748B;margin:0;outline:none;">Please confirm your corporate password</p>
        </div>
        <div class="vshield-canvas-item" data-type="input" style="position:relative;display:block;margin-bottom:14px;cursor:move;text-align:left;">
          <input type="password" placeholder="Enter corporate password" style="width:100%;padding:9px 12px;border:1px solid #CBD5E1;border-radius:8px;font-size:12px;box-sizing:border-box;outline:none;background:#ffffff;" />
        </div>
        <div class="vshield-canvas-item vshield-custom-btn" data-type="button" data-action="landing" data-url="{{phishLink}}" style="position:relative;display:block;cursor:move;">
          <a href="{{phishLink}}" onclick="return false;" style="display:block;background-color:#0F172A;color:#ffffff;text-decoration:none;padding:10px;border-radius:8px;font-weight:700;font-size:12.5px;cursor:pointer;" contenteditable="true">Authenticate</a>
        </div>
      </div>
    `,
  },
  {
    id: "cred-5",
    name: "Credential Screen 5",
    subtitle: "Urgent Password Reset Gateway",
    html: `
      <div class="vshield-canvas-item" data-type="card" style="position:relative;display:block;max-width:450px;margin:20px auto;background:#ffffff;border-radius:10px;padding:22px;border-left:5px solid #E11D48;border-top:1px solid #E2E8F0;border-right:1px solid #E2E8F0;border-bottom:1px solid #E2E8F0;box-shadow:none;">
        <div class="vshield-canvas-item" data-type="shape" style="position:relative;display:inline-block;background:#FFF1F2;color:#9F1239;font-size:9.5px;font-weight:800;padding:3px 10px;border-radius:4px;text-transform:uppercase;margin-bottom:8px;cursor:move;">
          <span contenteditable="true" style="outline:none;">Security Notice</span>
        </div>
        <div class="vshield-canvas-item" data-type="text" style="position:relative;display:block;margin-bottom:4px;cursor:move;">
          <h3 contenteditable="true" style="margin:0;font-size:15px;font-weight:800;color:#881337;outline:none;">Immediate Password Synchronization</h3>
        </div>
        <div class="vshield-canvas-item" data-type="text" style="position:relative;display:block;margin-bottom:14px;cursor:move;">
          <p contenteditable="true" style="font-size:11px;color:#475569;margin:0;outline:none;">Enter existing credentials to complete mandatory password refresh.</p>
        </div>
        <div class="vshield-canvas-item" data-type="input" style="position:relative;display:block;margin-bottom:10px;cursor:move;">
          <input type="email" value="{{email}}" style="width:100%;padding:8px 10px;border:1px solid #CBD5E1;border-radius:6px;font-size:11.5px;box-sizing:border-box;outline:none;background:#ffffff;" />
        </div>
        <div class="vshield-canvas-item" data-type="input" style="position:relative;display:block;margin-bottom:16px;cursor:move;">
          <input type="password" placeholder="Current Domain Password" style="width:100%;padding:8px 10px;border:1px solid #CBD5E1;border-radius:6px;font-size:11.5px;box-sizing:border-box;outline:none;background:#ffffff;" />
        </div>
        <div class="vshield-canvas-item vshield-custom-btn" data-type="button" data-action="landing" data-url="{{phishLink}}" style="position:relative;display:block;cursor:move;">
          <a href="{{phishLink}}" onclick="return false;" style="display:block;text-align:center;background-color:#E11D48;color:#ffffff;text-decoration:none;padding:10px;border-radius:6px;font-weight:800;font-size:12px;cursor:pointer;" contenteditable="true">Synchronize & Retain Access</a>
        </div>
      </div>
    `,
  },
];

// =========================================================================
// 🌟 3. 5 2FA SCREENS (EACH SUB-PIECE IS A STANDALONE CANVAS ITEM)
// =========================================================================
const TWO_FA_TEMPLATES = [
  {
    id: "twofa-1",
    name: "2FA Verification 1",
    subtitle: "6-Digit Authenticator Code Box",
    html: `
      <div class="vshield-canvas-item" data-type="card" style="position:relative;display:block;max-width:420px;margin:20px auto;background:#ffffff;border-radius:10px;padding:24px;border:1px solid #E2E8F0;box-shadow:none;text-align:center;">
        <div class="vshield-canvas-item" data-type="shape" style="position:relative;display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:50%;background:#F1F5F9;font-size:22px;margin-bottom:8px;cursor:move;">📱</div>
        <div class="vshield-canvas-item" data-type="text" style="position:relative;display:block;margin-bottom:4px;cursor:move;">
          <h3 contenteditable="true" style="margin:0;font-size:16px;font-weight:800;color:#0F172A;outline:none;">Two-Factor Authentication</h3>
        </div>
        <div class="vshield-canvas-item" data-type="text" style="position:relative;display:block;margin-bottom:16px;cursor:move;">
          <p contenteditable="true" style="font-size:11px;color:#64748B;margin:0;outline:none;">Enter the 6-digit verification code generated by your Authenticator app.</p>
        </div>
        <div class="vshield-canvas-item" data-type="input" style="position:relative;display:flex;justify-content:center;gap:6px;margin-bottom:18px;cursor:move;">
          <input maxlength="1" style="width:34px;height:40px;text-align:center;font-size:16px;font-weight:bold;border:1.5px solid #CBD5E1;border-radius:6px;outline:none;background:#ffffff;" placeholder="•" />
          <input maxlength="1" style="width:34px;height:40px;text-align:center;font-size:16px;font-weight:bold;border:1.5px solid #CBD5E1;border-radius:6px;outline:none;background:#ffffff;" placeholder="•" />
          <input maxlength="1" style="width:34px;height:40px;text-align:center;font-size:16px;font-weight:bold;border:1.5px solid #CBD5E1;border-radius:6px;outline:none;background:#ffffff;" placeholder="•" />
          <input maxlength="1" style="width:34px;height:40px;text-align:center;font-size:16px;font-weight:bold;border:1.5px solid #CBD5E1;border-radius:6px;outline:none;background:#ffffff;" placeholder="•" />
          <input maxlength="1" style="width:34px;height:40px;text-align:center;font-size:16px;font-weight:bold;border:1.5px solid #CBD5E1;border-radius:6px;outline:none;background:#ffffff;" placeholder="•" />
          <input maxlength="1" style="width:34px;height:40px;text-align:center;font-size:16px;font-weight:bold;border:1.5px solid #CBD5E1;border-radius:6px;outline:none;background:#ffffff;" placeholder="•" />
        </div>
        <div class="vshield-canvas-item vshield-custom-btn" data-type="button" data-action="landing" data-url="{{phishLink}}" style="position:relative;display:block;cursor:move;">
          <a href="{{phishLink}}" onclick="return false;" style="display:block;background-color:#2563EB;color:#ffffff;text-decoration:none;padding:9px;border-radius:6px;font-weight:700;font-size:12.5px;cursor:pointer;" contenteditable="true">Verify Code</a>
        </div>
      </div>
    `,
  },
  {
    id: "twofa-2",
    name: "2FA Verification 2",
    subtitle: "Mobile SMS OTP Verification Code",
    html: `
      <div class="vshield-canvas-item" data-type="card" style="position:relative;display:block;max-width:430px;margin:20px auto;background:#ffffff;border-radius:10px;padding:24px;border:1px solid #E2E8F0;box-shadow:none;">
        <div class="vshield-canvas-item" data-type="text" style="position:relative;display:block;margin-bottom:6px;cursor:move;">
          <h3 contenteditable="true" style="margin:0;font-size:15px;font-weight:800;color:#0F172A;outline:none;">We sent a code to your phone</h3>
        </div>
        <div class="vshield-canvas-item" data-type="text" style="position:relative;display:block;margin-bottom:14px;cursor:move;">
          <p contenteditable="true" style="font-size:11.5px;color:#64748B;margin:0;outline:none;">Please enter the 6-digit text message code sent to <strong>+XX •••• ••84</strong>.</p>
        </div>
        <div class="vshield-canvas-item" data-type="input" style="position:relative;display:block;margin-bottom:14px;cursor:move;">
          <input type="text" placeholder="Enter 6-digit SMS code" style="width:100%;padding:9px 12px;border:1.5px solid #94A3B8;border-radius:6px;font-size:13px;letter-spacing:2px;font-weight:bold;box-sizing:border-box;outline:none;background:#ffffff;" />
        </div>
        <div class="vshield-canvas-item" data-type="element" style="position:relative;display:flex;justify-content:space-between;align-items:center;cursor:move;">
          <div class="vshield-canvas-item vshield-custom-btn" data-type="button" data-action="landing" data-url="{{phishLink}}" style="display:inline-block;">
            <a href="{{phishLink}}" onclick="return false;" style="background-color:#E60000;color:#ffffff;text-decoration:none;padding:8px 24px;border-radius:6px;font-weight:800;font-size:12px;cursor:pointer;" contenteditable="true">Submit OTP</a>
          </div>
          <span style="font-size:10px;color:#64748B;" contenteditable="true">Resend code in 45s</span>
        </div>
      </div>
    `,
  },
  {
    id: "twofa-3",
    name: "2FA Verification 3",
    subtitle: "Number Matching Push Notification",
    html: `
      <div class="vshield-canvas-item" data-type="card" style="position:relative;display:block;max-width:400px;margin:20px auto;background:#ffffff;border-radius:12px;padding:24px;border:1px solid #CBD5E1;box-shadow:none;text-align:center;">
        <div class="vshield-canvas-item" data-type="text" style="position:relative;display:block;margin-bottom:8px;cursor:move;">
          <h3 contenteditable="true" style="margin:0;font-size:16px;font-weight:800;color:#0F172A;outline:none;">Check your Authenticator app</h3>
        </div>
        <div class="vshield-canvas-item" data-type="text" style="position:relative;display:block;margin-bottom:16px;cursor:move;">
          <p contenteditable="true" style="font-size:11.5px;color:#64748B;margin:0;outline:none;">We've sent a notification to your mobile device. Enter the number shown below to approve sign-in.</p>
        </div>
        <div class="vshield-canvas-item" data-type="shape" style="position:relative;display:inline-flex;align-items:center;justify-content:center;width:72px;height:72px;border-radius:12px;background:#F1F5F9;border:2px dashed #0078D4;font-size:32px;font-weight:900;color:#0078D4;margin-bottom:18px;cursor:move;">
          <span contenteditable="true" style="outline:none;">47</span>
        </div>
        <div class="vshield-canvas-item" data-type="text" style="position:relative;display:block;margin-bottom:16px;cursor:move;">
          <p style="font-size:10.5px;color:#94A3B8;margin:0;">No notification received? <a href="{{phishLink}}" onclick="return false;" style="color:#0078D4;text-decoration:underline;">Send another request</a></p>
        </div>
        <div class="vshield-canvas-item vshield-custom-btn" data-type="button" data-action="landing" data-url="{{phishLink}}" style="position:relative;display:block;cursor:move;">
          <a href="{{phishLink}}" onclick="return false;" style="display:block;background-color:#0078D4;color:#ffffff;text-decoration:none;padding:9px;border-radius:6px;font-weight:700;font-size:12px;cursor:pointer;" contenteditable="true">I Approved on My Phone</a>
        </div>
      </div>
    `,
  },
  {
    id: "twofa-4",
    name: "2FA Verification 4",
    subtitle: "Hardware Security Key PIN Attestation",
    html: `
      <div class="vshield-canvas-item" data-type="card" style="position:relative;display:block;max-width:430px;margin:20px auto;background:#ffffff;border-radius:10px;padding:22px;border:1px solid #E2E8F0;box-shadow:none;">
        <div class="vshield-canvas-item" data-type="element" style="position:relative;display:flex;align-items:center;gap:8px;margin-bottom:12px;cursor:move;">
          <span style="font-size:20px;">🔑</span>
          <h3 contenteditable="true" style="margin:0;font-size:15px;font-weight:800;color:#0F172A;outline:none;">Security Key Required</h3>
        </div>
        <div class="vshield-canvas-item" data-type="text" style="position:relative;display:block;margin-bottom:14px;cursor:move;">
          <p contenteditable="true" style="font-size:11.5px;color:#475569;margin:0;outline:none;">Insert your Vodafone FIDO2 security token into the USB port and touch the gold sensor button.</p>
        </div>
        <div class="vshield-canvas-item" data-type="input" style="position:relative;display:block;margin-bottom:14px;cursor:move;">
          <label style="font-size:10.5px;font-weight:700;color:#475569;display:block;margin-bottom:3px;" contenteditable="true">Security Key PIN</label>
          <input type="password" placeholder="••••" style="width:100%;padding:8px 10px;border:1px solid #CBD5E1;border-radius:6px;font-size:12px;box-sizing:border-box;outline:none;background:#ffffff;" />
        </div>
        <div class="vshield-canvas-item vshield-custom-btn" data-type="button" data-action="landing" data-url="{{phishLink}}" style="position:relative;display:block;cursor:move;">
          <a href="{{phishLink}}" onclick="return false;" style="display:block;text-align:center;background-color:#0F172A;color:#ffffff;text-decoration:none;padding:9px;border-radius:6px;font-weight:700;font-size:12px;cursor:pointer;" contenteditable="true">Confirm Security Key</a>
        </div>
      </div>
    `,
  },
  {
    id: "twofa-5",
    name: "2FA Verification 5",
    subtitle: "Duo Mobile Approval Screen",
    html: `
      <div class="vshield-canvas-item" data-type="card" style="position:relative;display:block;max-width:420px;margin:20px auto;background:#ffffff;border-radius:10px;padding:22px;border:1.5px solid #22C55E;box-shadow:none;text-align:center;">
        <div class="vshield-canvas-item" data-type="shape" style="position:relative;display:inline-block;padding:4px 10px;border-radius:9999px;background:#DCFCE7;color:#166534;font-size:10px;font-weight:800;margin-bottom:8px;cursor:move;">
          <span contenteditable="true" style="outline:none;">DUO SECURITY</span>
        </div>
        <div class="vshield-canvas-item" data-type="text" style="position:relative;display:block;margin-bottom:6px;cursor:move;">
          <h3 contenteditable="true" style="margin:0;font-size:16px;font-weight:800;color:#0F172A;outline:none;">Duo Push Sent</h3>
        </div>
        <div class="vshield-canvas-item" data-type="text" style="position:relative;display:block;margin-bottom:16px;cursor:move;">
          <p contenteditable="true" style="font-size:11.5px;color:#64748B;margin:0;outline:none;">Pushed to iOS Device (iPhone 15). Tap <strong>Approve</strong> on your screen to proceed.</p>
        </div>
        <div class="vshield-canvas-item" data-type="shape" style="position:relative;display:inline-block;width:12px;height:12px;border-radius:50%;background:#22C55E;margin-bottom:16px;cursor:move;"></div>
        <div class="vshield-canvas-item vshield-custom-btn" data-type="button" data-action="landing" data-url="{{phishLink}}" style="position:relative;display:block;cursor:move;">
          <a href="{{phishLink}}" onclick="return false;" style="display:block;background-color:#16A34A;color:#ffffff;text-decoration:none;padding:9px;border-radius:6px;font-weight:700;font-size:12px;cursor:pointer;" contenteditable="true">Continue Once Approved</a>
        </div>
      </div>
    `,
  },
];

// =========================================================================
// 🌟 4. TEMPLATES (DECOMPOSED INTO STANDALONE CANVAS ITEMS)
// =========================================================================
const FALLBACK_TEMPLATES = [
  {
    id: "sso-sync",
    name: "Global SSO Synchronization",
    html: `
      <div class="vshield-canvas-item" data-type="card" style="position:relative;display:block;max-width:560px;margin:10px auto;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #E2E8F0;box-shadow:none;">
        <div class="vshield-canvas-item" data-type="element" style="position:relative;display:block;background-color:#E60000;padding:16px 20px;cursor:move;">
          <h2 contenteditable="true" style="color:#ffffff;margin:0;font-size:16px;font-weight:900;outline:none;">Vodafone Identity & Access Management</h2>
        </div>
        <div class="vshield-canvas-item" data-type="text" style="position:relative;display:block;padding:20px;color:#1E293B;font-size:13px;line-height:1.5;cursor:move;">
          <p contenteditable="true" style="margin-top:0;">Dear <strong>{{userName}}</strong>,</p>
          <p contenteditable="true">Your Vodafone Single Sign-On (SSO) credentials expired today. To prevent uninterrupted access to corporate portals, immediate synchronization is required.</p>
        </div>
        <div class="vshield-canvas-item vshield-custom-btn" data-type="button" data-action="landing" data-url="{{phishLink}}" style="position:relative;display:block;text-align:center;margin:16px 0;cursor:move;">
          <a href="{{phishLink}}" onclick="return false;" style="background-color:#E60000;color:#ffffff;text-decoration:none;padding:10px 26px;border-radius:6px;font-weight:700;display:inline-block;cursor:pointer;" contenteditable="true">Verify Credentials Now</a>
        </div>
        <div class="vshield-canvas-item" data-type="text" style="position:relative;display:block;padding:0 20px 16px 20px;font-size:11px;color:#64748B;cursor:move;">
          <p contenteditable="true" style="margin:0;">Automated advisory from Vodafone Group IT Security.</p>
        </div>
      </div>
    `,
  },
  {
    id: "audit-drill",
    name: "Finance Regulatory Compliance Audit",
    html: `
      <div class="vshield-canvas-item" data-type="card" style="position:relative;display:block;max-width:560px;margin:10px auto;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #E2E8F0;box-shadow:none;">
        <div class="vshield-canvas-item" data-type="element" style="position:relative;display:block;background-color:#B91C1C;padding:16px 20px;cursor:move;">
          <h2 contenteditable="true" style="color:#ffffff;margin:0;font-size:16px;font-weight:900;outline:none;">Vodafone Group Compliance Office</h2>
        </div>
        <div class="vshield-canvas-item" data-type="text" style="position:relative;display:block;padding:20px;color:#1E293B;font-size:13px;line-height:1.5;cursor:move;">
          <p contenteditable="true" style="margin-top:0;">Attention <strong>{{userName}}</strong>,</p>
          <p contenteditable="true">Your mandatory annual learning certification is overdue. Please complete your attestation immediately to maintain system permissions.</p>
        </div>
        <div class="vshield-canvas-item vshield-custom-btn" data-type="button" data-action="landing" data-url="{{phishLink}}" style="position:relative;display:block;text-align:center;margin:16px 0 20px 0;cursor:move;">
          <a href="{{phishLink}}" onclick="return false;" style="background-color:#B91C1C;color:#ffffff;text-decoration:none;padding:10px 26px;border-radius:6px;font-weight:700;display:inline-block;cursor:pointer;" contenteditable="true">Complete Training Module</a>
        </div>
      </div>
    `,
  },
  {
    id: "rewards-benefits",
    name: "Total Rewards & Benefits Choice",
    html: `
      <div class="vshield-canvas-item" data-type="card" style="position:relative;display:block;max-width:560px;margin:10px auto;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #E2E8F0;box-shadow:none;">
        <div class="vshield-canvas-item" data-type="element" style="position:relative;display:block;background-color:#16A34A;padding:16px 20px;cursor:move;">
          <h2 contenteditable="true" style="color:#ffffff;margin:0;font-size:16px;font-weight:800;outline:none;">VOIS Total Rewards & Employee Benefits</h2>
        </div>
        <div class="vshield-canvas-item" data-type="text" style="position:relative;display:block;padding:20px;color:#1E293B;font-size:13px;line-height:1.5;cursor:move;">
          <p contenteditable="true" style="margin-top:0;">Hello <strong>{{userName}}</strong>,</p>
          <p contenteditable="true">The flexible benefit adjustment window for this financial cycle is closing soon. Review and confirm your cafeteria benefit allowances.</p>
        </div>
        <div class="vshield-canvas-item vshield-custom-btn" data-type="button" data-action="landing" data-url="{{phishLink}}" style="position:relative;display:block;text-align:center;margin:16px 0 20px 0;cursor:move;">
          <a href="{{phishLink}}" onclick="return false;" style="background-color:#16A34A;color:#ffffff;padding:10px 26px;border-radius:6px;text-decoration:none;font-weight:700;display:inline-block;cursor:pointer;" contenteditable="true">Review Benefits Selection</a>
        </div>
      </div>
    `,
  },
  {
    id: "security-patch",
    name: "Critical OS Patch Update (KB504821)",
    html: `
      <div class="vshield-canvas-item" data-type="card" style="position:relative;display:block;max-width:560px;margin:10px auto;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #CBD5E1;box-shadow:none;">
        <div class="vshield-canvas-item" data-type="element" style="position:relative;display:block;background-color:#0F172A;padding:16px 20px;border-bottom:3px solid #E60000;cursor:move;">
          <h2 contenteditable="true" style="color:#ffffff;margin:0;font-size:16px;font-weight:900;outline:none;">VSSI Global Desktop Engineering Support</h2>
        </div>
        <div class="vshield-canvas-item" data-type="text" style="position:relative;display:block;padding:20px;color:#0F172A;font-size:13px;line-height:1.5;cursor:move;">
          <p contenteditable="true" style="margin-top:0;">Hello <strong>{{userName}}</strong>,</p>
          <p contenteditable="true">A critical zero-day security flaw was identified on remote workstations. Please authorize immediate queue deployment for update KB504821.</p>
        </div>
        <div class="vshield-canvas-item vshield-custom-btn" data-type="button" data-action="landing" data-url="{{phishLink}}" style="position:relative;display:block;text-align:center;margin:16px 0 20px 0;cursor:move;">
          <a href="{{phishLink}}" onclick="return false;" style="background-color:#0F172A;color:#ffffff;text-decoration:none;padding:10px 26px;border-radius:6px;font-weight:700;display:inline-block;cursor:pointer;" contenteditable="true">Install & Authorize Patch</a>
        </div>
      </div>
    `,
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

const EMPTY_HTML_VALUES = ["", "<br>", "<div><br></div>", "<p><br></p>"];

// The On-Click action a link already carries: the browser page, the
// compromise (on page 2), or the landing page.
const linkAction = (href) => {
  const link = String(href || "");
  if (/next=browser/i.test(link)) return "page";
  if (/\{\{\s*compromiseLink\s*\}\}/i.test(link)) return "training";
  return "landing";
};

const CLOSED_ACTION_MODAL = { open: false, element: null, actionType: "landing" };

// Marks canvas items copied to the clipboard, so a paste puts back the items.
const ITEM_COPY_MARK = "data-vshield-copy";

// =========================================================================
// BROWSER SAFE ZONE GUIDE (browser page only; visual only, never saved)
// How far down the browser page is seen before the employee has to scroll,
// on the smallest common laptop screen (1366 x 768, or 1920 x 1080 at 125%):
// the window less the tab and address bars and the taskbar. The same line
// the Landing page editor draws (its SAFE_ZONE_HEIGHT_PX). Bigger screens
// show more, so whatever is above the line is seen on them too.
// =========================================================================
const BROWSER_SAFE_ZONE_PX = 580;


const calculateAspectRatio = (width, height) => {
  if (!width || !height) return "1:1";
  const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(Math.round(width), Math.round(height));
  const wRatio = Math.round(width / divisor);
  const hRatio = Math.round(height / divisor);
  if (wRatio > 32 || hRatio > 32) {
    return `${(width / height).toFixed(2)}:1`;
  }
  return `${wRatio}:${hRatio}`;
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

// =========================================================================
// 🌟 ADVANCED TEMPLATE COMPONENTIZER:
// Automatically parses and transforms ANY template's sub-pieces into
// standalone selectable .vshield-canvas-item elements
// =========================================================================
const componentizeTemplateHtml = (htmlString) => {
  if (!htmlString || EMPTY_HTML_VALUES.includes(htmlString.trim().toLowerCase())) return htmlString;

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

    // 1. Buttons & Links: <a> tags
    const links = body.querySelectorAll("a");
    links.forEach((a) => {
      const parent = a.parentElement;
      const isButtonLike =
        a.style.backgroundColor ||
        a.style.padding ||
        a.style.display === "inline-block" ||
        (parent && parent.children.length === 1 && parent.tagName === "DIV" && (parent.style.textAlign === "center" || parent.style.margin));

      if (parent && isButtonLike && parent.children.length === 1 && parent.tagName === "DIV" && parent !== body) {
        markElement(parent, "button");
        parent.classList.add("vshield-custom-btn");
        parent.setAttribute("data-action", linkAction(a.getAttribute("href")));
        parent.setAttribute("data-url", a.getAttribute("href") || "{{phishLink}}");
        a.setAttribute("onclick", "return false;");
        a.setAttribute("contenteditable", "true");
        a.style.cursor = "pointer";
      } else {
        markElement(a, "button");
        a.classList.add("vshield-custom-btn");
        a.setAttribute("data-action", linkAction(a.getAttribute("href")));
        a.setAttribute("data-url", a.getAttribute("href") || "{{phishLink}}");
        a.setAttribute("onclick", "return false;");
        a.setAttribute("contenteditable", "true");
        a.style.cursor = "pointer";
      }
    });

    // 2. Images: <img>
    const imgs = body.querySelectorAll("img");
    imgs.forEach((img) => {
      const parent = img.parentElement;
      if (parent && parent !== body && parent.children.length === 1 && parent.tagName === "DIV") {
        markElement(parent, "image");
      } else {
        markElement(img, "image");
      }
    });

    // 3. Headings: h1, h2, h3, h4, h5, h6
    const headings = body.querySelectorAll("h1, h2, h3, h4, h5, h6");
    headings.forEach((h) => {
      markElement(h, "text");
      h.setAttribute("contenteditable", "true");
      h.style.outline = "none";
    });

    // 4. Paragraphs and blockquotes
    const textNodes = body.querySelectorAll("p, blockquote");
    textNodes.forEach((p) => {
      if (!p.querySelector(".vshield-canvas-item")) {
        markElement(p, "text");
        p.setAttribute("contenteditable", "true");
        p.style.outline = "none";
      }
    });

    // 5. Form inputs
    const inputs = body.querySelectorAll("input, select, textarea");
    inputs.forEach((inp) => {
      const parent = inp.parentElement;
      if (parent && parent !== body && parent.children.length === 1 && parent.tagName === "DIV") {
        markElement(parent, "input");
      } else {
        markElement(inp, "input");
      }
    });

    // 6. Styled Containers, Banners, Headers, and Callouts
    const divs = body.querySelectorAll("div, header, footer, section, table, td");
    divs.forEach((d) => {
      if (!d.classList.contains("vshield-canvas-item") && d !== body) {
        const bg = d.style.backgroundColor;
        const hasBg = bg && bg !== "transparent" && bg !== "inherit";
        const hasBorder = d.style.border || d.style.borderLeft || d.style.borderTop || d.style.borderBottom || d.style.borderRight;
        const isMaxWidth = d.style.maxWidth || d.style.width === "100%";

        if (isMaxWidth && d.children.length > 1) {
          markElement(d, "card");
        } else if (hasBg || hasBorder) {
          markElement(d, "element");
          if (!d.querySelector("input, select, textarea") && d.children.length <= 2) {
            d.setAttribute("contenteditable", "true");
          }
        }
      }
    });

    // 7. If top element is not marked, mark it as card
    const topChild = body.firstElementChild;
    if (topChild && !topChild.classList.contains("vshield-canvas-item")) {
      markElement(topChild, "card");
    }

    return body.innerHTML;
  } catch (err) {
    console.warn("Could not componentize template HTML:", err);
    return htmlString;
  }
};

const EmailBodyRichTextEditor = ({
  value = "",
  onChange,
  // Page 2, the fake browser page an email element can open ("" for none).
  browserPage = "",
  onBrowserPageChange,
  // Sender and subject for the email preview: { senderName, senderEmail, subject }.
  previewMeta = {},
  placeholder = "Type your email content here or choose an Email Body template...",
  disabled = false,
  minHeight = 300,
  className = "",
}) => {
  const editorRef = useRef(null);
  const workspaceRef = useRef(null);
  const imageInputRef = useRef(null);
  const savedSelectionRef = useRef(null);
  const internalHtmlRef = useRef(value || "");

  const [rawHtmlMode, setRawHtmlMode] = useState(false);
  const [rawHtmlCode, setRawHtmlCode] = useState(value || "");
  const [isExpanded, setIsExpanded] = useState(false);
  const [toast, setToast] = useState(null);
  const [showFxMenu, setShowFxMenu] = useState(false);
  const [showShapeMenu, setShowShapeMenu] = useState(false);
  const [showButtonMenu, setShowButtonMenu] = useState(false);
  const [showElementsMenu, setShowElementsMenu] = useState(false);
  const [showBodyMenu, setShowBodyMenu] = useState(false);
  const [showCanvasBgMenu, setShowCanvasBgMenu] = useState(false);
  const [showGridlines, setShowGridlines] = useState(false);
  const [showShadowMenu, setShowShadowMenu] = useState(false);
  const [showRoundedMenu, setShowRoundedMenu] = useState(false);
  // How much a corner rounds when turned on (per-corner controls).
  const [cornerAmount, setCornerAmount] = useState(12);
  const [showBorderMenu, setShowBorderMenu] = useState(false);
  const [showPagesMenu, setShowPagesMenu] = useState(false);
  const [showNewPageModal, setShowNewPageModal] = useState(false);
  const [canvasBgColor, setCanvasBgColor] = useState("#FFFFFF");
  const [activeElement, setActiveElement] = useState(null);
  const [aspectRatioText, setAspectRatioText] = useState("");
  // Grouping (canvasGroups.js): the top-level blocks picked to group, the
  // drag-select box being drawn, and the guide line (x, layout px from the
  // canvas's left edge) of the edge or centre a dragged item snapped to.
  const [pickedBlocks, setPickedBlocks] = useState([]);
  const [selectBox, setSelectBox] = useState(null);
  const [snapGuide, setSnapGuide] = useState(null);
  // Bumped while dragging so the selection frame follows the item.
  const [, setDragFrame] = useState(0);
  // A press that became a drag or a box-select is not also a click.
  const swallowClickRef = useRef(false);
  // toOverlay (below) for the picture marks, which are measured earlier.
  const toOverlayRef = useRef(null);
  // tidyPage (below) for the callbacks defined before it.
  const tidyPageRef = useRef(null);
  // The scroll area the page sits in (frames and toolbars are drawn there).
  const scrollerRef = useRef(null);
  // The item whose text is being typed in (double-click), if any.
  const editingRef = useRef(null);
  const [editingItem, setEditingItem] = useState(null);
  // Each paste of the same copy lands a little further down and right.
  const pasteCountRef = useRef(0);
  // The page drawn at this scale so its whole width fits the editor.
  const [canvasFit, setCanvasFit] = useState(1);
  const [pageHeightPx, setPageHeightPx] = useState(PAGE_MIN_HEIGHT.email);
  const [pageWidthPx, setPageWidthPx] = useState(PAGE_WIDTH.email);
  const [showPageSizeMenu, setShowPageSizeMenu] = useState(false);
  const pageSizeMenuRef = useRef(null);
  const [showOnclicksMenu, setShowOnclicksMenu] = useState(false);
  const onclicksMenuRef = useRef(null);
  // The Items pane (hamburger button): every item on the page, to select,
  // reorder, group, rename and delete.
  const [showItemsPane, setShowItemsPane] = useState(false);
  const [renamingItem, setRenamingItem] = useState(null); // { el, name }
  const [dropTargetEl, setDropTargetEl] = useState(null);
  const draggedItemRef = useRef(null);
  // Groups closed in the Selection pane.
  const collapsedGroupsRef = useRef(new WeakSet());
  // Stable React keys for page elements, without writing ids into the HTML.
  const itemKeysRef = useRef(new WeakMap());
  const itemKeyCountRef = useRef(0);

  // Page 1 is the email (value / onChange); page 2, when there is one, the
  // browser page (browserPage / onBrowserPageChange).
  const [pages, setPages] = useState(() => {
    const list = [{ id: EMAIL_PAGE_ID, name: PAGE_LABELS[EMAIL_PAGE_ID], html: value || "" }];
    if (!isBlankHtml(browserPage)) {
      list.push({ id: BROWSER_PAGE_ID, name: PAGE_LABELS[BROWSER_PAGE_ID], html: browserPage });
    }
    return list;
  });
  const [currentPageId, setCurrentPageId] = useState(EMAIL_PAGE_ID);
  const [showBrowserPreview, setShowBrowserPreview] = useState(false);
  // Does the page run below its safe-zone line?
  const [safeZoneOverflow, setSafeZoneOverflow] = useState(false);

  // Pictures employees could not see (see services/pictures.js): the page's
  // missing addresses, and where each one sits on the canvas.
  const [pictureIssues, setPictureIssues] = useState({ missing: [], marks: [] });
  // Other websites' pictures that failed to load in the editor.
  const [failedPictures, setFailedPictures] = useState(() => new Set());
  // The picture being uploaded (its old address), for "Uploading..." labels.
  const [pictureBusy, setPictureBusy] = useState(null);
  const replaceInputRef = useRef(null);
  const replaceTargetRef = useRef(null);
  // data: pictures already sent to hosting (or tried), so each goes once.
  const movedPicturesRef = useRef(new Set());
  const missingCountRef = useRef(0);
  const missingToastRef = useRef(null);
  const [emailPreview, setEmailPreview] = useState({ open: false, html: "" });

  const pagesRef = useRef(pages);
  pagesRef.current = pages;
  const currentPageIdRef = useRef(currentPageId);
  currentPageIdRef.current = currentPageId;

  // Undo / redo, one history per page: { [pageId]: { stack, index, lastAt } }.
  // Held in a ref (undo needs it at once); `historyState` is what the
  // toolbar shows for the page being edited.
  const historiesRef = useRef({
    [EMAIL_PAGE_ID]: newHistory(value || ""),
    ...(isBlankHtml(browserPage) ? {} : { [BROWSER_PAGE_ID]: newHistory(browserPage) }),
  });
  const [historyState, setHistoryState] = useState({ canUndo: false, canRedo: false });
  // Set by typing (canvas or HTML source), so keystrokes close together
  // become one undo step instead of one per character.
  const typingRef = useRef(false);

  // What the text at the caret looks like, for the toolbar's style, font and
  // size boxes (they show the text being edited, not a fixed default).
  const [textFormat, setTextFormat] = useState({ block: "p", font: "", size: null });
  // The units the size and spacing boxes use; remembered between visits.
  const [lengthUnit, setLengthUnit] = useState(() => {
    try {
      return window.localStorage.getItem("vshield.editor.unit") === "cm" ? "cm" : "px";
    } catch {
      return "px";
    }
  });
  const changeLengthUnit = (unit) => {
    setLengthUnit(unit);
    try {
      window.localStorage.setItem("vshield.editor.unit", unit);
    } catch {
      // Private mode: the choice lasts this visit only.
    }
  };
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showTextColorMenu, setShowTextColorMenu] = useState(false);
  const [showLinkMenu, setShowLinkMenu] = useState(false);
  // Items copied with Ctrl+C / Ctrl+X, pasted with Ctrl+V (HTML, this tab only).
  const itemClipboardRef = useRef(null);
  const textColorMenuRef = useRef(null);
  const linkMenuRef = useRef(null);

  const [selectionColorMenu, setSelectionColorMenu] = useState({
    visible: false,
    top: 0,
    left: 0,
  });

  const [actionConfigModal, setActionConfigModal] = useState(CLOSED_ACTION_MODAL);

  const fxRef = useRef(null);
  const shapeMenuRef = useRef(null);
  const buttonMenuRef = useRef(null);
  const elementsMenuRef = useRef(null);
  const bodyMenuRef = useRef(null);
  const canvasBgRef = useRef(null);
  const pagesMenuRef = useRef(null);

  const showToast = useCallback((message, type = "info", title) => {
    setToast({ message, type, title });
  }, []);

  // The page being edited reports to its own field: the email to onChange,
  // the browser page to onBrowserPageChange.
  const emitToParent = useCallback(
    (html) => {
      if (currentPageIdRef.current === BROWSER_PAGE_ID) onBrowserPageChange?.(html);
      else onChange?.(html);
    },
    [onChange, onBrowserPageChange],
  );

  // ---------------------------------------------------------------
  // Undo / redo, kept separately for the email and the browser page
  // ---------------------------------------------------------------
  const publishHistory = useCallback((pageId = currentPageIdRef.current) => {
    const h = historiesRef.current[pageId];
    setHistoryState({ canUndo: canUndo(h), canRedo: canRedo(h) });
  }, []);

  // A page's history starts again from `html` (a page created, or replaced
  // from outside: a scenario loaded, a draft restored).
  const resetPageHistory = useCallback(
    (pageId, html) => {
      historiesRef.current[pageId] = newHistory(html);
      if (pageId === currentPageIdRef.current) publishHistory(pageId);
    },
    [publishHistory],
  );

  const forgetPageHistory = useCallback((pageId) => {
    delete historiesRef.current[pageId];
  }, []);

  // One step on a page's history (typing close together is one step).
  const recordHistory = useCallback(
    (pageId, html, { typing = false } = {}) => {
      historiesRef.current[pageId] = recordStep(historiesRef.current[pageId], html, { typing });
      if (pageId === currentPageIdRef.current) publishHistory(pageId);
    },
    [publishHistory],
  );

  // Showing a page: its history carries on, and a change made to it while it
  // was not shown (e.g. its links reset when page 2 was deleted) is one step.
  const syncPageHistory = useCallback(
    (pageId, html) => {
      if (!historiesRef.current[pageId]) resetPageHistory(pageId, html);
      else recordHistory(pageId, html);
      publishHistory(pageId);
    },
    [publishHistory, recordHistory, resetPageHistory],
  );

  const emitChange = useCallback(
    (html) => {
      const updatedHtml = html || "";
      const pageId = currentPageIdRef.current;
      internalHtmlRef.current = updatedHtml;
      emitToParent(updatedHtml);

      const typing = typingRef.current;
      typingRef.current = false;
      recordHistory(pageId, updatedHtml, { typing });

      setPages((prev) =>
        prev.map((p) => (p.id === pageId ? { ...p, html: updatedHtml } : p))
      );
      pagesRef.current = pagesRef.current.map((p) =>
        p.id === pageId ? { ...p, html: updatedHtml } : p
      );
    },
    [emitToParent, recordHistory],
  );

  // Put a step back on the page being edited, without recording it again.
  const restoreHistoryStep = useCallback(
    (step) => {
      const pageId = currentPageIdRef.current;
      const moved = moveTo(historiesRef.current[pageId], step);
      if (!moved) return false;
      historiesRef.current[pageId] = moved;
      const restored = moved.stack[step];
      internalHtmlRef.current = restored;
      if (editorRef.current) editorRef.current.innerHTML = restored;
      editingRef.current = null;
      setEditingItem(null);
      setPickedBlocks([]);
      const restoredPage = pageOf(editorRef.current);
      if (restoredPage) {
        setPageHeightPx(restoredPage.offsetHeight);
        setPageWidthPx(restoredPage.offsetWidth || PAGE_WIDTH.email);
      }
      setRawHtmlCode(restored);
      emitToParent(restored);
      pagesRef.current = pagesRef.current.map((p) =>
        p.id === pageId ? { ...p, html: restored } : p
      );
      setPages(pagesRef.current);
      setActiveElement(null);
      publishHistory(pageId);
      return true;
    },
    [emitToParent, publishHistory],
  );

  const handleUndo = useCallback(() => {
    const h = historiesRef.current[currentPageIdRef.current];
    if (h && restoreHistoryStep(h.index - 1)) {
      showToast(`Undo (${PAGE_LABELS[currentPageIdRef.current]})`, "info");
    }
  }, [restoreHistoryStep, showToast]);

  const handleRedo = useCallback(() => {
    const h = historiesRef.current[currentPageIdRef.current];
    if (h && restoreHistoryStep(h.index + 1)) {
      showToast(`Redo (${PAGE_LABELS[currentPageIdRef.current]})`, "info");
    }
  }, [restoreHistoryStep, showToast]);

  const hasBrowserPage = pages.some((p) => p.id === BROWSER_PAGE_ID);

  // The browser page's lowest content, against its safe-zone line. In
  // layout pixels (offsets), so the page zoom and full screen do not matter.
  const checkSafeZone = useCallback(() => {
    const page = pageOf(editorRef.current);
    if (!page || currentPageIdRef.current !== BROWSER_PAGE_ID) return;
    let bottom = 0;
    for (const el of layerItems(page)) {
      if (el.style.display === "none") continue;
      bottom = Math.max(bottom, (parseFloat(el.style.top) || 0) + el.offsetHeight);
    }
    const over = bottom > BROWSER_SAFE_ZONE_PX + 4;
    setSafeZoneOverflow((prev) => (prev === over ? prev : over));
  }, []);

  // The page scaled so its whole width fits the canvas (never above 100%).
  useEffect(() => {
    const sc = scrollerRef.current;
    if (!sc) return undefined;
    const width = pageWidthPx;
    const measure = () => {
      const next = fitScale(sc.clientWidth - CANVAS_GUTTER_PX * 2, width);
      setCanvasFit((prev) => (Math.abs(prev - next) < 0.001 ? prev : next));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(sc);
    return () => observer.disconnect();
  }, [currentPageId, rawHtmlMode, isExpanded, showItemsPane, pageWidthPx]);

  // After every change, page switch, mode change or window resize.
  useEffect(() => {
    const frame = requestAnimationFrame(checkSafeZone);
    return () => cancelAnimationFrame(frame);
  }, [pages, currentPageId, rawHtmlMode, isExpanded, checkSafeZone]);
  useEffect(() => {
    window.addEventListener("resize", checkSafeZone);
    return () => window.removeEventListener("resize", checkSafeZone);
  }, [checkSafeZone]);
  // ---------------------------------------------------------------
  // Pictures: find the ones employees could not see, mark them where they
  // are, and upload replacements to our picture hosting.
  // ---------------------------------------------------------------
  const isMissingPicture = useCallback(
    (src) => classifyPicture(src) === "missing" || failedPictures.has(src),
    [failedPictures],
  );

  const scanPictures = useCallback(() => {
    const html = rawHtmlMode ? rawHtmlCode : editorRef.current?.innerHTML ?? "";
    const missing = [
      ...new Set([
        ...missingPictures(html),
        ...findPictures(html).map((p) => p.src).filter((src) => failedPictures.has(src)),
      ]),
    ];

    const marks = [];
    const editor = editorRef.current;
    if (!rawHtmlMode && editor && scrollerRef.current) {
      const mark = (el, src, kind) => {
        const at = toOverlayRef.current?.(el.getBoundingClientRect());
        if (!at) return;
        marks.push({
          key: `${marks.length}-${src}`,
          src,
          kind,
          left: at.left,
          top: at.top,
          width: Math.max(at.width, 140),
          height: Math.max(at.height, 64),
        });
      };
      editor.querySelectorAll("img").forEach((img) => {
        const src = img.getAttribute("src") || "";
        if (src && isMissingPicture(src)) mark(img, src, "img");
      });
      editor.querySelectorAll('[style*="url("]').forEach((el) => {
        findPictures(`<i style="${el.getAttribute("style") || ""}">`)
          .filter((p) => p.kind === "background" && isMissingPicture(p.src))
          .slice(0, 1)
          .forEach((p) => mark(el, p.src, "background"));
      });
    }

    setPictureIssues((prev) =>
      JSON.stringify(prev) === JSON.stringify({ missing, marks }) ? prev : { missing, marks },
    );

    // A short heads-up when pictures go missing (the banner and the marks then
    // say the rest). It waits for a pause, so typing an address in the HTML
    // view does not warn about every half-typed one.
    if (missing.length !== missingCountRef.current) clearTimeout(missingToastRef.current);
    if (missing.length > missingCountRef.current) {
      const count = missing.length;
      missingToastRef.current = setTimeout(() => {
        showToast(
          `${picturesLabel(count)} can't be shown to employees. Upload ${count === 1 ? "it" : "each one"} where it's marked.`,
          "warning",
        );
      }, 900);
    }
    missingCountRef.current = missing.length;
    return html;
  }, [rawHtmlMode, rawHtmlCode, failedPictures, isMissingPicture, showToast]);

  // A broken picture from another website shows up as a failed load.
  useEffect(() => {
    const onError = (event) => {
      const img = event.target;
      if (img?.tagName !== "IMG" || !editorRef.current?.contains(img)) return;
      const src = img.getAttribute("src") || "";
      if (classifyPicture(src) !== "external") return;
      setFailedPictures((prev) => (prev.has(src) ? prev : new Set(prev).add(src)));
    };
    document.addEventListener("error", onError, true);
    return () => document.removeEventListener("error", onError, true);
  }, []);

  // Every use of picture `from` on this page pointed at `to` (one undo step).
  const replacePictureOnPage = useCallback(
    (from, to) => {
      if (rawHtmlMode) {
        const next = replacePicture(rawHtmlCode, from, to);
        if (next === rawHtmlCode) return false;
        setRawHtmlCode(next);
        emitChange(next);
        return true;
      }
      const editor = editorRef.current;
      if (!editor) return false;
      const next = replacePicture(editor.innerHTML, from, to);
      if (next === editor.innerHTML) return false;
      editor.innerHTML = next;
      internalHtmlRef.current = next;
      setActiveElement(null);
      emitChange(next);
      return true;
    },
    [rawHtmlMode, rawHtmlCode, emitChange],
  );

  const uploadPicture = useCallback(async (file, name) => {
    const problem = pictureFileProblem(file);
    if (problem) throw new Error(problem);
    return api.media.uploadImage(file, name);
  }, []);

  // A picture inside the HTML (data:) goes to hosting on its own, once.
  const moveEmbeddedPictures = useCallback(
    async (html) => {
      const pending = embeddedPictures(html).filter((src) => !movedPicturesRef.current.has(src));
      if (!pending.length) return;
      pending.forEach((src) => movedPicturesRef.current.add(src));
      let moved = 0;
      let failure = "";
      for (const src of pending) {
        try {
          const blob = dataUrlToBlob(src);
          const ext = (blob?.type || "").split("/")[1] || "png";
          const url = await uploadPicture(blob, `picture.${ext}`);
          if (replacePictureOnPage(src, url)) moved += 1;
        } catch (error) {
          failure = error?.message || "Upload failed";
        }
      }
      if (moved) showToast(`${picturesLabel(moved)} pasted into the design moved to picture storage.`, "success");
      if (failure) {
        showToast(`A picture inside the design couldn't be moved to picture storage: ${failure}`, "warning");
      }
    },
    [uploadPicture, replacePictureOnPage, showToast],
  );

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const html = scanPictures();
      moveEmbeddedPictures(html);
    });
    return () => cancelAnimationFrame(frame);
  }, [pages, currentPageId, rawHtmlMode, isExpanded, rawHtmlCode, scanPictures, moveEmbeddedPictures]);
  useEffect(() => {
    window.addEventListener("resize", scanPictures);
    return () => window.removeEventListener("resize", scanPictures);
  }, [scanPictures]);

  const startPictureReplace = (src) => {
    replaceTargetRef.current = src;
    replaceInputRef.current?.click();
  };

  const handlePictureReplaceFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    const from = replaceTargetRef.current;
    replaceTargetRef.current = null;
    if (!file || from == null) return;
    setPictureBusy(from);
    try {
      const url = await uploadPicture(file);
      replacePictureOnPage(from, url);
      setFailedPictures((prev) => {
        if (!prev.has(from)) return prev;
        const next = new Set(prev);
        next.delete(from);
        return next;
      });
      const left = pictureIssues.missing.filter((src) => src !== from).length;
      showToast(
        left ? `Picture uploaded. ${picturesLabel(left)} still to go.` : "All pictures are ready.",
        "success",
      );
    } catch (error) {
      showToast(error?.message || "The picture couldn't be uploaded.", "error");
    } finally {
      setPictureBusy(null);
    }
  };

  // Only an editor given somewhere to save page 2 (the scenario wizard) offers
  // it; elsewhere (announcements) it is a plain one-page email editor.
  const supportsBrowserPage = typeof onBrowserPageChange === "function";

  // The page being edited, as it stands now (the canvas or the HTML source).
  const currentPageHtml = () =>
    rawHtmlMode
      ? rawHtmlCode
      : editorRef.current?.innerHTML ?? internalHtmlRef.current ?? "";

  // Show `pageId` (whose HTML is `html`) in the editor.
  const showPage = (pageId, html) => {
    currentPageIdRef.current = pageId;
    setCurrentPageId(pageId);
    setPickedBlocks([]);
    internalHtmlRef.current = html;
    if (editorRef.current && !rawHtmlMode) {
      editorRef.current.innerHTML = html;
    }
    setRawHtmlCode(html);
    syncPageHistory(pageId, html);
    setActiveElement(null);
    setShowPagesMenu(false);
  };

  const storePages = (list) => {
    pagesRef.current = list;
    setPages(list);
  };

  const switchToPage = (pageId) => {
    if (pageId === currentPageIdRef.current) {
      setShowPagesMenu(false);
      return;
    }

    const currentHtml = currentPageHtml();
    const updatedPages = pagesRef.current.map((p) =>
      p.id === currentPageIdRef.current ? { ...p, html: currentHtml } : p
    );
    storePages(updatedPages);

    const target = updatedPages.find((p) => p.id === pageId);
    showPage(pageId, target ? target.html || "" : "");
    showToast(`Editing ${target?.name || `Page ${pageId}`}.`, "info");
  };

  // Page 2 goes, and every email element that opened it goes to the landing
  // page instead, so the email never links to a page that is not there.
  const deleteBrowserPage = () => {
    if (!hasBrowserPage) return;
    if (
      typeof window !== "undefined" &&
      !window.confirm("Delete the browser page? Email elements that open it will show the landing page instead.")
    ) {
      return;
    }
    const emailPage = pagesRef.current.find((p) => p.id === EMAIL_PAGE_ID);
    const emailHtml =
      currentPageIdRef.current === EMAIL_PAGE_ID ? currentPageHtml() : emailPage?.html || "";
    const cleaned = dropBrowserLinks(emailHtml);

    storePages([{ ...emailPage, html: cleaned }]);
    forgetPageHistory(BROWSER_PAGE_ID);
    onBrowserPageChange?.("");
    onChange?.(cleaned);
    showPage(EMAIL_PAGE_ID, cleaned);
    showToast("Browser page deleted. Its email links now show the landing page.", "success");
  };

  // Page 2 from a template (or blank). Its links all become the compromise
  // action, the only action the browser page has.
  const createBrowserPage = (templateHtml) => {
    setShowNewPageModal(false);
    if (pagesRef.current.length >= MAX_PAGES) {
      switchToPage(BROWSER_PAGE_ID);
      return;
    }

    const currentHtml = currentPageHtml();
    const emailPages = pagesRef.current.map((p) =>
      p.id === currentPageIdRef.current ? { ...p, html: currentHtml } : p
    );
    // Lay the template out into a page of items (a group, with its buttons
    // solo), neutralising any pre-set On-Click, just like an email template.
    const html = ensurePageHtml(String(templateHtml || "").trim(), BROWSER_PAGE_ID, PAGE_WIDTH.browser, {
      fresh: true,
    });
    storePages([
      ...emailPages,
      { id: BROWSER_PAGE_ID, name: PAGE_LABELS[BROWSER_PAGE_ID], html },
    ]);
    resetPageHistory(BROWSER_PAGE_ID, html);
    showPage(BROWSER_PAGE_ID, html);
    onBrowserPageChange?.(html);
    showToast("Browser page created. Select its submit button (Next, Submit, Confirm...) and set On-Click to \"Mark compromised\".", "success");
  };

  // The keyboard, as on a Power BI page. Typing in an item keeps its keys
  // (only Esc leaves the text); otherwise keys act on the selected items.
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Escape closes the topmost layer: a dialog, the text being typed in,
      // a part of a group (back to the group), the selection, full screen.
      if (e.key === "Escape") {
        if (emailPreview.open) return; // the preview closes itself
        if (showBrowserPreview) setShowBrowserPreview(false);
        else if (actionConfigModal.open) setActionConfigModal(CLOSED_ACTION_MODAL);
        else if (showNewPageModal) setShowNewPageModal(false);
        else if (showShortcuts) setShowShortcuts(false);
        else if (showLinkMenu || showTextColorMenu) {
          setShowLinkMenu(false);
          setShowTextColorMenu(false);
        } else if (editingRef.current) {
          const el = editingRef.current;
          stopEditing();
          selectCanvasItem(el);
          scrollerRef.current?.focus({ preventScroll: true });
        } else if (isGroupEl(activeElement?.element?.parentElement)) selectCanvasItem(activeElement.element.parentElement);
        else if (pickedBlocks.length || activeElement?.element) clearSelection();
        else if (isExpanded) setIsExpanded(false);
        return;
      }
      if (rawHtmlMode) return;
      // Only while the canvas is in use (its focus, or an item selected with
      // nothing else focused): Ctrl+Z in the subject field keeps its meaning.
      const focus = document.activeElement;
      const inEditor =
        workspaceRef.current?.contains(focus) ||
        ((activeElement?.element || pickedBlocks.length) && (focus === document.body || !focus));
      if (!inEditor) return;
      const ctrl = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      const typing = Boolean(editingRef.current) || ["INPUT", "TEXTAREA", "SELECT"].includes(focus?.tagName);

      if (ctrl && key === "z" && !["INPUT", "TEXTAREA", "SELECT"].includes(focus?.tagName)) {
        e.preventDefault();
        stopEditing();
        if (e.shiftKey) handleRedo();
        else handleUndo();
        return;
      }
      if (ctrl && key === "y" && !["INPUT", "TEXTAREA", "SELECT"].includes(focus?.tagName)) {
        e.preventDefault();
        stopEditing();
        handleRedo();
        return;
      }
      if (ctrl && key === "k" && editingRef.current) {
        e.preventDefault();
        saveSelection();
        setShowLinkMenu(true);
        setShowTextColorMenu(false);
        return;
      }
      if (typing) return;

      const selected = selectedItems();
      if (e.key === "?") {
        e.preventDefault();
        setShowShortcuts((open) => !open);
        return;
      }
      if (ctrl && key === "a") {
        e.preventDefault();
        selectItems(layerItems(pageEl()).filter((el) => el.style.display !== "none"));
        return;
      }
      if (ctrl && key === "g") {
        e.preventDefault();
        if (e.shiftKey) ungroupSelection();
        else groupSelection();
        return;
      }
      if (!selected.length) return;
      if (ctrl && key === "d") {
        e.preventDefault();
        duplicateActiveItem();
        return;
      }
      // Ctrl+] / Ctrl+[ one layer; with Shift, to the front / back.
      if (ctrl && (e.key === "]" || e.key === "}" || e.code === "BracketRight")) {
        e.preventDefault();
        changeLayer(e.shiftKey ? "front" : "forward");
        return;
      }
      if (ctrl && (e.key === "[" || e.key === "{" || e.code === "BracketLeft")) {
        e.preventDefault();
        changeLayer(e.shiftKey ? "back" : "backward");
        return;
      }
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        nudgeSelection(
          e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0,
          e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0,
        );
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteActiveItem();
        return;
      }
      // Enter or F2 types in the selected text item.
      if ((e.key === "Enter" || e.key === "F2") && selected.length === 1 && hasText(selected[0])) {
        e.preventDefault();
        startEditing(selected[0]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  // Copy, cut and paste of whole items: with items selected and no text
  // being typed in. A paste anywhere on the canvas is its onPaste.
  useEffect(() => {
    const ownsEvent = () =>
      !rawHtmlMode &&
      !disabled &&
      !editingRef.current &&
      (activeElement?.element || pickedBlocks.length) &&
      !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName) &&
      (workspaceRef.current?.contains(document.activeElement) || document.activeElement === document.body);
    const onCopy = (e) => {
      if (ownsEvent()) copyItemsToClipboard(e);
    };
    const onCut = (e) => {
      if (ownsEvent()) copyItemsToClipboard(e, { cut: true });
    };
    // A paste with an item selected and the focus outside the canvas.
    const onPaste = (e) => {
      if (e.defaultPrevented || !ownsEvent() || workspaceRef.current?.contains(e.target)) return;
      const html = e.clipboardData?.getData("text/html") || "";
      if (!html.includes(ITEM_COPY_MARK)) return;
      e.preventDefault();
      pasteCopiedItems(html);
    };
    document.addEventListener("copy", onCopy);
    document.addEventListener("cut", onCut);
    document.addEventListener("paste", onPaste);
    return () => {
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("cut", onCut);
      document.removeEventListener("paste", onPaste);
    };
  });

  // The full-screen editor keeps the page behind it from scrolling.
  useEffect(() => {
    if (!isExpanded) return undefined;
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [isExpanded]);

  // Safe template resolution with automatic snippet computation
  const emailBodyTemplates = useMemo(() => {
    const list = [];
    const rawList = scenariosJsonData?.scenarios || scenariosJsonData?.default?.scenarios || [];
    if (Array.isArray(rawList)) {
      rawList.forEach((s) => {
        const html = s.emailBody || s.EmailBody || s.body || s.html;
        const name = s.scenarioTitle || s.ScenarioTitle || s.CampaignTitle || s.name || s.title || s.scenarioName;
        if (html) {
          list.push({
            id: s.scenarioId || s.ScenarioID || s.id || name,
            name: name || "Simulation Scenario",
            html: html,
            snippet: getBodySnippet(html),
          });
        }
      });
    }

    const fallbacks = typeof FALLBACK_TEMPLATES !== "undefined" ? FALLBACK_TEMPLATES : [];
    fallbacks.forEach((fb) => {
      if (!list.some((item) => item.name === fb.name)) {
        list.push({
          ...fb,
          snippet: getBodySnippet(fb.html),
        });
      }
    });

    return list;
  }, []);

  // The browser page's own templates: sign-in and 2FA screens.
  const browserPageTemplates = useMemo(
    () => [
      ...CREDENTIAL_TEMPLATES.map((t) => ({ ...t, snippet: t.subtitle, section: "Sign-in screens" })),
      ...TWO_FA_TEMPLATES.map((t) => ({ ...t, snippet: t.subtitle, section: "2FA and code screens" })),
    ],
    [],
  );

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


  // Back to the text being typed in (a toolbar click took the focus).
  // Returns false when no item's text is being edited.
  const restoreSelection = useCallback(() => {
    const host = editingRef.current;
    if (!host || !host.isConnected) return false;
    host.focus({ preventScroll: true });
    const selection = window.getSelection();
    if (!selection) return false;
    const savedRange = savedSelectionRef.current;
    if (savedRange && host.contains(savedRange.startContainer)) {
      try {
        selection.removeAllRanges();
        selection.addRange(savedRange);
        return true;
      } catch (error) {
        console.warn("Unable to restore editor selection:", error);
      }
    }
    const range = document.createRange();
    range.selectNodeContents(host);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
    return true;
  }, []);

  // A text command on what is selected: the highlighted text while typing in
  // an item, else every selected item's whole text (as Power BI formats a
  // selected text box). `run` does the work on the current selection.
  const withTextTarget = (run, { wholeLine = false } = {}) => {
    if (disabled || rawHtmlMode) return false;
    if (restoreSelection()) {
      if (wholeLine) selectLineAtCaret();
      run();
      saveSelection();
      synchroniseEditorValue();
      return true;
    }
    const items = selectedItems()
      .flatMap((el) => (isGroupEl(el) ? layerItems(el) : [el]))
      .filter(hasText);
    if (!items.length) return false;
    const selection = window.getSelection();
    items.forEach((el) => {
      el.setAttribute("contenteditable", "true");
      el.focus({ preventScroll: true });
      const range = document.createRange();
      range.selectNodeContents(el);
      selection.removeAllRanges();
      selection.addRange(range);
      run();
      el.removeAttribute("contenteditable");
    });
    selection.removeAllRanges();
    synchroniseEditorValue();
    return true;
  };

  const synchroniseEditorValue = useCallback(() => {
    if (!editorRef.current) return;
    tidyPageRef.current?.();
    // The item being typed in is editable only while it is edited.
    const updatedHtml = editorRef.current.innerHTML.replace(
      /\s+(?:contenteditable|spellcheck)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi,
      "",
    );
    const page = pageOf(editorRef.current);
    if (page) setPageHeightPx(page.offsetHeight);
    emitChange(updatedHtml);
    saveSelection();
    // The Items pane and selection frames are read from the page.
    setDragFrame((n) => n + 1);
  }, [emitChange, saveSelection]);

  // A new item goes on the page in front of everything, in the middle of
  // what is in view (as Power BI drops a new visual), never past the edges.
  // Returns the items placed.
  const insertCanvasItem = (itemHtml, { select = true } = {}) => {
    const page = pageOf(editorRef.current);
    if (!page) return [];
    stopEditing();
    // On the browser page every link is the compromise action.
    const html = currentPageIdRef.current === BROWSER_PAGE_ID ? toBrowserPageHtml(itemHtml) : itemHtml;
    const temp = document.createElement("div");
    temp.innerHTML = String(html).replace(/\s+contenteditable\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
    const blocks = Array.from(temp.children).filter(
      (n) => !(n.tagName === "P" && !n.textContent.trim() && !n.querySelector("img, input")),
    );
    if (!blocks.length) return [];

    const width = currentPageWidth();
    // The middle of what is in view, in page px.
    const sc = scrollerRef.current;
    let viewTop = 20;
    let viewHeight = 300;
    if (sc) {
      const scale = pageScale();
      const pageTop = page.getBoundingClientRect().top;
      const area = sc.getBoundingClientRect();
      viewTop = Math.max(0, (area.top - pageTop) / scale);
      viewHeight = area.height / scale;
    }
    let nextTop = null;
    const placed = blocks.map((el) => {
      if (!el.classList.contains(ITEM_CLASS)) {
        el.classList.add(ITEM_CLASS);
        el.setAttribute("data-type", el.querySelector("img") ? "image" : "text");
      }
      // Measured at its natural size first (a 100% banner is the page's width).
      el.style.position = "absolute";
      el.style.left = "0px";
      el.style.top = "0px";
      el.style.margin = "0px";
      el.style.visibility = "hidden";
      page.appendChild(el);
      const w = Math.min(width, el.offsetWidth || 200);
      const h = el.offsetHeight || 40;
      const top = nextTop ?? Math.max(viewTop + 16, viewTop + (viewHeight - h) / 2 - 40);
      const rect = clampToPage({ left: (width - w) / 2, top, width: w, height: h }, width);
      el.style.maxWidth = "none";
      writeRect(el, rect, { height: Boolean(el.style.height && el.style.height !== "auto") });
      el.style.visibility = "";
      nextTop = rect.top + h + 12;
      return el;
    });
    renumberLayers(page);
    synchroniseEditorValue();
    if (select) selectItems(placed);
    return placed;
  };

  // HTML from outside that was laid out here, by what came in, so the same
  // HTML coming back is known.
  const laidOutFromRef = useRef(new Map());

  // A page's HTML laid out as a canvas page (once), told to its field.
  const adoptPageHtml = (pageId, html) => {
    const incoming = String(html || "");
    const known = laidOutFromRef.current.get(incoming);
    const out = known ?? ensurePageHtml(incoming, pageId);
    if (out !== incoming) {
      laidOutFromRef.current.set(incoming, out);
      if (pageId === BROWSER_PAGE_ID) onBrowserPageChange?.(out);
      else onChange?.(out);
    }
    return out;
  };

  // The page shown in the editor: from its stored HTML, laid out.
  useLayoutEffect(() => {
    if (rawHtmlMode || !editorRef.current) return;
    const target = pagesRef.current.find((p) => p.id === currentPageId);
    const stored = target ? target.html || "" : internalHtmlRef.current;
    const htmlToSync = adoptPageHtml(currentPageId, stored);
    if (htmlToSync !== stored) {
      pagesRef.current = pagesRef.current.map((p) => (p.id === currentPageId ? { ...p, html: htmlToSync } : p));
      setPages(pagesRef.current);
      resetPageHistory(currentPageId, htmlToSync);
    }
    if (editorRef.current.innerHTML !== htmlToSync) {
      editorRef.current.innerHTML = htmlToSync;
    }
    editingRef.current = null;
    setEditingItem(null);
    internalHtmlRef.current = htmlToSync;
    setRawHtmlCode(htmlToSync);
    const page = pageOf(editorRef.current);
    if (page) {
      setPageHeightPx(page.offsetHeight);
      setPageWidthPx(page.offsetWidth || PAGE_WIDTH.email);
      setCanvasBgColor(page.style.backgroundColor || "#FFFFFF");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawHtmlMode, isExpanded, currentPageId]);

  // The email changed from outside (a scenario loaded, a draft restored).
  useEffect(() => {
    if (value === undefined) return;
    const onEmail = currentPageIdRef.current === EMAIL_PAGE_ID;
    const known = onEmail
      ? internalHtmlRef.current
      : pagesRef.current.find((p) => p.id === EMAIL_PAGE_ID)?.html;
    if (value === known || laidOutFromRef.current.get(value) === known) return;
    const finalVal = adoptPageHtml(EMAIL_PAGE_ID, value);
    if (finalVal === known) return;
    if (onEmail) {
      internalHtmlRef.current = finalVal;
      if (editorRef.current && !rawHtmlMode) {
        editorRef.current.innerHTML = finalVal;
        editingRef.current = null;
        setActiveElement(null);
        setPickedBlocks([]);
      }
      setRawHtmlCode(finalVal);
    }
    pagesRef.current = pagesRef.current.map((p) =>
      p.id === EMAIL_PAGE_ID ? { ...p, html: finalVal } : p
    );
    setPages(pagesRef.current);
    // Loaded from outside: undo starts here, never back to what was there before.
    resetPageHistory(EMAIL_PAGE_ID, finalVal);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, rawHtmlMode]);

  // The browser page changed from outside: added, replaced or cleared.
  useEffect(() => {
    const raw = browserPage || "";
    const stored = pagesRef.current.find((p) => p.id === BROWSER_PAGE_ID);
    if (stored ? stored.html === raw || laidOutFromRef.current.get(raw) === stored.html : isBlankHtml(raw)) return;
    const onBrowser = currentPageIdRef.current === BROWSER_PAGE_ID;

    if (isBlankHtml(raw)) {
      pagesRef.current = pagesRef.current.filter((p) => p.id !== BROWSER_PAGE_ID);
      setPages(pagesRef.current);
      forgetPageHistory(BROWSER_PAGE_ID);
      if (onBrowser) {
        const email = pagesRef.current.find((p) => p.id === EMAIL_PAGE_ID)?.html || "";
        currentPageIdRef.current = EMAIL_PAGE_ID;
        setCurrentPageId(EMAIL_PAGE_ID);
        setPickedBlocks([]);
        setActiveElement(null);
        internalHtmlRef.current = email;
        if (editorRef.current && !rawHtmlMode) editorRef.current.innerHTML = email;
        setRawHtmlCode(email);
        publishHistory(EMAIL_PAGE_ID);
      }
      return;
    }

    const incoming = adoptPageHtml(BROWSER_PAGE_ID, raw);
    pagesRef.current = stored
      ? pagesRef.current.map((p) => (p.id === BROWSER_PAGE_ID ? { ...p, html: incoming } : p))
      : [...pagesRef.current, { id: BROWSER_PAGE_ID, name: PAGE_LABELS[BROWSER_PAGE_ID], html: incoming }];
    setPages(pagesRef.current);
    resetPageHistory(BROWSER_PAGE_ID, incoming);
    if (onBrowser && incoming !== internalHtmlRef.current) {
      internalHtmlRef.current = incoming;
      if (editorRef.current && !rawHtmlMode) editorRef.current.innerHTML = incoming;
      setActiveElement(null);
      setPickedBlocks([]);
      setRawHtmlCode(incoming);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [browserPage]);

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
      if (pagesMenuRef.current && !pagesMenuRef.current.contains(event.target)) {
        setShowPagesMenu(false);
      }
      if (textColorMenuRef.current && !textColorMenuRef.current.contains(event.target)) {
        setShowTextColorMenu(false);
      }
      if (linkMenuRef.current && !linkMenuRef.current.contains(event.target)) {
        setShowLinkMenu(false);
      }
      if (pageSizeMenuRef.current && !pageSizeMenuRef.current.contains(event.target)) {
        setShowPageSizeMenu(false);
      }
      if (onclicksMenuRef.current && !onclicksMenuRef.current.contains(event.target)) {
        setShowOnclicksMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // The block style, font and size of the text at the caret.
  const readTextFormat = useCallback((range) => {
    const editor = editorRef.current;
    if (!editor || !range) return;
    let node = range.startContainer;
    if (node.nodeType !== 1) node = node.parentElement;
    if (!node || !editor.contains(node)) return;
    let block = "p";
    for (let at = node; at && at !== editor; at = at.parentElement) {
      if (/^(P|H[1-6]|BLOCKQUOTE|PRE)$/.test(at.tagName)) {
        block = at.tagName.toLowerCase();
        break;
      }
    }
    const cs = window.getComputedStyle(node);
    const next = { block, font: firstFontFamily(cs.fontFamily), size: fontSizePx(cs.fontSize) };
    setTextFormat((prev) =>
      prev.block === next.block && prev.font === next.font && prev.size === next.size ? prev : next,
    );
  }, []);

  const handleTextSelectionChange = useCallback(() => {
    const current = window.getSelection();
    if (!rawHtmlMode && current?.rangeCount && isEditorSelection(current.getRangeAt(0))) {
      readTextFormat(current.getRangeAt(0));
    }
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
    const workspaceRect = workspaceRef.current?.getBoundingClientRect();

    if (workspaceRect) {
      setSelectionColorMenu({
        visible: true,
        top: Math.max(10, rect.top - workspaceRect.top - 46),
        left: Math.max(10, rect.left - workspaceRect.left),
      });
      savedSelectionRef.current = range.cloneRange();
    }
  }, [disabled, isEditorSelection, rawHtmlMode, readTextFormat]);

  useEffect(() => {
    document.addEventListener("selectionchange", handleTextSelectionChange);
    return () => document.removeEventListener("selectionchange", handleTextSelectionChange);
  }, [handleTextSelectionChange]);

  const applyTextColorToSelection = (color) => applyTextColour(color);


  const handleEyedropperForText = async () => {
    if (!window.EyeDropper) {
      showToast("EyeDropper is not supported in this browser.", "warning");
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

  // Show `html` as the page being edited, as one undo step.
  const replaceCurrentPage = (html) => {
    stopEditing();
    internalHtmlRef.current = html;
    if (editorRef.current) editorRef.current.innerHTML = html;
    setRawHtmlCode(html);
    setActiveElement(null);
    setPickedBlocks([]);
    const page = pageOf(editorRef.current);
    if (page) {
      setPageHeightPx(page.offsetHeight);
      setPageWidthPx(page.offsetWidth || PAGE_WIDTH.email);
      setCanvasBgColor(page.style.backgroundColor || "#FFFFFF");
    }
    emitChange(html);
  };

  const handleClearAllCanvas = () => {
    replaceCurrentPage(emptyPageHtml(currentPageWidth(), currentPageMin()));
    showToast("Erased the page. Undo (Ctrl+Z) brings it back.", "success");
  };

  // A template from the library: laid out as items on the page, each one
  // selectable, movable and layered; a template's panel becomes a group.
  const chooseEmailBody = (option) => {
    setShowBodyMenu(false);
    if (!option?.html) return;
    const laidOut = ensurePageHtml(option.html, currentPageIdRef.current, currentPageWidth(), { fresh: true });
    const page = pageOf(editorRef.current);
    if (!page || !layerItems(page).length) {
      replaceCurrentPage(laidOut);
      showToast(`Applied "${option.name}". Double-click a panel to select its parts.`, "success");
      return;
    }
    // Something is on the page already: the template is added on top of it,
    // in front, where it is in view, and selected to move into place.
    stopEditing();
    const holder = document.createElement("div");
    holder.innerHTML = laidOut;
    const incoming = layerItems(pageOf(holder));
    if (!incoming.length) return;
    const box = unionRects(incoming.map((el) => ({
      left: parseFloat(el.style.left) || 0,
      top: parseFloat(el.style.top) || 0,
      width: parseFloat(el.style.width) || 0,
      height: parseFloat(el.style.height) || 0,
    })));
    let viewTop = 16;
    const sc = scrollerRef.current;
    if (sc) {
      viewTop = Math.max(16, (sc.getBoundingClientRect().top - page.getBoundingClientRect().top) / pageScale() + 16);
    }
    const shiftY = viewTop - (box?.top || 0);
    const added = incoming.map((el) => {
      freshIds(el);
      el.style.top = `${Math.round((parseFloat(el.style.top) || 0) + shiftY)}px`;
      page.appendChild(el);
      return el;
    });
    renumberLayers(page);
    synchroniseEditorValue();
    selectItems(added);
    showToast(
      `Added "${option.name}" on top of the page. Drag it into place; Ctrl+G groups it, Ctrl+[ sends it back.`,
      "success",
    );
  };

  // The page's own background colour (saved with it, so the preview and the
  // email show it too).
  const setPageBackground = (colour) => {
    setCanvasBgColor(colour);
    const page = pageOf(editorRef.current);
    if (!page) return;
    page.style.backgroundColor = colour;
    synchroniseEditorValue();
  };

  const runCommand = (command, commandValue = null) => {
    const done = withTextTarget(() => {
      try {
        document.execCommand(command, false, commandValue);
      } catch (error) {
        console.error(`Editor command failed: ${command}`, error);
      }
    });
    if (!done) showToast("Select a text item, or double-click one to type in it, first.", "info");
  };

  // Left / centre / right for text. While typing: the line(s) the caret is
  // on. Otherwise: the selected items' whole text (a shape's or button's
  // label too, which are laid out as rows).
  const JUSTIFY = { left: "flex-start", center: "center", right: "flex-end" };
  const alignText = (side) => {
    if (disabled || rawHtmlMode) return;
    const host = editingRef.current;
    if (host && restoreSelection()) {
      const selection = window.getSelection();
      const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
      const blockOf = (node) => {
        let at = node?.nodeType === 1 ? node : node?.parentElement;
        while (at && at !== host) {
          if (/^(P|H[1-6]|LI|BLOCKQUOTE|PRE|DIV|TD)$/.test(at.tagName)) return at;
          at = at.parentElement;
        }
        return host;
      };
      const blocks = new Set([blockOf(range?.startContainer), blockOf(range?.endContainer)]);
      blocks.forEach((b) => {
        b.style.textAlign = side;
      });
      synchroniseEditorValue();
      return;
    }
    const items = selectedItems().flatMap((el) => (isGroupEl(el) ? layerItems(el) : [el])).filter(hasText);
    if (!items.length) {
      showToast("Select a text item, shape or button first, or double-click into its text.", "info");
      return;
    }
    items.forEach((el) => {
      el.style.textAlign = side;
      // Inner lines that set their own alignment follow the item's.
      el.querySelectorAll("[style*='text-align']").forEach((n) => {
        n.style.textAlign = "";
      });
      el.querySelectorAll("p, h1, h2, h3, h4, h5, h6, li, blockquote, div, a").forEach((n) => {
        if (n.style.textAlign) n.style.textAlign = side;
      });
      const flexParts = [el, ...el.querySelectorAll("*")].filter(
        (n) => /flex/.test(window.getComputedStyle(n).display) && window.getComputedStyle(n).flexDirection.startsWith("row"),
      );
      flexParts.forEach((n) => {
        n.style.justifyContent = JUSTIFY[side];
      });
    });
    synchroniseEditorValue();
    setDragFrame((n) => n + 1);
  };

  // Top / middle / bottom for an item's content inside its box (make the
  // item taller than its text to see it move).
  const VALIGN = { top: "flex-start", middle: "center", bottom: "flex-end" };
  const VALIGN_WRAP = "vshield-valign";
  const valignText = (where) => {
    if (disabled || rawHtmlMode) return;
    const items = (editingRef.current ? [editingRef.current] : selectedItems())
      .flatMap((el) => (isGroupEl(el) ? layerItems(el) : [el]))
      .filter((el) => !isGroupEl(el));
    if (!items.length) {
      showToast("Select an item first.", "info");
      return;
    }
    items.forEach((el) => {
      const cs = window.getComputedStyle(el);
      if (/flex/.test(cs.display) && cs.flexDirection.startsWith("row")) {
        // A shape or banner laid out as a row: its cross axis is up and down.
        el.style.alignItems = VALIGN[where];
      } else {
        // Its content goes in one inner box, moved up and down as one, so
        // its words and links keep flowing as they did.
        let wrap = el.children.length === 1 && el.firstElementChild.classList.contains(VALIGN_WRAP) ? el.firstElementChild : null;
        if (!wrap) {
          wrap = document.createElement("div");
          wrap.className = VALIGN_WRAP;
          wrap.style.width = "100%";
          while (el.firstChild) wrap.appendChild(el.firstChild);
          el.appendChild(wrap);
        }
        el.style.display = "flex";
        el.style.flexDirection = "column";
        el.style.justifyContent = VALIGN[where];
      }
      // Room to move in: at least as tall as it is now.
      if (!el.style.height || el.style.height === "auto") el.style.height = `${el.offsetHeight}px`;
    });
    synchroniseEditorValue();
    setDragFrame((n) => n + 1);
    showToast(
      `${where === "top" ? "Top" : where === "middle" ? "Middle" : "Bottom"} of the box. Make the item taller to see the space.`,
      "success",
    );
  };

  const handleToolbarMouseDown = (event) => {
    event.preventDefault();
  };

  // With only a caret, a text command applies to the whole line it is on
  // (its paragraph, heading or text part); returns false when there is none.
  const selectLineAtCaret = () => {
    const editor = editingRef.current;
    const selection = window.getSelection();
    if (!editor || !selection?.rangeCount) return false;
    if (!selection.isCollapsed) return true;
    let node = selection.getRangeAt(0).startContainer;
    if (node.nodeType !== 1) node = node.parentElement;
    let line = null;
    for (let at = node; at && at !== editor; at = at.parentElement) {
      if (/^(P|H[1-6]|LI|BLOCKQUOTE|A|SPAN|DIV|TD)$/.test(at.tagName) && at.textContent.trim()) {
        line = at;
        if (/^(P|H[1-6]|LI|BLOCKQUOTE)$/.test(at.tagName) || at.getAttribute("contenteditable") === "true") break;
      }
    }
    const range = document.createRange();
    range.selectNodeContents(line || editor);
    selection.removeAllRanges();
    selection.addRange(range);
    return true;
  };

  // A real pixel size on the selected text (or the caret's line). The
  // browser's own fontSize command only knows seven sizes, so it marks the
  // text with size 7 and each mark becomes a span with the size picked.
  const applyFontSizePx = (px) => {
    const editor = editorRef.current;
    if (!editor || !px) return;
    const done = withTextTarget(
      () => {
        const before = new Set(editor.querySelectorAll('font[size="7"]'));
        document.execCommand("styleWithCSS", false, false);
        document.execCommand("fontSize", false, "7");
        editor.querySelectorAll('font[size="7"]').forEach((font) => {
          if (before.has(font)) return;
          const span = document.createElement("span");
          span.style.fontSize = `${px}px`;
          if (font.getAttribute("color")) span.style.color = font.getAttribute("color");
          if (font.getAttribute("face")) span.style.fontFamily = font.getAttribute("face");
          while (font.firstChild) span.appendChild(font.firstChild);
          // Sizes set inside it before would win over the new one.
          span.querySelectorAll('[style*="font-size"]').forEach((n) => {
            n.style.fontSize = "";
            if (!n.getAttribute("style")) n.removeAttribute("style");
          });
          font.replaceWith(span);
        });
      },
      { wholeLine: true },
    );
    if (done) setTextFormat((prev) => ({ ...prev, size: px }));
    else showToast("Select a text item, or double-click one to type in it, to change its size.", "info");
  };

  const applyFontFamily = (family) => {
    const done = withTextTarget(
      () => {
        document.execCommand("styleWithCSS", false, false);
        document.execCommand("fontName", false, family);
      },
      { wholeLine: true },
    );
    if (done) setTextFormat((prev) => ({ ...prev, font: firstFontFamily(family) }));
    else showToast("Select a text item, or double-click one to type in it, to change its font.", "info");
  };

  // Text colour, or the highlight behind the text ("transparent" removes it).
  const applyTextColour = (colour, { highlight = false } = {}) => {
    const done = withTextTarget(
      () => {
        document.execCommand("styleWithCSS", false, true);
        document.execCommand(highlight ? "hiliteColor" : "foreColor", false, colour);
        document.execCommand("styleWithCSS", false, false);
      },
      { wholeLine: true },
    );
    if (!done) showToast("Select a text item, or highlight some text, to colour it.", "info");
  };

  // The selected words become a link with an On-Click action. Email clients
  // only follow links, so this is how a phrase in the text becomes the lure.
  const linkSelectedText = (action) => {
    const editor = editorRef.current;
    setShowLinkMenu(false);
    if (disabled || rawHtmlMode || !editor) return;
    const typing = restoreSelection();
    const selection = window.getSelection();
    if (!typing || !selection?.rangeCount || selection.isCollapsed || !selection.toString().trim()) {
      showToast(
        "Double-click a text item and highlight the words to turn into a link. (To make a whole item clickable, use its On Click.)",
        "info",
        "Nothing Highlighted",
      );
      return;
    }
    const onBrowser = currentPageIdRef.current === BROWSER_PAGE_ID;
    const chosen = onBrowser ? "training" : action === "page" && !supportsBrowserPage ? "landing" : action;
    const marker = `vshield-link-${Date.now()}`;
    document.execCommand("createLink", false, marker);
    editor.querySelectorAll(`a[href="${marker}"]`).forEach((a) => {
      a.setAttribute("href", actionLink(chosen));
      a.setAttribute("data-action", chosen);
      if (!a.style.color) a.style.color = "#0563C1";
      if (!a.style.textDecoration) a.style.textDecoration = "underline";
    });
    synchroniseEditorValue();
    if (chosen === "page" && !pagesRef.current.some((p) => p.id === BROWSER_PAGE_ID)) {
      setShowNewPageModal(true);
      showToast("Link made. Now design the browser page it opens.", "info");
    } else {
      showToast(
        chosen === "training"
          ? "Link made: clicking it marks the employee compromised."
          : chosen === "page"
            ? "Link made: it opens the browser page."
            : "Link made: it opens the landing page and records the click.",
        "success",
      );
    }
  };

  const unlinkSelectedText = () => {
    setShowLinkMenu(false);
    if (disabled || rawHtmlMode) return;
    if (!restoreSelection()) {
      showToast("Double-click the text with the link, then put the caret in the link.", "info");
      return;
    }
    const selection = window.getSelection();
    if (!selection?.rangeCount) return;
    if (selection.isCollapsed) {
      const at = selection.getRangeAt(0).startContainer;
      const link = (at.nodeType === 1 ? at : at.parentElement)?.closest("a");
      if (!link || !editorRef.current?.contains(link)) {
        showToast("Put the caret in a link, or select it, to remove it.", "info");
        return;
      }
      const range = document.createRange();
      range.selectNode(link);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    document.execCommand("unlink");
    synchroniseEditorValue();
    showToast("Link removed.", "success");
  };

  const handleEditorInput = () => {
    typingRef.current = true;
    synchroniseEditorValue();
  };

  const handleEditorBlur = () => {
    saveSelection();
  };

  // A paste on the canvas:
  //  - items copied here (Ctrl+C) come back as items;
  //  - while typing in an item, into its text (cleaned: no scripts, handlers
  //    or Office markup go into an email);
  //  - otherwise a picture becomes a picture item, and text a text item.
  const handlePaste = (event) => {
    if (disabled || rawHtmlMode) return;
    const clipboardData = event.clipboardData;
    if (!clipboardData) return;
    const htmlContent = clipboardData.getData("text/html");
    const plainText = clipboardData.getData("text/plain");
    event.preventDefault();

    if (htmlContent && htmlContent.includes(ITEM_COPY_MARK)) {
      pasteCopiedItems(htmlContent);
      return;
    }
    const cleaned = htmlContent ? cleanPastedHtml(htmlContent) : "";
    if (restoreSelection()) {
      if (cleaned) document.execCommand("insertHTML", false, cleaned);
      else if (plainText) document.execCommand("insertHTML", false, plainTextToHtml(plainText));
      synchroniseEditorValue();
      return;
    }
    const file = Array.from(clipboardData.files || []).find((f) => /^image\//.test(f.type));
    if (file) {
      insertPictureFile(file);
      return;
    }
    const content = cleaned || (plainText ? plainTextToHtml(plainText) : "");
    if (!content) return;
    const [item] = insertCanvasItem(
      `<div class="vshield-canvas-item" data-type="text" style="display:block;width:${Math.min(480, currentPageWidth() - 40)}px;padding:4px 6px;font-size:14px;line-height:1.5;color:#1E293B;">${content}</div>`,
    );
    if (item) showToast("Pasted as a new text item. Double-click it to edit.", "success");
  };

  const handleToggleCodeMode = () => {
    if (disabled) return;

    if (!rawHtmlMode) {
      stopEditing();
      setActiveElement(null);
      const currentHtml =
        editorRef.current?.innerHTML ?? internalHtmlRef.current ?? "";

      internalHtmlRef.current = currentHtml;
      setRawHtmlCode(currentHtml);
      setRawHtmlMode(true);
      setPickedBlocks([]);
      return;
    }

    internalHtmlRef.current = rawHtmlCode;
    emitChange(rawHtmlCode);
    setRawHtmlMode(false);
  };

  const handleRawHtmlCode = (updatedHtml) => {
    setRawHtmlCode(updatedHtml);
    typingRef.current = true;
    emitChange(updatedHtml);
  };

  const handleToggleExpand = () => {
    if (!rawHtmlMode && editorRef.current) {
      const latest = editorRef.current.innerHTML;
      internalHtmlRef.current = latest;
      emitChange(latest);
    }
    if (rawHtmlMode) {
      internalHtmlRef.current = rawHtmlCode;
    }
    setIsExpanded((previousValue) => !previousValue);
  };

  const insertFxPlaceholder = (param) => {
    setShowFxMenu(false);
    if (disabled || rawHtmlMode) return;

    // The phish link goes in as a real link: around the highlighted words,
    // else as "Click here".
    if (param.link) {
      // On the browser page a link marks the employee compromised.
      const action = currentPageIdRef.current === BROWSER_PAGE_ID ? "training" : "landing";
      const typing = restoreSelection();
      const selection = window.getSelection();
      if (typing && selection?.rangeCount && !selection.isCollapsed && selection.toString().trim()) {
        linkSelectedText(action);
        return;
      }
      const linkHtml = `<a href="${actionLink(action)}" data-action="${action}" style="color:#2563eb;text-decoration:underline;">Click here</a>&nbsp;`;
      if (typing) {
        document.execCommand("insertHTML", false, linkHtml);
        synchroniseEditorValue();
        return;
      }
      insertCanvasItem(
        `<div class="vshield-canvas-item" data-type="text" style="display:inline-block;padding:4px 6px;font-size:14px;">${linkHtml}</div>`,
      );
      return;
    }
    // Tinted in the editor only (vshield-fx); employees get the plain value.
    const spanHtml = `<span class="vshield-fx">${param.label}</span>&nbsp;`;
    if (restoreSelection()) {
      document.execCommand("insertHTML", false, spanHtml);
      synchroniseEditorValue();
      return;
    }
    // Not typing anywhere: the placeholder comes as a text item of its own.
    const [item] = insertCanvasItem(
      `<div class="vshield-canvas-item" data-type="text" style="display:inline-block;padding:4px 6px;font-size:14px;">${spanHtml}</div>`,
    );
    if (item) showToast("Placeholder added as a text item. Double-click text to put one inside it instead.", "info");
  };

  const insertTextBox = () => {
    if (disabled || rawHtmlMode) return;

    const textId = `txt-${Date.now()}`;
    const textHtml = `
      <div id="${textId}" class="vshield-canvas-item vshield-textbox" data-type="text" style="display: block; width: 260px; padding: 6px 8px; background-color: transparent; box-shadow: none; font-size: 14px; line-height: 1.5; color: #1E293B;">Type your text here</div>
    `;

    const [item] = insertCanvasItem(textHtml);
    // Straight into typing, with the sample text selected to type over.
    if (item) startEditing(item, { selectAll: true });
  };

  const insertShape = (shapeType) => {
    setShowShapeMenu(false);
    if (disabled || rawHtmlMode) return;

    const shapeId = `shape-${Date.now()}`;
    let shapeHtml = "";

    switch (shapeType) {
      case "circle":
        shapeHtml = `
          <div id="${shapeId}" class="vshield-canvas-item" data-type="shape" style="position: relative; display: inline-flex; align-items: center; justify-content: center; width: 120px; height: 120px; background-color: #E60000; border-radius: 50%; margin: 12px; cursor: move; vertical-align: middle; text-align: center; box-shadow: none;">
            <div contenteditable="true" spellcheck="false" style="outline: none; max-width: 85%; word-break: break-word; color: #FFFFFF; font-weight: bold; font-size: 13px; cursor: text;">Shape Text</div>
          </div>
        `;
        break;
      case "rounded":
        shapeHtml = `
          <div id="${shapeId}" class="vshield-canvas-item" data-type="shape" style="position: relative; display: inline-flex; align-items: center; justify-content: center; width: 160px; height: 80px; background-color: #2563EB; border-radius: 12px; margin: 12px; cursor: move; vertical-align: middle; text-align: center; box-shadow: none;">
            <div contenteditable="true" spellcheck="false" style="outline: none; max-width: 90%; word-break: break-word; color: #FFFFFF; font-weight: bold; font-size: 13px; cursor: text;">Shape Text</div>
          </div>
        `;
        break;
      case "ellipse":
        shapeHtml = `
          <div id="${shapeId}" class="vshield-canvas-item" data-type="shape" style="position: relative; display: inline-flex; align-items: center; justify-content: center; width: 180px; height: 50px; background-color: #16A34A; border-radius: 9999px; margin: 12px; cursor: move; vertical-align: middle; text-align: center; box-shadow: none;">
            <div contenteditable="true" spellcheck="false" style="outline: none; max-width: 90%; word-break: break-word; color: #FFFFFF; font-weight: bold; font-size: 13px; cursor: text;">Security Badge</div>
          </div>
        `;
        break;
      case "divider":
        shapeHtml = `
          <div id="${shapeId}" class="vshield-canvas-item" data-type="shape" style="position: relative; display: block; width: 100%; height: 4px; background-color: #E2E8F0; margin: 16px 0; cursor: move; box-shadow: none;"></div>
        `;
        break;
      case "card":
        shapeHtml = `
          <div id="${shapeId}" class="vshield-canvas-item" data-type="shape" style="position: relative; display: flex; align-items: center; justify-content: center; width: 92%; max-width: 520px; min-height: 70px; padding: 14px 20px; background-color: #FEF2F2; border-left: 5px solid #E60000; border-radius: 8px; margin: 16px auto; cursor: move; box-shadow: none; text-align: center;">
            <div contenteditable="true" spellcheck="false" style="outline: none; width: 100%; color: #991B1B; font-size: 13px; font-weight: 600; cursor: text;">Alert: Mandatory compliance acknowledgment required before end of day.</div>
          </div>
        `;
        break;
      case "rect":
      default:
        shapeHtml = `
          <div id="${shapeId}" class="vshield-canvas-item" data-type="shape" style="position: relative; display: inline-flex; align-items: center; justify-content: center; width: 160px; height: 90px; background-color: #475569; border-radius: 4px; margin: 12px; cursor: move; vertical-align: middle; text-align: center; box-shadow: none;">
            <div contenteditable="true" spellcheck="false" style="outline: none; max-width: 90%; word-break: break-word; color: #FFFFFF; font-weight: bold; font-size: 13px; cursor: text;">Shape Text</div>
          </div>
        `;
        break;
    }

    insertCanvasItem(shapeHtml);
    showToast("Shape added. Click inside to edit text.", "success");
  };

  const insertButton = (buttonShape) => {
    setShowButtonMenu(false);
    if (disabled || rawHtmlMode) return;

    const buttonId = `btn-${Date.now()}`;
    let borderRadius = "6px";
    if (buttonShape === "pill") borderRadius = "9999px";
    if (buttonShape === "rounded") borderRadius = "12px";
    if (buttonShape === "sharp") borderRadius = "0px";
    if (buttonShape === "soft") borderRadius = "8px";

    // A new button starts with NO On-Click: the author sets it (Set On Click).
    const buttonHtml = `
      <div id="${buttonId}" class="vshield-canvas-item vshield-custom-btn" data-type="button" style="position: relative; display: inline-block; margin: 14px 0; cursor: move; user-select: none; box-shadow: none;">
        <a href="#" onclick="return false;" style="display: inline-block; padding: 10px 26px; background-color: #E60000; color: #FFFFFF; font-family: 'Vodafone ExB', Arial, sans-serif; font-size: 13px; font-weight: 800; text-decoration: none; border-radius: ${borderRadius}; text-align: center; border: none; cursor: pointer; box-shadow: none;" contenteditable="true" spellcheck="false">Click Here to Verify</a>
      </div><p><br></p>
    `;

    insertCanvasItem(buttonHtml);
    showToast("Button added. Double-click to edit its text, then set its On Click.", "success");
  };

  const insertPhishingElement = (elementId) => {
    setShowElementsMenu(false);
    if (disabled || rawHtmlMode) return;

    const elemId = `elem-${Date.now()}`;
    let elemHtml = "";

    switch (elementId) {
      case "external-banner":
        elemHtml = `
          <div id="${elemId}" class="vshield-canvas-item" data-type="card" style="position: relative; display: block; width: 100%; max-width: 580px; padding: 10px 14px; background-color: #FEF3C7; border: 1px solid #F59E0B; border-radius: 6px; margin: 12px auto; font-family: sans-serif; cursor: move; box-shadow: none;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="vshield-canvas-item" data-type="shape" style="background-color: #D97706; color: #FFFFFF; font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 3px; text-transform: uppercase; cursor:move;" contenteditable="true">CAUTION</span>
              <span class="vshield-canvas-item" data-type="text" contenteditable="true" style="outline: none; font-size: 11px; font-weight: 600; color: #92400E; flex: 1; cursor:move;">This email originated from outside Vodafone. Do not click links or open attachments unless you recognize the sender.</span>
            </div>
          </div><p><br></p>
        `;
        break;

      case "password-expiry":
        elemHtml = `
          <div id="${elemId}" class="vshield-canvas-item" data-type="card" style="position: relative; display: block; width: 100%; max-width: 580px; padding: 12px 16px; background-color: #FFF1F2; border-left: 5px solid #E11D48; border-radius: 6px; margin: 12px auto; font-family: sans-serif; cursor: move; box-shadow: none;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px;">
              <div style="flex: 1;">
                <span class="vshield-canvas-item" data-type="text" style="display: block; font-size: 11.5px; font-weight: 700; color: #9F1239; cursor:move;" contenteditable="true">Action Required: Password Expires in 4 Hours</span>
                <span class="vshield-canvas-item" data-type="text" contenteditable="true" style="outline: none; font-size: 10.5px; color: #BE123C; margin-top: 2px; display: block; cursor:move;">Mandatory security hygiene cycle: update credentials immediately to retain Teams & Outlook access.</span>
              </div>
              <div class="vshield-canvas-item vshield-custom-btn" data-type="button" data-action="landing" data-url="{{phishLink}}" style="cursor:move;">
                <a href="{{phishLink}}" onclick="return false;" style="background-color: #E11D48; color: #ffffff; text-decoration: none; padding: 6px 14px; border-radius: 4px; font-size: 10.5px; font-weight: 700; white-space: nowrap; cursor: pointer; display:inline-block;" contenteditable="true">Sync Now</a>
              </div>
            </div>
          </div><p><br></p>
        `;
        break;

      case "attachment-card":
        elemHtml = `
          <div id="${elemId}" class="vshield-canvas-item" data-type="card" data-action="landing" data-url="{{phishLink}}" style="position: relative; display: inline-flex; align-items: center; gap: 12px; padding: 12px 18px; background-color: #F8FAFC; border: 1.5px dashed #94A3B8; border-radius: 8px; margin: 14px 0; cursor: move; box-shadow: none; max-width: 380px;">
            <div class="vshield-canvas-item" data-type="shape" style="width: 32px; height: 38px; background-color: #EF4444; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: #FFFFFF; font-weight: 900; font-size: 10px; flex-shrink: 0; cursor:move;" contenteditable="true">PDF</div>
            <div style="flex: 1; text-align: left; min-width: 0;">
              <span class="vshield-canvas-item" data-type="text" contenteditable="true" style="outline: none; display: block; font-size: 12px; font-weight: 700; color: #0F172A; text-decoration: underline; cursor:move;">Confidential_Salary_Review_Q4.pdf</span>
              <span class="vshield-canvas-item" data-type="text" contenteditable="true" style="font-size: 9.5px; color: #64748B; cursor:move; display:block;">2.4 MB • Scan completed (Clean)</span>
            </div>
          </div><p><br></p>
        `;
        break;

      case "it-notice":
        elemHtml = `
          <div id="${elemId}" class="vshield-canvas-item" data-type="card" style="position: relative; display: block; width: 100%; max-width: 580px; padding: 16px 20px; background-color: #F0F9FF; border: 1px solid #BAE6FD; border-radius: 8px; margin: 14px auto; font-family: sans-serif; cursor: move; box-shadow: none;">
            <div style="display: flex; align-items: flex-start; gap: 12px;">
              <div class="vshield-canvas-item" data-type="shape" style="width: 24px; height: 24px; border-radius: 50%; background-color: #0284C7; color: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; flex-shrink: 0; cursor:move;" contenteditable="true">ℹ</div>
              <div style="flex: 1;">
                <div class="vshield-canvas-item" data-type="text" style="cursor:move;">
                  <h4 contenteditable="true" style="margin: 0 0 4px 0; font-size: 13px; font-weight: 700; color: #0369A1; outline:none;">VSSI Endpoint Engineering Notice</h4>
                </div>
                <div class="vshield-canvas-item" data-type="text" style="cursor:move;">
                  <div contenteditable="true" style="outline: none; font-size: 11.5px; color: #0C4A6E; line-height: 1.5;">This endpoint requires immediate installation of emergency configuration policy KB504821 to avoid automated disconnection from internal networks.</div>
                </div>
              </div>
            </div>
          </div><p><br></p>
        `;
        break;

      case "footer-disclaimer":
      default:
        elemHtml = `
          <div id="${elemId}" class="vshield-canvas-item" data-type="card" style="position: relative; display: block; width: 100%; max-width: 580px; padding: 14px; background-color: #F8FAFC; border-top: 1px solid #E2E8F0; margin: 20px auto 10px auto; font-family: sans-serif; text-align: center; cursor: move; box-shadow: none;">
            <div class="vshield-canvas-item" data-type="text" style="cursor:move;">
              <p contenteditable="true" style="outline: none; margin: 0; font-size: 10px; color: #94A3B8; line-height: 1.5;">This message contains confidential information intended solely for Vodafone personnel. If you are not the named addressee, you should not disseminate, distribute or copy this e-mail.</p>
            </div>
            <div class="vshield-canvas-item" data-type="text" style="cursor:move; margin-top: 6px;">
              <p contenteditable="true" style="margin: 0; font-size: 9.5px; color: #64748B;">© 2026 Vodafone Group Plc. | <a href="{{phishLink}}" onclick="return false;" style="color: #64748B; text-decoration: underline;" contenteditable="true">Unsubscribe Preferences</a></p>
            </div>
          </div><p><br></p>
        `;
        break;
    }

    // Ready-made elements also start with no On-Click (set it on the button).
    insertCanvasItem(toBrowserPageHtml(elemHtml));
    showToast("Element inserted. Select its button and set its On Click.", "success");
  };

  // The toolbar's picture button: the file goes to picture hosting and the
  // email or page links to it (never a copy inside the HTML, which breaks
  // the size limit and is not shown by Gmail).
  const handleImageUpload = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) insertPictureFile(file);
  };

  // A picture file (the toolbar's picker, or pasted) goes to picture hosting
  // and onto the page as a picture item.
  const insertPictureFile = async (file) => {
    if (!file || !editorRef.current) return;

    const problem = pictureFileProblem(file);
    if (problem) {
      showToast(problem, "warning", "Input Required");
      return;
    }

    setPictureBusy("toolbar");
    showToast("Uploading picture...", "info");
    try {
      const url = await uploadPicture(file);
      const alt = String(file.name || "Picture").replace(/[&<>"]/g, "");
      const imageId = `img-${Date.now()}`;
      insertCanvasItem(`
        <div id="${imageId}" class="vshield-canvas-item" data-type="image" style="display: block; width: 240px; box-shadow: none;">
          <img src="${url}" alt="${alt}" style="display: block; width: 100%; height: auto; border-radius: 8px; pointer-events: none; box-shadow: none;" />
        </div>
      `);
      showToast("Picture added. Drag it to move it, or a handle to resize it.", "success");
    } catch (error) {
      showToast(error?.message || "The picture couldn't be uploaded.", "error");
    } finally {
      setPictureBusy(null);
    }
  };

  // =================================================================
  // THE CANVAS (services/canvasLayout.js): a page of fixed width, scaled to
  // fit the editor, with every item at its own place on its own layer, as
  // on a Power BI report page.
  // =================================================================
  const pageKind = () => (currentPageIdRef.current === BROWSER_PAGE_ID ? "browser" : "email");
  const pageEl = () => pageOf(editorRef.current);
  // The page's own size (Page size menu), saved on it; else the default.
  const currentPageWidth = () =>
    parseInt(pageEl()?.getAttribute("data-page-width"), 10) || PAGE_WIDTH[pageKind()];
  const currentPageMin = () =>
    parseInt(pageEl()?.getAttribute("data-min-height"), 10) || PAGE_MIN_HEIGHT[pageKind()];

  // A new page width: items past the new right edge come back inside it.
  const setPageWidth = (typed) => {
    const page = pageEl();
    const width = Math.round(Number(typed));
    if (!page || !Number.isFinite(width)) return;
    const next = Math.max(PAGE_SIZE_LIMITS.minWidth, Math.min(PAGE_SIZE_LIMITS.maxWidth, width));
    page.setAttribute("data-page-width", String(next));
    page.style.width = `${next}px`;
    layerItems(page).forEach((el) => writeRect(el, clampToPage(readRect(el), next), { height: false }));
    setPageWidthPx(next);
    synchroniseEditorValue();
    setDragFrame((n) => n + 1);
    showToast(
      pageKind() === "email" && next > 700
        ? `Page is ${next}px wide. Outlook and Gmail reading panes are about 600-700px, so employees will scroll sideways.`
        : `Page is ${next}px wide.`,
      pageKind() === "email" && next > 700 ? "warning" : "success",
    );
  };

  // The least height the page keeps (it still grows to hold its items).
  const setPageMinHeight = (typed) => {
    const page = pageEl();
    const height = Math.round(Number(typed));
    if (!page || !Number.isFinite(height)) return;
    const next = Math.max(PAGE_SIZE_LIMITS.minHeight, Math.min(PAGE_SIZE_LIMITS.maxHeight, height));
    page.setAttribute("data-min-height", String(next));
    synchroniseEditorValue();
  };

  // The handle on the page's bottom edge: drag down for more room.
  const startPageHeightDrag = (e) => {
    const page = pageEl();
    if (!page) return;
    e.preventDefault();
    e.stopPropagation();
    const scale = pageScale();
    const startY = e.clientY;
    const start = page.offsetHeight;
    // Never shorter than what is on it.
    let lowest = 0;
    layerItems(page).forEach((el) => {
      if (el.style.display !== "none") lowest = Math.max(lowest, (parseFloat(el.style.top) || 0) + el.offsetHeight);
    });
    const onMove = (ev) => {
      const next = Math.round(
        Math.max(PAGE_SIZE_LIMITS.minHeight, lowest, Math.min(PAGE_SIZE_LIMITS.maxHeight, start + (ev.clientY - startY) / scale)),
      );
      page.style.height = `${next}px`;
      page.setAttribute("data-min-height", String(next));
      setPageHeightPx(next);
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      synchroniseEditorValue();
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };
  const isGroupEl = (el) => Boolean(el?.classList?.contains(GROUP_CLASS));
  const isItemEl = (el) => Boolean(el?.classList?.contains(ITEM_CLASS));

  // Screen px per page px (the app's own zoom times the fit-to-editor scale).
  const pageScale = () => {
    const page = pageEl();
    if (!page || !page.offsetWidth) return 1;
    const k = page.getBoundingClientRect().width / page.offsetWidth;
    return k > 0.05 && Number.isFinite(k) ? k : 1;
  };

  // Screen px per px of the scroll area, where frames and toolbars are drawn
  // (at full size, so they stay readable however small the page is shown).
  const overlayScale = () => {
    const sc = scrollerRef.current;
    if (!sc || !sc.offsetWidth) return 1;
    const k = sc.getBoundingClientRect().width / sc.offsetWidth;
    return k > 0.05 && Number.isFinite(k) ? k : 1;
  };

  // A screen rectangle in the scroll area's px.
  const toOverlay = (rect) => {
    const sc = scrollerRef.current;
    if (!sc || !rect) return null;
    const k = overlayScale();
    const area = sc.getBoundingClientRect();
    return {
      left: (rect.left - area.left) / k + sc.scrollLeft,
      top: (rect.top - area.top) / k + sc.scrollTop,
      width: rect.width / k,
      height: rect.height / k,
    };
  };

  toOverlayRef.current = toOverlay;


  // Where an item is on the page (a group's part: its group's place added).
  const pageRectOf = (el) => {
    const own = readRect(el);
    const parent = el.parentElement;
    if (isGroupEl(parent)) {
      const g = readRect(parent);
      return { ...own, left: own.left + g.left, top: own.top + g.top };
    }
    return own;
  };

  // The box an item moves in: the page, or its group (in the item's own coordinates).
  const containerBoxOf = (el) => {
    const parent = el.parentElement;
    if (isGroupEl(parent)) {
      const g = readRect(parent);
      return { left: 0, top: 0, width: g.width, height: g.height };
    }
    const page = pageEl();
    return { left: 0, top: 0, width: currentPageWidth(), height: page?.offsetHeight || currentPageMin() };
  };

  // The page's top-level item holding `node`.
  const topItemOf = (node) => {
    const page = pageEl();
    let at = node?.nodeType === 1 ? node : node?.parentElement;
    while (at && at !== page && editorRef.current?.contains(at)) {
      if (at.parentElement === page && isItemEl(at)) return at;
      at = at.parentElement;
    }
    return null;
  };

  // The part of `group` holding `node`.
  const partOf = (group, node) => {
    let at = node?.nodeType === 1 ? node : node?.parentElement;
    while (at && at !== group) {
      if (at.parentElement === group && isItemEl(at)) return at;
      at = at.parentElement;
    }
    return null;
  };

  // Keep the page tidy after a change: only items on it, layers numbered,
  // every group sized to its parts, and the page as tall as what is on it.
  const fitGroup = (group) => {
    if (!layerItems(group).length) {
      group.remove();
      return;
    }
    const parts = layerItems(group).filter((p) => p.style.display !== "none");
    if (!parts.length) return;
    const box = unionRects(parts.map(readRect));
    const g = readRect(group);
    if (Math.abs(box.left) >= 0.5 || Math.abs(box.top) >= 0.5) {
      parts.forEach((p) => {
        const r = readRect(p);
        writeRect(p, { left: r.left - box.left, top: r.top - box.top }, { height: false });
      });
      layerItems(group)
        .filter((p) => p.style.display === "none")
        .forEach((p) => writeRect(p, { left: px0(p.style.left) - box.left, top: px0(p.style.top) - box.top }, { height: false }));
    }
    const placed = clampToPage(
      { left: g.left + box.left, top: g.top + box.top, width: box.width, height: box.height },
      currentPageWidth(),
    );
    writeRect(group, placed);
  };

  const px0 = (v) => parseFloat(v) || 0;

  const tidyPage = () => {
    const page = pageEl();
    if (!page) return;
    for (const node of Array.from(page.childNodes)) {
      if (node.nodeType !== 1 || !isItemEl(node)) {
        if (node.nodeType === 1 && node.textContent.trim()) {
          // Something typed or pasted outside an item: it becomes one.
          node.classList.add(ITEM_CLASS);
          node.setAttribute("data-type", "text");
          writeRect(node, { left: 20, top: page.offsetHeight - 40, width: Math.min(400, currentPageWidth() - 40) }, { height: false });
        } else {
          node.remove();
        }
      }
    }
    layerItems(page).forEach((el) => {
      if (isGroupEl(el)) {
        renumberLayers(el);
        fitGroup(el);
      }
    });
    renumberLayers(page);
    fitPageHeight(page, currentPageMin());
  };

  tidyPageRef.current = tidyPage;

  // A page made for the old flowing canvas (a template, an older scenario)
  // is laid out as items once, where they were seen.
  const ensurePageHtml = (html, pageId = currentPageIdRef.current, width = null, { fresh = false } = {}) => {
    const kind = pageId === BROWSER_PAGE_ID ? "browser" : "email";
    const pageWidth = width || PAGE_WIDTH[kind];
    // Older fx tags carried their purple tint inline, so it was sent too:
    // now a class the editor alone styles.
    let out = String(html || "").replace(LEGACY_FX_SPAN, '<span class="vshield-fx">');
    if (!isLaidOut(out)) {
      if (EMPTY_HTML_VALUES.includes(out.trim().toLowerCase()) || isBlankHtml(out)) {
        out = emptyPageHtml(pageWidth, PAGE_MIN_HEIGHT[kind]);
      } else {
        const marked = out.includes(ITEM_CLASS) ? out : componentizeTemplateHtml(out);
        out = layoutPageHtml(marked, {
          width: pageWidth,
          minHeight: PAGE_MIN_HEIGHT[kind],
          textStyle: CANVAS_TEXT_STYLE,
        });
      }
    }
    // A freshly applied template arrives with NO On-Click on either page: the
    // author wires the submit / phishing button themselves. A saved page keeps
    // whatever it already has (this runs only when fresh).
    if (fresh) out = toBrowserPageHtml(out);
    // Text is edited one item at a time (double-click), never all at once.
    return out.replace(/\s+contenteditable\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  };

  // ---------------------------------------------------------------
  // Selecting
  // ---------------------------------------------------------------
  const selectedItems = () => {
    const live = (el) => el?.isConnected && editorRef.current?.contains(el);
    if (pickedBlocks.length) return pickedBlocks.filter(live);
    return live(activeElement?.element) ? [activeElement.element] : [];
  };

  // Select one item: its frame, size and tools.
  const selectCanvasItem = (canvasItem) => {
    if (!canvasItem) return;
    const isGroup = isGroupEl(canvasItem);
    const innerA = isGroup ? null : canvasItem.querySelector("a");
    const innerImg = isGroup ? null : canvasItem.querySelector("img");
    const currentBg = innerA
      ? innerA.style.backgroundColor
      : canvasItem.style.backgroundColor || window.getComputedStyle(canvasItem).backgroundColor;
    const elForRadius = innerA || innerImg || canvasItem;
    const currentRadius =
      elForRadius.style.borderRadius || window.getComputedStyle(elForRadius).borderRadius || "0px";
    const rect = readRect(canvasItem);
    setPickedBlocks([]);
    setActiveElement({
      element: canvasItem,
      type: canvasItem.getAttribute("data-type") || "shape",
      width: rect.width,
      height: rect.height,
      color: currentBg,
      borderRadius: currentRadius,
    });
    setAspectRatioText(calculateAspectRatio(rect.width, rect.height));
    setShowShadowMenu(false);
    setShowRoundedMenu(false);
    setShowBorderMenu(false);
    setShowLayoutMenu(false);
  };

  // Several items at once (2 or more), or one, or none.
  const selectItems = (items) => {
    const unique = [...new Set(items.filter(Boolean))];
    if (unique.length === 1) selectCanvasItem(unique[0]);
    else {
      setActiveElement(null);
      setPickedBlocks(unique);
    }
  };

  const clearSelection = () => {
    stopEditing();
    setActiveElement(null);
    setPickedBlocks([]);
    setShowShadowMenu(false);
    setShowRoundedMenu(false);
    setShowBorderMenu(false);
    setShowLayoutMenu(false);
  };

  // ---------------------------------------------------------------
  // Editing text: double-click an item (or Enter / F2 with it selected).
  // Only that item is editable while its text is edited.
  // ---------------------------------------------------------------
  const hasText = (el) =>
    Boolean(el) && !isGroupEl(el) && el.getAttribute("data-type") !== "image" && !el.matches("img, hr");

  const caretRangeAt = (x, y) => {
    if (document.caretRangeFromPoint) return document.caretRangeFromPoint(x, y);
    if (document.caretPositionFromPoint) {
      const pos = document.caretPositionFromPoint(x, y);
      if (!pos) return null;
      const range = document.createRange();
      range.setStart(pos.offsetNode, pos.offset);
      range.collapse(true);
      return range;
    }
    return null;
  };

  const stopEditing = () => {
    const el = editingRef.current;
    if (!el) return;
    editingRef.current = null;
    setEditingItem(null);
    if (el.isConnected) {
      el.removeAttribute("contenteditable");
      el.removeAttribute("spellcheck");
      window.getSelection()?.removeAllRanges();
      synchroniseEditorValue();
    }
  };

  const startEditing = (el, { x, y, selectAll = false } = {}) => {
    if (!hasText(el) || disabled || rawHtmlMode) return;
    if (editingRef.current && editingRef.current !== el) stopEditing();
    editingRef.current = el;
    setEditingItem(el);
    el.setAttribute("contenteditable", "true");
    el.setAttribute("spellcheck", "true");
    el.focus({ preventScroll: true });
    const selection = window.getSelection();
    let range = x != null ? caretRangeAt(x, y) : null;
    if (!range || !el.contains(range.startContainer) || selectAll) {
      range = document.createRange();
      range.selectNodeContents(el);
      if (!selectAll) range.collapse(false);
    }
    selection.removeAllRanges();
    selection.addRange(range);
    saveSelection();
  };

  // ---------------------------------------------------------------
  // Pressing on the canvas: select (Ctrl/Shift adds), drag to move, drag
  // on empty canvas to box-select. Double-click goes into a group, then
  // into text.
  // ---------------------------------------------------------------
  // Which item a press picks: the top-level item under it; inside a group
  // whose part is selected, the part under it (as in Power BI).
  const pickAt = (target) => {
    const top = topItemOf(target);
    if (!top) return null;
    const active = activeElement?.element;
    if (isGroupEl(top) && active && active !== top && top.contains(active)) {
      return partOf(top, target) || top;
    }
    return top;
  };

  const startMove = (e, items) => {
    const scale = pageScale();
    const startX = e.clientX;
    const startY = e.clientY;
    const starts = items.map((el) => ({ el, rect: readRect(el) }));
    // All moving items share a container (the page, or one group).
    const container = containerBoxOf(items[0]);
    const unionStart = unionRects(starts.map((s) => s.rect));
    const others = layerItems(items[0].parentElement)
      .filter((el) => !items.includes(el) && el.style.display !== "none")
      .map(readRect);
    const lines = snapLines(container, others);
    const inGroup = isGroupEl(items[0].parentElement);
    const groupAt = inGroup ? readRect(items[0].parentElement) : { left: 0, top: 0 };
    let moved = false;
    let frame = 0;

    const onMove = (ev) => {
      const dx = (ev.clientX - startX) / scale;
      const dy = (ev.clientY - startY) / scale;
      if (!moved && Math.hypot(ev.clientX - startX, ev.clientY - startY) < DRAG_START_PX) return;
      moved = true;
      let box = { ...unionStart, left: unionStart.left + dx, top: unionStart.top + dy };
      let guides = { x: null, y: null };
      if (!ev.altKey) {
        const snapped = snapRect(box, lines, SNAP_PX / Math.max(0.25, scale));
        box = snapped.rect;
        guides = { x: snapped.guideX, y: snapped.guideY };
      }
      // Never past the page's edges (inside a group: as placed on the page).
      const onPage = clampToPage(
        { ...box, left: box.left + groupAt.left, top: box.top + groupAt.top },
        currentPageWidth(),
      );
      box = { ...box, left: onPage.left - groupAt.left, top: onPage.top - groupAt.top };
      const shiftX = box.left - unionStart.left;
      const shiftY = box.top - unionStart.top;
      starts.forEach(({ el, rect }) =>
        writeRect(el, { left: rect.left + shiftX, top: rect.top + shiftY }, { height: false }),
      );
      // Dragged below the bottom: the page grows with it, so it stays in view.
      const page = pageEl();
      const bottom = box.top + groupAt.top + box.height + 24;
      if (page && bottom > page.offsetHeight) {
        page.style.height = `${Math.ceil(bottom)}px`;
        setPageHeightPx(Math.ceil(bottom));
      }
      setSnapGuide(
        guides.x == null && guides.y == null
          ? null
          : {
              x: guides.x == null ? null : guides.x + groupAt.left,
              y: guides.y == null ? null : guides.y + groupAt.top,
            },
      );
      if (!frame) {
        frame = requestAnimationFrame(() => {
          frame = 0;
          setDragFrame((n) => n + 1);
        });
      }
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      if (frame) cancelAnimationFrame(frame);
      setSnapGuide(null);
      if (moved) {
        swallowClickRef.current = true;
        synchroniseEditorValue();
      }
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const startBoxSelect = (e, additive) => {
    const sc = scrollerRef.current;
    if (!sc) return;
    const k = overlayScale();
    const toArea = (x, y) => {
      const a = sc.getBoundingClientRect();
      return { x: (x - a.left) / k + sc.scrollLeft, y: (y - a.top) / k + sc.scrollTop };
    };
    const start = toArea(e.clientX, e.clientY);
    const before = selectedItems();
    let box = null;
    const onMove = (ev) => {
      const at = toArea(ev.clientX, ev.clientY);
      if (!box && Math.hypot(at.x - start.x, at.y - start.y) < DRAG_START_PX + 1) return;
      box = {
        left: Math.min(start.x, at.x),
        top: Math.min(start.y, at.y),
        width: Math.abs(at.x - start.x),
        height: Math.abs(at.y - start.y),
      };
      setSelectBox(box);
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      setSelectBox(null);
      if (!box) {
        if (!additive) clearSelection();
        return;
      }
      swallowClickRef.current = true;
      const hits = layerItems(pageEl()).filter(
        (el) => el.style.display !== "none" && rectsIntersect(box, toOverlay(el.getBoundingClientRect())),
      );
      selectItems(additive ? [...before, ...hits] : hits);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const handleWorkspaceMouseDown = (e) => {
    swallowClickRef.current = false;
    if (rawHtmlMode || disabled || e.button !== 0) return;
    const target = e.target;
    if (target.closest?.("[data-floating-control]")) return;
    // Keys (arrows, Delete, Ctrl+C...) go to the canvas while it is in use.
    if (!editingRef.current?.contains(target)) scrollerRef.current?.focus({ preventScroll: true });

    // Typing in an item: its text takes the press.
    if (editingRef.current && editingRef.current.contains(target)) return;
    if (editingRef.current) stopEditing();

    const additive = e.ctrlKey || e.metaKey || e.shiftKey;
    const item = pickAt(target);
    if (!item) {
      e.preventDefault();
      startBoxSelect(e, additive);
      return;
    }
    e.preventDefault();
    const current = selectedItems();
    if (additive) {
      // Only items side by side (all on the page, or all in one group).
      const sameLevel = current.every((el) => el.parentElement === item.parentElement);
      const next = current.includes(item)
        ? current.filter((el) => el !== item)
        : sameLevel
          ? [...current, item]
          : [item];
      selectItems(next);
      swallowClickRef.current = true;
      return;
    }
    const moving = current.includes(item) && current.length > 1 ? current : [item];
    if (!(current.length === 1 && current[0] === item)) selectItems(moving);
    startMove(e, moving);
  };

  // Links on the canvas never navigate.
  const handleCanvasClick = (e) => {
    if (e.target.closest?.("a") && editorRef.current?.contains(e.target)) e.preventDefault();
    if (swallowClickRef.current) swallowClickRef.current = false;
  };

  const handleCanvasDoubleClick = (e) => {
    if (rawHtmlMode || disabled) return;
    if (e.target.closest?.("[data-floating-control]")) return;
    const top = topItemOf(e.target);
    if (!top) return;
    const active = activeElement?.element;
    // Into a group: the part under the mouse.
    if (isGroupEl(top) && (active === top || !active || !top.contains(active))) {
      const part = partOf(top, e.target);
      if (part) {
        selectCanvasItem(part);
        return;
      }
    }
    const item = isGroupEl(top) ? partOf(top, e.target) || top : top;
    if (hasText(item)) {
      selectCanvasItem(item);
      startEditing(item, { x: e.clientX, y: e.clientY });
    }
  };

  // ---------------------------------------------------------------
  // Resizing from the eight handles (Shift keeps proportions; pictures
  // always keep theirs). A group's parts scale with it.
  // ---------------------------------------------------------------
  const startResizeItem = (e, handle) => {
    const el = activeElement?.element;
    if (!el) return;
    e.preventDefault();
    e.stopPropagation();
    const scale = pageScale();
    const startX = e.clientX;
    const startY = e.clientY;
    const start = readRect(el);
    const isGroup = isGroupEl(el);
    const parts = isGroup ? layerItems(el).map((p) => ({ p, rect: readRect(p) })) : [];
    const innerImg = isGroup ? null : el.querySelector("img");
    const isImage = !isGroup && (el.getAttribute("data-type") === "image" || el.tagName === "IMG");
    const innerA = !isGroup && el.getAttribute("data-type") === "button" ? el.querySelector("a") : null;
    const innerInput = !isGroup && el.getAttribute("data-type") === "input" ? el.querySelector("input") : null;
    const groupAt = isGroupEl(el.parentElement) ? readRect(el.parentElement) : { left: 0, top: 0 };

    const onMove = (ev) => {
      const dx = (ev.clientX - startX) / scale;
      const dy = (ev.clientY - startY) / scale;
      let next = resizeRect(start, handle, dx, dy, { keepRatio: ev.shiftKey || isImage });
      // Not past the page's right edge.
      const maxWidth = currentPageWidth() - (next.left + groupAt.left);
      if (next.left + groupAt.left < 0) next = { ...next, width: next.width + next.left + groupAt.left, left: -groupAt.left };
      if (next.width > maxWidth) next = { ...next, width: Math.max(16, maxWidth) };
      if (next.top + groupAt.top < 0) next = { ...next, height: next.height + next.top + groupAt.top, top: -groupAt.top };
      writeRect(el, next);
      if (isGroup) {
        parts.forEach(({ p, rect }) => writeRect(p, scaleIntoGroup(rect, start, next)));
      } else if (innerImg) {
        innerImg.style.width = "100%";
        innerImg.style.height = "100%";
        innerImg.style.objectFit = innerImg.style.objectFit || "cover";
      } else if (innerA) {
        innerA.style.width = "100%";
        innerA.style.height = "100%";
        innerA.style.boxSizing = "border-box";
        innerA.style.display = "flex";
        innerA.style.alignItems = "center";
        innerA.style.justifyContent = "center";
      } else if (innerInput) {
        innerInput.style.width = "100%";
        innerInput.style.height = "100%";
        innerInput.style.boxSizing = "border-box";
      }
      setActiveElement((prev) => (prev?.element === el ? { ...prev, width: next.width, height: next.height } : prev));
      setAspectRatioText(calculateAspectRatio(next.width, next.height));
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      synchroniseEditorValue();
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  // X, Y, W or H typed in the item's toolbar (in the units picked).
  const setItemBox = (field, typed) => {
    const el = activeElement?.element;
    const value = fromUnit(typed, lengthUnit);
    if (!el || value == null) return;
    const r = readRect(el);
    const groupAt = isGroupEl(el.parentElement) ? readRect(el.parentElement) : { left: 0, top: 0 };
    let next = { ...r, [{ x: "left", y: "top", w: "width", h: "height" }[field]]: value };
    // X and Y are on the page, as Power BI shows them.
    if (field === "x") next.left = value - groupAt.left;
    if (field === "y") next.top = value - groupAt.top;
    const onPage = clampToPage({ ...next, left: next.left + groupAt.left, top: next.top + groupAt.top }, currentPageWidth());
    next = { ...onPage, left: onPage.left - groupAt.left, top: onPage.top - groupAt.top };
    if (isGroupEl(el)) {
      layerItems(el).forEach((p) => writeRect(p, scaleIntoGroup(readRect(p), r, next)));
    }
    writeRect(el, next, { height: field === "h" || isGroupEl(el) || Boolean(el.style.height && el.style.height !== "auto") });
    synchroniseEditorValue();
    selectCanvasItem(el);
  };

  // Arrow keys: move the selection by `dx`, `dy` page px.
  const nudgeSelection = (dx, dy) => {
    const items = selectedItems();
    if (!items.length) return;
    const box = unionRects(items.map(readRect));
    const groupAt = isGroupEl(items[0].parentElement) ? readRect(items[0].parentElement) : { left: 0, top: 0 };
    const onPage = clampToPage(
      { ...box, left: box.left + dx + groupAt.left, top: box.top + dy + groupAt.top },
      currentPageWidth(),
    );
    const sx = onPage.left - groupAt.left - box.left;
    const sy = onPage.top - groupAt.top - box.top;
    items.forEach((el) => {
      const r = readRect(el);
      writeRect(el, { left: r.left + sx, top: r.top + sy }, { height: false });
    });
    synchroniseEditorValue();
    setDragFrame((n) => n + 1);
  };

  // ---------------------------------------------------------------
  // Layers: forward / backward one layer, or to the front / back.
  // ---------------------------------------------------------------
  const LAYER_LABELS = {
    forward: "Brought forward one layer.",
    backward: "Sent backward one layer.",
    front: "Brought to the front.",
    back: "Sent to the back.",
  };

  const changeLayer = (op, items = selectedItems()) => {
    if (!items.length) return;
    const parent = items[0].parentElement;
    const same = items.filter((el) => el.parentElement === parent);
    const order = layerItems(parent);
    const next = moveLayers(order, same, op);
    if (next.every((el, i) => el === order[i])) {
      showToast(op === "forward" || op === "front" ? "Already at the front." : "Already at the back.", "info");
      return;
    }
    next.forEach((el) => parent.appendChild(el));
    renumberLayers(parent);
    synchroniseEditorValue();
    const at = next.indexOf(same[same.length - 1]) + 1;
    showToast(`${LAYER_LABELS[op]} Layer ${at} of ${next.length}${isGroupEl(parent) ? " in its group" : ""}.`, "success");
  };

  // ---------------------------------------------------------------
  // Groups: one level only. Items on the page are grouped; a group's parts
  // keep their own layers inside it.
  // ---------------------------------------------------------------
  const groupSelection = () => {
    const page = pageEl();
    const items = selectedItems();
    if (items.length < 2) {
      showToast(
        "Select two or more items to group: Ctrl+click each, drag a box around them, or Ctrl+click them in the Selection pane.",
        "warning",
        "Nothing To Group",
      );
      return;
    }
    if (items.some((el) => el.parentElement !== page)) {
      showToast("Parts of a group can't be grouped again. Groups are one level deep.", "warning", "Not Grouped");
      return;
    }
    if (items.some(isGroupEl)) {
      showToast("A group can't hold another group. Ungroup it first, then group everything together.", "warning", "Not Grouped");
      return;
    }
    stopEditing();
    const order = layerItems(page);
    const members = order.filter((el) => items.includes(el));
    const box = unionRects(members.map(readRect));
    const group = document.createElement("div");
    group.className = `${ITEM_CLASS} ${GROUP_CLASS}`;
    group.setAttribute("data-type", "group");
    group.id = `grp-${Date.now()}`;
    writeRect(group, box);
    // The group takes the layer of its frontmost part.
    const front = members[members.length - 1];
    page.insertBefore(group, front.nextSibling);
    members.forEach((el) => {
      const r = readRect(el);
      group.appendChild(el);
      writeRect(el, { left: r.left - box.left, top: r.top - box.top }, { height: false });
    });
    renumberLayers(group);
    renumberLayers(page);
    synchroniseEditorValue();
    selectCanvasItem(group);
    showToast("Grouped. Click it to move it as one; double-click a part to select it.", "success", "Group Made");
  };

  const ungroupSelection = (groupEl) => {
    const page = pageEl();
    const group = groupEl || selectedItems().find(isGroupEl) || (isGroupEl(activeElement?.element?.parentElement) ? activeElement.element.parentElement : null);
    if (!group || group.parentElement !== page) return;
    stopEditing();
    const g = readRect(group);
    const parts = layerItems(group);
    parts.forEach((p) => {
      const r = readRect(p);
      page.insertBefore(p, group);
      writeRect(p, { left: r.left + g.left, top: r.top + g.top }, { height: false });
    });
    group.remove();
    renumberLayers(page);
    synchroniseEditorValue();
    selectItems(parts);
    showToast("Ungrouped. Each part keeps its place and layer.", "success", "Ungrouped");
  };

  // ---------------------------------------------------------------
  // Align and distribute (one item: in its page or group; several: to each other).
  // ---------------------------------------------------------------
  const ALIGN_LABELS = {
    left: "Aligned left.",
    center: "Centred across.",
    right: "Aligned right.",
    top: "Aligned to the top.",
    middle: "Centred top to bottom.",
    bottom: "Aligned to the bottom.",
  };

  const alignSelection = (mode) => {
    const items = selectedItems();
    if (!items.length) return;
    const rects = items.map(readRect);
    let bounds;
    if (items.length === 1) {
      bounds = containerBoxOf(items[0]);
      // On the browser page, up and down is within what is seen before scrolling.
      if (!isGroupEl(items[0].parentElement) && pageKind() === "browser" && /top|middle|bottom/.test(mode)) {
        bounds = { ...bounds, height: Math.min(bounds.height, BROWSER_SAFE_ZONE_PX) };
      }
    } else {
      bounds = unionRects(rects);
    }
    alignRects(rects, mode, bounds).forEach((r, i) => writeRect(items[i], r, { height: false }));
    synchroniseEditorValue();
    setDragFrame((n) => n + 1);
    showToast(ALIGN_LABELS[mode] || "Aligned.", "success");
  };

  const distributeSelection = (axis) => {
    const items = selectedItems();
    if (items.length < 3) {
      showToast("Select three or more items to space them evenly.", "info");
      return;
    }
    distributeRects(items.map(readRect), axis).forEach((r, i) => writeRect(items[i], r, { height: false }));
    synchroniseEditorValue();
    setDragFrame((n) => n + 1);
    showToast(axis === "vertical" ? "Spaced evenly top to bottom." : "Spaced evenly across.", "success");
  };

  // ---------------------------------------------------------------
  // Duplicate, delete, copy, cut and paste
  // ---------------------------------------------------------------
  const freshIds = (root) => {
    const stamp = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    if (root.id) root.id = `dup-${stamp}`;
    root.querySelectorAll("[id]").forEach((el, i) => {
      el.id = `dup-${stamp}-${i}`;
    });
  };

  // Copies of `sources` put in front, a little down and right of where they were.
  const placeCopies = (sources, parent, offset = 16) => {
    const copies = sources.map((src) => {
      const copy = src.cloneNode(true);
      copy.removeAttribute("contenteditable");
      freshIds(copy);
      parent.appendChild(copy);
      const r = readRect(src);
      const groupAt = isGroupEl(parent) ? readRect(parent) : { left: 0, top: 0 };
      const onPage = clampToPage(
        { ...r, left: r.left + offset + groupAt.left, top: r.top + offset + groupAt.top },
        currentPageWidth(),
      );
      writeRect(copy, { left: onPage.left - groupAt.left, top: onPage.top - groupAt.top }, { height: false });
      return copy;
    });
    renumberLayers(parent);
    return copies;
  };

  const duplicateActiveItem = () => {
    const items = selectedItems();
    if (!items.length) return;
    stopEditing();
    const copies = placeCopies(items, items[0].parentElement);
    synchroniseEditorValue();
    selectItems(copies);
    showToast(copies.length === 1 ? "Duplicated." : `${copies.length} items duplicated.`, "success");
  };

  const deleteActiveItem = () => {
    const items = selectedItems();
    if (!items.length) return;
    stopEditing();
    items.forEach((el) => el.remove());
    clearSelection();
    synchroniseEditorValue();
    showToast(items.length === 1 ? "Item deleted." : `${items.length} items deleted.`, "success");
  };

  const copyItemsToClipboard = (event, { cut = false } = {}) => {
    const items = selectedItems();
    if (!items.length) return false;
    const html = `<div ${ITEM_COPY_MARK}="1">${items.map((el) => el.outerHTML).join("")}</div>`;
    itemClipboardRef.current = html;
    event.clipboardData?.setData("text/html", html);
    event.clipboardData?.setData("text/plain", items.map((el) => el.textContent.trim()).join("\n"));
    event.preventDefault();
    if (cut) {
      items.forEach((el) => el.remove());
      clearSelection();
      synchroniseEditorValue();
    }
    showToast(
      `${items.length === 1 ? "Item" : `${items.length} items`} ${cut ? "cut" : "copied"}. Ctrl+V pastes ${cut ? "it back" : "a copy"}.`,
      "success",
    );
    return true;
  };

  // Copied items go on the page in front, a little down and right each time.
  const pasteCopiedItems = (html) => {
    const page = pageEl();
    if (!page) return;
    const doc = new DOMParser().parseFromString(html, "text/html");
    const holder = doc.querySelector(`[${ITEM_COPY_MARK}]`);
    if (!holder) return;
    pasteCountRef.current += 1;
    const sources = Array.from(holder.children).filter((n) => n.classList.contains(ITEM_CLASS));
    // Measured where they would sit, then placed as copies.
    const staged = sources.map((n) => {
      const el = document.importNode(n, true);
      el.style.visibility = "hidden";
      page.appendChild(el);
      return el;
    });
    const copies = placeCopies(staged, page, 16 * pasteCountRef.current);
    staged.forEach((el) => el.remove());
    copies.forEach((el) => {
      el.style.visibility = "";
    });
    renumberLayers(page);
    synchroniseEditorValue();
    selectItems(copies);
    showToast(copies.length === 1 ? "Item pasted." : `${copies.length} items pasted.`, "success");
  };

  // ---------------------------------------------------------------
  // The item's own box, padding and picture
  // ---------------------------------------------------------------
  const styledPart = (el) => {
    const type = el.getAttribute("data-type");
    if (type === "button") return el.querySelector("a") || el;
    if (type === "input") return el.querySelector("input") || el;
    return el;
  };

  const readItemPadding = (el) => {
    if (!el || isGroupEl(el)) return 0;
    return Math.round(parseFloat(window.getComputedStyle(styledPart(el)).paddingTop) || 0);
  };

  const setItemPadding = (typed) => {
    const el = activeElement?.element;
    const value = fromUnit(typed, lengthUnit);
    if (!el || value == null) return;
    const part = styledPart(el);
    part.style.padding = `${Math.max(0, value)}px`;
    part.style.boxSizing = "border-box";
    synchroniseEditorValue();
    selectCanvasItem(el);
  };

  // A picture's alt text: what the employee sees while pictures are blocked.
  const activePicture = () => {
    const el = activeElement?.element;
    if (!el || isGroupEl(el)) return null;
    return el.tagName === "IMG" ? el : el.querySelector("img");
  };

  const setPictureAlt = (alt) => {
    const img = activePicture();
    if (!img) return;
    img.setAttribute("alt", alt);
    synchroniseEditorValue();
  };

  // Visibility (the Selection pane's eye): a hidden item is not on the page,
  // in the preview, or in what is sent.
  const toggleHidden = (el) => {
    const hidden = el.getAttribute("data-hidden") === "true";
    if (hidden) {
      el.removeAttribute("data-hidden");
      el.style.display = el.getAttribute("data-display") || "";
      el.removeAttribute("data-display");
    } else {
      el.setAttribute("data-hidden", "true");
      if (el.style.display && el.style.display !== "none") el.setAttribute("data-display", el.style.display);
      el.style.display = "none";
      if (selectedItems().includes(el)) clearSelection();
    }
    synchroniseEditorValue();
  };

  const setAllHidden = (hide) => {
    const page = pageEl();
    if (!page) return;
    const all = layerItems(page).flatMap((el) => [el, ...(isGroupEl(el) ? layerItems(el) : [])]);
    all.forEach((el) => {
      if ((el.getAttribute("data-hidden") === "true") !== hide) toggleHidden(el);
    });
  };

  const updateActiveItemColor = (newColor) => {
    if (!activeElement?.element) return;
    const el = activeElement.element;
    const isBtnWrapper = el.getAttribute("data-type") === "button";
    const innerA = isBtnWrapper ? el.querySelector("a") : null;
    const isInputWrapper = el.getAttribute("data-type") === "input";
    const innerInput = isInputWrapper ? el.querySelector("input") : null;

    if (innerA) {
      innerA.style.backgroundColor = newColor;
    } else if (innerInput) {
      innerInput.style.backgroundColor = newColor;
    } else {
      el.style.backgroundColor = newColor;
    }
    setActiveElement((prev) => (prev ? { ...prev, color: newColor } : null));
    synchroniseEditorValue();
  };

  const handleEyedropperForObject = async () => {
    if (!window.EyeDropper) {
      showToast("EyeDropper is not supported in this browser.", "warning");
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
    const isInputWrapper = el.getAttribute("data-type") === "input";
    const innerInput = isInputWrapper ? el.querySelector("input") : null;
    const target = innerA || innerInput || el;

    target.style.boxShadow = shadowValue;
    setShowShadowMenu(false);
    synchroniseEditorValue();
    showToast("Shadow updated.", "success");
  };

  const updateActiveItemRoundedness = (radiusValue, closeMenu = false) => {
    if (!activeElement?.element) return;
    const el = activeElement.element;
    const isBtnWrapper = el.getAttribute("data-type") === "button";
    const innerA = isBtnWrapper ? el.querySelector("a") : null;
    const isInputWrapper = el.getAttribute("data-type") === "input";
    const innerInput = isInputWrapper ? el.querySelector("input") : null;
    const innerImg = el.tagName === "IMG" ? el : el.querySelector(":scope > img");

    el.style.borderRadius = radiusValue;
    if (innerA) innerA.style.borderRadius = radiusValue;
    if (innerInput) innerInput.style.borderRadius = radiusValue;
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
    const isInputWrapper = el.getAttribute("data-type") === "input";
    const innerInput = isInputWrapper ? el.querySelector("input") : null;
    const target = innerA || innerInput || el;

    if (styleType !== undefined) target.style.borderStyle = styleType;
    if (widthValue !== undefined) target.style.borderWidth = widthValue;
    if (colorValue !== undefined) target.style.borderColor = colorValue;

    setShowBorderMenu(false);
    synchroniseEditorValue();
    showToast("Border updated.", "success");
  };

  // ---- Per-corner rounding: round only one corner, or only the two on one
  // side (e.g. a tab with just its top corners rounded). ----------------
  const CORNER_PROP = {
    tl: "borderTopLeftRadius",
    tr: "borderTopRightRadius",
    br: "borderBottomRightRadius",
    bl: "borderBottomLeftRadius",
  };
  const CORNERS = ["tl", "tr", "br", "bl"];
  const SIDE_CORNERS = {
    top: ["tl", "tr"],
    right: ["tr", "br"],
    bottom: ["br", "bl"],
    left: ["bl", "tl"],
  };

  // The element plus the inner link / field / image that actually shows the box.
  const radiusTargets = (el) => {
    const out = [el];
    const inner =
      (el.getAttribute("data-type") === "button" && el.querySelector("a")) ||
      (el.getAttribute("data-type") === "input" && el.querySelector("input")) ||
      (el.tagName === "IMG" ? null : el.querySelector(":scope > img"));
    if (inner) out.push(inner);
    return out;
  };

  const cornerRadiusOf = (corner) => {
    if (!activeElement?.element) return 0;
    const targets = radiusTargets(activeElement.element);
    const probe = targets[targets.length - 1];
    return Math.round(parseFloat(window.getComputedStyle(probe)[CORNER_PROP[corner]]) || 0);
  };

  // Apply a map of { corner: px } to the element in one pass.
  const applyCorners = (map) => {
    if (!activeElement?.element) return;
    radiusTargets(activeElement.element).forEach((t) => {
      Object.entries(map).forEach(([corner, px]) => {
        t.style[CORNER_PROP[corner]] = `${Math.max(0, Math.round(px))}px`;
      });
    });
    setActiveElement((prev) => (prev ? { ...prev, borderRadius: undefined } : null));
    setDragFrame((n) => n + 1);
    synchroniseEditorValue();
  };

  // Turn one corner on (to the chosen amount) or off (0).
  const toggleCorner = (corner) =>
    applyCorners({ [corner]: cornerRadiusOf(corner) > 0 ? 0 : cornerAmount });
  // Round only the two corners of one side; square the other two.
  const roundOnlySide = (side) =>
    applyCorners(Object.fromEntries(CORNERS.map((c) => [c, SIDE_CORNERS[side].includes(c) ? cornerAmount : 0])));
  // All four corners, or none.
  const setAllCorners = (px) => applyCorners(Object.fromEntries(CORNERS.map((c) => [c, px])));

  // On the browser page, only a real submit button (Next, Submit, Confirm,
  // Sign in...) carries an On-Click. Everything else (logos, labels, fields,
  // body text) is just there to look real.
  const isActionButton = (el) => {
    if (!el) return false;
    if (isGroupEl(el)) return false;
    if (el.getAttribute("data-type") === "button") return true;
    if (el.querySelector?.("button, input[type=submit], input[type=button], input[type=image]")) return true;
    const tag = el.tagName;
    const type = (el.getAttribute?.("type") || "").toLowerCase();
    if (tag === "BUTTON") return type !== "reset";
    if (tag === "INPUT") return ["submit", "button", "image"].includes(type);
    const text = (el.textContent || el.getAttribute?.("value") || "").trim();
    return text.length > 0 && text.length <= 40 && ACTION_WORDS.test(text);
  };

  // Whether this element may be given an On-Click: any element on the email,
  // but only an action button on the browser page.
  const canHaveAction = (el) =>
    !!el && !isGroupEl(el) && (currentPageIdRef.current !== BROWSER_PAGE_ID || isActionButton(el));

  const openActionModal = (e) => {
    e?.stopPropagation();
    if (!activeElement?.element) return;
    const onBrowser = currentPageIdRef.current === BROWSER_PAGE_ID;
    const el = activeElement.element;
    const current =
      el.getAttribute("data-action") ||
      linkAction((el.tagName === "A" ? el : el.querySelector("a"))?.getAttribute("href"));
    setActionConfigModal({
      open: true,
      element: el,
      // Nothing is pre-selected on the browser page: start from what the
      // element already has (compromise or nothing). On the email, when a
      // browser page already exists this element must open it, so the only
      // option is "page".
      actionType: onBrowser
        ? current === "training" ? "training" : "none"
        : hasBrowserPage ? "page" : current === "page" ? "page" : "landing",
    });
  };

  // The element's On-Click, as the link it carries: email clients and the
  // served browser page only ever follow links, never scripts.
  //   email  landing  {{phishLink}}              -> click, landing page
  //   email  page     {{phishLink}}?next=browser -> click, browser page
  //   page 2 training {{compromiseLink}}         -> compromised, landing page
  // Take any On-Click off an element: it becomes inert again (no action, a
  // dead '#' link), so a browser-page button that is not the submit button
  // never marks the employee compromised.
  const clearElementAction = (targetEl) => {
    if (!targetEl) return;
    targetEl.removeAttribute("data-action");
    targetEl.removeAttribute("data-url");
    targetEl.removeAttribute("data-target-page");
    targetEl.onclick = null;
    [targetEl, ...targetEl.querySelectorAll("a")].forEach((a) => {
      if (a.tagName === "A") {
        a.setAttribute("href", "#");
        a.setAttribute("onclick", "return false;");
        a.removeAttribute("data-action");
      }
    });
  };

  const saveActionConfig = () => {
    const targetEl = actionConfigModal.element || activeElement?.element;
    if (!targetEl) return;
    const onBrowser = currentPageIdRef.current === BROWSER_PAGE_ID;

    // Browser page: the author chose "No action" or "Mark compromised".
    if (onBrowser) {
      if (actionConfigModal.actionType !== "training") {
        clearElementAction(targetEl);
        setActionConfigModal(CLOSED_ACTION_MODAL);
        synchroniseEditorValue();
        showToast("On Click cleared. This element no longer does anything.", "info");
        return;
      }
    }

    const action = onBrowser
      ? "training"
      : actionConfigModal.actionType === "page" && !supportsBrowserPage
        ? "landing"
        : actionConfigModal.actionType;
    const url =
      action === "training" ? COMPROMISE_LINK : action === "page" ? BROWSER_PAGE_LINK : PHISH_LINK;

    targetEl.setAttribute("data-action", action);
    targetEl.setAttribute("data-url", url);
    targetEl.removeAttribute("data-target-page");
    targetEl.onclick = null;

    let anchors = targetEl.tagName === "A" ? [targetEl] : [...targetEl.querySelectorAll("a")];
    if (!anchors.length) {
      // A shape, image or text box: its content goes inside a link.
      const link = document.createElement("a");
      link.setAttribute("style", "color:inherit;text-decoration:none;");
      while (targetEl.firstChild) link.appendChild(targetEl.firstChild);
      targetEl.appendChild(link);
      anchors = [link];
    }
    anchors.forEach((a) => {
      a.setAttribute("href", url);
      a.setAttribute("data-action", action);
      if (onBrowser) a.setAttribute("onclick", "return false;");
    });

    setActionConfigModal(CLOSED_ACTION_MODAL);
    synchroniseEditorValue();

    if (action === "page" && !pagesRef.current.some((p) => p.id === BROWSER_PAGE_ID)) {
      setShowNewPageModal(true);
      showToast("On Click saved. Now design the browser page it opens.", "info");
    } else if (onBrowser) {
      showToast("On Click saved: clicking this button marks the employee compromised.", "success");
    } else {
      showToast("On Click action saved.", "success");
    }
  };

  const editorIsEmpty = !layerItems(pageOf(editorRef.current)).length;

  const subtleToolbarBtnClass = `
    flex h-6 px-1 items-center gap-0.5 justify-center rounded border
    border-white/10 dark:border-black/10 bg-[#181A20] dark:bg-white
    text-slate-300 dark:text-slate-800 hover:bg-white/10 dark:hover:bg-slate-100
    hover:text-white dark:hover:text-black transition-colors cursor-pointer text-[8.5px] font-bold shadow-xs flex-shrink-0
    disabled:cursor-not-allowed disabled:opacity-40 select-none
  `;

  // Shared Toolbar Controls
  const renderSharedTools = () => (
    <>
      <button
        type="button"
        disabled={disabled || rawHtmlMode || !historyState.canUndo}
        onClick={handleUndo}
        className="p-1 rounded hover:bg-white/10 cursor-pointer text-slate-300 dark:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
        title={`Undo on the ${PAGE_LABELS[currentPageId].toLowerCase()} (Ctrl+Z)`}
      >
        <RotateCcw className="h-3 w-3" />
      </button>
      <button
        type="button"
        disabled={disabled || rawHtmlMode || !historyState.canRedo}
        onClick={handleRedo}
        className="p-1 rounded hover:bg-white/10 cursor-pointer text-slate-300 dark:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
        title={`Redo on the ${PAGE_LABELS[currentPageId].toLowerCase()} (Ctrl+Y)`}
      >
        <RotateCw className="h-3 w-3" />
      </button>

      <div className="h-3.5 w-px bg-white/20 flex-shrink-0" />

      <select
        value={["p", "h1", "h2", "h3", "h4", "blockquote", "pre"].includes(textFormat.block) ? `<${textFormat.block}>` : "<p>"}
        disabled={disabled || rawHtmlMode}
        onMouseDown={saveSelection}
        onChange={(event) => {
          runCommand("formatBlock", event.target.value);
          setTextFormat((prev) => ({ ...prev, block: event.target.value.replace(/[<>]/g, "") }));
        }}
        className="px-1 py-0.5 rounded bg-[#181A20] dark:bg-white text-white dark:text-black border-white/20 dark:border-black/20 text-[8.5px] font-bold border outline-none cursor-pointer flex-shrink-0 max-w-[58px]"
        title="Paragraph format"
      >
        <option value="<p>">Paragraph</option>
        <option value="<h1>">Heading 1</option>
        <option value="<h2>">Heading 2</option>
        <option value="<h3>">Heading 3</option>
        <option value="<h4>">Heading 4</option>
        <option value="<blockquote>">Quote</option>
        <option value="<pre>">Code</option>
      </select>

      <select
        value={
          FONT_OPTIONS.find((f) => firstFontFamily(f.value).toLowerCase() === textFormat.font.toLowerCase())?.value ||
          (textFormat.font ? "__current" : FONT_OPTIONS[0].value)
        }
        disabled={disabled || rawHtmlMode}
        onMouseDown={saveSelection}
        onChange={(event) => {
          if (event.target.value !== "__current") applyFontFamily(event.target.value);
        }}
        className="px-1 py-0.5 rounded bg-[#181A20] dark:bg-white text-white dark:text-black border-white/20 dark:border-black/20 text-[8.5px] font-bold border outline-none cursor-pointer max-w-[66px] flex-shrink-0"
        title="Font family"
      >
        {textFormat.font &&
          !FONT_OPTIONS.some((f) => firstFontFamily(f.value).toLowerCase() === textFormat.font.toLowerCase()) && (
            <option value="__current">{textFormat.font}</option>
          )}
        {FONT_OPTIONS.map((f) => (
          <option key={f.label} value={f.value}>
            {f.label}
          </option>
        ))}
      </select>

      <select
        value={textFormat.size ? String(textFormat.size) : ""}
        disabled={disabled || rawHtmlMode}
        onMouseDown={saveSelection}
        onChange={(event) => applyFontSizePx(Number(event.target.value))}
        className="px-1 py-0.5 rounded bg-[#181A20] dark:bg-white text-white dark:text-black border-white/20 dark:border-black/20 text-[8.5px] font-bold border outline-none cursor-pointer flex-shrink-0 max-w-[42px]"
        title="Font size (px). With no text selected, it sizes the whole line."
      >
        {textFormat.size && !FONT_SIZES_PX.includes(textFormat.size) && (
          <option value={String(textFormat.size)}>{textFormat.size}px</option>
        )}
        {!textFormat.size && <option value="">Size</option>}
        {FONT_SIZES_PX.map((px) => (
          <option key={px} value={String(px)}>
            {px}px
          </option>
        ))}
      </select>

      <button
        type="button"
        disabled={disabled || rawHtmlMode}
        onMouseDown={handleToolbarMouseDown}
        onClick={() => runCommand("bold")}
        className="p-1 rounded hover:bg-white/10 cursor-pointer bg-[#181A20] dark:bg-white text-white dark:text-black flex-shrink-0"
        title="Bold"
      >
        <Bold className="h-3 w-3" />
      </button>
      <button
        type="button"
        disabled={disabled || rawHtmlMode}
        onMouseDown={handleToolbarMouseDown}
        onClick={() => runCommand("italic")}
        className="p-1 rounded hover:bg-white/10 cursor-pointer bg-[#181A20] dark:bg-white text-white dark:text-black flex-shrink-0"
        title="Italic"
      >
        <Italic className="h-3 w-3" />
      </button>
      <button
        type="button"
        disabled={disabled || rawHtmlMode}
        onMouseDown={handleToolbarMouseDown}
        onClick={() => runCommand("underline")}
        className="p-1 rounded hover:bg-white/10 cursor-pointer bg-[#181A20] dark:bg-white text-white dark:text-black flex-shrink-0"
        title="Underline"
      >
        <Underline className="h-3 w-3" />
      </button>
      <button
        type="button"
        disabled={disabled || rawHtmlMode}
        onMouseDown={handleToolbarMouseDown}
        onClick={() => runCommand("strikeThrough")}
        className="p-1 rounded hover:bg-white/10 cursor-pointer bg-[#181A20] dark:bg-white text-white dark:text-black flex-shrink-0"
        title="Strikethrough"
      >
        <Strikethrough className="h-3 w-3" />
      </button>
      <button
        type="button"
        disabled={disabled || rawHtmlMode}
        onMouseDown={handleToolbarMouseDown}
        onClick={() => runCommand("removeFormat")}
        className="p-1 rounded hover:bg-white/10 cursor-pointer bg-[#181A20] dark:bg-white text-white dark:text-black text-slate-400 hover:text-white dark:hover:text-black flex-shrink-0"
        title="Clear formatting"
      >
        <RemoveFormatting className="h-3 w-3" />
      </button>

      {/* Text colour and highlight */}
      <div ref={textColorMenuRef} className="relative flex-shrink-0">
        <button
          type="button"
          disabled={disabled || rawHtmlMode}
          onMouseDown={(e) => {
            e.preventDefault();
            saveSelection();
          }}
          onClick={() => {
            setShowTextColorMenu((open) => !open);
            setShowLinkMenu(false);
          }}
          className="p-1 rounded hover:bg-white/10 cursor-pointer bg-[#181A20] dark:bg-white text-white dark:text-black flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
          title="Text colour and highlight"
        >
          <Baseline className="h-3 w-3" />
        </button>
        {showTextColorMenu && (
          <div
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            className="absolute left-0 top-full z-[9999] mt-1 flex w-48 flex-col gap-1.5 rounded-xl border border-white/20 bg-[#1A1C23] p-2 text-left shadow-2xl"
          >
            <span className="text-[7.5px] font-mono-tech font-bold uppercase text-slate-400">Text colour</span>
            <div className="grid grid-cols-6 gap-1">
              {[...PRESET_COLORS, "#0563C1", "#64748B"].map((c) => (
                <button
                  key={`fg-${c}`}
                  type="button"
                  onClick={() => applyTextColour(c)}
                  style={{ backgroundColor: c }}
                  className="h-4 w-4 rounded border border-white/30 hover:scale-110 transition-transform cursor-pointer"
                  title={c}
                />
              ))}
            </div>
            <label className="flex items-center justify-between text-[8.5px] text-slate-300">
              Custom
              <input
                type="color"
                onChange={(e) => applyTextColour(e.target.value)}
                className="h-4 w-6 cursor-pointer rounded border border-white/20 bg-transparent"
              />
            </label>
            <span className="border-t border-white/10 pt-1.5 text-[7.5px] font-mono-tech font-bold uppercase text-slate-400">
              Highlight
            </span>
            <div className="flex items-center gap-1">
              {["#FEF08A", "#BBF7D0", "#BFDBFE", "#FECACA", "#E9D5FF"].map((c) => (
                <button
                  key={`bg-${c}`}
                  type="button"
                  onClick={() => applyTextColour(c, { highlight: true })}
                  style={{ backgroundColor: c }}
                  className="h-4 w-4 rounded border border-white/30 hover:scale-110 transition-transform cursor-pointer"
                  title={`Highlight ${c}`}
                />
              ))}
              <input
                type="color"
                onChange={(e) => applyTextColour(e.target.value, { highlight: true })}
                className="h-4 w-5 cursor-pointer rounded border border-white/20 bg-transparent"
                title="Custom highlight"
              />
              <button
                type="button"
                onClick={() => applyTextColour("transparent", { highlight: true })}
                className="ml-auto rounded px-1 text-[8px] font-bold text-slate-300 hover:bg-white/10 cursor-pointer"
                title="Remove the highlight"
              >
                None
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Link the selected words */}
      <div ref={linkMenuRef} className="relative flex-shrink-0">
        <button
          type="button"
          disabled={disabled || rawHtmlMode}
          onMouseDown={(e) => {
            e.preventDefault();
            saveSelection();
          }}
          onClick={() => {
            setShowLinkMenu((open) => !open);
            setShowTextColorMenu(false);
          }}
          className="p-1 rounded hover:bg-white/10 cursor-pointer bg-[#181A20] dark:bg-white text-white dark:text-black flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
          title="Make the selected words a link (Ctrl+K)"
        >
          <LinkIcon className="h-3 w-3" />
        </button>
        {showLinkMenu && (
          <div
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            className="absolute left-0 top-full z-[9999] mt-1 flex w-56 flex-col gap-0.5 rounded-xl border border-white/20 bg-[#1A1C23] p-1 text-left shadow-2xl"
          >
            <span className="px-2 py-0.5 font-mono-tech text-[7.5px] font-bold uppercase text-slate-400">
              Selected words open...
            </span>
            {(currentPageId === BROWSER_PAGE_ID
              ? [["training", "Mark compromised", "Records a compromise, then shows the landing page"]]
              : hasBrowserPage
                ? // A browser page exists, so an email link must open it.
                  [["page", "Browser page (page 2)", "Records the click, then opens the browser page"]]
                : [
                    ["landing", "Landing page", "Records the click, then shows the landing page"],
                    ...(supportsBrowserPage
                      ? [["page", "Browser page (page 2)", "Records the click, then opens the browser page"]]
                      : []),
                  ]
            ).map(([action, label, desc]) => (
              <button
                key={action}
                type="button"
                onClick={() => linkSelectedText(action)}
                className="flex flex-col gap-0.5 rounded-lg p-1.5 px-2 text-left hover:bg-white/10 transition-colors cursor-pointer"
              >
                <span className="text-[9px] font-bold text-white">{label}</span>
                <span className="text-[7.5px] text-slate-400">{desc}</span>
              </button>
            ))}
            <button
              type="button"
              onClick={unlinkSelectedText}
              className="mt-0.5 flex items-center gap-1.5 border-t border-white/10 rounded-lg p-1.5 px-2 text-left text-[9px] font-bold text-red-300 hover:bg-white/10 cursor-pointer"
            >
              <Unlink className="h-3 w-3" />
              Remove link
            </button>
          </div>
        )}
      </div>

      <button
        type="button"
        disabled={disabled || rawHtmlMode}
        onMouseDown={handleToolbarMouseDown}
        onClick={() => runCommand("insertUnorderedList")}
        className="p-1 rounded hover:bg-white/10 cursor-pointer bg-[#181A20] dark:bg-white text-white dark:text-black flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
        title="Bulleted list"
      >
        <ListIcon className="h-3 w-3" />
      </button>
      <button
        type="button"
        disabled={disabled || rawHtmlMode}
        onMouseDown={handleToolbarMouseDown}
        onClick={() => runCommand("insertOrderedList")}
        className="p-1 rounded hover:bg-white/10 cursor-pointer bg-[#181A20] dark:bg-white text-white dark:text-black flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
        title="Numbered list"
      >
        <ListOrdered className="h-3 w-3" />
      </button>
      <button
        type="button"
        disabled={disabled || rawHtmlMode}
        onMouseDown={handleToolbarMouseDown}
        onClick={() => runCommand("outdent")}
        className="p-1 rounded hover:bg-white/10 cursor-pointer bg-[#181A20] dark:bg-white text-white dark:text-black flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
        title="Decrease indent"
      >
        <IndentDecrease className="h-3 w-3" />
      </button>
      <button
        type="button"
        disabled={disabled || rawHtmlMode}
        onMouseDown={handleToolbarMouseDown}
        onClick={() => runCommand("indent")}
        className="p-1 rounded hover:bg-white/10 cursor-pointer bg-[#181A20] dark:bg-white text-white dark:text-black flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
        title="Increase indent"
      >
        <IndentIncrease className="h-3 w-3" />
      </button>

      <div className="h-3.5 w-px bg-white/20 flex-shrink-0" />

      <button
        type="button"
        disabled={disabled || rawHtmlMode}
        onMouseDown={handleToolbarMouseDown}
        onClick={() => alignText("left")}
        className="p-1 rounded hover:bg-white/10 cursor-pointer bg-[#181A20] dark:bg-white text-white dark:text-black flex-shrink-0"
        title="Align left"
      >
        <AlignLeft className="h-3 w-3" />
      </button>
      <button
        type="button"
        disabled={disabled || rawHtmlMode}
        onMouseDown={handleToolbarMouseDown}
        onClick={() => alignText("center")}
        className="p-1 rounded hover:bg-white/10 cursor-pointer bg-[#181A20] dark:bg-white text-white dark:text-black flex-shrink-0"
        title="Align center"
      >
        <AlignCenter className="h-3 w-3" />
      </button>
      <button
        type="button"
        disabled={disabled || rawHtmlMode}
        onMouseDown={handleToolbarMouseDown}
        onClick={() => alignText("right")}
        className="p-1 rounded hover:bg-white/10 cursor-pointer bg-[#181A20] dark:bg-white text-white dark:text-black flex-shrink-0"
        title="Align right"
      >
        <AlignRight className="h-3 w-3" />
      </button>

      <div className="h-3.5 w-px bg-white/20 flex-shrink-0" />

      <button
        type="button"
        disabled={disabled || rawHtmlMode}
        onMouseDown={handleToolbarMouseDown}
        onClick={() => valignText("top")}
        className="p-1 rounded hover:bg-white/10 cursor-pointer bg-[#181A20] dark:bg-white text-white dark:text-black flex-shrink-0"
        title="Text to the top of its box"
      >
        <AlignVerticalJustifyStart className="h-3 w-3" />
      </button>
      <button
        type="button"
        disabled={disabled || rawHtmlMode}
        onMouseDown={handleToolbarMouseDown}
        onClick={() => valignText("middle")}
        className="p-1 rounded hover:bg-white/10 cursor-pointer bg-[#181A20] dark:bg-white text-white dark:text-black flex-shrink-0"
        title="Text to the middle of its box"
      >
        <AlignVerticalJustifyCenter className="h-3 w-3" />
      </button>
      <button
        type="button"
        disabled={disabled || rawHtmlMode}
        onMouseDown={handleToolbarMouseDown}
        onClick={() => valignText("bottom")}
        className="p-1 rounded hover:bg-white/10 cursor-pointer bg-[#181A20] dark:bg-white text-white dark:text-black flex-shrink-0"
        title="Text to the bottom of its box"
      >
        <AlignVerticalJustifyEnd className="h-3 w-3" />
      </button>

      <div className="h-3.5 w-px bg-white/20 flex-shrink-0" />

      {/* Insert Text */}
      <button
        type="button"
        disabled={disabled || rawHtmlMode}
        onClick={insertTextBox}
        className={subtleToolbarBtnClass}
        title="Insert Text Box"
      >
        <Type className="h-3 w-3 text-slate-400 dark:text-slate-600" />
        <span>Text</span>
      </button>

      {/* Insert Button */}
      <div ref={buttonMenuRef} className="relative flex-shrink-0">
        <button
          type="button"
          disabled={disabled || rawHtmlMode}
          onClick={() => {
            setShowButtonMenu((prev) => !prev);
            setShowShapeMenu(false);
            setShowElementsMenu(false);
            setShowBodyMenu(false);
            setShowCanvasBgMenu(false);
          }}
          className={subtleToolbarBtnClass}
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
      <div ref={shapeMenuRef} className="relative flex-shrink-0">
        <button
          type="button"
          disabled={disabled || rawHtmlMode}
          onClick={() => {
            setShowShapeMenu((prev) => !prev);
            setShowButtonMenu(false);
            setShowElementsMenu(false);
            setShowBodyMenu(false);
            setShowCanvasBgMenu(false);
          }}
          className={subtleToolbarBtnClass}
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

      {/* Elements (Pre-Built Phishing Banner & Lure Blocks) */}
      <div ref={elementsMenuRef} className="relative flex-shrink-0">
        <button
          type="button"
          disabled={disabled || rawHtmlMode}
          onClick={() => {
            setShowElementsMenu((prev) => !prev);
            setShowShapeMenu(false);
            setShowButtonMenu(false);
            setShowBodyMenu(false);
            setShowCanvasBgMenu(false);
          }}
          className={subtleToolbarBtnClass}
          title="Insert Pre-Built Phishing Banner & Lure Blocks"
        >
          <ShieldAlert className="h-3 w-3 text-amber-400" />
          <span>Elements</span>
        </button>
        {showElementsMenu && (
          <div className="absolute left-0 top-full z-[9999] mt-1 flex w-60 flex-col gap-0.5 rounded-xl border border-white/20 bg-[#1A1C23] p-1 text-left shadow-2xl vshield-canvas-scroll max-h-64 overflow-y-auto">
            <span className="px-2 py-0.5 font-mono-tech text-[7.5px] font-bold uppercase text-slate-400">
              Phishing Lure Components
            </span>
            {PHISHING_ELEMENTS.map((el) => (
              <button
                key={el.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  insertPhishingElement(el.id);
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

      {/* Email Body Library Dropdown */}
      <div ref={bodyMenuRef} className="relative flex-shrink-0">
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
          className={subtleToolbarBtnClass}
          title={
            currentPageId === BROWSER_PAGE_ID
              ? "Use a sign-in or 2FA screen for the browser page"
              : "Use an email body from the template library"
          }
        >
          <FileText className="h-3 w-3 text-slate-400 dark:text-slate-600" />
          <span>Templates</span>
          <ChevronDown className="h-2.5 w-2.5" />
        </button>
        {showBodyMenu && (
          <div
            role="menu"
            aria-label="Email bodies"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className="absolute left-0 top-full mt-1 w-64 max-h-64 overflow-y-auto vshield-canvas-scroll rounded-xl bg-[#1A1C23] border border-white/20 p-1 shadow-2xl flex flex-col gap-0.5 text-left z-[9999]"
          >
            <span className="text-[7.5px] font-mono-tech uppercase text-slate-400 px-2 py-0.5 font-bold">
              {currentPageId === BROWSER_PAGE_ID ? "Browser Page Templates" : "Email Body Templates"}
            </span>
            {(currentPageId === BROWSER_PAGE_ID ? browserPageTemplates : emailBodyTemplates).map((option, index, list) => {
              const heading =
                option.section && option.section !== list[index - 1]?.section ? (
                  <span
                    key={`section-${option.section}`}
                    className="mt-1 px-2 pt-1 text-[7.5px] font-mono-tech font-bold uppercase text-indigo-300"
                  >
                    {option.section}
                  </span>
                ) : null;
              const inEditor = isSameBody(option.html, internalHtmlRef.current);
              return [
                heading,
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
                    chooseEmailBody(option);
                  }}
                  className={`w-full p-2 rounded-lg text-left flex flex-col gap-0.5 cursor-pointer transition-colors ${
                    inEditor ? "bg-white/15 border border-white/20" : "hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5 pointer-events-none">
                    <span className="flex items-center gap-1.5 min-w-0">
                      {inEditor && <Check className="w-3 h-3 text-[#8ED973] flex-shrink-0" />}
                      <span className="text-[10px] font-bold text-white truncate">{option.name}</span>
                    </span>
                  </div>
                  <span className="text-[8px] text-slate-400 truncate pointer-events-none">{option.snippet}</span>
                </button>,
              ];
            })}
          </div>
        )}
      </div>

      {/* Canvas Background Color */}
      <div ref={canvasBgRef} className="relative flex-shrink-0">
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
          className="flex h-6 px-1 items-center justify-center rounded border border-white/10 dark:border-black/10 bg-[#181A20] dark:bg-white text-slate-300 dark:text-slate-700 hover:bg-white/10 dark:hover:bg-slate-100 cursor-pointer"
          title="Change Canvas Background Color"
        >
          <span className="text-[8.5px] font-bold border border-current px-0.5 rounded leading-none">BG</span>
        </button>
        {showCanvasBgMenu && (
          <div className="absolute left-0 top-full z-[9999] mt-1 flex w-44 flex-col gap-1.5 rounded-xl border border-white/20 bg-[#1A1C23] p-2 text-left shadow-2xl">
            <span className="text-[8px] font-bold uppercase text-slate-400">Canvas Background</span>
            <div className="grid grid-cols-5 gap-1">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setPageBackground(c);
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
                value={canvasBgColor}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => setPageBackground(e.target.value)}
                className="h-4.5 w-6 cursor-pointer rounded border border-white/20 bg-transparent"
              />
            </div>
          </div>
        )}
      </div>

      {/* Page size (as Power BI's canvas settings) */}
      <div ref={pageSizeMenuRef} className="relative flex-shrink-0">
        <button
          type="button"
          disabled={disabled || rawHtmlMode}
          onClick={() => setShowPageSizeMenu((open) => !open)}
          className={subtleToolbarBtnClass}
          title="Page size: width, and the least height"
        >
          <Maximize2 className="h-3 w-3 text-slate-400 dark:text-slate-600" />
          <span>{pageWidthPx}px</span>
          <ChevronDown className="h-2.5 w-2.5" />
        </button>
        {showPageSizeMenu && (
          <div
            onMouseDown={(e) => e.stopPropagation()}
            className="absolute left-0 top-full z-[9999] mt-1 flex w-64 flex-col gap-1 rounded-xl border border-white/20 bg-[#1A1C23] p-2 text-left shadow-2xl"
          >
            <span className="text-[7.5px] font-mono-tech font-bold uppercase text-slate-400">Page width</span>
            {PAGE_WIDTH_PRESETS[currentPageId === BROWSER_PAGE_ID ? "browser" : "email"].map(([w, label]) => (
              <button
                key={w}
                type="button"
                onClick={() => setPageWidth(w)}
                className={`flex items-center justify-between rounded-lg px-2 py-1 text-left text-[9px] font-semibold cursor-pointer ${
                  pageWidthPx === w ? "bg-white/15 text-white" : "text-slate-200 hover:bg-white/10"
                }`}
              >
                <span>{label}</span>
                {pageWidthPx === w && <Check className="h-3 w-3 text-[#8ED973]" />}
              </button>
            ))}
            <label className="flex items-center justify-between gap-2 border-t border-white/10 pt-1.5 text-[8.5px] text-slate-300">
              Custom width (px)
              <input
                key={`w-${pageWidthPx}`}
                type="number"
                defaultValue={pageWidthPx}
                min={PAGE_SIZE_LIMITS.minWidth}
                max={PAGE_SIZE_LIMITS.maxWidth}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === "Enter") e.currentTarget.blur();
                }}
                onBlur={(e) => {
                  if (Number(e.target.value) !== pageWidthPx) setPageWidth(e.target.value);
                }}
                className="w-16 rounded border border-white/20 bg-black/60 px-1 py-0.5 text-[8.5px] text-white outline-none"
              />
            </label>
            <label className="flex items-center justify-between gap-2 text-[8.5px] text-slate-300">
              Least height (px)
              <input
                key={`h-${pageHeightPx}`}
                type="number"
                defaultValue={pageHeightPx}
                min={PAGE_SIZE_LIMITS.minHeight}
                max={PAGE_SIZE_LIMITS.maxHeight}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === "Enter") e.currentTarget.blur();
                }}
                onBlur={(e) => {
                  if (Number(e.target.value) !== pageHeightPx) setPageMinHeight(e.target.value);
                }}
                className="w-16 rounded border border-white/20 bg-black/60 px-1 py-0.5 text-[8.5px] text-white outline-none"
              />
            </label>
            <span className="text-[7.5px] leading-snug text-slate-500">
              The page also grows on its own as you add or drag items lower, and its bottom edge can be dragged down.
            </span>
          </div>
        )}
      </div>

      {/* Gridlines */}
      <button
        type="button"
        disabled={disabled || rawHtmlMode}
        onClick={() => setShowGridlines((prev) => !prev)}
        className={`h-6 w-6 flex items-center justify-center rounded cursor-pointer ${showGridlines ? "bg-white/25 text-emerald-400" : "text-slate-300 dark:text-slate-700"}`}
        title="Toggle Gridlines"
      >
        <Grid className="h-3 w-3" />
      </button>

      {/* Erase All Button (Clears ONLY Active Page) */}
      <button
        type="button"
        disabled={disabled || rawHtmlMode}
        onClick={handleClearAllCanvas}
        className="flex h-6 px-1 items-center gap-0.5 justify-center rounded border border-white/10 dark:border-black/10 bg-[#181A20] dark:bg-white text-slate-300 dark:text-slate-800 hover:bg-red-500/10 hover:text-red-400 dark:hover:bg-red-50 dark:hover:text-red-600 hover:border-red-500/20 transition-colors cursor-pointer text-[8.5px] font-bold shadow-xs flex-shrink-0"
        title="Erase Current Active Page"
      >
        <Eraser className="h-3 w-3 text-slate-400 dark:text-slate-600" />
        <span>Erase</span>
      </button>

      <button
        type="button"
        disabled={disabled || rawHtmlMode}
        onClick={() => imageInputRef.current?.click()}
        className={`h-6 w-6 flex items-center justify-center rounded text-blue-400 hover:bg-white/10 flex-shrink-0 cursor-pointer ${pictureBusy === "toolbar" ? "animate-pulse" : ""}`}
        title="Upload a picture (PNG, JPEG, GIF or WebP, up to 2 MB)"
      >
        <ImageIcon className="h-3 w-3" />
      </button>

      {/* Dynamic Placeholder */}
      <div ref={fxRef} className="relative flex-shrink-0">
        <button
          type="button"
          disabled={disabled || rawHtmlMode}
          onMouseDown={(event) => {
            event.preventDefault();
            saveSelection();
          }}
          onClick={() => setShowFxMenu((prev) => !prev)}
          className="flex h-6 items-center gap-0.5 rounded-xl bg-white px-1 text-[8.5px] font-bold text-black shadow-xs cursor-pointer flex-shrink-0"
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

  // Preview a page as the employee meets it: the email in a mail client
  // (inbox reading pane or its own window), the browser page full screen.
  const openPreview = (pageId = currentPageIdRef.current) => {
    const html =
      pageId === currentPageIdRef.current
        ? currentPageHtml()
        : pagesRef.current.find((p) => p.id === pageId)?.html || "";
    storePages(pagesRef.current.map((p) => (p.id === pageId ? { ...p, html } : p)));
    setShowPagesMenu(false);
    if (pageId === BROWSER_PAGE_ID) setShowBrowserPreview(true);
    else setEmailPreview({ open: true, html });
  };

  const renderPreviewButton = () => (
    <button
      type="button"
      onClick={() => openPreview()}
      className={subtleToolbarBtnClass}
      title={
        currentPageId === BROWSER_PAGE_ID
          ? "Preview the browser page full screen"
          : "Preview the email as the employee sees it in their inbox"
      }
    >
      <Eye className="h-3 w-3 text-slate-400 dark:text-slate-600" />
      <span>Preview</span>
    </button>
  );

  // The simulation's pages: 1 the email, 2 the optional browser page.
  const renderPagesMenu = () => {
    const current = pages.find((p) => p.id === currentPageId);
    return (
      <div ref={pagesMenuRef} className="relative flex-shrink-0">
        <button
          type="button"
          onClick={() => setShowPagesMenu((prev) => !prev)}
          className={`flex h-6 items-center gap-0.5 rounded border px-1 text-[8.5px] font-bold transition-colors cursor-pointer shadow-xs flex-shrink-0 ${
            currentPageId === BROWSER_PAGE_ID
              ? "border-amber-400/40 bg-amber-500/30 text-amber-200 hover:bg-amber-500 hover:text-white"
              : "border-indigo-400/30 bg-indigo-600/30 text-indigo-300 hover:bg-indigo-600 hover:text-white"
          }`}
          title="Simulation pages: the email, and an optional browser page it opens"
        >
          {currentPageId === BROWSER_PAGE_ID ? <Globe className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
          <span>
            {current?.name || PAGE_LABELS[currentPageId]} ({currentPageId}/{pages.length})
          </span>
          <ChevronDown className="h-2 w-2" />
        </button>
        {showPagesMenu && (
          <div className="absolute right-0 top-full mt-1 w-60 rounded-xl border border-white/20 bg-[#1A1C23] p-1.5 shadow-2xl z-[9999] flex flex-col gap-1">
            <span className="text-[7.5px] font-mono-tech uppercase text-slate-400 px-1 font-bold">
              Simulation pages (max {MAX_PAGES})
            </span>
            {pages.map((p) => (
              <div
                key={p.id}
                onClick={() => switchToPage(p.id)}
                className={`flex items-center justify-between px-2 py-1.5 rounded-lg text-left text-[9px] font-bold cursor-pointer transition-colors ${
                  p.id === currentPageId ? "bg-indigo-600 text-white" : "text-slate-300 hover:bg-white/10"
                }`}
              >
                <span className="flex flex-col min-w-0 flex-1 pr-1">
                  <span className="truncate">
                    {p.id}. {p.name}
                  </span>
                  <span className="text-[7.5px] font-medium opacity-70 truncate">
                    {p.id === EMAIL_PAGE_ID
                      ? "Sent to the employee; a click is recorded"
                      : "Opens in their browser; submitting marks compromised"}
                  </span>
                </span>
                <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  {p.id === currentPageId && <Check className="w-3 h-3 text-white" />}
                  <button
                    type="button"
                    onClick={() => openPreview(p.id)}
                    className="p-1 hover:bg-white/15 text-slate-300 hover:text-white rounded cursor-pointer"
                    title={p.id === BROWSER_PAGE_ID ? "Preview the browser page full screen" : "Preview the email in an inbox"}
                  >
                    <Eye className="w-2.5 h-2.5" />
                  </button>
                  {p.id === BROWSER_PAGE_ID && (
                    <>
                      <button
                        type="button"
                        onClick={deleteBrowserPage}
                        className="p-1 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded cursor-pointer"
                        title="Delete the browser page"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}

            {!hasBrowserPage && (
              <button
                type="button"
                onClick={() => {
                  setShowPagesMenu(false);
                  setShowNewPageModal(true);
                }}
                className="flex items-center gap-1 mt-1 pt-1 border-t border-white/10 px-2 py-1 text-[8.5px] font-bold text-emerald-400 hover:bg-white/10 rounded cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Add browser page (2/{MAX_PAGES})</span>
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  // The ribbon, the same in the editor and full screen. Its tools wrap onto
  // a second row when the width runs out, so nothing is cut off or slides
  // under the page controls on the right, and nothing needs scrolling. Rows
  // align to the top, so the controls on the right stay level with row one.
  // Every element on this page with an On-Click set: the compromise button on
  // the browser page, or the phishing elements on the email. The outermost one
  // is kept when a configured anchor sits inside a configured item.
  const ACTION_LABELS = {
    training: "Mark compromised",
    landing: "Landing page (Oops)",
    page: "Open browser page",
  };
  const configuredActionItems = () => {
    const page = pageEl();
    if (!page) return [];
    const wanted = pageKind() === "browser" ? ["training"] : ["landing", "page"];
    const all = [...page.querySelectorAll("[data-action]")].filter((el) =>
      wanted.includes(el.getAttribute("data-action")),
    );
    return all.filter((el) => !all.some((other) => other !== el && other.contains(el)));
  };

  const selectActionItem = (el) => {
    const item = el.classList.contains(ITEM_CLASS) ? el : el.closest(`.${ITEM_CLASS}`);
    if (!item) return;
    setShowOnclicksMenu(false);
    selectCanvasItem(item);
    item.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const renderOnclicksMenu = () => {
    if (rawHtmlMode) return null;
    const items = configuredActionItems();
    const onBrowser = currentPageId === BROWSER_PAGE_ID;
    return (
      <div ref={onclicksMenuRef} className="relative flex-shrink-0">
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            setShowOnclicksMenu((open) => !open);
            setShowPageSizeMenu(false);
          }}
          className={subtleToolbarBtnClass}
          title="Every element on this page with an On-Click action set"
        >
          <MousePointerClick className={`h-3 w-3 ${items.length ? "text-emerald-400" : "text-slate-400 dark:text-slate-600"}`} />
          <span>On-Clicks</span>
          {items.length > 0 && (
            <span className="ml-0.5 rounded-full bg-emerald-600 px-1 text-[8px] font-bold text-white">{items.length}</span>
          )}
          <ChevronDown className="h-2.5 w-2.5" />
        </button>
        {showOnclicksMenu && (
          <div
            onMouseDown={(e) => e.stopPropagation()}
            className="absolute right-0 top-full z-[9999] mt-1 flex w-72 flex-col gap-1 rounded-xl border border-white/20 bg-[#1A1C23] p-2 text-left shadow-2xl"
          >
            <span className="px-1 text-[7.5px] font-mono-tech font-bold uppercase text-slate-400">
              Configured On-Clicks · {onBrowser ? "Browser page" : "Email"}
            </span>
            {items.length === 0 ? (
              <p className="px-1 py-2 text-[9.5px] leading-snug text-slate-400">
                {onBrowser
                  ? "No On-Click set yet. Select the submit button (Next, Submit, Confirm...) and set its On-Click to \"Mark compromised\"."
                  : "No On-Click set yet. Select the phishing button or a link and set its On-Click action."}
              </p>
            ) : (
              items.map((el, index) => {
                const action = el.getAttribute("data-action");
                return (
                  <div
                    key={itemKey(el)}
                    className="flex items-center justify-between gap-1 rounded-lg border border-white/10 bg-white/5 p-1.5 hover:bg-white/10"
                  >
                    <button
                      type="button"
                      onClick={() => selectActionItem(el)}
                      className="flex min-w-0 flex-1 flex-col text-left cursor-pointer"
                      title="Select this element on the canvas"
                    >
                      <span className="truncate text-[10px] font-bold text-white">
                        {index + 1}. {itemName(el)}
                      </span>
                      <span className="flex items-center gap-1 text-[8.5px] text-emerald-300">
                        <ShieldAlert className="h-2.5 w-2.5" />
                        {ACTION_LABELS[action] || action}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        clearElementAction(el.classList.contains(ITEM_CLASS) ? el : el.closest(`.${ITEM_CLASS}`) || el);
                        synchroniseEditorValue();
                        setDragFrame((n) => n + 1);
                        showToast("On Click removed.", "info");
                      }}
                      className="flex-shrink-0 rounded p-1 text-slate-400 hover:bg-red-500/20 hover:text-red-300 cursor-pointer"
                      title="Remove this On-Click"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    );
  };

  const renderToolbar = () => (
    <div className="relative z-30 flex w-full min-h-[34px] flex-shrink-0 flex-wrap items-start gap-x-1 gap-y-1 rounded-t-2xl border-b border-white/10 dark:border-black/10 bg-[#202127] dark:bg-white px-1.5 py-1 text-white select-none">
      {/* The picture pickers live here, not with the formatting tools, because
          those are hidden in HTML view and its "Upload picture" buttons need
          the replace picker to exist. */}
      <input
        type="file"
        ref={imageInputRef}
        accept="image/png, image/jpeg, image/gif, image/webp"
        onChange={handleImageUpload}
        className="hidden"
      />
      <input
        type="file"
        ref={replaceInputRef}
        accept="image/png, image/jpeg, image/gif, image/webp"
        onChange={handlePictureReplaceFile}
        className="hidden"
      />

      {/* Each row of tools is one button high (h-6); the page controls on
          the right sit on the first row, level with the tools beside them.
          In HTML view the formatting tools do nothing, so they are hidden
          and only a label is shown in their place. */}
      <div className="flex min-w-0 flex-1 flex-wrap content-start items-center gap-[3px]">
        {rawHtmlMode ? (
          <span className="flex h-6 items-center gap-1 px-1 text-[8.5px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            <Code className="h-3 w-3" />
            Editing HTML source
          </span>
        ) : (
          renderSharedTools()
        )}
      </div>

      <div className="ml-auto flex h-6 flex-shrink-0 items-center gap-[3px] self-start">
        {renderOnclicksMenu()}
        {supportsBrowserPage && renderPagesMenu()}
        {renderPreviewButton()}

        <button
          type="button"
          disabled={disabled}
          onClick={handleToggleCodeMode}
          className={
            rawHtmlMode
              ? "flex h-6 px-1 items-center gap-0.5 justify-center rounded border border-red-600 bg-red-600 text-white text-[8.5px] font-bold shadow-xs flex-shrink-0 cursor-pointer select-none"
              : subtleToolbarBtnClass
          }
          title="Toggle HTML source code"
        >
          <Code className={`h-3 w-3 ${rawHtmlMode ? "" : "text-slate-400 dark:text-slate-600"}`} />
          <span>{rawHtmlMode ? "Visual" : "HTML"}</span>
        </button>

        <button
          type="button"
          onClick={handleToggleExpand}
          className="p-1 rounded hover:bg-white/10 cursor-pointer text-slate-300 dark:text-slate-800 flex-shrink-0"
          title={isExpanded ? "Minimize editor" : "Expand editor"}
        >
          {isExpanded ? (
            <Minimize2 className="h-3 w-3" />
          ) : (
            <Maximize2 className="h-3 w-3" />
          )}
        </button>

        {isExpanded && (
          <button
            type="button"
            onClick={() => setIsExpanded(false)}
            className="p-1 rounded hover:bg-white/10 cursor-pointer text-slate-300 dark:text-slate-800 flex-shrink-0"
            title="Close full-screen editor"
          >
            <X className="h-3 w-3" />
          </button>
        )}

        <button
          type="button"
          disabled={disabled || rawHtmlMode}
          onClick={() => setShowShortcuts((open) => !open)}
          className={`p-1 rounded cursor-pointer flex-shrink-0 disabled:cursor-not-allowed disabled:opacity-40 ${
            showShortcuts ? "bg-white/20 text-white" : "text-slate-300 dark:text-slate-800 hover:bg-white/10"
          }`}
          title="Keyboard shortcuts (?)"
          aria-pressed={showShortcuts}
        >
          <Keyboard className="h-3 w-3" />
        </button>

        {/* Items pane: every item on the page, to select, reorder and group. */}
        <button
          type="button"
          disabled={disabled || rawHtmlMode}
          onClick={() => setShowItemsPane((open) => !open)}
          className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded border transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${
            showItemsPane
              ? "border-blue-500 bg-blue-600 text-white"
              : "border-white/15 dark:border-black/15 bg-[#181A20] dark:bg-white text-slate-200 dark:text-slate-800 hover:bg-white/15 dark:hover:bg-slate-100"
          }`}
          title={showItemsPane ? "Close the Items pane" : "Open the Items pane: reorder, select and group items"}
          aria-pressed={showItemsPane}
        >
          <Menu className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );

  // Floating text selection color palette
  const renderFloatingTextSelectionColorBar = () => {
    if (!selectionColorMenu.visible) return null;

    return (
      <div
        style={{
          position: "absolute",
          top: `${selectionColorMenu.top}px`,
          left: `${selectionColorMenu.left}px`,
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
            key={col}
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

  // ---------------------------------------------------------------
  // Selection pane (as Power BI's): every item in layer order, front first;
  // groups open to their parts. Select, show / hide, rename, and drag to
  // change the layer order or to move an item into or out of a group.
  // ---------------------------------------------------------------
  const ITEM_TYPE_LABELS = {
    group: "Group",
    card: "Card",
    text: "Text",
    button: "Button",
    input: "Field",
    image: "Picture",
    shape: "Shape",
    element: "Element",
  };

  const itemKey = (el) => {
    if (!itemKeysRef.current.has(el)) {
      itemKeyCountRef.current += 1;
      itemKeysRef.current.set(el, `item-${itemKeyCountRef.current}`);
    }
    return itemKeysRef.current.get(el);
  };

  const itemType = (el) => ITEM_TYPE_LABELS[el.getAttribute("data-type")] || "Element";

  const itemName = (el) => {
    const named = el.getAttribute("data-item-name");
    if (named) return named;
    const text = (el.textContent || "").replace(/\s+/g, " ").trim();
    const alt = el.querySelector?.("img")?.getAttribute("alt") || "";
    const label = isGroupEl(el) ? "" : text || alt;
    return label ? (label.length > 30 ? `${label.slice(0, 28)}...` : label) : itemType(el);
  };

  const saveItemName = () => {
    if (!renamingItem) return;
    const name = renamingItem.name.trim();
    if (name) renamingItem.el.setAttribute("data-item-name", name);
    else renamingItem.el.removeAttribute("data-item-name");
    setRenamingItem(null);
    synchroniseEditorValue();
  };

  // A row clicked: select it; Ctrl/Shift+click adds it (items side by side only).
  const selectFromPane = (el, e) => {
    stopEditing();
    if (e.ctrlKey || e.metaKey || e.shiftKey) {
      const current = selectedItems();
      const next = current.includes(el)
        ? current.filter((x) => x !== el)
        : current.every((x) => x.parentElement === el.parentElement)
          ? [...current, el]
          : [el];
      selectItems(next);
      return;
    }
    if (el.getAttribute("data-hidden") === "true") {
      showToast("That item is hidden. Click its eye to show it.", "info");
      return;
    }
    selectCanvasItem(el);
    el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  // Drop a dragged row on another: in front of it (upper half) or behind it
  // (lower half), in its page or group. A group can't go into a group.
  const dropPaneItem = (target, inFront) => {
    const moved = draggedItemRef.current;
    draggedItemRef.current = null;
    setDropTargetEl(null);
    if (!moved || !target || moved === target || moved.contains(target)) return;
    const toParent = target.parentElement;
    if (isGroupEl(toParent) && isGroupEl(moved)) {
      showToast("A group can't go inside another group.", "warning", "Not Moved");
      return;
    }
    const onPage = pageRectOf(moved);
    const fromParent = moved.parentElement;
    toParent.insertBefore(moved, inFront ? target.nextSibling : target);
    // Same place on the page, now measured from its new box.
    const at = isGroupEl(toParent) ? readRect(toParent) : { left: 0, top: 0 };
    writeRect(moved, { left: onPage.left - at.left, top: onPage.top - at.top }, { height: false });
    renumberLayers(toParent);
    if (fromParent !== toParent) renumberLayers(fromParent);
    synchroniseEditorValue();
    selectCanvasItem(moved);
    showToast(
      fromParent !== toParent
        ? isGroupEl(toParent)
          ? `Moved ${itemName(moved)} into ${itemName(toParent)}.`
          : `Moved ${itemName(moved)} out of its group.`
        : `${itemName(moved)} is now ${inFront ? "in front of" : "behind"} ${itemName(target)}.`,
      "success",
    );
  };

  const SHORTCUTS = [
    ["Select an item", "Click it"],
    ["Select a part of a group", "Double-click it"],
    ["Type in a text item", "Double-click it, or Enter"],
    ["Select several", "Ctrl+click, or drag a box on empty canvas"],
    ["Select everything", "Ctrl+A"],
    ["Group / ungroup", "Ctrl+G / Ctrl+Shift+G"],
    ["One layer forward / back", "Ctrl+] / Ctrl+["],
    ["To the front / back", "Ctrl+Shift+] / Ctrl+Shift+["],
    ["Move", "Drag, or arrow keys (Shift: 10px)"],
    ["Place freely (no snapping)", "Hold Alt while dragging"],
    ["Keep proportions", "Hold Shift while resizing"],
    ["Copy / cut / paste", "Ctrl+C / Ctrl+X / Ctrl+V"],
    ["Duplicate", "Ctrl+D"],
    ["Delete", "Delete or Backspace"],
    ["Link the highlighted words", "Ctrl+K"],
    ["Undo / redo", "Ctrl+Z / Ctrl+Y"],
    ["Stop typing, up a level, deselect", "Esc"],
  ];

  const renderShortcuts = () => {
    if (!showShortcuts || rawHtmlMode) return null;
    return (
      <div
        data-floating-control="true"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        className="absolute right-2 top-2 z-[60] w-80 rounded-xl border border-white/20 bg-[#1A1C23] p-2 text-white shadow-2xl select-none"
        role="dialog"
        aria-label="Keyboard shortcuts"
      >
        <div className="mb-1 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[9.5px] font-bold uppercase tracking-wider">
            <Keyboard className="h-3.5 w-3.5 text-blue-400" />
            Shortcuts
          </span>
          <button
            type="button"
            onClick={() => setShowShortcuts(false)}
            className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white cursor-pointer"
            aria-label="Close shortcuts"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
        <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-[8.5px]">
          {SHORTCUTS.map(([what, keys]) => (
            <div key={what} className="contents">
              <dt className="text-slate-300">{what}</dt>
              <dd className="text-right font-mono-tech text-slate-100">{keys}</dd>
            </div>
          ))}
        </dl>
      </div>
    );
  };

  const paneBtn =
    "flex h-5 items-center gap-1 rounded border border-white/10 bg-white/5 px-1.5 text-[8.5px] font-bold text-slate-200 hover:bg-white/15 hover:text-white cursor-pointer disabled:cursor-not-allowed disabled:opacity-35";

  const renderSelectionPane = () => {
    if (!showItemsPane || rawHtmlMode) return null;
    const page = pageEl();
    const selected = selectedItems();
    const top = page ? layerItems(page).reverse() : [];
    const canGroup = selected.length >= 2 && selected.every((el) => el.parentElement === page && !isGroupEl(el));
    const canUngroup = selected.some(isGroupEl) || isGroupEl(selected[0]?.parentElement);

    const renderRow = (el, depth) => {
      const key = itemKey(el);
      const isGroup = isGroupEl(el);
      const hidden = el.getAttribute("data-hidden") === "true";
      const isSelected = selected.includes(el);
      const open = !collapsedGroupsRef.current.has(el);
      const drop = dropTargetEl?.el === el ? dropTargetEl.inFront : null;
      const name = itemName(el);
      return (
        <div key={key}>
          <div
            draggable={!renamingItem}
            onDragStart={(e) => {
              draggedItemRef.current = el;
              e.dataTransfer.effectAllowed = "move";
            }}
            onDragOver={(e) => {
              e.preventDefault();
              const r = e.currentTarget.getBoundingClientRect();
              const inFront = e.clientY < r.top + r.height / 2;
              if (dropTargetEl?.el !== el || dropTargetEl.inFront !== inFront) setDropTargetEl({ el, inFront });
            }}
            onDragLeave={() => {
              if (dropTargetEl?.el === el) setDropTargetEl(null);
            }}
            onDrop={(e) => {
              e.preventDefault();
              const r = e.currentTarget.getBoundingClientRect();
              dropPaneItem(el, e.clientY < r.top + r.height / 2);
            }}
            onDragEnd={() => {
              draggedItemRef.current = null;
              setDropTargetEl(null);
            }}
            onClick={(e) => selectFromPane(el, e)}
            style={{ paddingLeft: `${6 + depth * 14}px` }}
            className={`relative flex items-center gap-1 rounded-md border py-1 pr-1 text-[9.5px] transition-colors cursor-pointer ${
              isSelected ? "border-blue-500 bg-blue-600/25" : "border-transparent hover:bg-white/10"
            } ${hidden ? "opacity-50" : ""}`}
          >
            {drop !== null && (
              <span
                aria-hidden="true"
                className={`pointer-events-none absolute left-1 right-1 h-0.5 rounded bg-emerald-400 ${drop ? "-top-px" : "-bottom-px"}`}
              />
            )}
            {isGroup ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (open) collapsedGroupsRef.current.add(el);
                  else collapsedGroupsRef.current.delete(el);
                  setDragFrame((n) => n + 1);
                }}
                className="flex-shrink-0 rounded p-0.5 text-slate-400 hover:text-white cursor-pointer"
                aria-label={open ? `Close ${name}` : `Open ${name}`}
              >
                <ChevronDown className={`h-3 w-3 transition-transform ${open ? "" : "-rotate-90"}`} />
              </button>
            ) : (
              <span className="w-4 flex-shrink-0" />
            )}
            {renamingItem?.el === el ? (
              <input
                autoFocus
                type="text"
                value={renamingItem.name}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => setRenamingItem({ el, name: e.target.value })}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === "Enter") saveItemName();
                  if (e.key === "Escape") setRenamingItem(null);
                }}
                onBlur={saveItemName}
                className="min-w-0 flex-1 rounded border border-white/30 bg-black/60 px-1 py-0.5 text-[9px] font-semibold text-white outline-none"
              />
            ) : (
              <span
                className="flex min-w-0 flex-1 items-center gap-1.5 leading-tight"
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setRenamingItem({ el, name: el.getAttribute("data-item-name") || name });
                }}
                title={`${name}: double-click to rename, drag to change its layer`}
              >
                <span className={`truncate ${isGroup ? "font-bold" : "font-semibold"}`}>{name}</span>
                <span className="flex-shrink-0 font-mono-tech text-[7px] uppercase text-slate-500">{itemType(el)}</span>
              </span>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleHidden(el);
              }}
              className="flex-shrink-0 rounded p-0.5 text-slate-300 hover:bg-white/10 hover:text-white cursor-pointer"
              title={hidden ? "Hidden: not on the page or in what is sent. Click to show." : "Hide"}
              aria-label={hidden ? `Show ${name}` : `Hide ${name}`}
            >
              {hidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            </button>
          </div>
          {isGroup && open && layerItems(el).reverse().map((part) => renderRow(part, depth + 1))}
        </div>
      );
    };

    return (
      <div
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        className="flex min-h-0 w-60 flex-shrink-0 flex-col overflow-hidden rounded-br-2xl border-l border-t border-white/15 bg-[#181A20] text-white select-none dark:border-black/10"
      >
        <div className="flex items-center justify-between border-b border-white/10 bg-[#1F2128] px-2.5 py-1.5">
          <span className="flex items-center gap-1.5 text-[9.5px] font-bold uppercase tracking-wider">
            <Layers className="h-3.5 w-3.5 text-blue-400" />
            Selection
          </span>
          <button
            type="button"
            onClick={() => setShowItemsPane(false)}
            className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white cursor-pointer"
            title="Close the Selection pane"
            aria-label="Close the Selection pane"
          >
            <X className="h-3 w-3" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1 border-b border-white/10 px-2 py-1.5">
          <button type="button" className={paneBtn} onClick={() => setAllHidden(false)} title="Show every item">
            <Eye className="h-2.5 w-2.5" /> Show all
          </button>
          <button type="button" className={paneBtn} onClick={() => setAllHidden(true)} title="Hide every item">
            <EyeOff className="h-2.5 w-2.5" /> Hide all
          </button>
          <span className="mx-0.5 h-3 w-px bg-white/15" />
          <button
            type="button"
            className={paneBtn}
            disabled={!selected.length}
            onClick={() => changeLayer("forward")}
            title="Bring forward one layer (Ctrl+])"
            aria-label="Bring forward one layer"
          >
            <ArrowUp className="h-2.5 w-2.5" />
          </button>
          <button
            type="button"
            className={paneBtn}
            disabled={!selected.length}
            onClick={() => changeLayer("backward")}
            title="Send backward one layer (Ctrl+[)"
            aria-label="Send backward one layer"
          >
            <ArrowDown className="h-2.5 w-2.5" />
          </button>
          <span className="mx-0.5 h-3 w-px bg-white/15" />
          <button type="button" className={paneBtn} disabled={!canGroup} onClick={groupSelection} title="Group (Ctrl+G)">
            <Group className="h-2.5 w-2.5" /> Group
          </button>
          <button
            type="button"
            className={paneBtn}
            disabled={!canUngroup}
            onClick={() => ungroupSelection()}
            title="Ungroup (Ctrl+Shift+G)"
          >
            <Ungroup className="h-2.5 w-2.5" /> Ungroup
          </button>
        </div>

        <div className="flex items-center justify-between px-2.5 pt-1.5 pb-0.5">
          <span className="text-[7.5px] font-bold uppercase tracking-wider text-slate-400">Layer order</span>
          <span className="text-[7.5px] text-slate-500">Front at the top</span>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-px overflow-y-auto p-1.5 pt-0.5 vshield-canvas-scroll">
          {top.length === 0 ? (
            <p className="px-2 py-6 text-center text-[9.5px] text-slate-400">
              Nothing on this page yet. Add a template, element, shape, button, picture or text.
            </p>
          ) : (
            top.map((el) => renderRow(el, 0))
          )}
        </div>
        <p className="border-t border-white/10 px-2.5 py-1.5 text-[7.5px] leading-snug text-slate-500">
          Drag a row to change its layer, or onto a group's part to move it into that group. Ctrl+click to select several.
        </p>
      </div>
    );
  };

  // Drawn over the canvas, never saved: frames on several selected items
  // with their toolbar, the drag-select box, and the group around a
  // selected part.
  const renderGroupingOverlays = () => {
    const editor = editorRef.current;
    if (!editor) return null;
    const multi = pickedBlocks.filter((el) => el.isConnected && editor.contains(el));
    const frames = multi.map((el) => toOverlay(el.getBoundingClientRect())).filter(Boolean);
    const box = frames.length ? unionRects(frames) : null;
    const parentGroup = isGroupEl(activeElement?.element?.parentElement)
      ? toOverlay(activeElement.element.parentElement.getBoundingClientRect())
      : multi.length && isGroupEl(multi[0].parentElement)
        ? toOverlay(multi[0].parentElement.getBoundingClientRect())
        : null;
    const sc = scrollerRef.current;
    const multiBarAbove = box ? box.top - (sc?.scrollTop || 0) > 48 : false;
    const barTop = box ? (multiBarAbove ? box.top - 8 : box.top + box.height + 8) : 0;
    const allOnPage = multi.length >= 2 && multi.every((el) => el.parentElement === pageEl() && !isGroupEl(el));
    const tool = "rounded p-1 text-slate-300 hover:bg-white/10 hover:text-white cursor-pointer";

    return (
      <>
        {parentGroup && (
          <div
            data-floating-control="true"
            aria-hidden="true"
            style={{ position: "absolute", ...parentGroup, pointerEvents: "none", zIndex: 6 }}
            className="rounded-sm border border-dashed border-slate-400/80"
          />
        )}
        {frames.map((b, i) => (
          <div
            key={`picked-${i}`}
            data-floating-control="true"
            aria-hidden="true"
            style={{ position: "absolute", ...b, pointerEvents: "none", zIndex: 7 }}
            className="border-2 border-[#2563EB]"
          />
        ))}
        {box && (
          <>
            <div
              data-floating-control="true"
              aria-hidden="true"
              style={{ position: "absolute", left: box.left - 4, top: box.top - 4, width: box.width + 8, height: box.height + 8, pointerEvents: "none", zIndex: 7 }}
              className="border border-dashed border-[#2563EB]/70"
            />
            <div
              data-floating-control="true"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={(e) => e.stopPropagation()}
              style={{
                position: "absolute",
                left: Math.max(0, box.left - 4),
                top: Math.max(0, barTop),
                transform: multiBarAbove ? "translateY(-100%)" : "none",
                maxWidth: Math.max(240, (sc?.clientWidth || 600) - Math.max(0, box.left - 4) - 8),
                zIndex: 41,
              }}
              className="flex flex-wrap items-center gap-0.5 rounded-lg border border-white/20 bg-[#1A1C23] p-1 text-white shadow-2xl select-none"
            >
              <span className="px-1 text-[8.5px] font-bold text-slate-300">{multi.length} selected</span>
              <span className="mx-0.5 h-3.5 w-px bg-white/15" />
              <button type="button" onClick={() => alignSelection("left")} className={tool} title="Align left edges">
                <AlignStartVertical className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => alignSelection("center")} className={tool} title="Align centres across">
                <AlignHorizontalJustifyCenter className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => alignSelection("right")} className={tool} title="Align right edges">
                <AlignEndVertical className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => alignSelection("top")} className={tool} title="Align top edges">
                <AlignStartHorizontal className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => alignSelection("middle")} className={tool} title="Align middles">
                <AlignVerticalJustifyCenter className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => alignSelection("bottom")} className={tool} title="Align bottom edges">
                <AlignEndHorizontal className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => distributeSelection("horizontal")}
                disabled={multi.length < 3}
                className={`${tool} disabled:opacity-30`}
                title="Space evenly across (3 or more)"
              >
                <AlignHorizontalSpaceAround className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => distributeSelection("vertical")}
                disabled={multi.length < 3}
                className={`${tool} disabled:opacity-30`}
                title="Space evenly top to bottom (3 or more)"
              >
                <AlignVerticalSpaceAround className="h-3.5 w-3.5" />
              </button>
              <span className="mx-0.5 h-3.5 w-px bg-white/15" />
              <button type="button" onClick={() => changeLayer("forward")} className={tool} title="Bring forward one layer (Ctrl+])">
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => changeLayer("backward")} className={tool} title="Send backward one layer (Ctrl+[)">
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
              {allOnPage && (
                <button
                  type="button"
                  onClick={groupSelection}
                  className="ml-0.5 flex items-center gap-1 rounded bg-[#2563EB] px-1.5 py-0.5 text-[9px] font-bold text-white hover:bg-blue-700 cursor-pointer"
                  title="Group (Ctrl+G)"
                >
                  <Group className="h-3 w-3" />
                  Group
                </button>
              )}
              <button type="button" onClick={duplicateActiveItem} className={tool} title="Duplicate (Ctrl+D)">
                <Copy className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={deleteActiveItem}
                className="rounded p-1 text-red-400 hover:bg-red-500/20 hover:text-red-300 cursor-pointer"
                title="Delete (Delete key)"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </>
        )}

        {selectBox && (
          <div
            data-floating-control="true"
            aria-hidden="true"
            style={{ position: "absolute", ...selectBox, pointerEvents: "none", zIndex: 42 }}
            className="rounded-sm border border-[#2563EB] bg-[#2563EB]/10"
          />
        )}
      </>
    );
  };

  // One selected item (or group, or part of a group): its frame, eight
  // handles, and its toolbar (place and size, look, layers, On Click).
  const renderFloatingObjectControls = () => {
    const el = activeElement?.element;
    if (!el || !el.isConnected || el.style.display === "none") return null;
    const sc = scrollerRef.current;
    const frame = toOverlay(el.getBoundingClientRect());
    if (!sc || !frame) return null;
    const isGroup = isGroupEl(el);
    const editing = editingItem === el;
    const r = pageRectOf(el);
    const picture = activePicture();
    const visibleTop = frame.top - sc.scrollTop;
    const roomBelow = sc.clientHeight - (visibleTop + frame.height);
    const barAbove = roomBelow < 90 && visibleTop > 90;
    const openMenuUpward = barAbove ? visibleTop > 200 : roomBelow < 200 && visibleTop > 200;
    const barMaxWidth = Math.max(240, Math.min(700, sc.clientWidth - 12));
    const barLeft = Math.max(4, Math.min(frame.left, sc.clientWidth - barMaxWidth - 4));
    const tool = "p-1 hover:bg-white/10 rounded text-slate-300 hover:text-white cursor-pointer";
    const chip = "flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white text-[9px] font-bold cursor-pointer";
    const menuStyle = {
      bottom: openMenuUpward ? "100%" : "auto",
      top: openMenuUpward ? "auto" : "100%",
      marginBottom: openMenuUpward ? "4px" : "0px",
      marginTop: openMenuUpward ? "0px" : "4px",
    };

    // A length box: typed freely, applied on Enter or when it loses focus.
    const lengthInput = (value, onCommit, label, width = "w-11") => (
      <input
        key={`${label}-${value}-${lengthUnit}`}
        type="number"
        step={lengthUnit === "cm" ? "0.05" : "1"}
        defaultValue={value}
        aria-label={label}
        title={`${label} (${lengthUnit}). Enter to apply.`}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            e.currentTarget.value = value;
            e.currentTarget.blur();
          }
        }}
        onBlur={(e) => {
          if (e.target.value !== String(value)) onCommit(e.target.value);
        }}
        className={`${width} px-1 py-0 bg-black/60 rounded border border-white/20 text-[8.5px] text-white outline-none`}
      />
    );

    const handles = [
      ["top-left", "-top-1.5 -left-1.5 cursor-nwse-resize"],
      ["top-right", "-top-1.5 -right-1.5 cursor-nesw-resize"],
      ["bottom-left", "-bottom-1.5 -left-1.5 cursor-nesw-resize"],
      ["bottom-right", "-bottom-1.5 -right-1.5 cursor-nwse-resize"],
      ...(frame.height >= 28
        ? [
            ["left", "top-1/2 -left-1.5 -translate-y-1/2 cursor-ew-resize"],
            ["right", "top-1/2 -right-1.5 -translate-y-1/2 cursor-ew-resize"],
          ]
        : []),
      ...(frame.width >= 48
        ? [
            ["top", "-top-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize"],
            ["bottom", "-bottom-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize"],
          ]
        : []),
    ];

    return (
      <>
        <div
          data-floating-control="true"
          style={{
            position: "absolute",
            ...frame,
            pointerEvents: "none",
            border: editing ? "2px solid #16A34A" : `2px ${isGroup ? "dashed" : "solid"} #2563EB`,
            zIndex: 40,
          }}
        >
          {editing && (
            <span className="absolute -top-5 left-0 rounded bg-[#16A34A] px-1.5 py-0.5 text-[8px] font-bold text-white shadow">
              Typing: Esc to finish
            </span>
          )}
          {!editing &&
            handles.map(([handle, place]) => (
              <div
                key={handle}
                onMouseDown={(e) => startResizeItem(e, handle)}
                onClick={(e) => e.stopPropagation()}
                className={`absolute h-3 w-3 rounded-sm border-2 border-[#2563EB] bg-white pointer-events-auto ${place}`}
                title={isGroup ? "Resize the group: its parts scale with it (Shift keeps proportions)" : "Resize (Shift keeps proportions)"}
              />
            ))}
        </div>

        <div
          data-floating-control="true"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "absolute",
            left: barLeft,
            // Above: its bottom edge 8px over the item, however tall it wraps.
            top: barAbove ? frame.top - 8 : frame.top + frame.height + 8,
            transform: barAbove ? "translateY(-100%)" : "none",
            maxWidth: barMaxWidth,
            width: "max-content",
            zIndex: 41,
          }}
          className="flex flex-wrap items-center gap-1 rounded-lg border border-white/20 bg-[#1A1C23] p-1 text-white shadow-2xl select-none"
        >
          {/* Place and size, on the page (as Power BI's General > Properties) */}
          <div className="flex items-center gap-1 pr-1 border-r border-white/15 font-mono-tech text-[8.5px]">
            <span className="text-slate-400">X</span>
            {lengthInput(toUnit(r.left, lengthUnit), (v) => setItemBox("x", v), "X position")}
            <span className="text-slate-400">Y</span>
            {lengthInput(toUnit(r.top, lengthUnit), (v) => setItemBox("y", v), "Y position")}
            <span className="text-slate-400">W</span>
            {lengthInput(toUnit(r.width, lengthUnit), (v) => setItemBox("w", v), "Width")}
            <span className="text-slate-400">H</span>
            {lengthInput(toUnit(r.height, lengthUnit), (v) => setItemBox("h", v), "Height")}
            <button
              type="button"
              onClick={() => changeLengthUnit(lengthUnit === "px" ? "cm" : "px")}
              className="rounded border border-white/20 px-1 text-[8px] font-bold uppercase text-slate-300 hover:bg-white/10 hover:text-white cursor-pointer"
              title={`In ${lengthUnit}. Click for ${lengthUnit === "px" ? "cm" : "px"}.`}
            >
              {lengthUnit}
            </button>
            <span className="text-emerald-400 font-bold">({aspectRatioText})</span>
          </div>

          {!isGroup && (
            <div className="flex items-center gap-1 pr-1 border-r border-white/15">
              {PRESET_COLORS.slice(0, 3).map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => updateActiveItemColor(color)}
                  style={{ backgroundColor: color }}
                  className="w-4 h-4 rounded-full border border-white/30 cursor-pointer hover:scale-110"
                  title={`Fill ${color}`}
                />
              ))}
              <input
                type="color"
                onChange={(e) => updateActiveItemColor(e.target.value)}
                className="w-4 h-4 rounded cursor-pointer border-none bg-transparent"
                title="Custom fill colour"
              />
              <button type="button" onClick={handleEyedropperForObject} className={tool} title="Pick a fill colour from the screen">
                <Pipette className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {!isGroup && (
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowBorderMenu((prev) => !prev);
                  setShowShadowMenu(false);
                  setShowRoundedMenu(false);
                  setShowLayoutMenu(false);
                }}
                className={chip}
                title="Border"
              >
                <Square className="w-3 h-3 text-cyan-400" />
                <span>Border</span>
              </button>
              {showBorderMenu && (
                <div style={menuStyle} className="absolute left-0 w-40 flex flex-col gap-1 rounded-lg border border-white/20 bg-[#1A1C23] p-2 text-left shadow-2xl z-50">
                  <span className="text-[7.5px] font-mono-tech uppercase text-slate-400">Width</span>
                  <div className="flex gap-1">
                    {BORDER_WIDTHS.map((w) => (
                      <button key={w} type="button" onClick={() => updateActiveItemBorder(undefined, w, undefined)} className="px-1.5 py-0.5 text-[8px] bg-white/10 rounded hover:bg-white/20 text-white cursor-pointer">
                        {w}
                      </button>
                    ))}
                  </div>
                  <span className="text-[7.5px] font-mono-tech uppercase text-slate-400 mt-1">Style</span>
                  <div className="flex gap-1">
                    {BORDER_STYLES.map((st) => (
                      <button key={st} type="button" onClick={() => updateActiveItemBorder(st, undefined, undefined)} className="px-1.5 py-0.5 text-[8px] bg-white/10 rounded hover:bg-white/20 text-white cursor-pointer">
                        {st}
                      </button>
                    ))}
                  </div>
                  <span className="text-[7.5px] font-mono-tech uppercase text-slate-400 mt-1">Colour</span>
                  <div className="flex items-center gap-1">
                    {PRESET_COLORS.slice(0, 6).map((c) => (
                      <button key={c} type="button" onClick={() => updateActiveItemBorder(undefined, undefined, c)} style={{ backgroundColor: c }} className="h-3.5 w-3.5 rounded-full border border-white/30 hover:scale-110 cursor-pointer" title={`Border ${c}`} />
                    ))}
                    <input type="color" onChange={(e) => updateActiveItemBorder(undefined, undefined, e.target.value)} className="h-4 w-4 cursor-pointer rounded border-none bg-transparent" title="Custom border colour" />
                  </div>
                </div>
              )}
            </div>
          )}

          {!isGroup && (
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowShadowMenu((prev) => !prev);
                  setShowRoundedMenu(false);
                  setShowBorderMenu(false);
                  setShowLayoutMenu(false);
                }}
                className={chip}
                title="Shadow"
              >
                <Layers className="w-3 h-3 text-amber-400" />
                <span>Shadow</span>
              </button>
              {showShadowMenu && (
                <div style={menuStyle} className="absolute left-0 w-28 flex flex-col gap-0.5 rounded-lg border border-white/20 bg-[#1A1C23] p-1 text-left shadow-2xl z-50">
                  {SHADOW_PRESETS.map((s) => (
                    <button key={s.label} type="button" onClick={() => updateActiveItemShadow(s.value)} className="w-full text-left px-2 py-1 text-[9px] font-semibold text-slate-200 hover:bg-white/10 rounded cursor-pointer">
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {!isGroup && (
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowRoundedMenu((prev) => {
                    // Opening: start the amount from the roundest corner it has,
                    // so a half-round item keeps its size when you toggle corners.
                    if (!prev) {
                      const max = Math.max(...CORNERS.map(cornerRadiusOf), 0);
                      if (max > 0) setCornerAmount(Math.min(50, max));
                    }
                    return !prev;
                  });
                  setShowShadowMenu(false);
                  setShowBorderMenu(false);
                  setShowLayoutMenu(false);
                }}
                className={chip}
                title="Corners"
              >
                <Square className="w-3 h-3 text-emerald-400" />
                <span>Corners</span>
              </button>
              {showRoundedMenu && (
                <div style={menuStyle} className="absolute left-0 w-52 flex flex-col gap-2 rounded-lg border border-white/20 bg-[#1A1C23] p-2.5 text-left shadow-2xl z-50">
                  <div className="flex items-center justify-between text-[8px] font-mono-tech text-slate-400 uppercase">
                    <span>Corner radius</span>
                    <span className="text-white font-bold">{cornerAmount}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    value={cornerAmount}
                    onChange={(e) => {
                      const v = parseInt(e.target.value) || 0;
                      setCornerAmount(v);
                      setAllCorners(v);
                    }}
                    className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#2563EB]"
                    title="How much a corner rounds when turned on"
                  />

                  {/* Round each corner on its own (one, two or three corners). */}
                  <div className="border-t border-white/10 pt-1.5">
                    <span className="text-[7.5px] font-mono-tech font-bold uppercase text-slate-400">Round each corner</span>
                    <div className="mx-auto mt-1 grid w-[72px] grid-cols-2 gap-1">
                      {[["tl", "↖"], ["tr", "↗"], ["bl", "↙"], ["br", "↘"]].map(([corner, arrow]) => {
                        const on = cornerRadiusOf(corner) > 0;
                        return (
                          <button
                            key={corner}
                            type="button"
                            onClick={() => toggleCorner(corner)}
                            title={`${on ? "Square" : "Round"} the ${corner === "tl" ? "top-left" : corner === "tr" ? "top-right" : corner === "bl" ? "bottom-left" : "bottom-right"} corner`}
                            className={`flex h-7 items-center justify-center rounded text-[11px] font-bold cursor-pointer transition-colors ${
                              on ? "bg-[#2563EB] text-white" : "bg-white/10 text-slate-300 hover:bg-white/20"
                            }`}
                          >
                            {arrow}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Round only one side's two corners (e.g. a top tab). */}
                  <div className="border-t border-white/10 pt-1.5">
                    <span className="text-[7.5px] font-mono-tech font-bold uppercase text-slate-400">Round one side only</span>
                    <div className="mt-1 grid grid-cols-4 gap-1">
                      {["top", "right", "bottom", "left"].map((side) => (
                        <button
                          key={side}
                          type="button"
                          onClick={() => roundOnlySide(side)}
                          title={`Round only the two ${side} corners, square the rest`}
                          className="rounded bg-white/10 px-1 py-1 text-[8px] font-bold capitalize text-slate-200 hover:bg-white/20 cursor-pointer"
                        >
                          {side}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-1 border-t border-white/10 pt-1.5">
                    <button type="button" onClick={() => setAllCorners(cornerAmount || 12)} className="rounded px-1 py-0.5 text-[8.5px] font-semibold text-slate-200 hover:bg-white/10 cursor-pointer">
                      All
                    </button>
                    <button type="button" onClick={() => setAllCorners(0)} className="rounded px-1 py-0.5 text-[8.5px] font-semibold text-slate-200 hover:bg-white/10 cursor-pointer">
                      None
                    </button>
                    <button type="button" onClick={() => updateActiveItemRoundedness("9999px", false)} className="rounded px-1 py-0.5 text-[8.5px] font-semibold text-slate-200 hover:bg-white/10 cursor-pointer">
                      Pill
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {!isGroup && (
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowLayoutMenu((prev) => !prev);
                  setShowShadowMenu(false);
                  setShowRoundedMenu(false);
                  setShowBorderMenu(false);
                }}
                className={chip}
                title="Padding inside the item"
              >
                <SlidersHorizontal className="w-3 h-3 text-violet-300" />
                <span>Padding</span>
              </button>
              {showLayoutMenu && (
                <div style={menuStyle} className="absolute left-0 w-40 flex flex-col gap-1.5 rounded-lg border border-white/20 bg-[#1A1C23] p-2 text-left shadow-2xl z-50">
                  <label className="flex items-center justify-between gap-2 text-[8.5px] text-slate-200">
                    <span>Padding ({lengthUnit})</span>
                    {lengthInput(toUnit(readItemPadding(el), lengthUnit), setItemPadding, "Padding", "w-14")}
                  </label>
                  <span className="text-[7.5px] leading-snug text-slate-500">Space between the item's edge and its content. Enter to apply.</span>
                </div>
              )}
            </div>
          )}

          {/* Align: in its page (or group) */}
          <div className="flex items-center gap-0.5 pl-1 border-l border-white/15">
            <button type="button" onClick={() => alignSelection("left")} className={tool} title="Align to the left edge">
              <AlignStartVertical className="w-3.5 h-3.5" />
            </button>
            <button type="button" onClick={() => alignSelection("center")} className={tool} title="Centre across">
              <AlignHorizontalJustifyCenter className="w-3.5 h-3.5" />
            </button>
            <button type="button" onClick={() => alignSelection("right")} className={tool} title="Align to the right edge">
              <AlignEndVertical className="w-3.5 h-3.5" />
            </button>
            <button type="button" onClick={() => alignSelection("top")} className={tool} title="Align to the top">
              <AlignStartHorizontal className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => alignSelection("middle")}
              className={tool}
              title={pageKind() === "browser" && !isGroupEl(el.parentElement) ? "Centre top to bottom in the browser safe zone" : "Centre top to bottom"}
            >
              <AlignVerticalJustifyCenter className="w-3.5 h-3.5" />
            </button>
            <button type="button" onClick={() => alignSelection("bottom")} className={tool} title="Align to the bottom">
              <AlignEndHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Layers: one at a time, or all the way */}
          <div className="flex items-center gap-0.5 pl-1 border-l border-white/15">
            <button type="button" onClick={() => changeLayer("forward")} className={tool} title="Bring forward one layer (Ctrl+])">
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
            <button type="button" onClick={() => changeLayer("backward")} className={tool} title="Send backward one layer (Ctrl+[)">
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
            <button type="button" onClick={() => changeLayer("front")} className={tool} title="Bring to front (Ctrl+Shift+])">
              <BringToFront className="w-3.5 h-3.5" />
            </button>
            <button type="button" onClick={() => changeLayer("back")} className={tool} title="Send to back (Ctrl+Shift+[)">
              <SendToBack className="w-3.5 h-3.5" />
            </button>
          </div>

          {picture && (
            <div className="flex items-center gap-1 pl-1 border-l border-white/15">
              <button
                type="button"
                onClick={() => startPictureReplace(picture.getAttribute("src") || "")}
                className={chip}
                title="Replace this picture with another file (PNG, JPEG, GIF or WebP, up to 2 MB)"
              >
                <ImageUp className="w-3 h-3 text-blue-300" />
                <span>Replace</span>
              </button>
              <input
                key={`alt-${itemKey(picture)}-${picture.getAttribute("alt") || ""}`}
                type="text"
                defaultValue={picture.getAttribute("alt") || ""}
                placeholder="Alt text"
                aria-label="Picture alt text"
                title="Alt text: shown while the employee's mail app blocks pictures, and read by screen readers. Enter to apply."
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === "Enter") e.currentTarget.blur();
                }}
                onBlur={(e) => {
                  if (e.target.value !== (picture.getAttribute("alt") || "")) setPictureAlt(e.target.value.trim());
                }}
                className="w-20 rounded border border-white/20 bg-black/60 px-1 py-0.5 text-[8.5px] text-white outline-none placeholder:text-slate-500"
              />
            </div>
          )}

          <div className="flex items-center gap-0.5 pl-1 border-l border-white/15">
            {isGroup && (
              <button type="button" onClick={() => ungroupSelection(el)} className={chip} title="Ungroup: each part keeps its place and layer (Ctrl+Shift+G)">
                <Ungroup className="w-3 h-3 text-cyan-400" />
                <span>Ungroup</span>
              </button>
            )}
            {!isGroup && hasText(el) && !editing && (
              <button type="button" onClick={() => startEditing(el, { selectAll: false })} className={chip} title="Type in this item (double-click, Enter or F2)">
                <Type className="w-3 h-3 text-slate-300" />
                <span>Edit text</span>
              </button>
            )}
            {canHaveAction(el) && (
              <button
                type="button"
                onClick={openActionModal}
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-white text-[9px] font-bold cursor-pointer ${
                  ["training", "landing", "page"].includes(el.getAttribute("data-action"))
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
                title={
                  currentPageId === BROWSER_PAGE_ID
                    ? "What happens when the employee clicks this button (No action, or Mark compromised)"
                    : "What happens when the employee clicks it"
                }
              >
                <Settings className="w-3 h-3 text-white" />
                <span>On Click</span>
              </button>
            )}
            <button type="button" onClick={duplicateActiveItem} className={tool} title="Duplicate (Ctrl+D)">
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={deleteActiveItem}
              className="p-1 hover:bg-red-500/20 rounded text-red-400 hover:text-red-300 cursor-pointer"
              title={isGroup ? "Delete the group and its parts (Delete key)" : "Delete (Delete key)"}
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      </>
    );
  };

  // Universal On-Click Action Modal
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
                Configure "On Click" Action
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setActionConfigModal(CLOSED_ACTION_MODAL)}
              className="text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {currentPageId === BROWSER_PAGE_ID ? (
            <div className="flex flex-col gap-2 text-xs">
              <p className="text-[10px] text-slate-400">
                Choose what this button does when the employee clicks it. Only the real submit
                button (Next, Submit, Confirm...) should mark them compromised.
              </p>
              <label className="flex items-center gap-2 cursor-pointer p-2.5 rounded-lg border border-white/10 hover:bg-white/5">
                <input
                  type="radio"
                  name="elemAction"
                  checked={actionConfigModal.actionType !== "training"}
                  onChange={() => setActionConfigModal((prev) => ({ ...prev, actionType: "none" }))}
                  className="text-red-600"
                />
                <div>
                  <span className="font-bold block">No action</span>
                  <span className="text-[10px] text-slate-400">
                    Clicking does nothing. Use this for every element except the submit button.
                  </span>
                </div>
              </label>
              <label className="flex items-start gap-2 cursor-pointer p-2.5 rounded-lg border border-amber-400/30 bg-amber-500/10">
                <input
                  type="radio"
                  name="elemAction"
                  checked={actionConfigModal.actionType === "training"}
                  onChange={() => setActionConfigModal((prev) => ({ ...prev, actionType: "training" }))}
                  className="mt-0.5 text-red-600"
                />
                <div>
                  <span className="font-bold flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-300" />
                    Mark compromised, then the landing page and My Training
                  </span>
                  <span className="text-[10px] text-slate-300 block mt-0.5">
                    The employee is marked compromised, sees the campaign's landing page (Oops),
                    and goes on to My Training. Link: <code>{COMPROMISE_LINK}</code>
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Nothing typed on this page is ever sent or stored.
                  </span>
                </div>
              </label>
            </div>
          ) : (
            <div className="flex flex-col gap-2 text-xs">
              {/* A browser page already exists: this element must open it, or
                  the browser page would never be shown. So the landing-page
                  option is hidden until the browser page is deleted. */}
              {!hasBrowserPage && (
                <label className="flex items-center gap-2 cursor-pointer p-2.5 rounded-lg border border-white/10 hover:bg-white/5">
                  <input
                    type="radio"
                    name="elemAction"
                    checked={actionConfigModal.actionType === "landing"}
                    onChange={() => setActionConfigModal((prev) => ({ ...prev, actionType: "landing" }))}
                    className="text-red-600"
                  />
                  <div>
                    <span className="font-bold block">Attach Landing Page (Oops Page)</span>
                    <span className="text-[10px] text-slate-400">
                      Records the click (phished), then opens the campaign's landing page (Oops), chosen in
                      Attach Outcomes. Link: <code>{PHISH_LINK}</code>
                    </span>
                  </div>
                </label>
              )}

              {supportsBrowserPage && (
              <label className="flex items-center gap-2 cursor-pointer p-2.5 rounded-lg border border-white/10 hover:bg-white/5">
                <input
                  type="radio"
                  name="elemAction"
                  checked={actionConfigModal.actionType === "page"}
                  onChange={() => setActionConfigModal((prev) => ({ ...prev, actionType: "page" }))}
                  className="text-red-600"
                />
                <div className="flex-1">
                  <span className="font-bold block">
                    {hasBrowserPage ? "Open the browser page (page 2)" : "Add one more page for compromised part"}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Records the click, then opens a fake page (e.g. a sign-in form) in the employee's
                    browser. Submitting it marks them compromised.
                    {hasBrowserPage ? "" : " You design that page next."}
                  </span>
                </div>
              </label>
              )}

              {hasBrowserPage && (
                <p className="text-[10px] leading-snug text-slate-400 px-0.5">
                  A browser page exists, so this element must open it. To use a landing page instead,
                  delete the browser page first.
                </p>
              )}
            </div>
          )}

          <div className="mt-2 flex justify-end gap-2 border-t border-white/10 pt-3">
            <button
              type="button"
              onClick={() => setActionConfigModal(CLOSED_ACTION_MODAL)}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/5 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveActionConfig}
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

  // 🌟 New Page Template Selection Modal
  const renderNewPageTemplateModal = () => {
    if (!showNewPageModal || typeof document === "undefined") return null;

    return createPortal(
      <div
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-black/70 backdrop-blur-xs p-4"
      >
        <div className="w-full max-w-2xl rounded-2xl border border-white/15 bg-[#14151B] p-5 text-white shadow-2xl flex flex-col gap-3.5 max-h-[85vh]">
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <div>
                <h3 className="text-sm font-bold tracking-tight uppercase">
                  Design the browser page (page 2)
                </h3>
                <p className="text-[10px] text-slate-400 normal-case">
                  It opens in the employee's browser from an email element. Set its submit button's On-Click to
                  "Mark compromised"; that marks them compromised and shows the landing page. Nothing typed is sent or stored.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowNewPageModal(false)}
              className="text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto vshield-canvas-scroll pr-1 flex flex-col gap-4">
            {/* 1. Start Fresh */}
            <div>
              <span className="text-[8px] font-mono-tech uppercase text-slate-400 font-bold tracking-wider block mb-1.5">
                Clean Slate
              </span>
              <button
                type="button"
                onClick={() => createBrowserPage("")}
                className="w-full p-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 flex items-center justify-between text-left cursor-pointer transition-colors"
              >
                <div>
                  <span className="text-xs font-bold text-white block">Start Fresh</span>
                  <span className="text-[10px] text-slate-400">Empty canvas without any predefined layout or components</span>
                </div>
                <Plus className="w-4 h-4 text-emerald-400" />
              </button>
            </div>

            {/* 2. Credential Screen Templates (1 to 5) */}
            <div>
              <span className="text-[8px] font-mono-tech uppercase text-indigo-400 font-bold tracking-wider block mb-1.5">
                Credential Harvesting Templates (1 - 5)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {CREDENTIAL_TEMPLATES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => createBrowserPage(item.html)}
                    className="p-2.5 rounded-xl border border-white/10 bg-[#1A1C23] hover:bg-indigo-600/20 hover:border-indigo-400/40 flex flex-col text-left cursor-pointer transition-all gap-0.5"
                  >
                    <span className="text-[11px] font-bold text-white">{item.name}</span>
                    <span className="text-[9.5px] text-slate-400">{item.subtitle}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 3. 2FA Verification Templates (1 to 5) */}
            <div>
              <span className="text-[8px] font-mono-tech uppercase text-pink-400 font-bold tracking-wider block mb-1.5">
                2FA & Token Verification Templates (1 - 5)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {TWO_FA_TEMPLATES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => createBrowserPage(item.html)}
                    className="p-2.5 rounded-xl border border-white/10 bg-[#1A1C23] hover:bg-pink-600/20 hover:border-pink-400/40 flex flex-col text-left cursor-pointer transition-all gap-0.5"
                  >
                    <span className="text-[11px] font-bold text-white">{item.name}</span>
                    <span className="text-[9.5px] text-slate-400">{item.subtitle}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={() => setShowNewPageModal(false)}
              className="px-4 py-1.5 rounded-lg border border-white/10 text-xs font-semibold text-slate-300 hover:bg-white/5 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  // The browser page full screen, as the employee's browser shows it. A
  // sandboxed frame: nothing on it runs, and nothing can be submitted.
  const renderBrowserPreview = () => {
    if (!showBrowserPreview || typeof document === "undefined") return null;
    const html = pagesRef.current.find((p) => p.id === BROWSER_PAGE_ID)?.html || "";
    const doc = previewDocument(html, { background: "#f3f4f6", padding: "0" });

    return createPortal(
      <div className="fixed inset-0 z-[2147483647] bg-white">
        <iframe
          title="Browser page preview"
          sandbox=""
          srcDoc={doc}
          className="block h-full w-full border-0 bg-white"
        />
        {/* The page fills the screen; only a small close control floats over it. */}
        <button
          type="button"
          onClick={() => setShowBrowserPreview(false)}
          className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/70 px-3 py-1.5 text-[11px] font-bold text-white shadow-lg backdrop-blur-sm hover:bg-black/85 cursor-pointer"
          title="Close preview (Esc)"
        >
          <X className="h-3.5 w-3.5" />
          Close
        </button>
      </div>,
      document.body,
    );
  };

  // Workspace Renderer (Ensuring seamless rounded outer edges in both compact & full views)
  const renderEditorWorkspace = (expanded = false) => {
    return (
      <div
        style={{ borderWidth: `${VarEditorOuterFrameThickness}px` }}
        className={`
          w-full rounded-2xl border border-[#202127] dark:border-white/10 bg-[#202127] dark:bg-white
          shadow-xs flex flex-col relative z-20 overflow-visible
          ${expanded ? "h-[calc(100vh-80px)]" : "h-[220px] max-h-[220px]"}
        `}
      >
        {renderToolbar()}

        {pictureIssues.missing.length > 0 && (
          <div className="flex flex-shrink-0 items-center gap-2 border-b border-amber-200 bg-amber-50 px-3 py-1 text-[10px] text-amber-900 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-200">
            <ImageIcon className="h-3 w-3 flex-shrink-0" />
            <span className="min-w-0 truncate">
              <strong>{picturesLabel(pictureIssues.missing.length)}</strong> can't be shown to employees.{" "}
              {rawHtmlMode
                ? "Upload each one from the button above its highlighted code."
                : "Upload each one where it's marked on the canvas."}
            </span>
            {pictureBusy && pictureBusy !== "toolbar" && (
              <span className="ml-auto flex-shrink-0 font-semibold">Uploading...</span>
            )}
          </div>
        )}

        {/* Fixed by the frame: a long design scrolls inside, never stretches it. */}
        <div className="flex min-h-0 w-full flex-1 overflow-hidden">
        <div
          ref={workspaceRef}
          className={`
            relative min-h-0 min-w-0 w-full flex-1
            ${showItemsPane && !rawHtmlMode ? "rounded-bl-2xl" : "rounded-b-2xl"}
            border-t border-slate-200 dark:border-white/10
            overflow-hidden bg-[#E9EBEF] dark:bg-[#2A2C33]
            ${expanded ? "min-h-0" : ""}
          `}
        >
          {renderFloatingTextSelectionColorBar()}
          {renderShortcuts()}

          {rawHtmlMode ? (
            <div className="absolute inset-0 overflow-y-auto vshield-canvas-scroll z-0 bg-white">
              <HtmlCodeEditor
                value={rawHtmlCode}
                disabled={disabled}
                onChange={handleRawHtmlCode}
                ariaLabel={currentPageId === BROWSER_PAGE_ID ? "Browser page HTML" : "Email body HTML"}
                pictureFix={{
                  isMissing: isMissingPicture,
                  onUpload: startPictureReplace,
                  busySrc: pictureBusy,
                }}
                placeholder="Write email HTML code here..."
              />
            </div>
          ) : (
            // The page at its real width, scaled to fit: the canvas never
            // scrolls sideways, only down. Frames and toolbars are drawn
            // over it at full size.
            <div
              ref={scrollerRef}
              tabIndex={-1}
              onMouseDown={handleWorkspaceMouseDown}
              onClick={handleCanvasClick}
              onDoubleClick={handleCanvasDoubleClick}
              onPaste={handlePaste}
              onScroll={() => setDragFrame((n) => n + 1)}
              className="vshield-canvas-scroll absolute inset-0 z-0 overflow-y-auto overflow-x-hidden outline-none"
            >
              <div
                style={{
                  width: `${pageWidthPx * canvasFit}px`,
                  height: `${pageHeightPx * canvasFit}px`,
                  margin: `${CANVAS_GUTTER_PX}px auto`,
                  position: "relative",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    width: `${pageWidthPx}px`,
                    transform: `scale(${canvasFit})`,
                    transformOrigin: "0 0",
                  }}
                  className="shadow-[0_1px_4px_rgba(15,23,42,0.18)]"
                >
                  <div
                    ref={editorRef}
                    role="application"
                    aria-label={
                      currentPageId === BROWSER_PAGE_ID ? "Browser page canvas" : "Email canvas"
                    }
                    onInput={handleEditorInput}
                    onKeyUp={saveSelection}
                    onMouseUp={saveSelection}
                    onBlur={handleEditorBlur}
                    // Behind the page, what its preview shows behind it.
                    style={{
                      ...CANVAS_TEXT_STYLE,
                      color: "#242424",
                      backgroundColor: currentPageId === BROWSER_PAGE_ID ? "#f3f4f6" : "#FFFFFF",
                    }}
                    className={`
                      vshield-editor-canvas relative outline-none
                      [&_a]:text-blue-600 [&_a]:underline
                      [&_blockquote]:mx-10 [&_blockquote]:my-[1em]
                      [&_h1]:my-[0.67em] [&_h1]:text-[2em] [&_h1]:font-bold
                      [&_h2]:my-[0.83em] [&_h2]:text-[1.5em] [&_h2]:font-bold
                      [&_h3]:my-[1em] [&_h3]:text-[1.17em] [&_h3]:font-bold
                      [&_p]:my-[1em]
                      [&_ul]:my-[1em] [&_ul]:list-disc [&_ul]:pl-10
                      [&_ol]:my-[1em] [&_ol]:list-decimal [&_ol]:pl-10
                      [&_img]:inline [&_img]:align-baseline
                      ${disabled ? "cursor-not-allowed opacity-70" : ""}
                    `}
                  />

                  {/* The page's bottom edge: drag down for more room (never saved). */}
                  {!disabled && (
                    <div
                      data-floating-control="true"
                      onMouseDown={startPageHeightDrag}
                      title="Drag to make the page taller or shorter"
                      style={{ position: "absolute", left: 0, top: pageHeightPx - 4, width: pageWidthPx, height: 10, zIndex: 9997 }}
                      className="group flex cursor-ns-resize items-center justify-center"
                    >
                      <span
                        className="h-1.5 rounded-full bg-slate-400/70 group-hover:bg-[#2563EB]"
                        style={{ width: `${Math.min(80 / canvasFit, 160)}px` }}
                      />
                    </div>
                  )}

                  {/* Snap guides, in page px (never saved). */}
                  {snapGuide?.x != null && (
                    <div
                      aria-hidden="true"
                      style={{ position: "absolute", left: snapGuide.x, top: 0, height: pageHeightPx, pointerEvents: "none", zIndex: 9999 }}
                      className="w-0 border-l border-dashed border-fuchsia-500"
                    />
                  )}
                  {snapGuide?.y != null && (
                    <div
                      aria-hidden="true"
                      style={{ position: "absolute", top: snapGuide.y, left: 0, width: pageWidthPx, pointerEvents: "none", zIndex: 9999 }}
                      className="h-0 border-t border-dashed border-fuchsia-500"
                    />
                  )}

                  {/* Browser safe-zone guide: where the employee has to start scrolling (never saved) */}
                  {currentPageId === BROWSER_PAGE_ID && (
                    <div
                      aria-hidden="true"
                      style={{ position: "absolute", top: `${BROWSER_SAFE_ZONE_PX}px`, left: 0, right: 0, pointerEvents: "none", zIndex: 9998 }}
                      className="flex items-center select-none"
                    >
                      <div
                        className={`w-full border-t-2 border-dashed ${
                          safeZoneOverflow ? "border-amber-500/90" : "border-emerald-500/80"
                        }`}
                      />
                      <span
                        className={`absolute right-3 -top-3 whitespace-nowrap rounded px-2 py-0.5 font-mono-tech text-[11px] font-bold uppercase tracking-wider text-white shadow-xs ${
                          safeZoneOverflow ? "bg-amber-500" : "bg-emerald-600/95"
                        }`}
                      >
                        {safeZoneOverflow
                          ? "Browser safe zone: content below needs scrolling"
                          : "Browser safe zone"}{" "}
                        ({BROWSER_SAFE_ZONE_PX}px)
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {editorIsEmpty && (
                <div
                  className="pointer-events-none absolute left-1/2 z-10 -translate-x-1/2 text-center text-xs text-slate-400"
                  style={{ top: `${CANVAS_GUTTER_PX + 24}px`, maxWidth: `${Math.max(200, pageWidthPx * canvasFit - 40)}px` }}
                >
                  {currentPageId === BROWSER_PAGE_ID
                    ? "Design the browser page: pick a sign-in or 2FA screen from Templates, or build one. Set the submit button\u2019s On-Click to mark them compromised."
                    : placeholder}
                </div>
              )}

              {/* Missing pictures: a light dashed outline where each one is, with an
                  Upload button (never saved: outside the page) */}
              {pictureIssues.marks.map((m) => (
                <div
                  key={m.key}
                  data-floating-control="true"
                  style={{
                    position: "absolute",
                    left: m.left,
                    top: m.top,
                    width: m.width,
                    height: m.height,
                    zIndex: 6,
                    pointerEvents: "none",
                  }}
                  className="flex flex-col items-center justify-center gap-1 rounded-md border-[1.5px] border-dashed border-slate-400/80 bg-slate-100/40 dark:bg-white/5"
                >
                  <button
                    type="button"
                    disabled={pictureBusy === m.src}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => startPictureReplace(m.src)}
                    title={`Upload the picture for ${m.src.length > 60 ? `${m.src.slice(0, 57)}...` : m.src}`}
                    style={{ pointerEvents: "auto" }}
                    className="flex items-center gap-1 rounded-md border border-slate-300 bg-slate-200 px-2 py-1 text-[9.5px] font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-100 disabled:cursor-wait disabled:opacity-70 cursor-pointer"
                  >
                    <Upload className="h-3 w-3" />
                    {pictureBusy === m.src ? "Uploading..." : "Upload picture"}
                  </button>
                  {m.height >= 80 && (
                    <span className="max-w-[90%] truncate text-[8.5px] font-medium text-slate-500">
                      {m.kind === "background" ? "Background picture missing" : "Picture missing"}
                    </span>
                  )}
                </div>
              ))}

              {renderGroupingOverlays()}
              {renderFloatingObjectControls()}
            </div>
          )}
        </div>
        {renderSelectionPane()}
        </div>
      </div>
    );
  };

  return (
    <>
      <style>{`
        /* A picture that can't load keeps a box's room, for its Upload mark. */
        .vshield-editor-canvas img:not([src^="https:"]):not([src^="data:"]) {
          display: inline-block;
          min-width: 140px;
          min-height: 64px;
        }
        /* The canvas: an outline on the item under the mouse, a text cursor
           in the item being typed in, links that don't look clickable (never saved). */
        .vshield-editor-canvas .vshield-canvas-item { cursor: default; }
        .vshield-editor-canvas .vshield-page > .vshield-canvas-item:hover,
        .vshield-editor-canvas .vshield-group-item > .vshield-canvas-item:hover {
          outline: 1px dashed rgba(37, 99, 235, 0.55);
          outline-offset: 0px;
        }
        .vshield-editor-canvas [contenteditable="true"] { cursor: text; outline: none !important; }
        .vshield-editor-canvas .vshield-fx {
          background-color: rgba(153, 0, 153, 0.12);
          color: #990099;
          font-weight: bold;
          padding: 1px 5px;
          border-radius: 4px;
          font-family: monospace;
        }
        .vshield-editor-canvas a { cursor: default; }
        .vshield-canvas-scroll {
          scrollbar-width: thin;
          scrollbar-color: #cbd5e1 transparent;
        }
        .dark .vshield-canvas-scroll {
          scrollbar-color: #475569 transparent;
        }
        .vshield-canvas-scroll::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }
        .vshield-canvas-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .vshield-canvas-scroll::-webkit-scrollbar-thumb {
          background-color: #cbd5e1;
          border-radius: 9999px;
        }
        .vshield-canvas-scroll::-webkit-scrollbar-thumb:hover {
          background-color: #94a3b8;
        }
        .dark .vshield-canvas-scroll::-webkit-scrollbar-thumb {
          background-color: #475569;
        }
        .dark .vshield-canvas-scroll::-webkit-scrollbar-thumb:hover {
          background-color: #64748b;
        }
      `}</style>

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
                onClick={() => {
                  if (editorRef.current && !rawHtmlMode) {
                    const latest = editorRef.current.innerHTML;
                    internalHtmlRef.current = latest;
                    emitChange(latest);
                  }
                  setIsExpanded(false);
                }}
                className="px-6 py-2 rounded-xl bg-[#E60000] hover:bg-red-700 text-white font-voda font-bold text-[9px] uppercase cursor-pointer shadow-lg"
              >
                Done Editing
              </button>
            </div>
          </div>,
          document.body,
        )}

      {renderActionModal()}
      {renderNewPageTemplateModal()}
      {renderBrowserPreview()}
      {emailPreview.open && (
      <EmailPreviewModal
        open
        onClose={() => setEmailPreview({ open: false, html: "" })}
        html={emailPreview.html}
        senderName={previewMeta.senderName}
        senderEmail={previewMeta.senderEmail}
        subject={previewMeta.subject}
      />
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          title={toast.title}
          duration={2500}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
};

export default EmailBodyRichTextEditor;