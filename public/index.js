import { html, render } from 'https://unpkg.com/lit-html?module'

const mainTemplate = ({
  siteName,
  ipfsCid,
  user,
  error,
  publishJob,
  jobStatus
}) => {
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

  function getUrl () {
    if (!siteName || !user.login) return ''
    return (
      `${siteName.trim()}-${user.login}.ipfs.v6z.me`
      .replace(/ /g, '-')
      .toLowerCase()
    )
  }
  const previewUrl = getUrl()
  const disabledBtn = !previewUrl || !ipfsCid || publishJob

  let status = null
  if (publishJob) {
    status = html`
      <pre>${JSON.stringify(publishJob, null, 2)}</pre>
      <pre>${jobStatus && JSON.stringify(jobStatus, null, 2)}</pre>
    `
  }
  return html`
    ${header}
    <p>Hello ${user.login}</p>
    <div>
      <img class="avatar" src="${user.avatar_url}">
      <button @click=${logout}>Logout</button>
    </div>
    <h3>Publish a new site</h3>
    <div>
      <label for="siteName">Site name:</label>
      <input
        type="text"
        id="siteName"
        size="40"
        @input=${inputText}
        autocomplete="off"
        autocorrect="off"
        autocapitalize="off"
        spellcheck="false">
      <br>

      <label for="ipfsCid">IPFS CID:</label>
      <input
        type="text"
        id="ipfsCid"
        size="80"
        @input=${inputText}
        autocomplete="off"
        autocorrect="off"
        autocapitalize="off"
        spellcheck="false">
      <br>
      <div id="preview">${previewUrl}</div>
      <br>
      <button ?disabled=${disabledBtn} @click=${publish}>
        Publish
      </button>
      ${status}
    </div>
  `

}

let user
let error
let siteName
let ipfsCid
let publishJob
let jobStatus

function r () {
  render(mainTemplate({
    user,
    error,
    siteName,
    ipfsCid,
    publishJob,
    jobStatus
  }), document.body)
}

function inputText () {
  siteName = document.getElementById('siteName').value
  ipfsCid = document.getElementById('ipfsCid').value
  r()
}

async function publish (e) {
  console.log('Publish')
  e.preventDefault()
  try {
    const res = await fetch('/publishJobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        siteName,
        ipfsCid
      })
    })
    publishJob = await res.json()
    r()
    if (res.status === 201) {
      pollStatus(publishJob.jobId)
    }
  } catch (e) {
    console.error('Error publishing job', e)
    error = 'Error publishing job'
    r()
  }
}

function delay (interval) {
  return new Promise(resolve =>  setTimeout(resolve, interval))
}

async function pollStatus (jobId) {
  for (let i = 0; i < 2 * 60 * 60; i++) { // 2 minute timeout
    const res = await fetch(`/publishJobs/${jobId}`)
    if (res.status !== 200) {
      jobStatus = {
        error: res.statusText
      }
      r()
      break
    }
    jobStatus = await res.json()
    r()
    if (jobStatus.done || jobStatus.error) {
      break
    }
    await delay(1000)
  }
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
