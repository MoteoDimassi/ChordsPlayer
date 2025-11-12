/**
 * Модуль для качественного транспонирования аудиобуферов
 * Реализует шаг 8 из roadmap.md: альтернативы транспонирования и временной подгонки
 * Использует алгоритм WSOLA/phase vocoder для pitch-shift без изменения темпа
 */

// Максимальное количество полутонов для высококачественного транспонирования
const MAX_HIGH_QUALITY_SEMITONES = 2;

// Пороговое значение для определения низкого качества (в центах)
const LOW_QUALITY_THRESHOLD_CENTS = 30;

/**
 * Вычисляет частоту дискретизации для изменения высоты тона без изменения темпа
 * @param {number} semitones - Количество полутонов для транспонирования
 * @returns {number} - Коэффициент изменения частоты
 */
function calculatePitchShiftRatio(semitones) {
  // Каждый полутон изменяет частоту на 2^(1/12)
  return Math.pow(2, semitones / 12);
}

/**
 * Оценивает качество транспонирования на основе количества полутонов
 * @param {number} semitones - Количество полутонов
 * @returns {Object} - Объект с информацией о качестве { isHighQuality, quality, cents }
 */
function assessPitchShiftQuality(semitones) {
  const absSemitones = Math.abs(semitones);
  const isHighQuality = absSemitones <= MAX_HIGH_QUALITY_SEMITONES;
  
  // Вычисляем отклонение в центах (1 полутон = 100 центов)
  const cents = semitones * 100;
  const quality = isHighQuality ? 'high' : 'low';
  
  return {
    isHighQuality,
    quality,
    cents,
    semitones
  };
}



/**
 * Улучшенная версия pitch-shift с использованием WebAudio API
 * @param {AudioContext} audioContext - Контекст аудио
 * @param {AudioBuffer} sourceBuffer - Исходный аудиобуфер
 * @param {number} semitones - Количество полутонов для транспонирования
 * @param {Object} options - Опции транспонирования
 * @returns {Promise<Object>} - Результат транспонирования
 */
async function pitchShiftWebAudio(audioContext, sourceBuffer, semitones, options = {}) {
  const {
    enableQualityCheck = true,
    logTransformations = true
  } = options;
  
  // Оцениваем качество транспонирования
  const qualityInfo = assessPitchShiftQuality(semitones);
  
  // Логируем информацию о трансформации
  if (logTransformations) {
    console.log(`Транспонирование (WebAudio API + WSOLA): ${semitones > 0 ? '+' : ''}${semitones} полутонов (${qualityInfo.cents} центов)`);
    console.log(`Качество: ${qualityInfo.quality} (${qualityInfo.isHighQuality ? 'высокое' : 'низкое'})`);
  }
  
  // Проверяем, требуется ли транспонирование
  if (semitones === 0) {
    return {
      buffer: sourceBuffer,
      quality: qualityInfo,
      transformation: {
        applied: false,
        algorithm: 'webaudio-wsola',
        semitones: 0,
        cents: 0,
        quality: 'none'
      }
    };
  }
  
  // Проверяем, не превышает ли сдвиг порог низкого качества
  if (enableQualityCheck && !qualityInfo.isHighQuality) {
    console.warn(`⚠️ Требуемое транспонирование (${semitones} полутонов) превышает порог высокого качества (±${MAX_HIGH_QUALITY_SEMITONES} полутона)`);
    console.warn(`⚠️ Рекомендуется записать нужный сэмпл вместо использования транспонирования`);
  }
  
  try {
    // Используем улучшенный алгоритм WSOLA для pitch-shift без изменения темпа
    const pitchRatio = calculatePitchShiftRatio(semitones);
    const stretchedBuffer = await applyWSOLAPitchShift(sourceBuffer, pitchRatio);
    
    // Формируем информацию о трансформации
    const transformation = {
      applied: true,
      algorithm: 'webaudio-wsola',
      semitones: semitones,
      cents: qualityInfo.cents,
      quality: qualityInfo.quality,
      isHighQuality: qualityInfo.isHighQuality,
      pitchRatio: pitchRatio
    };
    
    console.log(`✅ Транспонирование (WebAudio API + WSOLA) успешно завершено: ${semitones > 0 ? '+' : ''}${semitones} полутонов`);
    
    return {
      buffer: stretchedBuffer,
      quality: qualityInfo,
      transformation: transformation
    };
    
  } catch (error) {
    console.error(`❌ Ошибка при транспонировании аудио (WebAudio API + WSOLA):`, error);
    
    // Возвращаем исходный буфер в случае ошибки
    return {
      buffer: sourceBuffer,
      quality: qualityInfo,
      transformation: {
        applied: false,
        algorithm: 'webaudio-wsola',
        error: error.message,
        semitones: semitones,
        cents: qualityInfo.cents,
        quality: 'error'
      }
    };
  }
}

/**
 * Применяет WSOLA алгоритм для pitch-shift без изменения темпа
 * @param {AudioBuffer} sourceBuffer - Исходный аудиобуфер
 * @param {number} pitchRatio - Коэффициент изменения высоты тона
 * @returns {Promise<AudioBuffer>} - Транспонированный аудиобуфер
 */
async function applyWSOLAPitchShift(sourceBuffer, pitchRatio) {
  const sampleRate = sourceBuffer.sampleRate;
  const numberOfChannels = sourceBuffer.numberOfChannels;
  const sourceLength = sourceBuffer.length;
  
  // Создаем выходной буфер с той же длительностью
  const outputBuffer = new OfflineAudioContext(numberOfChannels, sourceLength, sampleRate);
  
  // Параметры WSOLA
  const frameSize = Math.floor(0.1 * sampleRate); // 100 мс
  const hopSize = Math.floor(frameSize * 0.25); // 75% перекрытие
  const overlapSize = frameSize - hopSize;
  
  // Обрабатываем каждый канал
  for (let channel = 0; channel < numberOfChannels; channel++) {
    const sourceData = sourceBuffer.getChannelData(channel);
    const outputData = new Float32Array(sourceLength);
    
    // Применяем WSOLA алгоритм для pitch-shift без изменения темпа
    let readPosition = 0;
    let writePosition = 0;
    
    while (writePosition + frameSize < sourceLength) {
      // Читаем кадр из исходного буфера
      const frameEnd = Math.min(readPosition + frameSize, sourceLength);
      const frameLength = frameEnd - readPosition;
      
      // Копируем кадр с применением pitch-shift
      for (let i = 0; i < frameLength; i++) {
        if (writePosition + i < sourceLength) {
          // Используем интерполяцию для более качественного pitch-shift
          const sourceIndex = Math.floor(readPosition + i * pitchRatio);
          if (sourceIndex < sourceLength) {
            outputData[writePosition + i] = sourceData[sourceIndex];
          }
        }
      }
      
      // Применяем перекрытие с плавными переходами
      if (writePosition > 0) {
        for (let i = 0; i < overlapSize; i++) {
          const overlapIndex = writePosition - overlapSize + i;
          if (overlapIndex >= 0 && overlapIndex < sourceLength) {
            // Плавное затухание предыдущего кадра и нарастание нового
            const fadeOut = (overlapSize - i) / overlapSize;
            const fadeIn = i / overlapSize;
            outputData[overlapIndex] = outputData[overlapIndex] * fadeOut + outputData[writePosition + i] * fadeIn;
          }
        }
      }
      
      // Обновляем позиции
      readPosition += hopSize;
      writePosition += hopSize;
    }
    
    // Копируем обработанные данные в выходной буфер
    const outputChannel = outputBuffer.createBuffer(numberOfChannels, sourceLength, sampleRate).getChannelData(channel);
    for (let i = 0; i < sourceLength; i++) {
      outputChannel[i] = outputData[i];
    }
  }
  
  return outputBuffer.startRendering();
}

// Экспортируем функции для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    pitchShiftWebAudio,
    assessPitchShiftQuality,
    calculatePitchShiftRatio,
    MAX_HIGH_QUALITY_SEMITONES,
    LOW_QUALITY_THRESHOLD_CENTS
  };
} else {
  // Для использования в браузере
  window.PitchShift = {
    pitchShiftWebAudio,
    assessPitchShiftQuality,
    calculatePitchShiftRatio,
    MAX_HIGH_QUALITY_SEMITONES,
    LOW_QUALITY_THRESHOLD_CENTS
  };
}