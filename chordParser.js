/**
 * Модуль для парсинга аккордов в набор нот
 * Поддерживаемые типы аккордов: maj, m, dim, aug, 7, maj7, m7, sus2, sus4, add9, 6
 */

// Определяем ноты в хроматической гамме для вычисления интервалов
const CHROMATIC_SCALE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Словарь для преобразования альтерированных нот
const NOTE_ALIASES = {
  'C♭': 'B',
  'B#': 'C',
  'E#': 'F',
  'F♭': 'E',
  'D♭': 'C#',
  'E♭': 'D#',
  'G♭': 'F#',
  'A♭': 'G#',
  'B♭': 'A#',
  'Db': 'C#',
  'Eb': 'D#',
  'Gb': 'F#',
  'Ab': 'G#',
  'Bb': 'A#',
  'cb': 'B',
  'b#': 'C',
  'e#': 'F',
  'fb': 'E',
  'db': 'C#',
  'eb': 'D#',
  'gb': 'F#',
  'ab': 'G#',
  'bb': 'A#'
};

// Интервалы для различных типов аккордов (в полутонах от основной ноты)
const CHORD_INTERVALS = {
  // Мажорный трезвучие (1, 3, 5)
  'maj': [0, 4, 7],
  '': [0, 4, 7],  // Пустая строка для неявного мажора
  
  // Минорный трезвучие (1, b3, 5)
  'm': [0, 3, 7],
  'min': [0, 3, 7],
  '-': [0, 3, 7],
  
  // Уменьшенный (1, b3, b5)
  'dim': [0, 3, 6],
  '°': [0, 3, 6],
  
  // Увеличенный (1, 3, #5)
  'aug': [0, 4, 8],
  '+': [0, 4, 8],
  
  // Доминантсепт (1, 3, 5, b7)
  '7': [0, 4, 7, 10],
  
  // Мажорный септ (1, 3, 5, 7)
  'maj7': [0, 4, 7, 11],
  'M7': [0, 4, 7, 11],
  'Δ': [0, 4, 7, 11],
  
  // Минорный септ (1, b3, 5, b7)
  'm7': [0, 3, 7, 10],
  'min7': [0, 3, 7, 10],
  '-7': [0, 3, 7, 10],
  
  // Sus2 (1, 2, 5)
  'sus2': [0, 2, 7],
  
  // Sus4 (1, 4, 5)
  'sus4': [0, 5, 7],
  'sus': [0, 5, 7],
  
  // Add9 (1, 3, 5, 9)
  'add9': [0, 4, 7, 14],
  '2': [0, 4, 7, 14],
  
  // Мажорный шестой (1, 3, 5, 6)
  '6': [0, 4, 7, 9],
  'maj6': [0, 4, 7, 9],
  'M6': [0, 4, 7, 9]
};

/**
 * Нормализует название ноты, преобразуя альтерации в стандартный формат
 * @param {string} note - Название ноты
 * @returns {string} - Нормализованное название ноты
 */
function normalizeNote(note) {
  if (NOTE_ALIASES[note]) {
    return NOTE_ALIASES[note];
  }
  return note;
}

/**
 * Находит индекс ноты в хроматической гамме
 * @param {string} note - Название ноты
 * @returns {number} - Индекс ноты в гамме
 */
function getNoteIndex(note) {
  const normalizedNote = normalizeNote(note);
  return CHROMATIC_SCALE.indexOf(normalizedNote);
}

/**
 * Вычисляет ноту по индексу в хроматической гамме
 * @param {number} index - Индекс ноты
 * @returns {string} - Название ноты
 */
function getNoteByIndex(index) {
  const normalizedIndex = ((index % 12) + 12) % 12; // Обработка отрицательных индексов
  return CHROMATIC_SCALE[normalizedIndex];
}

/**
 * Нормализует ввод аккорда
 * @param {string} chordName - Название аккорда
 * @returns {string} - Нормализованное название аккорда
 */
function normalizeChordInput(chordName) {
  return chordName.trim().replace(/\s+/g, '');
}

/**
 * Разделяет аккорд на основную ноту и тип аккорда
 * @param {string} chordName - Название аккорда
 * @returns {Object} - Объект с полями root и type
 */
function parseChordName(chordName) {
  const normalized = normalizeChordInput(chordName);
  
  // Регулярное выражение для извлечения основной ноты и типа аккорда
  const match = normalized.match(/^([A-G][#b]?)(.*)$/);
  
  if (!match) {
    throw new Error(`Неверный формат аккорда: ${chordName}`);
  }
  
  const root = normalizeNote(match[1]);
  const type = match[2] || '';  // Пустая строка для неявного мажора
  
  return { root, type };
}

/**
 * Основная функция парсинга аккорда
 * @param {string} chordName - Название аккорда
 * @returns {Array} - Массив нот аккорда
 */
function parseChord(chordName) {
  try {
    const { root, type } = parseChordName(chordName);
    
    // Проверяем, поддерживается ли тип аккорда
    if (!CHORD_INTERVALS.hasOwnProperty(type)) {
      throw new Error(`Неподдерживаемый тип аккорда: ${type}`);
    }
    
    const intervals = CHORD_INTERVALS[type];
    const rootIndex = getNoteIndex(root);
    
    if (rootIndex === -1) {
      throw new Error(`Неизвестная нота: ${root}`);
    }
    
    // Вычисляем ноты аккорда на основе интервалов
    const notes = intervals.map(interval => {
      const noteIndex = rootIndex + interval;
      return getNoteByIndex(noteIndex);
    });
    
    return notes;
  } catch (error) {
    console.error(`Ошибка при парсинге аккорда ${chordName}:`, error.message);
    throw error;
  }
}

/**
 * Проверяет, является ли аккорд поддерживаемым типом
 * @param {string} chordName - Название аккорда
 * @returns {boolean} - true, если аккорд поддерживается
 */
function isSupportedChord(chordName) {
  try {
    const { type } = parseChordName(chordName);
    return CHORD_INTERVALS.hasOwnProperty(type);
  } catch (error) {
    return false;
  }
}

/**
 * Возвращает список поддерживаемых типов аккордов
 * @returns {Array} - Массив поддерживаемых типов
 */
function getSupportedChordTypes() {
  return Object.keys(CHORD_INTERVALS);
}

// Экспортируем функции для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    parseChord,
    isSupportedChord,
    getSupportedChordTypes,
    normalizeNote,
    normalizeChordInput
  };
} else {
  // Для использования в браузере
  window.ChordParser = {
    parseChord,
    isSupportedChord,
    getSupportedChordTypes,
    normalizeNote,
    normalizeChordInput
  };
}