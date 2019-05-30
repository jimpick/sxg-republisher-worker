const path = require('path')
const { Readable } = require('stream')
const { randomBytes } = require('crypto')
const AWS = require('aws-sdk')
const delay = require('delay')
const Octokit = require('@octokit/rest')
const signer = require('./signer')

require('dotenv').config()

const origin = process.env.ORIGIN ? process.env.ORIGIN :
  'http://localhost:13023'
const fastify = require('fastify')({ logger: true })

fastify.register(require('fastify-static'), {
  root: path.join(__dirname, 'public')
})

const oauthPlugin = require('fastify-oauth2')
const gitHubCredentials = {
  id: process.env.GITHUB_OAUTH_CLIENT_ID,
  secret: process.env.GITHUB_OAUTH_CLIENT_SECRET
}
const callbackUri = `${origin}/login/github/callback`.trim()
console.log('callbackUri:', callbackUri)
fastify.register(oauthPlugin, {
  name: 'githubOAuth',
  credentials: {
    client: gitHubCredentials,
    auth: oauthPlugin.GITHUB_CONFIGURATION
  },
  // register a fastify url to start the redirect flow
  startRedirectPath: '/login',
  // facebook redirect here after the user login
  callbackUri: `${origin}/login/github/callback`
})

fastify.register(require('fastify-secure-session'), {
  secret: process.env.SESSION_SECRET,
  salt: process.env.SESSION_SALT,
  cookie: {
    // options from setCookie, see https://github.com/fastify/fastify-cookie
    path: '/',
    maxAge: 4 * 7 * 24 * 60 * 60 // 4 weeks
  }
})

fastify.post('/api/publish', function (req, reply) {
  console.log('Publish request:', req.body)
  reply.send({ success: true })
})

fastify.get('/login/github/callback', async function (request, reply) {
  const result = await this.getAccessTokenFromAuthorizationCodeFlow(request)
  const auth = result.access_token
  request.session.set('github_access_token', auth)
  console.log('Set token:', auth)
  const octokit = Octokit({ auth })
  const user = await octokit.users.getAuthenticated()
  // console.log('User:', JSON.stringify(user, null, 2))
  const { login, avatar_url } = user.data
  console.log('Login:', login)
  request.session.set('github_user', { login, avatar_url })
  // reply.send(`logged in as ${login}`)
  reply.redirect('/')
})

fastify.get('/user', async function (request, reply) {
  const user = request.session.get('github_user')
  if (!user) {
    reply.send({ loggedOut: true })
    return
  }
  reply.send(user)
})

fastify.post('/logout', async function (request, reply) {
  /* Doesn't work
  const accessToken = this.githubOAuth.accessToken.create({
    access_token: request.session.get('github_access_token')
  })
  await accessToken.revoke('access_token')
  */
  request.session.delete()
  reply.send({ loggedOut: true })
})

/*
fastify.get('/show-auth', async function (request, reply) {
  const auth = request.session.get('github_access_token') 
  console.log('Get token: ', auth)
  const octokit = Octokit({ auth })
  const user = await octokit.users.getAuthenticated()
  reply.send({
    github_access_token: auth,
    user
  })
})
*/

/*
fastify.get('/do-work', function (request, reply) {
  const stream = new Readable({ read() {} })
  reply.type('text/html; charset=UTF-8').send(stream)
  count()

  async function count () {
    for (let i = 1; i <= 10; i++) {
      stream.push(`Line ${i}<br>\n`)
      await delay(1000)
    }
    stream.push('Done.\n')
    stream.push(null)
  }
})
*/

const jobs = new Map()

const publishJobsOpts = {
  schema: {
    body: {
      type: 'object',
      required: [ 'siteName', 'ipfsCid' ],
      properties: {
        siteName: { type: 'string' },
        ipfsCid: { type: 'string' }
      }
    }
  }
}

fastify.post('/publishJobs', publishJobsOpts, async function (request, reply) {
  const user = request.session.get('github_user')
  if (!user) {
    return reply.code(403).send({ error: 'Not logged in' })
  }
  if (!signer.ready) {
    return reply.code(503).send({ error: 'Not ready yet' })
  }
  const { login } = user
  const { siteName, ipfsCid } = request.body
  console.log('new publishJob:', login, siteName, ipfsCid, request.body)
  const jobId = randomBytes(8).toString('hex')
  const job = {
    jobId,
    login,
    siteName,
    ipfsCid
  }
  jobs.set(jobId, job)
  reply.code(201).send(job)
  await signer.generateSignedExchanges(job)
  // FIXME: Set DNS records
  job.state = 'DONE'
})

fastify.get('/publishJobs/:jobId', async function (request, reply) {
  const user = request.session.get('github_user')
  if (!user) {
    return reply.code(403).send({ error: 'Not logged in' })
  }
  reply.send(jobs.get(request.params.jobId))
})

const port = process.env.PORT || 13023
fastify.listen(port, '0.0.0.0', (err, address) => {
  console.log(`server listening on ${address}`)
  if (err) throw err
  fastify.log.info(`server listening on ${address}`)
})
