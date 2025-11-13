/**
 * Модуль для поиска оптимальной аппликатуры аккорда на гитаре
 * Реализует эвристический алгоритм с учетом ограничений:
 * - Максимум растяжения между ладами (рекомендовано: 4)
 * - Минимальное количество пальцев
 * - Приоритет открытых струн
 */

// Импортируем данные и функции из общего модуля
// Используем доступ через объект NoteUtils, чтобы избежать конфликтов имен


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
 * Определяет ступени нот в аккорде относительно тоники
 * @param {Array} chordNotes - Ноты аккорда
 * @param {string} rootNote - Тоника аккорда
 * @returns {Object} - Объект: нота -> ступень (1, 2, 3, 4, 5, 6, 7, 8 и т.д.)
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
      case 1: degree = 2; break;   // Малая секунда
      case 2: degree = 2; break;   // Большая секунда
      case 3: degree = 3; break;   // Малая терция
      case 4: degree = 3; break;   // Большая терция
      case 5: degree = 4; break;   // Чистая кварта
      case 6: degree = 4; break;   // Увеличенная кварта/уменьшенная квинта
      case 7: degree = 5; break;   // Чистая квинта
      case 8: degree = 6; break;   // Малая секста
      case 9: degree = 6; break;   // Большая секста
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
 * Находит самую низкую первую ступень (тонику) в пределах от нулевого до четвёртого лада
 * Искать только на шестой, пятой и четвёртой струнах
 * @param {string} rootNote - Тоника аккорда
 * @returns {Object|null} - Информация о самой низкой первой ступени или null
 */
function findLowestFirstDegree(rootNote) {
  // Проверяем только 6-ю, 5-ю и 4-ю струны
  const targetStrings = ["6E", "5A", "4D"];
  let lowestFirstDegree = null;
  let lowestMidi = Infinity;
  
  console.log(`Ищем самую низкую первую ступень "${rootNote}" на струнах 6, 5, 4 в пределах ладов 0-4...`);
  
  for (const string of targetStrings) {
    // Проверяем лады от 0 до 4
    for (let fret = 0; fret <= 4; fret++) {
      const noteWithOctave = window.NoteUtils.NOTES_DATA[string][fret];
      if (!noteWithOctave) continue;
      
      const noteName = window.NoteUtils.extractNoteName(noteWithOctave);
      
      // Если на струне есть первая ступень (тоника)
      if (noteName === rootNote) {
        const midiNumber = window.NoteUtils.calculateMidiNumber(noteWithOctave);
        
        // Ищем самую низкую ноту
        if (midiNumber < lowestMidi) {
          lowestMidi = midiNumber;
          lowestFirstDegree = {
            note: noteName,
            string: string,
            fret: fret,
            midi: midiNumber,
            octave: window.NoteUtils.extractOctave(noteWithOctave)
          };
        }
      }
    }
  }
  
  if (lowestFirstDegree) {
    console.log(`Найдена самая низкая первая ступень "${rootNote}" на струне ${lowestFirstDegree.string}, лад ${lowestFirstDegree.fret}`);
  } else {
    console.log(`Первая ступень "${rootNote}" не найдена на струнах 6, 5, 4 в пределах ладов 0-4`);
  }
  
  return lowestFirstDegree;
}

/**
 * Находит корневую ноту на открытой струне
 * @param {string} rootNote - Тоника аккорда
 * @returns {Object|null} - Информация о корневой ноте на открытой струне или null
 */
function findRootNoteOnOpenString(rootNote) {
  // Проверяем каждую открытую струну (лад 0)
  const openStrings = ["6E", "5A", "4D", "3G", "2B", "1e"];
  
  for (const string of openStrings) {
    const openNote = window.NoteUtils.NOTES_DATA[string][0];
    if (!openNote) continue;
    
    const noteName = window.NoteUtils.extractNoteName(openNote);
    
    // Если на открытой струне есть корневая нота
    if (noteName === rootNote) {
      return {
        note: noteName,
        string: string,
        fret: 0,
        midi: window.NoteUtils.calculateMidiNumber(openNote),
        octave: window.NoteUtils.extractOctave(openNote)
      };
    }
  }
  
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
 * Вычисляет базовые метрики для аппликатуры
 * @param {Array} fingering - Аппликатура
 * @returns {Object} - Объект с метриками {score, fretRange, openStrings, barreRequirement}
 */
function calculateBasicMetrics(fingering) {
  // Вычисляем диапазон ладов
  const activeFrets = fingering
    .filter(pos => pos.fret > 0)
    .map(pos => pos.fret);
  
  const fretRange = activeFrets.length > 0
    ? Math.max(...activeFrets) - Math.min(...activeFrets) + 1
    : 0;
  
  // Подсчитываем открытые струны
  const openStrings = fingering.filter(pos => pos.fret === 0).length;
  
  // Проверяем требование баррэ (упрощенная проверка)
  const barreRequirement = activeFrets.length > 2 && fretRange > 2 ? 1 : 0;
  
  // Простая оценка (больше открытых струн - лучше, меньше диапазон - лучше)
  const score = Math.max(0, 10 - fretRange * 0.5 + openStrings * 0.3 - barreRequirement * 0.2);
  
  return {
    score: score,
    fretRange: fretRange,
    openStrings: openStrings,
    barreRequirement: barreRequirement
  };
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
    topN = 3            // Количество возвращаемых аппликатур
  } = options;
  
  // 1. Определяем корневую ноту аккорда (тоника)
  const rootNote = chordNotes[0];
  
  // 2. Ищем самую низкую первую ступень (тонику) на струнах 6, 5, 4 в пределах ладов 0-4
  const lowestFirstDegree = findLowestFirstDegree(rootNote);
  
  let rootPosition;
  if (lowestFirstDegree) {
    rootPosition = lowestFirstDegree;
    console.log(`Самая низкая первая ступень "${rootNote}" найдена на струне ${rootPosition.string}, лад ${rootPosition.fret}`);
  } else {
    // Если не нашли на струнах 6, 5, 4 в пределах ладов 0-4, ищем самую низкую ноту (тонику) на грифе
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
    // Вычисляем базовые метрики для аппликатуры
    const metrics = calculateBasicMetrics(primaryFingering);
    
    // Возвращаем основную аппликатуру с базовыми метриками
    const primaryResult = {
      fingering: primaryFingering,
      score: metrics.score,
      fretRange: metrics.fretRange,
      openStrings: metrics.openStrings,
      barreRequirement: metrics.barreRequirement
    };
    
    return {
      chordName: chordName,
      notes: chordNotes,
      totalCombinations: 1,
      validCombinations: 1,
      hasGoodFingering: true,
      topFingerings: [primaryResult],
      bestFingering: primaryResult
    };
  }
  
  // Если основная аппликатура не построена, используем упрощенный поиск
  // Находим все возможные позиции для каждой ноты
  const positionsByNote = window.NoteUtils.findAllPossiblePositions(chordNotes);
  
  // Ограничиваем количество комбинаций для оптимизации
  const maxCombinations = 50;
  let allCombinations = generateAllCombinations(positionsByNote, chordNotes);
  
  // Если комбинаций слишком много, просто берем первые maxCombinations
  if (allCombinations.length > maxCombinations) {
    allCombinations = allCombinations.slice(0, maxCombinations);
  }
  
  // Отбираем топ-N аппликатур с базовыми метриками
  const topCombinations = allCombinations.slice(0, topN).map(fingering => {
    const metrics = calculateBasicMetrics(fingering);
    return {
      fingering: fingering,
      score: metrics.score,
      fretRange: metrics.fretRange,
      openStrings: metrics.openStrings,
      barreRequirement: metrics.barreRequirement
    };
  });
  
  return {
    chordName: chordName,
    notes: chordNotes,
    totalCombinations: allCombinations.length,
    validCombinations: allCombinations.length,
    hasGoodFingering: allCombinations.length > 0,
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
    generateAllCombinations,
    logOptimalFingering,
    findRootNoteOnOpenString,
    findLowestFirstDegree
  };
} else {
  // Для использования в браузере
  window.ChordOptimizer = {
    findOptimalFingering,
    generateAllCombinations,
    logOptimalFingering,
    findRootNoteOnOpenString,
    findLowestFirstDegree
  };
}