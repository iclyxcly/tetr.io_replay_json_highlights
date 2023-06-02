const userName = 'icly';
const spikeThresold = 25;
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
                let highlightCount = 0;
                let attackFrame = 0;
                let spikeCount = 0;
                let startAtkTime = 0;
                let startAtkZone = false;
                let spikeZone = false;
                for (let j = 0; j < replayData.data[i].replays[boardDir].events.length; ++j) {
                    const curEvent = replayData.data[i].replays[boardDir].events[j];
                    if (startAtkZone && curEvent.frame - attackFrame >= 55) {
                        attackFrame = 0;
                        spikeCount = 0;
                        spikeZone = false;
                        startAtkTime = 0;
                        startAtkZone = false;
                    } else if (curEvent.type === "ige" && curEvent.data.type === "ige" && curEvent.data.data.type === "interaction") {
                        spikeCount += curEvent.data.data.data.amt;
                        attackFrame = curEvent.frame;
                        if (!spikeZone && spikeCount >= spikeThresold) {
                            highlightCount++;
                            spikeZone = !spikeZone;
                            let minute = Math.floor(startAtkTime / 60 / 60);
                            ++foundCnt
                            outputStr += "Round " + (i + 1) + (i + 1 < 10 ? "  " : i + 1 < 100 ? " " : "") + ": at " + minute + ":" + String(Math.floor(startAtkTime / 60) % 60).padStart(2, '0') + "\n";
                        } else if (!startAtkZone) {
                            startAtkTime = curEvent.frame;
                            startAtkZone = !startAtkZone;
                        }
                    }
                }
            }
            if (outputStr !== "")
                console.log(file + ": \n" + outputStr + "-----------------------------");
        } catch (err) {
            if (showError)
                console.error((err.message.substr(0, 6) === "Cannot" ? "ERROR ON " + file + ": NOT A REPLAY FILE" : err.message) + "\n-----------------------------");
        }
    }
});

console.log("Total occurrence for " + spikeThresold + " spike: " + foundCnt);