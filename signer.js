const ipfsClient = require('ipfs-http-client')

const { IPFS_API_USER: user, IPFS_API_PASSWORD: password } = process.env
const userPassword = Buffer.from(`${user}:${password}`).toString('base64')
const authorization = 'Basic ' + userPassword

const ipfs = ipfsClient(process.env.IPFS_API, { headers: { authorization } })

async function run () {
  try {
    const id = await ipfs.id()
    console.log('IPFS Id:', id)
  } catch (e) {
    console.error('IPFS Error', e)
  }
}
run()

module.exports = {}

