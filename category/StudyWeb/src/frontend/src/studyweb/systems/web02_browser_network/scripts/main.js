const checkButton = document.getElementById("checkButton");
const loadStatus = document.getElementById("loadStatus");

if (!checkButton || !loadStatus) {
  console.error("web02: required element was not found.");
} else {
  checkButton.addEventListener("click", () => {
    loadStatus.textContent = `JavaScriptを読み込み済みです。確認時刻: ${new Date().toLocaleTimeString()}`;
  });
}
