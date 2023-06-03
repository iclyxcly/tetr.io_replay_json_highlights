const userName = 'icly';
const b2bThresold = 25;
const show_L = false;

const showError = false;






const folderPath = './replays';
const fs = require('fs');

console.log("Searching...\n\n");

let foundCnt = 0;
const files = fs.readdirSync(folderPath);

files.forEach(file => {
    if (file.substr(-4) === "ttrm") {
        try {
            const data = fs.readFileSync("./replays/" + file, 'utf8');
            JSON.parse(data);
            const replayData = JSON.parse(data);
            let boardDir = replayData.data[0].replays[0].events[0].data.options.username === userName ? 1 : replayData.data[0].replays[1].events[0].data.options.username === userName ? 0 : -1;
            if (boardDir === -1) {
                throw new Error("ERROR ON " + file + ": USERNAME " + userName + " NOT FOUND");
            }
            let outputStr = "";
            for (let i = 0; i < replayData.data.length; ++i) {
                const result = replayData.data[i].replays[boardDir == 0 ? 1 : 0].events;
                if (!show_L && result[result.length - 1].data.reason !== "winner")
                    continue;
                const total_frames = replayData.data[i].replays[boardDir == 0 ? 1 : 0].frames;
                if (result[result.length - 1].type === "end" && result[result.length - 1].data.export.stats.topbtb - 1 >= b2bThresold)
                    outputStr += "Round " + (i + 1) + (i + 1 < 10 ? "  " : i + 1 < 100 ? " " : "") + "(" + Math.floor(total_frames / 3600) + ":" + String(Math.floor(total_frames / 60) % 60).padStart(2, '0') + ")" + (result[result.length - 1].data.reason === "winner" ? " (W)" : " (L)") + ": " + (result[result.length - 1].data.export.stats.topbtb - 1) + " B2B" + "\n", ++foundCnt;
            }
            if (outputStr !== "")
                console.log(file + ": \n" + outputStr + "-----------------------------");
        } catch (err) {
            if (showError)
                console.error((err.message.substr(0, 6) === "Cannot" ? "ERROR ON " + file + ": NOT A REPLAY FILE" : err.message) + "\n-----------------------------");
        }
    }
});

console.log("Total occurrence for " + b2bThresold + " B2B++: " + foundCnt);