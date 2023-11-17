const highlightUser = ["icly", "miya__"];
const ignoreOpponent = ["zzztoj", "zzz_test"];
const opponentMustBe = ["amogu3", "vincehd"];
const show_L = true; // show matches of losing
const shuffle = true; // shuffle replay
const disable_countdown = false; // disable 321 go countdown

const apmThresold = 290;
const spikeThresold = 30; // spike timeout can be affected by player's ping
const spikeTimeout = 55;
const vsThresold = 550;
const vsThresold_dual = 1150; // total vs from both sides
const comboThresold = 15;
const b2bThresold = 50;

const fs = require("fs");

const files = fs.readdirSync("replays");

console.log("Searching for highlights...");

let jsonOutputContext = {
  ismulti: true,
  data: [],
  endcontext: [
    {
      user: { id: "0", username: "me" },
      handling: { arr: 0, das: 0.0, dcd: 0, sdf: 0, safelock: true, cancel: false },
      active: true,
      success: true,
      inputs: 0,
      piecesplaced: 0,
      naturalorder: 0,
      score: 0,
      wins: 0,
      points: { primary: 0, secondary: 0, tertiary: 0, extra: {} },
    },
    {
      user: { id: "1", username: "opponent" },
      handling: { arr: 0.0, das: 0, dcd: 0, sdf: 0, safelock: true, cancel: false },
      active: true,
      success: true,
      inputs: 0,
      piecesplaced: 0,
      naturalorder: 1,
      score: 0,
      wins: 0,
      points: { primary: 0, secondary: 0, tertiary: 0, extra: {} },
    },
  ],
};

dprint = (str) => {
  console.log(`${"-".repeat(str.length)}\n${str}`);
};

exportHighlight = () => {
  console.log("Exporting highlight reasons...");
  let out = "";
  const data = jsonOutputContext.data;
  for (let i = 0; i < data.length; ++i) {
    const ver = fetchVersion(data[i]);
    out += `Round ${i + 1}:\n`;
    out += data[i].highlightReason;
    out += "--------------------------------------------\n";
  }
  return out;
};

shuffleArray = () => {
  console.log("Shuffling replays...");
  let array = jsonOutputContext.data;
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  jsonOutputContext.data = array;
};

swapBoard = () => {
  console.log("Forcing highlighted user to the left board...");
  let data = jsonOutputContext.data;
  for (let i = 0; i < data.length; ++i) {
    const info = fetchVersion(data[i]);
    const ply = data[i].replays[0].events[info.event_index].data.options.username;
    if (!highlightUser.includes(ply)) {
      const temp = data[i].replays[0];
      data[i].replays[0] = data[i].replays[1];
      data[i].replays[1] = temp;
    }
    const board_ply = info.version < 16 ? data[i].board[0].user.username : data[i].board[0].username;
    if (!highlightUser.includes(board_ply)) {
      const temp2 = data[i].board[0];
      data[i].board[0] = data[i].board[1];
      data[i].board[1] = temp2;
    }
  }
  jsonOutputContext.data = data;
};

getGameEndData = (rp) => {
  const events = rp.events;
  let gameEnd = {};
  for (let i = events.length - 1; i != 0; --i) {
    if (events[i].type === "end") {
      gameEnd = events[i];
      break;
    }
  }
  return gameEnd;
};

getGarbage = (rp) => {
  let json = { amt: 0, frame: rp.frame };
  const has_type = rp.data && rp.data.data && rp.data.data && rp.data.data.data && rp.data.data.data.type;
  const is_interaction = has_type && rp.data.data.type !== "interaction";
  const is_garbage = has_type && rp.data.data.data.type === "garbage";
  if (!has_type || !is_interaction || !is_garbage) {
    return json;
  }
  json.amt = rp.data.data.data.amt;
  return json;
};

writeHighlight = (data) => {
  const rp = data.replays;
  const info = fetchVersion({ replays: rp });
  const oppoSlot = highlightUser.includes(rp[0].events[info.event_index].data.options.username) ? 1 : 0;
  let lastAtkFrame = 0;
  let accAttack = 0;
  let highlights = 0;
  let highlightStr = "";

  for (let i = 1; i < rp[oppoSlot].events.length; ++i) {
    let json = getGarbage(rp[oppoSlot].events[i]);
    if (json.amt == 0 && json.frame - lastAtkFrame >= spikeTimeout) {
      if (accAttack >= spikeThresold) {
        highlightStr += `${accAttack} spike at frame ${lastAtkFrame}.\n`;
        ++highlights;
      }
      accAttack = 0;
    } else if (json.amt > 0) {
      accAttack += json.amt;
      lastAtkFrame = json.frame;
    }
  }

  const event = getGameEndData(rp[oppoSlot == 1 ? 0 : 1]);
  const event_o = getGameEndData(rp[oppoSlot]);
  const gameB2B = event.data.export.stats.topbtb;
  const gameCombo = event.data.export.stats.topcombo;
  const gameVS = event.data.export.aggregatestats.vsscore;
  const gameVS_dual = event.data.export.aggregatestats.vsscore + event_o.data.export.aggregatestats.vsscore;
  const gameAPM = event.data.export.aggregatestats.apm;

  if (gameAPM > apmThresold) {
    highlightStr += `APM: ${gameAPM}.\n`;
    ++highlights;
  }
  if (gameVS > vsThresold) {
    highlightStr += `VS: ${gameVS}.\n`;
    ++highlights;
  }
  if (gameVS_dual > vsThresold_dual) {
    highlightStr += `VS (From both sides): ${gameVS_dual}.\n`;
    ++highlights;
  }
  if (gameCombo > comboThresold) {
    highlightStr += `Combo: ${gameCombo}.\n`;
    ++highlights;
  }
  if (gameB2B > b2bThresold) {
    highlightStr += `B2B: ${gameB2B}.\n`;
    ++highlights;
  }

  if (highlights > 0) {
    jsonOutputContext.data.push(data);
    jsonOutputContext.data[jsonOutputContext.data.length - 1].highlightReason = highlightStr;
    console.log(highlightStr.substring(0, highlightStr.length - 2));
  }
  return highlights;
};

fetchVersion = (rp, replayFile = "") => {
  let ret = { event_index: 0, version: 0 };
  for (; ret.event_index < rp.replays[0].events.length; ++ret.event_index) {
    try {
      ret.version = rp.replays[0].events[ret.event_index].data.options.version;
      return ret;
    } catch (e) {
      continue;
    }
  }
  console.log(`Cannot find version in ${replayFile}, using old version instead...`);
  return ret;
};

let total_occurrence = 0;
files.forEach((file) => {
  if (!file.endsWith(".ttrm")) {
    dprint(`Not ttrm file: ${file}`);
    return;
  }
  let rp = JSON.parse(fs.readFileSync("replays/" + file));
  for (let i = 0; i < rp.data.length; ++i) {
    let highlightSlot = -1;
    const info = fetchVersion(rp.data[i], file);
    let skip = false;
    for (let j = 0; j < 2; ++j) {
      const usr = info.version < 16 ? rp.data[i].board[j].user.username : rp.data[i].board[j].username;
      if (ignoreOpponent.includes(usr)) {
        dprint(`${file}, round ${i + 1}: Ignoring opponent: ${usr}`);
        skip = true;
        break;
      } else if (highlightUser.includes(usr)) {
        highlightSlot = j;
        const new_j = j == 0 ? 1 : 0;
        const oppo_usr = info.version < 16 ? rp.data[i].board[new_j].user.username : rp.data[i].board[new_j].username;
        if (opponentMustBe.length != 0 && !opponentMustBe.includes(oppo_usr)) {
          dprint(`${file}, round ${i + 1}: skipped due to opponent ${oppo_usr} does not match with ${opponentMustBe.toString()}`);
          skip = true;
          break;
        }
      }
    }
    if (skip) {
      continue;
    }
    if (highlightSlot == -1) {
      dprint(`${file}, round ${i + 1}: No highlight user found, skipping...`);
      continue;
    }
    let proceedWrite = show_L;
    const events = rp.data[i].replays[0].events;
    let gameEnd = {};
    for (let j = events.length - 1; j != 0; --j) {
      if (events[j].type === "end") {
        gameEnd = events[j];
        break;
      }
    }
    if (Object.keys(gameEnd).length === 0) {
      continue;
    }
    const usr = gameEnd.data.export.options.username;

    if ((gameEnd.data.reason === "winner" && highlightUser.includes(usr)) || (gameEnd.data.reason !== "winner" && !highlightUser.includes(usr))) {
      proceedWrite = true;
    }

    if (proceedWrite && disable_countdown) {
      rp.data[i].replays[0].events[info.event_index].data.options.countdown = false;
      rp.data[i].replays[1].events[info.event_index].data.options.countdown = false;
    }
    dprint(`Searching ${file}, round ${i + 1}...`);
    if (proceedWrite) {
      let occ = writeHighlight(rp.data[i]);
      total_occurrence += occ;
      if (occ === 0) {
        console.log("No highlight found.");
      }
    }
  }
});
dprint(`Total occurrence: ${total_occurrence}`);
swapBoard();
shuffle && shuffleArray();
const highlightStr = exportHighlight();
fs.writeFileSync("./output/highlights.txt", highlightStr);
const jsonOutput = JSON.stringify(jsonOutputContext);
fs.writeFile("./output/output.ttrm", jsonOutput, (err) => {
  if (err) console.log(err);
  else console.log("Exported highlighted replays to output folder.");
});