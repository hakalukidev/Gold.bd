import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

/**
 * Client-only UI state that has nothing to do with server data (TanStack Query
 * already owns that — wallet, rate, transactions, etc. live there, not here).
 * Redux is scoped to view state that several components need to share: the
 * landing page's tab toggle, the mobile nav's open/closed state, and the
 * active display language.
 */
export type WhyTab = "asset" | "platform";
export type Locale = "bn" | "en";

interface UiState {
  activeWhyTab: WhyTab;
  mobileMenuOpen: boolean;
  locale: Locale;
}

const initialState: UiState = {
  activeWhyTab: "asset",
  mobileMenuOpen: false,
  locale: "bn",
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    setActiveWhyTab(state, action: PayloadAction<WhyTab>) {
      state.activeWhyTab = action.payload;
    },
    setMobileMenuOpen(state, action: PayloadAction<boolean>) {
      state.mobileMenuOpen = action.payload;
    },
    toggleMobileMenu(state) {
      state.mobileMenuOpen = !state.mobileMenuOpen;
    },
    setLocale(state, action: PayloadAction<Locale>) {
      state.locale = action.payload;
    },
  },
});

export const { setActiveWhyTab, setMobileMenuOpen, toggleMobileMenu, setLocale } = uiSlice.actions;
export default uiSlice.reducer;
