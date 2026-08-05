import { format, parseISO, isValid } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useLanguage } from '../contexts/LanguageContext';

export function useDateUtils() {
  const { t, language } = useLanguage();

  const formatDate = (dateStr: string, formatStr?: string): string => {
    try {
      const date = parseISO(dateStr);
      if (!isValid(date)) return t.noDate;

      return format(date, formatStr || t.dateFormats.shortDate, {
        locale: language === 'vi' ? vi : undefined
      });
    } catch (error) {
      console.error(`Error formatting date: ${dateStr}`, error);
      return t.noDate;
    }
  };

  const formatDuration = (minutes: number): string => {
    if (minutes < 0) return t.noTimeData;

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours === 0) {
      return t.dateFormats.duration.minutesOnly.replace('{minutes}', remainingMinutes.toString());
    }
    if (remainingMinutes === 0) {
      return t.dateFormats.duration.hoursOnly.replace('{hours}', hours.toString());
    }
    return t.dateFormats.duration.hoursMinutes
      .replace('{hours}', hours.toString())
      .replace('{minutes}', remainingMinutes.toString());
  };

  const formatTime = (timeStr: string): string => {
    try {
      const today = new Date();
      const [hours, minutes] = timeStr.split(':').map(Number);
      const date = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes);

      if (!isValid(date)) return t.noTimeData;
      return format(date, t.dateFormats.time);
    } catch (error) {
      console.error(`Error formatting time: ${timeStr}`, error);
      return t.noTimeData;
    }
  };

  return { formatDate, formatDuration, formatTime };
}
