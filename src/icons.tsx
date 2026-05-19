/**
 * iOS-Premium icon set — powered by Phosphor Icons (fill / bold weights).
 * All exports use the same names as the original lucide-react imports so every
 * component file only needs its import path changed — nothing else.
 *
 * Weight strategy
 *   fill  → "shape" icons: Bell, Calendar, User, Shield, etc.
 *   bold  → stroke/directional icons: arrows, Check, X, Plus, etc.
 */
import React from 'react';
import {
  ArrowDownRight as PhArrowDownRight,
  ArrowLeft      as PhArrowLeft,
  ArrowRight     as PhArrowRight,
  ArrowUpRight   as PhArrowUpRight,
  Bell           as PhBell,
  Buildings      as PhBuildings,
  Calculator     as PhCalculator,
  Calendar       as PhCalendar,
  CalendarPlus   as PhCalendarPlus,
  Camera         as PhCamera,
  CaretLeft      as PhCaretLeft,
  CaretDown      as PhCaretDown,
  CaretRight     as PhCaretRight,
  ChatCircle     as PhChatCircle,
  Check          as PhCheck,
  CheckCircle    as PhCheckCircle,
  Checks         as PhChecks,
  Circle         as PhCircle,
  CircleNotch    as PhCircleNotch,
  ClipboardText  as PhClipboardText,
  Clock          as PhClock,
  CreditCard     as PhCreditCard,
  CurrencyDollar as PhCurrencyDollar,
  DotsThree      as PhDotsThree,
  DownloadSimple as PhDownloadSimple,
  Envelope       as PhEnvelope,
  FileText       as PhFileText,
  Flask          as PhFlask,
  GearSix        as PhGearSix,
  Heart          as PhHeart,
  Heartbeat      as PhHeartbeat,
  House          as PhHouse,
  Image          as PhImage,
  Info           as PhInfo,
  Lightning      as PhLightning,
  Link           as PhLink,
  List           as PhList,
  Lock           as PhLock,
  MagnifyingGlass as PhMagnifyingGlass,
  MapPin         as PhMapPin,
  Palette        as PhPalette,
  PaperPlaneTilt as PhPaperPlaneTilt,
  Pen            as PhPen,
  PencilSimple   as PhPencilSimple,
  Phone          as PhPhone,
  Pill           as PhPill,
  Plus           as PhPlus,
  Printer        as PhPrinter,
  Rocket         as PhRocket,
  SealCheck      as PhSealCheck,
  Shield         as PhShield,
  SignOut        as PhSignOut,
  Sparkle        as PhSparkle,
  Stethoscope    as PhStethoscope,
  Tag            as PhTag,
  Target         as PhTarget,
  ThumbsUp       as PhThumbsUp,
  Trash          as PhTrash,
  TrendUp        as PhTrendUp,
  UploadSimple   as PhUploadSimple,
  User           as PhUser,
  UserCircle     as PhUserCircle,
  UserGear       as PhUserGear,
  UserMinus      as PhUserMinus,
  UserPlus       as PhUserPlus,
  Users          as PhUsers,
  Wallet         as PhWallet,
  Warning        as PhWarning,
  WarningCircle  as PhWarningCircle,
  X              as PhX,
  Tooth          as PhTooth,
  Syringe        as PhSyringe,
  DotsSixVertical as PhDotsSixVertical,
} from '@phosphor-icons/react';

// ─── Prop types ──────────────────────────────────────────────────────────────

type IconProps = {
  size?: number | string;
  className?: string;
  color?: string;
  style?: React.CSSProperties;
  /** lucide-react compat — accepted but ignored by Phosphor */
  strokeWidth?: number;
};

// ─── Factories ───────────────────────────────────────────────────────────────

function fill(Ph: React.ElementType) {
  return function FilledIcon({ strokeWidth: _sw, ...props }: IconProps) {
    return React.createElement(Ph, { weight: 'fill', ...props });
  };
}

function bold(Ph: React.ElementType) {
  return function BoldIcon({ strokeWidth: _sw, ...props }: IconProps) {
    return React.createElement(Ph, { weight: 'bold', ...props });
  };
}

// ─── Bold (directional / stroke) ─────────────────────────────────────────────

export const ChevronRight   = bold(PhCaretRight);
export const ChevronDown    = bold(PhCaretDown);
export const ChevronLeft    = bold(PhCaretLeft);
export const ArrowRight     = bold(PhArrowRight);
export const ArrowLeft      = bold(PhArrowLeft);
export const ArrowUpRight   = bold(PhArrowUpRight);
export const ArrowDownRight = bold(PhArrowDownRight);
export const X              = bold(PhX);
export const Check          = bold(PhCheck);
export const Plus           = bold(PhPlus);
export const List           = bold(PhList);
export const CheckCheck     = bold(PhChecks);

// ─── Fill (shape / feature) ───────────────────────────────────────────────────

export const Activity      = fill(PhHeartbeat);     // EKG/health icon
export const TrendingUp    = fill(PhTrendUp);
export const Users         = fill(PhUsers);
export const Calendar      = fill(PhCalendar);
export const CalendarDays  = fill(PhCalendar);      // alias
export const CalendarPlus  = fill(PhCalendarPlus);
export const CalendarIcon  = fill(PhCalendar);      // alias (Documents.tsx)
export const ClipboardList = fill(PhClipboardText);
export const BookOpen      = fill(PhClipboardText);
export const DollarSign    = fill(PhCurrencyDollar);
export const Search        = fill(PhMagnifyingGlass);
export const MessageCircle = fill(PhChatCircle);
export const Clock         = fill(PhClock);
export const Clock3        = fill(PhClock);         // alias
export const CheckCircle   = fill(PhCheckCircle);
export const CheckCircle2  = fill(PhCheckCircle);   // alias
export const AlertCircle   = fill(PhWarningCircle);
export const AlertTriangle = fill(PhWarning);
export const LogOut        = fill(PhSignOut);
export const Settings      = fill(PhGearSix);
export const Bell          = fill(PhBell);
export const Lock          = fill(PhLock);
export const Trash2        = fill(PhTrash);
export const Printer       = fill(PhPrinter);
export const Upload        = fill(PhUploadSimple);
export const FileText      = fill(PhFileText);
export const FileCheck     = fill(PhSealCheck);     // approved/verified doc
export const Phone         = fill(PhPhone);
export const MapPin        = fill(PhMapPin);
export const Building2     = fill(PhBuildings);
export const Shield        = fill(PhShield);
export const Home          = fill(PhHouse);
export const Sparkles      = fill(PhSparkle);
export const UserCog       = fill(PhUserGear);
export const UserCircle    = fill(PhUserCircle);
export const UserPlus      = fill(PhUserPlus);
export const UserX         = fill(PhUserMinus);
export const Camera        = fill(PhCamera);
export const Pencil        = fill(PhPencilSimple);
export const Mail          = fill(PhEnvelope);
export const Download      = fill(PhDownloadSimple);
export const Image         = fill(PhImage);
export const ImageIcon     = fill(PhImage);         // alias (App.tsx)
export const Info          = fill(PhInfo);
export const Circle        = fill(PhCircle);
export const CreditCard    = fill(PhCreditCard);
export const WalletCards   = fill(PhWallet);
export const UserRound     = fill(PhUser);          // alias
export const User          = fill(PhUser);
export const ThumbsUp      = fill(PhThumbsUp);
export const Stethoscope   = fill(PhStethoscope);
export const Tag           = fill(PhTag);
export const Target        = fill(PhTarget);
export const Rocket        = fill(PhRocket);
export const MoreHorizontal = fill(PhDotsThree);
export const Send          = fill(PhPaperPlaneTilt);
export const Calculator    = fill(PhCalculator);
export const Heart         = fill(PhHeart);
export const Pill          = fill(PhPill);
export const Pen           = fill(PhPen);
export const LinkIcon      = fill(PhLink);
export const Palette       = fill(PhPalette);
export const FlaskConical  = fill(PhFlask);
export const Zap           = fill(PhLightning);

/** Spinner — use with Tailwind `animate-spin` class */
export const Loader2 = bold(PhCircleNotch);

export const Tooth = fill(PhTooth);
export const Syringe = fill(PhSyringe);
export const GripVertical = bold(PhDotsSixVertical);
