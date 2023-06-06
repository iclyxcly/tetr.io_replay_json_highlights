const folderPath = './replays/';
const outputPath = './output/';

const fs = require('fs');
const showError = true;
console.log("Fixing 0-0 score bug...\n\n");
const files = fs.readdirSync(folderPath);
files.forEach(file => {
    if (file.substr(-4) === "ttrm") {
        try {
            const data = fs.readFileSync("./replays/" + file, 'utf8');
            JSON.parse(data);
            let replayData = JSON.parse(data);
            const replayCount = replayData.data.length;
            for (let i = 0; i < replayCount; ++i) {
                const board = replayData.data[i].board;
                for(let j = 0; j < 2; ++j) {
                    replayData.data[i].board[j].active = board[j].success;
                }
            }
            fs.writeFile(outputPath + file, JSON.stringify(replayData), (err) => {
                if(err) throw err;
            });
        } catch (err) {
            if (showError)
                console.log(err);
        }
    }
});

console.log("done!");