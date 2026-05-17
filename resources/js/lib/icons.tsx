/**
 * Icon adapter — maps the lucide-react names previously used across the app to
 * @radix-ui/react-icons equivalents. Pages keep importing the same names; only
 * the source module changed (`from '@/lib/icons'`).
 *
 * Radix ships ~318 icons vs lucide's ~1500, so some glyphs have no exact match.
 * Those are mapped to the closest available Radix icon and tagged `// approx`.
 * Radix SVGs honor `className` (Tailwind h-/w-) exactly like lucide did, and no
 * call site used the lucide `size` prop, so sizing is unaffected.
 */
import * as React from 'react';
import {
  ActivityLogIcon,
  ArchiveIcon,
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  BackpackIcon,
  BarChartIcon,
  BellIcon,
  CameraIcon,
  ChatBubbleIcon,
  CodeIcon,
  ExternalLinkIcon,
  HamburgerMenuIcon,
  LightningBoltIcon,
  Link2Icon,
  LoopIcon,
  MixerHorizontalIcon,
  MoonIcon,
  PlayIcon,
  PlusCircledIcon,
  SunIcon,
  CalendarIcon as RxCalendarIcon,
  CaretSortIcon,
  CheckCircledIcon,
  CheckIcon as RxCheckIcon,
  ChevronDownIcon as RxChevronDownIcon,
  ChevronLeftIcon as RxChevronLeftIcon,
  ChevronRightIcon as RxChevronRightIcon,
  ChevronUpIcon as RxChevronUpIcon,
  CircleIcon,
  ClockIcon,
  CounterClockwiseClockIcon,
  Cross2Icon,
  CrossCircledIcon,
  DashboardIcon,
  DotsHorizontalIcon,
  DownloadIcon,
  DrawingPinIcon,
  EnterIcon,
  EnvelopeClosedIcon,
  ExclamationTriangleIcon,
  ExitIcon,
  EyeClosedIcon,
  EyeOpenIcon,
  FileTextIcon,
  GearIcon,
  HomeIcon,
  IdCardIcon,
  ImageIcon,
  InfoCircledIcon,
  LayersIcon,
  ListBulletIcon,
  LockClosedIcon,
  MagnifyingGlassIcon,
  MobileIcon,
  PaperPlaneIcon,
  PersonIcon,
  Pencil1Icon,
  PlusIcon,
  ReaderIcon,
  ReloadIcon,
  RocketIcon,
  StarIcon,
  StopwatchIcon,
  TrashIcon,
  TriangleDownIcon,
  TriangleUpIcon,
  UpdateIcon,
  UploadIcon,
  ViewVerticalIcon,
} from '@radix-ui/react-icons';

/**
 * Generic icon component type (replaces lucide's `LucideIcon`). Broad enough to
 * accept both Radix's `ForwardRefExoticComponent` icons and the custom SVG
 * components below, since call sites use it as `icon: LucideIcon`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type LucideIcon = React.ComponentType<any>;

/** Radix has no currency glyph — render the rupee sign as a crisp inline SVG. */
export const IndianRupee = React.forwardRef<
  SVGSVGElement,
  React.SVGProps<SVGSVGElement>
>((props, ref) => (
  <svg ref={ref} viewBox="0 0 15 15" width="15" height="15" fill="none" {...props}>
    <text
      x="7.5"
      y="12"
      textAnchor="middle"
      fontSize="13"
      fontFamily="sans-serif"
      fill="currentColor"
    >
      ₹
    </text>
  </svg>
));
IndianRupee.displayName = 'IndianRupee';

/* ── Direct equivalents ───────────────────────────────────────────────── */
export const Check = RxCheckIcon;
export const CheckIcon = RxCheckIcon;
export const ChevronDown = RxChevronDownIcon;
export const ChevronDownIcon = RxChevronDownIcon;
export const ChevronLeft = RxChevronLeftIcon;
export const ChevronLeftIcon = RxChevronLeftIcon;
export const ChevronRight = RxChevronRightIcon;
export const ChevronRightIcon = RxChevronRightIcon;
export const ChevronUpIcon = RxChevronUpIcon;
export const ChevronsUpDown = CaretSortIcon;
export const ArrowUpDown = CaretSortIcon;
export const ArrowLeft = ArrowLeftIcon;
export const ArrowRight = ArrowRightIcon;
export const ArrowDownToLine = DownloadIcon;
export const Plus = PlusIcon;
export const X = Cross2Icon;
export const XIcon = Cross2Icon;
export const Search = MagnifyingGlassIcon;
export const Trash2 = TrashIcon;
export const Pencil = Pencil1Icon;
export const Download = DownloadIcon;
export const FileDown = DownloadIcon;
export const Upload = UploadIcon;
export const Eye = EyeOpenIcon;
export const EyeOff = EyeClosedIcon;
export const Lock = LockClosedIcon;
export const LogIn = EnterIcon;
export const LogOut = ExitIcon;
export const Mail = EnvelopeClosedIcon;
export const Home = HomeIcon;
export const User = PersonIcon;
export const UserCircle = PersonIcon;
export const Users = IdCardIcon; // approx — no group glyph in Radix
export const Clock = ClockIcon;
export const History = CounterClockwiseClockIcon;
export const Hourglass = StopwatchIcon; // approx
export const Info = InfoCircledIcon;
export const InfoIcon = InfoCircledIcon;
export const AlertCircle = ExclamationTriangleIcon;
export const AlertTriangle = ExclamationTriangleIcon;
export const AlertOctagon = ExclamationTriangleIcon;
export const TriangleAlertIcon = ExclamationTriangleIcon;
export const ServerCrash = ExclamationTriangleIcon; // approx
export const Construction = ExclamationTriangleIcon; // approx
export const XCircle = CrossCircledIcon;
export const OctagonXIcon = CrossCircledIcon;
export const Ban = CrossCircledIcon;
export const ShieldX = CrossCircledIcon; // approx
export const CheckCircle2 = CheckCircledIcon;
export const CircleCheckIcon = CheckCircledIcon;
export const Circle = CircleIcon;
export const Star = StarIcon;
export const RefreshCcw = ReloadIcon;
export const RotateCcw = ReloadIcon;
export const Loader2 = UpdateIcon; // spins via existing `animate-spin` class
export const Loader2Icon = UpdateIcon;
export const FileText = FileTextIcon;
export const FileCheck = FileTextIcon;
export const ClipboardList = ListBulletIcon;
export const ListChecks = ListBulletIcon;
export const ListOrdered = ListBulletIcon;
export const MoreHorizontalIcon = DotsHorizontalIcon;
export const CalendarIcon = RxCalendarIcon;
export const Image = ImageIcon;
export const Images = ImageIcon;
export const TrendingUp = TriangleUpIcon;
export const TrendingDown = TriangleDownIcon;
export const PanelLeftIcon = ViewVerticalIcon;
export const Send = PaperPlaneIcon;
export const Phone = MobileIcon;
export const MapPin = DrawingPinIcon;
export const Gauge = DashboardIcon;
export const Bell = BellIcon;
export const Settings = GearIcon;

/* ── Approximations (no close Radix glyph) ────────────────────────────── */
export const Package = ArchiveIcon; // approx — no box/parcel glyph
export const Warehouse = ArchiveIcon; // approx
export const ShoppingCart = BackpackIcon; // approx — no cart glyph
export const Truck = RocketIcon; // approx — no vehicle glyph
export const Save = DownloadIcon; // approx — no disk glyph
export const Shield = LockClosedIcon; // approx — no shield glyph
export const Building2 = HomeIcon; // approx — no building glyph
export const Landmark = HomeIcon; // approx
export const Receipt = ReaderIcon; // approx
export const Printer = FileTextIcon; // approx — no printer glyph
export const Tags = LayersIcon; // approx — no tag glyph
export const ToggleLeft = CircleIcon; // approx — no toggle glyph
export const Arrow = ArrowDownIcon;

/* ── Second pass (full set surfaced by the compiler) ──────────────────── */
export const Activity = ActivityLogIcon;
export const ArrowUpFromLine = UploadIcon;
export const BarChart3 = BarChartIcon;
export const Boxes = ArchiveIcon; // approx
export const Calendar = RxCalendarIcon;
export const CalendarClock = RxCalendarIcon; // approx
export const CalendarDays = RxCalendarIcon;
export const Camera = CameraIcon;
export const CircleAlert = ExclamationTriangleIcon;
export const CircleCheck = CheckCircledIcon;
export const CirclePlus = PlusCircledIcon;
export const Crown = StarIcon; // approx — no crown glyph
export const Database = ArchiveIcon; // approx — no database glyph
export const ExternalLink = ExternalLinkIcon;
export const FileSpreadsheet = FileTextIcon; // approx
export const FileWarning = FileTextIcon; // approx
export const Filter = MixerHorizontalIcon;
export const Inbox = ArchiveIcon; // approx
export const LayoutDashboard = DashboardIcon;
export const LayoutGrid = DashboardIcon; // approx
export const Link2 = Link2Icon;
export const Menu = HamburgerMenuIcon;
export const MessageCircle = ChatBubbleIcon;
export const MessageSquare = ChatBubbleIcon;
export const Moon = MoonIcon;
export const MoreHorizontal = DotsHorizontalIcon;
export const PackageCheck = ArchiveIcon; // approx
export const PanelLeft = ViewVerticalIcon;
export const PanelLeftClose = ViewVerticalIcon;
export const Play = PlayIcon;
export const Plug = GearIcon; // approx — no plug glyph
export const ReceiptIndianRupee = IndianRupee; // approx — reuse rupee glyph
export const RefreshCw = ReloadIcon;
export const Repeat = LoopIcon;
export const ShoppingBag = BackpackIcon; // approx
export const StickyNote = FileTextIcon; // approx — no note glyph
export const Sun = SunIcon;
export const Tag = LayersIcon; // approx — no tag glyph
export const Terminal = CodeIcon; // approx
export const UserCog = PersonIcon; // approx
export const UserPlus = PersonIcon; // approx — no person-plus glyph
export const UsersRound = IdCardIcon; // approx
export const Wallet = ArchiveIcon; // approx — no wallet glyph
export const Webhook = Link2Icon; // approx — no webhook glyph
export const Zap = LightningBoltIcon;
