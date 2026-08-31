document.getElementById("render").addEventListener("click", () => {
  const value = document.getElementById("text").value;
  document.getElementById("safe").textContent = value;
  document.getElementById("danger").textContent =
    `innerHTMLへ設定するとHTMLとして解釈される入力です（この教材では実行しません）:\n${value}`;
});
