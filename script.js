document.addEventListener('DOMContentLoaded', function() {
    // Dota2 部分英雄列表（简化版）以及它们的类型
    const heroes = {
        strength: [
			"abyssal_underlord","alchemist","axe","bristleback","centaur","chaos_knight","dawnbreaker","doom_bringer","dragon_knight","earthshaker","earth_spirit","elder_titan",
			"huskar","kunkka","legion_commander","life_stealer","lycan","mars","night_stalker","ogre_magi","omniknight","phoenix","primal_beast","pudge",
			"rattletrap","shredder","skeleton_king","slardar","spirit_breaker","sven","tidehunter","tiny","treant","tusk","undying"
			]
        ,
        agility: [
			"antimage","bloodseeker","bounty_hunter","broodmother","clinkz","drow_ranger","ember_spirit","faceless_void","gyrocopter","hoodwink","juggernaut","kez",
			"lone_druid","luna","medusa","meepo","mirana","monkey_king","morphling","naga_siren","nevermore","phantom_lancer","phantom_assassin","razor","riki","slark","sniper",
			"templar_assassin","terrorblade","troll_warlord","ursa","vengefulspirit","viper","weaver"
        ],
        intelligence: [
			"ancient_apparition","chen","crystal_maiden","dark_willow","dark_seer","disruptor","enchantress","grimstroke","invoker","jakiro","keeper_of_the_light",
			"leshrac","lich","lina","lion","muerta","necrolyte","obsidian_destroyer","oracle","puck","pugna","queenofpain","ringmaster","rubick","shadow_demon","shadow_shaman",
			"silencer","skywrath_mage","storm_spirit","tinker","warlock","witch_doctor","winter_wyvern","zuus"
        ],
        allTalent: [
			"abaddon","arc_warden","bane","batrider","beastmaster","brewmaster","dazzle","death_prophet","enigma","furion","magnataur","marci","nyx_assassin",
			"pangolier","sand_king","snapfire","spectre","techies","venomancer","visage","void_spirit","windrunner","wisp"
        ]
    };

    // 游戏状态
    let gameState = {
        currentPhase: 'ban', // ban 或 pick
        currentTeam: 'radiant', // radiant 或 dire
        step: 1,
        maxSteps: 24, // 总共22步（14ban + 8pick）
        radiant: {
            bans: [],
            picks: []
        },
        dire: {
            bans: [],
            picks: []
        },
        availableHeroes: {
            strength: [...heroes.strength],
            agility: [...heroes.agility],
            intelligence: [...heroes.intelligence],
            allTalent: [...heroes.allTalent]
        },
        history: [] // 操作历史
    };

    // 阶段顺序（根据Dota2队长模式规则）
    const phaseOrder = [
        'ban', 'ban', 'ban', 'ban', 'ban', 'ban', 'ban', // 前7 ban
        'pick', 'pick', //8、9 pick
		'ban', 'ban', 'ban', //10、11、12 ban
		'pick', 'pick', 'pick', 'pick', 'pick', 'pick', //13、14、15、16、17、18 pick
		'ban', 'ban', 'ban', 'ban', // 19、20、21、22 ban
		'pick', 'pick' // 23、24 pick
    ];

    // 团队顺序（根据Dota2队长模式规则）
    const teamOrder = [
        'radiant', 'dire', 'dire', 'radiant', 'dire', 'dire', 'radiant',
		'radiant', 'dire', 
		'radiant', 'radiant', 'dire',
		'dire', 'radiant', 'radiant', 'dire',
		'dire' ,'radiant', 'radiant', 'dire', 'dire' ,'radiant',
		'radiant', 'dire', 'dire' ,'radiant', 
		'radiant', 'dire'
    ];

    // DOM 元素
    const radiantBans = document.getElementById('radiant-bans');
    const radiantPicks = document.getElementById('radiant-picks');
    const direBans = document.getElementById('dire-bans');
    const direPicks = document.getElementById('dire-picks');
    const strengthHeroesContainer = document.getElementById('strength-heroes');
    const agilityHeroesContainer = document.getElementById('agility-heroes');
    const intelligenceHeroesContainer = document.getElementById('intelligence-heroes');
    const allTalentHeroesContainer = document.getElementById('all-talent-heroes');
    const currentPhaseElement = document.getElementById('current-phase');
    const currentTeamElement = document.getElementById('current-team');
    const currentActionElement = document.getElementById('current-action');
    const stepCounterElement = document.getElementById('step-counter');
    const undoBtn = document.getElementById('undo-btn');
    const resetBtn = document.getElementById('reset-btn');
    const saveBtn = document.getElementById('save-btn');

    // 获取英雄头像URL
    function getHeroAvatarUrl(heroName) {
        // Stratz API 的英雄头像URL格式
        const formattedName = heroName.toLowerCase().replace(/ /g, '_');
		return `images/${formattedName}_vert.png`;
    }

    // 初始化游戏
    function initGame() {
        // 检查是否有保存的游戏状态
        const urlParams = new URLSearchParams(window.location.search);
        const gameId = urlParams.get('id');
        
        if (gameId) {
            // 从本地存储加载游戏
            const savedGame = localStorage.getItem(gameId);
            if (savedGame) {
                gameState = JSON.parse(savedGame);
            }
        }
        
        // 渲染可用英雄
        renderAvailableHeroes();
        
        // 渲染状态信息
        updateStatusDisplay();
        
        // 更新已选择的英雄
        updateRadiantBans();
        updateRadiantPicks();
        updateDireBans();
        updateDirePicks();
        
        // 添加事件监听器
        undoBtn.addEventListener('click', undoAction);
        resetBtn.addEventListener('click', resetGame);
        saveBtn.addEventListener('click', saveGame);
    }

    // 保存游戏
    function saveGame() {
        const gameId = generateRandomId();
        localStorage.setItem(gameId, JSON.stringify(gameState));
        window.history.replaceState({}, document.title, `?id=${gameId}`);
        alert(`游戏已保存，ID: ${gameId}`);
    }

    // 生成随机ID
    function generateRandomId() {
        return Math.random().toString(36).substr(2, 9);
    }

    // 渲染可用英雄
    function renderAvailableHeroes() {
        // 清空容器
        strengthHeroesContainer.innerHTML = '';
        agilityHeroesContainer.innerHTML = '';
        intelligenceHeroesContainer.innerHTML = '';
        allTalentHeroesContainer.innerHTML = '';
        
        // 渲染力量英雄
        gameState.availableHeroes.strength.forEach(hero => {
            renderHeroAvatar(hero, strengthHeroesContainer);
        });
        
        // 渲染敏捷英雄
        gameState.availableHeroes.agility.forEach(hero => {
            renderHeroAvatar(hero, agilityHeroesContainer);
        });
        
        // 渲染智力英雄
        gameState.availableHeroes.intelligence.forEach(hero => {
            renderHeroAvatar(hero, intelligenceHeroesContainer);
        });
        
        // 渲染全才英雄
        gameState.availableHeroes.allTalent.forEach(hero => {
            renderHeroAvatar(hero, allTalentHeroesContainer);
        });
    }

    // 创建并渲染英雄头像
    function renderHeroAvatar(hero, container) {
        const avatarElement = document.createElement('div');
        avatarElement.className = 'hero-avatar';
        avatarElement.dataset.hero = hero;
        
        const img = document.createElement('img');
        img.src = getHeroAvatarUrl(hero);
        img.alt = hero;
        avatarElement.appendChild(img);
        
        // 如果是禁用阶段或当前队伍的Pick阶段，允许点击
        if ((gameState.currentPhase === 'ban' || 
            (gameState.currentPhase === 'pick' && gameState.currentTeam === getCurrentTeam())) && 
            gameState.step <= gameState.maxSteps) {
            avatarElement.addEventListener('click', handleHeroClick);
        } else {
            avatarElement.classList.add('disabled');
        }
        
        container.appendChild(avatarElement);
    }

    // 处理英雄点击事件
    function handleHeroClick(event) {
        const hero = event.target.closest('.hero-avatar').dataset.hero;
        
        // 检查是否可以执行操作
        if (gameState.step > gameState.maxSteps) {
            return;
        }
        
        // 执行操作
        if (gameState.currentPhase === 'ban') {
            performBan(hero);
        } else {
            performPick(hero);
        }
        
        // 更新显示
        renderAvailableHeroes();
        updateRadiantBans();
        updateRadiantPicks();
        updateDireBans();
        updateDirePicks();
        updateStatusDisplay();
        
        // 保存历史记录
        gameState.history.push({
            step: gameState.step,
            phase: gameState.currentPhase,
            team: gameState.currentTeam,
            hero: hero
        });
        
        // 进入下一步
        gameState.step++;
        
        // 更新当前阶段和队伍
        if (gameState.step <= gameState.maxSteps) {
            gameState.currentPhase = phaseOrder[gameState.step - 1];
            gameState.currentTeam = teamOrder[gameState.step - 1];
        }
    }

    // 执行禁用
    function performBan(hero) {
        // 从可用英雄中移除
        removeHeroFromAvailable(hero);
        
        // 添加到对应队伍的禁用列表
        if (gameState.currentTeam === 'radiant') {
            gameState.radiant.bans.push(hero);
        } else {
            gameState.dire.bans.push(hero);
        }
    }

    // 执行选择
    function performPick(hero) {
        // 从可用英雄中移除
        removeHeroFromAvailable(hero);
        
        // 添加到对应队伍的选择列表
        if (gameState.currentTeam === 'radiant') {
            gameState.radiant.picks.push(hero);
        } else {
            gameState.dire.picks.push(hero);
        }
    }

    // 从可用英雄中移除
    function removeHeroFromAvailable(hero) {
        for (const type in gameState.availableHeroes) {
            gameState.availableHeroes[type] = gameState.availableHeroes[type].filter(h => h !== hero);
        }
    }

    // 更新天辉禁用英雄
    function updateRadiantBans() {
        radiantBans.innerHTML = '';
        gameState.radiant.bans.forEach((hero, index) => {
            const avatarElement = createSelectedHeroAvatar(hero, index + 1);
            avatarElement.classList.add('banned');
            radiantBans.appendChild(avatarElement);
        });
    }

    // 更新天辉选择英雄
    function updateRadiantPicks() {
        radiantPicks.innerHTML = '';
        gameState.radiant.picks.forEach((hero, index) => {
            const avatarElement = createSelectedHeroAvatar(hero, index + 1);
            avatarElement.classList.add('picked');
            radiantPicks.appendChild(avatarElement);
        });
    }

    // 更新夜魇禁用英雄
    function updateDireBans() {
        direBans.innerHTML = '';
        gameState.dire.bans.forEach((hero, index) => {
            const avatarElement = createSelectedHeroAvatar(hero, index + 1);
            avatarElement.classList.add('banned');
            direBans.appendChild(avatarElement);
        });
    }

    // 更新夜魇选择英雄
    function updateDirePicks() {
        direPicks.innerHTML = '';
        gameState.dire.picks.forEach((hero, index) => {
            const avatarElement = createSelectedHeroAvatar(hero, index + 1);
            avatarElement.classList.add('dire-picked');
            direPicks.appendChild(avatarElement);
        });
    }

    // 创建已选择英雄头像
    function createSelectedHeroAvatar(heroName, number) {
        const avatarElement = document.createElement('div');
        avatarElement.className = 'hero-avatar';
        
        const numberElement = document.createElement('div');
        numberElement.className = 'selected-number';
        numberElement.textContent = number;
        
        const img = document.createElement('img');
        img.src = getHeroAvatarUrl(heroName);
        img.alt = heroName;
        
        avatarElement.appendChild(numberElement);
        avatarElement.appendChild(img);
        
        return avatarElement;
    }

    // 更新状态显示
    function updateStatusDisplay() {
        currentPhaseElement.textContent = gameState.currentPhase === 'ban' ? '禁用阶段' : '选择阶段';
        currentTeamElement.textContent = gameState.currentTeam === 'radiant' ? '天辉' : '夜魇';
        currentActionElement.textContent = gameState.currentPhase === 'ban' ? '禁用英雄' : '选择英雄';
        stepCounterElement.textContent = `第 ${gameState.step} 步`;
    }

    // 撤销操作
    function undoAction() {
        if (gameState.history.length === 0 || gameState.step === 0) {
            return;
        }
        
        const lastAction = gameState.history.pop();
        gameState.step = lastAction.step;
        
        // 恢复英雄
        addToAvailableHeroes(lastAction.hero);
        
        // 从队伍中移除
        if (lastAction.phase === 'ban') {
            if (lastAction.team === 'radiant') {
                gameState.radiant.bans = gameState.radiant.bans.filter(h => h !== lastAction.hero);
            } else {
                gameState.dire.bans = gameState.dire.bans.filter(h => h !== lastAction.hero);
            }
        } else {
            if (lastAction.team === 'radiant') {
                gameState.radiant.picks = gameState.radiant.picks.filter(h => h !== lastAction.hero);
            } else {
                gameState.dire.picks = gameState.dire.picks.filter(h => h !== lastAction.hero);
            }
        }
        
        // 更新显示
        renderAvailableHeroes();
        updateRadiantBans();
        updateRadiantPicks();
        updateDireBans();
        updateDirePicks();
        updateStatusDisplay();
        
        // 更新当前阶段和队伍
        if (gameState.step <= gameState.maxSteps) {
            gameState.currentPhase = phaseOrder[gameState.step - 1];
            gameState.currentTeam = teamOrder[gameState.step - 1];
        }
    }

    // 将英雄添加回可用列表
    function addToAvailableHeroes(hero) {
        const heroType = getHeroType(hero);
        if (heroType) {
            gameState.availableHeroes[heroType].push(hero);
        }
    }

    // 获取英雄类型
    function getHeroType(hero) {
        if (heroes.strength.includes(hero)) return 'strength';
        if (heroes.agility.includes(hero)) return 'agility';
        if (heroes.intelligence.includes(hero)) return 'intelligence';
        if (heroes.allTalent.includes(hero)) return 'allTalent';
        return null;
    }

    // 重置游戏
    function resetGame() {
        gameState = {
            currentPhase: 'ban',
            currentTeam: 'radiant',
            step: 1,
            maxSteps: 22,
            radiant: {
                bans: [],
                picks: []
            },
            dire: {
                bans: [],
                picks: []
            },
            availableHeroes: {
                strength: [...heroes.strength],
                agility: [...heroes.agility],
                intelligence: [...heroes.intelligence],
                allTalent: [...heroes.allTalent]
            },
            history: []
        };
        
        renderAvailableHeroes();
        updateRadiantBans();
        updateRadiantPicks();
        updateDireBans();
        updateDirePicks();
        updateStatusDisplay();
        
        // 移除URL中的游戏ID
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    // 获取当前队伍
    function getCurrentTeam() {
        return teamOrder[gameState.step - 1];
    }

    // 初始化游戏
    initGame();
});