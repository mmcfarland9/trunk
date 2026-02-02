import {
  requestCode,
  verifyCode,
} from '../services/auth-service'

type LoginViewElements = {
  container: HTMLElement
  emailInput: HTMLInputElement
  codeInput: HTMLInputElement
  emailForm: HTMLFormElement
  codeForm: HTMLFormElement
  errorMessage: HTMLElement
  loadingSpinner: HTMLElement
}

let elements: LoginViewElements | null = null
let currentEmail = ''

export function createLoginView(): HTMLElement {
  const container = document.createElement('div')
  container.className = 'login-view'
  container.innerHTML = `
    <div class="login-card">
      <h1>Trunk</h1>
      <p class="login-subtitle">Reap what you sow</p>

      <form class="login-form email-form">
        <label for="login-email">Email address</label>
        <input
          type="email"
          id="login-email"
          name="email"
          placeholder="you@example.com"
          required
          autocomplete="email"
        />
        <button type="submit">Send code</button>
      </form>

      <form class="login-form code-form hidden">
        <p class="code-sent-message">Code sent to <span class="sent-email"></span></p>
        <label for="login-code">6-digit code</label>
        <input
          type="text"
          id="login-code"
          name="code"
          placeholder="123456"
          required
          maxlength="6"
          pattern="[0-9]{6}"
          inputmode="numeric"
          autocomplete="one-time-code"
        />
        <button type="submit">Verify</button>
        <button type="button" class="back-button">Back</button>
      </form>

      <div class="login-error hidden"></div>
      <div class="login-loading hidden">
        <span class="spinner"></span>
      </div>
    </div>
  `

  elements = {
    container,
    emailInput: container.querySelector('#login-email')!,
    codeInput: container.querySelector('#login-code')!,
    emailForm: container.querySelector('.email-form')!,
    codeForm: container.querySelector('.code-form')!,
    errorMessage: container.querySelector('.login-error')!,
    loadingSpinner: container.querySelector('.login-loading')!,
  }

  setupEventListeners()
  return container
}

function setupEventListeners() {
  if (!elements) return

  elements.emailForm.addEventListener('submit', handleEmailSubmit)
  elements.codeForm.addEventListener('submit', handleCodeSubmit)
  elements.container.querySelector('.back-button')?.addEventListener('click', showEmailForm)
}

async function handleEmailSubmit(e: Event) {
  e.preventDefault()
  if (!elements) return

  const email = elements.emailInput.value.trim()
  if (!email) return

  showLoading(true)
  hideError()

  const { error } = await requestCode(email)

  showLoading(false)

  if (error) {
    showError(error)
    return
  }

  currentEmail = email
  showCodeForm()
}

async function handleCodeSubmit(e: Event) {
  e.preventDefault()
  if (!elements) return

  const code = elements.codeInput.value.trim()
  if (!code || code.length !== 6) return

  showLoading(true)
  hideError()

  const { error } = await verifyCode(currentEmail, code)

  showLoading(false)

  if (error) {
    showError(error)
    return
  }

  // Auth state change will hide login view automatically
}

function showEmailForm() {
  if (!elements) return
  elements.emailForm.classList.remove('hidden')
  elements.codeForm.classList.add('hidden')
  elements.codeInput.value = ''
  hideError()
}

function showCodeForm() {
  if (!elements) return
  elements.emailForm.classList.add('hidden')
  elements.codeForm.classList.remove('hidden')
  const sentEmailSpan = elements.container.querySelector('.sent-email')
  if (sentEmailSpan) sentEmailSpan.textContent = currentEmail
  elements.codeInput.focus()
}

function showLoading(show: boolean) {
  if (!elements) return
  elements.loadingSpinner.classList.toggle('hidden', !show)
  elements.emailInput.disabled = show
  elements.codeInput.disabled = show
}

function showError(message: string) {
  if (!elements) return
  elements.errorMessage.textContent = message
  elements.errorMessage.classList.remove('hidden')
}

function hideError() {
  if (!elements) return
  elements.errorMessage.classList.add('hidden')
}

export function destroyLoginView() {
  elements = null
}
