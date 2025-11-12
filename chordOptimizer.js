/**
 * Модуль для поиска оптимальной аппликатуры аккорда на гитаре
 * Реализует эвристический алгоритм с учетом ограничений:
 * - Максимум растяжения между ладами (рекомендовано: 4)
 * - Минимальное количество пальцев
 * - Приоритет открытых струн
 */

// Импортируем данные и функции из общего модуля
// Используем доступ через объект NoteUtils, чтобы избежать конфликтов имен

// Веса для оценочной функции
const SCORE_WEIGHTS = {
  fretRange: -2.0,      // Штраф за широкий диапазон ладов
  openStrings: 1.5,     // Бонус за открытые струны
  barreChords: -1.0,    // Штраф за аккорды с баррэ
  standardChords: 2.0    // Бонус за соответствие стандартным аппликатурам
};

// Стандартные аппликатуры для базовых аккордов (для бонуса в оценочной функции)
const STANDARD_CHORDS = {
  "C": [
    { string: "6E", fret: -1, note: null }, // Mute
    { string: "5A", fret: 3, note: "C" },
    { string: "4D", fret: 2, note: "E" },
    { string: "3G", fret: 0, note: "G" },
    { string: "2B", fret: 1, note: "C" },
    { string: "1e", fret: 0, note: "E" }
  ],
  "G": [
    { string: "6E", fret: 3, note: "G" },
    { string: "5A", fret: 2, note: "B" },
    { string: "4D", fret: 0, note: "D" },
    { string: "3G", fret: 0, note: "G" },
    { string: "2B", fret: 0, note: "B" },
    { string: "1e", fret: 3, note: "G" }
  ],
  "D": [
    { string: "6E", fret: -1, note: null }, // Mute
    { string: "5A", fret: -1, note: null }, // Mute
    { string: "4D", fret: 0, note: "D" },
    { string: "3G", fret: 2, note: "A" },
    { string: "2B", fret: 3, note: "D" },
    { string: "1e", fret: 2, note: "F#" }
  ],
  "Am": [
    { string: "6E", fret: -1, note: null }, // Mute
    { string: "5A", fret: 0, note: "A" },
    { string: "4D", fret: 2, note: "E" },
    { string: "3G", fret: 2, note: "A" },
    { string: "2B", fret: 1, note: "C" },
    { string: "1e", fret: 0, note: "E" }
  ],
  "Em": [
    { string: "6E", fret: 0, note: "E" },
    { string: "5A", fret: 2, note: "B" },
    { string: "4D", fret: 2, note: "E" },
    { string: "3G", fret: 0, note: "G" },
    { string: "2B", fret: 0, note: "B" },
    { string: "1e", fret: 0, note: "E" }
  ]
};


/**
 * Генерирует все возможные комбинации позиций для аккорда
 * @param {Object} positionsByNote - Словарь: note -> [ {string, fret, note} ]
 * @param {Array} chordNotes - Ноты аккорда
 * @returns {Array} - Массив всех возможных аппликатур
 */
function generateAllCombinations(positionsByNote, chordNotes) {
  const combinations = [];
  
  // Рекурсивная функция для генерации комбинаций
  function generateCombination(currentCombination, remainingNotes) {
    if (remainingNotes.length === 0) {
      // Создаем полную аппликатуру для всех 6 струн
      const fullFingering = createFullFingering(currentCombination);
      combinations.push(fullFingering);
      return;
    }
    
    const currentNote = remainingNotes[0];
    const positions = positionsByNote[currentNote];
    
    // Пробуем каждую позицию для текущей ноты
    for (const position of positions) {
      // Проверяем, не занята ли уже струна
      const stringAlreadyUsed = currentCombination.some(pos => pos.string === position.string);
      
      if (!stringAlreadyUsed) {
        generateCombination([...currentCombination, position], remainingNotes.slice(1));
      }
    }
  }
  
  generateCombination([], chordNotes);
  return combinations;
}

/**
 * Создает полную аппликатуру для всех 6 струн на основе выбранных позиций
 * @param {Array} selectedPositions - Выбранные позиции для нот аккорда
 * @returns {Array} - Полная аппликатура для всех 6 струн
 */
function createFullFingering(selectedPositions) {
  const fingering = [];
  
  // Проходим по всем струнам в порядке от 6-й к 1-й
  for (const string of window.NoteUtils.STRINGS_ORDER) {
    const position = selectedPositions.find(pos => pos.string === string);
    
    if (position) {
      fingering.push(position);
    } else {
      // Если струна не используется в аккорде, помечаем как немую
      fingering.push({
        string: string,
        fret: -1, // -1 означает, что струна не играет (mute)
        note: null
      });
    }
  }
  
  return fingering;
}

/**
 * Вычисляет диапазон ладов в аппликатуре
 * @param {Array} fingering - Аппликатура
 * @returns {number} - Диапазон ладов (max - min)
 */
function calculateFretRange(fingering) {
  const activeFrets = fingering
    .filter(pos => pos.fret >= 0)
    .map(pos => pos.fret);
  
  if (activeFrets.length === 0) return 0;
  
  const minFret = Math.min(...activeFrets);
  const maxFret = Math.max(...activeFrets);
  
  return maxFret - minFret;
}

/**
 * Подсчитывает количество открытых струн в аппликатуре
 * @param {Array} fingering - Аппликатура
 * @returns {number} - Количество открытых струн
 */
function countOpenStrings(fingering) {
  return fingering.filter(pos => pos.fret === 0).length;
}

/**
 * Проверяет, требует ли аппликатура баррэ
 * @param {Array} fingering - Аппликатура
 * @returns {number} - Количество пальцев, необходимых для баррэ (0 если нет баррэ)
 */
function calculateBarreRequirement(fingering) {
  const activePositions = fingering.filter(pos => pos.fret > 0);
  
  if (activePositions.length < 2) return 0;
  
  // Группируем позиции по ладам
  const frets = {};
  activePositions.forEach(pos => {
    if (!frets[pos.fret]) {
      frets[pos.fret] = [];
    }
    frets[pos.fret].push(pos);
  });
  
  // Проверяем, есть ли лад с более чем одной позицией (требует баррэ)
  for (const fret in frets) {
    if (frets[fret].length > 1) {
      // Проверяем, являются ли позиции на соседних струнах
      const positions = frets[fret];
      positions.sort((a, b) => {
        const stringOrder = ["6E", "5A", "4D", "3G", "2B", "1e"];
        return stringOrder.indexOf(a.string) - stringOrder.indexOf(b.string);
      });
      
      // Если позиции на соседних струнах, это может быть баррэ
      let isBarre = true;
      for (let i = 0; i < positions.length - 1; i++) {
        const currentIndex = STRINGS_ORDER.indexOf(positions[i].string);
        const nextIndex = STRINGS_ORDER.indexOf(positions[i + 1].string);
        
        if (nextIndex - currentIndex > 1) {
          isBarre = false;
          break;
        }
      }
      
      if (isBarre) {
        return positions.length; // Возвращаем количество пальцев для баррэ
      }
    }
  }
  
  return 0; // Баррэ не требуется
}

/**
 * Проверяет соответствие аппликатуры стандартным
 * @param {Array} fingering - Аппликатура
 * @param {string} chordName - Название аккорда
 * @returns {number} - Степень соответствия (0-1)
 */
function calculateStandardChordMatch(fingering, chordName) {
  // Извлекаем базовое название аккорда (без указаний типа)
  const baseChordName = chordName.replace(/[^A-G]/g, '');
  
  if (!STANDARD_CHORDS[baseChordName]) {
    return 0; // Нет стандартной аппликатуры для сравнения
  }
  
  const standardFingering = STANDARD_CHORDS[baseChordName];
  let matches = 0;
  let total = 0;
  
  for (let i = 0; i < fingering.length; i++) {
    const pos = fingering[i];
    const standardPos = standardFingering[i];
    
    if (standardPos.fret === -1) {
      // Если в стандартной аппликатуре струна не играет, не учитываем ее
      continue;
    }
    
    total++;
    
    if (pos.fret === standardPos.fret && pos.note === standardPos.note) {
      matches++;
    }
  }
  
  return total > 0 ? matches / total : 0;
}

/**
 * Вычисляет оценку для аппликатуры
 * @param {Array} fingering - Аппликатура
 * @param {string} chordName - Название аккорда
 * @returns {number} - Оценка аппликатуры
 */
function calculateScore(fingering, chordName) {
  const fretRange = calculateFretRange(fingering);
  const openStrings = countOpenStrings(fingering);
  const barreRequirement = calculateBarreRequirement(fingering);
  const standardMatch = calculateStandardChordMatch(fingering, chordName);
  
  // Применяем веса
  let score = 0;
  score += SCORE_WEIGHTS.fretRange * fretRange;
  score += SCORE_WEIGHTS.openStrings * openStrings;
  score += SCORE_WEIGHTS.barreChords * barreRequirement;
  score += SCORE_WEIGHTS.standardChords * standardMatch;
  
  return score;
}

/**
 * Определяет ступени нот в аккорде относительно тоники
 * @param {Array} chordNotes - Ноты аккорда
 * @param {string} rootNote - Тоника аккорда
 * @returns {Object} - Объект: нота -> ступень (1, 3, 5, 7 и т.д.)
 */
function determineNoteDegrees(chordNotes, rootNote) {
  const chromaticScale = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const rootIndex = chromaticScale.indexOf(rootNote);
  
  const noteDegrees = {};
  
  chordNotes.forEach(note => {
    const noteIndex = chromaticScale.indexOf(note);
    if (noteIndex === -1) return;
    
    // Вычисляем интервал в полутонах от тоники
    let interval = (noteIndex - rootIndex + 12) % 12;
    
    // Определяем ступень на основе интервала
    let degree;
    switch (interval) {
      case 0: degree = 1; break;   // Тоника
      case 3: degree = 3; break;   // Малая терция
      case 4: degree = 3; break;   // Большая терция
      case 7: degree = 5; break;   // Квинта
      case 10: degree = 7; break;  // Малая септима
      case 11: degree = 7; break;  // Большая септима
      default: degree = -1; break;  // Неопределенная ступень
    }
    
    noteDegrees[note] = degree;
  });
  
  return noteDegrees;
}

/**
 * Находит самую низкую корневую ноту на грифе
 * @param {string} rootNote - Тоника аккорда
 * @returns {Object} - Информация о самой низкой коревой ноте {string, fret, note}
 */
function findLowestRootNote(rootNote) {
  let lowestRoot = null;
  let lowestMidi = Infinity;
  
  // Проходим по всем струнам и ладам
  Object.keys(window.NoteUtils.NOTES_DATA).forEach(string => {
    window.NoteUtils.NOTES_DATA[string].forEach((noteWithOctave, fret) => {
      const noteName = window.NoteUtils.extractNoteName(noteWithOctave);
      
      // Проверяем, является ли нота корневой
      if (noteName === rootNote) {
        const midiNumber = window.NoteUtils.calculateMidiNumber(noteWithOctave);
        
        // Ищем самую низкую ноту
        if (midiNumber < lowestMidi) {
          lowestMidi = midiNumber;
          lowestRoot = {
            note: noteName,
            string: string,
            fret: fret
          };
        }
      }
    });
  });
  
  return lowestRoot;
}

/**
 * Находит корневую ноту на открытой струне
 *
 * ПРАВИЛО: Если есть возможность найти корневую ноту на открытой струне,
 * тогда делать аппликатуру именно от этой ноты
 *
 * @param {string} rootNote - Тоника аккорда
 * @returns {Object|null} - Информация о корневой ноте на открытой струне или null
 */
function findRootNoteOnOpenString(rootNote) {
  // Проверяем каждую открытую струну (лад 0)
  const openStrings = ["6E", "5A", "4D", "3G", "2B", "1e"];
  
  console.log(`Проверяем наличие корневой ноты "${rootNote}" на открытых струнах...`);
  
  for (const string of openStrings) {
    const openNote = window.NoteUtils.NOTES_DATA[string][0];
    if (!openNote) continue;
    
    const noteName = window.NoteUtils.extractNoteName(openNote);
    
    // Если на открытой струне есть корневая нота
    if (noteName === rootNote) {
      console.log(`Найдена корневая нота "${rootNote}" на открытой струне ${string}`);
      return {
        note: noteName,
        string: string,
        fret: 0,
        midi: window.NoteUtils.calculateMidiNumber(openNote),
        octave: window.NoteUtils.extractOctave(openNote)
      };
    }
  }
  
  console.log(`Корневая нота "${rootNote}" не найдена на открытых струнах`);
  return null;
}


/**
 * Строит аппликатуру на основе положения корневой ноты и типа аккорда
 * @param {string} rootNote - Тоника аккорда
 * @param {Array} chordNotes - Ноты аккорда
 * @param {Object} rootPosition - Положение корневой ноты
 * @param {string} chordName - Название аккорда
 * @returns {Array} - Аппликатура или null
 */
function buildChordFromRoot(rootNote, chordNotes, rootPosition, chordName) {
  // Определяем ступени нот в аккорде
  const noteDegrees = determineNoteDegrees(chordNotes, rootNote);
  
  // Определяем тип аппликатуры на основе положения корневой ноты
  let chordShape;
  if (rootPosition.string === "6E") {
    // Аппликатура от 6-й струны
    chordShape = {
      strings: ["6E", "5A", "4D", "3G", "2B", "1e"],
      degrees: [1, 5, 1, 3, 5, 1] // Базовая структура для мажора/минора
    };
  } else if (rootPosition.string === "5A") {
    // Аппликатура от 5-й струны
    chordShape = {
      strings: ["5A", "4D", "3G", "2B", "1e"],
      degrees: [1, 5, 1, 3, 5] // Базовая структура для мажора/минора
    };
  } else if (rootPosition.string === "4D") {
    // Аппликатура от 4-й струны
    chordShape = {
      strings: ["4D", "3G", "2B", "1e"],
      degrees: [1, 5, 1, 3] // Базовая структура для мажора/минора
    };
  } else {
    // Для других струн используем упрощенный подход
    chordShape = {
      strings: window.NoteUtils.STRINGS_ORDER,
      degrees: [1, 3, 5, 1, 3, 5] // Общая структура
    };
  }
  
  // Определяем, является ли аккорд мажорным или минорным
  const isMajor = chordName.includes('m') || chordName.includes('min') || chordName.includes('-') ? false : true;
  
  // Корректируем структуру в зависимости от типа аккорда
  if (!isMajor && chordShape.degrees.includes(3)) {
    // Для минорного аккорда заменяем большую терцию на малую
    chordShape.degrees = chordShape.degrees.map(d => d === 3 ? 3 : d); // Оставляем как 3, но будем искать малую терцию
  }
  
  // Строим аппликатуру
  const fingering = [];
  const rootFret = rootPosition.fret;
  
  // Проходим по струнам в аппликатуре
  for (let i = 0; i < chordShape.strings.length; i++) {
    const string = chordShape.strings[i];
    const degree = chordShape.degrees[i];
    
    // Определяем, какую ноту нужно найти на этой струне
    let targetNote = null;
    
    if (degree === 1) {
      targetNote = rootNote;
    } else {
      // Ищем ноту соответствующей ступени в аккорде
      for (const note of chordNotes) {
        if (noteDegrees[note] === degree) {
          targetNote = note;
          break;
        }
      }
    }
    
    if (!targetNote) {
      // Если нота не найдена, пропускаем струну
      fingering.push({
        string: string,
        fret: -1,
        note: null
      });
      continue;
    }
    
    // Ищем позицию для этой ноты на струне
    let foundPosition = null;
    
    // Сначала проверяем открытую струну (fret: 0) - она всегда должна рассматриваться
    if (window.NoteUtils.NOTES_DATA[string][0]) {
      const openNoteName = window.NoteUtils.extractNoteName(window.NoteUtils.NOTES_DATA[string][0]);
      if (openNoteName === targetNote) {
        foundPosition = {
          string: string,
          fret: 0,
          note: openNoteName
        };
      }
    }
    
    // Если не нашли на открытой струне, ищем в диапазоне вокруг корневой ноты
    if (!foundPosition) {
      for (let fret = Math.max(0, rootFret - 2); fret <= Math.min(7, rootFret + 2); fret++) {
        // Пропускаем лад 0, так как уже проверили
        if (fret === 0) continue;
        
        const noteWithOctave = window.NoteUtils.NOTES_DATA[string][fret];
        if (!noteWithOctave) continue;
        
        const noteName = window.NoteUtils.extractNoteName(noteWithOctave);
        if (noteName === targetNote) {
          foundPosition = {
            string: string,
            fret: fret,
            note: noteName
          };
          break;
        }
      }
    }
    
    // Если не нашли рядом с корневой нотой, ищем по всем ладам
    if (!foundPosition) {
      // Сначала проверяем открытую струну (если еще не проверена)
      if (window.NoteUtils.NOTES_DATA[string][0]) {
        const openNoteName = window.NoteUtils.extractNoteName(window.NoteUtils.NOTES_DATA[string][0]);
        if (openNoteName === targetNote) {
          foundPosition = {
            string: string,
            fret: 0,
            note: openNoteName
          };
        }
      }
      
      // Если не нашли на открытой струне, ищем по остальным ладам
      if (!foundPosition) {
        for (let fret = 1; fret <= 7; fret++) {
          const noteWithOctave = window.NoteUtils.NOTES_DATA[string][fret];
          if (!noteWithOctave) continue;
          
          const noteName = window.NoteUtils.extractNoteName(noteWithOctave);
          if (noteName === targetNote) {
            foundPosition = {
              string: string,
              fret: fret,
              note: noteName
            };
            break;
          }
        }
      }
    }
    
    if (foundPosition) {
      fingering.push(foundPosition);
    } else {
      // Если нота не найдена, помечаем струну как немую
      fingering.push({
        string: string,
        fret: -1,
        note: null
      });
    }
  }
  
  // Если аппликатура построена не на всех 6 струнах, дополняем
  if (fingering.length < 6) {
    const fullFingering = [];
    
    // Проходим по всем струнам в порядке от 6-й к 1-й
    for (const string of window.NoteUtils.STRINGS_ORDER) {
      const position = fingering.find(pos => pos.string === string);
      
      if (position) {
        fullFingering.push(position);
      } else {
        // Если струна не используется в аккорде, помечаем как немую
        fullFingering.push({
          string: string,
          fret: -1,
          note: null
        });
      }
    }
    
    return fullFingering;
  }
  
  return fingering;
}

/**
 * Находит оптимальную аппликатуру для аккорда
 * @param {Array} chordNotes - Ноты аккорда
 * @param {string} chordName - Название аккорда
 * @param {Object} options - Опции поиска
 * @returns {Object} - Результат поиска оптимальной аппликатуры
 */
function findOptimalFingering(chordNotes, chordName = '', options = {}) {
  const {
    maxFretRange = 4,    // Максимальный диапазон ладов
    topN = 3,            // Уменьшено количество возвращаемых аппликатур для оптимизации
    scoreThreshold = -5  // Пороговое значение оценки
  } = options;
  
  // 1. Определяем корневую ноту аккорда (тоника)
  const rootNote = chordNotes[0];
  
  // 2. Сначала проверяем, есть ли корневая нота на открытой струне
  const openStringRoot = findRootNoteOnOpenString(rootNote);
  
  let rootPosition;
  if (openStringRoot) {
    rootPosition = openStringRoot;
    console.log(`Корневая нота "${rootNote}" найдена на открытой струне ${rootPosition.string}`);
  } else {
    // Если нет на открытой струне, ищем самую низкую ноту (тонику) на грифе
    rootPosition = findLowestRootNote(rootNote);
    
    if (!rootPosition) {
      console.warn(`Не найдена тоника "${rootNote}" на грифе в пределах ладов 0-7`);
      return {
        chordName: chordName,
        notes: chordNotes,
        totalCombinations: 0,
        validCombinations: 0,
        hasGoodFingering: false,
        topFingerings: [],
        bestFingering: null
      };
    }
    
    console.log(`Тоника "${rootNote}" найдена на струне ${rootPosition.string}, лад ${rootPosition.fret}`);
  }
  
  // 3. Строим аппликатуру на основе положения корневой ноты
  const primaryFingering = buildChordFromRoot(rootNote, chordNotes, rootPosition, chordName);
  
  // Если основная аппликатура построена, сразу возвращаем результат
  if (primaryFingering) {
    // Вычисляем оценку для основной аппликатуры
    const primaryScore = {
      fingering: primaryFingering,
      score: calculateScore(primaryFingering, chordName),
      fretRange: calculateFretRange(primaryFingering),
      openStrings: countOpenStrings(primaryFingering),
      barreRequirement: calculateBarreRequirement(primaryFingering),
      standardMatch: calculateStandardChordMatch(primaryFingering, chordName)
    };
    
    // Проверяем, есть ли аппликатуры с оценкой выше порога
    const hasGoodFingering = primaryScore.score >= scoreThreshold;
    
    return {
      chordName: chordName,
      notes: chordNotes,
      totalCombinations: 1,
      validCombinations: hasGoodFingering ? 1 : 0,
      hasGoodFingering: hasGoodFingering,
      topFingerings: [primaryScore],
      bestFingering: primaryScore
    };
  }
  
  // Если основная аппликатура не построена, используем упрощенный поиск
  // Находим все возможные позиции для каждой ноты
  const positionsByNote = window.NoteUtils.findAllPossiblePositions(chordNotes);
  
  // Ограничиваем количество комбинаций для оптимизации
  const maxCombinations = 50;
  let allCombinations = generateAllCombinations(positionsByNote, chordNotes);
  
  // Если комбинаций слишком много, применяем эвристику для сокращения
  if (allCombinations.length > maxCombinations) {
    // Сортируем по диапазону ладов и берем только лучшие
    allCombinations.sort((a, b) => {
      const rangeA = calculateFretRange(a);
      const rangeB = calculateFretRange(b);
      return rangeA - rangeB;
    });
    
    allCombinations = allCombinations.slice(0, maxCombinations);
  }
  
  // Фильтруем комбинации по диапазону ладов
  const validCombinations = allCombinations.filter(fingering => {
    const fretRange = calculateFretRange(fingering);
    return fretRange <= maxFretRange;
  });
  
  // Если нет комбинаций, удовлетворяющих ограничениям, возвращаем лучшие из всех
  const combinationsToEvaluate = validCombinations.length > 0 ?
    validCombinations : allCombinations.slice(0, 10); // Дополнительное ограничение
  
  // Вычисляем оценку для каждой комбинации
  const scoredCombinations = combinationsToEvaluate.map(fingering => ({
    fingering: fingering,
    score: calculateScore(fingering, chordName),
    fretRange: calculateFretRange(fingering),
    openStrings: countOpenStrings(fingering),
    barreRequirement: calculateBarreRequirement(fingering),
    standardMatch: calculateStandardChordMatch(fingering, chordName)
  }));
  
  // Сортируем по убыванию оценки
  scoredCombinations.sort((a, b) => b.score - a.score);
  
  // Отбираем топ-N аппликатур
  const topCombinations = scoredCombinations.slice(0, topN);
  
  // Проверяем, есть ли аппликатуры с оценкой выше порога
  const hasGoodFingering = topCombinations.length > 0 &&
    topCombinations[0].score >= scoreThreshold;
  
  return {
    chordName: chordName,
    notes: chordNotes,
    totalCombinations: allCombinations.length,
    validCombinations: validCombinations.length,
    hasGoodFingering: hasGoodFingering,
    topFingerings: topCombinations,
    bestFingering: topCombinations.length > 0 ? topCombinations[0] : null
  };
}

/**
 * Выводит информацию о найденной аппликатуре в консоль
 * @param {Object} result - Результат функции findOptimalFingering
 */
function logOptimalFingering(result) {
  console.log(`\nОптимальная аппликатура для аккорда "${result.chordName}":`);
  console.log(`Ноты аккорда: [${result.notes.join(', ')}]`);
  console.log(`Всего комбинаций: ${result.totalCombinations}`);
  console.log(`Валидных комбинаций: ${result.validCombinations}`);
  console.log(`Найдена хорошая аппликатура: ${result.hasGoodFingering ? 'Да' : 'Нет'}`);
  
  if (result.bestFingering) {
    console.log(`\nЛучшая аппликатура (оценка: ${result.bestFingering.score.toFixed(2)}):`);
    console.log(`Диапазон ладов: ${result.bestFingering.fretRange}`);
    console.log(`Открытых струн: ${result.bestFingering.openStrings}`);
    console.log(`Требует баррэ: ${result.bestFingering.barreRequirement > 0 ? 'Да' : 'Нет'}`);
    console.log(`Соответствие стандарту: ${(result.bestFingering.standardMatch * 100).toFixed(0)}%`);
    
    console.log('\nАппликатура:');
    result.bestFingering.fingering.forEach((pos, index) => {
      if (pos.fret === -1) {
        console.log(`  ${index + 1}. Струна ${pos.string}: немая`);
      } else {
        console.log(`  ${index + 1}. Струна ${pos.string}, лад ${pos.fret}, нота ${pos.note || 'N/A'}`);
      }
    });
  } else {
    console.log('Подходящая аппликатура не найдена');
  }
}

// Экспортируем функции для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    findOptimalFingering,
    findAllPossiblePositions,
    generateAllCombinations,
    calculateScore,
    logOptimalFingering,
    extractNoteName,
    calculateFretRange,
    countOpenStrings,
    calculateBarreRequirement,
    calculateStandardChordMatch,
    findRootNoteOnOpenString
  };
} else {
  // Для использования в браузере
  window.ChordOptimizer = {
    findOptimalFingering,
    findAllPossiblePositions,
    generateAllCombinations,
    calculateScore,
    logOptimalFingering,
    extractNoteName,
    calculateFretRange,
    countOpenStrings,
    calculateBarreRequirement,
    calculateStandardChordMatch,
    findRootNoteOnOpenString
  };
}