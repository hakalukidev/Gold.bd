import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

/**
 * Shopping cart for the landing page's product section. There's no backend
 * cart/checkout endpoint in this repo yet (see CLAUDE.md — no /api/* routes
 * beyond the mock rate feeds live here), so this is purely client-only state
 * that feeds the navbar's cart badge/preview until a real checkout flow
 * exists. It gets its own slice rather than folding into `ui` because it's a
 * distinct, growable piece of state — not a one-off view toggle.
 */
export interface CartItem {
  /** Stable key per product variant, e.g. "gold-bar-5" (metal-form-grams). */
  id: string;
  name: string;
  image: string;
  unitPriceBDT: number;
  quantity: number;
}

interface CartState {
  items: CartItem[];
}

const initialState: CartState = {
  items: [],
};

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    addToCart(state, action: PayloadAction<Omit<CartItem, "quantity"> & { quantity?: number }>) {
      const { quantity = 1, ...item } = action.payload;
      const existing = state.items.find((i) => i.id === item.id);
      if (existing) {
        existing.quantity += quantity;
      } else {
        state.items.push({ ...item, quantity });
      }
    },
    removeFromCart(state, action: PayloadAction<string>) {
      state.items = state.items.filter((i) => i.id !== action.payload);
    },
    updateQuantity(state, action: PayloadAction<{ id: string; quantity: number }>) {
      const item = state.items.find((i) => i.id === action.payload.id);
      if (item) item.quantity = Math.max(1, action.payload.quantity);
    },
    clearCart(state) {
      state.items = [];
    },
  },
});

export const { addToCart, removeFromCart, updateQuantity, clearCart } = cartSlice.actions;
export default cartSlice.reducer;
