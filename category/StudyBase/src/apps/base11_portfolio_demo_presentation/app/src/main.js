const builder = window.PresentationBuilder;

const fields = {
  title: document.querySelector('#title'),
  audience: document.querySelector('#audience'),
  problem: document.querySelector('#problem'),
  mainFlow: document.querySelector('#main-flow'),
  components: document.querySelector('#components'),
  verified: document.querySelector('#verified'),
  evidence: document.querySelector('#evidence'),
  limitation: document.querySelector('#limitation'),
  nextStep: document.querySelector('#next-step')
};
const output = document.querySelector('#output');
const message = document.querySelector('#message');

function readInput() {
  return Object.fromEntries(Object.entries(fields).map(([key, element]) => [key, element.value]));
}

function writeInput(input) {
  for (const [key, element] of Object.entries(fields)) element.value = input[key] ?? '';
}

function showOutput(type) {
  const artifacts = builder.buildPresentationArtifacts(readInput());
  if (!artifacts.ok) {
    message.textContent = `未入力の項目: ${artifacts.missing.join('、')}`;
    output.textContent = '必要な項目を入力してから、もう一度作成してください。';
    return;
  }
  message.textContent = `${document.querySelector(`[data-output="${type}"]`).textContent}の説明案を作成しました。`;
  output.textContent = artifacts[type];
}

document.querySelector('#load-example').addEventListener('click', () => {
  writeInput(builder.sampleInput);
  message.textContent = '記入例を読み込みました。内容を変更して説明案を作成できます。';
  output.textContent = '作成する説明案を選んでください。';
});

document.querySelector('#reset-input').addEventListener('click', () => {
  writeInput({});
  message.textContent = '';
  output.textContent = '「記入例を読み込む」を押すか、自分の成果物について入力してください。';
});

for (const button of document.querySelectorAll('[data-output]')) {
  button.addEventListener('click', () => showOutput(button.dataset.output));
}
