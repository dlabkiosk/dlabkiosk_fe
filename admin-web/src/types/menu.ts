export interface MenuItem {
  label: string;
  path: string;
  icon: string;
  activeIcon: string;
  children?: { label: string; path: string }[];
}
