import type { IconType } from 'react-icons';

export interface MenuItem {
  label: string;
  path: string;
  icon: IconType;
  children?: { label: string; path: string }[];
}
