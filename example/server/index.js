const express = require( `express` )

const PORT = 5558

// counting
const ids = [
	`0000001`,
	`0000002`,
	`0000003`,
	`0000004`,
	`0000005`,
	`0000006`,
	`0000007`,
	`0000008`,
	`0000009`,
	`0000010`,
	`0000011`,
	`0000012`,
	`0000013`,
	`0000014`,
	`0000015`,
	`0000016`,
]

const mapped = ids.reduce((obj, curr, i) => ({...obj, [curr]: i}), {})

// humming
const ids2 = [
	`0000001`,
	`0000002`,
	`0000003`,
	`0000004`,
	`0000005`,
	`0000006`,
	`0000007`,
]

const mapped2 = ids2.reduce((obj, curr, i) => ({...obj, [curr]: i}), {})

const toData = (index, segmentID) =>
({
	streamPublicID: `12345`,
	segmentID,
	segmentURL: `http://localhost:${PORT}/audio/${index}/${segmentID}.opus`
})

const data = [
	{
		ids,
		mapped,
		index: 0,
		urls: ids.map(id => toData(0, id))
	},
	{
		ids: ids2,
		mapped: mapped2,
		index: 1,
		urls: ids2.map(id => toData(1, id))
	}
]

// Use this to store numbers that are being tested for normal
// playback, note these numbers can't be tested with
// other forms
const normalID = {}

const fromID = (i, id) =>
{
	const index = data[i].mapped[id]

	const isEnd = (index === data[i].ids.length - 1)

	if (isEnd && normalID[i]) return []

	return (index === data[i].ids.length - 1) 
		? data[i].urls.slice(0, 5)
		: data[i].urls.slice(index + 1, index + 6)
}

const lengthReq = (req, res) =>
{
	const num = parseInt(req.params.num)

	normalID[num] = true

	res.json({length: data[num].urls.length})
}

let latestReqCount = 0

const app = express()

app.use(express.static('example'))

app.use('/build', express.static('build'))

app.use('/audio', express.static('example/audio'))

app.get('/decoderWorker.min.wasm', (req, res) => res.redirect(`/build/decoderWorker.min.wasm`))

app.get('/playlist/:num/length', lengthReq)

app.get('/playlist/:num/:id', (req, res) =>
{
	res.json(fromID(parseInt(req.params.num), req.params.id))
})

app.get('/playlist/:num', (req, res) =>
{
	const num = parseInt(req.params.num)

	if (req.query.start === `random`)
		res.json(fromID(num, data[num].ids[Math.floor(Math.random() * data[num].ids.length)]))
	else if (req.query.start === `latest`)
	{
		if (latestReqCount < 5)
		{
			latestReqCount += 1
			res.json([])
			return
		}
		res.json(data[num].urls.slice(data[num].urls.length - 5))
	}
		
	else if (req.query.start === `position`)
	{
		const pos = parseInt(req.query.position)

		res.json(data[num].urls.slice(pos, pos + 10))
	}
	else if (req.query.request === `length`)
	{
		lengthReq(req, res)
	}
	else res.json(data[num].urls)
})

// test for group redirects
app.get('/playlisto', (req, res) =>
{
	let path = `/playlist/${Math.floor(Math.random() * data.length)}`
	if (req.query.start === `random`) path += `?start=random`
	else if (req.query.start === `latest`) path += `?start=latest`
	else if (req.query.start === `position`)
	{
		path += `?start=position&position=${req.query.position ?? 0}`
	}
	else if (req.query.request === `length`)
	{
		path += `?request=length`
	}
	res.redirect(path)
})

console.log("Listening on PORT", PORT)

app.listen( PORT )