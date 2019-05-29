import { html, render } from 'https://unpkg.com/lit-html?module'

const mainTemplate = ({ user, error }) => {
  const header = html`
    <h1>SXG IPFS Publisher Demo</h1>
  `
  if (error) {
    return html`
      ${header}
      <pre>Error: ${error}</pre>
    `
  }
  if (!user) {
    return html`
      ${header}
      Loading...
    `
  }
  if (!user.login) {
    return html`
      ${header}
      <button @click=${login}>Login using GitHub</button>
    `

    function login () {
      location.href = '/login'
    }
  }
  return html`
    ${header}
    <p>Hello ${user.login}</p>
    <div>
      <img class="avatar" src="${user.avatar_url}">
    </div>
    <ul>
      <li><a href="/do-work">Do work</a></li>
    </ul>
    <button @click=${logout}>Logout</button>
  `

}

let user
let error

function r () {
  render(mainTemplate({ user }), document.body)
}

async function logout () {
  console.log('Logout')
  try {
    const res = await fetch('/logout', { method: 'POST' })
    user = await res.json()
    r()
  } catch (e) {
    console.error('Error logging out', e)
    error = 'Error logging out'
    r()
  }
}

async function run () {
  r()
  try {
    const res = await fetch('/user')
    user = await res.json()
    r()
  } catch (e) {
    console.error('Error loading user', e)
    error = 'Error loading user'
    r()
  }
}

run()


/*
const publishBtn = document.getElementById('publish')
const userEle = document.getElementById('githubUser')
const nameEle = document.getElementById('siteName')
const cidEle = document.getElementById('ipfsCid')
const previewEle = document.getElementById('preview')
const resultEle = document.getElementById('result')

function getUrl () {
  if (!nameEle.value || !userEle.value) return ''
  return (
    `${nameEle.value.trim()}-${userEle.value}.ipfs.v6z.me`
    .replace(/ /g, '-')
    .toLowerCase()
  )
}

function updatePreview () {
  const url = getUrl()
  previewEle.textContent = url
  publishBtn.disabled = !url || !cidEle.value
}

userEle.addEventListener('change', updatePreview)
nameEle.addEventListener('input', updatePreview)
cidEle.addEventListener('input', updatePreview)

publishBtn.addEventListener('click', async (e) => {
  console.log('click')
  e.preventDefault()
  try {
    const res = await fetch('/api/publish', {
      method: 'POST',
      body: JSON.stringify({
        user: userEle.value,
        name: nameEle.value,
        ipfsCid: cidEle.value
      })
    })
    const json = await res.json()
    if (!json.success) throw new Error('Failed')
    resultEle.textContent = 'Successfully published'
  } catch (e) {
    resultEle.textContent = 'Publish failed'
  }
})
*/
