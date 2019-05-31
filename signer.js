const path = require('path')
const fs = require('fs')
const { promisify } = require('util')
const { spawn } = require('child_process')
const { Readable } = require('stream')
const ipfsClient = require('ipfs-http-client')
const rimraf = require('rimraf')
const config = require('./config')

const mkdir = promisify(fs.mkdir)
const writeFile = promisify(fs.writeFile)
const readdir = promisify(fs.readdir)
const stat = promisify(fs.stat)

const { IPFS_API_USER: user, IPFS_API_PASSWORD: password } = process.env
const userPassword = Buffer.from(`${user}:${password}`).toString('base64')
const authorization = 'Basic ' + userPassword

const ipfs = ipfsClient(process.env.IPFS_API, { headers: { authorization } })

let cborUrl
let ready = false

async function run () {
  try {
    const id = await ipfs.id()
    console.log('IPFS Id:', id)
    console.log('Downloading certs...')
    const dir = 'certs'
    rimraf.sync(dir)
    await mkdir(dir)
    const certsCid = process.env.CERTS_CID
    if (!certsCid) {
      console.error('Need CERTS_CID!')
      process.exit(1)
    }
    const encpipeSecret = process.env.ENCPIPE_SECRET
    if (!encpipeSecret) {
      console.error('Need ENCPIPE_SECRET!')
      process.exit(1)
    }
    const files = await ipfs.get(certsCid)
    for (const file of files) {
      if (file.path.endsWith('/cbor-url')) {
        cborUrl = file.content.toString('utf8').replace(/\n/, '')
        console.log('CBOR url:', cborUrl)
      } else if (file.path.endsWith('.enc')) {
        const base = path.basename(file.path, '.enc')
        console.log('Certificate:', base)
        await decryptAndSave()

        function decryptAndSave () {
          return new Promise((resolve, reject) => {
            const src = new Readable()
            src.push(file.content)
            src.push(null)
            const decryptAndSave = spawn(
              'encpipe',
              [
                '-d',
                '-p', encpipeSecret,
                '-i', '-',
                '-o', path.join(dir, base)
              ],
              {
                stdio: ['pipe', process.stdout, process.stderr]
              }
            )
            decryptAndSave.on('error', error => {
              console.error('Spawn error', error)
              reject()
            })
            src.pipe(decryptAndSave.stdin)
            src.on('end', resolve)
          })
        }
      }
    }
    console.log('Certs loaded.')
    ready = true
  } catch (e) {
    console.error('IPFS Error', e)
  }
}
run()

async function download (job) {
  const { ipfsCid, jobId } = job
  job.state = 'DOWNLOADING_FROM_IPFS'
  const jobsDir = path.resolve(__dirname, 'jobs', jobId)
  const downloadDir = path.join(jobsDir, 'download')
  await mkdir(downloadDir, { recursive: true })

  const files = await ipfs.get(ipfsCid)
  const filesToDownload = []
  for (const file of files) {
    if (file.path.endsWith('index.html')) {
      filesToDownload.push(file)
    }
  }
  job.download = {
    numFiles: filesToDownload.length,
    downloaded: 0
  }
  for (const file of filesToDownload) {
    const filePath = file.path.replace(/^[^/]+\//, '')
    const dest = path.join(downloadDir, filePath)
    await mkdir(path.dirname(dest), { recursive: true })
    await writeFile(dest, file.content)
    job.download.downloaded++
  }

  /*
   // FIXME: Exits early for some reason
  const files = ipfs.getReadableStream(ipfsCid)
  for await (const file of files) {
    console.log('Jim file', file.path)
  }
  */

  job.state = 'DONE_DOWNLOADING'
}

async function sign (job) {
  const { jobId, siteName } = job
  job.state = 'GENERATING_SXGS'
  const jobsDir = path.resolve(__dirname, 'jobs', jobId)
  const downloadDir = path.join(jobsDir, 'download')
  const signedDir = path.join(jobsDir, 'signed')
  await mkdir(signedDir, { recursive: true })
  await walk('.')
  job.state = 'GENERATED_SXGS'

  async function walk (dir) {
    const files = await readdir(path.join(downloadDir, dir))
    // console.log('Dir', dir, files)
    for (const file of files) {
      const resolved = path.resolve(downloadDir, dir, file)
      const stats = await stat(resolved)
      if (stats.isDirectory()) {
        await walk(path.join(dir, file))
      } else {
        const filePath = path.join(dir, file)
        // console.log('Signing', filePath)
        const signedFileDir = path.dirname(path.join(signedDir, filePath))
        await mkdir(signedFileDir, { recursive: true })
        await generateSxg()

        function generateSxg () {
          return new Promise((resolve, reject) => {
            const { dnsRoot } = config
            const origin = `https://${siteName}.${dnsRoot}`
            const genSignedExchange = spawn(
              'gen-signedexchange',
              [
                '-uri', `${origin}/${filePath}`,
                '-content', path.join(downloadDir, filePath),
                '-certificate', 'certs/cert.pem',
                '-privateKey', 'certs/priv.key',
                '-certUrl', cborUrl,
                '-validityUrl', `${origin}/resource.validity.msg`,
                '-responseHeader', 'Content-Type: text/html; charset=utf-8',
                '-expire', '168h0m0s',
                '-o', path.join(signedDir, `${filePath}.sxg`)
              ],
              {
                stdio: ['pipe', process.stdout, process.stderr]
              }
            )
            genSignedExchange.on('error', error => {
              console.error('Spawn error', error)
              reject(new Error('gen-signedexchange failed'))
            })
            genSignedExchange.on('close', (code) => {
              if (code) {
                console.error(`gen-signedexchange exited with code ${code}`)
                return reject(new Error('gen-signedexchange failed'))
              }
              resolve()
            })
          })
        }
      }
    }
  }
}

async function generateSignedExchanges (job) {
  if (!ready) throw new Error('Not ready')
  const { jobId } = job
  const startTime = Date.now()
  console.log('Job start', jobId, job)
  await download(job)
  const elapsed1 = `${Math.floor((Date.now() - startTime) / 1000)}s`
  console.log('Job downloaded', jobId, elapsed1)
  await sign(job)
  const elapsed2 = `${Math.floor((Date.now() - startTime) / 1000)}s`
  console.log('Job end', jobId, elapsed2)
}

module.exports = {
  ready: () => ready,
  generateSignedExchanges
}

