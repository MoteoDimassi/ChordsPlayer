/**
 * Модуль для сопоставления нот аккорда с аппликатурами на гитаре
 * Использует notes.json для определения нот на каждой струне и ладу
 * Реализует 5 основных типов аппликатур для гитарных аккордов
 */

// Загрузка данных о нотах (в реальном приложении это может быть загружено из файла)
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

// Определение 5 типов аппликатур с расположением ступеней
const CHORD_SHAPES = {
  // 1. Аппликатура от 6-й струны к 1-й: 1 5 1 3 5 1 (минорная)
  SHAPE_6_MINOR: {
    name: "Аппликатура от 6-й струны (минорная)",
    strings: ["6E", "5A", "4D", "3G", "2B", "1e"],
    degrees: [1, 5, 1, 3, 5, 1],
    isMajor: false
  },
  
  // 2. Аппликатура от 6-й струны: 1 3 5 1 5 1 (мажорная)
  SHAPE_6_MAJOR: {
    name: "Аппликатура от 6-й струны (мажорная)",
    strings: ["6E", "5A", "4D", "3G", "2B", "1e"],
    degrees: [1, 3, 5, 1, 5, 1],
    isMajor: true
  },
  
  // 3. Аппликатура от 5-й струны: 1 5 1 3 5
  SHAPE_5_MINOR: {
    name: "Аппликатура от 5-й струны (минорная)",
    strings: ["5A", "4D", "3G", "2B", "1e"],
    degrees: [1, 5, 1, 3, 5],
    isMajor: false
  },
  
  // 4. Аппликатура от 5-й струны: 1 3 5 1 3 (мажорная)
  SHAPE_5_MAJOR: {
    name: "Аппликатура от 5-й струны (мажорная)",
    strings: ["5A", "4D", "3G", "2B", "1e"],
    degrees: [1, 3, 5, 1, 3],
    isMajor: true
  },
  
  // 5. Аппликатура от 4-й струны: 1 5 1 3
  SHAPE_4: {
    name: "Аппликатура от 4-й струны",
    strings: ["4D", "3G", "2B", "1e"],
    degrees: [1, 5, 1, 3],
    isMajor: null // Может быть и мажорной, и минорной
  }
};

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
 * Определяет ступень ноты в аккорде (1, 3, 5, 7 и т.д.)
 * @param {string} note - Нота для проверки
 * @param {string} rootNote - Тоника аккорда
 * @param {Array} chordNotes - Все ноты аккорда
 * @returns {number} - Ступень ноты в аккорде
 */
function getNoteDegree(note, rootNote, chordNotes) {
  const chromaticScale = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const rootIndex = chromaticScale.indexOf(rootNote);
  const noteIndex = chromaticScale.indexOf(note);
  
  if (rootIndex === -1 || noteIndex === -1) {
    return -1;
  }
  
  // Вычисляем интервал в полутонах
  let interval = (noteIndex - rootIndex + 12) % 12;
  
  // Определяем ступень на основе интервала
  switch (interval) {
    case 0: return 1;   // Тоника
    case 3: return 3;   // Малая терция
    case 4: return 3;   // Большая терция (определяется типом аккорда)
    case 5: return 4;   // Увеличенная терция
    case 7: return 5;   // Квинта
    case 8: return 5;   // Уменьшенная квинта
    case 10: return 7;  // Малая септима
    case 11: return 7;  // Большая септима
    default: return -1; // Неопределенная ступень
  }
}

/**
 * Определяет, является ли аккорд мажорным или минорным
 * @param {Array} chordNotes - Ноты аккорда
 * @param {string} rootNote - Тоника аккорда
 * @returns {boolean} - true для мажорного, false для минорного
 */
function isChordMajor(chordNotes, rootNote) {
  const chromaticScale = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const rootIndex = chromaticScale.indexOf(rootNote);
  
  // Ищем терцию в аккорде
  for (const note of chordNotes) {
    const noteIndex = chromaticScale.indexOf(note);
    if (noteIndex === -1) continue;
    
    const interval = (noteIndex - rootIndex + 12) % 12;
    
    // Большая терция (4 полутона) - мажорный
    // Малая терция (3 полутона) - минорный
    if (interval === 4) return true;
    if (interval === 3) return false;
  }
  
  // Если терция не найдена, по умолчанию считаем мажорным
  return true;
}

/**
 * Находит самую низкую ноту аккорда (тонику) на грифе
 * @param {Array} chordNotes - Ноты аккорда
 * @returns {Object} - Информация о самой низкой ноте {note, string, fret, midi, octave}
 */
function findLowestRootNote(chordNotes) {
  let lowestNote = null;
  let lowestMidi = Infinity;
  
  // Проходим по всем струнам и ладам
  Object.keys(NOTES_DATA).forEach(string => {
    NOTES_DATA[string].forEach((noteWithOctave, fret) => {
      const noteName = extractNoteName(noteWithOctave);
      
      // Проверяем, является ли нота частью аккорда
      if (chordNotes.includes(noteName)) {
        const midiNumber = calculateMidiNumber(noteWithOctave);
        
        // Ищем самую низкую ноту
        if (midiNumber < lowestMidi) {
          lowestMidi = midiNumber;
          lowestNote = {
            note: noteName,
            string: string,
            fret: fret,
            midi: midiNumber,
            octave: extractOctave(noteWithOctave)
          };
        }
      }
    });
  });
  
  return lowestNote;
}

/**
 * Находит корневую ноту на открытой струне
 *
 * ПРАВИЛО: Если есть возможность найти корневую ноту на открытой струне,
 * тогда делать аппликатуру именно от этой ноты
 *
 * @param {Array} chordNotes - Ноты аккорда
 * @returns {Object|null} - Информация о корневой ноте на открытой струне или null
 */
function findRootNoteOnOpenString(chordNotes) {
  const rootNote = chordNotes[0];
  
  // Проверяем каждую открытую струну (лад 0)
  const openStrings = ["6E", "5A", "4D", "3G", "2B", "1e"];
  
  console.log(`Проверяем наличие корневой ноты "${rootNote}" на открытых струнах...`);
  
  for (const string of openStrings) {
    const openNote = NOTES_DATA[string][0];
    if (!openNote) continue;
    
    const noteName = extractNoteName(openNote);
    
    // Если на открытой струне есть корневая нота
    if (noteName === rootNote) {
      console.log(`Найдена корневая нота "${rootNote}" на открытой струне ${string}`);
      return {
        note: noteName,
        string: string,
        fret: 0,
        midi: calculateMidiNumber(openNote),
        octave: extractOctave(openNote)
      };
    }
  }
  
  console.log(`Корневая нота "${rootNote}" не найдена на открытых струнах`);
  return null;
}

/**
 * Подбирает аппликатуру для аккорда на основе 5 основных типов
 * @param {Array} chordNotes - Ноты аккорда
 * @param {string} chordName - Название аккорда (для определения типа)
 * @returns {Object} - Найденная аппликатура или null
 */
function findChordShape(chordNotes, chordName) {
  // Определяем тонику аккорда (первая нота в массиве)
  const rootNote = chordNotes[0];
  
  // Определяем, является ли аккорд мажорным или минорным
  const isMajor = isChordMajor(chordNotes, rootNote);
  
  // Сначала проверяем, есть ли корневая нота на открытой струне
  const openStringRoot = findRootNoteOnOpenString(chordNotes);
  
  let rootPosition;
  if (openStringRoot) {
    rootPosition = openStringRoot;
    console.log(`Корневая нота "${rootNote}" найдена на открытой струне ${rootPosition.string}`);
  } else {
    // Если нет на открытой струне, ищем самую низкую ноту (тонику) на грифе
    rootPosition = findLowestRootNote(chordNotes);
    
    if (!rootPosition) {
      console.warn(`Не найдена тоника "${rootNote}" на грифе в пределах ладов 0-4`);
      return null;
    }
    
    console.log(`Тоника "${rootNote}" найдена на струне ${rootPosition.string}, лад ${rootPosition.fret}`);
  }
  
  // Определяем возможные типы аппликатур на основе положения тоники
  let possibleShapes = [];
  
  // Если тоника на 6-й струне
  if (rootPosition.string === "6E") {
    possibleShapes = isMajor ?
      [CHORD_SHAPES.SHAPE_6_MAJOR] :
      [CHORD_SHAPES.SHAPE_6_MINOR];
  }
  // Если тоника на 5-й струне
  else if (rootPosition.string === "5A") {
    possibleShapes = isMajor ?
      [CHORD_SHAPES.SHAPE_5_MAJOR] :
      [CHORD_SHAPES.SHAPE_5_MINOR];
  }
  // Если тоника на 4-й струне
  else if (rootPosition.string === "4D") {
    possibleShapes = [CHORD_SHAPES.SHAPE_4];
  }
  // Если тоника на других струнах, пробуем все варианты
  else {
    possibleShapes = [
      CHORD_SHAPES.SHAPE_6_MAJOR,
      CHORD_SHAPES.SHAPE_6_MINOR,
      CHORD_SHAPES.SHAPE_5_MAJOR,
      CHORD_SHAPES.SHAPE_5_MINOR,
      CHORD_SHAPES.SHAPE_4
    ];
  }
  
  // Пробуем найти подходящую аппликатуру
  for (const shape of possibleShapes) {
    const fingering = tryShape(chordNotes, rootNote, shape, rootPosition);
    if (fingering) {
      return {
        shape: shape.name,
        fingering: fingering,
        rootPosition: rootPosition
      };
    }
  }
  
  console.warn(`Не найдено подходящей аппликатуры для аккорда ${chordName}`);
  return null;
}

/**
 * Пытается построить аппликатуру для заданного типа
 * @param {Array} chordNotes - Ноты аккорда
 * @param {string} rootNote - Тоника аккорда
 * @param {Object} shape - Тип аппликатуры
 * @param {Object} rootPosition - Положение тоники на грифе
 * @returns {Array} - Аппликатура или null
 */
function tryShape(chordNotes, rootNote, shape, rootPosition) {
  const fingering = [];
  const rootFret = rootPosition.fret;
  
  // Проходим по струнам в аппликатуре
  for (let i = 0; i < shape.strings.length; i++) {
    const string = shape.strings[i];
    const degree = shape.degrees[i];
    
    // Определяем, какую ноту нужно найти на этой струне
    let targetNote = null;
    
    if (degree === 1) {
      targetNote = rootNote;
    } else {
      // Ищем ноту соответствующей ступени в аккорде
      for (const note of chordNotes) {
        const noteDegree = getNoteDegree(note, rootNote, chordNotes);
        if (noteDegree === degree) {
          targetNote = note;
          break;
        }
      }
    }
    
    if (!targetNote) {
      console.warn(`Не найдена нота для ступени ${degree} на струне ${string}`);
      return null;
    }
    
    // Ищем позицию для этой ноты на струне
    let foundPosition = null;
    
    for (let fret = 0; fret <= 7; fret++) {
      const noteWithOctave = NOTES_DATA[string][fret];
      if (!noteWithOctave) continue;
      
      const noteName = extractNoteName(noteWithOctave);
      if (noteName === targetNote) {
        foundPosition = {
          string: string,
          fret: fret,
          note: noteName,
          midi: calculateMidiNumber(noteWithOctave),
          octave: extractOctave(noteWithOctave)
        };
        break;
      }
    }
    
    if (!foundPosition) {
      // Если нота ниже открытой струны, пробуем перенести на струну выше
      if (i < shape.strings.length - 1) {
        const nextString = shape.strings[i + 1];
        for (let fret = 0; fret <= 4; fret++) {
          const noteWithOctave = NOTES_DATA[nextString][fret];
          if (!noteWithOctave) continue;
          
          const noteName = extractNoteName(noteWithOctave);
          if (noteName === targetNote) {
            foundPosition = {
              string: nextString,
              fret: fret,
              note: noteName,
              midi: calculateMidiNumber(noteWithOctave),
              octave: extractOctave(noteWithOctave)
            };
            console.log(`Нота ${targetNote} перенесена со струны ${string} на ${nextString}`);
            break;
          }
        }
      }
      
      if (!foundPosition) {
        console.warn(`Не найдена нота ${targetNote} на струне ${string} в пределах ладов 0-4`);
        return null;
      }
    }
    
    fingering.push(foundPosition);
  }
  
  return fingering;
}

/**
 * Находит аппликатуру для аккорда (основная функция)
 * @param {Array} chordNotes - Ноты аккорда
 * @param {string} chordName - Название аккорда
 * @returns {Object} - Результат подбора аппликатуры
 */
function findChordPositions(chordNotes, chordName = '') {
  const result = {
    chordName: chordName,
    notes: chordNotes,
    shape: null,
    fingering: [],
    alternatives: []
  };
  
  // Находим основную аппликатуру
  const shapeResult = findChordShape(chordNotes, chordName);
  
  if (shapeResult) {
    result.shape = shapeResult.shape;
    result.fingering = shapeResult.fingering;
    result.rootPosition = shapeResult.rootPosition;
    
    console.log(`Найдена аппликатура для аккорда ${chordName}: ${shapeResult.shape}`);
    console.log(`Аппликатура:`, shapeResult.fingering);
  } else {
    console.warn(`Не найдено аппликатуры для аккорда ${chordName}`);
  }
  
  return result;
}

/**
 * Выводит информацию о найденной аппликатуре в консоль
 * @param {Object} chordResult - Результат функции findChordPositions
 */
function logPositions(chordResult) {
  console.log(`\nАнализ аккорда "${chordResult.chordName}":`);
  console.log(`Ноты аккорда: [${chordResult.notes.join(', ')}]`);
  
  if (chordResult.shape) {
    console.log(`Тип аппликатуры: ${chordResult.shape}`);
    console.log(`Положение тоники: струна ${chordResult.rootPosition.string}, лад ${chordResult.rootPosition.fret}`);
    console.log('Аппликатура:');
    
    chordResult.fingering.forEach((pos, index) => {
      console.log(`  ${index + 1}. Струна ${pos.string}, лад ${pos.fret}, нота ${pos.note} (октава ${pos.octave}, MIDI ${pos.midi})`);
    });
  } else {
    console.log('Аппликатура не найдена');
  }
}

/**
 * Возвращает все возможные позиции для нот аккорда (старая функция для совместимости)
 * @param {Array} chordNotes - Массив нот аккорда (без октав)
 * @returns {Object} - Словарь: note -> [ {string, fret, midi, octave} ]
 */
function findAllPossiblePositions(chordNotes) {
  const result = {};
  const missingNotes = [];
  
  // Инициализируем результат пустыми массивами для каждой ноты
  chordNotes.forEach(note => {
    result[note] = [];
  });
  
  // Проходим по каждой струне
  Object.keys(NOTES_DATA).forEach(string => {
    // Проходим по каждому ладу от 0 до 4
    for (let fret = 0; fret <= 7; fret++) {
      const noteWithOctave = NOTES_DATA[string][fret];
      if (!noteWithOctave) continue;
      const noteName = extractNoteName(noteWithOctave);
      
      // Проверяем, является ли нота частью аккорда
      if (chordNotes.includes(noteName)) {
        const octave = extractOctave(noteWithOctave);
        const midiNumber = calculateMidiNumber(noteWithOctave);
        
        // Добавляем позицию в результат
        result[noteName].push({
          string: string,
          fret: fret,
          midi: midiNumber,
          octave: octave
        });
      }
    }
  });
  
  // Проверяем, для каких нот не найдено позиций
  chordNotes.forEach(note => {
    if (result[note].length === 0) {
      missingNotes.push(note);
      console.warn(`Предупреждение: для ноты "${note}" не найдено позиций в пределах ладов 0-4`);
    }
  });
  
  // Логируем отсутствующие соответствия
  if (missingNotes.length > 0) {
    console.warn(`Отсутствующие соответствия для нот: ${missingNotes.join(', ')}`);
  } else {
    console.log(`Для всех нот аккорда найдены позиции в пределах ладов 0-4`);
  }
  
  return result;
}

// Экспортируем функции для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    findChordPositions,
    findAllPossiblePositions,
    logPositions,
    findChordShape,
    findLowestRootNote,
    findRootNoteOnOpenString,
    isChordMajor,
    getNoteDegree,
    extractNoteName,
    extractOctave,
    calculateMidiNumber
  };
} else {
  // Для использования в браузере
  window.ChordMatcher = {
    findChordPositions,
    findAllPossiblePositions,
    logPositions,
    findChordShape,
    findLowestRootNote,
    findRootNoteOnOpenString,
    isChordMajor,
    getNoteDegree,
    extractNoteName,
    extractOctave,
    calculateMidiNumber
  };
}