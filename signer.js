const path = require('path')
const { mkdirSync } = require('fs')
const { spawn } = require('child_process')
const { Readable } = require('stream')
const ipfsClient = require('ipfs-http-client')
const rimraf = require('rimraf')

const { IPFS_API_USER: user, IPFS_API_PASSWORD: password } = process.env
const userPassword = Buffer.from(`${user}:${password}`).toString('base64')
const authorization = 'Basic ' + userPassword

const ipfs = ipfsClient(process.env.IPFS_API, { headers: { authorization } })

let cborUrl

async function run () {
  try {
    const id = await ipfs.id()
    console.log('IPFS Id:', id)
    console.log('Downloading certs...')
    const dir = 'certs'
    rimraf.sync(dir)
    mkdirSync(dir)
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
  } catch (e) {
    console.error('IPFS Error', e)
  }
}
run()

module.exports = {}

