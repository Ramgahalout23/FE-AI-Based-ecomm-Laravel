import { create } from 'zustand';

const useUIStore = create((set) => ({
  sidebarOpen: true,
  mobileMenuOpen: false,
  activeAdminPage: 'dashboard',
  searchQuery: '',
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  toggleMobileMenu: () => set((s) => ({ mobileMenuOpen: !s.mobileMenuOpen })),
  setActiveAdminPage: (page) => set({ activeAdminPage: page }),
  setSearchQuery: (q) => set({ searchQuery: q }),
}));

export default useUIStore;
