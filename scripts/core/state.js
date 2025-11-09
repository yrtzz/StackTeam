
export const state = {
 
  user: null, 
  data: {
    desks: [],
    activeDeskId: null,
  },
};

export function setUser(user) {
  state.user = user
    ? {
        uid: user.uid,
        email: user.email ?? null,
        displayName: user.displayName ?? null,
      }
    : null;
}
export function getUser() {
  return state.user;
}
export function setData(next) {
  state.data = next || { desks: [], activeDeskId: null };
}
export function getData() {
  return state.data;
}
