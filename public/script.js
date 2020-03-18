const uuidv4 = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Shuffles array in place. ES6 version
 * @param {Array} a items An array containing the items.
 */
const shuffle = (a) => {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

let mobs;
let BOARD;
let overworldBoard;
let player;
let overworld = document.querySelector('#overworld');
let mobsWrapper = document.querySelector('#mobs');
const BLOCK_SIZE = 128;

const DEFAULT_PLAYER = {
	type: 'pc',
	name: 'Steve',
	DOMSelector: '#steve',
	revealsBlocks: true,
	HP: 10,
	points: 0,
	items: {},
	tools: {},
	position: [100, 100],
	questions: [],
	gameVersion: 5.1,
	canWalkOn: ['grass', 'dirt', 'farm', 'tree', 'door']
};

const STARTING_LEVEL = 1;
const BOARD_WIDTH = 200;
const BOARD_HEIGHT = 200;

const goShopping = (collider, collidee, mobs) => {
	let player = collider.type === 'pc' ? collider : collidee;
	let shopkeeper = collider.type === 'npc' ? collider : collidee;

	hideOverworld();
	const battleBoard = document.querySelector('#battle');
	battleBoard.classList.add('visible', 'shop');

	const wares = JSON.parse(JSON.stringify(shopkeeper.wares));
	shuffle(wares);
	const offerings = wares.slice(0, 4);

	const contents = `
		<div id="controlBar"><div class="close">x</div></div>
		<div id="shopkeeper"><div>BUY OR SELL SOMETHIN' WILL YA!</div><img src="shop_fire.png" /><img src="shopkeeper.png" /><img src="shop_fire.png" /></div>
		<div id="wares">
			${offerings.reduce((choices, choice) => choices + `<div class="ware" data-item="${choice.type}" data-price="${choice.price}" data-cost="${choice.cost}"><div class="item ${choice.type}"></div><div class="cost">${choice.price} ${choice.cost}</div></div>`, '')}
		</div>
	`;

	battleBoard.innerHTML = contents;

	let listener;
	const hideShop = () => {
		battleBoard.querySelector('#wares').removeEventListener('click', listener);
		battleBoard.classList.remove('visible', 'shop');
		battleBoard.innerHTML = '';
		showOverworld();
	}

	const makePurchase = (e) => {
		const ware = e.target.closest('.ware');
		const item = ware.dataset.item;
		const price = ware.dataset.price;
		const cost = ware.dataset.cost;

		if (player.items[cost] >= price) {
			player.items[item] = player.items[item] + 1 || 1;
			player.items[cost] = player.items[cost] - price || 0;
			player = savePlayer(player);
		}
	}

	listener = battleBoard.querySelector('#wares').addEventListener('click', makePurchase);
	battleBoard.querySelector('#controlBar .close').addEventListener('click', hideShop, { once: true });
}

let mobKinds = {
	'sheep': {
		type: 'npc',
		kind: 'sheep',
		name: 'Sheep',
		classList: ['sheep'],
		revealsBlocks: false,
		points: 10,
		HP: 5,
		baseLevel: 1,
		ac: 14,
		drops: {
			"wool": { probability: 100, quantity: [{ probability: 100, amount: 1 }, { probability: 50, amount: 2 }, { probability: 25, amount: 3 }]},
			"mutton": { probability: 10, quantity: [{ probability: 100, amount: 1 }, { probability: 10, amount: 2 }]}
		},
		vulnerableTo: [

		],
		captureWith: [
			"grass seed"
		],
		hostile: false,
		canWalkOn: ['grass', 'dirt', 'farm'],
		tools: {},
		isDespawnable: true
	},
	'shopkeeper': {
		type: 'npc',
		kind: 'shopkeeper',
		name: 'Shopkeeper',
		classList: ['shopkeeper'],
		revealsBlocks: false,
		points: 10,
		HP: 5,
		baseLevel: 1,
		ac: 14,
		drops: {
		},
		vulnerableTo: [

		],
		captureWith: [

		],
		hostile: false,
		canWalkOn: ['grass', 'dirt', 'farm'],
		tools: {},
		isDespawnable: false,
		collide: goShopping,
		wares: [
			{ type: 'shovel', price: 25, cost: 'gold' },
			/*{ type: 'sword', price: 500, cost: 'gold' },
			{ type: 'axe', price: 500, cost: 'gold' },
			{ type: 'hoe', price: 100, cost: 'gold' },
			{ type: 'pickaxe', price: 5000, cost: 'gold' },
			{ type: 'boat', price: 1000, cost: 'gold' },
			{ type: 'bed', price: 30, cost: 'gold' },
			{ type: 'potion', price: 100, cost: 'gold' },*/
			{ type: 'gold', price: 20, cost: 'dirt' },
			{ type: 'gold', price: 50, cost: 'grass seed' },
			{ type: 'gold', price: 10, cost: 'wool' },
			{ type: 'gold', price: 5, cost: 'mutton' },
			{ type: 'gold', price: 20, cost: 'carrots' },
			{ type: 'gold', price: 50, cost: 'water' }
		]
	}
}

const createMob = (type, mob = null) => Object.assign(
	JSON.parse(JSON.stringify(mobKinds[type])),
	{
		level: mobKinds[type].baseLevel + Math.floor(Math.random() * 4),
		id: uuidv4(),
		collide: mobKinds[type].collide
	},
	mob
);


const hydrateMobs = () => {
	let savedMobs = JSON.parse( localStorage.getItem('mobs') ) || [];

	// re-attach any methods
	savedMobs = savedMobs.map((mob) => createMob(mob.kind, mob));


	if (savedMobs.length === 0) {
		for (let i = 0; i < 10; i++) {
			savedMobs.push(createMob('sheep'));
		}
	}

	return savedMobs;
}

const saveMobs = (mobs) => {
	localStorage.setItem( 'mobs', JSON.stringify(mobs) );

	return mobs;
}



const saveQuestionScore = (player, question, correct) => {
	player.questions = player.questions || [];

	let pqi = player.questions.findIndex(q => {
		return q.question.includes(question.question[0]);
	});

	// Make sure if the question doesn't exist in the player's questions you add it to the end
	pqi = pqi < 0 ? player.questions.length : pqi;
	player.questions[pqi] = player.questions[pqi] || JSON.parse(JSON.stringify(question));

	question.asked = (question.asked || 0) + 1;
	// If they've been asked this question before, use their previous score. Otherwise give them their first point
	player.questions[pqi].asked = player.questions[pqi].asked ? player.questions[pqi].asked + 1 : 1;

	if (correct) {
		question.correct = (question.correct || 0) + 1;
		player.questions[pqi].correct = player.questions[pqi].correct ? player.questions[pqi].correct + 1 : 1;
	}

	player = savePlayer(player);

	return player;
}

// levels are a Fibonacci sequence (100, 200, 300, 500, 800, 1300, 2100, ...)
const getLevel = (xp = 0, prevPrevThreshold = 0, prevThreshold = 1000, level = STARTING_LEVEL) => {
	// const threshold = prevPrevThreshold + prevThreshold;

	// if (xp < threshold) {
	// 	return level;
	// }

	// return getLevel(xp, prevThreshold, threshold, level + 1);
	return Math.ceil(xp/8000);
};

const showDungeon = () => {
	hideOverworld();
	const dungeon = document.querySelector('#dungeon');
	dungeon.classList.add('visible');
};

const hideDungeon = () => {
	showOverworld();
	const dungeon = document.querySelector('#dungeon');
	dungeon.classList.remove('visible');
}

const doDungeon = (config, question) => {
	showDungeon();
	const dungeon = document.querySelector('#dungeon');

	const dungeonBoard = [
		[1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
		[1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
		[1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
		[1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
		[1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
		[1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
		[1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
		[1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
	];

	const selector = (ri, ci) => {
		return `dungoenrow${ri}cell${ci}`;
	}

	const BLOCKS = [
		{selector, block: {type: 'water'}, solved: true },
		{selector, block: {type: 'grass'}, solved: true }
	]

	const BOARD = [];
	dungeonBoard.forEach((row, ri) => {
		BOARD[ri] = BOARD[ri] || [];
		row.forEach((col, ci) => {
			// NOTE: We aren't doing the stringify/parse trick here because I'm concerned
			// that the selector function above wouldn't make it through in one piece.
			// But this means we have a link-by-reference to the contents of BLOCKS specified
			// numerically in dungeonBoard above instead of a disconnected clone of the BLOCKS
			// object. It is not yet clear to me that this matters.
			BOARD[ri][ci] = BLOCKS[dungeonBoard[ri][ci]];
		});
	});

	const boardDOM = buildBoardDOM(BOARD);

	dungeon.appendChild(boardDOM);
}

const getRandomChoice = (currentChoices, rightAnswer, getChoiceFromQuestions, config, player) => {
	// loop through sameLevelWrongAnswers and generate all of the possible options you can from them
	// filter out the already chosen possibilities (the things in currentChoices)
	let sameLevelQuestions = config.questions.filter(question => question.level === rightAnswer.level);
	let sameLevelWrongAnswers = sameLevelQuestions.flatMap(question => {
		if (getChoiceFromQuestions) {
			return question.question.filter(q => !currentChoices.includes(q));
		}
		return question.answer.filter(q => !currentChoices.includes(q));
	});

	// if there is nothing left, go through levelAppropriateQuestions and populate more possibilities
	// filter out the already chosen possibilities (the things in currentChoices)
	if (sameLevelWrongAnswers.length <= 0) {
		const lowerLimit = rightAnswer.level - Math.floor(rightAnswer.level * .50);
		const upperLimit = rightAnswer.level + 1;
		sameLevelQuestions = config.questions.filter(question => question.level >= lowerLimit && question.level <= upperLimit);
		sameLevelWrongAnswers = sameLevelQuestions.flatMap(question => {
			if (getChoiceFromQuestions) {
				return question.question.filter(q => !currentChoices.includes(q));
			}
			return question.answer.filter(q => !currentChoices.includes(q));
		});
	}


	// choose a random options from what is left and return it
	const newChoice = sameLevelWrongAnswers[Math.floor(Math.random() * sameLevelWrongAnswers.length)];
	return newChoice;
}

const launchQuizUI = (config, question, player, resolve) => {
	const quiz = document.querySelector('#quiz')
	quiz.classList.add('visible');
	hideOverworld();

	const askAnswerInsteadOfQuestion = Math.ceil(Math.random() * 2) === 2;
	const questions = askAnswerInsteadOfQuestion ? question.answer : question.question;
	const answers = askAnswerInsteadOfQuestion ? question.question : question.answer;

	const variation = Math.floor(Math.random() * questions.length);


	const correctChoice = answers[Math.floor(Math.random() * answers.length)];
	const choices = [correctChoice];
	for (let i = 0; i < 8; i++) {
		choices.push(getRandomChoice(choices, question, askAnswerInsteadOfQuestion, config, player));
	}

	shuffle(choices);

	const gameBoard = `
	<div class="question">
		<div class="grass"><div>${questions[variation]}</div></div>
	</div>
	<div class="answers">
		<div class="grass hidden"><div>The correct answer to "${questions[variation]}" is:</div></div>
		${choices.reduce((choices, choice) => choices + `<div class="grass"><div>${choice}</div></div>`, '')}
	</div>
	`;

	quiz.innerHTML = gameBoard;

	const hideQuiz = (success) => {
		quiz.classList.remove('visible');
		showOverworld();
		resolve(success);
	}

	const gradeAnswer = (e) => {
		// Check to see if the answer chosen is actually correct
		if (answers.includes(e.target.innerText)) {
			hideQuiz(true);
		} else {
			quiz.querySelectorAll('.answers .grass').forEach(div => {
				if (!answers.includes(div.querySelector('div').innerText) && !div.classList.contains('hidden')) {
					div.remove();
				}
			});
			quiz.querySelector('.grass.hidden').classList.remove('hidden');
			quiz.querySelector('.answers').addEventListener('click', () => {
				hideQuiz(false);
			}, { once: true });
		}
	}

	quiz.querySelector('.answers').addEventListener('click', gradeAnswer, { once: true });
	if (!question.asked || question.asked < 1) {
		quiz.querySelectorAll('.answers .grass').forEach(div => {
			if (!answers.includes(div.querySelector('div').innerText) && !div.classList.contains('hidden')) {
				div.remove();
			}
		});
		quiz.querySelector('.grass.hidden').classList.remove('hidden');
	}
}

const showQuestion = (config, question, player) => {
	return new Promise(resolve => {
		if (config.written) {
			const askAnswerInsteadOfQuestion = Math.ceil(Math.random() * 2) === 2;
			const questions = askAnswerInsteadOfQuestion ? question.answer : question.question;
			const answers = askAnswerInsteadOfQuestion ? question.question : question.answer;

			const variation = Math.floor(Math.random() * questions.length);

			const theirAnswer = prompt(`what is "${questions[variation]}"`);

			let correct = false;
			correct = answers.includes(theirAnswer.toLowerCase());

			alert(`${correct ? 'Correct!' : 'Incorrect.'} "${questions[variation]}" is "${answers.join(', or ')}".`);

			resolve(correct);
		} else {
			launchQuizUI(config, question, player, resolve);
		}
	});
}

const askQuestion = async (config, question, player) => {
	const correct = await showQuestion(config, question, player);

	player = saveQuestionScore(player, question, correct);

	return correct;
}


const easyQuestion = (config, player) => {
	// console.log(`easy question. Question level === ${getLevel(player.points)}`);
	let question = config.questions[Math.floor(Math.random() * config.questions.length)]

	const sameLevelQuestions = config.questions.filter(question => question.level === getLevel(player.points));
	const previousLevelQuestions = config.questions.filter(question => question.level < getLevel(player.points) && !question.correct || question.correct < 12);

	// first determine if there are any previous level questions that have not been answered correctly at
	// least 3 times. If so, ask any of the first six of those. Otherwise ask a random sameLevelQuestion
	if (previousLevelQuestions.length > 0) {
		question = previousLevelQuestions[Math.floor(Math.random() * Math.min(previousLevelQuestions.length, 6))];
	} else if (sameLevelQuestions.length > 0) {
		question = sameLevelQuestions[Math.floor(Math.random() * sameLevelQuestions.length)];
	} else {
		return anyQuestion(config, player);
	}

	return askQuestion(config, question, player);
}

const mediumQuestion = (config, player) => {
	// console.log(`medium question. Question level <= ${getLevel(player.points)}, but >= ${getLevel(player.points) - 5} `);
	let question = config.questions[Math.floor(Math.random() * config.questions.length)]

	const previousLevelQuestions = config.questions.filter(question => question.level < getLevel(player.points) && !question.correct || question.correct < 4);
	const levelAppropriateQuestions = config.questions.filter(question => question.level <= getLevel(player.points) && question.level >= getLevel(player.points) - 5);

	// first determine if there are any previous level questions that have not been answered correctly at
	// least 11 times. If so, ask any of the first six of those. Otherwise ask a level appropriate question
	if (previousLevelQuestions.length > 0) {
		question = previousLevelQuestions[Math.floor(Math.random() * Math.min(previousLevelQuestions.length, 6))];
	} else if (levelAppropriateQuestions.length > 0) {
		question = levelAppropriateQuestions[Math.floor(Math.random() * levelAppropriateQuestions.length)];
	} else {
		return easyQuestion(config, player);
	}

	return askQuestion(config, question, player);
}

const hardQuestion = (config, player) => {
	let question = config.questions[Math.floor(Math.random() * config.questions.length)]

	const previousLevelQuestions = config.questions.filter(question => question.level < getLevel(player.points) && !question.correct || question.correct < 2);
	const levelAppropriateQuestions = config.questions.filter(question => question.level <= getLevel(player.points) && !question.correct || question.correct < question.asked * .75);

	// first determine if there are any previous level questions that have not been answered correctly at
	// least 11 times. If so, ask one of those. Otherwise ask a level appropriate question that has been answered
	// incorrectly less than 75% of the time
	if (previousLevelQuestions.length > 0) {
		// console.log(`hard question. Any question answered fewer than 11 times correctly (there are ${previousLevelQuestions.length || 0} of these)`);
		question = previousLevelQuestions[Math.floor(Math.random() * previousLevelQuestions.length)];
	} else if (levelAppropriateQuestions.length > 0) {
		// console.log(`hard question. Any question answered less than 75% of the time correctly (there are ${levelAppropriateQuestions.length || 0} of these)`);
		question = levelAppropriateQuestions[Math.floor(Math.random() * levelAppropriateQuestions.length)];
	} else {
		return anyQuestion(config, player);
	}

	return askQuestion(config, question, player);
}

const anyQuestion = (config, player) => {
	console.log(`any question up to level ${getLevel(player.points)}`);
	const questions = config.questions.filter(question => question.level <= getLevel(player.points));

	const question = questions[Math.floor(Math.random() * questions.length)];

	return askQuestion(config, question, player);
}

const reward = (who, amount, item) => {
	who.points += amount || 0;

	if (item) {
		who.items = who.items || {};
		who.items[item] = who.items[item] || 0;
		who.items[item]++;
	}

	return who;
}

const savePlayer = (player) => {
	localStorage.setItem( 'player', JSON.stringify(player) );

	return player;
}

const rewardPlayer = (player, amount, item) => {
	player = reward(player, amount, item);

	player = savePlayer(player);

	refreshHUD(player);

	return player;
}

const refreshHUD = (player) => {
	document.querySelector('#scoreBoard').innerHTML = `
		<ul>
			<li>Level: ${getLevel(player.points)}</li>
			<li>Points: ${player.points}</li>
			${player.mobs && Object.keys(player.mobs).reduce((mobs, mob) => mobs + `<li>${mob}: ${player.mobs[mob]}</li>`, '')}
		</ul>
	`;


	// html += `<p>
	// 	<input type="checkbox" value="shovel" id="shovelToggle" ${player.usingTool === 'shovel' ? 'checked' : ''}/> Use Shovel
	// </p>`;

	// remove event listeners
	const oldDOM = document.querySelector('#tools');
	const newDOM = oldDOM.cloneNode(true);
	oldDOM.parentNode.replaceChild(newDOM, oldDOM);

	document.querySelector('#tools').innerHTML = `
		<ul>
			${Object.keys(player.tools).reduce((tools, tool) => tools + `<li class="${tool.replace(/ /g, '-')} tool ${player.usingTool === tool.replace(/ /g, '-') ? 'active' : ''}"><div>${player.tools[tool]}</div></li>`, '')}
			${Object.keys(player.items).reduce((items, item) => items + `<li class="${item.replace(/ /g, '-')} tool ${player.usingTool === item.replace(/ /g, '-') ? 'active' : ''}"><div>${player.items[item]}</div></li>`, '')}
		</ul>
	`;

	document.querySelector('#tools').addEventListener('click', (e) => {
		document.querySelectorAll('#tools .tool').forEach((tool) => tool.classList.remove('active'));

		const clicked = e.target.closest('.tool');
		const whichTool = clicked.classList[0];

		player.usingTool = player.usingTool === whichTool ? '' : whichTool;
		if (player.usingTool === whichTool) {
			clicked.classList.add('active');
		}
		savePlayer(player);
	})
}


const BLOCKS = {
	D: { type: 'dirt', groupingMultiplier: 2, test: (config, player) => hardQuestion(config, player), reward: (player) => rewardPlayer(player, 100, 'dirt') },
	T: { type: 'tree', groupingMultiplier: 8, test: (config, player) => hardQuestion(config, player), reward: (player) => rewardPlayer(player, 110, 'wood') },
	S: { type: 'stone', groupingMultiplier: 3, test: (config, player) => anyQuestion(config, player), reward: (player) => rewardPlayer(player, 110, 'stone') },
	W: { type: 'water', groupingMultiplier: 10, test: (config, player) => mediumQuestion(config, player), reward: (player) => rewardPlayer(player, 105, 'water') },
	F: { type: 'farm', groupingMultiplier: 5, test: (config, player) => hardQuestion(config, player), reward: (player) => rewardPlayer(player, 110, 'carrots') },
	G: { type: 'grass', groupingMultiplier: 11, test: (config, player) => easyQuestion(config, player), reward: (player) => rewardPlayer(player, 120, 'grass seed') },
	P: { type: 'plank', groupingMultiplier: 1, test: (config, player) => anyQuestion(config, player), reward: (player) => rewardPlayer(player, 120, 'plank') },
	L: { type: 'log', groupingMultiplier: 1, test: (config, player) => anyQuestion(config, player), reward: (player) => rewardPlayer(player, 120, 'log') },
	DOOR: { type: 'door', groupingMultiplier: 0, test: (config, player) => anyQuestion(config, player), reward: (player) => rewardPlayer(player, 120, '') }
}

const STRUCTURES = {
	SHOP: {
		PATTERN: [
			['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
			['P', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'P'],
			['P', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'P'],
			['P', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'P'],
			['P', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'P'],
			['P', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'P'],
			['P', 'P', 'P', 'P', 'DOOR', 'DOOR', 'P', 'P', 'P', 'P']
		],
		mobs: [
			{ type: 'shopkeeper', location: [2, 5] }
		]
	}
}

DEFAULT = BLOCKS.G;

const POSSIBILITIES = Object.values(BLOCKS).filter((block) => block.groupingMultiplier > 0);

const generateBoard = (BOARD, width, height, idPrefix) => {
	for (let ri = 0; ri < height; ri++) {
		BOARD[ri] = BOARD[ri] || [];

		for (let ci = 0; ci < width; ci++) {
			const wildcardBlock = POSSIBILITIES[Math.floor(Math.random() * POSSIBILITIES.length)];
			let possibleBlocks = [
				{
					chance: Math.random() * 50,
					block: DEFAULT
				},
				{
					chance: Math.random() * (BOARD[ri][ci - 1] && BOARD[ri][ci - 1].block.groupingMultiplier || DEFAULT.groupingMultiplier) * 25,
					block: BOARD[ri][ci - 1] && BOARD[ri][ci - 1].block || DEFAULT
				},
				{
					chance: Math.random() * (BOARD[ri-1] && BOARD[ri-1][ci] && BOARD[ri-1][ci].block.groupingMultiplier || DEFAULT.groupingMultiplier) * 25,
					block: BOARD[ri-1] && BOARD[ri-1][ci] && BOARD[ri-1][ci].block || DEFAULT
				},
				{
					chance: Math.random() * 130,
					block: wildcardBlock || DEFAULT
				}
			];

			// console.log(possibleBlocks[0], possibleBlocks[1], possibleBlocks[2], possibleBlocks[3])

			// Sort it greatest to least, so we can choose the one with the highest number
			let sorted = possibleBlocks.sort((a, b) => {
				if (a.chance < b.chance) { return 1 }
				else if (a.chance > b.chance) { return -1 }
				else { return 0 }
			});

			// console.log(JSON.parse(joinSON.stringify(sorted[0].block)))

			BOARD[ri][ci] = {
				block: JSON.parse(JSON.stringify(sorted[0].block)),
				selector: (ri, ci) => `${idPrefix}row${ri}cell${ci}`
			};
		}
	}

	// add the structures
	const shopStartRI = Math.floor(Math.random() * 10) + 80;
	const shopStartCI = Math.floor(Math.random() * 10) + 80;
	let shopDoorRI = shopStartRI + 5;
	let shopDoorCI = shopStartCI + 4;

	// first make a path from the shop to the player
	while (shopDoorRI < 99) {
		BOARD[shopDoorRI][shopDoorCI] = {
			block: JSON.parse(JSON.stringify(BLOCKS['D'])),
			selector: (ri, ci) => `${idPrefix}row${ri}cell${ci}`
		};
		BOARD[shopDoorRI][shopDoorCI+1] = {
			block: JSON.parse(JSON.stringify(BLOCKS['D'])),
			selector: (ri, ci) => `${idPrefix}row${ri}cell${ci}`
		};
		shopDoorRI += 1;
	}
	while (shopDoorCI < 102) {
		BOARD[shopDoorRI][shopDoorCI] = {
			block: JSON.parse(JSON.stringify(BLOCKS['D'])),
			selector: (ri, ci) => `${idPrefix}row${ri}cell${ci}`
		};
		BOARD[shopDoorRI+1][shopDoorCI] = {
			block: JSON.parse(JSON.stringify(BLOCKS['D'])),
			selector: (ri, ci) => `${idPrefix}row${ri}cell${ci}`
		};
		shopDoorCI += 1;
	}

	// then make the shop
	STRUCTURES.SHOP.PATTERN.forEach((row, ri) => row.forEach((cell, ci) => {
		BOARD[shopStartRI + ri][shopStartCI + ci] = {
			block: JSON.parse(JSON.stringify(BLOCKS[STRUCTURES.SHOP.PATTERN[ri][ci]])),
			selector: (ri, ci) => `${idPrefix}row${ri}cell${ci}`
		};
	}));


	// now add the shopkeeper
	STRUCTURES.SHOP.mobs.forEach((mob) => {
		console.log('shopStartRI', shopStartRI, 'shopStartCI', shopStartCI, mob.location[0], mob.location[1]);
		let structureMob = createMob(mob.type);
		structureMob.position = [shopStartCI + mob.location[1], shopStartRI + mob.location[0]];
		mobs.push(structureMob);
		console.log('made shopkeeper');
	});

	// console.log(BOARD);

	return BOARD;
}

const hydrateBoard = () => {
	const savedBoard = JSON.parse( localStorage.getItem('board') );

	if (savedBoard) {
		// Upgrade to < 4.2
		if (!savedBoard[0][0].block.type) {
			savedBoard.forEach((row, ri) => {
				row.forEach((cell, ci) => {
					const oldCell = JSON.parse(JSON.stringify(cell));

					// get block type
					const block = BLOCKS[Object.keys(BLOCKS).find(block => BLOCKS[block].type === oldCell.block)];

					savedBoard[ri][ci] = {
						block,
						selector: (ri, ci) => `overworldrow${ri}cell${ci}`
					};

					oldCell.solved ? savedBoard[ri][ci].solved = true : '';
					savedBoard[ri][ci].nearby = oldCell.nearby ? true : false;
				})
			});

			saveBoard(savedBoard);
		}

		// Upgrade to 4.3 && add in selector function
		if (typeof savedBoard[0][0].selector !== 'function') {
			savedBoard.forEach((row, ri) => {
				row.forEach((cell, ci) => {
					const oldCell = JSON.parse(JSON.stringify(cell));

					savedBoard[ri][ci] = {
						block: oldCell.block || oldCell,
						selector: (ri, ci) => `overworldrow${ri}cell${ci}`
					};

					savedBoard[ri][ci].solved = oldCell.solved ? true : false;
					savedBoard[ri][ci].nearby = oldCell.nearby ? true : false;

					// remove chopped down trees
					if (savedBoard[ri][ci].block.type === 'tree' && savedBoard[ri][ci].solved) {
						savedBoard[ri][ci].block = JSON.parse(JSON.stringify(BLOCKS['G']));
					} else if (savedBoard[ri][ci].block.type === 'water' || savedBoard[ri][ci].block.type === 'stone') {
						// water can not be solved without a boat, and boats do not exist yet...
						// stone can not be gotten without a pickaxe, and pickaxen do not exist yet...
						savedBoard[ri][ci].solved = false;
					}
				})
			});

			saveBoard(savedBoard);
		}
	}

	return savedBoard || generateBoard([], BOARD_WIDTH, BOARD_HEIGHT, 'overworld');
}

const saveBoard = (BOARD, force = false) => {
	const now = new Date();
	config.lastSave = config.lastSave || 0;

	if (force || Math.round((now - config.lastSave)/1000) % 60 > 30) {
		config.lastSave = now;
		localStorage.setItem( 'board', JSON.stringify(BOARD) );
	}
}

const blockTry = (blockTarget, entity, BLOCKS) => {
	const targetType = blockTarget.getAttribute('data-type');
	const block = BLOCKS[Object.keys(BLOCKS).find((candidate) => BLOCKS[candidate].type === targetType)]

	const success = block.test(config, entity);

	if (success) block.reward(entity);

	return success;
}

const blockReveal = (BOARD, row, cell) => {
	if (config.fogofwar) {
		// semi-reveal nearby blocks as well
		for (let rowi = -2; rowi <= 2; rowi++) {
			const nearbyRow = row+rowi;
			for (let celli = -2; celli <= 2; celli++) {
				const nearbyCell = cell+celli;

				if ((rowi === -2 || rowi === 2) && (celli === -2 || celli === 2)) {
					// It's a corner, skip it
				} else if (BOARD[nearbyRow] && BOARD[nearbyRow][nearbyCell] && !BOARD[nearbyRow][nearbyCell].nearby) {
					BOARD[nearbyRow][nearbyCell].nearby = true;

					const block = document.querySelector(`#${BOARD[nearbyRow][nearbyCell].selector(nearbyRow, nearbyCell)}`);
					block.classList.add('nearby');
					block.classList.remove('notnearby');
				}
			}
		}
	}

	const target = document.querySelector(`#${BOARD[row][cell].selector(row, cell)}`);

	let forceSave = false;

	switch (BOARD[row][cell].block.type) {
		case 'tree':
			BOARD[row][cell].block.type = 'grass';
			target.classList.remove('tree');
			target.classList.add('grass');
			forceSave = true;
			break;
		case 'grass':
			if (player.usingTool === 'shovel') {
				BOARD[row][cell].block.type = 'dirt';
				target.classList.remove('grass');
				target.classList.add('dirt');

				forceSave = true;
			}
			break;
	}

	if (!BOARD[row][cell].solved) {
		BOARD[row][cell].solved = true;

		target.classList.remove('unsolved');
		target.classList.add('solved');

		// force the save since a new block was revealed
		const threadedSave = () => {
			saveBoard(BOARD, true);
		}
		setTimeout(threadedSave, 0);
	} else {
		// just queue the save
		saveBoard(BOARD, forceSave);
	}
}

const isFocus = (entity) => {
	if (entity.DOMSelector && entity.DOMSelector === '#steve') {
		return true;
	}

	return false;
}

const removeEntity = (entity) => {
	entity.DOM.remove();
}

const placeEntity = (entity, movePositionBy, mobs, player) => {

	// mobs.forEach(function(mob) {
	// 	if (!mob.position) return;

	// 	if (entity.position[0] + movePositionBy[0] === mob.position[0] && entity.position[1] + movePositionBy[1] === mob.position[1]) {
	// 		movePositionBy[0] = 0;
	// 		movePositionBy[1] = 0;
	// 	}
	// })

	let collision = false;

	if (entity !== player && entity.position[0] + movePositionBy[0] === player.position[0] && entity.position[1] + movePositionBy[1] === player.position[1]) {
		(typeof entity.collide === 'function') ? entity.collide(entity, player, mobs) : collide(entity, player, mobs);
	} else if (entity === player) {
		mobs.forEach((mob) => {
			if (entity.position[0] + movePositionBy[0] === mob.position[0]
				&& entity.position[1] + movePositionBy[1] === mob.position[1]) {
				(typeof mob.collide === 'function') ? mob.collide(player, mob, mobs) : collide(player, mob, mobs);
			}
		});
	}

	const targetRow = entity.position[1] + movePositionBy[1];
	const targetCell = entity.position[0] + movePositionBy[0];

	// Make sure target block exists
	const targetBlock = document.querySelector(`#overworldrow${targetRow}cell${targetCell}`);
	if (targetBlock) {
		entity.position[1] = targetRow;
		entity.position[0] = targetCell;

		if (entity.revealsBlocks) {
			blockReveal(BOARD, entity.position[1], entity.position[0]);
		}


		// Only show mobs that are within 20 blocks of the player, taking fog into account
		const isHiddenByFog = !targetBlock.classList.contains('nearby') && config.fogofwar;
		if (!isHiddenByFog && Math.abs(player.position[0] - entity.position[0]) <= 20 && Math.abs(player.position[1] - entity.position[1]) <= 20) {
			entity.DOM.style.display = 'block';
			entity.DOM.style.top = `${(entity.position[1] * BLOCK_SIZE)}px`;
			entity.DOM.style.left = `${entity.position[0] * BLOCK_SIZE}px`;
		} else {
			entity.DOM.style.display = 'none';

			// De-Spawn entity if they are too far from the player
			if (entity.isDespawnable && (Math.abs(player.position[0] - entity.position[0]) > 40 || Math.abs(player.position[1] - entity.position[1]) > 40)) {
				console.log('de-spawning');
				entity.DOM.remove();
				entity.position = null;
				initMob(entity, player);
			}
		}
	}

	if (isFocus(entity)) {
		entity.DOM.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
	}

	return entity;
}

const hideOverworld = () => {
	document.querySelector('#overworld').classList.remove('visible');
	document.querySelector('#overlay').classList.add('visible');
}

const showOverworld = () => {
	document.querySelector('#overworld').classList.add('visible');
	document.querySelector('#overlay').classList.remove('visible');
}

const getTile = (matchTypes, ri, ci) => {
	let variantColumn;
	let variantRow;

	const N_MATCHES  = BOARD[ri - 1] && BOARD[ri - 1][ci]     && matchTypes.includes(BOARD[ri - 1][ci].block.type);
	const NE_MATCHES = BOARD[ri - 1] && BOARD[ri - 1][ci + 1] && matchTypes.includes(BOARD[ri - 1][ci + 1].block.type);
	const E_MATCHES  = BOARD[ri]     && BOARD[ri][ci + 1]     && matchTypes.includes(BOARD[ri][ci + 1].block.type);
	const SE_MATCHES = BOARD[ri + 1] && BOARD[ri + 1][ci + 1] && matchTypes.includes(BOARD[ri + 1][ci + 1].block.type);
	const S_MATCHES  = BOARD[ri + 1] && BOARD[ri + 1][ci]     && matchTypes.includes(BOARD[ri + 1][ci].block.type);
	const SW_MATCHES = BOARD[ri + 1] && BOARD[ri + 1][ci - 1] && matchTypes.includes(BOARD[ri + 1][ci - 1].block.type);
	const W_MATCHES  = BOARD[ri]     && BOARD[ri][ci - 1]     && matchTypes.includes(BOARD[ri][ci - 1].block.type);
	const NW_MATCHES = BOARD[ri - 1] && BOARD[ri - 1][ci - 1] && matchTypes.includes(BOARD[ri - 1][ci - 1].block.type);

	let matchesString = '';
	matchesString += N_MATCHES  ? 'N-'  : '';
	matchesString += NE_MATCHES ? 'NE-' : '';
	matchesString += E_MATCHES  ? 'E-'  : '';
	matchesString += SE_MATCHES ? 'SE-' : '';
	matchesString += S_MATCHES  ? 'S-'  : '';
	matchesString += SW_MATCHES ? 'SW-' : '';
	matchesString += W_MATCHES  ? 'W-'  : '';
	matchesString += NW_MATCHES ? 'NW-' : '';


	// The idea here is to assign each cardinal direction a number.
	// Then find the total by adding all those numbers together.
	// Based on that total, we will know the directions that are different.
	const N  = 1;
	const NE = 3;
	const E  = 5;
	const SE = 10;
	const S  = 20;
	const SW = 40;
	const W  = 80;
	const NW = 160;
	const TOTAL = N + NE + E + SE + S + SW + W + NW;

	let compassTotal = 0;
	compassTotal += N_MATCHES  ? N  : 0;  // 1,
	compassTotal += NE_MATCHES ? NE : 0;  // 3, 4,
	compassTotal += E_MATCHES  ? E  : 0;  // 5, 6, 8, 9,
	compassTotal += SE_MATCHES ? SE : 0; // 10, 11, 13, 14, 15, 16, 18, 19
	compassTotal += S_MATCHES  ? S  : 0; // 20, 21, 23, 24, 25, 26, 29, 30, 31, 33, 34, 35, 36, 38, 39,
	compassTotal += SW_MATCHES ? SW : 0; // 40, 41, 43, 44, 45, 46, 48, 49, 51, 53, 54, 55, 56, 58, 59, 61, 63, 64, 65, 66, 68, 69, 71, 73, 74, 75, 76, 78, 79
	compassTotal += W_MATCHES  ? W  : 0; // 80, 81, 83, 84, 85, 86, 88, 89, 90, 91, 93, 94, 95, 96, 98, 99, 100, 101, 103, 104, 105, 106, 108, 109, 110, 111, 113, 114, 115, 116, 118, 119, 110, 111, 113, 114, 115, 116, 118, 119, 120, 121, 123, 124, 125, 126, 128, 129, 130, 131, 133, 134, 135, 136, 138, 139, 140, 141, 143, 144, 145, 146, 148, 149, 150, 151, 153, 154, 155, 156, 158, 159
	compassTotal += NW_MATCHES ? NW : 0; // 160, 161, 163, 164, 165, 166, 168, 169, 170, 171, 173, 174, 175, 176, 178, 179, 180, 181, 183, 184, 185, 186, 188, 189, 190, 191, 193, 194, 195, 196, 198, 199, 200, 201, 203, 204, 205, 206, 208, 209, 210, 211, 213, 214, 215, 216, 218, 219, 220, 221, 223, 224, 225, 226, 228, 229, 230, 231, 233, 234, 235, 236, 238, 239, 240, 241, 243, 244, 245, 246, 248, 249, 250, 251, 253, 254, 255, 256, 258, 259, 260, 261, 263, 264, 265, 266, 268, 269, 270, 271, 273, 274, 275, 276, 278, 279, 280, 281, 283, 284, 285, 286, 288, 289, 290, 291, 293, 294, 295, 296, 298, 299, 300, 301, 303, 304, 305, 306, 308, 309

	// 256 possible combinations. Figure out which tile goes with which.
	switch (compassTotal) {
		case S:
		case (SE + S):
		case (S + SW):
		case (SE + S + SW):
		case (NE + S):
		case (S + NW):
		case (NE + S + NW):
		case (E + S + SW):
		case (SE + S + NW):
		case (NE + SE + S):
		case (NE + S + SW):
		case (NE + SE + S + SW):
		case (NE + SE + S + NW):
		case (NE + SE + S + SW + NW):
		case (S + SW + NW):
		case (SE + S + NW):
		case (NE + S + SW + NW):
		case (SE + S + SW + NW):
			variantColumn = 3;
			variantRow = 0;
			break;
		case N:
		case (N + NE):
		case (N + SE):
		case (N + SW):
		case (N + NW):
		case (N + NE + SW + NW):
		case (N + NE + SE + NW):
		case (N + NE + SE):
		case (N + NE + NW):
		case (N + SW + NW):
		case (N + SE + NW):
		case (N + NE + SW):
		case (N + NE + SE + SW):
		case (N + NE + SE + SW + NW):
		case (N + SE + SW):
		case (N + SE + SW + NW):
			variantColumn = 4;
			variantRow = 0;
			break;
		case (TOTAL - N - NE - S):
		case (TOTAL - N - S):
		case (TOTAL - N - SE - S):
		case (TOTAL - N - S - SW):
		case (TOTAL - N - S - NW):
		case (NE + E + SE + W):
		case (NE + E + SW + W):
		case (NE + E + W):
		case (NE + E + W + NW):
		case (E + SE + W):
		case (E + SW + W + NW):
		case (E + W):
		case (E + W + NW):
		case (E + SW + W):
		case (E + SE + W + NW):
		case (E + SE + SW + W):
			variantColumn = 5;
			variantRow = 0;
			break;
		case E:
		case (NE + E):
		case (NE + E + SE):
		case (NE + E + SE + NW):
		case (NE + E + SE + SW):
		case (NE + E + SE + SW + NW):
		case (E + SE):
		case (E + NW):
		case (E + SW):
		case (E + SW + NW):
		case (E + SE + SW):
		case (E + SE + SW + NW):
		case (NE + E + SW + NW):
		case (NE + E + NW):
		case (E + SE + NW):
		case (NE + E + SW):
			variantColumn = 6;
			variantRow = 0;
			break;
		case W:
		case (W + NW):
		case (SE + W):
		case (SW + W):
		case (SW + W + NW):
		case (W + NW + SE):
		case (NE + W):
		case (NE + W + NW):
		case (SE + SW + W + NW):
		case (SE + SW + W):
		case (NE + SW + W + NW):
		case (NE + SW + W):
		case (NE + SE + W):
		case (NE + SE + W + NW):
		case (NE + SE + SW + W):
		case (NE + SE + SW + W + NW):
			variantColumn = 7;
			variantRow = 0;
			break;
		case (N + E + S + W):
		case (N + E + S + SW):
		case (NE + E + S + W):
		case (SE + S + W + NW):
		case (N + E + S):
		case (E + S + W):
		case (N + S + W):
		case (N + E + W):
		case (N + E + SW + W):
		case (E + S + W + NW):
		case (N + E + S + NW):
		case (N + SE + S + W):
		case (N + NE + S + W):
		case (TOTAL - E - SW - NW):
		case (TOTAL - NE - S - NW):
		case (TOTAL - N - SE - SW):
		case (TOTAL - NE - SE - W):
			variantColumn = 3;
			variantRow = 1;
			break;
		case 0: // None
		case NE:
		case SE:
		case SW:
		case NW:
		case (NE + NW):
		case (NE + SW):
		case (SE + NW):
		case (NE + SE):
		case (SE + SW):
		case (SW + NW):
		case (NE + SE + SW + NW):
		case (NE + SE + SW):
		case (NE + SE + NW):
		case (NE + SW + NW):
		case (SE + SW + NW):
			variantColumn = 4;
			variantRow = 1;
			break;
		case (N + SE + S + NW):
		case (N + SE + S):
		case (N + SE + S + SW):
		case (N + S + SW):
		case (N + S):
		case (N + NE + SE + S):
		case (N + S + NW):
		case (N + NE + S + SW + NW):
		case (N + NE + S):
		case (N + NE + S + SW):
		case (TOTAL - E - W):
		case (TOTAL - E - SW - W):
		case (TOTAL - E - W - NW):
		case (TOTAL - NE - E - W):
		case (N + S + SW + NW):
		case (N + NE + S + NW):
			variantColumn = 5;
			variantRow = 1;
			break;
		case (TOTAL - NW):
			variantColumn = 6;
			variantRow = 1;
			break;
		case (TOTAL - NE):
			variantColumn = 7;
			variantRow = 1;
			break;
		case (NE + E + SE + S):
		case (E + SE + S):
		case (E + SE + S + SW):
		case (E + SE + S + NW):
		case (TOTAL - N - W):
		case (TOTAL - N - W - NW):
		case (TOTAL - N - NE - W):
			variantColumn = 3;
			variantRow = 2;
			break;
		case (TOTAL - N):
		case (TOTAL - N - NE):
		case (TOTAL - N - NW):
		case (TOTAL - N - NE - NW):
			variantColumn = 4;
			variantRow = 2;
			break;
		case (S + SW + W):
		case (S + SW + W + NW):
		case (SE + S + SW + W):
		case (SE + S + SW + W + NW):
		case (TOTAL - N - E):
		case (SE + S + SW + W):
		case (NE + S + SW + W + NW):
		case (NE + S + SW + W):
			variantColumn = 5;
			variantRow = 2;
			break;
		case (TOTAL - SW):
			variantColumn = 6;
			variantRow = 2;
			break;
		case (TOTAL - SE):
			variantColumn = 7;
			variantRow = 2;
			break;
		case (TOTAL - W):
		case (TOTAL - SW - W):
		case (TOTAL - W - NW):
		case (TOTAL - SW - W - NW):
			variantColumn = 3;
			variantRow = 3;
			break;
		case (TOTAL - E):
		case (TOTAL - NE - E):
		case (TOTAL - E - SE):
		case (TOTAL - NE - E - SE):
			variantColumn = 5;
			variantRow = 3;
			break;
		case (TOTAL - NW - SW):
			variantColumn = 6;
			variantRow = 3;
			break;
		case (TOTAL - NE - SE):
			variantColumn = 7;
			variantRow = 3;
			break;
		case (N + NE + E):
		case (N + NE + E + SE):
		case (N + NE + E + SE + NW):
		case (N + NE + E + NW):
		case (N + NE + E + SW):
		case (TOTAL - S - W):
		case (TOTAL - S - W - NW):
		case (TOTAL - SE - S - W):
			variantColumn = 3;
			variantRow = 4;
			break;
		case (TOTAL - S):
		case (TOTAL - S - SW):
		case (TOTAL - SE - S):
		case (TOTAL - SE - S - SW):
			variantColumn = 4;
			variantRow = 4;
			break;
		case (W + NW + N):
		case (W + NW + N + NE):
		case (SW + W + NW + N + NE):
		case (N + SE + SW + W + NW):
		case (TOTAL - E - S):
		case (N + SW + W + NW):
		case (N + SE + W + NW):
		case (TOTAL - E - S - SW):
			variantColumn = 5;
			variantRow = 4;
			break;
		case (TOTAL - SE - SW):
			variantColumn = 6;
			variantRow = 4;
			break;
		case (TOTAL - NE - NW):
			variantColumn = 7;
			variantRow = 4;
			break;
		case (TOTAL - NE - S - SW):
		case (TOTAL - NE - S):
		case (N + S + W + NW):
		case (N + E + W + NW):
		case (N + E + S + W + NW):
		case (N + NE + SE + S + W + NW):
		case (N + E + SW + W + NW):
		case (N + NE + S + W + NW):
		case (TOTAL - NE - E - SW):
			variantColumn = 1;
			variantRow = 5;
			break;
		case (TOTAL - S - SW - NW):
		case (N + NE + E + S):
		case (TOTAL - SE - W):
		case (N + NE + E + S + NW):
		case (TOTAL - SE - W - NW):
		case (TOTAL - SE - S - NW):
		case (N + NE + E + W):
		case (TOTAL - S - NW):
		case (TOTAL - SE - SW - NW):
			variantColumn = 2;
			variantRow = 5;
			break;
		case (TOTAL - NE - SW):
			variantColumn = 3;
			variantRow = 5;
			break;
		case (TOTAL - SE - NW):
			variantColumn = 4;
			variantRow = 5;
			break;
		case (TOTAL - N - SW):
		case (N + E + SE + S):
		case (E + SE + S + W):
		case (E + SE + S + W + NW):
		case (N + E + SE + S + NW):
		case (TOTAL - N - SW - NW):
		case (TOTAL - N - SW - W):
		case (TOTAL - NE - W):
		case (TOTAL - NE - W - NW):
		case (TOTAL - NE - SW - NW):
			variantColumn = 5;
			variantRow = 5;
			break;
		case (E + S + SW + W):
		case (N + S + SW + W):
		case (E + S + SW + W + NW):
		case (N + SE + S + SW + W):
		case (TOTAL - N - SE):
		case (TOTAL - N - SE - NW):
		case (TOTAL - E - SE - NW):
		case (TOTAL - E - NW):
		case (TOTAL - N - E - NW):
		case (TOTAL - NE - SE - NW):
			variantColumn = 6;
			variantRow = 5;
			break;
		case (TOTAL - NW):
		case (N + E):
		case (N + E + NW):
		case (N + E + SW):
		case (N + E + SE + NW):
		case (N + E + SE):
		case (N + E + SE + W):
		case (N + E + SW + NW):
		case (N + E + SE + SW):
		case (TOTAL - NE - S - W):
			variantColumn = 1;
			variantRow = 6;
			break;
		case (E + S):
		case (NE + E + S):
		case (NE + E + S + SW):
		case (E + S + NW):
		case (TOTAL - N - SE - W):
		case (NE + E + S + NW):
		case (E + S + SW + NW):
			variantColumn = 2;
			variantRow = 6;
			break;
		case (S + W):
		case (S + W + NW):
		case (SE + S + W):
		case (NE + S + W):
		case (NE + S + W + NW):
		case (NE + SE + S + W):
		case (TOTAL - N - E - SW):
			variantColumn = 3;
			variantRow = 6;
			break;
		case (N + W):
		case (N + SE + W):
		case (N + SW + W):
		case (N + NE + W):
		case (N + SE + SW + W):
		case (N + NE + SW + W):
		case (N + NE + SE + W):
		case (N + NE + SE + SW + W):
			variantColumn = 4;
			variantRow = 6;
			break;
		case TOTAL:
			// All directions
			// just use the random variant
			variantColumn =  Math.floor(3 * Math.random());
			variantRow = Math.floor(5 * Math.random());
			break;
	}

	return { variantRow, variantColumn, compassTotal, matchesString };
}

const buildBoardDOM = (BOARD) => {
	const board = document.createElement('div');
	BOARD.forEach((row, ri) => {
		const rowDOM = document.createElement('div');
		rowDOM.classList.add('row');

		row.forEach((cell, ci) => {
			const cellDOM = document.createElement('div');

			cellDOM.id = cell.selector(ri, ci);
			cellDOM.setAttribute('data-type', cell.block.type);
			cellDOM.classList.add('block', !cell.solved ? 'unsolved' : 'solved', cell.block.type);
			cellDOM.classList.add(!cell.nearby ? 'notnearby' : 'nearby');

			let variantRow = 99;
			let variantColumn = 99;
			let compassTotal = 0;
			let matchesString = '';
			switch (cell.block.type) {
				case 'grass':
					variantColumn = Math.floor(6 * Math.random());
					variantRow = Math.floor(5 * Math.random());
					break;
				case 'water':
					({ variantRow, variantColumn, compassTotal, matchesString } = getTile(['water', 'stone'], ri, ci));
					break;
				case 'dirt':
					({ variantRow, variantColumn, compassTotal, matchesString } = getTile(['dirt', 'plank', 'door'], ri, ci));
					break;
			}

			try {
				cellDOM.classList.add(`variantRow${variantRow}`, `variantColumn${variantColumn}`, `compassTotal${compassTotal}`, `matchesString${matchesString}`)
			} catch (e) {
				console.error(e);
				console.error ('err', matchesString);
			}


			rowDOM.appendChild(cellDOM);
		});

		board.appendChild(rowDOM);
	});
	return board;
}

const getDrops = (mob) => {
	const luck = Math.random() * 100;

	let loot = [];

	Object.keys(mob.drops).forEach((name) => {
		const drop = mob.drops[name];
		if (luck < drop.probability) {
			const possibilities = drop.quantity.filter(q => luck < q.probability);

			if (possibilities) {
				const quantity = possibilities[Math.floor(Math.random() * possibilities.length)].amount;

				loot.push({ name, quantity });
			}
		}
	});

	return loot;
}

const initMob = (mob, player) => {
	console.log('initMob', mob);
	if (!mob.position) {
		console.log('make random position up for mob: ', mob.kind)
		let randX = Math.floor(Math.random() * 50) - 25;
		let randY = Math.floor(Math.random() * 50) - 25;

		// make sure hostile mobs don't spawn too close
		if (mob.hostile && (Math.abs(randX) < 10 || Math.abs(randY) < 10)) {
			randX = randX < 0 ? randX - 10 : randX + 10;
			randY = randY < 0 ? randY - 10 : randX + 10;
		}

		// place mob near the player
		mob.position = [ player.position[0] + randX, player.position[1] + randY ];
	}

	const mobDOM = document.createElement('div');
	mobDOM.classList.add(mob.classList);

	mob.DOM = document.querySelector('#mobs').appendChild(mobDOM);

	placeEntity(mob, [0,0], mobs, player);

	return mob;
}

const initMobs = (mobs, player) => {
	mobs = mobs.map(mob => initMob(mob, player));

	return mobs;
}

const hydratePlayer = (questions) => {
	let player = JSON.parse( localStorage.getItem('player') ) || DEFAULT_PLAYER;

	player.DOM = document.querySelector(player.DOMSelector || '#steve');
	player.name = player.name || 'Steve';
	player.HP = player.HP || 10;
	player.type = player.type || 'pc';
	player.canWalkOn = player.canWalkOn || DEFAULT_PLAYER.canWalkOn;
	player.canWalkOn = player.canWalkOn.concat(DEFAULT_PLAYER.canWalkOn);
	player.tools = player.tools || {};

	player.questions = player.questions || [];

	// load up previous scores into question bank
	player.questions.forEach(pq => {
		const qi = questions.findIndex(q => {
			return q.question.includes(pq.question[0]);
		});

		if (qi >= 0) {
			questions[qi].asked = pq.asked;
			questions[qi].correct = pq.correct || 0;
		} else {
			console.log('non-existent', pq);
		}

	});

	console.log(questions);

	refreshHUD(player);

	return player;
}

let displayTimeout = null;
const displayResult = (text) => {
	const result = document.querySelector('#result');
	result.classList.remove('animating');
	window.clearTimeout(displayTimeout);

	window.setTimeout(() => {
		result.innerHTML = text;
		result.classList.add('animating');

		displayTimeout = window.setTimeout(() => {
			result.classList.remove('animating');
			result.innerHTML = '';
		}, 2000);
	}, 100);
}

let damageTimeout = null;
const showDamage = (damage) => {
	const DOM = document.querySelector('#damage');
	DOM.classList.remove('animating');
	window.clearTimeout(damageTimeout);

	window.setTimeout(() => {
		DOM.innerHTML = damage;
		DOM.classList.add('animating');

		damageTimeout = window.setTimeout(() => {
			DOM.classList.remove('animating');
			DOM.innerHTML = '';
		}, 2000);
	}, 100);
}

const collide = (collider, collidee, mobs) => {
	let player = collider.type === 'pc' ? collider : collidee;
	let mob = collider.type === 'npc' ? collider : collidee;

	const initiativeModifier = collider.type === 'pc' ? 1 : -1;

	hideOverworld();
	const battleBoard = document.querySelector('#battle');
	battleBoard.classList.add('visible');

	const killWith = Object.keys(player.items).filter(item => mob.vulnerableTo.includes(item.type));
	const killButtons = [`<input class="killButton" type="button" value="fist"></input>`].concat(killWith.map(item => `<input class="killButton" type="button" value="${item}"></input>`));

	const captureWith = Object.keys(player.items).filter(item => mob.captureWith.includes(item));
	const captureButtons = captureWith.map(item => player.items[item] > 0 ? `<input type="button" class="captureButton" data-type="${item}" value="1 ${item} (of ${player.items[item]})"></input>` : '');

	const contents = `
		<div id="controlBar"><div class="close">x</div></div>
		<h1>${player.name} vs ${mob.name}</h1>
		<div id="actions">
			<h2 id="randomHint"></h2>
			<div>
				<h3>Try to capture with:</h3>
				<ul id="captureButtons">${captureButtons.reduce((buttons, button) => buttons + `<li>${button}</li>`, '')}</ul>
			</div>
			<div>
				<h3>Try to fight with:</h3>
				<ul id="killButtons">${killButtons.reduce((buttons, button) => buttons + `<li>${button}</li>`, '')}</ul>
			</div>
		</div>
		<div id="battleScene">
			<div class="mobImage ${mob.classList.reduce((classes, cls) => classes + ` ${cls}`, '')}"></div>
		</div>
	`;

	battleBoard.innerHTML = contents;

	displayRandomHint = () => {
		const hintCandidates = player.questions.filter((q) => q.level >= getLevel(player.points) - 1);
		const hint = hintCandidates[Math.floor(Math.random() * hintCandidates.length)];
		battleBoard.querySelector('#randomHint').innerHTML = `${hint.question}: ${hint.answer}`;
	}
	displayRandomHint();

	const captureButtonsDOM = battleBoard.querySelectorAll('#captureButtons input');
	captureButtonsDOM.forEach(button => button.addEventListener('click', e => {
		const buttons = document.querySelectorAll('#actions input');
		buttons.forEach(elm => elm.setAttribute('disabled', true));

		const itemType = e.target.dataset.type;

		player.items[itemType] = player.items[itemType] - 1;
		player = savePlayer(player);

		const levelDifference = player.level - mob.level;
		let modifier = Math.abs(levelDifference) > 2 ? Math.round(levelDifference / 2) : 0;

		const playerRoll = Math.ceil(Math.random() * 20) + initiativeModifier;
		showDamage(`${playerRoll}`);

		window.setTimeout(() => {
			if (playerRoll > mob.ac + modifier) {
				displayResult('captured!');

				;({ player, mobs } = captureMob(player, mob, mobs));

				window.setTimeout(() => {
					battleBoard.classList.remove('visible');
					showOverworld();
					rewardPlayer(player, mob.points);
				}, 500);
			} else {
				displayResult('miss!');

				window.setTimeout(() => {
					collide(collider, collidee, mobs);
				}, 500);
			}
		}, 500);
	}));

	const killButtonsDOM = battleBoard.querySelectorAll('#killButtons input');
	killButtonsDOM.forEach(button => button.addEventListener('click', e => {
		const buttons = document.querySelectorAll('#actions input');
		buttons.forEach(elm => elm.setAttribute('disabled', true));

		const itemType = e.target.dataset.type;
		const item = player.items[itemType] || { bonus: 2 };
		const itemBonus = item.bonus || 0;

		// give level bonuses/penalties
		const levelDifference = player.level - mob.level;
		const levelModifier = Math.abs(levelDifference) > 2 ? Math.round(levelDifference / 2) : 0;

		const playerRoll = Math.ceil(Math.random() * 20) + initiativeModifier + levelModifier + itemBonus;
		showDamage(`${playerRoll}`);

		window.setTimeout(() => {
			if (playerRoll > mob.ac - 2) {
				displayResult('slayed!');

				;({ player, mobs } = killMob(player, mob, mobs));

				window.setTimeout(() => {
					showOverworld();
					battleBoard.classList.remove('visible');
					rewardPlayer(player, mob.points);
				}, 500);
			} else {
				displayResult('miss!');

				window.setTimeout(() => {
					collide(collider, collidee, mobs);
				}, 500);
			}
		}, 500);
	}));

	battleBoard.querySelector('#controlBar .close').addEventListener('click', () => {
		showOverworld();
		battleBoard.classList.remove('visible');
	}, { once: true });
}

const captureMob = (player, mob, mobs) => {
	player.mobs = player.mobs || {};

	player.mobs[mob.kind] = (player.mobs[mob.kind] || 0) + 1;
	player = savePlayer(player);

	const mobI = mobs.findIndex(m => m.id === mob.id);
	mobs.splice(mobI, 1);

	removeEntity(mob);
	mobs.push(initMob(createMob(mob.kind), player));

	return { player, mobs };
}

const killMob = (player, mob, mobs) => {
	const loot = getDrops(mob);

	console.log('loot')
	console.dir(loot)
	console.dir(player.items);
	loot && loot.forEach(item => player.items[item.name] = (player.items[item.name] || 0) + item.quantity)
	player = savePlayer(player);

	const mobI = mobs.findIndex(m => m.id === mob.id);
	mobs.splice(mobI, 1);

	removeEntity(mob);
	mobs.push(initMob(createMob(mob.kind), player));

	return { player, mobs };
}

const moveMobs = (mobs, player, moveHostileOnly) => {
	mobs.forEach(mob => {
		if (moveHostileOnly && !mob.hostile) return;

		let newPosition = [ 0, 0 ];

		if (mob.hostile) {
			if (mob.position[0] !== player.position[0]) {
				if (mob.position[0] > player.position[0]) {
					newPosition[0]--;
				} else {
					newPosition[0]++;
				}
			}

			if (mob.position[1] !== player.position[1]) {
				if (mob.position[1] > player.position[1]) {
					newPosition[1]--;
				} else {
					newPosition[1]++;
				}
			}
		} else {
			newPosition[Math.floor(Math.random() * 2)] += -1 + Math.floor(Math.random() * 3)
		}

		const targetRow = mob.position[1] + newPosition[1];
		const targetCell = mob.position[0] + newPosition[0];

		// Make sure target block exists
		const targetBlock = document.querySelector(`#overworldrow${targetRow}cell${targetCell}`);

		if (canMoveOntoBlock(targetBlock, mob, newPosition)) {
			placeEntity(mob, newPosition, mobs, player);
		}
	});

	return mobs;
}

const isOverworld = () => {
	return document.querySelector('#overworld').classList.contains('visible');
}

const canNavigate = (entity, blockType) => {
	let navigable = false;

	navigable = entity.canWalkOn.includes(blockType);

	entity.tools = entity.tools || {};
	switch (blockType) {
		case 'cobble':
		case 'stone':
			navigable = entity.tools['pickaxe'] ? true : navigable;
			break;
		case 'water':
			navigable = entity.tools['boat'] ? true : navigable;
			break;
		case 'log':
		case 'plank':
			navigable = entity.tools['axe'] ? true : navigable;
			break;
	}

	return navigable;
}

const canMoveOntoBlock = (attemptBlock, entity, movePositionBy) => {
	let canMove = false;

	if (canNavigate(entity, attemptBlock.getAttribute('data-type'))) {
		canMove = true;
	}

	if (!canMove) {
		entity.DOM.style.left = `${(entity.position[0] * BLOCK_SIZE) + (movePositionBy[0] * 5)}px`;
		entity.DOM.style.top = `${(entity.position[1] * BLOCK_SIZE) + (movePositionBy[1] * 2)}px`;

		window.setTimeout(() => {
			entity.DOM.style.left = `${(entity.position[0] * BLOCK_SIZE)}px`
			entity.DOM.style.top = `${(entity.position[1] * BLOCK_SIZE)}px`
		}, 20);
	}

	return canMove;
}

document.addEventListener('keypress', async (e) => {
	let movePositionBy = [ 0, 0 ];
	let doMovePlayer = false;
	switch(e.charCode) {
		case 65: // A
		case 97: // a
			// console.log('left')
			movePositionBy[0]--;
			doMovePlayer = true;
			break;
		case 87: // W
		case 119: // w
			// console.log('up')
			movePositionBy[1]--;
			doMovePlayer = true;
			break;
		case 68: // D
		case 100: // d
			movePositionBy[0]++;
			doMovePlayer = true;
			// console.log('right')
			break;
		case 83: // S
		case 115: // s
			movePositionBy[1]++;
			doMovePlayer = true;
			// console.log('down')
			break;
		default:
			console.log(e.charCode);
	}

	if ( isOverworld() && doMovePlayer ) {
		const attemptBlock = document.querySelector(`#overworldrow${player.position[1] + movePositionBy[1]}cell${player.position[0] + movePositionBy[0]}`);

		if (!canMoveOntoBlock(attemptBlock, player, movePositionBy)) { return; }

		let moveHostileOnly = true;

		if (attemptBlock.classList.contains('unsolved')){
			const success = await blockTry(attemptBlock, player, BLOCKS);
			if(success){
				player = placeEntity(player, movePositionBy, mobs, player);
				moveHostileOnly = false;
			}
		} else {
			player = placeEntity(player, movePositionBy, mobs, player);
			moveHostileOnly = false;
		}

		mobs = moveMobs(mobs, player, moveHostileOnly);
		mobs = saveMobs(mobs);

		player = savePlayer(player);
	} else if (doMovePlayer) {

	}
});

document.querySelector('#hardmode').addEventListener('change', (e) => {
	config.written = e.target.checked;
})

document.querySelector('#hardmode').checked ? config.written = true : config.written = false;


const setFog = (fogOn) => {
	config.fogofwar = fogOn || false;

	if (config.fogofwar) {
		document.querySelector('#overworld').classList.add('fogofwar');
	} else {
		document.querySelector('#overworld').classList.remove('fogofwar');
	}

	localStorage.setItem('fogofwar', config.fogofwar)
}

if (localStorage.getItem("fogofwar") === null) {
	config.fogofwar = true;
} else {
	config.fogofwar = JSON.parse(localStorage.getItem('fogofwar'));
}

document.querySelector('#fogofwar').checked = config.fogofwar;
setFog(config.fogofwar);

document.querySelector('#fogofwar').addEventListener('change', (e) => setFog(e.target.checked));

const reset = () => {
	console.log('reset!!!');
	overworld.innerHTML = '';
	mobsWrapper.innerHTML = '';
	localStorage.removeItem('board');
	localStorage.removeItem('mobs');
	player.position = [100, 100];
}

const confirmRegenerate = () => {
	const doit = confirm('completely destroy and re-create your board? (THIS CAN NOT BE UNDONE)');

	if (doit) {
		init(true);
	}
}

const init = (doReset = false) => {
	player = hydratePlayer(config.questions);

	if (doReset) reset();
	mobs = hydrateMobs();
	BOARD = hydrateBoard();
	overworldBoard = buildBoardDOM(BOARD);

	overworld.appendChild(overworldBoard);
	showOverworld();

	mobs = initMobs(mobs, player);
	saveMobs(mobs);
	saveBoard(BOARD);

	window.setTimeout(() => {
		placeEntity(player, [0,0], mobs, player);
	}, 500)
}

init();

console.log(`game version ${DEFAULT_PLAYER.gameVersion}, player version ${player.gameVersion}`);
