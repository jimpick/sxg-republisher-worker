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