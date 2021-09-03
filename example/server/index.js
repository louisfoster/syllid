const express = require( `express` )

const PORT = 5558


const toData = (index, segmentID) =>
({
	streamPublicID: `12345`,
	segmentID,
	segmentURL: `http://localhost:${PORT}/audio/${index}/${segmentID}.opus`
})

const getdata = (count, index) => {
	const ids = Array(count).fill(undefined).map((_,i) => `${i + 1}`.padStart(7, `0`))
	
	const mapped = ids.reduce((obj, curr, i) => ({...obj, [curr]: i}), {})

	return {
		ids,
		mapped,
		index,
		urls: ids.map(id => toData(index, id))
	}
}


const data = [16, 7, 10, 10, 36].map(getdata)

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