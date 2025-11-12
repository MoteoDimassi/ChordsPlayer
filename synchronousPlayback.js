/**
 * Модуль для синхронного воспроизведения аккордов
 * Реализует шаг 9 из roadmap.md: синхронное воспроизведение (минимизация латентности)
 */

/**
 * Воспроизводит аккорд синхронно с минимальной задержкой
 * @param {AudioContext} audioContext - Контекст аудио
 * @param {Array<AudioBuffer>} audioBuffers - Массив аудиобуферов для каждой струны
 * @param {Object} options - Опции воспроизведения
 * @returns {Promise<Object>} - Результат воспроизведения
 */
async function playChord(audioContext, audioBuffers, options = {}) {
  const {
    startTime = null,        // Время начала воспроизведения (null для немедленного)
    delay = 0.05,            // Задержка для подготовки (в секундах)
    volume = 1.0,            // Громкость (0.0 - 1.0)
    arpeggio = false,        // Включить арпеджио
    arpeggioDelay = 0.05,    // Задержка между струнами в арпеджио (в секундах)
    fadeInDuration = 0.01    // Длительность нарастания громкости (в секундах)
  } = options;
  
  const result = {
    success: false,
    startTime: 0,
    actualDelay: 0,
    sources: [],
    errors: []
  };
  
  try {
    // Проверяем, что AudioContext находится в состоянии 'running'
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
      console.log('AudioContext возобновлен');
    }
    
    // Определяем время начала воспроизведения
    const currentTime = audioContext.currentTime;
    const playbackStartTime = startTime !== null ? startTime : currentTime + delay;
    
    result.startTime = playbackStartTime;
    result.actualDelay = playbackStartTime - currentTime;
    
    console.log(`Начало воспроизведения аккорда: задержка ${result.actualDelay.toFixed(3)} сек`);
    
    // Создаем источники для каждой струны
    const sources = [];
    
    for (let i = 0; i < audioBuffers.length; i++) {
      const buffer = audioBuffers[i];
      
      if (!buffer) {
        console.warn(`Буфер для струны ${i + 1} отсутствует, пропускаем`);
        continue;
      }
      
      // Создаем источник
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      
      // Создаем узел громкости для плавного нарастания
      const gainNode = audioContext.createGain();
      gainNode.gain.value = 0; // Начинаем с тишины
      
      // Подключаем источник к узлу громкости, а узел громкости к выходу
      source.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Определяем время начала для этой струны
      let stringStartTime = playbackStartTime;
      
      // Если включено арпеджио, добавляем задержку для каждой струны
      if (arpeggio) {
        stringStartTime += i * arpeggioDelay;
      }
      
      // Запускаем воспроизведение источника
      source.start(stringStartTime);
      
      // Плавно наращиваем громкость
      gainNode.gain.linearRampToValueAtTime(volume, stringStartTime + fadeInDuration);
      
      // Добавляем источник в список
      sources.push({
        source,
        gainNode,
        startTime: stringStartTime,
        stringIndex: i
      });
    }
    
    result.sources = sources;
    result.success = true;
    
    console.log(`✅ Аккорд запущен для воспроизведения (${sources.length} струн)`);
    
    // Автоматически останавливаем воспроизведение через 5 секунд для очистки
    setTimeout(() => {
      stopChord(result);
    }, 5000);
    
    return result;
    
  } catch (error) {
    result.success = false;
    result.errors.push(error.message);
    
    console.error('❌ Ошибка при воспроизведении аккорда:', error);
    
    // Очищаем источники в случае ошибки
    try {
      stopChord(result);
    } catch (cleanupError) {
      console.error('Ошибка при очистке:', cleanupError);
    }
    
    return result;
  }
}

/**
 * Останавливает воспроизведение аккорда
 * @param {Object} playbackResult - Результат функции playChord
 * @returns {boolean} - true, если остановка прошла успешно
 */
function stopChord(playbackResult) {
  try {
    if (!playbackResult || !playbackResult.sources) {
      return false;
    }
    
    const currentTime = playbackResult.sources.length > 0 && 
      playbackResult.sources[0].source.context ? 
      playbackResult.sources[0].source.context.currentTime : 0;
    
    // Останавливаем все источники
    playbackResult.sources.forEach(({ source, gainNode }) => {
      try {
        // Плавно затухаем
        if (gainNode) {
          gainNode.gain.linearRampToValueAtTime(0, currentTime + 0.1);
        }
        
        // Останавливаем источник
        if (source) {
          source.stop(currentTime + 0.1);
        }
      } catch (error) {
        console.warn('Ошибка при остановке источника:', error.message);
      }
    });
    
    console.log('🛑 Воспроизведение аккорда остановлено');
    return true;
    
  } catch (error) {
    console.error('❌ Ошибка при остановке аккорда:', error);
    return false;
  }
}

/**
 * Воспроизводит аккорд с аппликатурой
 * @param {AudioContext} audioContext - Контекст аудио
 * @param {Array} fingering - Аппликатура (массив объектов {string, fret, note})
 * @param {Object} options - Опции воспроизведения
 * @returns {Promise<Object>} - Результат воспроизведения
 */
async function playChordWithFingering(audioContext, fingering, options = {}) {
  try {
    // Проверяем, что аппликатура содержит все 6 струн
    if (fingering.length !== 6) {
      throw new Error(`Аппликатура должна содержать 6 струн, получено: ${fingering.length}`);
    }
    
    // Сопоставляем аппликатуру с аудиофайлами
    const mappingResult = await window.AudioMapper.mapFingeringToSamples(fingering, audioContext, options);
    
    if (!mappingResult.success) {
      throw new Error('Не удалось сопоставить аппликатуру с аудиофайлами');
    }
    
    // Воспроизводим аккорд
    const playbackResult = await playChord(audioContext, mappingResult.audioBuffers, options);
    
    // Добавляем информацию об аппликатуре в результат
    playbackResult.fingering = fingering;
    playbackResult.mappingResult = mappingResult;
    
    return playbackResult;
    
  } catch (error) {
    console.error('❌ Ошибка при воспроизведении аккорда с аппликатурой:', error);
    
    return {
      success: false,
      fingering: fingering,
      errors: [error.message]
    };
  }
}

/**
 * Измеряет задержку воспроизведения
 * @param {AudioContext} audioContext - Контекст аудио
 * @param {Array<AudioBuffer>} audioBuffers - Массив аудиобуферов
 * @param {number} iterations - Количество итераций для теста
 * @returns {Promise<Object>} - Результаты измерения
 */
async function measureLatency(audioContext, audioBuffers, iterations = 10) {
  const latencies = [];
  
  console.log(`📏 Измерение задержки воспроизведения (${iterations} итераций)...`);
  
  for (let i = 0; i < iterations; i++) {
    const startTime = performance.now();
    
    // Воспроизводим аккорд с минимальной задержкой
    const result = await playChord(audioContext, audioBuffers, {
      delay: 0.01, // Минимальная задержка
      volume: 0.1  // Низкая громкость для теста
    });
    
    if (result.success) {
      const endTime = performance.now();
      const latency = endTime - startTime;
      
      latencies.push(latency);
      
      // Небольшая пауза между итерациями
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Останавливаем воспроизведение
      stopChord(result);
    }
  }
  
  if (latencies.length === 0) {
    return {
      success: false,
      error: 'Не удалось выполнить ни одной успешной итерации'
    };
  }
  
  // Вычисляем статистику
  const avgLatency = latencies.reduce((sum, latency) => sum + latency, 0) / latencies.length;
  const minLatency = Math.min(...latencies);
  const maxLatency = Math.max(...latencies);
  
  const result = {
    success: true,
    iterations: latencies.length,
    avgLatency: avgLatency.toFixed(2),
    minLatency: minLatency.toFixed(2),
    maxLatency: maxLatency.toFixed(2),
    latencies: latencies
  };
  
  console.log(`📊 Результаты измерения задержки:`);
  console.log(`  - Средняя: ${result.avgLatency} мс`);
  console.log(`  - Минимальная: ${result.minLatency} мс`);
  console.log(`  - Максимальная: ${result.maxLatency} мс`);
  
  return result;
}

// Экспортируем функции для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    playChord,
    stopChord,
    playChordWithFingering,
    measureLatency
  };
} else {
  // Для использования в браузере
  window.SynchronousPlayback = {
    playChord,
    stopChord,
    playChordWithFingering,
    measureLatency
  };
}