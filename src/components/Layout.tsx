import { Github, Sun, Moon, Calculator, ClockIcon, Heart } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { Link, useLocation } from 'react-router-dom';
import { RollingText } from './ui/RollingText';
interface LayoutProps {
  children: React.ReactNode;
  isDarkMode: boolean;
  setIsDarkMode: (isDark: boolean) => void;
}

export function Layout({ children, isDarkMode, setIsDarkMode }: LayoutProps) {
  const { t, language, setLanguage } = useLanguage();
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/' || location.pathname === '/calculator';
    }
    return location.pathname === path ||
      (path === '/history' && location.pathname.startsWith('/bill/'));
  };

  return (
    <div className="min-h-[100dvh] bg-slate-100 text-slate-950 transition-colors dark:bg-slate-950 dark:text-slate-50 flex flex-col">
      <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 flex-grow pb-28 lg:pb-8">
        <header className="flex h-16 sm:h-[72px] items-center justify-between gap-3">
          <Link to="/" className="rolling-text-trigger shrink-0 text-xl sm:text-2xl font-bold tracking-tight hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
            <RollingText className="sm:hidden">ChiaBill</RollingText>
            <RollingText className="hidden sm:inline">{t.title}</RollingText>
          </Link>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <nav aria-label={t.accessibility.primaryNavigation} className="flex items-center gap-1.5 sm:gap-2">
              <Link
                to="/"
                aria-label={t.navigation.calculator}
                aria-current={isActive('/') ? 'page' : undefined}
                title={t.navigation.calculator}
                className={`rolling-text-trigger h-10 px-2.5 sm:px-3 rounded-none flex items-center gap-2 font-medium ${
                  isActive('/')
                    ? 'bg-blue-700 text-white'
                    : 'bg-white text-slate-700 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
                } transition-colors active:scale-[0.98]`}
              >
                <Calculator size={20} />
                <RollingText className="hidden sm:inline">{t.navigation.calculator}</RollingText>
              </Link>
              <Link
                to="/history"
                aria-label={t.navigation.history}
                aria-current={isActive('/history') ? 'page' : undefined}
                title={t.navigation.history}
                className={`rolling-text-trigger h-10 px-2.5 sm:px-3 rounded-none flex items-center gap-2 font-medium ${
                  isActive('/history')
                    ? 'bg-blue-700 text-white'
                    : 'bg-white text-slate-700 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
                } transition-colors active:scale-[0.98]`}
              >
                <ClockIcon size={20} />
                <RollingText className="hidden sm:inline">{t.navigation.history}</RollingText>
              </Link>
            </nav>
            <button
              onClick={() => setLanguage(language === 'en' ? 'vi' : 'en')}
              aria-label={language === 'en' ? 'Switch to Vietnamese' : 'Chuyển sang tiếng Anh'}
              title={language === 'en' ? 'Tiếng Việt' : 'English'}
              className="rolling-text-trigger h-10 min-w-10 px-2.5 rounded-none bg-white text-sm font-semibold text-slate-700 hover:bg-slate-200 transition-colors active:scale-[0.98] dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <RollingText>{language === 'en' ? 'VI' : 'EN'}</RollingText>
            </button>
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              aria-label={isDarkMode ? t.accessibility.useLightTheme : t.accessibility.useDarkTheme}
              title={isDarkMode ? 'Light theme' : 'Dark theme'}
              className="h-10 w-10 rounded-none bg-white text-slate-700 hover:bg-slate-200 transition-colors active:scale-[0.98] dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 flex items-center justify-center"
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </header>
        
        {children}
      </div>
      
      <footer className="mt-8 text-center">
        <div className="py-4 text-sm text-slate-600 dark:text-slate-400 flex flex-col items-center gap-1">
          <div>
            Built with <Heart className="inline text-red-500 fill-red-500 mx-0.5" size={14} /> by{' '}
            <a
              href="https://namvu.net"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline font-medium"
            >
              Nam Vu
            </a>
          </div>
          <div>
            <a 
              href="https://github.com/vnt87/Billbill" 
              className="inline-flex items-center gap-1 hover:text-blue-700 dark:hover:text-blue-300"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Github size={14} /> Source code
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
