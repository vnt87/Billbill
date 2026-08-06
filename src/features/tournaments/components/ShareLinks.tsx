import { useState, useRef } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { SpotlightCard } from '../../../components/ui/SpotlightCard';
import { Copy, Check, ShieldAlert, Eye, Key } from 'lucide-react';

interface ShareLinksProps {
  adminUrl?: string;
  publicUrl: string;
}

export function ShareLinks({ adminUrl, publicUrl }: ShareLinksProps) {
  const { t } = useLanguage();
  const [copiedAdmin, setCopiedAdmin] = useState(false);
  const [copiedPublic, setCopiedPublic] = useState(false);
  const [copyErrorAdmin, setCopyErrorAdmin] = useState(false);
  const [copyErrorPublic, setCopyErrorPublic] = useState(false);

  const adminInputRef = useRef<HTMLInputElement>(null);
  const publicInputRef = useRef<HTMLInputElement>(null);

  const fullAdminUrl = adminUrl ? window.location.origin + adminUrl : '';
  const fullPublicUrl = window.location.origin + publicUrl;

  const copyToClipboard = async (text: string, isAdmin: boolean) => {
    const inputRef = isAdmin ? adminInputRef : publicInputRef;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        throw new Error('Clipboard API unavailable');
      }

      if (isAdmin) {
        setCopiedAdmin(true);
        setCopyErrorAdmin(false);
        setTimeout(() => setCopiedAdmin(false), 2000);
      } else {
        setCopiedPublic(true);
        setCopyErrorPublic(false);
        setTimeout(() => setCopiedPublic(false), 2000);
      }
    } catch {
      if (inputRef.current) {
        inputRef.current.select();
      }
      if (isAdmin) {
        setCopyErrorAdmin(true);
        setTimeout(() => setCopyErrorAdmin(false), 3000);
      } else {
        setCopyErrorPublic(true);
        setTimeout(() => setCopyErrorPublic(false), 3000);
      }
    }
  };

  return (
    <SpotlightCard className="space-y-4 p-4 sm:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-none">
      {/* Admin link section - renders only if adminUrl exists */}
      {adminUrl && (
        <>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold text-base">
              <Key size={18} />
              <h3>{t.tournament.shareAdminLinkTitle}</h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              {t.tournament.shareAdminLinkHint}
            </p>
            <div className="flex items-center gap-2">
              <input
                ref={adminInputRef}
                type="text"
                readOnly
                value={fullAdminUrl}
                className="flex-1 px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs sm:text-sm border border-slate-300 dark:border-slate-700 font-mono select-all focus:outline-none"
              />
              <button
                type="button"
                onClick={() => copyToClipboard(fullAdminUrl, true)}
                className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs sm:text-sm flex items-center gap-1.5 transition-colors active:scale-95"
              >
                {copiedAdmin ? <Check size={16} /> : <Copy size={16} />}
                <span className="hidden sm:inline">
                  {copiedAdmin ? 'Copied!' : copyErrorAdmin ? 'Selected (Ctrl+C)' : t.tournament.copyAdminLink}
                </span>
              </button>
            </div>
          </div>

          <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-300 text-xs sm:text-sm flex items-center gap-2">
            <ShieldAlert size={16} className="shrink-0" />
            <span>{t.tournament.adminWarning}</span>
          </div>

          <hr className="border-slate-200 dark:border-slate-800" />
        </>
      )}

      {/* Public link section */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold text-base">
          <Eye size={18} />
          <h3>{t.tournament.sharePublicLinkTitle}</h3>
        </div>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
          {t.tournament.sharePublicLinkHint}
        </p>
        <div className="flex items-center gap-2">
          <input
            ref={publicInputRef}
            type="text"
            readOnly
            value={fullPublicUrl}
            className="flex-1 px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs sm:text-sm border border-slate-300 dark:border-slate-700 font-mono select-all focus:outline-none"
          />
          <button
            type="button"
            onClick={() => copyToClipboard(fullPublicUrl, false)}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs sm:text-sm flex items-center gap-1.5 transition-colors active:scale-95"
          >
            {copiedPublic ? <Check size={16} /> : <Copy size={16} />}
            <span className="hidden sm:inline">
              {copiedPublic ? 'Copied!' : copyErrorPublic ? 'Selected (Ctrl+C)' : t.tournament.copyPublicLink}
            </span>
          </button>
        </div>
      </div>
    </SpotlightCard>
  );
}
