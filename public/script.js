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
	gameVersion: 4.5,
	canWalkOn: ['grass', 'dirt', 'farm', 'tree']
};

const STARTING_LEVEL = 1;
const BOARD_WIDTH = 200;
const BOARD_HEIGHT = 200;


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

const getRandomChoice = (currentChoices, rightAnswer, askAnswerInsteadOfQuestion, config, player) => {
	const sameLevelQuestions = config.questions.filter(question => question.level === rightAnswer.level);
	const sameLevelWrongAnswers = sameLevelQuestions.filter(question => question.question[0] !== rightAnswer.question[0]);

	// loop through sameLevelWrongAnswers and generate all of the possible options you can from them
	// filter out the already chosen possibilities (the things in currentChoices)
	// if there is nothing left, go through levelAppropriateQuestions and populate more possibilities
	// filter out the already chosen possibilities (the things in currentChoices)
	// choose a random options from what is left and return it

	if (askAnswerInsteadOfQuestion) {
		return sameLevelWrongAnswers[Math.floor(Math.random() * sameLevelWrongAnswers.length)].question[0];
	}
	return sameLevelWrongAnswers[Math.floor(Math.random() * sameLevelWrongAnswers.length)].answer[0];

	// const levelAppropriateQuestions = config.questions.filter(question => question.level <= getLevel(player.points) && question.level >= getLevel(player.points) - 5);
}

const launchQuizUI = (config, question, player, resolve) => {
	const quiz = document.querySelector('#quiz')
	quiz.classList.add('visible');
	hideOverworld();

	const askAnswerInsteadOfQuestion = Math.ceil(Math.random() * 2) === 2;
	const questions = askAnswerInsteadOfQuestion ? question.answer : question.question;
	const answers = askAnswerInsteadOfQuestion ? question.question : question.answer;

	const variation = Math.floor(Math.random() * questions.length);

	const choices = [];
	for (let i = 0; i < 9; i++) {
		if (answers[i] && i < 3) {
			choices.push(answers[i]);
		} else {
			choices.push(getRandomChoice(choices, question, askAnswerInsteadOfQuestion, config, player));
		}
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

	quiz.querySelector('.answers').addEventListener('click', gradeAnswer, { once: true })
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
	console.log(`easy question. Question level === ${getLevel(player.points)}`);
	let question = config.questions[Math.floor(Math.random() * config.questions.length)]

	const sameLevelQuestions = config.questions.filter(question => question.level === getLevel(player.points));
	const previousLevelQuestions = config.questions.filter(question => question.level < getLevel(player.points) && !question.correct || question.correct < 3);

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
	console.log(`medium question. Question level <= ${getLevel(player.points)}, but >= ${getLevel(player.points) - 5} `);
	let question = config.questions[Math.floor(Math.random() * config.questions.length)]

	const previousLevelQuestions = config.questions.filter(question => question.level < getLevel(player.points) && !question.correct || question.correct < 11);
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

	const previousLevelQuestions = config.questions.filter(question => question.level < getLevel(player.points) && !question.correct || question.correct < 11);
	const levelAppropriateQuestions = config.questions.filter(question => question.level <= getLevel(player.points) && !question.correct || question.correct < question.asked * .75);

	// first determine if there are any previous level questions that have not been answered correctly at
	// least 11 times. If so, ask one of those. Otherwise ask a level appropriate question that has been answered
	// incorrectly less than 75% of the time
	if (previousLevelQuestions.length > 0) {
		console.log(`hard question. Any question answered fewer than 11 times correctly (there are ${previousLevelQuestions.length || 0} of these)`);
		question = previousLevelQuestions[Math.floor(Math.random() * previousLevelQuestions.length)];
	} else if (levelAppropriateQuestions.length > 0) {
		console.log(`hard question. Any question answered less than 75% of the time correctly (there are ${levelAppropriateQuestions.length || 0} of these)`);
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
	let html = `<ul>
			<li>Level: ${getLevel(player.points)}</li>
			<li>Points: ${player.points}</li>`;

	for (const item in player.items) { html += `<li>${item}: ${player.items[item]}</li>`; }
	for (const tool in player.tools) { html += `<li>${tool}: ${player.tools[tool]}</li>`; }
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
	G: { type: 'grass', groupingMultiplier: 11, test: (config, player) => easyQuestion(config, player), reward: (player) => rewardPlayer(player, 120, 'grass seed') },
	P: { type: 'plank', groupingMultiplier: 1, test: (config, player) => anyQuestion(config, player), reward: (player) => rewardPlayer(player, 120, 'plank') },
	L: { type: 'log', groupingMultiplier: 1, test: (config, player) => anyQuestion(config, player), reward: (player) => rewardPlayer(player, 120, 'log') }
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
				selector: (ri, ci) => `${idPrefix}row${ri}cell${ci}`
			};
		}
	}

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
		console.log('saved');
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

					document.querySelector(`#${BOARD[nearbyRow][nearbyCell].selector(nearbyRow, nearbyCell)}`).classList.add('nearby');
				}
			}
		}
	}

	const target = document.querySelector(`#${BOARD[row][cell].selector(row, cell)}`);

	if (!BOARD[row][cell].solved) {
		BOARD[row][cell].solved = true;


		if (BOARD[row][cell].block.type === 'tree') {
			BOARD[row][cell].block.type = 'grass';
			target.classList.remove('tree');
			target.classList.add('grass');
		}

		target.classList.remove('unsolved');
		target.classList.add('solved');

		// force the save since a new block was revealed
		const threadedSave = () => {
			saveBoard(BOARD, true);
		}
		setTimeout(threadedSave, 0);
	} else {
		// just queue the save
		saveBoard(BOARD);
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
		movePositionBy[0] = 0;
		movePositionBy[1] = 0;
		collision = true;
	}

	if (collision) { collide(entity, player, mobs); }

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
			entity.DOM.style.top = `${(entity.position[1] * 30)}px`;
			entity.DOM.style.left = `${entity.position[0] * 30}px`;
		} else {
			entity.DOM.style.display = 'none';

			// De-Spawn entity if they are too far from the player
			if (Math.abs(player.position[0] - entity.position[0]) > 40 || Math.abs(player.position[1] - entity.position[1]) > 40) {
				console.log('de-spawning');
				entity.DOM.remove();
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
		hostile: false,
		canWalkOn: ['grass', 'dirt', 'farm'],
		tools: {}
	}
}

const createMob = (type) => {
	const mob = JSON.parse(JSON.stringify(mobKinds[type]));

	mob.level = mob.baseLevel + Math.floor(Math.random() * 4);
	mob.id = uuidv4();

	return mob;
}

for (let i = 0; i < 10; i++) {
	mobs.push(createMob('sheep'));
}

const initMob = (mob, player) => {
	let randX = Math.floor(Math.random() * 50) - 25;
	let randY = Math.floor(Math.random() * 50) - 25;

	// make sure hostile mobs don't spawn too close
	if (mob.hostile && (Math.abs(randX) < 10 || Math.abs(randY) < 10)) {
		randX = randX < 0 ? randX - 10 : randX + 10;
		randY = randY < 0 ? randY - 10 : randX + 10;
	}

	// place mob near the player
	mob.position = [ player.position[0] + randX, player.position[1] + randY ];

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
	player.canWalkOn = player.canWalkOn || ['grass', 'dirt', 'farm', 'tree'];
	player.tools = player.tools || {};

	player.questions = player.questions || [];

	// load up previous scores into question bank
	player.questions.forEach(pq => {
		const qi = questions.findIndex(q => {
			return q.question.includes(pq.question[0]);
		});

		questions[qi].asked = pq.asked;
		questions[qi].correct = pq.correct || 0;
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
		entity.DOM.style.left = `${(entity.position[0] * 30) + (movePositionBy[0] * 5)}px`;
		entity.DOM.style.top = `${(entity.position[1] * 30) + (movePositionBy[1] * 2)}px`;

		window.setTimeout(() => {
			entity.DOM.style.left = `${(entity.position[0] * 30)}px`
			entity.DOM.style.top = `${(entity.position[1] * 30)}px`
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

let player = hydratePlayer(config.questions);
mobs = initMobs(mobs, player);

window.setTimeout(() => {
	placeEntity(player, [0,0], mobs, player);
}, 500)

console.log(`game version ${DEFAULT_PLAYER.gameVersion}, player version ${player.gameVersion}`);
