/**
 * Основной скрипт приложения ChordsPlayer
 * Интегрирует все модули и управляет пользовательским интерфейсом
 */

// Глобальные переменные приложения
let audioContext = null;
let currentChord = null;
let currentFingering = null;
let isPlaying = false;
let playbackResult = null;
let logEntries = [];

// База аккордов для автокомплита (200+ аккордов)
const chordDatabase = [
    // Основные мажорные аккорды
    'C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B',
    // Основные минорные аккорды
    'Cm', 'C#m', 'Dbm', 'Dm', 'D#m', 'Ebm', 'Em', 'Fm', 'F#m', 'Gbm', 'Gm', 'G#m', 'Abm', 'Am', 'A#m', 'Bbm', 'Bm',
    // Септ аккорды
    'C7', 'C#7', 'Db7', 'D7', 'D#7', 'Eb7', 'E7', 'F7', 'F#7', 'Gb7', 'G7', 'G#7', 'Ab7', 'A7', 'A#7', 'Bb7', 'B7',
    // Мажорные септы
    'Cmaj7', 'C#maj7', 'Dbmaj7', 'Dmaj7', 'D#maj7', 'Ebmaj7', 'Emaj7', 'Fmaj7', 'F#maj7', 'Gbmaj7', 'Gmaj7', 'G#maj7', 'Abmaj7', 'Amaj7', 'A#maj7', 'Bbmaj7', 'Bmaj7',
    // Минорные септы
    'Cm7', 'C#m7', 'Dbm7', 'Dm7', 'D#m7', 'Ebm7', 'Em7', 'Fm7', 'F#m7', 'Gbm7', 'Gm7', 'G#m7', 'Abm7', 'Am7', 'A#m7', 'Bbm7', 'Bm7',
    // Уменьшенные и увеличенные
    'Cdim', 'C#dim', 'Ddim', 'D#dim', 'Edim', 'Fdim', 'F#dim', 'Gdim', 'G#dim', 'Adim', 'A#dim', 'Bdim',
    'Caug', 'C#aug', 'Daug', 'D#aug', 'Eaug', 'Faug', 'F#aug', 'Gaug', 'G#aug', 'Aaug', 'A#aug', 'Baug',
    // Sus аккорды
    'Csus2', 'Csus4', 'C#sus2', 'C#sus4', 'Dsus2', 'Dsus4', 'D#sus2', 'D#sus4', 'Esus2', 'Esus4', 'Fsus2', 'Fsus4',
    'F#sus2', 'F#sus4', 'Gsus2', 'Gsus4', 'G#sus2', 'G#sus4', 'Asus2', 'Asus4', 'A#sus2', 'A#sus4', 'Bsus2', 'Bsus4',
    // Добавленные ноты
    'Cadd9', 'C#add9', 'Dadd9', 'D#add9', 'Eadd9', 'Fadd9', 'F#add9', 'Gadd9', 'G#add9', 'Aadd9', 'A#add9', 'Badd9',
    'Cadd11', 'Dadd11', 'Eadd11', 'Fadd11', 'Gadd11', 'Aadd11', 'Badd11',
    // Шестые аккорды
    'C6', 'C#6', 'D6', 'D#6', 'E6', 'F6', 'F#6', 'G6', 'G#6', 'A6', 'A#6', 'B6',
    'Cm6', 'C#m6', 'Dm6', 'D#m6', 'Em6', 'Fm6', 'F#m6', 'Gm6', 'G#m6', 'Am6', 'A#m6', 'Bm6',
    // Девятые аккорды
    'C9', 'C#9', 'D9', 'D#9', 'E9', 'F9', 'F#9', 'G9', 'G#9', 'A9', 'A#9', 'B9',
    'Cm9', 'C#m9', 'Dm9', 'D#m9', 'Em9', 'Fm9', 'F#m9', 'Gm9', 'G#m9', 'Am9', 'A#m9', 'Bm9',
    // Одиннадцатые и тринадцатые
    'C11', 'C13', 'D11', 'D13', 'E11', 'E13', 'F11', 'F13', 'G11', 'G13', 'A11', 'A13', 'B11', 'B13',
    // Сложные джазовые аккорды
    'Cmaj9', 'Cmaj13', 'Cm11', 'Cm13', 'C7#9', 'C7b9', 'C7#5', 'C7b5', 'C7sus4',
    'Dmaj9', 'Dmaj13', 'Dm11', 'Dm13', 'D7#9', 'D7b9', 'D7#5', 'D7b5', 'D7sus4',
    'Emaj9', 'Emaj13', 'Em11', 'Em13', 'E7#9', 'E7b9', 'E7#5', 'E7b5', 'E7sus4',
    'Fmaj9', 'Fmaj13', 'Fm11', 'Fm13', 'F7#9', 'F7b9', 'F7#5', 'F7b5', 'F7sus4',
    'Gmaj9', 'Gmaj13', 'Gm11', 'Gm13', 'G7#9', 'G7b9', 'G7#5', 'G7b5', 'G7sus4',
    'Amaj9', 'Amaj13', 'Am11', 'Am13', 'A7#9', 'A7b9', 'A7#5', 'A7b5', 'A7sus4',
    'Bmaj9', 'Bmaj13', 'Bm11', 'Bm13', 'B7#9', 'B7b9', 'B7#5', 'B7b5', 'B7sus4'
];

/**
 * Инициализация приложения
 */
function initApp() {
    // Инициализируем AudioContext
    initAudioContext();
    
    // Инициализируем элементы интерфейса
    initUI();
    
    // Рисуем пустой гриф
    drawFretboard();
    
    // Добавляем лог о запуске приложения
    addLogEntry('Приложение запущено', 'info');
    
    // Предзагружаем аудиофайлы для ускорения работы
    preloadAudioFiles();
}

/**
 * Инициализация AudioContext
 */
function initAudioContext() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        console.log('AudioContext успешно инициализирован');
    } catch (error) {
        console.error('Ошибка при инициализации AudioContext:', error);
        addLogEntry(`Ошибка при инициализации AudioContext: ${error.message}`, 'error');
    }
}

/**
 * Инициализация пользовательского интерфейса
 */
function initUI() {
    // Получаем элементы DOM
    const chordInput = document.getElementById('chordInput');
    const playButton = document.getElementById('playButton');
    const stopButton = document.getElementById('stopButton');
    const clearLogButton = document.getElementById('clearLogButton');
    const exportLogButton = document.getElementById('exportLogButton');
    const autocompleteList = document.getElementById('autocompleteList');
    
    // Добавляем обработчики событий
    chordInput.addEventListener('input', handleChordInput);
    chordInput.addEventListener('keydown', handleChordKeydown);
    chordInput.addEventListener('focus', handleChordFocus);
    chordInput.addEventListener('blur', handleChordBlur);
    
    playButton.addEventListener('click', handlePlayButtonClick);
    stopButton.addEventListener('click', handleStopButtonClick);
    clearLogButton.addEventListener('click', handleClearLogClick);
    exportLogButton.addEventListener('click', handleExportLogClick);
    
    // Обработчик клика вне поля ввода для скрытия автокомплита
    document.addEventListener('click', handleDocumentClick);
}

/**
 * Обработка ввода в поле аккорда
 */
function handleChordInput(event) {
    const value = event.target.value.trim();
    
    if (value.length > 0) {
        showAutocomplete(value);
    } else {
        hideAutocomplete();
    }
}

/**
 * Обработка нажатия клавиш в поле аккорда
 */
function handleChordKeydown(event) {
    const autocompleteItems = document.querySelectorAll('.autocomplete-item');
    const selectedItem = document.querySelector('.autocomplete-item.selected');
    let selectedIndex = -1;
    
    if (selectedItem) {
        selectedIndex = Array.from(autocompleteItems).indexOf(selectedItem);
    }
    
    switch (event.key) {
        case 'ArrowDown':
            event.preventDefault();
            if (selectedIndex < autocompleteItems.length - 1) {
                if (selectedItem) selectedItem.classList.remove('selected');
                autocompleteItems[selectedIndex + 1].classList.add('selected');
            }
            break;
            
        case 'ArrowUp':
            event.preventDefault();
            if (selectedIndex > 0) {
                if (selectedItem) selectedItem.classList.remove('selected');
                autocompleteItems[selectedIndex - 1].classList.add('selected');
            }
            break;
            
        case 'Enter':
            event.preventDefault();
            if (selectedItem) {
                selectChord(selectedItem.textContent);
            } else {
                processChordInput();
            }
            break;
            
        case 'Escape':
            hideAutocomplete();
            break;
    }
}

/**
 * Обработка фокуса на поле ввода
 */
function handleChordFocus(event) {
    const value = event.target.value.trim();
    if (value.length > 0) {
        showAutocomplete(value);
    }
}

/**
 * Обработка потери фокуса полем ввода
 */
function handleChordBlur(event) {
    // Задержка перед скрытием автокомплита, чтобы успеть обработать клик
    setTimeout(() => {
        hideAutocomplete();
    }, 200);
}

/**
 * Обработка клика по документу
 */
function handleDocumentClick(event) {
    const autocompleteContainer = document.querySelector('.autocomplete-container');
    if (!autocompleteContainer.contains(event.target)) {
        hideAutocomplete();
    }
}

/**
 * Показ автокомплита
 */
function showAutocomplete(query) {
    const autocompleteList = document.getElementById('autocompleteList');
    
    // Фильтруем аккорды по запросу
    const matches = chordDatabase.filter(chord => 
        chord.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 10); // Ограничиваем количество результатов
    
    if (matches.length === 0) {
        hideAutocomplete();
        return;
    }
    
    // Создаем HTML для списка автокомплита
    const html = matches.map(chord => 
        `<div class="autocomplete-item">${chord}</div>`
    ).join('');
    
    autocompleteList.innerHTML = html;
    autocompleteList.style.display = 'block';
    
    // Добавляем обработчики клика
    autocompleteList.querySelectorAll('.autocomplete-item').forEach(item => {
        item.addEventListener('click', () => {
            selectChord(item.textContent);
        });
    });
}

/**
 * Скрытие автокомплита
 */
function hideAutocomplete() {
    const autocompleteList = document.getElementById('autocompleteList');
    autocompleteList.style.display = 'none';
    autocompleteList.innerHTML = '';
}

/**
 * Выбор аккорда из автокомплита
 */
function selectChord(chord) {
    const chordInput = document.getElementById('chordInput');
    chordInput.value = chord;
    hideAutocomplete();
    processChordInput();
}

/**
 * Обработка ввода аккорда
 */
function processChordInput() {
    const chordInput = document.getElementById('chordInput');
    const chordName = chordInput.value.trim();
    
    if (!chordName) {
        clearChordInfo();
        return;
    }
    
    try {
        // Логируем запрос
        const startTime = performance.now();
        addLogEntry(`Запрос аккорда: ${chordName}`, 'info');
        
        // Парсим аккорд
        const notes = ChordParser.parseChord(chordName);
        
        // Находим оптимальную аппликатуру
        const optimizeResult = ChordOptimizer.findOptimalFingering(notes, chordName);
        
        if (!optimizeResult.bestFingering) {
            throw new Error(`Не найдена подходящая аппликатура для аккорда ${chordName}`);
        }
        
        // Сохраняем текущий аккорд и аппликатуру
        currentChord = chordName;
        currentFingering = optimizeResult.bestFingering.fingering;
        
        // Отображаем информацию об аккорде
        displayChordInfo(chordName, notes, optimizeResult);
        
        // Отображаем аппликатуру на грифе
        displayFingering(currentFingering);
        
        // Логируем успешное выполнение
        const endTime = performance.now();
        const processingTime = (endTime - startTime).toFixed(2);
        addLogEntry(`Аккорд ${chordName} обработан за ${processingTime} мс`, 'success');
        
    } catch (error) {
        addLogEntry(`Ошибка при обработке аккорда ${chordName}: ${error.message}`, 'error');
        clearChordInfo();
    }
}

/**
 * Отображение информации об аккорде
 */
function displayChordInfo(chordName, notes, optimizeResult) {
    const chordInfo = document.getElementById('chordInfo');
    
    const html = `
        <strong>Аккорд:</strong> ${chordName}<br>
        <strong>Ноты:</strong> [${notes.map(note => `"${note}"`).join(', ')}]<br>
        <strong>Оценка аппликатуры:</strong> ${optimizeResult.bestFingering.score.toFixed(2)}<br>
        <strong>Диапазон ладов:</strong> ${optimizeResult.bestFingering.fretRange}<br>
        <strong>Открытых струн:</strong> ${optimizeResult.bestFingering.openStrings}<br>
        <strong>Требует баррэ:</strong> ${optimizeResult.bestFingering.barreRequirement > 0 ? 'Да' : 'Нет'}
    `;
    
    chordInfo.innerHTML = html;
    chordInfo.classList.add('show');
}

/**
 * Очистка информации об аккорде
 */
function clearChordInfo() {
    const chordInfo = document.getElementById('chordInfo');
    const fingeringInfo = document.getElementById('fingeringInfo');
    
    chordInfo.innerHTML = '';
    chordInfo.classList.remove('show');
    
    fingeringInfo.innerHTML = '';
    fingeringInfo.classList.remove('show');
    
    // Очищаем гриф
    drawFretboard();
    
    currentChord = null;
    currentFingering = null;
}

/**
 * Отрисовка грифа гитары
 */
function drawFretboard() {
    const svg = document.getElementById('fretboard');
    const width = 600;
    const height = 200;
    const stringCount = 6;
    const fretCount = 8;
    const margin = 30;
    const fretWidth = (width - 2 * margin) / fretCount;
    const stringSpacing = (height - 2 * margin) / (stringCount - 1);
    
    // Очищаем SVG
    svg.innerHTML = '';
    
    // Рисуем струны
    for (let i = 0; i < stringCount; i++) {
        const y = margin + i * stringSpacing;
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', margin);
        line.setAttribute('y1', y);
        line.setAttribute('x2', width - margin);
        line.setAttribute('y2', y);
        line.setAttribute('class', 'string');
        svg.appendChild(line);
        
        // Добавляем метки струн
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', margin - 15);
        text.setAttribute('y', y + 5);
        text.setAttribute('class', 'string-label');
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'middle');
        text.textContent = ['E', 'A', 'D', 'G', 'B', 'e'][i];
        svg.appendChild(text);
    }
    
    // Рисуем верхний порожек (nut)
    const nut = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    nut.setAttribute('x1', margin);
    nut.setAttribute('y1', margin);
    nut.setAttribute('x2', margin);
    nut.setAttribute('y2', height - margin);
    nut.setAttribute('class', 'nut');
    svg.appendChild(nut);
    
    // Рисуем лады
    for (let i = 0; i <= fretCount; i++) {
        const x = margin + i * fretWidth;
        
        // Пропускаем нулевой лад (уже нарисован как nut)
        if (i > 0) {
            const fret = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            fret.setAttribute('x1', x);
            fret.setAttribute('y1', margin);
            fret.setAttribute('x2', x);
            fret.setAttribute('y2', height - margin);
            fret.setAttribute('class', 'fret');
            svg.appendChild(fret);
        }
        
        // Добавляем метки ладов
        if (i > 0) {
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            // Позиционируем метку немного правее центра лада для лучшей визуализации
            const labelX = x - fretWidth / 4;
            text.setAttribute('x', labelX);
            text.setAttribute('y', margin - 10);
            text.setAttribute('class', 'fret-label');
            text.setAttribute('text-anchor', 'middle');
            text.textContent = i.toString();
            svg.appendChild(text);
        }
    }
}

/**
 * Отображение аппликатуры на грифе
 */
function displayFingering(fingering) {
    // Сначала перерисовываем пустой гриф
    drawFretboard();
    
    const svg = document.getElementById('fretboard');
    const width = 600;
    const height = 200;
    const stringCount = 6;
    const fretCount = 8; // Исправляем: должно соответствовать количеству ладов в drawFretboard()
    const margin = 30;
    const fretWidth = (width - 2 * margin) / fretCount;
    const stringSpacing = (height - 2 * margin) / (stringCount - 1);
    
    // Отображаем позиции пальцев
    fingering.forEach((position, index) => {
        const stringIndex = ['6E', '5A', '4D', '3G', '2B', '1e'].indexOf(position.string);
        const y = margin + stringIndex * stringSpacing;
        
        if (position.fret === -1) {
            // Немая струна - рисуем крестик на порожке
            const x = margin + 5; // Немного правее порожка для видимости
            
            const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line1.setAttribute('x1', x - 5);
            line1.setAttribute('y1', y - 5);
            line1.setAttribute('x2', x + 5);
            line1.setAttribute('y2', y + 5);
            line1.setAttribute('class', 'finger-position muted');
            svg.appendChild(line1);
            
            const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line2.setAttribute('x1', x - 5);
            line2.setAttribute('y1', y + 5);
            line2.setAttribute('x2', x + 5);
            line2.setAttribute('y2', y - 5);
            line2.setAttribute('class', 'finger-position muted');
            svg.appendChild(line2);
        } else if (position.fret === 0) {
            // Открытая струна - рисуем чёрный кружок на порожке
            const x = margin + 5; // Немного правее порожка для видимости
            
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', x);
            circle.setAttribute('cy', y);
            circle.setAttribute('r', 8);
            circle.setAttribute('class', 'finger-position open');
            circle.setAttribute('data-string', position.string);
            circle.setAttribute('data-fret', position.fret);
            svg.appendChild(circle);
        } else {
            // Активная струна - рисуем круг
            // Позиция круга должна совпадать с позицией метки лада
            // Используем ту же формулу, что и для меток ладов: margin + fret * fretWidth - fretWidth / 4
            const x = margin + position.fret * fretWidth - fretWidth / 4;
            
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', x);
            circle.setAttribute('cy', y);
            circle.setAttribute('r', 8);
            circle.setAttribute('class', 'finger-position');
            circle.setAttribute('data-string', position.string);
            circle.setAttribute('data-fret', position.fret);
            svg.appendChild(circle);
            
            // Добавляем номер лада
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', x);
            text.setAttribute('y', y + 4);
            text.setAttribute('class', 'finger-position-text');
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('dominant-baseline', 'middle');
            text.textContent = position.fret.toString();
            svg.appendChild(text);
        }
    });
    
    // Отображаем детальную информацию об аппликатуре
    displayFingeringInfo(fingering);
}

/**
 * Отображение детальной информации об аппликатуре
 */
function displayFingeringInfo(fingering) {
    const fingeringInfo = document.getElementById('fingeringInfo');
    
    const html = `
        <strong>Аппликатура:</strong><br>
        <table style="margin-left: 20px; border-collapse: collapse;">
            <tr>
                <th style="border: 1px solid #ddd; padding: 5px;">Струна</th>
                <th style="border: 1px solid #ddd; padding: 5px;">Лад</th>
                <th style="border: 1px solid #ddd; padding: 5px;">Нота</th>
            </tr>
            ${fingering.map(position => `
                <tr>
                    <td style="border: 1px solid #ddd; padding: 5px;">${position.string}</td>
                    <td style="border: 1px solid #ddd; padding: 5px;">${position.fret === -1 ? 'немая' : position.fret}</td>
                    <td style="border: 1px solid #ddd; padding: 5px;">${position.note || '-'}</td>
                </tr>
            `).join('')}
        </table>
    `;
    
    fingeringInfo.innerHTML = html;
    fingeringInfo.classList.add('show');
}

/**
 * Обработка клика по кнопке Play
 */
async function handlePlayButtonClick() {
    if (!currentChord || !currentFingering) {
        addLogEntry('Сначала выберите аккорд', 'error');
        return;
    }
    
    if (isPlaying) {
        addLogEntry('Аккорд уже воспроизводится', 'error');
        return;
    }
    
    try {
        // Обновляем статус
        updateStatus('playing', 'Воспроизведение аккорда...');
        
        // Логируем начало воспроизведения
        const startTime = performance.now();
        addLogEntry(`Начало воспроизведения аккорда: ${currentChord}`, 'info');
        
        // Воспроизводим аккорд
        playbackResult = await SynchronousPlayback.playChordWithFingering(audioContext, currentFingering, {
            volume: 0.7,
            fadeInDuration: 0.05
        });
        
        if (playbackResult.success) {
            isPlaying = true;
            
            // Обновляем кнопки
            document.getElementById('playButton').disabled = true;
            document.getElementById('stopButton').disabled = false;
            
            // Подсвечиваем позиции на грифе
            highlightFingering(true);
            
            // Запускаем прогресс-бар
            startProgressAnimation();
            
            // Логируем успешное воспроизведение
            const endTime = performance.now();
            const latency = (endTime - startTime).toFixed(2);
            addLogEntry(`Аккорд ${currentChord} воспроизведен с задержкой ${latency} мс`, 'success');
            
            // Автоматически останавливаем через 3 секунды
            setTimeout(() => {
                if (isPlaying) {
                    handleStopButtonClick();
                }
            }, 3000);
        } else {
            throw new Error(playbackResult.errors.join(', '));
        }
        
    } catch (error) {
        updateStatus('error', `Ошибка воспроизведения: ${error.message}`);
        addLogEntry(`Ошибка воспроизведения аккорда ${currentChord}: ${error.message}`, 'error');
    }
}

/**
 * Обработка клика по кнопке Stop
 */
function handleStopButtonClick() {
    if (!isPlaying) {
        return;
    }
    
    try {
        // Останавливаем воспроизведение
        if (playbackResult) {
            SynchronousPlayback.stopChord(playbackResult);
        }
        
        isPlaying = false;
        
        // Обновляем статус
        updateStatus('ready', 'Готов к работе');
        
        // Обновляем кнопки
        document.getElementById('playButton').disabled = false;
        document.getElementById('stopButton').disabled = true;
        
        // Убираем подсветку с грифа
        highlightFingering(false);
        
        // Останавливаем прогресс-бар
        stopProgressAnimation();
        
        // Логируем остановку
        addLogEntry(`Воспроизведение аккорда ${currentChord} остановлено`, 'info');
        
    } catch (error) {
        addLogEntry(`Ошибка при остановке воспроизведения: ${error.message}`, 'error');
    }
}

/**
 * Подсветка позиций на грифе
 */
function highlightFingering(highlight) {
    const positions = document.querySelectorAll('.finger-position:not(.muted)');
    
    positions.forEach(position => {
        if (highlight) {
            position.classList.add('active');
        } else {
            position.classList.remove('active');
        }
    });
}

/**
 * Обновление статуса приложения
 */
function updateStatus(status, message) {
    const statusIndicator = document.getElementById('statusIndicator');
    const statusDot = statusIndicator.querySelector('.status-dot');
    const statusText = statusIndicator.querySelector('.status-text');
    
    // Обновляем классы и текст
    statusDot.className = 'status-dot';
    if (status === 'playing') {
        statusDot.classList.add('playing');
    } else if (status === 'error') {
        statusDot.classList.add('error');
    }
    
    statusText.textContent = message;
}

/**
 * Запуск анимации прогресс-бара
 */
function startProgressAnimation() {
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    
    let progress = 0;
    const interval = setInterval(() => {
        progress += 100 / 30; // 3 секунды / 30 кадров
        
        if (progress >= 100) {
            progress = 100;
            clearInterval(interval);
        }
        
        progressFill.style.width = `${progress}%`;
        progressText.textContent = `${Math.round(progress)}%`;
    }, 100);
    
    // Сохраняем ID интервала для последующей остановки
    progressFill.dataset.intervalId = interval;
}

/**
 * Остановка анимации прогресс-бара
 */
function stopProgressAnimation() {
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    
    // Останавливаем анимацию
    if (progressFill.dataset.intervalId) {
        clearInterval(parseInt(progressFill.dataset.intervalId));
        delete progressFill.dataset.intervalId;
    }
    
    // Сбрасываем прогресс
    progressFill.style.width = '0%';
    progressText.textContent = '0%';
}

/**
 * Добавление записи в лог
 */
function addLogEntry(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const entry = {
        timestamp,
        message,
        type
    };
    
    // Добавляем в массив
    logEntries.push(entry);
    
    // Ограничиваем количество записей
    if (logEntries.length > 100) {
        logEntries.shift();
    }
    
    // Обновляем отображение
    updateLogDisplay();
}

/**
 * Обновление отображения лога
 */
function updateLogDisplay() {
    const logContent = document.getElementById('logContent');
    
    const html = logEntries.map(entry => `
        <div class="log-entry ${entry.type}">
            <span class="log-timestamp">[${entry.timestamp}]</span>
            ${entry.message}
        </div>
    `).join('');
    
    logContent.innerHTML = html;
    
    // Прокручиваем вниз
    logContent.scrollTop = logContent.scrollHeight;
}

/**
 * Обработка клика по кнопке очистки лога
 */
function handleClearLogClick() {
    logEntries = [];
    updateLogDisplay();
    addLogEntry('Лог очищен', 'info');
}

/**
 * Обработка клика по кнопке экспорта лога
 */
function handleExportLogClick() {
    const logText = logEntries.map(entry => 
        `[${entry.timestamp}] [${entry.type.toUpperCase()}] ${entry.message}`
    ).join('\n');
    
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `chordsplayer-log-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
    
    addLogEntry('Лог экспортирован в файл', 'info');
}

/**
 * Предзагрузка аудиофайлов
 */
async function preloadAudioFiles() {
    try {
        addLogEntry('Начало предзагрузки аудиофайлов...', 'info');
        
        const result = await AudioBufferCache.preloadAllSamples(audioContext, { maxFret: 7 });
        
        if (result.success) {
            addLogEntry(`Предзагрузка завершена: ${result.loadedFiles}/${result.totalFiles} файлов загружено`, 'success');
        } else {
            addLogEntry(`Предзагрузка завершена с ошибками: ${result.loadedFiles}/${result.totalFiles} файлов загружено`, 'error');
        }
    } catch (error) {
        addLogEntry(`Ошибка при предзагрузке аудиофайлов: ${error.message}`, 'error');
    }
}

// Запускаем приложение при загрузке страницы
window.addEventListener('load', initApp);