
// const additionQuestion = (number) => {
// 	let sub = Math.floor(Math.random() * number);
// 	if (sub === 0) sub = 1;

// 	const theirAnswer = prompt(`${sub} + ${number - sub} =`);

// 	return theirAnswer * 1 === number * 1;
// }

// const BLOCKS = {
// 	D: { type: 'dirt', test: () => additionQuestion(5) },
// 	T: { type: 'tree', test: () => additionQuestion(6) },
// 	W: { type: 'water', test: () => additionQuestion(7) },
// 	S: { type: 'stone', test: () => additionQuestion(8) },
// 	F: { type: 'farm', test: () => additionQuestion(9) },
// 	G: { type: 'grass', test: () => additionQuestion(10) }
// }

// const multiplicationQuestion = (number) => {
// 	let factor = Math.ceil(Math.random() * 12);

// 	const theirAnswer = prompt(`${number} * ${factor} =`);

// 	return theirAnswer * 1 === number * factor;
// }

// const BLOCKS = {
// 	D: { type: 'dirt', test: () => multiplicationQuestion(5) },
// 	T: { type: 'tree', test: () => multiplicationQuestion(6) },
// 	W: { type: 'water', test: () => multiplicationQuestion(7) },
// 	S: { type: 'stone', test: () => multiplicationQuestion(8) },
// 	F: { type: 'farm', test: () => multiplicationQuestion(9) },
// 	G: { type: 'grass', test: () => multiplicationQuestion(10) }
// }

const uuidv4 = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}


const DEFAULT_PLAYER = {
	type: 'pc',
	name: 'Steve',
	DOMSelector: '#steve',
	revealsBlocks: true,
	HP: 10,
	points: 0,
	items: {},
	position: [100, 100],
	gameVersion: 4.2
};

const STARTING_LEVEL = 1;
const BOARD_WIDTH = 200;
const BOARD_HEIGHT = 200;


const saveScore = (question, correct) => {
	question.asked = (question.asked || 0) + 1;

	if (correct) { question.correct = (question.correct || 0) + 1; }
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

const askQuestion = (config, question) => {
	const askAnswerInsteadOfQuestion = Math.ceil(Math.random() * 2) === 2;

	const questions = askAnswerInsteadOfQuestion ? question.answer : question.question;
	const answers = askAnswerInsteadOfQuestion ? question.question : question.answer;

	const variation = Math.floor(Math.random() * questions.length);
	let correct = false;

	if (config.written) {
		const theirAnswer = prompt(`what is "${questions[variation]}"`);

		correct = answers.includes(theirAnswer.toLowerCase());

		alert(`${correct ? 'Correct!' : 'Incorrect.'} "${questions[variation]}" is "${answers.join(', or ')}".`);
	} else {
		alert(`what is "${questions[variation]}"?`)

		correct = confirm(`"${questions[variation]}" is "${answers.join(', or ')}".`);
	}

	saveScore(question, correct);

	return correct;
}


const easyQuestion = (config, player) => {
	console.log(`easy question. Question level === ${getLevel(player.points)}`);
	let question = config.questions[Math.floor(Math.random() * config.questions.length)]

	const easyQuestion = config.questions.filter(question => question.level === getLevel(player.points));

	if (easyQuestion.length > 0) {
		question = easyQuestion[Math.floor(Math.random() * easyQuestion.length)];
	} else {
		return anyQuestion(config, player);
	}

	return askQuestion(config, question);
}

const mediumQuestion = (config, player) => {
	console.log(`medium question. Question level <= ${getLevel(player.points)}, but >= ${getLevel(player.points) - 5} `);
	let question = config.questions[Math.floor(Math.random() * config.questions.length)]

	const mediumQuestions = config.questions.filter(question => question.level <= getLevel(player.points) && question.level >= getLevel(player.points) - 5);

	if (mediumQuestions.length > 0) {
		question = mediumQuestions[Math.floor(Math.random() * mediumQuestions.length)];
	} else {
		return easyQuestion(config, player);
	}

	return askQuestion(config, question);
}

const hardQuestion = (config, player) => {
	let question = config.questions[Math.floor(Math.random() * config.questions.length)]

	const hardQuestions = config.questions.filter(question => question.correct < question.asked);

	console.log(`hard question. Any question asked more times than answered correctly (there are ${hardQuestions.length || 0} of these)`);

	if (hardQuestions.length > 0) {
		question = hardQuestions[Math.floor(Math.random() * hardQuestions.length)];
	} else {
		return anyQuestion(config, player);
	}

	return askQuestion(config, question);
}

const anyQuestion = (config, player) => {
	console.log(`any question up to level ${getLevel(player.points)}`);
	const questions = config.questions.filter(question => question.level <= getLevel(player.points));

	const question = questions[Math.floor(Math.random() * questions.length)];

	return askQuestion(config, question);
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
	let html = `<ul>
			<li>Level: ${getLevel(player.points)}</li>
			<li>Points: ${player.points}</li>`;

	for (const item in player.items) { html += `<li>${item}: ${player.items[item]}</li>`; }
	for (const mob in player.mobs) { html += `<li>${mob}: ${player.mobs[mob]}</li>`; }

	html += `</ul>`;

	document.querySelector('#scoreBoard').innerHTML = html;
}


const BLOCKS = {
	D: { type: 'dirt', groupingMultiplier: 2, test: (config, player) => hardQuestion(config, player), reward: (player) => rewardPlayer(player, 100, 'dirt') },
	T: { type: 'tree', groupingMultiplier: 8, test: (config, player) => hardQuestion(config, player), reward: (player) => rewardPlayer(player, 110, 'wood') },
	S: { type: 'stone', groupingMultiplier: 3, test: (config, player) => anyQuestion(config, player), reward: (player) => rewardPlayer(player, 110, 'stone') },
	W: { type: 'water', groupingMultiplier: 10, test: (config, player) => mediumQuestion(config, player), reward: (player) => rewardPlayer(player, 105, 'water') },
	F: { type: 'farm', groupingMultiplier: 5, test: (config, player) => hardQuestion(config, player), reward: (player) => rewardPlayer(player, 110, 'carrots') },
	G: { type: 'grass', groupingMultiplier: 11, test: (config, player) => easyQuestion(config, player), reward: (player) => rewardPlayer(player, 120, 'grass seed') }
}



DEFAULT = BLOCKS.G;

const POSSIBILITIES = Object.values(BLOCKS);

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
				selector: `${idPrefix}row${ri}cell${ci}`
			};
		}
	}

	// console.log(BOARD);

	return BOARD;
}

const hydrateBoard = () => {
	const savedBoard = JSON.parse( localStorage.getItem('board') );

	if (savedBoard) {
		if (!savedBoard[0][0].block) {
			savedBoard.forEach((row, ri) => {
				row.forEach((cell, ci) => {
					const oldCell = JSON.parse(JSON.stringify(cell));

					savedBoard[ri][ci] = {
						block: oldCell,
						selector: `overworldrow${ri}cell${ci}`
					};
				})
			});

			saveBoard(savedBoard);
		}
	}

	return savedBoard || generateBoard([], BOARD_WIDTH, BOARD_HEIGHT, 'overworld');
}

const saveBoard = (BOARD) => {
	localStorage.setItem( 'board', JSON.stringify(BOARD) );
}

const blockTry = (blockTarget, entity, BLOCKS) => {
	const targetType = blockTarget.getAttribute('data-type');
	const block = BLOCKS[Object.keys(BLOCKS).find((candidate) => BLOCKS[candidate].type === targetType)]

	const success = block.test(config, entity);

	if (success) block.reward(entity);

	return success;
}

const blockReveal = (BOARD, row, col) => {
	const target = document.querySelector(`#${BOARD[row][col].selector}`);

	BOARD[row][col].solved = true;

	target.classList.remove('unsolved');
	target.classList.add('solved');

	saveBoard(BOARD);
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
		movePositionBy[0] = 0;
		movePositionBy[1] = 0;
		collision = true;
	}

	if (collision) { collide(entity, player, mobs); }

	entity.position[1] = entity.position[1] + movePositionBy[1];
	entity.position[0] = entity.position[0] + movePositionBy[0];

	entity.DOM.style.top = `${(entity.position[1] * 30)}px`;
	entity.DOM.style.left = `${entity.position[0] * 30}px`;

	if (entity.revealsBlocks) {
		blockReveal(BOARD, entity.position[1], entity.position[0])
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

const buildBoardDOM = (BOARD) => {
	const board = document.createElement('div');
	BOARD.forEach((row, ri) => {
		const rowDOM = document.createElement('div');
		rowDOM.classList.add('row');

		row.forEach((cell, ci) => {
			const cellDOM = document.createElement('div');

			cellDOM.id = cell.selector;
			cellDOM.setAttribute('data-type', cell.block.type);
			cellDOM.classList.add('block', !cell.solved ? 'unsolved' : 'solved', cell.block.type);

			rowDOM.appendChild(cellDOM);
		});

		board.appendChild(rowDOM);
	});
	return board;
}

let BOARD = hydrateBoard();
const overworldBoard = buildBoardDOM(BOARD);
const overworld = document.querySelector('#overworld');
overworld.appendChild(overworldBoard);
showOverworld();

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

let mobs = [];
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
		hostile: false
	}
}

const createMob = (type) => {
	const mob = JSON.parse(JSON.stringify(mobKinds[type]));

	mob.level = mob.baseLevel + Math.floor(Math.random() * 4);
	mob.id = uuidv4();

	return mob;
}

for (let i = 0; i < 100; i++) {
	mobs.push(createMob('sheep'));
}

const initMob = (mob, player) => {
	const randX = Math.floor(Math.random() * BOARD_WIDTH);
	const randY = Math.floor(Math.random() * BOARD_HEIGHT);

	mob.position = [ randX, randY ];

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

const hydratePlayer = () => {
	let player = JSON.parse( localStorage.getItem('player') ) || DEFAULT_PLAYER;

	player.DOM = document.querySelector(player.DOMSelector || '#steve');
	player.name = player.name || 'Steve';
	player.HP = player.HP || 10;
	player.type = player.type || 'pc';

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

	const initiativeModifier = collider.type === 'pc' ? 2 : -2;

	hideOverworld();
	const battleBoard = document.querySelector('#battle');
	battleBoard.classList.add('visible');

	const killWith = Object.keys(player.items).filter(item => mob.vulnerableTo.includes(item.type));
	const killButtons = [`<input class="killButton" type="button" value="fist"></input>`].concat(killWith.map(item => `<input class="killButton" type="button" value="${item}"></input>`));

	const captureWith = Object.keys(player.items).filter(item => mob.captureWith.includes(item));
	const captureButtons = captureWith.map(item => player.items[item] > 0 ? `<input type="button" class="captureButton" data-type="${item}" value="1 ${item} (of ${player.items[item]})"></input>` : '');

	const contents = `
		<h1>${player.name} vs ${mob.name}</h1>
		<div id="actions">
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

	const captureButtonsDOM = battleBoard.querySelectorAll('#captureButtons input');
	captureButtonsDOM.forEach(button => button.addEventListener('click', e => {
		const buttons = document.querySelectorAll('#actions input');
		buttons.forEach(elm => elm.setAttribute('disabled', true));

		const itemType = e.target.dataset.type;

		player.items[itemType] = player.items[itemType] - 1;
		savePlayer(player);

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

		const item = player.items[itemType];

		const levelDifference = player.level - mob.level;
		let modifier = Math.abs(levelDifference) > 2 ? Math.round(levelDifference / 2) : 0;

		const playerRoll = Math.ceil(Math.random() * 20) + initiativeModifier;
		showDamage(`${playerRoll}`);

		window.setTimeout(() => {
			if (playerRoll > mob.ac + modifier) {
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
}

const captureMob = (player, mob, mobs) => {
	player.mobs = player.mobs || {};

	player.mobs[mob.kind] = (player.mobs[mob.kind] || 0) + 1;
	savePlayer(player);

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
	savePlayer(player);

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

		placeEntity(mob, newPosition, mobs, player);
	});

	return mobs;
}

const isOverworld = () => {
	return document.querySelector('#overworld').classList.contains('visible');
}

document.addEventListener('keypress', (e) => {
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

		let moveHostileOnly = true;

		if (attemptBlock.classList.contains('unsolved')){
			const success = blockTry(attemptBlock, player, BLOCKS);
			if(success){
				player = placeEntity(player, movePositionBy, mobs, player);
				moveHostileOnly = false;
			}
		} else {
			player = placeEntity(player, movePositionBy, mobs, player);
			moveHostileOnly = false;
		}

		mobs = moveMobs(mobs, player, moveHostileOnly);

		savePlayer(player);
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

let player = hydratePlayer();
mobs = initMobs(mobs, player);

window.setTimeout(() => {
	placeEntity(player, [0,0], mobs, player);
}, 500)

console.log(`game version ${DEFAULT_PLAYER.gameVersion}, player version ${player.gameVersion}`);
