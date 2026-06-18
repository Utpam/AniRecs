import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    status: false,
    userData: null
}

const AuthSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        login: (state, action) => {
            state.status = true;
            if (action.payload?.userData) {
                state.userData = state.userData
                    ? { ...state.userData, ...action.payload.userData }
                    : action.payload.userData;
            }
        },
        logout: (state, action) => {
            state.status = false;
            state.userData = null;
        },
        toggleListOptimistic: (state, action) => {
            const { actionType, animeId } = action.payload;
            if (!state.userData) return;
            const animeIdStr = String(animeId);
            
            if (actionType === 'favorite') {
                state.userData.favorites = state.userData.favorites || [];
                const idx = state.userData.favorites.indexOf(animeIdStr);
                if (idx > -1) state.userData.favorites.splice(idx, 1);
                else state.userData.favorites.push(animeIdStr);
            } else if (actionType === 'watchlist') {
                state.userData.watchlist = state.userData.watchlist || [];
                const idx = state.userData.watchlist.findIndex(item => String(item.animeId) === animeIdStr);
                if (idx > -1) {
                    state.userData.watchlist.splice(idx, 1);
                } else {
                    state.userData.watchlist.push({ animeId: animeIdStr, status: 'planned', updatedAt: new Date().toISOString() });
                }
            } else if (actionType === 'watched') {
                state.userData.watchedAnime = state.userData.watchedAnime || [];
                const idx = state.userData.watchedAnime.indexOf(animeIdStr);
                if (idx > -1) {
                    state.userData.watchedAnime.splice(idx, 1);
                } else {
                    state.userData.watchedAnime.push(animeIdStr);
                }
            } else if (actionType === 'complete') {
                state.userData.completedAnime = state.userData.completedAnime || [];
                const idx = state.userData.completedAnime.indexOf(animeIdStr);
                if (idx > -1) {
                    state.userData.completedAnime.splice(idx, 1);
                } else {
                    state.userData.completedAnime.push(animeIdStr);
                }
            }
        }
    }
})

export const {login, logout, toggleListOptimistic} = AuthSlice.actions;

export const AuthReducer =  AuthSlice.reducer

const ToastSlice = createSlice({
    name: 'toast',
    initialState: {
        message: null,
        type: 'info',
        visible: false
    },
    reducers: {
        showToast: (state, action) => {
            state.message = action.payload.message;
            state.type = action.payload.type || 'info';
            state.visible = true;
        },
        hideToast: (state) => {
            state.visible = false;
            state.message = null;
        }
    }
});

export const { showToast, hideToast } = ToastSlice.actions;
export const ToastReducer = ToastSlice.reducer;

const UserSlice = createSlice({
    name: 'user',
    initialState: {
        watchlist: null,
        loading: false,
    },
    reducer: {
        preferences: (state, action) => {
            state.watchlist = action.payload.watchlist,
            state.loading = action.payload.loading
        }
    }
})

export const {preferences} = UserSlice.actions;

export const UserReducer = UserSlice.reducer