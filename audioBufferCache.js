/**
 * Модуль для загрузки и кэширования аудиобуферов
 * Выполняет шаг 7 из roadmap.md: загрузка и кэширование аудиобуферов (Inference-ready)
 */

// Время ожидания загрузки в миллисекундах
const LOAD_TIMEOUT = 5000;

// Глобальный кэш аудиобуферов
let audioBufferCache = {};

// Флаг, указывающий на состояние загрузки
let isLoading = false;

// Список ожидающих загрузки файлов
let pendingLoads = {};

/**
 * Создает Promise с таймаутом
 * @param {Promise} promise - Исходный Promise
 * @param {number} timeoutMs - Таймаут в миллисекундах
 * @param {string} errorMessage - Сообщение об ошибке при таймауте
 * @returns {Promise} - Promise с таймаутом
 */
function createTimeoutPromise(promise, timeoutMs, errorMessage) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
    })
  ]);
}

/**
 * Загружает аудиофайл и декодирует его в AudioBuffer с таймаутом
 * @param {AudioContext} audioContext - Контекст аудио
 * @param {string} filePath - Путь к файлу
 * @returns {Promise<AudioBuffer>} - Декодированный аудиобуфер
 */
async function loadAudioFileWithTimeout(audioContext, filePath) {
  const errorMessage = `Таймаут загрузки файла ${filePath} (> ${LOAD_TIMEOUT}ms)`;
  
  const loadPromise = new Promise(async (resolve, reject) => {
    try {
      const response = await fetch(filePath);
      if (!response.ok) {
        throw new Error(`Ошибка загрузки файла: ${response.status}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      resolve(audioBuffer);
    } catch (error) {
      reject(error);
    }
  });
  
  return createTimeoutPromise(loadPromise, LOAD_TIMEOUT, errorMessage);
}

/**
 * Пытается загрузить альтернативный файл
 * @param {AudioContext} audioContext - Контекст аудио
 * @param {string} originalFilePath - Оригинальный путь к файлу
 * @returns {Promise<AudioBuffer>} - Декодированный аудиобуфер из альтернативного файла
 */
async function loadAlternativeFile(audioContext, originalFilePath) {
  console.warn(`Попытка загрузить альтернативный файл для ${originalFilePath}`);
  
  // Если это "silent", то альтернативный файл не ищем
  if (originalFilePath === 'silent') {
    throw new Error(`Невозможно найти альтернативу для беззвучного буфера`);
  }
  
  // Извлекаем информацию о струне и ладе из пути
  const pathParts = originalFilePath.split('/');
  const stringFolder = pathParts[pathParts.length - 2];
  const fileName = pathParts[pathParts.length - 1];
  
  // Проверяем, что stringFolder определен
  if (!stringFolder || stringFolder === 'undefined') {
    throw new Error(`Некорректный путь к файлу: ${originalFilePath}`);
  }
  
  // Пробуем загрузить файл с той же струны, но с другого лада
  // Сначала пробуем открытую струну (fret0)
  const openStringPath = `samples/${stringFolder}/fret0.mp3`;
  
  try {
    console.log(`Пробуем загрузить открытую струну: ${openStringPath}`);
    return await loadAudioFileWithTimeout(audioContext, openStringPath);
  } catch (error) {
    console.warn(`Не удалось загрузить открытую струну: ${error.message}`);
  }
  
  // Если открытая струна не сработала, пробуем другие лады
  for (let fret = 1; fret <= 4; fret++) {
    const alternativePath = `samples/${stringFolder}/fret${fret}.mp3`;
    
    // Пропускаем оригинальный файл
    if (alternativePath === originalFilePath) {
      continue;
    }
    
    try {
      console.log(`Пробуем альтернативный лад ${fret}: ${alternativePath}`);
      return await loadAudioFileWithTimeout(audioContext, alternativePath);
    } catch (error) {
      console.warn(`Не удалось загрузить альтернативный лад ${fret}: ${error.message}`);
    }
  }
  
  // Если ничего не помогло, пробуем загрузить из папки NotesMP3
  try {
    // Извлекаем ноту из имени файла
    const noteMatch = fileName.match(/fret(\d+)\.mp3/);
    if (noteMatch) {
      const fretNumber = parseInt(noteMatch[1]);
      
      // Пробуем найти соответствующую ноту в NotesMP3
      const notesResponse = await fetch('notes.json');
      const notesData = await notesResponse.json();
      
      if (notesData[stringFolder] && notesData[stringFolder][fretNumber]) {
        const noteName = notesData[stringFolder][fretNumber];
        const notePath = `NotesMP3/${noteName}.mp3`;
        
        console.log(`Пробуем ноту из NotesMP3: ${notePath}`);
        return await loadAudioFileWithTimeout(audioContext, notePath);
      }
    }
  } catch (error) {
    console.warn(`Не удалось загрузить ноту из NotesMP3: ${error.message}`);
  }
  
  throw new Error(`Не удалось загрузить альтернативный файл для ${originalFilePath}`);
}

/**
 * Загружает и кэширует аудиобуфер для указанного файла
 * @param {AudioContext} audioContext - Контекст аудио
 * @param {string} filePath - Путь к файлу
 * @param {boolean} forceReload - Принудительно перезагрузить, даже если уже в кэше
 * @returns {Promise<AudioBuffer>} - Декодированный аудиобуфер
 */
async function loadAndCacheAudioBuffer(audioContext, filePath, forceReload = false) {
  // Если это "silent", создаем беззвучный буфер
  if (filePath === 'silent') {
    if (!forceReload && audioBufferCache[filePath]) {
      return audioBufferCache[filePath];
    }
    
    const silentBuffer = audioContext.createBuffer(1, audioContext.sampleRate * 3.0, audioContext.sampleRate);
    audioBufferCache[filePath] = silentBuffer;
    console.log(`✅ Создан беззвучный буфер`);
    return silentBuffer;
  }
  
  // Проверяем, если файл уже в кэше и не требуется перезагрузка
  if (!forceReload && audioBufferCache[filePath]) {
    return audioBufferCache[filePath];
  }
  
  // Проверяем, если файл уже загружается
  if (!forceReload && pendingLoads[filePath]) {
    return pendingLoads[filePath];
  }
  
  // Создаем Promise для загрузки файла
  const loadPromise = (async () => {
    try {
      console.log(`Загрузка аудиофайла: ${filePath}`);
      
      // Пытаемся загрузить основной файл с таймаутом
      let audioBuffer;
      try {
        audioBuffer = await loadAudioFileWithTimeout(audioContext, filePath);
        console.log(`✅ Успешно загружен: ${filePath}`);
      } catch (error) {
        console.warn(`⚠️ Ошибка загрузки основного файла: ${error.message}`);
        
        // Пытаемся загрузить альтернативный файл
        try {
          audioBuffer = await loadAlternativeFile(audioContext, filePath);
          console.log(`✅ Успешно загружен альтернативный файл для: ${filePath}`);
        } catch (altError) {
          console.error(`❌ Не удалось загрузить ни основной, ни альтернативный файл для: ${filePath}`);
          throw new Error(`Не удалось загрузить аудиофайл ${filePath}: ${altError.message}`);
        }
      }
      
      // Сохраняем в кэш
      audioBufferCache[filePath] = audioBuffer;
      
      return audioBuffer;
    } finally {
      // Удаляем из списка ожидающих загрузки
      delete pendingLoads[filePath];
    }
  })();
  
  // Добавляем в список ожидающих загрузки
  pendingLoads[filePath] = loadPromise;
  
  return loadPromise;
}

/**
 * Загружает и кэширует несколько аудиобуферов параллельно
 * @param {AudioContext} audioContext - Контекст аудио
 * @param {Array<string>} filePaths - Массив путей к файлам
 * @param {boolean} forceReload - Принудительно перезагрузить, даже если уже в кэше
 * @returns {Promise<Object>} - Объект с путями в качестве ключей и AudioBuffer в качестве значений
 */
async function loadAndCacheAudioBuffers(audioContext, filePaths, forceReload = false) {
  if (isLoading) {
    throw new Error('Уже идет загрузка аудиобуферов. Дождитесь завершения предыдущей загрузки.');
  }
  
  isLoading = true;
  
  try {
    console.log(`Начало загрузки ${filePaths.length} аудиофайлов...`);
    
    // Создаем массив промисов для параллельной загрузки
    const loadPromises = filePaths.map(async (filePath) => {
      try {
        const audioBuffer = await loadAndCacheAudioBuffer(audioContext, filePath, forceReload);
        return { filePath, audioBuffer, error: null };
      } catch (error) {
        console.error(`Ошибка загрузки ${filePath}:`, error.message);
        return { filePath, audioBuffer: null, error: error.message };
      }
    });
    
    // Ждем завершения всех загрузок
    const results = await Promise.all(loadPromises);
    
    // Формируем результат
    const buffers = {};
    const errors = [];
    
    results.forEach(({ filePath, audioBuffer, error }) => {
      if (audioBuffer) {
        buffers[filePath] = audioBuffer;
      } else {
        errors.push({ filePath, error });
      }
    });
    
    console.log(`Загрузка завершена. Успешно: ${Object.keys(buffers).length}, с ошибками: ${errors.length}`);
    
    return {
      buffers,
      errors,
      success: errors.length === 0,
      totalFiles: filePaths.length,
      loadedFiles: Object.keys(buffers).length,
      failedFiles: errors.length
    };
  } finally {
    isLoading = false;
  }
}

/**
 * Получает аудиобуфер из кэша
 * @param {string} filePath - Путь к файлу
 * @returns {AudioBuffer|null} - Аудиобуфер из кэша или null, если отсутствует
 */
function getCachedAudioBuffer(filePath) {
  return audioBufferCache[filePath] || null;
}

/**
 * Проверяет, находится ли аудиобуфер в кэше
 * @param {string} filePath - Путь к файлу
 * @returns {boolean} - true, если буфер в кэше
 */
function isAudioBufferCached(filePath) {
  return filePath in audioBufferCache;
}

/**
 * Очищает кэш аудиобуферов
 * @param {Array<string>|null} filePaths - Массив путей для очистки. Если null, очищается весь кэш
 */
function clearAudioBufferCache(filePaths = null) {
  if (filePaths) {
    filePaths.forEach(filePath => {
      delete audioBufferCache[filePath];
    });
    console.log(`Очищен кэш для ${filePaths.length} файлов`);
  } else {
    audioBufferCache = {};
    console.log('Очищен весь кэш аудиобуферов');
  }
}

/**
 * Возвращает информацию о состоянии кэша
 * @returns {Object} - Информация о кэше
 */
function getCacheInfo() {
  return {
    cachedFilesCount: Object.keys(audioBufferCache).length,
    cachedFiles: Object.keys(audioBufferCache),
    isLoading,
    pendingLoadsCount: Object.keys(pendingLoads).length,
    pendingLoads: Object.keys(pendingLoads)
  };
}

/**
 * Предзагружает все аудиофайлы из структуры samples/
 * @param {AudioContext} audioContext - Контекст аудио
 * @param {Object} options - Опции загрузки
 * @returns {Promise<Object>} - Результат загрузки
 */
async function preloadAllSamples(audioContext, options = {}) {
  const {
    maxFret = 4,
    forceReload = false
  } = options;
  
  // Формируем список всех файлов
  const filePaths = [];
  
  // Струны гитары
  const strings = ["6E", "5A", "4D", "3G", "2B", "1e"];
  
  // Добавляем все файлы для каждой струны и лада
  strings.forEach(string => {
    for (let fret = 0; fret <= maxFret; fret++) {
      filePaths.push(`samples/${string}/fret${fret}.mp3`);
    }
  });
  
  console.log(`Предзагрузка ${filePaths.length} аудиофайлов...`);
  
  return loadAndCacheAudioBuffers(audioContext, filePaths, forceReload);
}

// Экспортируем функции для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    loadAndCacheAudioBuffer,
    loadAndCacheAudioBuffers,
    getCachedAudioBuffer,
    isAudioBufferCached,
    clearAudioBufferCache,
    getCacheInfo,
    preloadAllSamples,
    loadAudioFileWithTimeout,
    loadAlternativeFile
  };
} else {
  // Для использования в браузере
  window.AudioBufferCache = {
    loadAndCacheAudioBuffer,
    loadAndCacheAudioBuffers,
    getCachedAudioBuffer,
    isAudioBufferCached,
    clearAudioBufferCache,
    getCacheInfo,
    preloadAllSamples,
    loadAudioFileWithTimeout,
    loadAlternativeFile
  };
}