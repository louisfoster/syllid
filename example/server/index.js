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

const data = [
	{
		ids,
		mapped,
		path: 'example/audio'
	},
	{
		ids: ids2,
		mapped: mapped2,
		path: 'example/audio2'
	}
]

const selected = 0

const streamPublicID = `12345`

const urls = data[selected].ids.map(segmentID =>
	({
		streamPublicID,
		segmentID,
		segmentURL: `http://localhost:${PORT}/audio/${segmentID}.opus`
	}))

const fromID = id =>
{
	const index = data[selected].mapped[id]

	return (index === data[selected].ids.length - 1) 
		? urls.slice(0, 5)
		: urls.slice(index + 1, index + 6)
}

const app = express()

app.use(express.static('example'))

app.use('/build', express.static('build'))

app.use('/audio', express.static(data[selected].path))

app.get('/decoderWorker.min.wasm', (req, res) => res.redirect(`/build/decoderWorker.min.wasm`))

app.get('/playlist/:id', (req, res) =>
{
	res.json(fromID(req.params.id))
})

app.get('/playlist', (req, res) =>
{
	if (req.query.start === `random`)
		res.json(fromID(data[selected].ids[Math.floor(Math.random() * data[selected].ids.length)]))
	if (req.query.start === `latest`)
		res.json(urls.slice(urls.length - 5))
	else res.json(urls)
})

// test for group redirects
app.get('/playlisto', (req, res) =>
{
	let path = `/playlist`
	if (req.query.start === `random`) path += `?start=random`
	res.redirect(path)
})

console.log("Listening on PORT", PORT)

app.listen( PORT )