const form = document.getElementById("contactForm");
const fields = {
  name: document.getElementById("name"),
  email: document.getElementById("email"),
  category: document.getElementById("category"),
  message: document.getElementById("message"),
};
const errors = {
  name: document.getElementById("nameError"),
  email: document.getElementById("emailError"),
  category: document.getElementById("categoryError"),
  message: document.getElementById("messageError"),
};
const formResult = document.getElementById("formResult");

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function setError(key, message) {
  errors[key].textContent = message;
}

function clearMessages() {
  Object.keys(errors).forEach((key) => setError(key, ""));
  formResult.textContent = "";
}

function validate() {
  let valid = true;
  clearMessages();

  if (!fields.name.value.trim()) {
    setError("name", "名前を入力してください。");
    valid = false;
  }

  const email = fields.email.value.trim();
  if (!email) {
    setError("email", "メールアドレスを入力してください。");
    valid = false;
  } else if (!emailPattern.test(email)) {
    setError("email", "メールアドレスの形式が正しくありません。");
    valid = false;
  }

  if (!fields.category.value) {
    setError("category", "問い合わせ種別を選択してください。");
    valid = false;
  }

  if (!fields.message.value.trim()) {
    setError("message", "本文を入力してください。");
    valid = false;
  }

  return valid;
}

if (
  !form ||
  !formResult ||
  Object.values(fields).some((field) => !field) ||
  Object.values(errors).some((error) => !error)
) {
  console.error("web06: required element was not found.");
} else {
  form.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!validate()) {
      formResult.textContent = "入力内容を確認してください。";
      return;
    }

    formResult.textContent = "送信内容を確認しました。実際の送信は行っていません。";
  });

  form.addEventListener("reset", () => {
    window.setTimeout(clearMessages, 0);
  });
}
