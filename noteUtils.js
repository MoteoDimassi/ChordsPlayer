/**
 * Общий модуль для работы с нотами
 * Содержит утилитарные функции и данные о нотах
 */

// Данные о нотах на грифе гитары
const NOTES_DATA = {
  "6E": ["E1", "F1", "F#1", "G1", "G#1", "A1", "A#1", "B1"],
  "5A": ["A1", "A#1", "B1", "C2", "C#2", "D2", "D#2", "E2"],
  "4D": ["D2", "D#2", "E2", "F2", "F#2", "G2", "G#2", "A2"],
  "3G": ["G2", "G#2", "A2", "A#2", "B2", "C3", "C#3", "D3"],
  "2B": ["B2", "C2", "C#2", "D2", "D#2", "E3", "F3", "F#3"],
  "1e": ["E3", "F3", "F#3", "G3", "G#3", "A3", "A#3", "B3"]
};

// MIDI номера нот для вычисления (C4 = MIDI 60)
const NOTE_MIDI_NUMBERS = {
  'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5,
  'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11
};

// Порядок струн от самой низкой к самой высокой
const STRINGS_ORDER = ["6E", "5A", "4D", "3G", "2B", "1e"];

/**
 * Извлекает имя ноты без октавы
 * @param {string} noteWithOctave - Нота с октавой (например, "C#4")
 * @returns {string} - Имя ноты без октавы (например, "C#")
 */
function extractNoteName(noteWithOctave) {
  return noteWithOctave.replace(/[0-9]/g, '');
}

/**
 * Извлекает октаву из ноты
 * @param {string} noteWithOctave - Нота с октавой (например, "C#4")
 * @returns {number} - Октава (например, 4)
 */
function extractOctave(noteWithOctave) {
  const octaveMatch = noteWithOctave.match(/(\d+)/);
  return octaveMatch ? parseInt(octaveMatch[1]) : 0;
}

/**
 * Вычисляет MIDI номер ноты
 * @param {string} noteWithOctave - Нота с октавой (например, "C#4")
 * @returns {number} - MIDI номер ноты
 */
function calculateMidiNumber(noteWithOctave) {
  const noteName = extractNoteName(noteWithOctave);
  const octave = extractOctave(noteWithOctave);
  const noteNumber = NOTE_MIDI_NUMBERS[noteName];
  
  if (noteNumber === undefined) {
    throw new Error(`Неизвестная нота: ${noteName}`);
  }
  
  // MIDI формула: (октава + 1) * 12 + номер ноты
  return (octave + 1) * 12 + noteNumber;
}

/**
 * Находит все возможные позиции для каждой ноты аккорда
 * @param {Array} chordNotes - Ноты аккорда (без октав)
 * @returns {Object} - Словарь: note -> [ {string, fret, note} ]
 */
function findAllPossiblePositions(chordNotes) {
  const result = {};
  
  // Инициализируем результат пустыми массивами для каждой ноты
  chordNotes.forEach(note => {
    result[note] = [];
  });
  
  // Проходим по каждой струне
  Object.keys(NOTES_DATA).forEach(string => {
    // Проходим по каждому ладу от 0 до 7
    for (let fret = 0; fret <= 7; fret++) {
      const noteWithOctave = NOTES_DATA[string][fret];
      if (!noteWithOctave) continue;
      const noteName = extractNoteName(noteWithOctave);
      
      // Проверяем, является ли нота частью аккорда
      if (chordNotes.includes(noteName)) {
        // Добавляем позицию в результат
        result[noteName].push({
          string: string,
          fret: fret,
          note: noteName
        });
      }
    }
  });
  
  return result;
}

// Экспортируем функции и данные для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    NOTES_DATA,
    NOTE_MIDI_NUMBERS,
    STRINGS_ORDER,
    extractNoteName,
    extractOctave,
    calculateMidiNumber,
    findAllPossiblePositions
  };
} else {
  // Для использования в браузере
  window.NoteUtils = {
    NOTES_DATA,
    NOTE_MIDI_NUMBERS,
    STRINGS_ORDER,
    extractNoteName,
    extractOctave,
    calculateMidiNumber,
    findAllPossiblePositions
  };
}