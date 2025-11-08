export function confirmModal({title='Confirm', text='Are you sure?'}){ /* вернуть Promise<boolean> */ }
export function promptModal({title='Title', label='Text', initial=''}){ /* Promise<string|null> */ }
export function cardEditorModal({text='', img=''}){ /* Promise<{text,img} | null> */ }
