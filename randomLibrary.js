const gamesSupported = [
  {
    shortname: "powerball",
    longname: "Powerball",
    padding: true,
    description: "Pick 5 unique numbers from 1–69 and the Powerball from 1–26"
  },
  {
    shortname: "megamillions",
    longname: "Mega Millions",
    padding: true,
    description:
      "Pick 5 unique numbers from a set of 1-70 and one Mega Ball number from a set of 1-25."
  },
  {
    shortname: "megabucks",
    longname: "Megabucks",
    padding: true,
    description: "Pick 6 unique numbers out of 49"
  },
  {
    shortname: "luckyforlife",
    longname: "Lucky for Life",
    padding: true,
    description:
      "Pick 5 unique numbers out of 48 and 1 Lucky Ball number out of 18."
  },
  {
    shortname: "numbers",
    longname: "Mass. Numbers Game",
    padding: false,
    description: "Pick 4 numbers from 0 to 9 - duplicates ok."
  }
];

/**
 * Shuffles array in place.
 * @param {Array} a items An array containing the items.
 */
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateUniques(max, count) {
  const arr = shuffle([...Array(max + 1).keys()].slice(1));
  return arr.slice(0, count).sort((x, y) => x - y);
}

function randomNumber(start, max) {
  return Math.floor(max * Math.random()) + start;
}

function generateNumbers(start, max, count) {
  return Array(count)
    .fill()
    .map(e => randomNumber(start, max));
}

function generateQuickPicks(gameIndex, noOfQP) {
  let picks = [];
  for (let i = 0; i < noOfQP; i++) {
    let numbers;
    let pball;
    switch (gameIndex) {
      case 0:
        numbers = generateUniques(69, 5);
        pball = randomNumber(1, 26);
        break;

      case 1:
        numbers = generateUniques(70, 5);
        pball = randomNumber(1, 25);
        break;

      case 2:
        numbers = generateUniques(49, 6);
        pball = null;
        break;

      case 3:
        numbers = generateUniques(48, 5);
        pball = randomNumber(1, 18);
        break;

      case 4:
        numbers = generateNumbers(0, 9, 4);
        pball = null;
        break;

      default:
        numbers = null;
        pball = null;
    }
    pick = null;
    if (numbers !== null) {
      pick = {};
      pick.numbers = numbers;
      if (pball !== null) pick.pball = pball;
    }

    if (pick !== null) picks.push(pick);
  }
  return picks;
}

module.exports = {
  gamesSupported,
  generateQuickPicks
};
