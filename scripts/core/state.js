export const state = {
    data: { desks: [], activeDeskId: null },
  };
  export function setData(next){ state.data = next; }
  export function getData(){ return state.data; }
  