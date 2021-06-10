const fs = require('fs')

const fileData2 = fs.readFileSync("build/playerWorklet.js", "utf8")

fs.writeFileSync(
	"../src/playerWorklet.ts", 
	`const worker = \`${fileData2.trim()}\`\n\nexport default worker`)
