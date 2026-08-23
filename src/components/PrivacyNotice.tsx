import React from 'react';
import { ShieldAlert } from 'lucide-react';

export const PrivacyNotice: React.FC = () => {
  return (
    <div
      className="w-full text-center py-1 px-2 border-t border-[#18130e] bg-[#070605] flex items-center justify-center gap-1.5"
      role="note"
      aria-label="Privacy Guarantee"
    >
      <ShieldAlert className="w-2.5 h-2.5 text-[#635543] shrink-0" aria-hidden="true" />
      <span className="text-[9px] tracking-[0.16em] uppercase text-[#695c4b] font-cinzel select-none">
        YOUR REFLECTION NEVER LEAVES THE GLASS
      </span>
    </div>
  );
};
