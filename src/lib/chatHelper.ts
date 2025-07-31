import { format, isToday } from "date-fns";

export const getDisplayTime = (isoString: string) => {
  const date = new Date(isoString);
  return isToday(date) ? format(date, "p") : format(date, "dd/MM/yyyy");
};

export const getInitials = (fullName?: string) => {
  if (!fullName) return '';
  const words = fullName.trim().split(' ');
  if (words.length === 1) return words[0][0]?.toUpperCase() || '';
  return (words[0][0] + words[words.length - 1][0])?.toUpperCase();
};
