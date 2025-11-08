import { setData } from './core/state.js';
import { loadData } from './storage/repository.js';
import { createDesk } from './features/board.js';
import { renderHeader } from './ui/header.js';
import { renderColumns } from './ui/columns.js';

async function init(){
  const loaded = await loadData();
  setData(loaded ?? { desks: [], activeDeskId: null });
  // seed if empty
  const { desks, activeDeskId } = loaded ?? {};
  if(!desks?.length){
    const d = createDesk('Main Desk'); // внутри сохранит и активирует
    // можно здесь добавить стартовые колонки/карточки, если нужно
  }
  renderHeader(); 
  renderColumns();
}
init();
