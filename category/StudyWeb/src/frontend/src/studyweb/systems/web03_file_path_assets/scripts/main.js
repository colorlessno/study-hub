const buttons = document.querySelectorAll(".path-button");

if (buttons.length === 0) {
  console.error("web03: .path-button was not found.");
}

buttons.forEach((button) => {
  button.addEventListener("click", () => {
    const message = button.parentElement?.querySelector(".path-message");

    if (!message) {
      console.error("web03: .path-message was not found.");
      return;
    }

    message.textContent = `JavaScriptを読み込みました。現在のページ: ${location.pathname.split("/").pop()}`;
  });
});
