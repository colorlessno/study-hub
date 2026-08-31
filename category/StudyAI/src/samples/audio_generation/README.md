# External sound generation sample

This supplemental sample sends a short sound-effect prompt to the ElevenLabs sound-generation API and writes the returned MP3 locally. It is separate from the StudyAIIdeaGeneration prompt-comparison exercises.

Requirements:

- Node.js 22 or later;
- an `ELEVENLABS_API_KEY` environment variable;
- network access and awareness that the external API may incur usage charges.

Run from this directory:

```powershell
node generate_cartoon_sound.mjs
```

The generated `fart_pusu.mp3` file is a local artifact and must not be committed.
