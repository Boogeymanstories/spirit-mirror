import React from 'react';
import { ShieldCheck } from 'lucide-react';

export const PrivacyNotice: React.FC = () => {
  return (
    <footer
      className="w-full text-center py-1.5 px-3 border-t border-[#1e150d] bg-[#070503] flex items-center justify-center gap-1.5"
      role="note"
      aria-label="Privacy Guarantee"
    >
      <ShieldCheck className="w-3 h-3 text-[#705e49] shrink-0" aria-hidden="true" />
      <span className="text-[8.5px] tracking-[0.2em] uppercase text-[#7a6853] font-cinzel select-none">
        YOUR REFLECTION NEVER LEAVES THE GLASS
      </span>
    </footer>
  );
};
