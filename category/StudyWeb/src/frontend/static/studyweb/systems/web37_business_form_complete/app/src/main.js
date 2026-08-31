const formElement = document.querySelector('#form');
const customerInput = document.querySelector('#customer');
const emailInput = document.querySelector('#email');
const noteInput = document.querySelector('#note');
const expectedResult = document.querySelector('#expected-result');
const customerError = document.querySelector('#e_customer');
const emailError = document.querySelector('#e_email');
const noteError = document.querySelector('#e_note');
const formError = document.querySelector('#form-error');
const confirmation = document.querySelector('#confirmation');
const success = document.querySelector('#success');
const submitButton = document.querySelector('#submit');
const editButton = document.querySelector('#edit');
const restartButton = document.querySelector('#restart');
const output = document.querySelector('#out');
const confirmCustomer = document.querySelector('#confirm-customer');
const confirmEmail = document.querySelector('#confirm-email');
const confirmNote = document.querySelector('#confirm-note');
const confirmResult = document.querySelector('#confirm-result');

let submitting = false;

function validate() {
  const errors = {};
  if (!customerInput.value.trim()) errors.customer = '顧客名は必須です';
  if (!/^[^@]+@[^@]+$/.test(emailInput.value)) errors.email = 'メール形式で入力してください';
  if (noteInput.value.length > 200) errors.note = '備考は200文字以内です';
  return errors;
}

function clearErrors() {
  customerError.textContent = emailError.textContent = noteError.textContent = '';
  formError.textContent = '';
  formError.hidden = true;
  for (const input of [customerInput, emailInput, noteInput]) input.removeAttribute('aria-invalid');
}

function showInput() {
  formElement.hidden = false;
  confirmation.hidden = true;
  success.hidden = true;
}

function showValidationErrors(errors) {
  const fields = [
    ['customer', customerInput, customerError],
    ['email', emailInput, emailError],
    ['note', noteInput, noteError]
  ];
  for (const [name, input, errorElement] of fields) {
    const message = errors[name] || '';
    errorElement.textContent = message;
    if (message) input.setAttribute('aria-invalid', 'true');
  }
  const firstInvalid = fields.find(([name]) => errors[name]);
  firstInvalid?.[1].focus();
}

formElement.onsubmit = async (event) => {
  event.preventDefault();
  clearErrors();
  output.textContent = '';
  const errors = validate();
  if (Object.keys(errors).length) {
    showValidationErrors(errors);
    return;
  }

  confirmCustomer.textContent = customerInput.value.trim();
  confirmEmail.textContent = emailInput.value;
  confirmNote.textContent = noteInput.value || 'なし';
  confirmResult.textContent = expectedResult.value === 'failure' ? '送信失敗を再現' : '成功';
  formElement.hidden = true;
  confirmation.hidden = false;
  success.hidden = true;
  submitButton.focus();
};

editButton.addEventListener('click', () => {
  if (submitting) return;
  showInput();
  customerInput.focus();
});

submitButton.addEventListener('click', async () => {
  if (submitting) return;
  submitting = true;
  submitButton.disabled = true;
  editButton.disabled = true;
  output.textContent = '送信中...';
  await new Promise((resolve) => setTimeout(resolve, 1000));

  if (expectedResult.value === 'failure') {
    showInput();
    formError.hidden = false;
    formError.textContent = '送信できませんでした。入力内容を確認して再試行してください。';
    output.textContent = '送信失敗';
    formError.focus();
  } else {
    confirmation.hidden = true;
    success.hidden = false;
    output.textContent = `成功\n顧客名: ${customerInput.value.trim()}\nメール: ${emailInput.value}`;
    restartButton.focus();
  }

  submitting = false;
  submitButton.disabled = false;
  editButton.disabled = false;
});

restartButton.addEventListener('click', () => {
  formElement.reset();
  clearErrors();
  output.textContent = '';
  showInput();
  customerInput.focus();
});
