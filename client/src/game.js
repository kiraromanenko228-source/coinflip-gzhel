// ЭКСТРЕННЫЙ ДЕБАГ - ДОБАВЬТЕ В САМОЕ НАЧАЛО
console.log('🎮 game.js ЗАГРУЖЕН!');

// Глобальный перехват всех ошибок
window.addEventListener('error', function(e) {
    console.error('💥 ГЛОБАЛЬНАЯ ОШИБКА:', e.error);
    console.error('📍 В файле:', e.filename, 'строка:', e.lineno);
    return true;
});

// Проверяем загрузку DOM
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ DOM загружен!');
    
    // ПРИНУДИТЕЛЬНАЯ АКТИВАЦИЯ ВСЕГО
    setTimeout(function() {
        console.log('🚀 Активация элементов...');
        
        // 1. Убираем все CSS блокировки
        document.querySelectorAll('*').forEach(el => {
            el.style.pointerEvents = 'auto';
            el.style.userSelect = 'auto';
            el.style.webkitUserSelect = 'auto';
        });
        
        // 2. Включаем все кнопки
        const buttons = document.querySelectorAll('button');
        console.log('🎯 Найдено кнопок:', buttons.length);
        
        buttons.forEach((btn, index) => {
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
        });
        
        console.log('🎉 Активация завершена!');
    }, 1000);
});

class CoinFlipCasino {
    constructor() {
        this.playerId = 'player_' + Math.random().toString(36).substr(2, 9);
        this.balance = 1000;
        this.currentBet = null;
        this.currentAmount = 100;
        this.isFlipping = false;
        this.gameMode = 'single';
        this.bankAmount = 0;
        
        // БАЛАНС КАЗИНО
        this.casinoBalance = 0;
        this.casinoCommission = 0;
        
        // СИСТЕМА ОБНАРУЖЕНИЯ МАРТИНГЕЙЛА
        this.lastGameTime = 0;
        this.martingaleDetectionCount = 0;
        this.consecutiveGames = 0;
        
        this.stats = {
            gamesPlayed: 0,
            wins: 0,
            losses: 0,
            totalWin: 0,
            lossStreak: 0,
            winStreak: 0
        };

        this.gamesHistory = [];
        this.leaders = [];
        
        // Мультиплеер
        this.multiplayer = new MultiplayerManager(this);
        
        // Статистика сервера
        this.serverStats = {
            online: 0,
            rooms: 0,
            queue: 0,
            totalGames: 0,
            peakOnline: 0
        };

        this.initializeEventListeners();
        this.loadPlayerData();
        this.multiplayer.connect();
        
        console.log('🎰 CoinFlip Casino инициализирована!');
    }

    // 🎯 УЛУЧШЕННАЯ СИСТЕМА ШАНСОВ ДЛЯ ОДИНОЧНОЙ ИГРЫ
    calculateSingleWinProbability() {
        const totalGames = this.stats.gamesPlayed;
        const balanceRatio = this.balance / 1000;
        const betRatio = this.currentAmount / this.balance;
        
        console.log(`🎯 Анализ игрока: Баланс ${this.balance}₽ (x${balanceRatio.toFixed(1)}), Ставка ${this.currentAmount}₽, Игр: ${totalGames}`);

        // 🎁 ЗАМАНИВАНИЕ НОВИЧКОВ
        if (totalGames < 3) {
            console.log(`🎁 Одиночная: новичок - шанс 70%`);
            return 0.70;
        }
        
        // 🔍 ОБНАРУЖЕНИЕ МАРТИНГЕЙЛ-СТРАТЕГИИ
        const isMartingale = this.detectMartingaleStrategy();
        if (isMartingale) {
            this.martingaleDetectionCount++;
            console.log(`🎯 Обнаружена мартингейл-стратегия! (${this.martingaleDetectionCount} раз) Шанс 35%`);
            
            // После 3 обнаружений - еще больше снижаем шансы
            if (this.martingaleDetectionCount >= 3) {
                console.log(`🎯 Усиленная защита от мартингейла! Шанс 25%`);
                return 0.25;
            }
            return 0.35;
        }
        
        // 🔁 КОМПЕНСАЦИЯ ПОСЛЕ ПРОИГРЫШЕЙ (но не для мартингейла)
        if (this.stats.lossStreak >= 3) {
            console.log(`🔁 Одиночная: компенсация после ${this.stats.lossStreak} проигрышей - 55%`);
            return 0.55;
        }
        
        // 📉 КОНТРОЛЬ БАЛАНСА - СЛИВ УСПЕШНЫХ
        if (balanceRatio > 1.8) {
            console.log(`📉 Одиночная: баланс x${balanceRatio.toFixed(1)} - слив 20%`);
            return 0.20;
        }
        
        if (balanceRatio > 1.4) {
            console.log(`📉 Одиночная: баланс x${balanceRatio.toFixed(1)} - снижение 35%`);
            return 0.35;
        }
        
        // 💸 КРУПНЫЕ СТАВКИ - ВЫЖИМАЕМ МАКСИМУМ
        if (this.currentAmount > 400) {
            console.log(`💸 Одиночная: крупная ставка ${this.currentAmount} - шанс 30%`);
            return 0.30;
        }
        
        if (this.currentAmount > 150) {
            console.log(`💸 Одиночная: средняя ставка ${this.currentAmount} - шанс 40%`);
            return 0.40;
        }
        
        // 🎰 СТАНДАРТ - СТАБИЛЬНЫЙ ДОХОД КАЗИНО
        if (this.stats.winStreak >= 2) {
            console.log(`🎰 Одиночная: серия побед ${this.stats.winStreak} - снижение до 45%`);
            return 0.45;
        }
        
        console.log(`🎰 Одиночная: стандартный шанс 48%`);
        return 0.48;
    }

    // 🔍 МЕТОД ДЛЯ ОБНАРУЖЕНИЯ МАРТИНГЕЙЛ-СТРАТЕГИИ
    detectMartingaleStrategy() {
        // Анализируем последние 6 игр
        const recentGames = this.gamesHistory.slice(0, 6);
        
        if (recentGames.length < 3) return false;
        
        let martingaleSigns = 0;
        let totalSignsPossible = 0;
        
        // Признаки мартингейла:
        for (let i = 1; i < recentGames.length; i++) {
            const prevGame = recentGames[i];
            const currentGame = recentGames[i-1];
            
            totalSignsPossible += 3; // Максимум 3 признака на пару игр
            
            // 1. Удвоение ставки после проигрыша
            if (!prevGame.win && currentGame.amount === prevGame.amount * 2) {
                martingaleSigns += 2; // Сильный признак
                console.log(`🔍 Мартингейл-признак: удвоение ставки после проигрыша`);
            }
            
            // 2. Смена выбора после проигрыша
            if (!prevGame.win && currentGame.bet !== prevGame.bet) {
                martingaleSigns += 1;
                console.log(`🔍 Мартингейл-признак: смена выбора после проигрыша`);
            }
            
            // 3. Быстрое увеличение ставок
            if (currentGame.amount > prevGame.amount * 1.8) {
                martingaleSigns += 1;
                console.log(`🔍 Мартингейл-признак: быстрое увеличение ставки`);
            }
            
            // 4. Маленькие начальные ставки с ростом
            if (prevGame.amount <= 25 && currentGame.amount <= 50 && currentGame.amount > prevGame.amount) {
                martingaleSigns += 1;
            }
        }
        
        // 5. Слишком частые игры
        const now = Date.now();
        if (this.lastGameTime > 0 && (now - this.lastGameTime) < 2500) {
            martingaleSigns += 2;
            console.log(`🔍 Мартингейл-признак: слишком частые игры`);
        }
        
        // 6. Многократные смены выбора
        const betChanges = this.countBetChanges(recentGames);
        if (betChanges >= 3) {
            martingaleSigns += 1;
            console.log(`🔍 Мартингейл-признак: многократная смена выбора`);
        }
        
        // Если больше 40% признаков - считаем что это мартингейл
        const martingaleRatio = totalSignsPossible > 0 ? martingaleSigns / totalSignsPossible : 0;
        const isMartingale = martingaleRatio > 0.4;
        
        if (isMartingale) {
            console.log(`🎯 Обнаружена мартингейл-стратегия! Признаков: ${martingaleSigns}/${totalSignsPossible} (${Math.round(martingaleRatio * 100)}%)`);
        }
        
        return isMartingale;
    }

    // 📊 ПОДСЧЕТ СМЕН ВЫБОРА
    countBetChanges(games) {
        let changes = 0;
        for (let i = 1; i < games.length; i++) {
            if (games[i].bet !== games[i-1].bet) {
                changes++;
            }
        }
        return changes;
    }

    // ⏰ ПРОВЕРКА ЧАСТОТЫ ИГР
    checkGameFrequency() {
        const now = Date.now();
        const lastGameTime = this.lastGameTime || 0;
        const timeDiff = now - lastGameTime;
        
        // Если игрок делает ставки слишком быстро - подозрительно
        if (timeDiff < 2000) {
            this.consecutiveGames++;
            console.log(`⏰ Подозрительно быстрая игра! ${this.consecutiveGames} подряд`);
            
            // После 3 быстрых игр подряд - блокируем
            if (this.consecutiveGames >= 3) {
                this.showMessage('⏰ Слишком много быстрых игр! Подождите 10 секунд.');
                setTimeout(() => {
                    this.consecutiveGames = 0;
                    this.showMessage('✅ Можно продолжать игру!');
                }, 10000);
                return false;
            }
        } else {
            this.consecutiveGames = 0; // Сбрасываем счетчик если игрок ждал
        }
        
        this.lastGameTime = now;
        return true;
    }

    initializeEventListeners() {
        // Табы
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Кнопки ставок (одиночная игра)
        document.querySelectorAll('.bet-btn').forEach(btn => {
            if (btn.id !== 'multiHeadsBtn' && btn.id !== 'multiTailsBtn') {
                btn.addEventListener('click', (e) => {
                    this.selectBet(e.target.dataset.bet);
                });
            }
        });

        // Контроль суммы ставки
        const customAmount = document.getElementById('customAmount');
        if (customAmount) {
            customAmount.addEventListener('input', (e) => {
                this.setAmount(parseInt(e.target.value) || 0);
            });
        }

        const doubleBtn = document.getElementById('doubleBtn');
        if (doubleBtn) {
            doubleBtn.addEventListener('click', () => {
                this.doubleAmount();
            });
        }

        const halfBtn = document.getElementById('halfBtn');
        if (halfBtn) {
            halfBtn.addEventListener('click', () => {
                this.halfAmount();
            });
        }

        // Основная кнопка (одиночная игра)
        const flipBtn = document.getElementById('flipBtn');
        if (flipBtn) {
            flipBtn.addEventListener('click', () => {
                this.flipCoin();
            });
        }

        // Бонусы
        const bonusBtn = document.getElementById('bonusBtn');
        if (bonusBtn) {
            bonusBtn.addEventListener('click', () => {
                this.getDailyBonus();
            });
        }

        const resetBtn = document.getElementById('resetBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.resetBalance();
            });
        }

        // Мультиплеер кнопки
        const multiAmount = document.getElementById('multiAmount');
        if (multiAmount) {
            multiAmount.addEventListener('input', (e) => {
                this.setMultiAmount(parseInt(e.target.value) || 0);
            });
        }

        const multiDoubleBtn = document.getElementById('multiDoubleBtn');
        if (multiDoubleBtn) {
            multiDoubleBtn.addEventListener('click', () => {
                this.doubleMultiAmount();
            });
        }

        const multiHalfBtn = document.getElementById('multiHalfBtn');
        if (multiHalfBtn) {
            multiHalfBtn.addEventListener('click', () => {
                this.halfMultiAmount();
            });
        }

        const findOpponentBtn = document.getElementById('findOpponentBtn');
        if (findOpponentBtn) {
            findOpponentBtn.addEventListener('click', () => {
                this.multiplayer.findOpponent(this.currentAmount);
            });
        }

        const cancelSearchBtn = document.getElementById('cancelSearchBtn');
        if (cancelSearchBtn) {
            cancelSearchBtn.addEventListener('click', () => {
                this.multiplayer.cancelSearch();
            });
        }

        const multiHeadsBtn = document.getElementById('multiHeadsBtn');
        if (multiHeadsBtn) {
            multiHeadsBtn.addEventListener('click', () => {
                this.multiplayer.makeBet('heads');
            });
        }

        const multiTailsBtn = document.getElementById('multiTailsBtn');
        if (multiTailsBtn) {
            multiTailsBtn.addEventListener('click', () => {
                this.multiplayer.makeBet('tails');
            });
        }

        const playAgainBtn = document.getElementById('playAgainBtn');
        if (playAgainBtn) {
            playAgainBtn.addEventListener('click', () => {
                this.multiplayer.playAgain();
            });
        }
    }

    switchTab(tabName) {
        document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
        const activeContent = document.getElementById(`${tabName}-tab`);
        
        if (activeTab) activeTab.classList.add('active');
        if (activeContent) activeContent.classList.add('active');
        
        this.gameMode = tabName;
        
        if (tabName === 'multiplayer') {
            this.multiplayer.updateUI();
        }
        
        this.updateUI();
    }

    selectBet(bet) {
        if (this.isFlipping) return;

        this.currentBet = bet;
        
        document.querySelectorAll('.bet-btn').forEach(btn => {
            if (btn.id !== 'multiHeadsBtn' && btn.id !== 'multiTailsBtn') {
                btn.classList.remove('active');
            }
        });
        document.querySelectorAll(`[data-bet="${bet}"]`).forEach(btn => {
            btn.classList.add('active');
        });
        
        this.checkReadyState();
    }

    setAmount(amount) {
        if (amount < 10) amount = 10;
        if (amount > this.balance) amount = this.balance;
        
        this.currentAmount = amount;
        const customAmount = document.getElementById('customAmount');
        if (customAmount) customAmount.value = amount;
        
        this.checkReadyState();
    }

    setMultiAmount(amount) {
        if (amount < 10) amount = 10;
        if (amount > this.balance) amount = this.balance;
        
        this.currentAmount = amount;
        const multiAmount = document.getElementById('multiAmount');
        const searchAmount = document.getElementById('searchAmount');
        
        if (multiAmount) multiAmount.value = amount;
        if (searchAmount) searchAmount.textContent = amount;
    }

    doubleAmount() {
        let newAmount = this.currentAmount * 2;
        if (newAmount > this.balance) newAmount = this.balance;
        this.setAmount(newAmount);
    }

    doubleMultiAmount() {
        let newAmount = this.currentAmount * 2;
        if (newAmount > this.balance) newAmount = this.balance;
        this.setMultiAmount(newAmount);
    }

    halfAmount() {
        let newAmount = Math.floor(this.currentAmount / 2);
        if (newAmount < 10) newAmount = 10;
        this.setAmount(newAmount);
    }

    halfMultiAmount() {
        let newAmount = Math.floor(this.currentAmount / 2);
        if (newAmount < 10) newAmount = 10;
        this.setMultiAmount(newAmount);
    }

    checkReadyState() {
        const flipBtn = document.getElementById('flipBtn');
        if (!flipBtn) return;
        
        const canPlay = this.currentBet && this.currentAmount >= 10 && this.currentAmount <= this.balance;
        flipBtn.disabled = !canPlay || this.isFlipping;
    }

    async flipCoin() {
        if (this.isFlipping || !this.currentBet || this.currentAmount < 10) return;
        
        // ПРОВЕРКА ЧАСТОТЫ ИГР
        if (!this.checkGameFrequency()) {
            return;
        }
        
        this.isFlipping = true;
        const flipBtn = document.getElementById('flipBtn');
        if (flipBtn) flipBtn.disabled = true;

        // Снимаем деньги
        this.balance -= this.currentAmount;
        this.updateUI();

        // Анимация
        const coin = document.getElementById('coin');
        if (coin) coin.classList.add('flipping');

        try {
            const result = this.flipCoinLocal();
            
            setTimeout(() => {
                if (coin) coin.classList.remove('flipping');
                this.processResult(result);
                this.isFlipping = false;
            }, 1500);

        } catch (error) {
            console.error('Error:', error);
            this.isFlipping = false;
        }
    }

    flipCoinLocal() {
        // 🎯 ИСПОЛЬЗУЕМ УМНУЮ СИСТЕМУ ВМЕСТО 50/50
        const winProbability = this.calculateSingleWinProbability();
        const playerWins = Math.random() < winProbability;
        
        // Определяем результат на основе выигрыша
        const result = playerWins ? this.currentBet : (this.currentBet === 'heads' ? 'tails' : 'heads');
        const winAmount = playerWins ? this.currentAmount * 2 : 0;
        const commission = playerWins ? Math.floor(this.currentAmount * 0.1) : 0;
        
        console.log(`🎲 Бросок монеты: ${result} | Шанс: ${(winProbability * 100).toFixed(1)}% | Выигрыш: ${playerWins}`);
        
        return {
            result: result,
            win: playerWins,
            winAmount: winAmount - commission,
            commission: commission
        };
    }

    processResult(result) {
        const resultDiv = document.getElementById('result');
        if (!resultDiv) return;
        
        // Обновляем статистику и серии
        this.stats.gamesPlayed++;
        
        if (result.win) {
            this.balance += result.winAmount;
            this.stats.wins++;
            this.stats.winStreak++;
            this.stats.lossStreak = 0;
            this.stats.totalWin += result.winAmount - this.currentAmount;
            
            // КАЗИНО ПОЛУЧАЕТ КОМИССИЮ
            this.casinoBalance += result.commission;
            this.casinoCommission += result.commission;
            
            let message = `🎉 Выигрыш! Выпал ${this.getRussianName(result.result)}! +${result.winAmount} ₽`;
            if (result.commission > 0) {
                message += ` (комиссия казино: -${result.commission} ₽)`;
            }
            resultDiv.innerHTML = `<i class="fas fa-trophy"></i> ${message}`;
            resultDiv.className = 'result win';
        } else {
            this.stats.losses++;
            this.stats.lossStreak++;
            this.stats.winStreak = 0;
            this.stats.totalWin -= this.currentAmount;
            
            // КАЗИНО ПОЛУЧАЕТ ВСЮ СТАВКУ ПРИ ПРОИГРЫШЕ
            this.casinoBalance += this.currentAmount;
            
            resultDiv.innerHTML = `<i class="fas fa-times"></i> Проигрыш! Выпала ${this.getRussianName(result.result)}. -${this.currentAmount} ₽`;
            resultDiv.className = 'result lose';
        }

        // Добавляем в историю
        this.addToHistory({
            type: 'pve',
            bet: this.currentBet,
            amount: this.currentAmount,
            result: result.result,
            win: result.win,
            winAmount: result.winAmount,
            commission: result.commission,
            timestamp: new Date()
        });

        this.updateUI();
        this.saveGameData();
    }

    addToHistory(game) {
        this.gamesHistory.unshift(game);
        if (this.gamesHistory.length > 50) {
            this.gamesHistory = this.gamesHistory.slice(0, 50);
        }
        this.updateHistoryUI();
    }

    updateHistoryUI() {
        const historyList = document.getElementById('historyList');
        if (!historyList) return;
        
        historyList.innerHTML = '';
        
        // Заголовок
        const header = document.createElement('div');
        header.className = 'history-item';
        header.style.background = 'rgba(255, 255, 255, 0.15)';
        header.style.fontWeight = 'bold';
        header.innerHTML = `
            <div>Тип игры</div>
            <div>Ставка</div>
            <div>Результат</div>
            <div>Сумма</div>
        `;
        historyList.appendChild(header);
        
        this.gamesHistory.forEach(game => {
            const item = document.createElement('div');
            item.className = `history-item ${game.win ? 'history-win' : 'history-lose'}`;
            
            const typeIcon = game.type === 'pve' ? '🤖' : '👥';
            const typeText = game.type === 'pve' ? 'Против бота' : 'PvP';
            const betText = this.getRussianName(game.bet);
            const resultText = this.getRussianName(game.result);
            
            let amountText = '';
            let amountIcon = '';
            if (game.win) {
                amountText = `+${game.winAmount} ₽`;
                amountIcon = '🟢';
                if (game.commission > 0) {
                    amountText += ` (-${game.commission}₽)`;
                }
            } else {
                amountText = `-${game.amount} ₽`;
                amountIcon = '🔴';
            }
            
            item.innerHTML = `
                <div>${typeIcon} ${typeText}</div>
                <div>${betText}</div>
                <div>${resultText}</div>
                <div>${amountIcon} ${amountText}</div>
            `;
            historyList.appendChild(item);
        });

        // Если история пустая
        if (this.gamesHistory.length === 0) {
            const emptyItem = document.createElement('div');
            emptyItem.className = 'history-item';
            emptyItem.innerHTML = `
                <div colspan="4" style="text-align: center; opacity: 0.7;">
                    <i class="fas fa-history"></i> История игр пуста
                </div>
            `;
            historyList.appendChild(emptyItem);
        }
    }

    async getDailyBonus() {
        try {
            const today = new Date().toDateString();
            const lastBonus = localStorage.getItem('lastBonus');
            
            if (lastBonus === today) {
                const bonusStatus = document.getElementById('bonusStatus');
                if (bonusStatus) bonusStatus.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Бонус уже получен сегодня';
                return;
            }
            
            this.balance += 100;
            localStorage.setItem('lastBonus', today);
            
            const bonusStatus = document.getElementById('bonusStatus');
            const bonusBtn = document.getElementById('bonusBtn');
            
            if (bonusStatus) bonusStatus.innerHTML = '<i class="fas fa-check"></i> +100 ₽ получено!';
            if (bonusBtn) bonusBtn.disabled = true;
            
            this.updateUI();
            this.saveGameData();
            
        } catch (error) {
            console.error('Bonus error:', error);
            const bonusStatus = document.getElementById('bonusStatus');
            if (bonusStatus) bonusStatus.innerHTML = '<i class="fas fa-times"></i> Ошибка получения бонуса';
        }
    }

    async resetBalance() {
        try {
            const twoWeeksAgo = Date.now() - (14 * 24 * 60 * 60 * 1000);
            const lastReset = localStorage.getItem('lastReset') || 0;
            
            if (this.balance > 0 || lastReset > twoWeeksAgo) {
                alert('❌ Сброс недоступен. Проверьте что баланс = 0 и прошло 2 недели с последнего сброса.');
                return;
            }
            
            this.balance = 1000;
            // Сбрасываем статистику при сбросе баланса
            this.stats.lossStreak = 0;
            this.stats.winStreak = 0;
            this.martingaleDetectionCount = 0;
            this.consecutiveGames = 0;
            localStorage.setItem('lastReset', Date.now());
            
            const resetBtn = document.getElementById('resetBtn');
            if (resetBtn) resetBtn.disabled = true;
            
            this.updateUI();
            this.saveGameData();
            alert('✅ Баланс сброшен до 1000 ₽');
            
        } catch (error) {
            console.error('Reset error:', error);
            alert('❌ Ошибка сброса баланса');
        }
    }

    getRussianName(side) {
        return side === 'heads' ? 'ОРЁЛ' : 'РЕШКА';
    }

    // 📢 МЕТОД ДЛЯ СООБЩЕНИЙ
    showMessage(message) {
        const resultDiv = document.getElementById('result');
        if (resultDiv) {
            resultDiv.innerHTML = message;
            resultDiv.className = 'result';
            
            // Автоочистка через 5 секунд
            setTimeout(() => {
                if (resultDiv.innerHTML === message) {
                    resultDiv.innerHTML = '';
                    resultDiv.className = 'result';
                }
            }, 5000);
        }
    }

    updateUI() {
        // Баланс и основные элементы
        this.updateElement('balance', this.balance);
        this.updateElement('gamesPlayed', this.stats.gamesPlayed);
        this.updateElement('wins', this.stats.wins);
        this.updateElement('losses', this.stats.losses);
        this.updateElement('totalWin', this.stats.totalWin);

        // Статистика сервера
        this.updateElement('onlinePlayers', this.serverStats.online);
        this.updateElement('activeRooms', this.serverStats.rooms);
        this.updateElement('waitingQueue', this.serverStats.queue);
        this.updateElement('totalGames', this.serverStats.totalGames);
        this.updateElement('peakOnline', this.serverStats.peakOnline);

        // Онлайн счетчик в хедере
        const onlineCount = document.getElementById('onlineCount');
        if (onlineCount) {
            onlineCount.innerHTML = `<i class="fas fa-users"></i> ${this.serverStats.online}`;
        }

        // БАЛАНС КАЗИНО
        const casinoBalanceElement = document.getElementById('casinoBalance');
        if (!casinoBalanceElement) {
            // Создаем элемент если его нет
            const balanceContainer = document.querySelector('.balance-container');
            if (balanceContainer) {
                const casinoElem = document.createElement('div');
                casinoElem.className = 'casino-balance';
                casinoElem.id = 'casinoBalance';
                casinoElem.innerHTML = `<i class="fas fa-landmark"></i> Казино: ${this.casinoBalance} ₽`;
                casinoElem.style.marginLeft = '20px';
                casinoElem.style.opacity = '0.8';
                casinoElem.style.fontSize = '14px';
                balanceContainer.appendChild(casinoElem);
            }
        } else {
            casinoBalanceElement.innerHTML = `<i class="fas fa-landmark"></i> Казино: ${this.casinoBalance} ₽`;
        }

        // Проверяем возможность сброса
        const resetBtn = document.getElementById('resetBtn');
        if (resetBtn) resetBtn.disabled = this.balance > 0;

        // Проверяем ежедневный бонус
        const today = new Date().toDateString();
        const bonusUsed = localStorage.getItem('lastBonus') === today;
        const bonusBtn = document.getElementById('bonusBtn');
        if (bonusBtn) bonusBtn.disabled = bonusUsed;

        this.checkReadyState();
        this.updateHistoryUI();
    }

    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    }

    updateServerStats(stats) {
        this.serverStats = stats;
        this.updateUI();
    }

    saveGameData() {
        const gameData = {
            playerId: this.playerId,
            balance: this.balance,
            stats: this.stats,
            gamesHistory: this.gamesHistory,
            casinoBalance: this.casinoBalance,
            casinoCommission: this.casinoCommission,
            martingaleDetectionCount: this.martingaleDetectionCount,
            lastSave: Date.now()
        };
        localStorage.setItem('coinFlipData', JSON.stringify(gameData));
        console.log('💾 Данные сохранены');
    }

    loadGameData() {
        try {
            const saved = localStorage.getItem('coinFlipData');
            if (saved) {
                const data = JSON.parse(saved);
                this.playerId = data.playerId || this.playerId;
                this.balance = data.balance || 1000;
                this.stats = data.stats || this.stats;
                this.gamesHistory = data.gamesHistory || [];
                this.casinoBalance = data.casinoBalance || 0;
                this.casinoCommission = data.casinoCommission || 0;
                this.martingaleDetectionCount = data.martingaleDetectionCount || 0;
                
                console.log('💾 Данные игры загружены');
                console.log('💰 Баланс казино:', this.casinoBalance, '₽');
                console.log('🎯 Обнаружений мартингейла:', this.martingaleDetectionCount);
            }
        } catch (error) {
            console.error('Ошибка загрузки данных:', error);
        }
    }
}

// Менеджер мультиплеера (без изменений)
class MultiplayerManager {
    constructor(gameInstance) {
        this.game = gameInstance;
        this.socket = null;
        this.state = 'disconnected';
        this.roomId = null;
        this.opponent = null;
        this.betTimer = 30;
        this.myBet = null;
        this.opponentBet = null;
        this.pingInterval = null;
        this.lastPingTime = 0;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 3;
    }

    connect() {
        try {
            const serverURL = 'wss://coinflip-gzhel.onrender.com';
            
            console.log(`🔗 Подключаемся к серверу: ${serverURL}`);
            
            const connectionTimeout = setTimeout(() => {
                if (this.socket && this.socket.readyState === WebSocket.CONNECTING) {
                    console.log('⏰ Таймаут подключения');
                    this.socket.close();
                    this.showMessage('❌ Сервер не отвечает');
                    this.state = 'disconnected';
                    this.updateConnectionStatus(false);
                }
            }, 8000);
            
            this.socket = new WebSocket(serverURL);
            
            this.socket.onopen = () => {
                clearTimeout(connectionTimeout);
                console.log('✅ Успешное подключение к серверу');
                this.state = 'connected';
                this.reconnectAttempts = 0;
                this.updateConnectionStatus(true);
                
                this.socket.send(JSON.stringify({
                    type: 'auth',
                    playerId: this.game.playerId,
                    balance: this.game.balance
                }));
                
                this.startPing();
            };
            
            this.socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleMessage(data);
                } catch (error) {
                    console.error('❌ Ошибка парсинга сообщения:', error);
                }
            };
            
            this.socket.onclose = (event) => {
                clearTimeout(connectionTimeout);
                console.log(`🔴 Отключение от сервера:`, event.code, event.reason);
                this.state = 'disconnected';
                this.updateConnectionStatus(false);
                
                this.stopPing();
                
                if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.reconnectAttempts++;
                    const delay = Math.min(2000 * this.reconnectAttempts, 10000);
                    console.log(`🔄 Попытка переподключения ${this.reconnectAttempts}/${this.maxReconnectAttempts} через ${delay}мс`);
                    
                    setTimeout(() => {
                        if (this.state === 'disconnected') {
                            this.connect();
                        }
                    }, delay);
                } else {
                    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                        this.showMessage('❌ Сервер недоступен. Попробуйте позже.');
                    }
                }
            };
            
            this.socket.onerror = (error) => {
                clearTimeout(connectionTimeout);
                console.error('💥 Ошибка WebSocket:', error);
                this.state = 'disconnected';
                this.updateConnectionStatus(false);
                this.showMessage('❌ Ошибка подключения к серверу');
            };
            
        } catch (error) {
            console.error('❌ Ошибка подключения:', error);
            this.state = 'disconnected';
            this.updateConnectionStatus(false);
        }
    }

    handleMessage(data) {
        console.log('📨 Получено сообщение:', data.type, data);
        
        switch (data.type) {
            case 'auth_success':
                this.handleAuthSuccess(data);
                break;
            case 'searching':
                this.handleSearching(data);
                break;
            case 'opponent_found':
                this.handleOpponentFound(data);
                break;
            case 'timer_update':
                this.handleTimerUpdate(data);
                break;
            case 'bet_made':
                this.handleBetMade(data);
                break;
            case 'coin_flip_start':
                this.handleCoinFlipStart(data);
                break;
            case 'game_result':
                this.handleGameResult(data);
                break;
            case 'opponent_disconnected':
                this.handleOpponentDisconnected(data);
                break;
            case 'search_cancelled':
                this.handleSearchCancelled(data);
                break;
            case 'stats_update':
                this.game.updateServerStats(data);
                break;
            case 'pong':
                this.handlePong(data);
                break;
            case 'error':
                this.handleError(data);
                break;
        }
    }

    handleAuthSuccess(data) {
        this.state = 'connected';
        this.showMessage('✅ Успешное подключение к игровому серверу');
        this.updateUI();
    }

    startPing() {
        this.pingInterval = setInterval(() => {
            this.lastPingTime = Date.now();
            if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                this.socket.send(JSON.stringify({
                    type: 'ping'
                }));
            }
        }, 15000);
    }

    stopPing() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }

    handlePong(data) {
        const ping = Date.now() - this.lastPingTime;
        console.log(`📡 Пинг: ${ping}мс`);
    }

    findOpponent(amount) {
        if (this.state !== 'connected') {
            this.showMessage('❌ Нет подключения к серверу');
            return;
        }

        if (amount < 10 || amount > 10000) {
            this.showMessage('❌ Неверная сумма ставки (10-10000 ₽)');
            return;
        }

        if (amount > this.game.balance) {
            this.showMessage('❌ Недостаточно средств для этой ставки');
            return;
        }

        this.socket.send(JSON.stringify({
            type: 'find_opponent',
            betAmount: amount
        }));

        this.state = 'searching';
        this.updateUI();
    }

    cancelSearch() {
        if (this.state === 'searching') {
            this.socket.send(JSON.stringify({
                type: 'cancel_search'
            }));
            this.state = 'connected';
            this.updateUI();
        }
    }

    makeBet(bet) {
        if (this.state !== 'betting') {
            this.showMessage('❌ Не сейчас');
            return;
        }

        this.socket.send(JSON.stringify({
            type: 'make_bet',
            bet: bet,
            roomId: this.roomId
        }));

        this.myBet = bet;
        this.updateUI();
    }

    handleSearching(data) {
        this.state = 'searching';
        this.updateElement('queuePosition', data.queuePosition || 1);
        this.updateUI();
    }

    handleOpponentFound(data) {
        this.state = 'betting';
        this.roomId = data.roomId;
        this.opponent = data.opponent;
        this.betTimer = data.timer;
        this.myBet = null;
        this.opponentBet = null;
        
        this.updateElement('opponentId', this.opponent.id);
        this.updateElement('opponentBalance', this.opponent.balance);
        
        this.updateUI();
        this.startBettingTimer();
    }

    startBettingTimer() {
        const timerInterval = setInterval(() => {
            this.betTimer--;
            this.updateElement('betTimer', this.betTimer);
            
            if (this.betTimer <= 0) {
                clearInterval(timerInterval);
                if (!this.myBet) {
                    const randomBet = Math.random() > 0.5 ? 'heads' : 'tails';
                    this.makeBet(randomBet);
                    this.showMessage('⏰ Время вышло! Сделана случайная ставка.');
                }
            }
            
            if (this.state !== 'betting') {
                clearInterval(timerInterval);
            }
        }, 1000);
    }

    handleTimerUpdate(data) {
        this.betTimer = data.timer;
        this.updateElement('betTimer', data.timer);
    }

    handleBetMade(data) {
        if (data.playerId === this.game.playerId) {
            this.myBet = data.bet;
        } else {
            this.opponentBet = data.bet;
        }
        this.updateUI();
    }

    handleCoinFlipStart(data) {
        this.state = 'flipping';
        this.updateUI();
    }

    handleGameResult(data) {
        this.state = 'results';
        
        if (data.balances && data.balances[this.game.playerId]) {
            this.game.balance = data.balances[this.game.playerId];
        }
        
        const isWinner = data.winner === this.game.playerId;
        const message = isWinner ? 
            `🎉 Вы победили! +${data.winAmount} ₽` :
            `😞 Вы проиграли! -${this.game.currentAmount} ₽`;
        
        const resultText = `${message} | Выпал: ${this.game.getRussianName(data.result)}`;
        
        const multiResult = document.getElementById('multiResult');
        if (multiResult) {
            multiResult.innerHTML = resultText;
            multiResult.className = `result ${isWinner ? 'win' : 'lose'}`;
        }
        
        this.game.addToHistory({
            type: 'pvp',
            bet: this.myBet,
            amount: this.game.currentAmount,
            result: data.result,
            win: isWinner,
            winAmount: isWinner ? data.winAmount : 0,
            commission: data.commission || 0,
            timestamp: new Date()
        });
        
        this.game.updateUI();
        this.updateUI();
        
        setTimeout(() => {
            if (this.state === 'results') {
                this.playAgain();
            }
        }, 10000);
    }

    handleOpponentDisconnected(data) {
        this.showMessage('❌ Соперник отключился от игры');
        this.resetMultiplayer();
    }

    handleSearchCancelled(data) {
        this.state = 'connected';
        this.showMessage('✅ Поиск соперника отменен');
        this.updateUI();
    }

    handleError(data) {
        this.showMessage(`❌ Ошибка: ${data.message}`);
    }

    playAgain() {
        this.resetMultiplayer();
    }

    resetMultiplayer() {
        this.state = 'connected';
        this.roomId = null;
        this.opponent = null;
        this.myBet = null;
        this.opponentBet = null;
        this.updateUI();
    }

    disconnect() {
        if (this.socket) {
            this.socket.close(1000, 'Manual disconnect');
        }
        this.state = 'disconnected';
        this.stopPing();
        this.updateConnectionStatus(false);
        this.showMessage('🔌 Подключение отключено');
    }

    updateUI() {
        const stateElement = document.getElementById('multiplayerState');
        if (!stateElement) return;

        const findBtn = document.getElementById('findOpponentBtn');
        const cancelBtn = document.getElementById('cancelSearchBtn');

        this.updateElement('myBetValue', this.myBet ? this.game.getRussianName(this.myBet) : '-');
        this.updateElement('opponentBetValue', this.opponentBet ? this.game.getRussianName(this.opponentBet) : '-');

        if (findBtn) findBtn.disabled = this.state !== 'connected';
        if (cancelBtn) cancelBtn.style.display = this.state === 'searching' ? 'block' : 'none';

        const disconnectBtn = document.getElementById('disconnectBtn');
        if (!disconnectBtn && this.state === 'connected') {
            const controls = document.querySelector('.multiplayer-controls');
            if (controls) {
                const btn = document.createElement('button');
                btn.id = 'disconnectBtn';
                btn.className = 'cancel-button';
                btn.innerHTML = '<i class="fas fa-plug"></i> ОТКЛЮЧИТЬСЯ';
                btn.onclick = () => this.disconnect();
                controls.appendChild(btn);
            }
        }
    }

    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    }

    updateConnectionStatus(connected) {
        const statusDot = document.getElementById('statusDot');
        const statusText = document.getElementById('serverStatus');
        
        if (statusDot) {
            statusDot.className = connected ? 'status-dot connected' : 'status-dot';
        }
        if (statusText) {
            statusText.innerHTML = connected ? '<i class="fas fa-check"></i> Подключено' : '<i class="fas fa-times"></i> Отключено';
        }
    }

    showMessage(message) {
        console.log('💬:', message);
        const resultElement = document.getElementById('multiResult');
        if (resultElement) {
            resultElement.innerHTML = message;
            resultElement.className = 'result';
        }
    }
}

// Запускаем игру когда страница загружена
document.addEventListener('DOMContentLoaded', () => {
    window.game = new CoinFlipCasino();
    
    console.log('🎰 CoinFlip Casino v2.0 - С защитой от мартингейла!');
    console.log('🚀 Игра успешно запущена!');
});
