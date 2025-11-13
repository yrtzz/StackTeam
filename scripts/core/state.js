
export const state = {
  // Firebase / основное приложение
  user: null,
  data: {
    desks: [],
    activeDeskId: null,
  },

  // UI-состояние Krello (app.html)
  krello: {
    currentSection: "inbox",   // inbox | boards | favorites
    currentBoard: "main",      // main | personal | work
    columnIdCounter: 5,
    cardIdCounter: 10,
    activeColumnMenu: null,
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

export function getKrelloState() {
  return state.krello;
}
