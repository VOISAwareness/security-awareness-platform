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
  AlignJustify,
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
  Globe,
  FileText,
  Grid,
  Image as ImageIcon,
  Upload,
  Italic,
  Layers,
  Maximize2,
  Minimize2,
  MousePointerClick,
  Move,
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
  Sparkles,
  Square,
  Strikethrough,
  Trash2,
  Type,
  Underline,
  X,
} from "lucide-react";
import { createPortal } from "react-dom";
import HtmlCodeEditor from "../../../../GlobalComponents/HtmlCodeEditor";
import Toast from "../../../../GlobalComponents/Toast";
import EmailPreviewModal from "./EmailPreviewModal";
import { canRedo, canUndo, moveTo, newHistory, recordStep } from "../../../../services/pageHistory";
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
} from "../../../../services/simulationPages";

// =========================================================================
// 🎛️ SCALE & FRAME CONTROL VARIABLES
// =========================================================================
const VarEditorOuterFrameThickness = 4; // Thickness of outer frame in pixels
const PX_PER_CM = 37.7952755906; // 96 DPI standard conversion

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
    label: "@PhishLink",
    code: "{{phishLink}}",
    desc: "Simulation trackable landing link",
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

const FONT_SIZES = [
  { label: "8px", value: "1" },
  { label: "10px", value: "1" },
  { label: "12px", value: "2" },
  { label: "14px", value: "3" },
  { label: "16px", value: "3" },
  { label: "18px", value: "4" },
  { label: "20px", value: "4" },
  { label: "24px", value: "5" },
  { label: "28px", value: "5" },
  { label: "32px", value: "6" },
  { label: "36px", value: "6" },
  { label: "40px", value: "7" },
  { label: "48px", value: "7" },
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
  const [showBorderMenu, setShowBorderMenu] = useState(false);
  const [showPagesMenu, setShowPagesMenu] = useState(false);
  const [showNewPageModal, setShowNewPageModal] = useState(false);
  const [canvasBgColor, setCanvasBgColor] = useState("#FFFFFF");
  const [activeElement, setActiveElement] = useState(null);
  const [aspectRatioText, setAspectRatioText] = useState("");

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
    const editor = editorRef.current;
    if (!editor || currentPageIdRef.current !== BROWSER_PAGE_ID) return;
    const limit = BROWSER_SAFE_ZONE_PX;
    let bottom = 0;
    for (const el of editor.children) {
      bottom = Math.max(bottom, el.offsetTop - editor.offsetTop + el.offsetHeight);
    }
    const over = bottom > limit + 4;
    setSafeZoneOverflow((prev) => (prev === over ? prev : over));
  }, []);

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

  // Where an element sits inside the canvas's scroll area, in layout pixels.
  const offsetInCanvas = (el, container) => {
    let x = 0;
    let y = 0;
    let node = el;
    while (node && node !== container) {
      x += node.offsetLeft;
      y += node.offsetTop;
      node = node.offsetParent;
    }
    return node === container ? { x, y } : null;
  };

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
    const container = editor?.offsetParent;
    if (!rawHtmlMode && editor && container) {
      const mark = (el, src, kind) => {
        const at = offsetInCanvas(el, container);
        if (!at) return;
        marks.push({
          key: `${marks.length}-${src}`,
          src,
          kind,
          left: at.x,
          top: at.y,
          width: Math.max(el.offsetWidth, 140),
          height: Math.max(el.offsetHeight, 64),
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
    const html = toBrowserPageHtml(String(templateHtml || "").trim());
    storePages([
      ...emailPages,
      { id: BROWSER_PAGE_ID, name: PAGE_LABELS[BROWSER_PAGE_ID], html },
    ]);
    resetPageHistory(BROWSER_PAGE_ID, html);
    showPage(BROWSER_PAGE_ID, html);
    onBrowserPageChange?.(html);
    showToast("Browser page created. Any button or link on it marks the employee compromised.", "success");
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Escape closes the topmost layer: a dialog, then the full-screen editor.
      if (e.key === "Escape") {
        if (emailPreview.open) return; // the preview closes itself
        if (showBrowserPreview) setShowBrowserPreview(false);
        else if (actionConfigModal.open) setActionConfigModal(CLOSED_ACTION_MODAL);
        else if (showNewPageModal) setShowNewPageModal(false);
        else if (isExpanded) setIsExpanded(false);
        return;
      }
      // Undo / redo is the editor's only while the editor has focus (or an
      // element on it is selected): Ctrl+Z in the subject field, or in the
      // HTML source, keeps its own meaning.
      const inEditor =
        workspaceRef.current?.contains(document.activeElement) ||
        (activeElement?.element && document.activeElement === document.body);
      if (!rawHtmlMode && inEditor && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
        return;
      }
      if (!rawHtmlMode && inEditor && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        handleRedo();
        return;
      }

      if (activeElement?.element && document.activeElement !== editorRef.current) {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
          e.preventDefault();
          duplicateActiveItem();
          return;
        }

        if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
          e.preventDefault();
          const step = e.shiftKey ? 10 : 1;
          const targetEl = activeElement.element;
          const currentLeft = parseFloat(targetEl.style.left) || 0;
          const currentTop = parseFloat(targetEl.style.top) || 0;

          let deltaX = 0;
          let deltaY = 0;
          if (e.key === "ArrowLeft") deltaX = -step;
          if (e.key === "ArrowRight") deltaX = step;
          if (e.key === "ArrowUp") deltaY = -step;
          if (e.key === "ArrowDown") deltaY = step;

          const newLeft = currentLeft + deltaX;
          const newTop = Math.max(4, currentTop + deltaY);

          targetEl.style.position = "relative";
          targetEl.style.left = `${newLeft}px`;
          targetEl.style.top = `${newTop}px`;
          synchroniseEditorValue();
          return;
        }

        if (e.key === "Delete" && !e.target.isContentEditable) {
          e.preventDefault();
          deleteActiveItem();
          return;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeElement, rawHtmlMode, handleUndo, handleRedo, showBrowserPreview, emailPreview.open, actionConfigModal.open, showNewPageModal, isExpanded]);

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

  const placeCaretAtEnd = useCallback(() => {
    if (!editorRef.current) return;
    const selection = window.getSelection();
    const range = document.createRange();

    range.selectNodeContents(editorRef.current);
    range.collapse(false);

    selection.removeAllRanges();
    selection.addRange(range);

    savedSelectionRef.current = range.cloneRange();
  }, []);

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

  const synchroniseEditorValue = useCallback(() => {
    if (!editorRef.current) return;
    const updatedHtml = editorRef.current.innerHTML;
    emitChange(updatedHtml);
    saveSelection();
  }, [emitChange, saveSelection]);

  const insertCanvasItem = useCallback(
    (itemHtml) => {
      const editor = editorRef.current;
      if (!editor) return;
      // On the browser page every link is the compromise action.
      const html =
        currentPageIdRef.current === BROWSER_PAGE_ID ? toBrowserPageHtml(itemHtml) : itemHtml;

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
    [synchroniseEditorValue],
  );

  useLayoutEffect(() => {
    if (rawHtmlMode || !editorRef.current) return;
    const target = pagesRef.current.find((p) => p.id === currentPageId);
    let htmlToSync = target ? (target.html || "") : internalHtmlRef.current;
    if (htmlToSync && !htmlToSync.includes("vshield-canvas-item") && !EMPTY_HTML_VALUES.includes(htmlToSync.trim().toLowerCase())) {
      htmlToSync = componentizeTemplateHtml(htmlToSync);
      if (currentPageId === BROWSER_PAGE_ID) htmlToSync = toBrowserPageHtml(htmlToSync);
    }
    if (editorRef.current.innerHTML !== htmlToSync) {
      editorRef.current.innerHTML = htmlToSync;
    }
    internalHtmlRef.current = htmlToSync;
    setRawHtmlCode(htmlToSync);
  }, [rawHtmlMode, isExpanded, currentPageId]);

  // The email changed from outside (a scenario loaded, a draft restored).
  useEffect(() => {
    if (value === undefined) return;
    const onEmail = currentPageIdRef.current === EMAIL_PAGE_ID;
    const known = onEmail
      ? internalHtmlRef.current
      : pagesRef.current.find((p) => p.id === EMAIL_PAGE_ID)?.html;
    if (value === known) return;
    let finalVal = value;
    if (finalVal && !finalVal.includes("vshield-canvas-item") && !EMPTY_HTML_VALUES.includes(finalVal.trim().toLowerCase())) {
      finalVal = componentizeTemplateHtml(finalVal);
    }
    if (onEmail) {
      internalHtmlRef.current = finalVal;
      if (editorRef.current && !rawHtmlMode) {
        editorRef.current.innerHTML = finalVal;
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
    const incoming = browserPage || "";
    const stored = pagesRef.current.find((p) => p.id === BROWSER_PAGE_ID);
    if (stored ? stored.html === incoming : isBlankHtml(incoming)) return;
    const onBrowser = currentPageIdRef.current === BROWSER_PAGE_ID;

    if (isBlankHtml(incoming)) {
      pagesRef.current = pagesRef.current.filter((p) => p.id !== BROWSER_PAGE_ID);
      setPages(pagesRef.current);
      forgetPageHistory(BROWSER_PAGE_ID);
      if (onBrowser) {
        const email = pagesRef.current.find((p) => p.id === EMAIL_PAGE_ID)?.html || "";
        currentPageIdRef.current = EMAIL_PAGE_ID;
        setCurrentPageId(EMAIL_PAGE_ID);
        internalHtmlRef.current = email;
        if (editorRef.current && !rawHtmlMode) editorRef.current.innerHTML = email;
        setRawHtmlCode(email);
        publishHistory(EMAIL_PAGE_ID);
      }
      return;
    }

    pagesRef.current = stored
      ? pagesRef.current.map((p) => (p.id === BROWSER_PAGE_ID ? { ...p, html: incoming } : p))
      : [...pagesRef.current, { id: BROWSER_PAGE_ID, name: PAGE_LABELS[BROWSER_PAGE_ID], html: incoming }];
    setPages(pagesRef.current);
    resetPageHistory(BROWSER_PAGE_ID, incoming);
    if (onBrowser && incoming !== internalHtmlRef.current) {
      internalHtmlRef.current = incoming;
      if (editorRef.current && !rawHtmlMode) editorRef.current.innerHTML = incoming;
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
    const workspaceRect = workspaceRef.current?.getBoundingClientRect();

    if (workspaceRect) {
      setSelectionColorMenu({
        visible: true,
        top: Math.max(10, rect.top - workspaceRect.top - 46),
        left: Math.max(10, rect.left - workspaceRect.left),
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
      document.execCommand("foreColor", false, color);
      synchroniseEditorValue();
    } catch (e) {
      console.error(e);
    }
  };

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

  const handleClearAllCanvas = () => {
    internalHtmlRef.current = "";
    if (editorRef.current) {
      editorRef.current.innerHTML = "";
    }
    setRawHtmlCode("");
    setActiveElement(null);

    const updated = pagesRef.current.map((p) =>
      p.id === currentPageIdRef.current ? { ...p, html: "" } : p
    );
    pagesRef.current = updated;
    setPages(updated);

    emitChange("");
    showToast(`Erased active page.`, "success");
  };

  // 🌟 Select template and decompose every element into standalone components
  const chooseEmailBody = (option) => {
    setShowBodyMenu(false);
    if (!option?.html) return;
    let componentized = componentizeTemplateHtml(option.html);
    if (currentPageIdRef.current === BROWSER_PAGE_ID) {
      componentized = toBrowserPageHtml(componentized);
    }
    internalHtmlRef.current = componentized;
    if (editorRef.current) {
      editorRef.current.innerHTML = componentized;
    }
    setRawHtmlCode(componentized);
    emitChange(componentized);
    setActiveElement(null);
    showToast(`Applied "${option.name}".`, "success");
  };

  const runCommand = useCallback(
    (command, commandValue = null) => {
      if (disabled || rawHtmlMode) return;
      restoreSelection();

      try {
        document.execCommand(command, false, commandValue);
      } catch (error) {
        console.error(`Editor command failed: ${command}`, error);
      }

      synchroniseEditorValue();
    },
    [disabled, rawHtmlMode, restoreSelection, synchroniseEditorValue],
  );

  const handleToolbarMouseDown = (event) => {
    event.preventDefault();
  };

  const handleEditorInput = () => {
    typingRef.current = true;
    synchroniseEditorValue();
  };

  const handleEditorBlur = () => {
    saveSelection();
    if (!editorRef.current) return;
    emitChange(editorRef.current.innerHTML);
  };

  // Pasted HTML keeps its formatting; plain text is escaped, line breaks kept.
  const handlePaste = (event) => {
    if (disabled || rawHtmlMode) return;
    const clipboardData = event.clipboardData;
    if (!clipboardData) return;

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
    if (disabled) return;

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

    restoreSelection();
    const spanHtml = `<span style="background-color: rgba(153,0,153,0.12); color: #990099; font-weight: bold; padding: 1px 5px; border-radius: 4px; font-family: monospace;">${param.label}</span>&nbsp;`;
    document.execCommand("insertHTML", false, spanHtml);
    synchroniseEditorValue();
  };

  const insertTextBox = () => {
    if (disabled || rawHtmlMode) return;

    const textId = `txt-${Date.now()}`;
    const textHtml = `
      <div id="${textId}" class="vshield-canvas-item vshield-textbox" data-type="text" style="position: relative; display: inline-block; min-width: 220px; max-width: 100%; padding: 8px 12px; margin: 10px 0; cursor: move; border: 1px dashed rgba(100,116,139,0.35); border-radius: 6px; background-color: transparent; box-shadow: none;">
        <div contenteditable="true" spellcheck="true" style="outline: none; cursor: text; font-size: 14px; line-height: 1.5; color: #1E293B;">Click here to edit text...</div>
      </div><p><br></p>
    `;

    insertCanvasItem(textHtml);
    showToast("Text box added. Click inside to edit.", "success");
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

    const buttonHtml = `
      <div id="${buttonId}" class="vshield-canvas-item vshield-custom-btn" data-type="button" data-action="landing" data-url="{{phishLink}}" style="position: relative; display: inline-block; margin: 14px 0; cursor: move; user-select: none; box-shadow: none;">
        <a href="{{phishLink}}" onclick="return false;" style="display: inline-block; padding: 10px 26px; background-color: #E60000; color: #FFFFFF; font-family: 'Vodafone ExB', Arial, sans-serif; font-size: 13px; font-weight: 800; text-decoration: none; border-radius: ${borderRadius}; text-align: center; border: none; cursor: pointer; box-shadow: none;" contenteditable="true" spellcheck="false">Click Here to Verify</a>
      </div><p><br></p>
    `;

    insertCanvasItem(buttonHtml);
    showToast("Button added. Click to edit text or set On Click.", "success");
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

    insertCanvasItem(elemHtml);
    showToast("Phishing element inserted. Sub-items are fully modular.", "success");
  };

  // The toolbar's picture button: the file goes to picture hosting and the
  // email or page links to it (never a copy inside the HTML, which breaks
  // the size limit and is not shown by Gmail).
  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
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
        <div id="${imageId}" class="vshield-canvas-item" data-type="image" style="position: relative; display: inline-block; max-width: 100%; margin: 12px 0; cursor: move; text-align: center; box-shadow: none;">
          <img src="${url}" alt="${alt}" style="display: block; width: 240px; height: auto; border-radius: 8px; pointer-events: none; box-shadow: none;" />
        </div><p><br></p>
      `);
      showToast("Picture added. Click it to resize or move.", "success");
    } catch (error) {
      showToast(error?.message || "The picture couldn't be uploaded.", "error");
    } finally {
      setPictureBusy(null);
    }
  };

  const handleCanvasClick = (e) => {
    const target = e.target;
    if (target.closest("[data-floating-control]")) {
      return;
    }

    const canvasItem =
      target.closest(".vshield-canvas-item") ||
      (target.tagName === "IMG" ? target.parentElement : null);

    if (canvasItem && editorRef.current?.contains(canvasItem)) {
      e.stopPropagation();
      const rect = canvasItem.getBoundingClientRect();
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
        width: rect.width,
        height: rect.height,
        color: currentBg,
        borderRadius: currentRadius,
      });

      setAspectRatioText(calculateAspectRatio(rect.width, rect.height));
      setShowShadowMenu(false);
      setShowRoundedMenu(false);
      setShowBorderMenu(false);
    } else {
      setActiveElement(null);
      setShowShadowMenu(false);
      setShowRoundedMenu(false);
      setShowBorderMenu(false);
    }
  };

  const startDragItem = (e) => {
    if (!activeElement?.element || !workspaceRef.current) return;
    e.preventDefault();
    e.stopPropagation();

    const targetEl = activeElement.element;
    const initialX = e.clientX;
    const initialY = e.clientY;

    const currentLeft = parseFloat(targetEl.style.left) || 0;
    const currentTop = parseFloat(targetEl.style.top) || 0;

    const container = editorRef.current || workspaceRef.current;
    const containerRect = container.getBoundingClientRect();
    const targetRect = targetEl.getBoundingClientRect();

    const baseLeft = (targetRect.left - currentLeft) - containerRect.left;
    const baseTop = (targetRect.top - currentTop) - containerRect.top;

    const minLeft = -baseLeft + 4;
    const maxLeft = container.clientWidth - baseLeft - targetRect.width - 8;
    const minTop = -baseTop + 4;

    const onMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - initialX;
      const deltaY = moveEvent.clientY - initialY;

      const clampedLeft = Math.max(minLeft, Math.min(maxLeft, currentLeft + deltaX));
      const clampedTop = Math.max(minTop, currentTop + deltaY);

      targetEl.style.position = "relative";
      targetEl.style.left = `${clampedLeft}px`;
      targetEl.style.top = `${clampedTop}px`;
    };

    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      synchroniseEditorValue();
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const startResizeItem = (e, corner) => {
    if (!activeElement?.element || !workspaceRef.current) return;
    e.preventDefault();
    e.stopPropagation();

    const targetEl = activeElement.element;
    const container = editorRef.current || workspaceRef.current;
    const containerRect = container.getBoundingClientRect();
    const elemRect = targetEl.getBoundingClientRect();
    const isImage =
      targetEl.getAttribute("data-type") === "image" ||
      targetEl.querySelector("img");
    const innerImg = targetEl.querySelector("img");
    const innerA = targetEl.querySelector("a");
    const isInput = targetEl.getAttribute("data-type") === "input";
    const innerInput = isInput ? targetEl.querySelector("input") : null;

    const startWidth = targetEl.offsetWidth;
    const startHeight = targetEl.offsetHeight;
    const startX = e.clientX;
    const startY = e.clientY;

    const offsetFromLeft = elemRect.left - containerRect.left;
    const maxAvailableWidth = Math.max(40, container.clientWidth - Math.max(0, offsetFromLeft) - 16);

    const onMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      let newWidth = Math.max(
        40,
        startWidth + (corner.includes("right") ? deltaX : -deltaX),
      );
      newWidth = Math.min(newWidth, maxAvailableWidth);

      let newHeight = Math.max(
        24,
        startHeight + (corner.includes("bottom") ? deltaY : -deltaY),
      );

      targetEl.style.width = `${newWidth}px`;
      targetEl.style.maxWidth = "100%";
      targetEl.style.boxSizing = "border-box";
      if (innerA) {
        innerA.style.width = "100%";
        innerA.style.boxSizing = "border-box";
        innerA.style.minHeight = `${newHeight}px`;
        innerA.style.display = "flex";
        innerA.style.alignItems = "center";
        innerA.style.justifyContent = "center";
      } else if (innerInput) {
        innerInput.style.width = "100%";
        innerInput.style.boxSizing = "border-box";
        innerInput.style.height = `${newHeight}px`;
      } else if (!isImage) {
        targetEl.style.height = `${newHeight}px`;
      } else if (innerImg) {
        innerImg.style.width = `${newWidth}px`;
        innerImg.style.height = "auto";
        newHeight = innerImg.offsetHeight;
      }

      setActiveElement((prev) => (prev ? { ...prev, width: newWidth, height: newHeight } : null));
      setAspectRatioText(calculateAspectRatio(newWidth, newHeight));
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
    const isImage = targetEl.getAttribute("data-type") === "image" || targetEl.querySelector("img");
    const innerA = targetEl.querySelector("a");
    const isInput = targetEl.getAttribute("data-type") === "input";
    const innerInput = isInput ? targetEl.querySelector("input") : null;
    const innerImg = targetEl.querySelector("img");
    const newPx = Math.max(20, Math.round(parseFloat(valCm) * PX_PER_CM));

    if (type === "width") {
      targetEl.style.width = `${newPx}px`;
      if (innerA) innerA.style.width = "100%";
      if (innerInput) innerInput.style.width = "100%";
      if (innerImg) innerImg.style.width = `${newPx}px`;
      setActiveElement((prev) => (prev ? { ...prev, width: newPx } : null));
    } else {
      if (!isImage) {
        targetEl.style.height = `${newPx}px`;
      }
      if (innerA) innerA.style.minHeight = `${newPx}px`;
      if (innerInput) innerInput.style.height = `${newPx}px`;
      setActiveElement((prev) => (prev ? { ...prev, height: newPx } : null));
    }
    synchroniseEditorValue();
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

  const updateZIndex = (action) => {
    if (!activeElement?.element) return;
    const target = activeElement.element;
    const currentZ = parseInt(target.style.zIndex) || 10;
    if (action === "front") target.style.zIndex = "50";
    else if (action === "back") target.style.zIndex = "1";
    else if (action === "forward") target.style.zIndex = `${Math.min(50, currentZ + 2)}`;
    else if (action === "backward") target.style.zIndex = `${Math.max(1, currentZ - 2)}`;
    synchroniseEditorValue();
    showToast(`Layer adjusted.`, "success");
  };

  const duplicateActiveItem = () => {
    if (!activeElement?.element) return;
    const clone = activeElement.element.cloneNode(true);
    const newId = `dup-${Date.now()}`;
    clone.id = newId;

    const currentLeft = parseFloat(activeElement.element.style.left) || 0;
    const currentTop = parseFloat(activeElement.element.style.top) || 0;
    clone.style.position = "relative";
    clone.style.left = `${currentLeft + 16}px`;
    clone.style.top = `${currentTop + 16}px`;

    activeElement.element.parentNode.insertBefore(clone, activeElement.element.nextSibling);
    synchroniseEditorValue();

    const rect = clone.getBoundingClientRect();
    setActiveElement({
      element: clone,
      type: clone.getAttribute("data-type") || "shape",
      width: rect.width,
      height: rect.height,
      color: clone.style.backgroundColor,
      borderRadius: clone.style.borderRadius,
    });
    showToast("Element duplicated.", "success");
  };

  const alignElement = (direction) => {
    if (!activeElement?.element || !workspaceRef.current) return;
    const target = activeElement.element;
    const container = editorRef.current || workspaceRef.current;
    target.style.position = "relative";

    if (direction === "center-h") {
      const centerLeft = Math.max(0, (container.clientWidth - target.offsetWidth) / 2);
      target.style.left = `${Math.round(centerLeft)}px`;
    } else if (direction === "center-v") {
      const centerTop = Math.max(10, (container.clientHeight - target.offsetHeight) / 2);
      target.style.top = `${Math.round(centerTop)}px`;
    }
    synchroniseEditorValue();
    showToast("Aligned to center.", "success");
  };

  const getCurrentRadius = () => {
    if (!activeElement?.element) return "0px";
    if (activeElement.borderRadius !== undefined) return activeElement.borderRadius;
    const innerA = activeElement.element.querySelector("a");
    const innerImg = activeElement.element.querySelector("img");
    const el = innerA || innerImg || activeElement.element;
    return el.style.borderRadius || window.getComputedStyle(el).borderRadius || "0px";
  };

  const deleteActiveItem = () => {
    if (!activeElement?.element) return;
    activeElement.element.remove();
    setActiveElement(null);
    setShowShadowMenu(false);
    setShowRoundedMenu(false);
    setShowBorderMenu(false);
    synchroniseEditorValue();
    showToast("Item deleted.", "success");
  };

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
      actionType: onBrowser ? "training" : current === "page" ? "page" : "landing",
    });
  };

  // The element's On-Click, as the link it carries: email clients and the
  // served browser page only ever follow links, never scripts.
  //   email  landing  {{phishLink}}              -> click, landing page
  //   email  page     {{phishLink}}?next=browser -> click, browser page
  //   page 2 training {{compromiseLink}}         -> compromised, landing page
  const saveActionConfig = () => {
    const targetEl = actionConfigModal.element || activeElement?.element;
    if (!targetEl) return;
    const onBrowser = currentPageIdRef.current === BROWSER_PAGE_ID;
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
    });

    setActionConfigModal(CLOSED_ACTION_MODAL);
    synchroniseEditorValue();

    if (action === "page" && !pagesRef.current.some((p) => p.id === BROWSER_PAGE_ID)) {
      setShowNewPageModal(true);
      showToast("On Click saved. Now design the browser page it opens.", "info");
    } else {
      showToast("On Click action saved.", "success");
    }
  };

  const editorIsEmpty =
    EMPTY_HTML_VALUES.includes((internalHtmlRef.current || "").trim().toLowerCase()) &&
    !editorRef.current?.querySelector(".vshield-canvas-item");

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
        defaultValue="<p>"
        disabled={disabled || rawHtmlMode}
        onMouseDown={saveSelection}
        onChange={(event) => runCommand("formatBlock", event.target.value)}
        className="px-1 py-0.5 rounded bg-[#181A20] dark:bg-white text-white dark:text-black border-white/20 dark:border-black/20 text-[8.5px] font-bold border outline-none cursor-pointer flex-shrink-0 max-w-[58px]"
        title="Paragraph format"
      >
        <option value="<p>">Paragraph</option>
        <option value="<h1>">Heading 1</option>
        <option value="<h2>">Heading 2</option>
        <option value="<h3>">Heading 3</option>
        <option value="<blockquote>">Quote</option>
      </select>

      <select
        defaultValue="Vodafone, sans-serif"
        disabled={disabled || rawHtmlMode}
        onMouseDown={saveSelection}
        onChange={(event) => runCommand("fontName", event.target.value)}
        className="px-1 py-0.5 rounded bg-[#181A20] dark:bg-white text-white dark:text-black border-white/20 dark:border-black/20 text-[8.5px] font-bold border outline-none cursor-pointer max-w-[66px] flex-shrink-0"
        title="Font family"
      >
        {FONT_OPTIONS.map((f) => (
          <option key={f.label} value={f.value}>
            {f.label}
          </option>
        ))}
      </select>

      <select
        defaultValue="3"
        disabled={disabled || rawHtmlMode}
        onMouseDown={saveSelection}
        onChange={(event) => runCommand("fontSize", event.target.value)}
        className="px-1 py-0.5 rounded bg-[#181A20] dark:bg-white text-white dark:text-black border-white/20 dark:border-black/20 text-[8.5px] font-bold border outline-none cursor-pointer flex-shrink-0 max-w-[38px]"
        title="Font size"
      >
        {FONT_SIZES.map((s, idx) => (
          <option key={`${s.label}-${idx}`} value={s.value}>
            {s.label}
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

      <div className="h-3.5 w-px bg-white/20 flex-shrink-0" />

      <button
        type="button"
        disabled={disabled || rawHtmlMode}
        onMouseDown={handleToolbarMouseDown}
        onClick={() => runCommand("justifyLeft")}
        className="p-1 rounded hover:bg-white/10 cursor-pointer bg-[#181A20] dark:bg-white text-white dark:text-black flex-shrink-0"
        title="Align left"
      >
        <AlignLeft className="h-3 w-3" />
      </button>
      <button
        type="button"
        disabled={disabled || rawHtmlMode}
        onMouseDown={handleToolbarMouseDown}
        onClick={() => runCommand("justifyCenter")}
        className="p-1 rounded hover:bg-white/10 cursor-pointer bg-[#181A20] dark:bg-white text-white dark:text-black flex-shrink-0"
        title="Align center"
      >
        <AlignCenter className="h-3 w-3" />
      </button>
      <button
        type="button"
        disabled={disabled || rawHtmlMode}
        onMouseDown={handleToolbarMouseDown}
        onClick={() => runCommand("justifyRight")}
        className="p-1 rounded hover:bg-white/10 cursor-pointer bg-[#181A20] dark:bg-white text-white dark:text-black flex-shrink-0"
        title="Align right"
      >
        <AlignRight className="h-3 w-3" />
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
          title="Use an email body from the template library"
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
              Email Body Templates
            </span>
            {emailBodyTemplates.map((option) => {
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
                </button>
              );
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
                    setCanvasBgColor(c);
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
                onChange={(e) => setCanvasBgColor(e.target.value)}
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
  const renderToolbar = () => (
    <div className="relative z-30 flex w-full min-h-[34px] flex-shrink-0 flex-wrap items-start gap-x-1 gap-y-1 rounded-t-2xl border-b border-white/10 dark:border-black/10 bg-[#202127] dark:bg-white px-1.5 py-1 text-white select-none">
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

  // Universal Floating Controller for Selected Elements (PowerPoint style)
  const renderFloatingObjectControls = () => {
    if (!activeElement?.element) return null;

    const targetRect = activeElement.element.getBoundingClientRect();
    const workspaceRect = workspaceRef.current?.getBoundingClientRect();
    if (!workspaceRect) return null;

    const top = targetRect.top - workspaceRect.top;
    const left = targetRect.left - workspaceRect.left;

    const spaceAbove = top;
    const spaceBelow = workspaceRect.height - (top + targetRect.height);

    const isActionBarAbove = spaceBelow < 45 && spaceAbove > 45;
    const openMenuUpward = isActionBarAbove
      ? spaceAbove > 180
      : spaceBelow < 180 && spaceAbove > 180;

    const widthCm = (activeElement.width / PX_PER_CM).toFixed(2);
    const heightCm = (activeElement.height / PX_PER_CM).toFixed(2);

    return (
      <div
        data-floating-control="true"
        style={{
          position: "absolute",
          top: `${Math.max(0, top)}px`,
          left: `${Math.max(0, left)}px`,
          width: `${targetRect.width}px`,
          height: `${targetRect.height}px`,
          pointerEvents: "none",
          border: "2px dashed #2563EB",
          zIndex: 40,
        }}
      >
        <div
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          style={{
            top: top < 26 ? "4px" : "-26px",
            left: "2px",
          }}
          className="absolute bg-[#1A1C23] text-white px-2 py-0.5 rounded text-[8.5px] font-mono-tech whitespace-nowrap shadow-lg pointer-events-auto flex items-center gap-1.5 border border-white/20 select-none"
        >
          <div className="flex items-center gap-0.5">
            <span className="text-slate-400">W:</span>
            <input
              type="number"
              step="0.05"
              value={widthCm}
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
              value={heightCm}
              onChange={(e) => setDimensionsCm("height", e.target.value)}
              className="w-11 px-1 py-0 bg-black/60 rounded border border-white/20 text-[8.5px] text-white outline-none"
            />
            <span className="text-slate-400">cm</span>
          </div>
          <span className="text-emerald-400 font-bold ml-1">({aspectRatioText})</span>
        </div>

        <div
          onMouseDown={startDragItem}
          onClick={(e) => e.stopPropagation()}
          style={{
            top: top < 16 ? "2px" : "-12px",
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
                key={color}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  updateActiveItemColor(color);
                }}
                style={{ backgroundColor: color }}
                className="w-4 h-4 rounded-full border border-white/30 cursor-pointer hover:scale-110"
                title={`Apply ${color}`}
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
                <span className="text-[7.5px] font-mono-tech uppercase text-slate-400">Width</span>
                <div className="flex gap-1">
                  {BORDER_WIDTHS.map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => updateActiveItemBorder(undefined, w, undefined)}
                      className="px-1.5 py-0.5 text-[8px] bg-white/10 rounded hover:bg-white/20 text-white cursor-pointer"
                    >
                      {w}
                    </button>
                  ))}
                </div>
                <span className="text-[7.5px] font-mono-tech uppercase text-slate-400 mt-1">Style</span>
                <div className="flex gap-1">
                  {BORDER_STYLES.map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => updateActiveItemBorder(st, undefined, undefined)}
                      className="px-1.5 py-0.5 text-[8px] bg-white/10 rounded hover:bg-white/20 text-white cursor-pointer"
                    >
                      {st}
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
                  <span className="text-white font-bold">{getCurrentRadius() === "9999px" ? "Pill" : getCurrentRadius()}</span>
                </div>
                <div className="flex items-center gap-1.5 py-0.5">
                  <input
                    type="range"
                    min="0"
                    max="50"
                    value={getCurrentRadius() === "9999px" ? 50 : Math.min(50, parseInt(getCurrentRadius()) || 0)}
                    onChange={(e) => updateActiveItemRoundedness(`${e.target.value}px`, false)}
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
            onClick={duplicateActiveItem}
            className="p-1 hover:bg-white/10 rounded text-slate-300 hover:text-white cursor-pointer"
            title="Duplicate (Ctrl+D)"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>

          {/* On Click */}
          <button
            type="button"
            onClick={openActionModal}
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
              <div className="flex items-start gap-2 p-2.5 rounded-lg border border-amber-400/30 bg-amber-500/10">
                <ShieldAlert className="w-4 h-4 text-amber-300 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Mark compromised, then the landing page and My Training</span>
                  <span className="text-[10px] text-slate-300 block mt-0.5">
                    Every button and link on the browser page does this. The employee is marked
                    compromised, sees the campaign's landing page (Oops), and goes on to My Training.
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Nothing typed on this page is ever sent or stored.
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2 text-xs">
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
                  <span className="font-bold block">Add one more page for compromised part</span>
                  <span className="text-[10px] text-slate-400">
                    Records the click, then opens a fake page (e.g. a sign-in form) in the employee's
                    browser. Submitting it marks them compromised.
                    {hasBrowserPage ? "" : " You design that page next."}
                  </span>
                </div>
              </label>
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
                  It opens in the employee's browser from an email element. Any button or link on it marks
                  them compromised, then shows the landing page. Nothing typed is sent or stored.
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
          ${expanded ? "h-[calc(100vh-80px)]" : "h-[220px]"}
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

        <div
          ref={workspaceRef}
          onClick={handleCanvasClick}
          style={{ backgroundColor: canvasBgColor }}
          className={`
            relative min-w-0 w-full flex-1 p-2
            rounded-b-2xl border-t border-slate-200 dark:border-white/10
            overflow-hidden transition-colors duration-200
            ${expanded ? "min-h-0" : ""}
          `}
        >
          {showGridlines && (
            <div
              style={{
                backgroundImage: `linear-gradient(to right, rgba(100, 116, 139, 0.12) 1px, transparent 1px),
                                  linear-gradient(to bottom, rgba(100, 116, 139, 0.12) 1px, transparent 1px)`,
                backgroundSize: "20px 20px",
              }}
              className="pointer-events-none absolute inset-0 z-10"
            />
          )}

          {renderFloatingObjectControls()}
          {renderFloatingTextSelectionColorBar()}

          <div className="w-full h-full overflow-y-auto vshield-canvas-scroll relative z-0">
            {rawHtmlMode ? (
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
            ) : (
              <>
                {editorIsEmpty && (
                  <div className="pointer-events-none absolute left-4 top-4 z-10 text-xs text-slate-400">
                    {currentPageId === BROWSER_PAGE_ID
                      ? "Design the browser page: pick a sign-in or 2FA screen from Templates, or build one. Every button marks the employee compromised."
                      : placeholder}
                  </div>
                )}

                <div
                  ref={editorRef}
                  contentEditable={!disabled}
                  suppressContentEditableWarning
                  role="textbox"
                  aria-label={
                    currentPageId === BROWSER_PAGE_ID
                      ? "Browser page rich text editor"
                      : "Email body rich text editor"
                  }
                  aria-multiline="true"
                  spellCheck
                  onInput={handleEditorInput}
                  onKeyUp={saveSelection}
                  onMouseUp={saveSelection}
                  onFocus={saveSelection}
                  onBlur={handleEditorBlur}
                  onPaste={handlePaste}
                  style={{ backgroundColor: canvasBgColor }}
                  className={`
                    vshield-editor-canvas
                    w-full h-full outline-none
                    text-slate-900 dark:text-slate-100 p-2 leading-normal text-xs
                    [&_a]:text-blue-600 [&_a]:underline
                    [&_blockquote]:border-l-4 [&_blockquote]:border-slate-300 [&_blockquote]:pl-4
                    [&_h1]:my-2 [&_h1]:text-2xl [&_h1]:font-bold
                    [&_h2]:my-2 [&_h2]:text-xl [&_h2]:font-bold
                    [&_h3]:my-1.5 [&_h3]:text-lg [&_h3]:font-bold
                    [&_p]:my-1
                    ${disabled ? "cursor-not-allowed bg-slate-100 opacity-70" : "cursor-text"}
                  `}
                />

                {/* Missing pictures: a light dashed outline where each one is, with an
                    Upload button (never saved: outside the editable canvas) */}
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

                {/* Browser safe-zone guide: where the employee has to start scrolling (never saved) */}
                {currentPageId === BROWSER_PAGE_ID && (
                <div
                  data-floating-control="true"
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    top: `${BROWSER_SAFE_ZONE_PX}px`,
                    left: 0,
                    right: 0,
                    pointerEvents: "none",
                    zIndex: 5,
                  }}
                  className="flex items-center select-none"
                >
                  <div
                    className={`w-full border-t-2 border-dashed ${
                      safeZoneOverflow ? "border-amber-500/90" : "border-emerald-500/80"
                    }`}
                  />
                  <span
                    className={`absolute right-3 -top-2.5 whitespace-nowrap rounded px-2 py-0.5 font-mono-tech text-[8.5px] font-bold uppercase tracking-wider text-white shadow-xs ${
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
              </>
            )}
          </div>
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