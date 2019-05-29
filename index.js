const path = require('path')
const AWS = require('aws-sdk')
const delay = require('delay')

require('dotenv').config()

// const fastify = require('fastify')({ logger: true })
const fastify = require('fastify')()

fastify.register(require('fastify-static'), {
  root: path.join(__dirname, 'public')
})

const oauthPlugin = require('fastify-oauth2')
fastify.register(oauthPlugin, {
  name: 'githubOAuth2',
  credentials: {
    client: {
      id: '72308d8f277638d06b63',
      secret: '77b47511697c2a41cfd7a6a1389dd5da7cdb3c77'
    },
    auth: oauthPlugin.GITHUB_CONFIGURATION
  },
  // register a fastify url to start the redirect flow
  startRedirectPath: '/login',
  // facebook redirect here after the user login
  callbackUri: 'http://localhost:13023/login/github/callback'
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

fastify.post('/api/publish', (req, reply) => {
  console.log('Publish request:', req.body)
  reply.send({ success: true })
})

fastify.get('/login/github/callback', async function (request, reply) {
  const result = await this.getAccessTokenFromAuthorizationCodeFlow(request)

  console.log(result.access_token)

  // reply.send({ access_token: result.access_token })
  request.session.set('github_access_token', result.access_token)
  const token = request.session.get('github_access_token')
  console.log('Set token: ', token)
  reply.send('session set')
})

fastify.get('/logout', (request, reply) => {
  request.session.delete()
  reply.send('logged out')
})

fastify.get('/show-auth', (request, reply) => {
  const token = request.session.get('github_access_token') 
  console.log('Get token: ', token)
  reply.send({ github_access_token: token })
})

fastify.listen(13023, (err, address) => {
  if (err) throw err
  fastify.log.info(`server listening on ${address}`)
})

