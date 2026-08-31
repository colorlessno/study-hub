const messageButton = document.getElementById("messageButton");
const messageOutput = document.getElementById("messageOutput");
let clickCount = 0;

if (!messageButton || !messageOutput) {
  console.error("web01: required element was not found.");
} else {
  messageButton.addEventListener("click", () => {
    clickCount += 1;
    messageOutput.textContent =
      `こんにちは。JavaScriptでHTMLの表示を書き換えました。クリック回数: ${clickCount}`;
  });
}
