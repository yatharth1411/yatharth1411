import React from "react";

type P = { className?: string };

function base(props: P, children: React.ReactNode, viewBox = "0 0 24 24") {
  return (
    <svg
      className={props.className ?? "h-5 w-5"}
      viewBox={viewBox}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

export const IconChat = (p: P) => base(p, <path d="M21 12a8 8 0 0 1-8 8c-1.4 0-2.7-.3-3.9-.9L4 20l1-4.6A8 8 0 1 1 21 12Z" />);
export const IconNote = (p: P) => base(p, <><path d="M5 3h11l3 3v15H5Z" /><path d="M9 8h6M9 12h6M9 16h4" /></>);
export const IconTask = (p: P) => base(p, <><rect x="4" y="4" width="16" height="16" rx="3" /><path d="m8.5 12.5 2.5 2.5 4.5-5" /></>);
export const IconBell = (p: P) => base(p, <><path d="M18 9a6 6 0 1 0-12 0c0 6-2.5 7-2.5 7h17S18 15 18 9Z" /><path d="M10 20a2.2 2.2 0 0 0 4 0" /></>);
export const IconCal = (p: P) => base(p, <><rect x="4" y="5" width="16" height="16" rx="3" /><path d="M4 10h16M8 3v4M16 3v4" /></>);
export const IconCloud = (p: P) => base(p, <path d="M7 18a5 5 0 1 1 .9-9.92A6 6 0 0 1 19.5 9.5 4.2 4.2 0 0 1 18 18H7Z" />);
export const IconNews = (p: P) => base(p, <><path d="M4 5h13v14H6a2 2 0 0 1-2-2V5Z" /><path d="M17 8h3v9a2 2 0 0 1-2 2" /><path d="M7 9h6M7 13h6M7 17h4" /></>);
export const IconFile = (p: P) => base(p, <><path d="M6 3h8l4 4v14H6Z" /><path d="M14 3v4h4" /></>);
export const IconImage = (p: P) => base(p, <><rect x="4" y="4" width="16" height="16" rx="3" /><circle cx="9.5" cy="9.5" r="1.6" /><path d="m6 18 4.5-4.5 3 3L17 13l3 3" /></>);
export const IconGear = (p: P) => base(p, <><circle cx="12" cy="12" r="3.2" /><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3 1a7 7 0 0 0-2-1.2L14.2 3h-4l-.4 2.7a7 7 0 0 0-2 1.2l-2.3-1-2 3.4 2 1.5a7 7 0 0 0 0 2.4l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 2 1.2l.4 2.7h4l.4-2.7a7 7 0 0 0 2-1.2l2.3 1 2-3.4-2-1.5c.07-.4.1-.8.1-1.2Z" /></>);
export const IconMic = (p: P) => base(p, <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></>);
export const IconSend = (p: P) => base(p, <path d="m4 12 16-7-5 16-3.5-6.5L4 12Z" />);
export const IconPlus = (p: P) => base(p, <path d="M12 5v14M5 12h14" />);
export const IconTrash = (p: P) => base(p, <><path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14" /><path d="M10 11v6M14 11v6" /></>);
export const IconX = (p: P) => base(p, <path d="M6 6l12 12M18 6 6 18" />);
export const IconCheck = (p: P) => base(p, <path d="m5 13 4 4L19 7" />);
export const IconDownload = (p: P) => base(p, <><path d="M12 4v11m0 0 4-4m-4 4-4-4" /><path d="M5 20h14" /></>);
export const IconSpark = (p: P) => base(p, <path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4L12 3ZM19 16l.9 2.6 2.6.9-2.6.9L19 23l-.9-2.6-2.6-.9 2.6-.9L19 16Z" />);
export const IconHeart = (p: P) => base(p, <path d="M12 20.5C7 16.5 3.5 13.3 3.5 9.6 3.5 7 5.5 5 8 5c1.6 0 3.1.8 4 2.1C12.9 5.8 14.4 5 16 5c2.5 0 4.5 2 4.5 4.6 0 3.7-3.5 6.9-8.5 10.9Z" />);
export const IconLock = (p: P) => base(p, <><rect x="5" y="11" width="14" height="9" rx="2.5" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>);
export const IconGlobe = (p: P) => base(p, <><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.5 2.3 3.8 5.2 3.8 8.5s-1.3 6.2-3.8 8.5c-2.5-2.3-3.8-5.2-3.8-8.5s1.3-6.2 3.8-8.5Z" /></>);
export const IconSearch = (p: P) => base(p, <><circle cx="11" cy="11" r="6.5" /><path d="m20 20-3.8-3.8" /></>);
export const IconSpeaker = (p: P) => base(p, <><path d="M4 10v4h3l5 4V6l-5 4H4Z" /><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11" /></>);
export const IconPin = (p: P) => base(p, <><path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" /><circle cx="12" cy="10" r="2.5" /></>);
export const IconRefresh = (p: P) => base(p, <><path d="M20 12a8 8 0 1 1-2.3-5.6" /><path d="M20 4v5h-5" /></>);
export const IconBrain = (p: P) => base(p, <><path d="M9.5 4A3 3 0 0 0 6.5 7c-1.7.3-3 1.8-3 3.6 0 1.3.7 2.5 1.7 3.1A3.6 3.6 0 0 0 8 20.4c.5.2 1 .4 1.5.4V4Z" /><path d="M14.5 4A3 3 0 0 1 17.5 7c1.7.3 3 1.8 3 3.6 0 1.3-.7 2.5-1.7 3.1A3.6 3.6 0 0 1 16 20.4c-.5.2-1 .4-1.5.4V4" /></>);
export const IconWake = (p: P) => base(p, <><circle cx="12" cy="12" r="2.4" /><path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14" /></>);
export const IconBack = (p: P) => base(p, <path d="M15 5l-7 7 7 7" />);
