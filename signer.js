const path = require('path')
const fs = require('fs')
const { promisify } = require('util')
const { spawn } = require('child_process')
const { Readable } = require('stream')
const ipfsClient = require('ipfs-http-client')
const rimraf = require('rimraf')

const mkdir = promisify(fs.mkdir)
const writeFile = promisify(fs.writeFile)

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

async function generateSignedExchanges (job) {
  if (!ready) throw new Error('Not ready')
  const { ipfsCid, jobId } = job
  job.state = 'DOWNLOADING_FROM_IPFS'
  const jobsDir = path.resolve(__dirname, 'jobs', jobId)
  const downloadDir = path.join(jobsDir, 'download')
  await mkdir(downloadDir, { recursive: true })
  const signedDir = path.join(jobsDir, 'signed')
  await mkdir(signedDir, { recursive: true })

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

module.exports = {
  ready: () => ready,
  generateSignedExchanges
}

