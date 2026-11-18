import { CreditCard, Download, FileSignature, FormInput, Gift, Headset, KeyRound, Mail, MousePointerClick, Paperclip, PhoneCall, Plane, QrCode, Reply, Workflow } from 'lucide-react';

// An icon for each type of email (services/scenarioOptions.js), and for the
// older names a few campaigns may still carry; a plain envelope for any
// other ("Custom", "Phishing Simulation").
const TYPE_ICON = {
  Click: MousePointerClick,
  'Data Entry': FormInput,
  Attachment: Paperclip,
  'Reply Based': Reply,
  'QR Code': QrCode,
  Download,
  'Consent / Authorization': FileSignature,
  'Call / Callback': PhoneCall,
  'Payment / Transaction': CreditCard,
  'Multi-Step': Workflow,
  'Credential theft': KeyRound,
  'Helpdesk impersonation': Headset,
  'Reward scam': Gift,
  'Travel scam': Plane,
};

export const lureIcon = (type) => TYPE_ICON[type] || Mail;
