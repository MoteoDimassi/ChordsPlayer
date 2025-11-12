/**
 * Модуль для сопоставления аппликатуры с аудиофайлами
 * Выполняет шаг 6 из roadmap.md: map to samples
 */

// Базовый путь к аудиофайлам
const SAMPLES_PATH = 'samples';

// Расширение аудиофайлов
const AUDIO_EXTENSION = '.mp3';

// Максимальное количество полутонов для транспонирования
const MAX_PITCH_SHIFT_SEMITONES = 2;

// Импортируем данные и функции из общего модуля
const { STRINGS_ORDER: AUDIO_MAPPER_STRINGS_ORDER } = window.NoteUtils;

/**
 * Создает беззвучный буфер для немых струн
 * @param {AudioContext} audioContext - Контекст аудио
 * @param {number} duration - Длительность буфера в секундах
 * @returns {AudioBuffer} - Беззвучный аудиобуфер
 */
function createSilentBuffer(audioContext, duration = 3.0) {
  const buffer = audioContext.createBuffer(1, audioContext.sampleRate * duration, audioContext.sampleRate);
  // Буфер уже заполнен тишиной по умолчанию
  return buffer;
}

/**
 * Проверяет существование аудиофайла
 * @param {string} filePath - Путь к файлу
 * @returns {Promise<boolean>} - true, если файл существует
 */
async function checkFileExists(filePath) {
  try {
    const response = await fetch(filePath, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Загружает аудиофайл и декодирует его в AudioBuffer
 * @param {AudioContext} audioContext - Контекст аудио
 * @param {string} filePath - Путь к файлу
 * @returns {Promise<AudioBuffer|null>} - Декодированный аудиобуфер или null в случае ошибки
 */
async function loadAudioFile(audioContext, filePath) {
  try {
    const response = await fetch(filePath);
    if (!response.ok) {
      throw new Error(`Ошибка загрузки файла: ${response.status}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    return audioBuffer;
  } catch (error) {
    console.error(`Ошибка при загрузке аудиофайла ${filePath}:`, error);
    return null;
  }
}

/**
 * Находит ближайший доступный лад для данной струны
 * @param {string} string - Струна
 * @param {number} targetFret - Целевой лад
 * @param {number} maxFret - Максимальный доступный лад
 * @returns {number|null} - Ближайший доступный лад или null
 */
function findClosestFret(string, targetFret, maxFret = 7) {
  // Проверяем доступные лады от 0 до maxFret
  for (let distance = 0; distance <= maxFret; distance++) {
    // Проверяем лад выше
    const higherFret = targetFret + distance;
    if (higherFret <= maxFret) {
      return higherFret;
    }
    
    // Проверяем лад ниже
    const lowerFret = targetFret - distance;
    if (lowerFret >= 0) {
      return lowerFret;
    }
  }
  
  return null;
}

/**
 * Транспонирует аудиобуфер с изменением высоты тона
 * @param {AudioContext} audioContext - Контекст аудио
 * @param {AudioBuffer} sourceBuffer - Исходный аудиобуфер
 * @param {number} semitones - Количество полутонов для транспонирования
 * @param {Object} options - Опции транспонирования
 * @returns {Promise<Object>} - Результат транспонирования { buffer, quality, transformation }
 */
async function pitchShift(audioContext, sourceBuffer, semitones, options = {}) {
  // Проверяем, доступен ли улучшенный модуль PitchShift
  if (typeof window.PitchShift !== 'undefined') {
    // Используем улучшенный алгоритм из модуля PitchShift
    const result = await window.PitchShift.pitchShiftWebAudio(audioContext, sourceBuffer, semitones, options);
    
    // Добавляем дополнительную информацию о трансформации
    return {
      buffer: result.buffer,
      quality: result.quality,
      transformation: result.transformation,
      // Для обратной совместимости возвращаем только буфер
      then: function(onFulfilled) {
        return Promise.resolve(result.buffer).then(onFulfilled);
      }
    };
  } else {
    // Резервный вариант: используем базовую реализацию
    console.warn('⚠️ Модуль PitchShift не загружен, используется базовая реализация');
    
    // Создаем оффлайн контекст для обработки
    const offlineContext = new OfflineAudioContext(
      sourceBuffer.numberOfChannels,
      sourceBuffer.length,
      sourceBuffer.sampleRate
    );
    
    // Создаем источник
    const source = offlineContext.createBufferSource();
    source.buffer = sourceBuffer;
    
    // Вычисляем коэффициент изменения скорости воспроизведения
    // Каждый полутон изменяет частоту на 2^(1/12)
    const playbackRate = Math.pow(2, semitones / 12);
    source.playbackRate.value = playbackRate;
    
    // Подключаем источник к выходу
    source.connect(offlineContext.destination);
    source.start(0);
    
    // Рендерим результат
    const renderedBuffer = await offlineContext.startRendering();
    
    // Оцениваем качество для базовой реализации
    const qualityInfo = {
      isHighQuality: Math.abs(semitones) <= 2,
      quality: Math.abs(semitones) <= 2 ? 'high' : 'low',
      cents: semitones * 100,
      semitones: semitones
    };
    
    // Формируем информацию о трансформации
    const transformation = {
      applied: true,
      algorithm: 'webaudio-basic',
      semitones: semitones,
      cents: qualityInfo.cents,
      quality: qualityInfo.quality,
      isHighQuality: qualityInfo.isHighQuality,
      pitchRatio: playbackRate
    };
    
    console.log(`Транспонирование (базовый алгоритм): ${semitones > 0 ? '+' : ''}${semitones} полутонов (${qualityInfo.cents} центов)`);
    console.log(`Качество: ${qualityInfo.quality} (${qualityInfo.isHighQuality ? 'высокое' : 'низкое'})`);
    
    return {
      buffer: renderedBuffer,
      quality: qualityInfo,
      transformation: transformation,
      // Для обратной совместимости возвращаем только буфер
      then: function(onFulfilled) {
        return Promise.resolve(renderedBuffer).then(onFulfilled);
      }
    };
  }
}

/**
 * Сопоставляет аппликатуру с аудиофайлами
 * @param {Array} fingering - Аппликатура (массив объектов {string, fret, note})
 * @param {AudioContext} audioContext - Контекст аудио
 * @param {Object} options - Опции сопоставления
 * @returns {Promise<Object>} - Результат сопоставления
 */
async function mapFingeringToSamples(fingering, audioContext, options = {}) {
  const {
    enablePitchShift = true,
    maxPitchShiftSemitones = MAX_PITCH_SHIFT_SEMITONES,
    silentBufferDuration = 3.0
  } = options;
  
  const result = {
    fingering: fingering,
    audioFiles: [],
    audioBuffers: [],
    pitchShifted: [],
    errors: [],
    success: false
  };
  
  try {
    // Проверяем, что аппликатура содержит все 6 струн
    if (fingering.length !== 6) {
      throw new Error(`Аппликатура должна содержать 6 струн, получено: ${fingering.length}`);
    }
    
    // Обрабатываем каждую струну
    for (let i = 0; i < fingering.length; i++) {
      const position = fingering[i];
      const { string, fret, note } = position;
      
      try {
        let audioBuffer = null;
        let filePath = null;
        let wasPitchShifted = false;
        let pitchShiftSemitones = 0;
        
        // Если струна немая (fret === -1), создаем беззвучный буфер
        if (fret === -1) {
          audioBuffer = createSilentBuffer(audioContext, silentBufferDuration);
          filePath = 'silent';
          
          result.audioFiles.push(filePath);
          result.audioBuffers.push(audioBuffer);
          result.pitchShifted.push({
            string: string,
            wasPitchShifted: false,
            semitones: 0
          });
          
          console.log(`Струна ${string}: создан беззвучный буфер`);
          continue;
        }
        
        // Формируем путь к файлу
        const targetFilePath = `${SAMPLES_PATH}/${string}/fret${fret}${AUDIO_EXTENSION}`;
        
        // Проверяем существование файла
        const fileExists = await checkFileExists(targetFilePath);
        
        if (fileExists) {
          // Файл существует, загружаем его
          audioBuffer = await loadAudioFile(audioContext, targetFilePath);
          filePath = targetFilePath;
          
          if (audioBuffer) {
            console.log(`Струна ${string}, лад ${fret}: загружен файл ${targetFilePath}`);
          } else {
            throw new Error(`Не удалось загрузить файл ${targetFilePath}`);
          }
        } else if (enablePitchShift) {
          // Файл не существует, пробуем найти ближайший и транспонировать
          const closestFret = findClosestFret(string, fret, 7);
          
          if (closestFret !== null) {
            const closestFilePath = `${SAMPLES_PATH}/${string}/fret${closestFret}${AUDIO_EXTENSION}`;
            const closestFileExists = await checkFileExists(closestFilePath);
            
            if (closestFileExists) {
              // Загружаем ближайший файл
              const closestBuffer = await loadAudioFile(audioContext, closestFilePath);
              
              if (closestBuffer) {
                // Вычисляем количество полутонов для транспонирования
                pitchShiftSemitones = fret - closestFret;
                
                // Проверяем, не превышает ли количество полутонов лимит
                if (Math.abs(pitchShiftSemitones) <= maxPitchShiftSemitones) {
                  // Транспонируем буфер с использованием улучшенного алгоритма
                  const pitchShiftResult = await pitchShift(audioContext, closestBuffer, pitchShiftSemitones, {
                    enableQualityCheck: true,
                    logTransformations: true
                  });
                  
                  audioBuffer = pitchShiftResult.buffer;
                  filePath = closestFilePath;
                  wasPitchShifted = true;
                  
                  // Добавляем информацию о качестве трансформации
                  const qualityInfo = pitchShiftResult.quality;
                  const transformationInfo = pitchShiftResult.transformation;
                  
                  console.log(`Струна ${string}, лад ${fret}: загружен файл ${closestFilePath} и транспонирован на ${pitchShiftSemitones} полутонов`);
                  console.log(`  - Качество: ${qualityInfo.quality} (${qualityInfo.isHighQuality ? 'высокое' : 'низкое'})`);
                  console.log(`  - Алгоритм: ${transformationInfo.algorithm}`);
                  console.log(`  - Точность: ${Math.abs(qualityInfo.cents)} центов от целевой ноты`);
                  
                  // Проверяем, соответствует ли результат требованиям к качеству
                  if (!qualityInfo.isHighQuality) {
                    console.warn(`  ⚠️ Транспонирование превышает порог высокого качества (±${MAX_PITCH_SHIFT_SEMITONES} полутона)`);
                    console.warn(`  ⚠️ Рекомендуется записать нужный сэмпл для лучшего качества`);
                  }
                } else {
                  throw new Error(`Требуемое транспонирование (${pitchShiftSemitones} полутонов) превышает лимит (${maxPitchShiftSemitones})`);
                }
              } else {
                throw new Error(`Не удалось загрузить файл ${closestFilePath}`);
              }
            } else {
              throw new Error(`Ближайший файл ${closestFilePath} не найден`);
            }
          } else {
            throw new Error(`Не найден подходящий лад для струны ${string}`);
          }
        } else {
          throw new Error(`Файл ${targetFilePath} не найден и транспонирование отключено`);
        }
        
        // Добавляем результаты
        result.audioFiles.push(filePath);
        result.audioBuffers.push(audioBuffer);
        
        // Расширенная информация о транспонировании
        const pitchShiftInfo = {
          string: string,
          wasPitchShifted: wasPitchShifted,
          semitones: pitchShiftSemitones
        };
        
        // Добавляем информацию о качестве, если было транспонирование
        if (wasPitchShifted && audioBuffer && audioBuffer.quality) {
          pitchShiftInfo.quality = audioBuffer.quality;
          pitchShiftInfo.transformation = audioBuffer.transformation;
        }
        
        result.pitchShifted.push(pitchShiftInfo);
        
      } catch (error) {
        // В случае ошибки создаем беззвучный буфер и добавляем в список ошибок
        const silentBuffer = createSilentBuffer(audioContext, silentBufferDuration);
        
        result.audioFiles.push('silent');
        result.audioBuffers.push(silentBuffer);
        result.pitchShifted.push({
          string: string,
          wasPitchShifted: false,
          semitones: 0
        });
        
        result.errors.push({
          string: string,
          fret: fret,
          error: error.message
        });
        
        console.error(`Ошибка для струны ${string}, лад ${fret}:`, error.message);
      }
    }
    
    // Проверяем, что все струны обработаны
    if (result.audioBuffers.length === 6) {
      result.success = true;
      console.log('Все струны успешно сопоставлены с аудиофайлами');
    } else {
      result.success = false;
      console.error('Не все струны были сопоставлены с аудиофайлами');
    }
    
  } catch (error) {
    result.success = false;
    result.errors.push({
      general: error.message
    });
    
    console.error('Общая ошибка при сопоставлении аппликатуры с аудиофайлами:', error);
  }
  
  return result;
}

/**
 * Возвращает список путей к аудиофайлам для аппликатуры
 * @param {Array} fingering - Аппликатура (массив объектов {string, fret, note})
 * @param {Object} options - Опции сопоставления
 * @returns {Promise<Array>} - Массив путей к аудиофайлам
 */
async function getAudioFilePaths(fingering, options = {}) {
  // Создаем временный AudioContext для проверки файлов
  const tempAudioContext = new (window.AudioContext || window.webkitAudioContext)();
  
  try {
    const result = await mapFingeringToSamples(fingering, tempAudioContext, options);
    return result.audioFiles;
  } finally {
    // Закрываем временный контекст
    await tempAudioContext.close();
  }
}

/**
 * Возвращает информацию о сопоставлении аппликатуры с аудиофайлами
 * @param {Array} fingering - Аппликатура (массив объектов {string, fret, note})
 * @param {Object} options - Опции сопоставления
 * @returns {Promise<Object>} - Детальная информация о сопоставлении
 */
async function getMappingInfo(fingering, options = {}) {
  // Создаем временный AudioContext для проверки файлов
  const tempAudioContext = new (window.AudioContext || window.webkitAudioContext)();
  
  try {
    const result = await mapFingeringToSamples(fingering, tempAudioContext, options);
    
    // Возвращаем только информацию без аудиобуферов
    return {
      fingering: result.fingering,
      audioFiles: result.audioFiles,
      pitchShifted: result.pitchShifted,
      errors: result.errors,
      success: result.success
    };
  } finally {
    // Закрываем временный контекст
    await tempAudioContext.close();
  }
}

/**
 * Выводит информацию о сопоставлении в консоль
 * @param {Object} mappingResult - Результат функции mapFingeringToSamples
 */
function logMappingResult(mappingResult) {
  console.log('\nРезультат сопоставления аппликатуры с аудиофайлами:');
  console.log(`Успешность: ${mappingResult.success ? '✅ Да' : '❌ Нет'}`);
  
  if (mappingResult.errors.length > 0) {
    console.log('\nОшибки:');
    mappingResult.errors.forEach(error => {
      if (error.general) {
        console.log(`  Общая ошибка: ${error.general}`);
      } else {
        console.log(`  Струна ${error.string}, лад ${error.fret}: ${error.error}`);
      }
    });
  }
  
  console.log('\nСопоставление струн:');
  mappingResult.fingering.forEach((position, index) => {
    const audioFile = mappingResult.audioFiles[index];
    const pitchShiftInfo = mappingResult.pitchShifted[index];
    
    if (position.fret === -1) {
      console.log(`  ${index + 1}. Струна ${position.string}: немая (беззвучный буфер)`);
    } else {
      let info = `  ${index + 1}. Струна ${position.string}, лад ${position.fret}: ${audioFile}`;
      
      if (pitchShiftInfo.wasPitchShifted) {
        info += ` (транспонировано на ${pitchShiftInfo.semitones} полутонов)`;
        
        // Добавляем информацию о качестве, если доступна
        if (pitchShiftInfo.quality) {
          info += ` [${pitchShiftInfo.quality.quality} качество`;
          if (pitchShiftInfo.transformation && pitchShiftInfo.transformation.algorithm) {
            info += `, алгоритм: ${pitchShiftInfo.transformation.algorithm}`;
          }
          info += `, ${Math.abs(pitchShiftInfo.quality.cents)} центов]`;
        }
      }
      
      console.log(info);
    }
  });
}

// Экспортируем функции для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    mapFingeringToSamples,
    getAudioFilePaths,
    getMappingInfo,
    logMappingResult,
    createSilentBuffer,
    checkFileExists,
    loadAudioFile,
    findClosestFret,
    pitchShift
  };
} else {
  // Для использования в браузере
  window.AudioMapper = {
    mapFingeringToSamples,
    getAudioFilePaths,
    getMappingInfo,
    logMappingResult,
    createSilentBuffer,
    checkFileExists,
    loadAudioFile,
    findClosestFret,
    pitchShift
  };
}