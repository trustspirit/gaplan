import type { ReactNode } from 'react'
import type { NavItemId } from '@/components/layout/navItems'
import {
  LayoutDashboard,
  CalendarRange,
  ClipboardList,
  BarChart3,
  ClipboardPen,
  FolderKanban,
  BookUser,
  Settings,
} from 'lucide-react'

// navItems.ts는 JSX 없는 순수 모듈로 유지하려고 아이콘을 분리했다.
// 키는 NavItemDef.id와 1:1로 맞춘다.
export const NAV_ICONS: Record<NavItemId, ReactNode> = {
  home: <LayoutDashboard size={18} />,
  schedules: <CalendarRange size={18} />,
  taskProgress: <ClipboardList size={18} />,
  stats: <BarChart3 size={18} />,
  visitPlans: <ClipboardPen size={18} />,
  projects: <FolderKanban size={18} />,
  leaders: <BookUser size={18} />,
  admin: <Settings size={18} />,
}
