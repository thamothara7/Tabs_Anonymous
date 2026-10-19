# Assets and dependencies

All character SVGs, scene illustrations, authored implementation, and UI composition in this repository were created for Tabs Anonymous. Character names are fictionalized references; no third-party mascot artwork or brand logos are embedded. No affiliation or endorsement is implied.

- React / React DOM : MIT.
- Vite / TypeScript / Vitest / Playwright : see the exact installed package LICENSE files (MIT / Apache-2.0 as applicable).
- Motion for React : MIT.
- Lucide icons : ISC.
- DM Sans and Manrope fonts, distributed through Fontsource : SIL Open Font License. The installed Fontsource packages contain license files. Font files are bundled locally.
- Sound effects are synthesized Web Audio oscillator sequences; no recordings are included.

Official implementation references:

- [Motion React animation](https://motion.dev/docs/react-animation)
- [Chrome Tabs API](https://developer.chrome.com/docs/extensions/reference/api/tabs)
- [Playwright extension testing](https://playwright.dev/docs/chrome-extensions)
- [Chrome optional permissions](https://developer.chrome.com/docs/extensions/reference/api/permissions)

The source specification contains a broader reading list; no artwork or source code was copied from the referenced community projects.

- Spoken dialogue uses installed English device voices, selected only when marked local. No voice recordings are bundled. Optional ElevenLabs generation uses the user’s account through the local server; see [voice setup](voices.md).
- [Web Speech voice discovery](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis/voiceschanged_event) and [local voice distinction](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisVoice/localService).
