//known issue: shuffle array
const userName = ['icly', 'mengxin4150', 'amogus69420', 'magiskalpha', 'ohiofinalboss'];
const exclude_userName = ['zzztoj', 'zzz_test'];
const show_L = false; // show matches of losing
const disable_countdown = true;
const shuffleReplay = true;
const spikeThresold = 99;

const vsThresold = 999;
const doubletotal_vsThresold = 1000; // total vs from both players

const comboThresold = 99;
const pcThresold = 99;
const b2bThresold = 99;
const apmThresold = 999;

const spikeTimeout = 55; // 1 second = 60

const showError = true;

const folderPath = './replays';
const outputPath = './output/output.ttrm';


const fs = require('fs');

console.log("Searching...\n\n");

let foundCnt = 0;
var jsonOutput = { "ismulti": true, "data": [], "endcontext": [] };
var outputReplayHighlights = "\n" + outputPath + "\n";
var outputReplayHighlightsCount = 0;
var outputReplayHighlightsLength = 0;
const files = fs.readdirSync(folderPath);

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function formatTime(seconds) {
    var hours = Math.floor(seconds / 3600);
    var minutes = Math.floor((seconds % 3600) / 60);
    var remainingSeconds = Math.floor(seconds % 60);

    var timeString = hours.toString().padStart(2, '0') + ':' +
        minutes.toString().padStart(2, '0') + ':' +
        remainingSeconds.toString().padStart(2, '0');

    return timeString;
}




function idSwap(replay) { // resolve passthrough bug by matching player id
    for (let i = 0; i < replay.data.length; ++i) {
        const board = replay.data[i].board;
        if (!userName.includes(board[0].user.username)) {
            const oppoboard = board[0];
            replay.data[i].board[0] = board[1];
            replay.data[i].board[1] = oppoboard;
        }
        replay.data[i].board[0].user._id = "0";
        replay.data[i].board[1].user._id = "1";
        const events_board0 = replay.data[i].replays[0].events;
        const events_board1 = replay.data[i].replays[1].events;
        for (let j = 0; j < events_board0.length || j < events_board1.length; ++j) {
            const board0 = j < events_board0.length ? events_board0[j].data.data : 0;
            const board1 = j < events_board1.length ? events_board1[j].data.data : 0;
            if ((j < events_board0.length && events_board0[j].type === "ige") || (j < events_board1.length && events_board1[j].type === "ige")) {
                if (j < events_board0.length && events_board0[j].type === "ige" && (board0.type === "interaction" || board0.type === "interaction_confirm")) {
                    if (userName.includes(board0.sender)) {
                        replay.data[i].replays[0].events[j].data.data.sender_id = "0";
                    } else {
                        replay.data[i].replays[0].events[j].data.data.sender_id = "1";
                    }
                }
                if ((j < events_board1.length && events_board1[j].type === "ige") && (board1.type === "interaction" || board1.type === "interaction_confirm")) {
                    if (userName.includes(board1.sender)) {
                        replay.data[i].replays[1].events[j].data.data.sender_id = "0";
                    } else {
                        replay.data[i].replays[1].events[j].data.data.sender_id = "1";
                    }
                }
            } else if ((j < events_board0.length && events_board0[j].type === "end") || (j < events_board1.length && events_board1[j].type === "end")) {
                if (j < events_board0.length && events_board0[j].type === "end") {
                    events_board0[j].data.export.targets = ["1"];
                }
                if (j < events_board1.length && events_board1[j].type === "end") {
                    events_board1[j].data.export.targets = ["0"];
                }
            }
            else if ((j < events_board0.length && events_board0[j].type === "targets") || (j < events_board1.length && events_board1[j].type === "targets")){
                if (j < events_board0.length && events_board0[j].type === "targets") {
                    replay.data[i].replays[0].events[j].data.data = ["1"];
                }
                if (j < events_board1.length && events_board1[j].type === "targets") {
                    replay.data[i].replays[1].events[j].data.data = ["0"];
                }
            } else {
                if(j < events_board0.length && events_board0[j].type === "full") {
                    events_board0[j].data.options.countdown = !disable_countdown;
                }
                if(j < events_board1.length && events_board1[j].type === "full") {
                    events_board1[j].data.options.countdown = !disable_countdown;
                }
            }
        }
    }
    return replay;
}

files.forEach(file => {
    if (file.substr(-4) === "ttrm") {
        let rpFrames = 0;
        try {
            const data = fs.readFileSync("./replays/" + file, 'utf8');
            const replayData = JSON.parse(data);
            for (let i = 0; i < 2; ++i) {
                if (exclude_userName.includes(replayData.data[0].replays[i].events[0].data.options.username))
                    throw new Error(file + ": Skipped username " + exclude_userName);
            }
            let boardDir = userName.includes(replayData.data[0].replays[0].events[0].data.options.username) ? 1 : userName.includes(replayData.data[0].replays[1].events[0].data.options.username) ? 0 : -1;
            if (boardDir === -1) {
                throw new Error("ERROR ON " + file + ": USERNAME " + userName + " NOT FOUND");
            }
            let outputStr = "";
            for (let i = 0; i < replayData.data.length; ++i) {
                const result = replayData.data[i].replays[boardDir == 0 ? 1 : 0].events;
                const result1 = replayData.data[i].replays[boardDir == 1 ? 1 : 0].events;
                if (!show_L && result[result.length - 1].data.reason !== "winner")
                    continue;
                let attackFrame = 0;
                let spikeCount = 0;
                let startAtkTime = 0;
                let startAtkZone = false;
                let foundBef = foundCnt;
                let highlightCount = 0;
                const total_frames = replayData.data[i].replays[boardDir == 0 ? 1 : 0].frames;
                rpFrames = total_frames;
                if (result[result.length - 1].type === "end") {
                    if (result[result.length - 1].data.export.aggregatestats.vsscore >= vsThresold) {
                        outputReplayHighlights += (highlightCount == 0 ? "Round " + ++outputReplayHighlightsCount + (result[result.length - 1].data.reason === "winner" ? "(W)" : "(L)") + " : " : ", ") + result[result.length - 1].data.export.aggregatestats.vsscore + " vs";
                        outputStr += "Round " + (i + 1) + (i + 1 < 10 ? "  " : i + 1 < 100 ? " " : "") + "(" + Math.floor(total_frames / 3600) + ":" + String(Math.floor(total_frames / 60) % 60).padStart(2, '0') + ")" + (result[result.length - 1].data.reason === "winner" ? " (W)" : " (L)") + ": " + result[result.length - 1].data.export.aggregatestats.vsscore + " vs" + "\n", ++foundCnt;
                        ++highlightCount;
                    } if (result[result.length - 1].data.export.aggregatestats.vsscore + result1[result1.length - 1].data.export.aggregatestats.vsscore >= doubletotal_vsThresold) {
                        outputReplayHighlights += (highlightCount == 0 ? "Round " + ++outputReplayHighlightsCount + (result[result.length - 1].data.reason === "winner" ? "(W)" : "(L)") + " : " : ", ") + (result[result.length - 1].data.export.aggregatestats.vsscore + result1[result1.length - 1].data.export.aggregatestats.vsscore) + " vs";
                        outputStr += "Round " + (i + 1) + (i + 1 < 10 ? "  " : i + 1 < 100 ? " " : "") + "(" + Math.floor(total_frames / 3600) + ":" + String(Math.floor(total_frames / 60) % 60).padStart(2, '0') + ")" + (result[result.length - 1].data.reason === "winner" ? " (W)" : " (L)") + ": " + (result[result.length - 1].data.export.aggregatestats.vsscore + result1[result1.length - 1].data.export.aggregatestats.vsscore) + " vs" + "\n", ++foundCnt;
                        ++highlightCount;
                    } if (result[result.length - 1].data.export.stats.topbtb - 1 >= b2bThresold) {
                        outputReplayHighlights += (highlightCount == 0 ? "Round " + ++outputReplayHighlightsCount + (result[result.length - 1].data.reason === "winner" ? "(W)" : "(L)") + " : " : ", ") + (result[result.length - 1].data.export.stats.topbtb - 1) + " b2b";
                        outputStr += "Round " + (i + 1) + (i + 1 < 10 ? "  " : i + 1 < 100 ? " " : "") + "(" + Math.floor(total_frames / 3600) + ":" + String(Math.floor(total_frames / 60) % 60).padStart(2, '0') + ")" + (result[result.length - 1].data.reason === "winner" ? " (W)" : " (L)") + ": " + (result[result.length - 1].data.export.stats.topbtb - 1) + " B2B" + "\n", ++foundCnt;
                        ++highlightCount;
                    } if (result[result.length - 1].data.export.stats.clears.allclear >= pcThresold) {
                        outputReplayHighlights += (highlightCount == 0 ? "Round " + ++outputReplayHighlightsCount + (result[result.length - 1].data.reason === "winner" ? "(W)" : "(L)") + " : " : ", ") + result[result.length - 1].data.export.stats.clears.allclear + " PCs";
                        outputStr += "Round " + (i + 1) + (i + 1 < 10 ? "  " : i + 1 < 100 ? " " : "") + "(" + Math.floor(total_frames / 3600) + ":" + String(Math.floor(total_frames / 60) % 60).padStart(2, '0') + ")" + (result[result.length - 1].data.reason === "winner" ? " (W)" : " (L)") + ": " + (result[result.length - 1].data.export.stats.clears.allclear) + " PCs" + "\n", ++foundCnt;
                        ++highlightCount;
                    } if (result[result.length - 1].data.export.aggregatestats.apm >= apmThresold) {
                        outputReplayHighlights += (highlightCount == 0 ? "Round " + ++outputReplayHighlightsCount + (result[result.length - 1].data.reason === "winner" ? "(W)" : "(L)") + " : " : ", ") + result[result.length - 1].data.export.aggregatestats.apm + " APM";
                        outputStr += "Round " + (i + 1) + (i + 1 < 10 ? "  " : i + 1 < 100 ? " " : "") + "(" + Math.floor(total_frames / 3600) + ":" + String(Math.floor(total_frames / 60) % 60).padStart(2, '0') + ")" + (result[result.length - 1].data.reason === "winner" ? " (W)" : " (L)") + ": " + result[result.length - 1].data.export.aggregatestats.apm + " APM" + "\n", ++foundCnt;
                        ++highlightCount;
                    } if (result[result.length - 1].data.export.stats.topcombo - 1 >= comboThresold) {
                        outputReplayHighlights += (highlightCount == 0 ? "Round " + ++outputReplayHighlightsCount + (result[result.length - 1].data.reason === "winner" ? "(W)" : "(L)") + " : " : ", ") + (result[result.length - 1].data.export.stats.topcombo - 1) + " combo";
                        outputStr += "Round " + (i + 1) + (i + 1 < 10 ? "  " : i + 1 < 100 ? " " : "") + "(" + Math.floor(total_frames / 3600) + ":" + String(Math.floor(total_frames / 60) % 60).padStart(2, '0') + ")" + (result[result.length - 1].data.reason === "winner" ? " (W)" : " (L)") + ": " + (result[result.length - 1].data.export.stats.topcombo - 1) + " combo" + "\n", ++foundCnt;
                        ++highlightCount;
                    }
                }
                for (let j = 0; j < replayData.data[i].replays[boardDir].events.length; ++j) {
                    const curEvent = replayData.data[i].replays[boardDir].events[j];
                    if (startAtkZone && curEvent.frame - attackFrame >= spikeTimeout || curEvent.type === "end") {
                        if (spikeCount >= spikeThresold) {
                            const result = replayData.data[i].replays[boardDir == 0 ? 1 : 0].events;
                            const total_frames = replayData.data[i].replays[boardDir == 0 ? 1 : 0].frames;
                            let minute = Math.floor(startAtkTime / 3600);
                            outputReplayHighlights += (highlightCount == 0 ? "Round " + ++outputReplayHighlightsCount + (result[result.length - 1].data.reason === "winner" ? "(W)" : "(L)") + " : " : ", ") + spikeCount + " spike\n";
                            outputStr += "Round " + (i + 1) + (i + 1 < 10 ? "  " : i + 1 < 100 ? " " : "") + "(" + Math.floor(total_frames / 3600) + ":" + String(Math.floor(total_frames / 60) % 60).padStart(2, '0') + ")" + (result[result.length - 1].data.reason === "winner" ? " (W)" : " (L)") + ": " + spikeCount + " spike at " + minute + ":" + String(Math.floor(startAtkTime / 60) % 60).padStart(2, '0') + "\n";
                            ++foundCnt;
                        }
                        attackFrame = 0;
                        spikeCount = 0;
                        spikeZone = false;
                        startAtkTime = 0;
                        startAtkZone = false;
                    } else if (curEvent.type === "ige" && curEvent.data.type === "ige" && curEvent.data.data.type === "interaction") {
                        spikeCount += curEvent.data.data.data.amt;
                        attackFrame = curEvent.frame;
                        if (!startAtkZone) {
                            startAtkTime = curEvent.frame;
                            startAtkZone = !startAtkZone;
                        }
                    }
                }
                if (foundBef != foundCnt) {
                    jsonOutput.data.push(replayData.data[i]);
                    outputReplayHighlights += "\n";
                }
            }
            if (outputStr !== "") {
                console.log(file + ": \n" + outputStr + "-----------------------------");
                outputReplayHighlightsLength += rpFrames / 60;
            }
        } catch (err) {
            if (showError)
                console.error((err.message.substr(0, 6) === "Cannot" ? "ERROR ON " + file + ": NOT A REPLAY FILE" : err.message) + "\n-----------------------------");
        }
    }
});

console.log("Total occurrence: " + foundCnt);
jsonOutput = idSwap(jsonOutput);
if (shuffleReplay)
    jsonOutput.data = shuffleArray(jsonOutput.data);
const endcontext = [{ "user": { "_id": "0", "username": 'Me' }, "handling": { "arr": 0, "das": 0.0, "dcd": 0, "sdf": 0, "safelock": true, "cancel": false }, "active": true, "success": true, "inputs": 0, "piecesplaced": 0, "naturalorder": 0, "score": 0, "wins": 0, "points": { "primary": 0, "secondary": 0, "tertiary": 0, "extra": {} } }, { "user": { "_id": "1", "username": "opponent" }, "handling": { "arr": 0.0, "das": 0, "dcd": 0, "sdf": 0, "safelock": true, "cancel": false }, "active": true, "success": false, "inputs": 0, "piecesplaced": 0, "naturalorder": 1, "score": 0, "wins": 0, "points": { "primary": 0, "secondary": 0, "tertiary": 0, "extra": {} } }];
jsonOutput.endcontext = endcontext;
const date = new Date();
jsonOutput.ts = date.toISOString();
fs.writeFile(outputPath, JSON.stringify(jsonOutput), (err) => {
    if (err) throw err;
    outputReplayHighlights = outputReplayHighlights.replace(/\n\n/g, "\n");
    console.log(outputReplayHighlights + "-----------------------------");
    console.log('All replay highlights are merged into ' + outputPath);
    console.log("Replay length: " + formatTime(outputReplayHighlightsLength));
});