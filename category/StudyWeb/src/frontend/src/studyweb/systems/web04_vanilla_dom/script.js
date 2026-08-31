const changeButton = document.getElementById("changeButton");
const resetButton = document.getElementById("resetButton");
const resultText = document.getElementById("resultText");

const initialMessage =
  "初期メッセージです。ボタンを押すとJavaScriptで表示が変わります。";
let changeCount = 0;

if (!changeButton || !resetButton || !resultText) {
  console.error("web04: required element was not found.");
} else {
  changeButton.addEventListener("click", () => {
    changeCount += 1;
    resultText.textContent = `表示を変更しました。クリック回数: ${changeCount}`;
  });

  resetButton.addEventListener("click", () => {
    changeCount = 0;
    resultText.textContent = initialMessage;
  });
}
