import type { Folder } from '../api/tasks';

interface FolderChipsProps {
  folders: Folder[];
  selectedId: number | 'all';
  onSelect: (id: number | 'all') => void;
}

export default function FolderChips({ folders, selectedId, onSelect }: FolderChipsProps) {
  return (
    <div className="folder-chips-container">
      <button 
        className={`folder-chip ${selectedId === 'all' ? 'active' : ''}`}
        onClick={() => onSelect('all')}
      >
        📋 Все задачи
      </button>
      
      {folders.map(folder => (
        <button 
          key={folder.id}
          className={`folder-chip ${selectedId === folder.id ? 'active' : ''}`}
          onClick={() => onSelect(folder.id)}
        >
          📁 {folder.name}
        </button>
      ))}
    </div>
  );
}
