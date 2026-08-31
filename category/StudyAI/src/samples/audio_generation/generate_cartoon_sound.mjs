// generate-fart-sound.mjs
import fs from "node:fs/promises";

const API_KEY = process.env.ELEVENLABS_API_KEY;

if (!API_KEY) {
  throw new Error("環境変数 ELEVENLABS_API_KEY を設定してください");
}

const prompt = `
short cartoon fart sound effect for a memory card game.
non-realistic, funny, cute, low volume, not gross, 0.6 seconds.
sound style: "pusu..." small sneaky fart.
`;

const response = await fetch(
  "https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128",
  {
    method: "POST",
    headers: {
      "xi-api-key": API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: prompt,
      duration_seconds: 0.6,
      prompt_influence: 0.45,
      model_id: "eleven_text_to_sound_v2",
    }),
  }
);

if (!response.ok) {
  const errorText = await response.text();
  throw new Error(`API error: ${response.status} ${errorText}`);
}

const audioBuffer = Buffer.from(await response.arrayBuffer());
await fs.writeFile("fart_pusu.mp3", audioBuffer);

console.log("生成完了: fart_pusu.mp3");
