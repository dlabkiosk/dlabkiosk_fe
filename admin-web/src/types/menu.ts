import type { IconType } from 'react-icons';

export interface MenuItem {
  label: string;
  path: string;
  icon: IconType;
  children?: SubMenuItem[];
}

export interface SubMenuItem {
  label: string;
  path: string;
}
