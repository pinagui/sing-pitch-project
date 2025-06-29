import React from 'react';

interface Note {
  note: string;
  octave: number;
  frequency: number;
  display: string;
}

interface NoteSelectorProps {
  notes: Note[];
  selectedNote: Note | null;
  onSelectNote: (note: Note | null) => void;
}

const NoteSelector: React.FC<NoteSelectorProps> = ({ notes, selectedNote, onSelectNote }) => {
  return (
    <div className="space-y-3">
      <select
        value={selectedNote ? `${selectedNote.note}${selectedNote.octave}` : ''}
        onChange={(e) => {
          if (e.target.value === '') {
            onSelectNote(null);
          } else {
            const selected = notes.find(note => note.display === e.target.value);
            onSelectNote(selected || null);
          }
        }}
        className="w-full px-3 py-2 sm:py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-music-primary/50 focus:border-music-primary/50 text-sm sm:text-base"
      >
        <option value="" className="bg-gray-800 text-white">
          Selecione uma nota...
        </option>
        {notes.map((note) => (
          <option 
            key={note.display} 
            value={note.display}
            className="bg-gray-800 text-white"
          >
            {note.display} - {note.frequency} Hz
          </option>
        ))}
      </select>
      
      {selectedNote && (
        <button
          onClick={() => onSelectNote(null)}
          className="w-full px-3 py-2 text-xs sm:text-sm bg-music-error/20 text-music-error hover:bg-music-error/30 rounded-lg transition-colors"
        >
          Limpar seleção
        </button>
      )}
    </div>
  );
};

export default NoteSelector; 