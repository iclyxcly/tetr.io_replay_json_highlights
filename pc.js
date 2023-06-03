const userName = 'icly';
const showError = false;
const pcThresold = 3;





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
                if (result[result.length - 1].type === "end" && result[result.length - 1].data.export.stats.clears.allclear >= pcThresold)
                    outputStr += "Round " + (i + 1) + (i + 1 < 10 ? "  " : i + 1 < 100 ? " " : "") + (result[result.length - 1].data.reason === "winner" ? " (W)" : " (L)") + ": " + (result[result.length - 1].data.export.stats.clears.allclear) + " PCs" + "\n", ++ foundCnt;
            }
            if (outputStr !== "")
                console.log(file + ": \n" + outputStr + "-----------------------------");
        } catch (err) {
            if (showError)
                console.error((err.message.substr(0, 6) === "Cannot" ? "ERROR ON " + file + ": NOT A REPLAY FILE" : err.message) + "\n-----------------------------");
        }
    }
});

console.log("Total occurrence for " + pcThresold + " PCs++: " + foundCnt);