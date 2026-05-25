






import {
  AlertCircle as _AlertCircle,
  AudioLines as _AudioLines,
  Calendar as _Calendar,
  Check as _Check,
  ChevronDown as _ChevronDown,
  ChevronLeft as _ChevronLeft,
  ChevronRight as _ChevronRight,
  ChevronUp as _ChevronUp,
  ClipboardCopy as _ClipboardCopy,
  Clock as _Clock,
  Compass as _Compass,
  Disc3 as _Disc3,
  Download as _Download,
  ExternalLink as _ExternalLink,
  Eye as _Eye,
  Fullscreen as _Fullscreen,
  Globe as _Globe,
  GripVertical as _GripVertical,
  Hash as _Hash,
  Headphones as _Headphones,
  Heart as _Heart,
  Home as _Home,
  Library as _Library,
  Link as _Link,
  Link2 as _Link2,
  ListMusic as _ListMusic,
  ListPlus as _ListPlus,
  Loader2 as _Loader2,
  Lock as _Lock,
  MapPin as _MapPin,
  MessageCircle as _MessageCircle,
  MicVocal as _MicVocal,
  Minus as _Minus,
  Music as _Music,
  PanelLeftClose as _PanelLeftClose,
  PanelLeftOpen as _PanelLeftOpen,
  Pause as _Pause,
  Play as _Play,
  Plus as _Plus,
  Power as _Power,
  RefreshCw as _RefreshCw,
  Repeat as _Repeat,
  Repeat1 as _Repeat1,
  Repeat2 as _Repeat2,
  RotateCcw as _RotateCcw,
  Search as _Search,
  Send as _Send,
  Settings as _Settings,
  Shuffle as _Shuffle,
  SkipBack as _SkipBack,
  SkipForward as _SkipForward,
  SlidersHorizontal as _SlidersHorizontal,
  Smartphone as _Smartphone,
  Sparkles as _Sparkles,
  Square as _Square,
  Star as _Star,
  ThumbsDown as _ThumbsDown,
  Trash2 as _Trash2,
  User as _User,
  Users as _Users,
  Volume1 as _Volume1,
  Volume2 as _Volume2,
  VolumeX as _VolumeX,
  X as _X,
} from 'lucide-react';
import { memo } from 'react';
import { siInstagram, siX, siYoutube } from 'simple-icons';


const SimpleIcon = memo(
  ({
    icon,
    size = 24,
    className,
  }: {
    icon: { path: string };
    size?: number;
    className?: string;
  }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d={icon.path} />
    </svg>
  ),
);


export const AlertCircle = memo(_AlertCircle);
export const Calendar = memo(_Calendar);
export const Check = memo(_Check);
export const ClipboardCopy = memo(_ClipboardCopy);
export const Download = memo(_Download);
export const ChevronDown = memo(_ChevronDown);
export const ChevronLeft = memo(_ChevronLeft);
export const ChevronRight = memo(_ChevronRight);
export const ChevronUp = memo(_ChevronUp);
export const Clock = memo(_Clock);
export const Compass = memo(_Compass);
export const Disc3 = memo(_Disc3);
export const ExternalLink = memo(_ExternalLink);
export const Eye = memo(_Eye);
export const Fullscreen = memo(_Fullscreen);
export const Globe = memo(_Globe);
export const GripVertical = memo(_GripVertical);
export const Hash = memo(_Hash);
export const Headphones = memo(_Headphones);
export const Heart = memo(_Heart);
export const Home = memo(_Home);
export const Instagram = memo(({ size, className }: { size?: number; className?: string }) => (
  <SimpleIcon icon={siInstagram} size={size} className={className} />
));
export const Library = memo(_Library);
export const LinkIcon = memo(_Link);
export const ListMusic = memo(_ListMusic);
export const ListPlus = memo(_ListPlus);
export const Loader2 = memo(_Loader2);
export const Lock = memo(_Lock);
export const MapPin = memo(_MapPin);
export const MicVocal = memo(_MicVocal);
export const MessageCircle = memo(_MessageCircle);
export const Minus = memo(_Minus);
export const Music = memo(_Music);
export const PanelLeftClose = memo(_PanelLeftClose);
export const PanelLeftOpen = memo(_PanelLeftOpen);
export const Pause = memo(_Pause);
export const Play = memo(_Play);
export const Plus = memo(_Plus);
export const Repeat = memo(_Repeat);
export const Repeat1 = memo(_Repeat1);
export const RefreshCw = memo(_RefreshCw);
export const Repeat2 = memo(_Repeat2);
export const Search = memo(_Search);
export const Send = memo(_Send);
export const Settings = memo(_Settings);
export const Shuffle = memo(_Shuffle);
export const Smartphone = memo(_Smartphone);
export const SkipBack = memo(_SkipBack);
export const SkipForward = memo(_SkipForward);
export const Sparkles = memo(_Sparkles);
export const Star = memo(_Star);
export const Square = memo(_Square);
export const ThumbsDown = memo(_ThumbsDown);
export const Trash2 = memo(_Trash2);
export const Twitter = memo(({ size, className }: { size?: number; className?: string }) => (
  <SimpleIcon icon={siX} size={size} className={className} />
));
export const User = memo(_User);
export const Users = memo(_Users);
export const Volume1 = memo(_Volume1);
export const Volume2 = memo(_Volume2);
export const VolumeX = memo(_VolumeX);
export const X = memo(_X);
export const Link = memo(_Link2);
export const SlidersHorizontal = memo(_SlidersHorizontal);
export const AudioLines = memo(_AudioLines);
export const Power = memo(_Power);
export const RotateCcw = memo(_RotateCcw);
export const Youtube = memo(({ size, className }: { size?: number; className?: string }) => (
  <SimpleIcon icon={siYoutube} size={size} className={className} />
));




export const playBlack11 = <_Play size={11} fill="black" strokeWidth={0} className="ml-px" />;
export const pauseBlack11 = <_Pause size={11} fill="black" strokeWidth={0} />;
export const playBlack12 = <_Play size={12} fill="black" strokeWidth={0} className="ml-px" />;
export const pauseBlack12 = <_Pause size={12} fill="black" strokeWidth={0} />;
export const playBlack14 = <_Play size={14} fill="black" strokeWidth={0} className="ml-px" />;
export const pauseBlack14 = <_Pause size={14} fill="black" strokeWidth={0} />;
export const playBlack18 = <_Play size={18} fill="black" strokeWidth={0} className="ml-0.5" />;
export const pauseBlack18 = <_Pause size={18} fill="black" strokeWidth={0} />;
export const playBlack16 = <_Play size={16} fill="black" strokeWidth={0} className="ml-0.5" />;
export const pauseBlack16 = <_Pause size={16} fill="black" strokeWidth={0} />;
export const playBlack20 = <_Play size={20} fill="black" strokeWidth={0} className="ml-0.5" />;
export const pauseBlack20 = <_Pause size={20} fill="black" strokeWidth={0} />;
export const playBlack22 = <_Play size={22} fill="black" strokeWidth={0} className="ml-0.5" />;
export const pauseBlack22 = <_Pause size={22} fill="black" strokeWidth={0} />;


export const playWhite12 = (
  <_Play size={12} fill="currentColor" strokeWidth={0} className="ml-px" />
);
export const pauseWhite12 = <_Pause size={12} fill="currentColor" strokeWidth={0} />;
export const playWhite14 = (
  <_Play size={14} fill="currentColor" strokeWidth={0} className="ml-0.5" />
);
export const pauseWhite14 = <_Pause size={14} fill="currentColor" strokeWidth={0} />;
export const playWhite16 = (
  <_Play size={16} fill="currentColor" strokeWidth={0} className="ml-0.5" />
);


export const playCurrent16 = <_Play size={16} fill="currentColor" strokeWidth={0} />;
export const pauseCurrent16 = <_Pause size={16} fill="currentColor" strokeWidth={0} />;


export const playIcon32 = <_Play size={32} />;
export const playBlack20ml1 = <_Play size={20} fill="black" className="ml-1" />;
export const pauseTextWhite12 = <_Pause size={12} className="text-white" />;


export const skipBack16 = <_SkipBack size={16} fill="currentColor" />;
export const skipForward16 = <_SkipForward size={16} fill="currentColor" />;
export const skipBack20 = <_SkipBack size={20} fill="currentColor" />;
export const skipForward20 = <_SkipForward size={20} fill="currentColor" />;
export const shuffleIcon14 = <_Shuffle size={14} />;
export const shuffleIcon16 = <_Shuffle size={16} />;
export const repeatIcon14 = <_Repeat size={14} />;
export const repeatIcon16 = <_Repeat size={16} />;
export const repeat1Icon14 = <_Repeat1 size={14} />;
export const repeat1Icon16 = <_Repeat1 size={16} />;


export const volumeXIcon14 = <_VolumeX size={14} />;
export const volume1Icon14 = <_Volume1 size={14} />;
export const volume2Icon14 = <_Volume2 size={14} />;
export const volumeXIcon16 = <_VolumeX size={16} />;
export const volume1Icon16 = <_Volume1 size={16} />;
export const volume2Icon16 = <_Volume2 size={16} />;


export const headphones9 = <_Headphones size={9} />;
export const headphones11 = <_Headphones size={11} className="text-white/20" />;
export const heart9 = <_Heart size={9} />;
export const heart11 = <_Heart size={11} className="text-white/20" />;
export const listMusic8 = <_ListMusic size={8} />;
export const listMusic9 = <_ListMusic size={9} />;
export const listMusic14 = <_ListMusic size={14} />;
export const listMusic16 = <_ListMusic size={16} />;
export const musicIcon12 = <_Music size={12} className="text-white/15" />;
export const musicIcon14 = <_Music size={14} className="text-white/15" />;
export const musicIcon22 = <_Music size={22} className="text-white/15" />;
export const musicIcon20 = <_Music size={16} className="text-white/20" />;
export const audioLines14 = <_AudioLines size={14} />;
export const audioLines16 = <_AudioLines size={16} />;

const MY_SC_WAVEFORM_PATH =
  'M1986.328 716.21c-.475-.183-.602-.373-.606-.74v-19.988c.01-.385.304-.706.68-.744.016-.001 17.345-.01 17.457-.01a6.3 6.3 0 0 1 6.298 6.298 6.3 6.3 0 0 1-8.733 5.809c-.5 5.675-5.26 10.128-11.066 10.128-1.42 0-2.805-.28-4.028-.754m-2.587-1.415l-.285-14.187.285-5.15c.01-.376.316-.686.694-.686a.7.7 0 0 1 .693.691v-.005l.31 5.15-.31 14.188c-.01.38-.316.69-.693.69a.7.7 0 0 1-.694-.693m-2.107-1.178l-.244-13.003c0-.01.244-5.228.244-5.228a.66.66 0 0 1 .65-.644.66.66 0 0 1 .65.647v-.003.003l.274 5.22-.274 13.01a.66.66 0 0 1-.65.646c-.352 0-.643-.3-.65-.647m-6.3-1.363l-.322-11.64.323-5.345c.01-.286.235-.512.518-.512s.51.227.52.514h0v.003l.363 5.34-.363 11.64c-.01.3-.237.516-.52.516a.52.52 0 0 1-.519-.516m2.083-.298l-.296-11.344.297-5.293c.01-.31.254-.558.563-.558s.553.247.562.56v-.003l.333 5.294-.333 11.344c-.01.314-.255.56-.562.56s-.557-.247-.564-.56m-4.15-.08l-.35-11.262.35-5.377a.48.48 0 0 1 .475-.469.48.48 0 0 1 .475.471l.393 5.375-.393 11.263c-.01.264-.22.47-.475.47a.48.48 0 0 1-.475-.472m6.25-.334l-.27-10.93.27-5.26c.01-.335.274-.6.607-.6s.598.264.605.603v-.004l.304 5.26-.304 10.93a.61.61 0 0 1-.605.604c-.333 0-.6-.266-.607-.604m-8.3-.53c0-.001-.374-10.394-.374-10.394l.374-5.433c.01-.238.2-.426.432-.426a.44.44 0 0 1 .432.427l.423 5.432-.423 10.394a.44.44 0 0 1-.432.427c-.232 0-.42-.188-.432-.427m-2.034-1.934l-.4-8.46.4-5.466c.01-.214.18-.382.387-.382s.376.168.388.383h0l.453 5.467-.453 8.46c-.013.214-.183.384-.388.384s-.377-.17-.387-.384m-4.018-2.853l-.452-5.605.452-5.422c.013-.168.142-.294.3-.294s.286.126.3.294l.512 5.422-.512 5.607c-.015.167-.143.294-.3.294s-.288-.128-.3-.296m-1.984-.148c0-.001-.478-5.456-.478-5.456l.478-5.256c.015-.147.122-.252.257-.252s.24.105.256.25l.543 5.257-.542 5.456c-.016.145-.124.25-.257.25s-.243-.107-.257-.25m3.985-.258l-.425-5.2.425-5.467a.35.35 0 0 1 .344-.34c.182 0 .33.146.344.34l.484 5.468-.484 5.202c-.015.19-.16.336-.344.336s-.332-.145-.344-.34m-5.953-.6c0-.001-.504-4.597-.504-4.597l.504-4.497c.015-.12.105-.207.214-.207s.195.084.212.206l.572 4.498-.572 4.597c-.02.122-.106.207-.213.207s-.2-.087-.214-.207m-1.885-1.754l-.374-2.843.374-2.795c.015-.118.1-.2.206-.2s.188.082.204.2l.444 2.796-.444 2.844c-.015.117-.1.2-.204.2s-.192-.082-.206-.2';

export const MyScIcon = memo(
  ({
    size = 16,
    className,
  }: {
    size?: number;
    className?: string;
    strokeWidth?: number;
  }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="currentColor"
      aria-hidden
      className={className}
    >
      <path
        d={MY_SC_WAVEFORM_PATH}
        transform="matrix(1.25 0 0 -1.25 -2448.6946 912.30772)"
      />
    </svg>
  ),
);

export const PlayingBars = memo(({ size = 14, className }: { size?: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="currentColor"
    aria-hidden
    className={className}
  >
    <rect x="1" y="2" width="2.5" height="12" rx="0.5" />
    <rect x="5.25" y="6" width="2.5" height="8" rx="0.5" />
    <rect x="9.5" y="1" width="2.5" height="13" rx="0.5" />
    <rect x="13.75" y="5" width="2.5" height="9" rx="0.5" />
  </svg>
));
export const slidersHorizontal14 = <_SlidersHorizontal size={14} />;
export const slidersHorizontal16 = <_SlidersHorizontal size={16} />;
